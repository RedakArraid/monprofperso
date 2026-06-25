# Akwaba — Backend partagé (API + base de données)

API REST **commune** consommée par les deux apps natives (Android & iOS) et
base PostgreSQL, le tout en `docker compose`.

## Démarrer
```bash
cd backend
docker compose up --build -d
curl http://localhost:8099/health      # {"status":"ok",...}
```

## Ports (choisis pour éviter les collisions sur cette machine)
| Service   | URL / port hôte            | Détail |
|-----------|----------------------------|--------|
| API       | http://localhost:8099      | Express + pg |
| Postgres  | localhost:5544 (→ 5432)    | user/pass/db = `monprofperso` |
| Adminer   | http://localhost:8098      | UI admin DB (Système : PostgreSQL, Serveur : `db`) |

> 5432 / 5433 / 6543 (Postgres/Supabase), 6379 (Redis) et 5000/7000/8000/8001/8088/8443
> étant déjà occupés, on utilise **8099 / 5544 / 8098**.

## Endpoints principaux
| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET  | `/health` | sonde |
| POST | `/api/auth/login` · `/auth/signup` · `/auth/verify-otp` | auth (mock) |
| GET  | `/api/me` | utilisateur courant |
| GET  | `/api/subjects` | matières |
| GET  | `/api/teachers?format=&level=` | liste profs |
| GET  | `/api/teachers/:id` | profil + avis |
| GET  | `/api/courses?status=upcoming\|done` | mes cours |
| POST | `/api/bookings` | réserver un cours |
| GET  | `/api/notifications` | notifications |
| GET  | `/api/wallet` | comptes + transactions |
| GET  | `/api/groups` · `/api/groups/:id` | cours en groupe |
| GET  | `/api/subscription/plans` · `/subscription/mine` | abonnement |
| GET  | `/api/progress` | suivi élève |
| GET  | `/api/teacher/dashboard` · `/teacher/requests` · `/teacher/earnings` | espace prof |
| GET  | `/api/referral` | parrainage |

## Base d'URL côté apps
- **iOS (simulateur)** : `http://localhost:8099`
- **Android (émulateur)** : `http://10.0.2.2:8099` (alias de l'hôte)
- **Appareil physique** : `http://<IP-LAN-de-votre-Mac>:8099`

Ces valeurs sont centralisées dans `ApiConfig` (Android) et `ApiConfig` (iOS).

## Tests d'intégration
Runner natif Node (aucune dépendance). La stack doit tourner :
```bash
docker compose up -d
cd api && npm test                       # cible http://localhost:8099 par défaut
API_URL=http://autre-hote:8099 npm test  # cible personnalisée
```
Couvre les formes de réponse (contrat partagé Android/iOS) et la validation
des entrées (HTTP 400). Source : `api/test/*.test.mjs`.

## Migrations (base de données)
Le schéma et le seed sont gérés par **`node-pg-migrate`** (`api/migrations/*.sql`)
et **appliqués automatiquement au démarrage de l'API** (plus de `init.sql`). L'état
est suivi dans la table `pgmigrations`, donc les migrations sont idempotentes.

```bash
# Créer une nouvelle migration (génère un .sql horodaté à éditer)
cd api && npm run migrate create ma-modif
# Repartir d'une base vierge (re-migrée au prochain up)
docker compose down -v && docker compose up -d
```

## Authentification (JWT)
`login` / `signup` / `verify-otp` renvoient un **JWT signé** (HS256, secret
`JWT_SECRET`). Pour des appels scopés sur un utilisateur précis, envoyer
`Authorization: Bearer <token>`. **Rétrocompat** : sans en-tête (ou token
invalide), l'API retombe sur l'utilisateur de démo (`DEMO_USER = 1`), donc les
clients existants continuent de fonctionner.

## Configuration (.env)
Identifiants DB, `JWT_SECRET` et ports hôte sont lus depuis `backend/.env`
(non versionné). Au premier clone : `cp .env.example .env` puis ajuster.
⚠️ En prod, `JWT_SECRET` doit être une chaîne aléatoire forte (32+ caractères).

## Arrêter / réinitialiser
```bash
docker compose down            # stoppe
docker compose down -v         # stoppe + efface la base (re-seed au prochain up)
```
