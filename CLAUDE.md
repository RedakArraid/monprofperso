# CLAUDE.md — Mon Prof Perso

Mémoire projet pour les agents de développement. Lire ce fichier avant une
intervention et le mettre à jour lorsque l’architecture ou les contrats changent.

## Vue d’ensemble et périmètre

Plateforme de soutien scolaire en Côte d’Ivoire, avec site public, espace web,
administration, applications Android et iOS et API REST commune.

Le périmètre fonctionnel est celui des **cours individuels** : recherche,
réservation ou besoin à tarifer, acceptation professeur, planification, paiement,
coordonnées privées, report, annulation, réalisation ou problème, bilan, avis,
remboursement et règlement du professeur. L’agenda et les montants proviennent
des données métier ; les notes publiques proviennent des avis enregistrés.

`GET /api/capabilities` est le contrat commun de disponibilité des modules :
groupes, abonnements, parrainage, messagerie et visio intégrée sont désactivés.
Des tables, routes de lecture ou écrans historiques peuvent subsister ; leur
présence ne signifie pas que le module est proposé. Les cours en ligne exigent
`ONLINE_COURSES_ENABLED=true` et utilisent un lien HTTPS de réunion externe.

Le dépôt contient une implémentation et des contrôles de mise en service. Ne pas
déduire un déploiement, une recette prestataire, une publication mobile ou une
conformité juridique à partir de la présence du code. Consulter
`docs/PRODUCTION-OPERATIONS.md`, `docs/SECURITY-RELEASE.md` et la CI de la révision
concernée. Node.js 24 et les lockfiles npm servent aux builds reproductibles.

## Structure du monorepo

| Chemin | Responsabilité |
| --- | --- |
| `backend/api/src/` | API Express / TypeScript, authentification, workflows, paiements, comptes, worker et contrôles d’ouverture |
| `backend/api/migrations/` | Migrations PostgreSQL versionnées, appliquées avant l’écoute HTTP |
| `backend/api/test/` | Tests Node natifs, unitaires et d’intégration |
| `webapp/` | React / Vite / Tailwind ; compilation vers `web/espace/` |
| `web/` | Vitrine statique, formulaires publics, aide, informations du service et suppression de compte |
| `web/admin/` | Administration HTML/CSS/JS, servie sur `/admin/` |
| `android/` | Kotlin / Jetpack Compose, API Retrofit, navigation et stockage sécurisé |
| `ios/` | Swift / SwiftUI, client réseau, navigation et projet XcodeGen |
| `scripts/` | Déploiement de versions, sauvegarde/restauration, smoke tests et supervision |
| `docs/` | Documentation produit, exploitation, sécurité, publication et textes de travail |

`web/connexion.html` redirige vers la connexion de l’espace utilisateur.
Les formulaires publics sont `web/js/besoin.js` et `web/js/devenir-prof.js`.
Le suivi de candidature exige une session du propriétaire ; les notes internes
d’entretien et de test ne sont pas renvoyées dans ce suivi.

## Architecture backend

Routeur principal sous `/api`, Express 4, `pg` et PostgreSQL 16.

| Module dans `backend/api/src/` | Rôle |
| --- | --- |
| `server.ts`, `http.ts`, `db.ts` | Démarrage, CORS, proxy de confiance, erreurs et pool PostgreSQL |
| `auth.ts`, `authRoutes.ts`, `otp.ts` | Sessions, challenges OTP, fournisseurs et autorisations |
| `routes.ts`, `needs.ts`, `teacherApplications.ts`, `teacherProfile.ts` | Catalogue, réservations, besoins, candidatures et profils |
| `courseOperations.ts`, `courseLifecycle.ts` | Transactions, rôles des participants, créneaux, comptes rendus, avis et bilans |
| `payments.ts`, `finance.ts` | Encaissements, preuve prestataire, règlements, remboursements et reversements |
| `account.ts`, `consent.ts` | Export, consentement versionné, suppression et retrait des fichiers |
| `production.ts` | Capacités, informations publiées, préparation et contrôle de l’ouverture |
| `jobs.ts`, `notifications.ts` | Réconciliation, rappels, notifications transactionnelles et tâches différées |
| `storage.ts` | Stockage S3 compatible ou contenu BYTEA conservé en base |

