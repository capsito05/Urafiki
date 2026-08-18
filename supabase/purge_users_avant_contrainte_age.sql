-- =========================================================
-- ⚠️  SCRIPT DESTRUCTIF ET IRRÉVERSIBLE ⚠️
-- =========================================================
-- Objectif : repartir sur une base d'utilisateurs propre, car des
-- comptes ont été créés AVANT la mise en place de la contrainte
-- d'âge obligatoire (migration_v2.sql). Ce script supprime TOUTES
-- les données applicatives des utilisateurs ET les comptes
-- d'authentification eux-mêmes (table auth.users). Après exécution,
-- tout le monde devra se réinscrire avec email + pseudo + mot de
-- passe + âge.
--
-- Ce script NE supprime PAS la banque de contenu (content_items),
-- qui n'est pas liée à des comptes utilisateurs.
--
-- À exécuter manuellement dans le SQL Editor de Supabase, une seule
-- fois, en connaissance de cause. Il n'y a pas de sauvegarde
-- automatique : si tu veux garder une trace, exporte d'abord les
-- tables concernées (Table Editor -> ... -> Export as CSV).
-- =========================================================

-- Ordre : des tables dépendantes vers les tables de base, pour ne
-- pas se heurter aux contraintes de clé étrangère (même si beaucoup
-- ont déjà ON DELETE CASCADE depuis public.users).
--
-- Certaines de ces tables (game_invitations, daily_challenge_completions,
-- push_subscriptions, answer_variants) n'existent que si migration_v3.sql
-- a déjà été exécuté. Ce script est prévu pour tourner APRÈS
-- migration_v3.sql (voir README.md), mais la boucle ci-dessous ignore
-- silencieusement toute table absente, pour rester sûr quel que soit
-- l'ordre réel d'exécution.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'public.session_answers',
    'public.session_items',
    'public.sessions',
    'public.content_seen',
    'public.defis_discrets',
    'public.messages',
    'public.favoris',
    'public.stats',
    'public.game_invitations',
    'public.daily_challenge_completions',
    'public.push_subscriptions',
    'public.answer_variants',
    'public.couple_members',
    'public.couples'
  ]
  loop
    if to_regclass(tbl) is not null then
      execute format('truncate table %s cascade', tbl);
    end if;
  end loop;
end $$;

truncate table public.users cascade;

-- Supprime les comptes d'authentification eux-mêmes. Nécessite d'être
-- exécuté avec des droits suffisants (le SQL Editor Supabase les a).
delete from auth.users;

-- =========================================================
-- FIN — vérifie avec : select count(*) from auth.users;  (doit renvoyer 0)
-- =========================================================
