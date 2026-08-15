# App Jeux / Questions — Couple, Ami·e·s, Solo

## ⚠️ IMPORTANT — Mise à jour v2 (corrections de bugs)

Si tu as déjà une base Supabase existante (créée avant cette version), exécute dans l'ordre, dans le SQL Editor Supabase :
1. `supabase/migration_v2.sql` (corrige : temps réel, création de groupe, âge, niveau impossible, rotation du contenu)
2. `supabase/migration_v2_content.sql` (corrections de réponses + nouvelles questions niveau impossible)

Si tu pars de zéro, `schema.sql` contient déjà toutes ces corrections — pas besoin des fichiers migration_v2.

## Bugs corrigés dans cette version
- Le temps réel ne fonctionnait pas (réponses qui n'apparaissaient jamais automatiquement) → tables ajoutées à la publication realtime.
- Impossible de créer un groupe → policy RLS manquante corrigée.
- Le timer restait figé entre deux questions → composants correctement réinitialisés (clé React).
- On revenait à la question précédente en cliquant "suivant" → même cause que ci-dessus.
- Les questions répétaient parfois → sélection de contenu déplacée côté serveur (évite la limite de longueur d'URL).
- Impossible de choisir un thème (ex: philosophie) → sélecteur de thème ajouté à l'écran de configuration.
- Pas de score visible, pas de ✅/❌ → ajoutés (score en direct + écran de résultat final).
- Réponses ambiguës corrigées dans la banque de contenu.

## Nouveautés
- Niveau de difficulté "Impossible" en plus de facile/moyen/difficile.
- Âge obligatoire à l'inscription (immuable), mode Couple réservé aux 20 ans et plus (y compris si un adulte partage son code).
- Création de groupe avec nom unique + possibilité de jouer seul en attendant que l'autre rejoigne (pour tester).
- Page "Installer / Inviter" avec QR code pointant vers l'app.

## Contenu de ce projet

- `supabase/schema.sql` : script complet à exécuter dans l'éditeur SQL de ton projet Supabase (tables, RLS, triggers).
- `supabase/content_bank.json` : banque de contenu (446 questions/énigmes/défis), lisible/éditable facilement. Répartition : Général 203, Jeux ensemble 111, Mieux se connaître 58, Manga 74. Couvre environ 3 mois sans répétition à un rythme de 3-4 sessions/semaine.
- `supabase/seed_content.sql` : la même banque, prête à insérer en base.
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
