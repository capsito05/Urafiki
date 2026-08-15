# App Jeux / Questions — Couple, Ami·e·s, Solo

## ⚠️ IMPORTANT — Mise à jour v3

Ordre à exécuter dans le SQL Editor Supabase :

**Projet Supabase déjà existant (v2 ou antérieur) :**
1. `supabase/migration_v2.sql` (si pas déjà fait)
2. `supabase/migration_v2_content.sql` (si pas déjà fait)
3. `supabase/migration_v3.sql` (nouvelles tables/RPC/policies : invitations, réponses alternatives, réglages, défi du jour, stats, notifications push)
4. (optionnel, destructif) `supabase/purge_users_avant_contrainte_age.sql` — si tu as des comptes créés avant la contrainte d'âge, à réinitialiser
5. `supabase/migration_v3_content.sql` (remplace ENTIÈREMENT le contenu de la banque par la version à jour — 790 items)
6. (optionnel) Notifications push app fermée : voir `supabase/functions/send-push/README.md` pour déployer la Edge Function, puis exécuter `supabase/migration_v3_push.sql`

**Projet Supabase tout neuf :**
1. `supabase/schema.sql`
2. `supabase/migration_v3.sql`
3. `supabase/migration_v3_content.sql` (à la place de seed_content.sql + migration_v2_content.sql)
4. (optionnel) `supabase/functions/send-push/` + `migration_v3_push.sql` pour les notifications push app fermée

## Bugs corrigés en v3
- La table `stats` n'était jamais alimentée (aucun code n'écrivait dedans) → l'onglet Statistiques était toujours vide. Corrigé via une RPC dédiée appelée à la fin de chaque session.
- 7 réponses vrai/faux ne pouvaient jamais matcher (texte explicatif mélangé à "Vrai"/"Faux").
- "Tu préfères" et "Qui de nous deux" étaient mal typés en QCM classique.
- 10 questions manga sans le nom de la série dans le texte affiché.
- Timer, compteur de question, sliders de configuration : vérifiés, déjà corrects dans la base de code actuelle.
- RevealAnswer affichait toujours "Autre joueur" au lieu des vrais pseudos.
- Un seul groupe géré par utilisateur, malgré la structure de données qui en permettait plusieurs.

## Nouveautés v3
- Styles de jeu (Quiz / Réponse libre / Énigmes / Tu préfères / Discussion / Défis).
- Défis et gages en case à cocher Fait/Pas fait (fini le champ texte).
- Tolérance orthographique et phonétique étendue + réponses alternatives validées par les joueurs, appliquées globalement.
- "Mes groupes" (plusieurs groupes par utilisateur), invitations à jouer en temps réel dès que le groupe a 2+ membres.
- Page Réglages, bouton Quitter, bouton Rejouer, classement de groupe, chrono cumulé.
- Défi du jour avec streak, partage de score (image + Web Share).
- Notifications push, y compris app fermée (Edge Function + déclencheurs Postgres, voir `supabase/functions/send-push/README.md`) : nouveau message, c'est ton tour / partenaire a répondu, invitation reçue.
- Error Boundary global, texte des questions agrandi/en gras.

## Contenu de ce projet

- `supabase/schema.sql` : script complet à exécuter dans l'éditeur SQL de ton projet Supabase (tables, RLS, triggers).
- `supabase/content_bank.json` : banque de contenu (790 questions/énigmes/défis), lisible/éditable facilement — fichier source, pas chargé directement par l'app.
- `supabase/migration_v3_content.sql` : la banque à jour, prête à insérer en base (généré depuis content_bank.json).
- `supabase/seed_content.sql` / `migration_v2_content.sql` : anciennes versions de la banque, conservées pour l'historique — ne plus utiliser seules, préférer migration_v3_content.sql.
- `frontend/` : application React + TypeScript + Vite, connectée à Supabase, installable comme une app (PWA).
- `netlify.toml` : configuration de déploiement Netlify (déjà prête, rien à configurer manuellement côté build).

## Pour lancer le frontend en local (plus tard, avec tes clés Supabase)

```bash
cd frontend
npm install
cp .env.example .env   # puis remplis avec tes clés Supabase
npm run dev
```

## Statut actuel

- ✅ Schéma de base de données complet avec sécurité (RLS)
- ✅ Banque de contenu de départ (extensible)
- ✅ Authentification (inscription/connexion)
- ✅ Choix du mode (Couple / Ami·e·s / Solo) + création/rejoint de groupe via code d'invitation
- ✅ Navigation par catégories, configuration de session (niveau, nombre, timer)
- ✅ Déroulement de session avec réponses cachées puis révélées en temps réel (Supabase Realtime)
- ✅ Timer avec pause et ajustements
- ✅ Chat temps réel
- ✅ Statistiques (perso / couple / favoris) avec graphiques
- ✅ Défi discret (mode couple)
- ⏳ Rotation automatique hebdomadaire (actuellement gérée à la création de session ; une Edge Function planifiée pourra être ajoutée ensuite)
- ⏳ Écriture des favoris depuis l'interface (bouton à ajouter sur QuizCard)
- ⏳ Déploiement Supabase / GitHub / Netlify (prochaine étape, avec toi)
