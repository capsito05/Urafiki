# Déployer les notifications push (app fermée)

Cette Edge Function envoie les notifications push serveur (Denji... non,
Urafiki 🙂) déclenchées par `migration_v3_push.sql` : nouveau message,
partenaire a répondu / c'est ton tour, invitation reçue.

## 1. Installer la CLI Supabase (si pas déjà fait)

```bash
npm install -g supabase
supabase login
```

## 2. Lier ce dossier à ton projet Supabase

Depuis la racine du repo :

```bash
cd "supabase"
supabase link --project-ref TON-PROJECT-REF
```

(`TON-PROJECT-REF` est visible dans l'URL de ton dashboard Supabase, ou
dans Project Settings > General.)

## 3. Générer une paire de clés VAPID (si tu n'as pas déjà celles fournies dans le résumé de la session)

```bash
npx web-push generate-vapid-keys
```

## 4. Configurer les secrets de la fonction

```bash
supabase secrets set VAPID_PUBLIC_KEY="<ta clé publique>"
supabase secrets set VAPID_PRIVATE_KEY="<ta clé privée>"
supabase secrets set VAPID_SUBJECT="mailto:ton-email@example.com"
supabase secrets set PUSH_TRIGGER_SECRET="<une chaîne aléatoire, ex: openssl rand -hex 32>"
```

⚠️ `VAPID_PRIVATE_KEY` et `PUSH_TRIGGER_SECRET` sont des secrets : ne les
mets JAMAIS dans un fichier commité (le dépôt est public). Seule
`VAPID_PUBLIC_KEY` va aussi côté frontend (`VITE_VAPID_PUBLIC_KEY`, dans
les variables d'environnement Netlify — pas besoin de la cacher, elle est
publique par nature).

## 5. Déployer la fonction

```bash
supabase functions deploy send-push --no-verify-jwt
```

(`--no-verify-jwt` car les triggers Postgres appellent la fonction avec
un secret partagé dans l'en-tête `x-trigger-secret`, pas un JWT
utilisateur.)

## 6. Configurer les déclencheurs SQL

Dans le SQL Editor Supabase, ouvre `supabase/migration_v3_push.sql`,
remplace les deux placeholders en haut du fichier (`function_url` avec
l'URL affichée après le déploiement à l'étape 5, et `trigger_secret` avec
la même valeur que `PUSH_TRIGGER_SECRET`), puis exécute le script.

## 7. Frontend

Ajoute `VITE_VAPID_PUBLIC_KEY` (ta clé publique) dans :
- `frontend/.env` en local
- Site settings > Environment variables sur Netlify (puis redéploie)

## Tester

Une fois tout configuré, dans le SQL Editor :

```sql
select app_private.trigger_push('<un user_id valide>'::uuid, 'Test', 'Ça marche !');
select * from net._http_response order by created desc limit 1;
```

Si `status_code` vaut 200, c'est bon. Si tu as une notification active
sur ton appareil (permission accordée depuis la page Réglages), elle doit
apparaître même app fermée.
