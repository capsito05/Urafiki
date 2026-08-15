-- =========================================================
-- SCHEMA COMPLET - App Jeux/Questions Couple-Amis-Solo
-- A exécuter dans l'éditeur SQL de Supabase (une seule fois)
-- =========================================================

create extension if not exists "uuid-ossp";

-- =========================================================
-- 1. USERS (profil, étend auth.users)
-- =========================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null,
  age int,
  mode_prefere text check (mode_prefere in ('couple','amis','solo')) default 'solo',
  created_at timestamptz default now()
);

-- L'âge est obligatoire à l'inscription et ne peut plus être modifié ensuite.
create function public.prevent_age_change()
returns trigger as $$
begin
  if old.age is not null and new.age is distinct from old.age then
    raise exception 'AGE_IMMUTABLE: l''âge ne peut pas être modifié après inscription.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_prevent_age_change
  before update on public.users
  for each row execute procedure public.prevent_age_change();

-- Création automatique du profil à l'inscription
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, pseudo, age)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'pseudo', 'Joueur'),
    nullif(new.raw_user_meta_data->>'age', '')::int
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- 2. COUPLES / GROUPES
-- =========================================================
create table public.couples (
  id uuid primary key default uuid_generate_v4(),
  mode text check (mode in ('couple','amis')) not null,
  nom text not null,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

create unique index couples_nom_unique_idx on public.couples (lower(trim(nom)));

create table public.couple_members (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(couple_id, user_id)
);

-- Le mode Couple est réservé aux 20 ans et plus, y compris si c'est un
-- adulte qui partage le code d'invitation à quelqu'un de plus jeune.
create function public.check_couple_age()
returns trigger as $$
declare
  v_mode text;
  v_age int;
begin
  select mode into v_mode from public.couples where id = new.couple_id;
  select age into v_age from public.users where id = new.user_id;
  if v_mode = 'couple' and (v_age is null or v_age < 20) then
    raise exception 'AGE_RESTRICTED: le mode Couple est réservé aux personnes de 20 ans et plus.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_check_couple_age
  before insert on public.couple_members
  for each row execute procedure public.check_couple_age();

-- =========================================================
-- 3. BANQUE DE CONTENU
-- =========================================================
create table public.content_items (
  id uuid primary key default uuid_generate_v4(),
  content_type text check (content_type in ('question','enigme','defi')) not null,
  category text not null, -- general, jeux_ensemble, mieux_connaitre, manga
  subcategory text not null,
  mode_scope text check (mode_scope in ('couple','amis','solo','tous')) default 'tous',
  type text not null, -- qcm, vrai_faux, reponse_libre, devinette, defi_discret, action, etc.
  level text check (level in ('facile','moyen','difficile','impossible')) not null,
  text text not null,
  answer text,
  variants jsonb,
  explanation text,
  manga_series text,
  temps_suggere int default 30,
  created_at timestamptz default now()
);

create index idx_content_category on public.content_items(category, subcategory, level);

-- =========================================================
-- 4. SUIVI DE CE QUI A ÉTÉ VU (pour la rotation sans répétition)
-- =========================================================
create table public.content_seen (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  content_id uuid references public.content_items(id) on delete cascade,
  seen_at timestamptz default now()
);

create index idx_content_seen_couple on public.content_seen(couple_id, content_id);
create index idx_content_seen_user on public.content_seen(user_id, content_id);

-- =========================================================
-- 5. SESSIONS DE JEU
-- =========================================================
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  mode text check (mode in ('couple','amis','solo')) not null,
  couple_id uuid references public.couples(id) on delete cascade,
  created_by uuid references public.users(id),
  category text not null,
  subcategory text,
  status text check (status in ('en_attente','en_cours','terminee')) default 'en_attente',
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table public.session_items (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  content_id uuid references public.content_items(id),
  order_index int not null,
  revealed boolean default false,
  time_limit int
);

create table public.session_answers (
  id uuid primary key default uuid_generate_v4(),
  session_item_id uuid references public.session_items(id) on delete cascade,
  user_id uuid references public.users(id),
  answer text,
  is_correct boolean,
  time_spent int,
  answered_at timestamptz default now(),
  unique(session_item_id, user_id)
);

-- Fonction : révèle un session_item dès que tous les joueurs attendus ont répondu
create function public.check_and_reveal(p_session_item_id uuid)
returns void as $$
declare
  v_session_id uuid;
  v_expected int;
  v_answered int;
begin
  select session_id into v_session_id from public.session_items where id = p_session_item_id;

  select count(*) into v_expected
  from public.couple_members cm
  join public.sessions s on s.couple_id = cm.couple_id
  where s.id = v_session_id;

  if v_expected = 0 then v_expected := 1; end if; -- solo

  select count(*) into v_answered
  from public.session_answers
  where session_item_id = p_session_item_id;

  if v_answered >= v_expected then
    update public.session_items set revealed = true where id = p_session_item_id;
  end if;
end;
$$ language plpgsql security definer;

create function public.trigger_check_reveal()
returns trigger as $$
begin
  perform public.check_and_reveal(new.session_item_id);
  return new;
end;
$$ language plpgsql;

create trigger after_answer_insert
  after insert on public.session_answers
  for each row execute procedure public.trigger_check_reveal();

-- =========================================================
-- 6. FAVORIS
-- =========================================================
create table public.favoris (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  content_id uuid references public.content_items(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, content_id)
);

-- =========================================================
-- 7. STATS
-- =========================================================
create table public.stats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  category text not null,
  sessions_count int default 0,
  victoires int default 0,
  defaites int default 0,
  nuls int default 0,
  updated_at timestamptz default now(),
  unique(user_id, couple_id, category)
);

