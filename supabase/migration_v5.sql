-- =========================================================
-- MIGRATION V5 - Rotation automatique hebdomadaire du contenu
-- A executer APRES migration_v4.sql.
--
-- Le contenu "deja vu" par un groupe/utilisateur est retenu dans
-- content_seen pour eviter les repetitions immediates. Sans nettoyage,
-- cette table grossit indefiniment et, une fois toute la banque
-- "vue", le systeme retombe sur du contenu deja vu en boucle
-- (comportement de secours existant, voir get_content_with_fallback_v3).
--
-- Cette migration ajoute une tache planifiee (pg_cron) qui, chaque
-- lundi a 3h du matin, supprime les entrees "vues" de plus de 30
-- jours : le contenu redevient progressivement "nouveau" pour chaque
-- groupe/utilisateur, sans jamais toucher a la banque de contenu
-- elle-meme (content_items n'est pas modifiee).
--
-- ⚠️ pg_cron n'est pas forcement disponible selon ton plan Supabase.
-- Si "create extension pg_cron" echoue (permission refusee), ce
-- script n'est pas critique : l'app fonctionne normalement sans lui
-- (systeme de secours deja en place), tu peux simplement l'ignorer.
-- =========================================================

create extension if not exists pg_cron;

select cron.unschedule('urafiki-weekly-content-rotation')
where exists (select 1 from cron.job where jobname = 'urafiki-weekly-content-rotation');

select cron.schedule(
  'urafiki-weekly-content-rotation',
  '0 3 * * 1',
  $$ delete from public.content_seen where seen_at < now() - interval '30 days'; $$
);

-- =========================================================
-- FIN — pour verifier que la tache est bien programmee :
-- select jobname, schedule, active from cron.job where jobname = 'urafiki-weekly-content-rotation';
-- =========================================================
