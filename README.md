# Mon Prof Perso — soutien scolaire en Côte d’Ivoire

Monorepo du site public, de l’espace utilisateur web, de l’administration,
des applications Android et iOS et de leur API REST commune.

Le périmètre fonctionnel couvre les **cours individuels** : recherche d’un
professeur, demande de cours ou devis, acceptation, planification, paiement
Mobile Money, suivi de la séance, bilan, avis et règlement financier. Le code
inclut les contrôles nécessaires à la préparation d’une ouverture ; sa présence
dans ce dépôt ne signifie pas que le service est déployé ou ouvert au public.
La configuration réelle et les validations de l’exploitant sont décrites dans
[le guide d’exploitation et de mise en service](docs/PRODUCTION-OPERATIONS.md).

## Périmètre disponible

- **Parents et élèves** : réservation directe ou besoin à tarifer, accord sur un
  créneau, détails du rendez-vous, contact du professeur, paiement après
  acceptation et planification, agenda et historique des cours.
- **Professeurs** : candidature et justificatifs, traitement des demandes,
  planification, compte rendu pédagogique et demande de reversement vers le
  numéro vérifié du compte.
- **Après la séance** : déclarations des participants, traitement des absences
  ou litiges, avis après réalisation confirmée et suivi issu des bilans réels.
- **Finances** : encaissements vérifiés, décisions de règlement, demandes de
  remboursement et de reversement, journalisation et rapprochement. L’opérateur
  exécute les remboursements et versements dans la console du prestataire, puis
  fait vérifier leur référence ; une approbation seule ne confirme aucun transfert.
- **Compte** : préférences d’alertes de cours et de paiement, export des données
  et documents, suppression immédiate ou différée selon les obligations ouvertes,
  et annulation d’une demande de suppression en attente.
- **Administration** : catalogue, ressources, candidatures, cours, finances,
  documents contractuels, informations du service et préparation à l’ouverture.

`GET /api/capabilities` fournit les capacités communes aux clients. Les modules
**groupes, abonnements, parrainage et messagerie intégrée sont désactivés dans
le parcours proposé**. Les données ou écrans historiques de ces modules ne
constituent pas une offre commercialisable.

Les cours en ligne sont désactivés par défaut. Leur activation explicite via
`ONLINE_COURSES_ENABLED=true` utilise un **lien HTTPS de réunion externe fourni
par le professeur** ; le produit ne comprend pas de visioconférence intégrée.

## Structure

| Dossier | Contenu |
| --- | --- |
| `backend/` | API Node.js 24 / TypeScript / Express, PostgreSQL 16, migrations et configuration Docker Compose |
| `webapp/` | Espace utilisateur React / Vite / Tailwind, compilé dans `web/espace/` |
| `web/` | Site public, pages d’aide et de suppression de compte, administration et assets web compilés |
| `android/` | Application Kotlin / Jetpack Compose |
| `ios/` | Application Swift / SwiftUI et projet XcodeGen |
| `scripts/` | Validation, préparation des versions, sauvegarde, restauration et supervision |
| `docs/` | Documentation produit, sécurité, exploitation et publication |

## Démarrer en local

### API, base et site

```bash
cd backend
cp .env.example .env
# Renseigner la configuration avant le premier démarrage.
docker compose up --build -d
curl --fail http://localhost:8099/health
```

Pour une base locale de démonstration sans prestataire, définir explicitement
`DEMO_MODE=true` et `PAYSTACK_MOCK=true` avant son initialisation. Les données
de démonstration ne sont pas injectées dans une installation réelle neuve.
Ces modes ne doivent pas être utilisés en staging ou en production.

Ports locaux par défaut : **site 8095 · API 8099 · PostgreSQL 5544 · Adminer 8098**.
Voir [backend/README.md](backend/README.md) pour les comptes de démonstration,
le stockage et les tests d’intégration.

### Développer l’espace web

```bash
cd webapp
npm ci
npm run dev
```

L’espace est accessible sur `http://localhost:5173/espace/` et utilise l’API
locale sur le port 8099. `VITE_API_BASE` permet de choisir une autre API de
développement. `npm run build` régénère `web/espace/` ; le site public et
l’administration sont servis depuis `web/`.

### Applications natives

- **Android** : ouvrir `android/` dans Android Studio. La configuration Debug
  utilise `http://10.0.2.2:8099/` depuis l’émulateur ; les configurations Staging
  et Release utilisent des URL HTTPS distinctes. Voir [android/README.md](android/README.md).
- **iOS** : dans `ios/`, exécuter `xcodegen generate`, puis ouvrir
  `MonProfPerso.xcodeproj`. Debug utilise `http://localhost:8099` ; les
  configurations de publication sont définies dans `project.yml`.
  Voir [ios/README.md](ios/README.md).

Une compilation de contrôle ne remplace pas la signature, la recette sur
appareils et la validation de publication des applications.

## Authentification, consentement et données personnelles

Hors démonstration explicite, la connexion et l’inscription créent un challenge
OTP ; **aucun JWT n’est délivré avant la vérification du code**. Les droits et
le lien avec une fiche professeur sont relus côté serveur. Une panne ne déclenche
ni connexion de secours ni affichage de données fictives.

Les formulaires transmettent la version des CGU et de la politique de
confidentialité présentée à l’utilisateur. Une modification des documents exige
une nouvelle acceptation. Les versions documentaires et les reçus successifs
de consentement sont conservés ; l’export du compte inclut ses reçus.

Les paramètres donnent accès à l’export, aux préférences transactionnelles et à
la suppression du compte. L’export et la demande de suppression exigent une
authentification récente. La page publique `/suppression-compte.html` explique
le parcours et les données pouvant être conservées, puis dirige vers la connexion
et les paramètres. Les informations légales et politiques commerciales publiées
doivent être renseignées par l’exploitant.

## Validation et mise en service

Les commandes de validation du web sont `npm test`, `npm run lint` et
`npm run build` dans `webapp/`. Les tests API et leurs prérequis sont documentés
dans [backend/README.md](backend/README.md). La CI du dépôt contrôle également
les applications natives ; consulter le résultat correspondant à la révision
à publier.

En production, les nouvelles inscriptions, demandes, réservations et charges
sont soumises aux contrôles d’ouverture. `SERVICE_OPEN` reste désactivé tant que
l’exploitant n’a pas préparé la configuration, le catalogue réel, les documents,
les intégrations et les preuves de recette nécessaires. La vue administrateur
« Mise en service » distingue contrôles techniques et **validations déclarées
par l’exploitant** ; elle ne constitue pas un audit externe.

Les scripts de préparation et de publication sont décrits dans
[PRODUCTION-OPERATIONS.md](docs/PRODUCTION-OPERATIONS.md). Consulter aussi
[SECURITY-RELEASE.md](docs/SECURITY-RELEASE.md) et
[WORKFLOW.md](docs/WORKFLOW.md) avant de préparer une version. Les noms de
branches, domaines et configurations présents dans le dépôt ne prouvent pas
qu’une version y a été déployée.

## Design system

Vert `#0E5A43`, orange `#E8722A`, crème `#ECE7DE` ; polices
**Schibsted Grotesk** et **Hanken Grotesk** ; icônes Material sur Android et
SF Symbols sur iOS.