-- =========================================================
-- 8. CHAT
-- =========================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade,
  sender_id uuid references public.users(id),
  content text not null,
  session_ref uuid references public.sessions(id),
  created_at timestamptz default now(),
  read boolean default false
);

-- =========================================================
-- 9. DEFIS DISCRETS
-- =========================================================
create table public.defis_discrets (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade,
  content_id uuid references public.content_items(id),
  lance_par uuid references public.users(id),
  statut text check (statut in ('propose','fait','devine','rate')) default 'propose',
  created_at timestamptz default now()
);

-- =========================================================
-- 10. ROW LEVEL SECURITY
-- =========================================================
alter table public.users enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.content_items enable row level security;
alter table public.content_seen enable row level security;
alter table public.sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.session_answers enable row level security;
alter table public.favoris enable row level security;
alter table public.stats enable row level security;
alter table public.messages enable row level security;
alter table public.defis_discrets enable row level security;

-- USERS
create policy "users_select_self" on public.users for select using (auth.uid() = id);
create policy "users_update_self" on public.users for update using (auth.uid() = id);

-- COUPLES : visible par les membres, et par le créateur juste après la création
-- (avant même que le lien couple_members existe, pour que l'INSERT...RETURNING fonctionne).
create policy "couples_select_member" on public.couples for select using (
  exists (select 1 from public.couple_members cm where cm.couple_id = id and cm.user_id = auth.uid())
);
create policy "couples_select_creator" on public.couples for select using (created_by = auth.uid());
create policy "couples_insert_own" on public.couples for insert with check (created_by = auth.uid());

-- COUPLE_MEMBERS
create policy "members_select_own_couple" on public.couple_members for select using (
  exists (select 1 from public.couple_members cm2 where cm2.couple_id = couple_id and cm2.user_id = auth.uid())
);
create policy "members_insert_self" on public.couple_members for insert with check (user_id = auth.uid());

-- CONTENT_ITEMS : lecture publique authentifiée, écriture réservée au service_role (aucune policy insert/update pour les clients)
create policy "content_select_all" on public.content_items for select using (auth.role() = 'authenticated');

-- CONTENT_SEEN
create policy "seen_select_own" on public.content_seen for select using (
  user_id = auth.uid() or exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);
create policy "seen_insert_own" on public.content_seen for insert with check (
  user_id = auth.uid() or exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);

-- SESSIONS
create policy "sessions_select_member" on public.sessions for select using (
  created_by = auth.uid() or exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);
create policy "sessions_insert_member" on public.sessions for insert with check (created_by = auth.uid());
create policy "sessions_update_member" on public.sessions for update using (
  created_by = auth.uid() or exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);

-- SESSION_ITEMS
create policy "session_items_select" on public.session_items for select using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id
    and (s.created_by = auth.uid() or exists (select 1 from public.couple_members cm where cm.couple_id = s.couple_id and cm.user_id = auth.uid()))
  )
);
create policy "session_items_insert" on public.session_items for insert with check (
  exists (select 1 from public.sessions s where s.id = session_id and s.created_by = auth.uid())
);
create policy "session_items_update" on public.session_items for update using (true);