Les erreurs de validation ou de métier renvoient un code HTTP et un corps
`{error, message?, field?}` ; les données de contexte peuvent compléter ce corps
pour une décision financière ou une suppression bloquée. Les erreurs internes
restent journalisées côté serveur. Les colonnes PostgreSQL `NUMERIC` sont
converties en nombres et les `DATE` restent au format texte pour les clients natifs.

### Authentification et droits

- Hors démo explicite, login/signup renvoient **HTTP 202** avec
  `{otpRequired:true, challengeId, channel, destination, expiresInMinutes, sent:true, demo:false}`.
  Aucun JWT n’est disponible avant `POST /auth/verify-otp {challengeId,code}`.
- `POST /auth/request-otp {challengeId}` renouvelle un challenge. Le code expire,
  le nombre d’essais est limité et la preuve n’est consommable qu’une fois.
- `GET /auth/otp-channels` renvoie `demo`, `whatsapp`, `email`, `defaultChannel`
  et `consentVersion`. Il n’existe pas de champ global `enabled` dans ce contrat.
- Les JWT v2 expirent après 24 heures. Le rôle, le compte actif et le lien
  professeur sont relus en base ; aucun utilisateur ni professeur de secours
  n’est attribué à une requête anonyme ou à une fiche manquante.
- `/teacher/*` exige un compte de rôle professeur relié à une fiche ; les
  nouvelles réservations exigent en plus un professeur non archivé, vérifié,
  avec un compte actif. L’archivage conserve l’accès nécessaire à la clôture
  des cours et obligations existants. `/admin/*` exige le rôle administrateur.
- Une preuve d’identité datant de moins de 15 minutes est requise pour les
  actions sensibles qui utilisent `requireRecentAuth`, notamment export,
  demande de suppression, demande de reversement et écritures financières admin.
  L’erreur `reauthentication_required` doit conduire à une nouvelle connexion,
  sans rejouer automatiquement l’action.
- `DEMO_MODE=true` est réservé au développement/test hors production.
  Aucun échec de fournisseur ne doit activer une démo ou produire une session.

### Cours et participation

`POST /bookings` calcule le prix serveur à partir du tarif horaire et de la durée.
Un champ `price` client ne fait pas autorité. `startAt` est une date ISO future
avec fuseau. La commune publique et `privateAddress` sont distinctes.

Les états `lifecycle_status` sont `requested`, `awaiting_schedule`, `scheduled`,
`completion_pending`, `completed`, `disputed`, `cancelled` et `refused`.
Les clients utilisent les permissions renvoyées par le détail du cours et
`participant_role` (`parent`, `teacher`, ou `admin` pour l’administration),
pas seulement le rôle global du compte. Un parent devenu professeur conserve
son historique de payeur ; `/courses` inclut ses achats et ses cours enseignés.

La réservation directe utilise `/teacher/requests/:courseId/{accept,refuse}`.
Les offres issues des besoins utilisent `/teacher/opportunities/:needId/accept`.
Un besoin accepté sans créneau reste à planifier. Le paiement exige un cours
accepté, planifié dans le futur et encore payable. Un cours remboursé ne redevient
pas payable.

Les actions de détail sont `/courses/:id/details`, `/schedule`,
`/schedule/:proposalId/respond`, `/cancel`, `/report`, `/review` et
`/refund-requests`. Les propositions de créneau exigent l’accord de l’autre
partie et vérifient les chevauchements du professeur. Le compte rendu est
possible après la fin du créneau ; deux confirmations conduisent à la réalisation,
une absence ou un litige à une revue. L’administrateur utilise une résolution
motivée. Le bilan pédagogique vient du professeur ; aucun score scolaire n’est
déduit ou inventé.

### Paiements et finances

- Montants applicatifs : **entiers XOF**. `payments.ts` réalise la conversion
  en sous-unités attendues par Paystack et contrôle référence, montant, devise
  et domaine test/live lors de la vérification.
- `pending`, `otp_required`, `failed` et `success` sont distincts. Une réponse
  incertaine conserve le paiement et sa référence ; une reprise ne doit pas
  créer un nouveau débit. Le statut est contrôlé sans présenter une attente
  comme un succès ou demander systématiquement un OTP.
- Seuls les encaissements prouvés alimentent les fonds disponibles. Les anciens
  états « paid » et les simulations ne sont pas des actifs financiers.
