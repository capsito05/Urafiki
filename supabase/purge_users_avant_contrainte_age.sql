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
truncate table
  public.session_answers,
  public.session_items,
  public.sessions,
  public.content_seen,
  public.defis_discrets,
  public.messages,
  public.favoris,
  public.stats,
  public.game_invitations,
  public.daily_challenge_completions,
  public.push_subscriptions,
  public.answer_variants,
  public.couple_members,
  public.couples
cascade;

truncate table public.users cascade;

-- Supprime les comptes d'authentification eux-mêmes. Nécessite d'être
-- exécuté avec des droits suffisants (le SQL Editor Supabase les a).
delete from auth.users;

-- =========================================================
-- FIN — vérifie avec : select count(*) from auth.users;  (doit renvoyer 0)
-- =========================================================