-- SESSION_ANSWERS : chacun voit sa propre réponse toujours ; celle des autres seulement si revealed = true
create policy "answers_select_own_or_revealed" on public.session_answers for select using (
  user_id = auth.uid()
  or exists (select 1 from public.session_items si where si.id = session_item_id and si.revealed = true)
);
create policy "answers_insert_own" on public.session_answers for insert with check (user_id = auth.uid());

-- FAVORIS
create policy "favoris_all_own" on public.favoris for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- STATS
create policy "stats_select_own_or_couple" on public.stats for select using (
  user_id = auth.uid() or exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);

-- MESSAGES
create policy "messages_select_member" on public.messages for select using (
  exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);
create policy "messages_insert_member" on public.messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);

-- DEFIS DISCRETS
create policy "defis_discrets_select_member" on public.defis_discrets for select using (
  exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);
create policy "defis_discrets_insert_member" on public.defis_discrets for insert with check (
  lance_par = auth.uid() and exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);
create policy "defis_discrets_update_member" on public.defis_discrets for update using (
  exists (select 1 from public.couple_members cm where cm.couple_id = couple_id and cm.user_id = auth.uid())
);

-- =========================================================
-- SÉLECTION DE CONTENU CÔTÉ SERVEUR (évite le bug de répétition
-- dû aux limites de longueur d'URL des requêtes client)
-- =========================================================
create or replace function public.get_unseen_content(
  p_category text,
  p_subcategory text,
  p_level text,
  p_mode text,
  p_couple_id uuid,
  p_user_id uuid,
  p_limit int
)
returns setof public.content_items as $$
  select ci.* from public.content_items ci
  where ci.category = p_category
    and (p_subcategory is null or ci.subcategory = p_subcategory)
    and (p_level is null or ci.level = p_level)
    and ci.mode_scope in (p_mode, 'tous')
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

create or replace function public.get_content_with_fallback(
  p_category text,
  p_subcategory text,
  p_level text,
  p_mode text,
  p_couple_id uuid,
  p_user_id uuid,
  p_limit int
)
returns setof public.content_items as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.get_unseen_content(p_category, p_subcategory, p_level, p_mode, p_couple_id, p_user_id, p_limit);
  if v_count >= p_limit then
    return query select * from public.get_unseen_content(p_category, p_subcategory, p_level, p_mode, p_couple_id, p_user_id, p_limit);
  else
    return query
    select ci.* from public.content_items ci
    where ci.category = p_category
      and (p_subcategory is null or ci.subcategory = p_subcategory)
      and (p_level is null or ci.level = p_level)
      and ci.mode_scope in (p_mode, 'tous')
    order by random()
    limit p_limit;
  end if;
end;
$$ language plpgsql security definer;

create or replace view public.content_subcategories as
select distinct category, subcategory, mode_scope
from public.content_items;

grant select on public.content_subcategories to authenticated;

-- =========================================================
-- ACTIVATION DU TEMPS RÉEL (indispensable pour que les réponses
-- et messages apparaissent automatiquement sans recharger la page)
-- =========================================================
alter publication supabase_realtime add table public.session_answers;
alter publication supabase_realtime add table public.session_items;
alter publication supabase_realtime add table public.messages;

-- =========================================================
-- FIN DU SCRIPT
-- =========================================================