- Commission et net sont figés au prix convenu. Le dû est décidé séparément
  après réalisation ou annulation ; un montant réservé ou versé ne peut pas
  être dépensé deux fois. Une annulation ne déclenche pas de remboursement automatique.
- Les demandes financières utilisent une clé d’idempotence stable. Le bénéficiaire
  d’un reversement est le téléphone vérifié du compte professeur, jamais une
  destination saisie librement.
- L’application enregistre les décisions ; l’opérateur exécute le remboursement
  ou transfert dans la console du prestataire, puis fait vérifier la référence
  par une lecture serveur. `requested` ou `approved` ne signifie pas « argent reçu ».
- Les exceptions de perte à la charge de la plateforme exigent une décision
  explicite et auditée. Elles ne créent pas un nouveau solde professeur.
- Les workflows concurrents suivent l’ordre de verrouillage documenté dans
  les helpers métier. Conserver cet ordre lors des changements touchant cours,
  comptes, réservations de fonds et suppression.

### Consentement, compte et notifications

Le client transmet `consentVersion` présenté avec son acceptation lors d’une
inscription, candidature ou demande publique. `consent_version_changed` impose
de recharger les documents et de décocher l’accord avant toute nouvelle tentative.
`GET/POST /account/consent` permet la réacceptation dans les paramètres ;
`consent_required` bloque les nouvelles opérations concernées lorsque la version
acceptée est devenue ancienne.

Les PDF publiés ont des révisions conservées. `legal_consent_versions` relie
une version d’accord à ses documents et `account_consent_receipts` conserve
les accords successifs ; les références historiques inconnues ne sont pas
reconstituées artificiellement. L’export inclut les reçus de consentement.

`GET /account/export` et les téléchargements de documents restent privés.
`GET/POST/DELETE /account/deletion-request` expose la demande et ses blocages.
Sans obligation ouverte, le compte est fermé et les données supprimables
anonymisées ; sinon la demande reste en attente et annulable. Le retrait S3
peut se poursuivre via une file durable. Les preuves financières nécessaires
sont conservées selon les règles publiées ; aucun délai légal n’est à inventer.

`GET/PUT /account/preferences` concerne les alertes de cours et de paiement.
Un canal actif et une destination déjà vérifiée sont nécessaires pour l’activer.
Le worker traite notifications, rappels, rapprochements et suppressions différées.
Les tests n’envoient pas de messages réels.

### Stockage et migrations

Avec `S3_ENDPOINT`, les fichiers sont conservés dans un stockage S3 compatible
(MinIO local optionnel, ou service configuré). Sans ce stockage, ou en cas d’échec
d’upload, l’appelant conserve le contenu BYTEA en base. Les sauvegardes doivent
couvrir la base et les objets référencés.

Les migrations SQL sont suivies dans `pgmigrations` et appliquées au démarrage
par `node-pg-migrate` ; une erreur empêche l’écoute HTTP. Les données de
démonstration ne sont insérées que lors d’une initialisation explicitement en
démo. Une base historique n’est pas nettoyée automatiquement : utiliser l’audit
des données et une reprise documentée. Les anciens doublons ou incohérences
doivent être résolus avant les contraintes correspondantes.

## Web et clients natifs

Les écrans chargent des données API ou présentent un état vide/indisponible.
Ne pas réintroduire de résultats, notes, professeurs ou paiements fictifs en
réponse à une erreur réseau. Un éventuel mode de démonstration reste explicite
et exclu des builds de publication.

Web : `webapp/src/lib/api.ts` centralise l’API ; `useLive` gère chargement,
réessai et isolement par session. `CoursePages.tsx`, `TeacherFinancePage.tsx` et
`AccountSettingsPage.tsx` portent les nouveaux parcours. L’administration utilise
`web/admin/js/operations.js` pour cours, finances, comptes et mise en service.
Les pages publiques d’aide, d’informations et de suppression sont dans `web/`.

Android : `compileSdk/targetSdk 36`, `minSdk 24`, Java 17, Kotlin/Compose.
L’URL vient de `BuildConfig` selon Debug/Staging/Release ; Debug utilise
`http://10.0.2.2:8099/`. Le JWT et le rôle utilisent Android Keystore.

