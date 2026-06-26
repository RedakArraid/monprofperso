# CLAUDE.md — Mon Prof Perso

Mémoire projet pour agents IA (Claude Code, Cursor, etc.). Lis ce fichier avant
toute intervention. Garde-le à jour quand l'architecture change.

## Vue d'ensemble
Plateforme de **soutien scolaire à domicile en Côte d'Ivoire** (profs vérifiés,
cours à domicile ou en ligne, paiement Mobile Money, prépa BEPC & BAC).
Implémentation native de la maquette **« Akwaba — Cours particuliers »** :
**37 écrans** reproduits fidèlement sur **deux apps natives** qui consomment
**une seule API REST commune**.

Statut : **prototype démo fonctionnel** (auth et paiement simulés, mono-utilisateur).

## Structure du monorepo
```
android/    App Android — Kotlin + Jetpack Compose (~4400 lignes)
ios/        App iOS     — Swift + SwiftUI (~3080 lignes, 37 vues)
backend/    API REST commune — Node/TS + Express + PostgreSQL (docker compose)
_maquette/  Maquette HTML d'origine (référence, gitignorée)
docs/       Présentation .docx + assets (captures d'écran)
```

## Backend (`backend/`)
- Stack : **Express 4 + pg** (~240 lignes TS), **PostgreSQL 16**, **Adminer**.
- Source : `api/src/db.ts` (pool pg), `api/src/routes.ts` (toutes les routes),
  `api/src/server.ts` (bootstrap). Routeur monté sous `/api`.
- DB gérée par **migrations versionnées** (`node-pg-migrate`, `api/migrations/*.sql`,
  appliquées automatiquement au démarrage de l'API). `001_init-schema` crée les
  10 tables (`subjects`, `teachers`, `reviews`, `users`, `courses`, `notifications`,
  `transactions`, `group_courses`, `subscription_plans`, `progress_subjects`),
  `002_seed-data` insère les données de démo, `1700000002000_subscription-referral`
  ajoute les tables user-scoped `user_subscriptions` + `referrals`, et
  `1700000003000_admin-catalog-resources` ajoute `levels` + `resources` (cours/devoirs/
  exercices avec fichier) et un utilisateur admin (14 tables au total).
  Suivi dans la table `pgmigrations`.
  Créer une migration : `npm run migrate create <nom>` (puis éditer le `.sql`).
- **Ports (custom, pour éviter les collisions)** : API **8099**, Postgres **5544**,
  Adminer **8098**. Configurables via `backend/.env` (voir `.env.example`).
- **Secrets / config** : identifiants DB et ports dans `backend/.env` (non versionné,
  interpolés par `docker-compose.yml`). Copier `.env.example` → `.env` au premier clone.
- **Validation des entrées** : `api/src/validate.ts` — helpers sans dépendance,
  permissifs (les défauts serveur restent) mais rejettent tout champ malformé (HTTP 400).
  `requiredString`/`requiredEnum` pour les écritures admin (champs obligatoires).
- Endpoints publics/user : `/health`, `/api/auth/{login,signup,verify-otp}`, `/api/me`,
  `/api/subjects`, `/api/levels`, `/api/teachers[?format=&level=]`, `/api/teachers/:id`,
  `/api/courses[?status=upcoming|done]`, `/api/bookings`, `/api/notifications`,
  `/api/wallet`, `/api/groups[/:id]`, `/api/subscription/{plans,mine}`,
  `/api/progress`, `/api/teacher/{dashboard,requests,earnings}`, `/api/referral`,
  `/api/resources[?type=&subject=&level=]`, `/api/files/:id`.
- **Espace admin** (réservé au rôle `admin`, garde `requireAdmin`) :
  `POST/PUT/DELETE /api/admin/subjects[/:slug]`, `POST/DELETE /api/admin/levels[/:slug]`,
  `POST/DELETE /api/admin/resources[/:id]`. Permet d'ajouter matières (musique, langues
  hors FR/EN…), niveaux (supérieur/universitaire…) et ressources pédagogiques
  (cours/devoirs/exercices) avec fichier (uploadé en base64, stocké en `BYTEA`).
