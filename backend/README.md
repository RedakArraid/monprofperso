# Mon Prof Perso — API commune

API Node.js 24 / TypeScript / Express, consommée par le web, Android et iOS.
PostgreSQL 16 conserve les données ; les fichiers utilisent S3 lorsqu’il est
configuré, sinon un stockage BYTEA durable en base.

Le périmètre proposé est celui des **cours individuels**, de leur planification
à leur réalisation et au règlement financier. `GET /api/capabilities` fournit
les capacités communes au web et aux applications : groupes, abonnements,
parrainage, messagerie et visioconférence intégrée sont désactivés dans les
parcours. Les cours en ligne restent désactivés par défaut ;
`ONLINE_COURSES_ENABLED=true` autorise le parcours avec lien HTTPS de réunion
externe fourni par le professeur.

La présence de ces fonctions et de leurs contrôles ne prouve pas qu’un service
est déployé ou ouvert. La préparation et l’ouverture réelle sont décrites dans
[PRODUCTION-OPERATIONS.md](../docs/PRODUCTION-OPERATIONS.md).

## Démarrer en local

```bash
cd backend
cp .env.example .env
# Renseigner les variables, puis :
docker compose up --build -d
curl --fail http://localhost:8099/health
```

Pour une démonstration locale sans prestataire, activer explicitement
`DEMO_MODE=true` et `PAYSTACK_MOCK=true` dans `.env` avant l’initialisation de la
base locale jetable. Les migrations n’insèrent les fixtures métier que dans ce
mode ; activer le flag après une migration déjà appliquée ne rejoue pas le seed.
La connexion exige toujours
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
fiche professeur liée ; les nouvelles réservations exigent un professeur
vérifié, non archivé et disposant d’un compte actif. L’archivage conserve le
compte nécessaire à la clôture des obligations. `/api/admin/*` exige le rôle administrateur.
Le catalogue, les documents légaux et la soumission initiale d’un devis ou d’une
candidature restent publics. Le suivi d’une candidature et ses pièces ne le sont pas.

`GET /api/auth/otp-channels` indique les canaux disponibles et `consentVersion`.
Les formulaires d’inscription, de candidature et de besoin public transmettent
cette version avec leur consentement. `409 consent_version_changed` exige une
nouvelle lecture et une nouvelle acceptation, sans reprise automatique de l’accord.
Les documents doivent être publiés avant l’inscription en production.

`GET/POST /api/account/consent` expose les versions actuelles et permet leur
acceptation explicite depuis les paramètres. Une ancienne version bloque les
nouvelles réservations, besoins ou charges concernés avec `consent_required`.
Les révisions des PDF et les reçus successifs de consentement sont conservés ;
les documents exacts associés à un ancien consentement inconnu ne sont pas inventés.

## Réservations et paiements

`POST /api/bookings` reçoit `teacherId`, `format`, `duration`, `startAt` (ISO
avec fuseau), et les informations du cours. Le serveur calcule le montant à
partir du tarif professeur et de la durée ; un ancien champ `price` envoyé par
un client ne fait pas autorité. La date doit être future. Le professeur accepte
la demande avant que le parent puisse payer. Le créneau doit aussi être confirmé :
un besoin accepté sans date reste `awaiting_schedule` jusqu’à l’accord des parties.
L’adresse privée est distincte de la commune affichée dans la demande.