iOS : Swift/SwiftUI, iOS 16 minimum, projet généré par `ios/project.yml`.
Les configurations Debug/Staging/Release ont des URL séparées ; Debug utilise
`http://localhost:8099`. Le JWT et le rôle utilisent Keychain.

Conserver les contrats alignés entre web, Android et iOS. Modifier un DTO implique
de vérifier les modèles TypeScript, `ApiModels.kt` et les modèles décodés Swift.
La déconnexion retire session et rôle. Les versions de publication exigent les
signatures et validations documentées dans les README des applications.

## Développement et validation

Lire `backend/README.md` pour initialiser `.env`, PostgreSQL et l’API locale.
Ports par défaut : API 8099, site 8095, PostgreSQL 5544, Adminer 8098 ; MinIO
optionnel 9002/9003. Les identifiants réels sont fournis par des fichiers
d’environnement non versionnés ou des secrets de CI, pas par le dépôt.

- API : `npm ci`, `npm run build`, `npm run test:unit` dans `backend/api/`.
  La suite `npm test` exige une base de test migrée et une API locale de démo ;
  elle s’exécute séquentiellement. Aucun test d’intégration sur la production.
- Web : `npm ci`, `npm test`, `npm run lint`, `npm run build` dans `webapp/`.
  Le build régénère `web/espace/`. `npm run dev` sert `/espace/` sur le port 5173.
- Les tests d’OTP utilisent un faux fournisseur local et ceux des paiements
  substituent les réponses prestataire. Cela ne prouve pas l’intégration réelle.
- La CI est définie dans `.github/workflows/ci.yml`. Seul son résultat pour le
  SHA concerné établit ce qui a été compilé et testé ; ne pas annoncer un total
  global ou une validation native sans le résultat correspondant.

## Préparation de l’ouverture et exploitation

`GET /api/admin/production-readiness` distingue configuration, contrôles runtime
et preuves déclarées par l’exploitant. Les déclarations sont rattachées à la
révision et à la configuration concernées, sans constituer un audit externe.
L’identité légale, les coordonnées et les politiques doivent être fournies par
l’exploitant via ses réglages administrateur et documents publiés.

`SERVICE_OPEN=false` garde fermées les nouvelles opérations soumises au contrôle
d’ouverture en production. Les comptes de recette explicitement configurés
restent soumis à l’OTP et aux conditions de leur environnement. Le staging
utilise des clés prestataire test ; la production exige des clés live et exclut
les simulations. `/health` contrôle API/base ; `/ready` contrôle l’état d’ouverture.

La préparation, l’activation séparée, la sauvegarde, la restauration et le retour
à une version précédente sont documentés dans `docs/PRODUCTION-OPERATIONS.md`.
Le workflow de branches est décrit dans `docs/WORKFLOW.md`. Les scripts de
release ne dispensent ni des preuves de recette, ni de la CI du SHA exact, ni
de la configuration des secrets. Ne pas assimiler une branche ou un domaine
configuré à un déploiement effectivement réalisé.

## Design et langue

Interface en français destinée au public ivoirien ; heures des cours en
`Africa/Abidjan`. Vert `#0E5A43`, orange `#E8722A`, crème `#ECE7DE`.
Polices Schibsted Grotesk et Hanken Grotesk ; icônes Material sur Android et
SF Symbols sur iOS.


## Qualité visuelle et recette mobile

La revue et ses preuves sont décrites dans `docs/VISUAL-MOBILE-REVIEW.md`.
Les polices web sont locales (`web/css/fonts.css`, licences sous
`web/assets/fonts/`) et l’illustration éditoriale partagée dispose de variantes
WebP/JPEG adaptées aux clients. Conserver le texte utile et les actions dans
les vues, sans les intégrer à l’image.

`npm run test:visual` dans `webapp/` contrôle les parcours avec Playwright et axe.
Le serveur `scripts/visual/fixture-server.mjs` exige `MPP_VISUAL_FIXTURES=1`,
refuse la production et ne représente jamais une preuve de mise en service.
Android utilise `VisualRegressionTest` ; iOS, la scheme `MonProfPerso-Visual`.
Les artefacts CI contiennent les captures réelles de la révision testée.
Ne pas confondre une absence d’erreur automatique, une revue de captures,
une validation sur appareil physique et une publication sur une boutique.
