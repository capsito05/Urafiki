-- =========================================================
-- MIGRATION V3 - PUSH SERVEUR (notifications app fermée)
-- A exécuter APRÈS migration_v3.sql, une fois la Edge Function
-- "send-push" déployée (voir supabase/functions/send-push/README.md
-- pour les commandes de déploiement).
--
-- ⚠️ AVANT d'exécuter ce script, remplace les deux valeurs
-- ci-dessous par les tiennes :
--   - 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-push'
--     -> l'URL de ta Edge Function (visible après déploiement, ou
--     dans Project Settings > API > Project URL, en ajoutant
--     /functions/v1/send-push)
--   - 'YOUR-PUSH-TRIGGER-SECRET'
--     -> une chaîne aléatoire de ton choix (ex: générée avec
--     `openssl rand -hex 32`), la MÊME que celle mise dans le
--     secret PUSH_TRIGGER_SECRET de la Edge Function.
-- =========================================================

create extension if not exists pg_net;

-- Schéma privé, non exposé par l'API REST de Supabase (contrairement à
-- "public"), pour stocker l'URL de la fonction et le secret partagé.
create schema if not exists app_private;

create table if not exists app_private.push_config (
  key text primary key,
  value text not null
);

insert into app_private.push_config (key, value) values
  ('function_url', 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-push'),
  ('trigger_secret', 'YOUR-PUSH-TRIGGER-SECRET')
on conflict (key) do update set value = excluded.value;

-- Appelle la Edge Function de façon asynchrone (ne bloque jamais
-- l'insertion qui a déclenché la notification). Si function_url ou
-- trigger_secret ne sont pas configurés, ne fait rien silencieusement.
create or replace function app_private.trigger_push(p_user_id uuid, p_title text, p_body text, p_url text default '/accueil')
returns void as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from app_private.push_config where key = 'function_url';
  select value into v_secret from app_private.push_config where key = 'trigger_secret';

  if v_url is null or v_url = '' or v_url like '%YOUR-PROJECT-REF%' then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-trigger-secret', v_secret),
    body := jsonb_build_object('user_id', p_user_id, 'title', p_title, 'body', p_body, 'url', p_url)
  );
end;
$$ language plpgsql security definer set search_path = public, extensions;

-- ---------------------------------------------------------
-- "Nouveau message dans le chat"
-- ---------------------------------------------------------
create or replace function public.notify_new_message()
returns trigger as $$
declare
  v_member record;
begin
  for v_member in
    select user_id from public.couple_members where couple_id = new.couple_id and user_id != new.sender_id
  loop
    perform app_private.trigger_push(v_member.user_id, 'Nouveau message', left(new.content, 120), '/chat');
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute procedure public.notify_new_message();

-- ---------------------------------------------------------
-- "C'est ton tour de répondre" / "Ton/ta partenaire a répondu"
-- ---------------------------------------------------------
create or replace function public.notify_new_answer()
returns trigger as $$
declare
  v_couple_id uuid;
  v_member record;
  v_already_answered boolean;
begin
  select s.couple_id into v_couple_id
  from public.session_items si
  join public.sessions s on s.id = si.session_id
  where si.id = new.session_item_id;

  if v_couple_id is null then
    return new; -- solo : personne d'autre à notifier
  end if;

  for v_member in
    select user_id from public.couple_members where couple_id = v_couple_id and user_id != new.user_id
  loop
    select exists(
      select 1 from public.session_answers
      where session_item_id = new.session_item_id and user_id = v_member.user_id
    ) into v_already_answered;

    perform app_private.trigger_push(
      v_member.user_id,
      'Urafiki',
      case when v_already_answered then 'Ton/ta partenaire a répondu !' else 'C''est ton tour de répondre !' end,
      '/accueil'
    );
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_new_answer on public.session_answers;
create trigger trg_notify_new_answer
  after insert on public.session_answers
  for each row execute procedure public.notify_new_answer();

-- ---------------------------------------------------------
-- "Tu as reçu une invitation à jouer"
-- ---------------------------------------------------------
create or replace function public.notify_new_invitation()
returns trigger as $$
begin
  perform app_private.trigger_push(new.invited_user, 'Invitation à jouer', 'Tu as reçu une invitation à jouer sur Urafiki !', '/accueil');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_new_invitation on public.game_invitations;
create trigger trg_notify_new_invitation
  after insert on public.game_invitations
  for each row execute procedure public.notify_new_invitation();

-- =========================================================
-- FIN — pour tester manuellement une fois configuré :
-- select app_private.trigger_push('<un-user-id-valide>'::uuid, 'Test', 'Ça marche !');
-- puis vérifie select * from net._http_response order by created desc limit 1;
-- =========================================================
