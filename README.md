# Mon Prof Perso — Soutien scolaire à domicile (Côte d'Ivoire)

Implémentation native de la maquette **« Akwaba — Cours particuliers »** :
profs vérifiés, cours à domicile ou en ligne, paiement Mobile Money, prépa
BEPC & BAC. **37 écrans** reproduits fidèlement sur **deux apps natives
séparées** + une **API REST commune** et sa base de données.

```
monprofperso/
├── android/    App native Android — Kotlin + Jetpack Compose (37 écrans)
├── ios/        App native iOS     — Swift + SwiftUI (37 écrans)
├── backend/    API REST commune (Node/TS/Express) + PostgreSQL — docker compose
└── _maquette/  Maquette HTML d'origine (référence)
```

## 1. Démarrer le backend (API + DB)
```bash
cd backend
docker compose up --build -d
curl http://localhost:8099/health
```
Ports (choisis pour éviter les collisions sur la machine) :
**API 8099 · Postgres 5544 · Adminer 8098**. Détails : `backend/README.md`.

## 2. Lancer Android
Ouvrir `android/` dans Android Studio puis Run. L'app cible l'API via
`http://10.0.2.2:8099` (alias de l'hôte depuis l'émulateur). Voir `android/README.md`.

## 3. Lancer iOS
```bash
cd ios && xcodegen generate && open MonProfPerso.xcodeproj   # ou créer un projet Xcode manuel
```
L'app cible l'API via `http://localhost:8099`. Voir `ios/README.md`.

## API commune
Les deux apps consomment **exactement les mêmes endpoints** (mêmes modèles) :
`/api/subjects`, `/api/teachers`, `/api/teachers/:id`, `/api/courses`,
`/api/bookings`, `/api/progress`, `/api/groups`, `/api/subscription/plans`,
`/api/notifications`, `/api/wallet`, `/api/teacher/*`, `/api/referral`, `/api/auth/*`.

Écrans branchés en **live** sur l'API des deux côtés (ViewModels Android /
Stores iOS), avec **repli automatique sur les données locales de la maquette**
si l'API est injoignable :
**Accueil** (matières + profs reco), **Résultats de recherche**, **Profil du
professeur**, **Mes cours**, **Suivi des progrès**. Les autres écrans suivent le
même patron et restent fidèles à la maquette hors-ligne.

> Note : l'API parse les colonnes `NUMERIC` en nombres (et non en chaînes) pour
> que le décodage strict de `JSONDecoder` (iOS) fonctionne comme Gson (Android).

## Design system partagé
Mêmes couleurs (vert `#0E5A43`, orange `#E8722A`, crème `#ECE7DE`), mêmes polices
**Schibsted Grotesk** + **Hanken Grotesk** (bundlées dans les deux apps), icônes
Material (Android) / SF Symbols (iOS).

## Workflow dev → staging → prod
Développement local sur **`dev`**, tests sur **staging** (VPS), production sur **`prod`**.

```bash
# 1. Après push sur dev :
./scripts/release-staging.sh

# 2. Après validation staging :
./scripts/release-prod.sh --yes
```

Guide complet : [`docs/WORKFLOW.md`](docs/WORKFLOW.md).
