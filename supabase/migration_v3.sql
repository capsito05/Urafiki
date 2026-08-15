-- =========================================================
-- MIGRATION V3 - Corrections + nouvelles fonctionnalités
-- A exécuter APRÈS schema.sql, seed_content.sql et migration_v2.sql,
-- dans le SQL Editor Supabase.
-- =========================================================

-- ---------------------------------------------------------
-- BUG : la table "stats" n'était jamais alimentée (aucun code
-- n'écrivait dedans), donc l'onglet Statistiques était toujours
-- vide. On ajoute une fonction dédiée, appelée par l'app à la fin
-- de chaque session, qui incrémente le bon compteur de façon
-- atomique (upsert manuel, car couple_id peut être NULL en solo et
-- les contraintes UNIQUE traitent deux NULL comme différents).
-- ---------------------------------------------------------
create or replace function public.record_session_stats(
  p_user_id uuid,
  p_couple_id uuid,
  p_category text,
  p_result text -- 'victoire' | 'defaite' | 'nul' | null
)
returns void as $$
declare
  v_id uuid;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN: on ne peut enregistrer que ses propres statistiques.';
  end if;

  select id into v_id from public.stats
  where user_id = p_user_id
    and category = p_category
    and coalesce(couple_id::text, '') = coalesce(p_couple_id::text, '');

  if v_id is null then
    insert into public.stats (user_id, couple_id, category, sessions_count, victoires, defaites, nuls)
    values (
      p_user_id, p_couple_id, p_category, 1,
      (p_result = 'victoire')::int,
      (p_result = 'defaite')::int,
      (p_result = 'nul')::int
    );
  else
    update public.stats set
      sessions_count = sessions_count + 1,
      victoires = victoires + (p_result = 'victoire')::int,
      defaites = defaites + (p_result = 'defaite')::int,
      nuls = nuls + (p_result = 'nul')::int,
      updated_at = now()
    where id = v_id;
  end if;
end;
$$ language plpgsql security definer;

-- Policy de secours si jamais le code accède directement à la table (la RPC
-- ci-dessus bypasse RLS via security definer, mais on couvre aussi l'accès direct).
drop policy if exists "stats_upsert_own" on public.stats;
create policy "stats_upsert_own" on public.stats for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------
-- 2.2 : statistiques défis/gages faits vs pas faits, par joueur et par groupe
-- ---------------------------------------------------------
create or replace view public.defi_completion_stats
with (security_invoker = true) as
select
  sa.user_id,
  s.couple_id,
  sa.answer as statut,
  count(*) as total
from public.session_answers sa
join public.session_items si on si.id = sa.session_item_id
join public.sessions s on s.id = si.session_id
join public.content_items ci on ci.id = si.content_id
where ci.content_type = 'defi'
group by sa.user_id, s.couple_id, sa.answer;

grant select on public.defi_completion_stats to authenticated;

-- ---------------------------------------------------------
-- 2.4 : réponses alternatives validées par les joueurs, appliquées
-- globalement à toute question dont la réponse canonique correspond.
-- ---------------------------------------------------------
create table if not exists public.answer_variants (
  id uuid primary key default uuid_generate_v4(),
  canonical_answer text not null,
  variant text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (canonical_answer, variant)
);

create index if not exists idx_answer_variants_canonical on public.answer_variants (lower(canonical_answer));

alter table public.answer_variants enable row level security;

drop policy if exists "answer_variants_select_all" on public.answer_variants;
create policy "answer_variants_select_all" on public.answer_variants for select using (auth.role() = 'authenticated');

drop policy if exists "answer_variants_insert_own" on public.answer_variants;
create policy "answer_variants_insert_own" on public.answer_variants for insert with check (created_by = auth.uid());

-- ---------------------------------------------------------
-- 2.6 : invitations à jouer (dès que le groupe compte 2+ membres)
-- ---------------------------------------------------------
create table if not exists public.game_invitations (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  invited_by uuid references public.users(id) not null,
  invited_user uuid references public.users(id) not null,
  category text not null,
  subcategory text,
  level text,
  count int not null default 10,
  time_per_item int,
  status text check (status in ('proposee', 'acceptee', 'refusee')) default 'proposee',
  session_id uuid references public.sessions(id),
  created_at timestamptz default now()
);

alter table public.game_invitations enable row level security;

drop policy if exists "invitations_select_member" on public.game_invitations;
create policy "invitations_select_member" on public.game_invitations for select using (
  invited_by = auth.uid() or invited_user = auth.uid()
);

drop policy if exists "invitations_insert_member" on public.game_invitations;
create policy "invitations_insert_member" on public.game_invitations for insert with check (
  invited_by = auth.uid()
  and exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);

drop policy if exists "invitations_update_invited" on public.game_invitations;
create policy "invitations_update_invited" on public.game_invitations for update using (
  invited_user = auth.uid() or invited_by = auth.uid()
);

alter publication supabase_realtime add table public.game_invitations;

-- ---------------------------------------------------------
-- 2.9 : réglages utilisateur (son, notifications, timer par défaut)
-- ---------------------------------------------------------
alter table public.users add column if not exists sound_enabled boolean default true;
alter table public.users add column if not exists notifications_enabled boolean default true;
alter table public.users add column if not exists default_timer int default 30;
alter table public.users add column if not exists push_subscription jsonb;

-- ---------------------------------------------------------
-- 2.13 : défi du jour + streak de jours consécutifs
-- ---------------------------------------------------------
create table if not exists public.daily_challenge_completions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  challenge_date date not null,
  content_id uuid references public.content_items(id),
  streak_count int not null default 1,
  completed_at timestamptz default now(),
  unique (user_id, challenge_date)
);