| Méthode | Chemin | Comportement |
| --- | --- | --- |
| GET | `/api/courses` | Achats du compte et cours qu’il enseigne, avec `participant_role` par cours |
| GET | `/api/courses/:id` | Détail, contacts autorisés, propositions, comptes rendus, finances et permissions |
| POST | `/api/teacher/requests/:courseId/accept` | Acceptation d’une réservation directe |
| POST | `/api/teacher/opportunities/:needId/accept` | Acceptation d’un besoin publié |
| PUT | `/api/courses/:id/details` | Adresse privée, lien HTTPS externe ou précisions selon le rôle |
| POST | `/api/courses/:id/schedule` | Proposition de créneau initial ou de report |
| POST | `/api/courses/:id/schedule/:proposalId/respond` | Acceptation ou refus par l’autre partie ; contrôle des chevauchements |
| POST | `/api/courses/:id/cancel` | Annulation motivée, sans remboursement automatique |
| POST | `/api/courses/:id/report` | Déclaration de réalisation, absence ou problème après le créneau |
| POST | `/api/courses/:id/review` | Avis du payeur après réalisation confirmée |
| POST | `/api/payments/charge-mobile` | Paiement d’un cours accepté, planifié dans le futur et encore payable |
| POST | `/api/payments/submit-otp` | Code demandé par le prestataire de paiement |
| GET | `/api/payments/:id/status` | État privé, avec `paid` confirmé côté serveur |
| POST | `/api/payments/paystack/webhook` | Notification Paystack signée |

Les états `pending`, `otp_required`, `failed` et `success` sont distincts.
Une relance réutilise le paiement incertain ; une réponse perdue ne crée pas
un second débit. Les vérifications externes sont espacées d’au moins dix
secondes par paiement. Un paiement n’est comptabilisé qu’après contrôle de la
référence, du montant, de la devise et du domaine test/live.

Les montants applicatifs sont des entiers XOF ; le module paiement effectue
leur conversion en sous-unités prestataire. Les états simulés ou un ancien
libellé « paid » sans preuve ne constituent pas des fonds disponibles au reversement.

Les clients suivent `lifecycle_status` et les `permissions` du détail. Le rôle
`participant_role` prime sur le rôle global pour les actions du cours : un parent
devenu professeur conserve ses achats comme payeur. Les coordonnées privées sont
masquées au professeur avant acceptation. Les deux confirmations de réalisation
clôturent la séance ; une absence ou un litige nécessite une revue. Les bilans
de `/api/progress` viennent des comptes rendus pédagogiques du professeur, sans
notes scolaires fabriquées.

## Règlements, remboursements et reversements

La commission et le net convenus sont enregistrés avec le cours. Les notions
de prévisionnel, dû décidé, disponible, réservé et versé sont distinctes. Le dû
peut rester indéterminé tant que le cours ou le problème n’a pas été traité.

| Méthode | Chemin | Usage |
| --- | --- | --- |
| GET | `/api/teacher/earnings` | Relevé réel et historique des demandes du professeur |
| POST | `/api/teacher/payout-requests` | Réservation d’un montant libérable pour le téléphone vérifié du compte |
| POST | `/api/courses/:id/refund-requests` | Demande motivée du payeur ou de l’administrateur |
| GET | `/api/admin/finance` | Cours et synthèses financières, avec pagination |
| GET | `/api/admin/finance/operations` | Opérations filtrables par statut et paginées |
| POST | `/api/admin/finance/courses/:id/settlement` | Décision motivée de dû et de libération des fonds |
| POST | `/api/admin/finance/operations/:id/approve` | Approbation d’une demande, sans transfert automatique |
| POST | `/api/admin/finance/operations/:id/reject` | Rejet selon l’état et, si nécessaire, preuve d’échec ou confirmation de non-exécution |
| POST | `/api/admin/finance/operations/:id/verify` | Lecture et contrôle serveur de la référence prestataire |
| POST | `/api/admin/finance/operations/:id/resolve-review` | Nouvelle vérification et clôture d’une anomalie résolue |
| POST | `/api/admin/finance/reconcile` | Rapprochement borné des paiements et opérations en attente |

Les demandes utilisent `idempotencyKey` pour reprendre une action incertaine.
Les transactions et verrous protègent les plafonds, allocations et écritures
contre la double dépense. Le reversement exige un téléphone déjà vérifié et
une authentification récente ; les écritures financières administrateur exigent
également une authentification datant de moins de 15 minutes.

