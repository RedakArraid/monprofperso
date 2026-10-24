# Mon Prof Perso — API commune

API Node.js 24 / TypeScript / Express, consommée par le web, Android et iOS.
PostgreSQL 16 conserve les données ; les fichiers utilisent S3 lorsqu’il est
configuré, sinon un stockage BYTEA durable en base.

## Démarrer en local

```bash
cd backend
cp .env.example .env
# Renseigner les variables, puis :
docker compose up --build -d
curl --fail http://localhost:8099/health
```

Pour une démonstration locale sans prestataire, activer explicitement
`DEMO_MODE=true` et `PAYSTACK_MOCK=true` dans `.env`. La connexion exige toujours
un numéro de compte connu ; aucune route privée n’attribue de compte anonyme.
Le compte parent de test est `+2250758421903`, le professeur lié est
`+2250707001234`, et l’administrateur local est `+2250700000001`.
Ces numéros ne sont pas des accès de production.

| Service | Adresse locale |
| --- | --- |
| API | `http://localhost:8099` |
| Site et espace web | `http://localhost:8095` |
| PostgreSQL | `127.0.0.1:5544` |
| Adminer | `http://localhost:8098` |

Sans `S3_ENDPOINT`, les uploads restent en base. Pour MinIO local, lancer le
profil `local-minio` et définir `S3_ENDPOINT=minio` dans `.env`.

## Authentification et droits

Hors démo locale, `POST /api/auth/login` et `POST /api/auth/signup` renvoient
HTTP **202** avec `{otpRequired, challengeId, channel, destination,
expiresInMinutes, sent, demo}`. `destination` est masquée. Aucun jeton n’est
délivré à cette étape.

`POST /api/auth/verify-otp` reçoit `{challengeId, code}` et renvoie la session
`{token, user, verified, demo}` après preuve. Le renvoi utilise
`POST /api/auth/request-otp` avec `{challengeId}`. Les codes expirent, ont un
nombre d’essais limité et ne sont consommables qu’une fois.

Les appels privés envoient `Authorization: Bearer <token>`. Les JWT v2 expirent
après 24 heures ; les anciens JWT sont rejetés. Le rôle et le lien professeur
sont relus en base à chaque requête. Les routes `/api/teacher/*` exigent une
fiche professeur liée et validée ; `/api/admin/*` exige le rôle administrateur.
Le catalogue, les documents légaux et la soumission initiale d’un devis ou d’une
candidature restent publics. Le suivi d’une candidature et ses pièces ne le sont pas.

## Réservations et paiements

`POST /api/bookings` reçoit `teacherId`, `format`, `duration`, `startAt` (ISO
avec fuseau), et les informations du cours. Le serveur calcule le montant à
partir du tarif professeur et de la durée ; un ancien champ `price` envoyé par
un client ne fait pas autorité. La date doit être future. Le professeur accepte
la demande avant que le parent puisse payer.

| Méthode | Chemin | Comportement |
| --- | --- | --- |
| GET | `/api/courses` | Cours du parent, ou cours acceptés du professeur connecté |
| POST | `/api/teacher/requests/:courseId/accept` | Acceptation d’une réservation directe |
| POST | `/api/teacher/opportunities/:needId/accept` | Acceptation d’un besoin publié |
| POST | `/api/payments/charge-mobile` | Paiement d’un cours accepté et impayé |
| POST | `/api/payments/submit-otp` | Code demandé par le prestataire de paiement |
| GET | `/api/payments/:id/status` | État privé, avec `paid` confirmé côté serveur |
| POST | `/api/payments/paystack/webhook` | Notification Paystack signée |

Les états `pending`, `otp_required`, `failed` et `success` sont distincts.
Une relance réutilise le paiement incertain ; une réponse perdue ne crée pas
un second débit. Les vérifications externes sont espacées d’au moins dix
secondes par paiement. Un paiement n’est comptabilisé qu’après contrôle de la
référence, du montant, de la devise et du domaine test/live.

## Configuration des environnements

La configuration réelle exige un secret JWT aléatoire, un fournisseur OTP,
les proxies de confiance et, pour encaisser, une clé Paystack live.
La production et le staging refusent toute simulation locale.
Le staging utilise `APP_ENV=staging` et des clés Paystack test.
La production utilise `APP_ENV=production` et des clés live.
Sans clé, l’API de paiement répond 503 et ne confirme aucun encaissement.

Au premier démarrage exposé, `ADMIN_BOOTSTRAP_PHONE` doit remplacer le numéro
du compte administrateur seed par un numéro contrôlé. Le démarrage refuse une
valeur absente, inchangée ou déjà utilisée. Ce mécanisme ne promeut aucun autre
compte et ne modifie plus un administrateur déjà configuré.

Voir [SECURITY-RELEASE.md](../docs/SECURITY-RELEASE.md) avant tout déploiement.

## Tests et migrations

```bash
cd backend/api
npm ci --ignore-scripts
npm run build
npm run test:unit
```

La suite complète `npm test` exige une API locale avec `DEMO_MODE=true`,
`PAYSTACK_MOCK=true`, et une base PostgreSQL de test migrée accessible via
`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.
`API_URL` et `API_BASE` doivent pointer vers cette API. Les suites sont
séquentielles car certains scénarios utilisent le même catalogue seed.
Ne jamais exécuter les suites d’intégration contre une base de production.

La CI fournit automatiquement PostgreSQL, les variables et l’API nécessaires.
Les tests d’authentification réelle utilisent un faux fournisseur WhatsApp
sur loopback ; ceux du prestataire de paiement remplacent les réponses HTTP
en mémoire. Aucun message ni paiement réel n’est nécessaire pour ces tests.

Les migrations `api/migrations/*.sql` sont appliquées au démarrage avec
`node-pg-migrate`. Une erreur de migration empêche l’écoute HTTP.
La migration 29 exige de résoudre d’éventuelles candidatures actives en
doublon avant de créer sa contrainte d’unicité.

`docker compose down` arrête les services. Ne supprimer les volumes que pour
réinitialiser volontairement une base locale jetable.