alter table public.daily_challenge_completions enable row level security;

drop policy if exists "daily_challenge_select_own" on public.daily_challenge_completions;
create policy "daily_challenge_select_own" on public.daily_challenge_completions for select using (user_id = auth.uid());

drop policy if exists "daily_challenge_insert_own" on public.daily_challenge_completions;
create policy "daily_challenge_insert_own" on public.daily_challenge_completions for insert with check (user_id = auth.uid());

-- Le défi du jour est LE MÊME pour tout le monde (choix le plus simple à
-- fiabiliser) : sélection déterministe par date, calculée côté serveur
-- pour éviter tout décalage de fuseau horaire entre joueurs.
create or replace function public.get_daily_challenge()
returns setof public.content_items as $$
  select * from public.content_items
  where content_type in ('question', 'enigme')
  order by md5(id::text || current_date::text)
  limit 1;
$$ language sql stable;

-- Calcule et enregistre le défi du jour complété, en gérant le streak
-- (incrémenté si la dernière complétion était hier, remis à 1 sinon).
create or replace function public.complete_daily_challenge(p_user_id uuid, p_content_id uuid)
returns int as $$
declare
  v_last_date date;
  v_last_streak int;
  v_new_streak int;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  select challenge_date, streak_count into v_last_date, v_last_streak
  from public.daily_challenge_completions
  where user_id = p_user_id
  order by challenge_date desc
  limit 1;

  if v_last_date = current_date then
    return v_last_streak; -- déjà fait aujourd'hui
  elsif v_last_date = current_date - interval '1 day' then
    v_new_streak := coalesce(v_last_streak, 0) + 1;
  else
    v_new_streak := 1;
  end if;

  insert into public.daily_challenge_completions (user_id, challenge_date, content_id, streak_count)
  values (p_user_id, current_date, p_content_id, v_new_streak);

  return v_new_streak;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------