- **Auth JWT** (`api/src/auth.ts`, HS256 via `crypto` natif, secret `JWT_SECRET`).
  login/signup/verify-otp émettent un vrai JWT (`sub` = id user). Middleware
  `optionalAuth` : si `Authorization: Bearer <jwt>` valide → utilisateur courant = `sub`,
  sinon **repli sur `DEMO_USER = 1`**. Les **deux apps envoient désormais l'en-tête** :
  login/signup/verify-otp appellent l'API, persistent le JWT (TokenStore →
  SharedPreferences Android / UserDefaults iOS) et l'injectent sur tous les appels
  (intercepteur OkHttp côté Android, `URLRequest` côté iOS). Sans token → repli démo
  (rétrocompat). Endpoints user-scoped utilisent `currentUserId(res)`. Le rôle est
  porté par le JWT ; `requireAdmin` garde l'espace admin (401 sans token, 403 si non-admin).
  Utilisateur admin de démo : `+2250700000001`.
  ⚠️ Reste à faire : OTP SMS réel, paiement réel (Phase 1/2 — voir docs/ROADMAP.md).
- **Tests** : `api/test/*.test.mjs` (runner natif Node, `npm test`, stack live requise) — 38 tests.
  `api.test.mjs` = intégration par endpoint ; `e2e.test.mjs` = parcours bout-en-bout
  (inscription→réservation→relecture, isolation JWT entre comptes, repli démo, prof,
  catalogue). Les 20 endpoints sont couverts.
- Détail NUMERIC : l'API parse les colonnes `NUMERIC` en nombres (pas en chaînes)
  pour que le décodage strict de `JSONDecoder` (iOS) marche comme Gson (Android).

Lancer :
```bash
cd backend && docker compose up --build -d && curl http://localhost:8099/health
docker compose down -v   # reset complet (re-seed au prochain up)
```

## Android (`android/`)
- Kotlin + Jetpack Compose (BOM 2024.09), `compileSdk 34 / minSdk 24 / targetSdk 34`.
- Namespace / applicationId : `ci.monprofperso.app`.
- Arbo : `nav/` (NavGraph, NavActions), `data/` (ViewModels + `MonProfPersoApi` Retrofit
  + `ApiModels` + `AppState`), `ui/screens/`, `ui/components/`, `ui/theme/`.
- Base URL API : `ApiConfig.BASE_URL = http://10.0.2.2:8099/` (alias hôte depuis l'émulateur),
  dans `data/MonProfPersoApi.kt`.
- Ouvrir `android/` dans Android Studio puis Run.

## iOS (`ios/`)
- Swift + SwiftUI, projet généré via **XcodeGen** (`project.yml`).
- Arbo : `App/` (Router, App, Info.plist), `Networking/ApiClient.swift`,
  `Screens/`, `Components/`, `Theme/`, `Resources/Fonts/`.
- Base URL API : `ApiConfig.baseURL = http://localhost:8099` dans `Networking/ApiClient.swift`.
- Lancer : `cd ios && xcodegen generate && open MonProfPerso.xcodeproj`.

## Pattern clé (les deux apps)
Écrans branchés **en live** sur l'API (ViewModels Android / Stores iOS) avec
**repli automatique sur les données locales de la maquette** si l'API est injoignable.
Les écrans live : Accueil, Résultats de recherche, Profil prof, Mes cours, Suivi des progrès.
Les autres écrans suivent le même patron et restent fidèles à la maquette hors-ligne.

## Design system partagé
Vert `#0E5A43`, orange `#E8722A`, crème `#ECE7DE`. Polices **Schibsted Grotesk** +
**Hanken Grotesk** (bundlées des deux côtés). Icônes Material (Android) / SF Symbols (iOS).

## Conventions & garde-fous
- Toute modification d'API doit rester **identique** pour Android et iOS (mêmes modèles).
- Modifier un modèle → mettre à jour `ApiModels.kt` (Android) ET les types décodés iOS.
- Garder les valeurs en français (UI destinée à un public ivoirien).
- Les secrets DB sont en clair dans `docker-compose.yml` — OK en démo, à externaliser
  avant prod.

## État Git
Repo initialisé mais **sans commit** au 2026-06-24 (tout en untracked). Pas encore de remote.