L’opérateur réalise le remboursement ou le transfert dans la console du
prestataire avant d’en soumettre la référence. **`requested` et `approved` ne
signifient pas qu’un mouvement a eu lieu.** Seule une preuve prestataire
concordante permet `verified`. Les inversions et incohérences restent tracées.
Une perte assumée par la plateforme nécessite une décision explicite et auditée,
sans augmenter artificiellement le disponible professeur.

## Compte, données personnelles et alertes

`GET /api/account/export` renvoie les données du compte, ses reçus de consentement
et les métadonnées de ses documents ; les originaux sont accessibles par les
routes privées `/api/account/documents/...`. L’export et la demande de suppression
exigent une authentification datant de moins de 15 minutes.

`GET/POST/DELETE /api/account/deletion-request` permet de consulter, demander
(`{confirmation:'SUPPRIMER'}`) ou annuler une fermeture en attente. Sans blocage,
la fermeture est immédiate ; sinon la réponse décrit les cours ou obligations
financières à clôturer. Les suppressions sont aussi suivies dans
`/api/admin/account-deletions`. Le retrait des fichiers S3 peut se poursuivre
en arrière-plan. Les preuves financières nécessaires restent conservées selon
la politique publiée ; le code n’invente pas de durée de conservation.

`GET/PUT /api/account/preferences` règle les alertes transactionnelles par
WhatsApp ou e-mail. L’activation dépend d’une destination vérifiée et d’un canal
disponible. `jobs.ts` traite rappels, file de notifications, rapprochements,
fermetures de comptes en attente et retrait des fichiers. Les notifications
externes exigent leur configuration explicite ; elles ne servent pas au marketing.

Les pages publiques `/suppression-compte.html`, `/aide.html` et
`/informations-service.html` orientent les utilisateurs vers ces parcours et les
informations réellement renseignées par l’exploitant.

## Configuration des environnements

La configuration réelle exige un secret JWT aléatoire, un fournisseur OTP,
les proxies de confiance et, pour encaisser, une clé Paystack live.
La production et le staging refusent toute simulation locale.
Le staging utilise `APP_ENV=staging` et des clés Paystack test.
La production utilise `APP_ENV=production` et des clés live.
Sans clé, l’API de paiement répond 503 et ne confirme aucun encaissement.

Au premier démarrage exposé, tant que le compte administrateur seed est présent,
`ADMIN_BOOTSTRAP_PHONE` doit remplacer son numéro par un numéro contrôlé. Le démarrage refuse une
valeur absente, inchangée ou déjà utilisée. Ce mécanisme ne promeut aucun autre
compte et ne modifie plus un administrateur déjà configuré.

`SERVICE_OPEN=false` est la configuration initiale de production. Les nouvelles
opérations concernées restent fermées jusqu’à la préparation de la configuration,
du catalogue réel, des documents et des preuves de recette. Des comptes de recette
restreints peuvent être déclarés avant ouverture ; cela ne dispense pas de l’OTP
ni des conditions prestataire de l’environnement.

`GET /api/admin/production-readiness` sépare configuration, contrôles runtime et
**validations déclarées par l’exploitant**. La révision et la configuration doivent
correspondre aux preuves enregistrées. `GET /api/admin/production-data-audit`
signale les données historiques à examiner ; aucun nettoyage financier n’est
effectué arbitrairement. Les informations et politiques sont gérées par
`/api/admin/operations-settings` et publiées via `/api/service-information`.

`/health` contrôle l’API et PostgreSQL ; `/ready` ne répond positivement que
lorsque la préparation et l’ouverture sont effectives. Ces contrôles ne
remplacent pas une recette prestataire ou un audit externe.

Voir [PRODUCTION-OPERATIONS.md](../docs/PRODUCTION-OPERATIONS.md) pour les versions,
l’activation, les sauvegardes, la restauration et la supervision, et
[SECURITY-RELEASE.md](../docs/SECURITY-RELEASE.md) pour les contrôles de sécurité.

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