-- 2.1 : filtre par "style de jeu" (quiz / réponse libre / énigmes /
-- tu préfères / discussion), en plus du thème et du niveau déjà
-- gérés par get_content_with_fallback. Nouvelles fonctions _v2 (au
-- lieu de modifier les signatures existantes, ce qui créerait une
-- ambiguïté de surcharge côté PostgREST) acceptant un p_style
-- optionnel.
-- ---------------------------------------------------------
create or replace function public.get_unseen_content_v2(
  p_category text,
  p_subcategory text,
  p_level text,
  p_mode text,
  p_couple_id uuid,
  p_user_id uuid,
  p_limit int,
  p_style text default null
)
returns setof public.content_items as $$
  select ci.* from public.content_items ci
  where ci.category = p_category
    and (p_subcategory is null or ci.subcategory = p_subcategory)
    and (p_level is null or ci.level = p_level)
    and ci.mode_scope in (p_mode, 'tous')
    and (
      p_style is null
      or (p_style = 'quiz' and ci.type in ('qcm', 'vrai_faux', 'devinette'))
      or (p_style = 'reponse_libre' and ci.type = 'reponse_libre')
      or (p_style = 'enigme' and ci.content_type = 'enigme')
      or (p_style = 'tu_preferes' and ci.type = 'tu_preferes')
      or (p_style = 'discussion' and ci.type = 'discussion')
      or (p_style = 'defi' and ci.content_type = 'defi')
    )
    and not exists (
      select 1 from public.content_seen cs
      where cs.content_id = ci.id
        and (
          (p_couple_id is not null and cs.couple_id = p_couple_id)
          or (p_couple_id is null and cs.user_id = p_user_id)
        )
    )
  order by random()
  limit p_limit;
$$ language sql security definer;

create or replace function public.get_content_with_fallback_v2(
  p_category text,
  p_subcategory text,
  p_level text,
  p_mode text,
  p_couple_id uuid,
  p_user_id uuid,
  p_limit int,
  p_style text default null
)
returns setof public.content_items as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.get_unseen_content_v2(p_category, p_subcategory, p_level, p_mode, p_couple_id, p_user_id, p_limit, p_style);
  if v_count >= p_limit then
    return query select * from public.get_unseen_content_v2(p_category, p_subcategory, p_level, p_mode, p_couple_id, p_user_id, p_limit, p_style);
  else
    return query
    select ci.* from public.content_items ci
    where ci.category = p_category
      and (p_subcategory is null or ci.subcategory = p_subcategory)
      and (p_level is null or ci.level = p_level)
      and ci.mode_scope in (p_mode, 'tous')
      and (
        p_style is null
        or (p_style = 'quiz' and ci.type in ('qcm', 'vrai_faux', 'devinette'))
        or (p_style = 'reponse_libre' and ci.type = 'reponse_libre')
        or (p_style = 'enigme' and ci.content_type = 'enigme')
        or (p_style = 'tu_preferes' and ci.type = 'tu_preferes')
        or (p_style = 'discussion' and ci.type = 'discussion')
        or (p_style = 'defi' and ci.content_type = 'defi')
      )
    order by random()
    limit p_limit;
  end if;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------
-- 2.5 : "Mes groupes" — un utilisateur peut appartenir à plusieurs
-- groupes (couple_members le permettait déjà). Vue pratique pour
-- lister tous les groupes d'un utilisateur avec le nombre de membres.
-- ---------------------------------------------------------
create or replace view public.my_groups
with (security_invoker = true) as
select
  c.id, c.mode, c.nom, c.invite_code, c.created_by, c.created_at,
  cm.user_id as member_id,
  (select count(*) from public.couple_members cm2 where cm2.couple_id = c.id) as members_count
from public.couples c
join public.couple_members cm on cm.couple_id = c.id;

grant select on public.my_groups to authenticated;

-- ---------------------------------------------------------
-- 2.9 : suppression de compte demandée par l'utilisateur. Plusieurs
-- clés étrangères vers public.users n'ont pas de ON DELETE CASCADE
-- (sessions.created_by, couples.created_by, messages.sender_id,
-- defis_discrets.lance_par, game_invitations) : on nettoie / détache
-- ces références avant de supprimer la ligne auth.users, sinon la
-- suppression échoue dès que l'utilisateur a la moindre activité.
-- ---------------------------------------------------------
create or replace function public.delete_own_account()
returns void as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'FORBIDDEN';
  end if;

  delete from public.session_answers where user_id = v_uid;
  delete from public.messages where sender_id = v_uid;
  delete from public.defis_discrets where lance_par = v_uid;
  delete from public.game_invitations where invited_by = v_uid or invited_user = v_uid;
  update public.sessions set created_by = null where created_by = v_uid;
  update public.couples set created_by = null where created_by = v_uid;
  delete from auth.users where id = v_uid;
end;
$$ language plpgsql security definer;

grant execute on function public.delete_own_account() to authenticated;

-- =========================================================
-- FIN DE LA MIGRATION V3
-- =========================================================
