-- =========================================================
-- MIGRATION V2 - Corrections de bugs + nouvelles fonctionnalités
-- A exécuter APRÈS schema.sql et seed_content.sql, dans le SQL Editor Supabase
-- =========================================================

-- ---------------------------------------------------------
-- BUG 1 : le temps réel ne fonctionnait pas (réponses qui
-- n'apparaissaient jamais automatiquement) car les tables
-- n'étaient jamais ajoutées à la publication realtime.
-- ---------------------------------------------------------
alter publication supabase_realtime add table public.session_answers;
alter publication supabase_realtime add table public.session_items;
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------
-- BUG 2 : impossible de créer un groupe. Cause : après l'INSERT
-- dans "couples", Supabase relit la ligne pour la renvoyer au
-- client, mais l'ancienne policy SELECT exigeait d'être déjà
-- membre (couple_members) — ce qui n'est pas encore le cas au
-- moment de la création. On ajoute une policy qui autorise le
-- créateur à relire sa propre ligne.
-- ---------------------------------------------------------
create policy "couples_select_creator" on public.couples for select using (created_by = auth.uid());

-- ---------------------------------------------------------
-- NOUVEAU : nom de groupe unique (insensible à la casse/espaces).
-- Le nom sert à éviter les doublons ; c'est toujours le CODE
-- généré automatiquement qui est partagé pour rejoindre.
-- ---------------------------------------------------------
alter table public.couples alter column nom set not null;
create unique index if not exists couples_nom_unique_idx on public.couples (lower(trim(nom)));

-- ---------------------------------------------------------
-- NOUVEAU : âge obligatoire à l'inscription, immuable ensuite.
-- ---------------------------------------------------------
alter table public.users add column if not exists age int;

create or replace function public.prevent_age_change()
returns trigger as $$
begin
  if old.age is not null and new.age is distinct from old.age then
    raise exception 'AGE_IMMUTABLE: l''âge ne peut pas être modifié après inscription.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_age_change on public.users;
create trigger trg_prevent_age_change
  before update on public.users
  for each row execute procedure public.prevent_age_change();

-- Le profil créé à l'inscription récupère maintenant l'âge fourni
create or replace function public.handle_new_user()
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

-- ---------------------------------------------------------
-- NOUVEAU : impossible de rejoindre ou créer un groupe "couple"
-- si on a moins de 20 ans — même si c'est un adulte qui partage
-- le code du groupe.
-- ---------------------------------------------------------
create or replace function public.check_couple_age()
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

drop trigger if exists trg_check_couple_age on public.couple_members;
create trigger trg_check_couple_age
  before insert on public.couple_members
  for each row execute procedure public.check_couple_age();

-- ---------------------------------------------------------
-- NOUVEAU : niveau de difficulté "impossible" en plus de facile/moyen/difficile.
-- ---------------------------------------------------------
alter table public.content_items drop constraint if exists content_items_level_check;
alter table public.content_items add constraint content_items_level_check
  check (level in ('facile','moyen','difficile','impossible'));

-- ---------------------------------------------------------
-- BUG 3 : les questions repassaient parfois en double. Cause :
-- la sélection du contenu non-vu se faisait côté client avec un
-- filtre "NOT IN (id1, id2, ..., id300)" — une fois qu'on a vu
-- beaucoup de contenu, cette liste devient trop longue pour
-- l'URL de la requête, qui échoue silencieusement et retombe sur
-- une sélection non filtrée. On déplace ce filtrage côté serveur
-- (PostgreSQL), qui n'a pas cette limite.
-- ---------------------------------------------------------
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

-- Si le stock non-vu est insuffisant, on retombe sur l'ensemble du
-- contenu disponible (le cycle recommence proprement).
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

-- ---------------------------------------------------------
-- Vue utilitaire : liste des sous-catégories disponibles par
-- catégorie (alimente le sélecteur de thème dans l'app).
-- ---------------------------------------------------------
create or replace view public.content_subcategories as
select distinct category, subcategory, mode_scope
from public.content_items;

grant select on public.content_subcategories to authenticated;

-- =========================================================
-- FIN DE LA MIGRATION
-- =========================================================
