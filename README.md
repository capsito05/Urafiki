# App Jeux / Questions — Couple, Ami·e·s, Solo

## ⚠️ IMPORTANT — Mise à jour v4

Ordre à exécuter dans le SQL Editor Supabase :

**Projet Supabase déjà existant (v2 ou antérieur) :**
1. `supabase/migration_v2.sql` (si pas déjà fait)
2. `supabase/migration_v2_content.sql` (si pas déjà fait)
3. `supabase/migration_v3.sql` (nouvelles tables/RPC/policies : invitations, réponses alternatives, réglages, défi du jour, stats, notifications push)
4. (optionnel, destructif) `supabase/purge_users_avant_contrainte_age.sql` — si tu as des comptes créés avant la contrainte d'âge, à réinitialiser
5. `supabase/migration_v3_content.sql` (remplace ENTIÈREMENT le contenu de la banque par la version v3 — 790 items)
6. (optionnel) Notifications push app fermée : voir `supabase/functions/send-push/README.md` pour déployer la Edge Function, puis exécuter `supabase/migration_v3_push.sql`
7. `supabase/migration_v4.sql` (AJOUTE du contenu, ne supprime rien : "Qui est-ce ?", contenu hot couple, +30 par sous-catégorie jeux_ensemble, correctif style/hot pour les invitations)

**Projet Supabase tout neuf :**
1. `supabase/schema.sql`
2. `supabase/migration_v3.sql`
3. `supabase/migration_v3_content.sql` (à la place de seed_content.sql + migration_v2_content.sql)
4. (optionnel) `supabase/functions/send-push/` + `migration_v3_push.sql` pour les notifications push app fermée
5. `supabase/migration_v4.sql`

## Bugs corrigés en v4
- Le style de jeu (2.1) et le nouveau filtre hot/normal n'étaient **jamais appliqués** pour un groupe de 2+ membres : ces groupes passent systématiquement par l'écran d'invitation (`Inviter.tsx`), qui ne proposait ni sélecteur de style ni filtre, et la table `game_invitations` n'avait même pas de colonne pour les stocker. Corrigé (colonnes `style`/`hot` ajoutées, sélecteurs ajoutés à l'écran d'invitation).
- Réponses très courtes (ex: "L", "7") : la tolérance aux fautes de frappe pouvait accepter à tort une réponse totalement différente mais de longueur proche (ex: "8" jugé correct pour "7"). Corrigé : les réponses de 2 caractères ou moins exigent désormais une correspondance exacte.
- `.env` n'était pas exclu du suivi git alors que le dépôt est public (risque de fuite de clés si le fichier est un jour ajouté par erreur).

## Nouveautés v4
- Nouveau mini-jeu "Qui est-ce ?" : 103 personnages manga/anime (Dragon Ball, One Piece, Naruto, Hunter x Hunter, Fairy Tail, Death Note, GTO, Assassination Classroom, Bleach, Kuroko's Basketball) et 29 personnalités connues (jeux_ensemble).
- Contenu "hot" en mode Couple : bascule 🔥 sur l'écran de configuration (et sur l'écran d'invitation) pour piocher parmi 30 questions et 30 défis un peu plus coquins, séparés du contenu classique.
- +30 items dans chacune des 10 sous-catégories existantes de jeux_ensemble (défis/gages, énigmes, existentiel, farfelues, jeux compétitifs/coopératifs, questions souvenir, qui de nous deux, souvenirs, tu préfères).
- "Mes groupes" et l'écran pour rejoindre un groupe permettent maintenant de rejoindre un groupe déjà connu en un clic (sans ressaisir de code), et de partager/copier le code d'invitation depuis un bouton dédié. Accessible aussi depuis Réglages.

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
- `supabase/content_bank.json` : banque de contenu (1282 questions/énigmes/défis), lisible/éditable facilement — fichier source, pas chargé directement par l'app.
- `supabase/migration_v3_content.sql` : la banque v3 (790 items), prête à insérer en base (généré depuis une version antérieure de content_bank.json). `supabase/migration_v4.sql` ajoute les 492 items suivants (ne pas régénérer v3_content depuis le fichier actuel, il remplacerait tout).
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
