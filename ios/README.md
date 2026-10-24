# Mon Prof Perso — iOS

Application Swift et SwiftUI pour iPhone (iOS 16+), reliée à l’API commune Android/web. Les services visibles correspondent aux capacités exposées par le serveur. Les prototypes de groupes, abonnements, chat et parrainage ne sont pas présentés comme des fonctions disponibles.

## Génération du projet

Le fichier `project.yml` est la source XcodeGen ; le projet Xcode généré n’est pas versionné.

```sh
brew install xcodegen
cd ios
xcodegen generate
open MonProfPerso.xcodeproj
```

Un Xcode actuellement accepté pour la soumission App Store est nécessaire pour une livraison. Les polices, l’icône AppIcon 1024 × 1024 opaque et le manifeste de confidentialité sont inclus dans les ressources du projet.

| Configuration | API par défaut | Identifiant |
| --- | --- | --- |
| Debug | `http://localhost:8099` | `ci.monprofperso.app.dev` |
| Staging | `https://staging-api.monprofperso.com` | `ci.monprofperso.app.staging` |
| Release | `https://api.monprofperso.com` | `ci.monprofperso.app` |

Les appels ajoutent `/api`. Le build setting `API_BASE_URL` remplace l’URL. HTTPS est exigé hors hôtes locaux, sans identifiants, requête ni fragment. Le scheme `MonProfPerso` exécute Debug et archive Release ; `MonProfPerso-Staging` utilise Staging. Une URL configurée ne confirme pas que le serveur a été déployé.

## Parcours opérationnels

`GET /api/capabilities` contrôle les options. En l’absence de réponse, les options non attestées restent désactivées. Le cours en ligne ouvre uniquement un lien HTTPS autorisé et enregistré dans le détail d’un vrai cours, si le service est activé côté serveur.

Le catalogue, la recherche et les avis utilisent les données de l’API. Les besoins permettent de choisir un enfant ou d’en créer un, d’accepter le tarif, d’annuler la recherche ou d’ouvrir le cours attribué. Le détail du cours propose les coordonnées privées autorisées, la planification et le report acceptés par l’autre partie, l’annulation motivée, puis la déclaration de réalisation, absence ou litige. Les bilans pédagogiques sont ceux saisis par le professeur.

Le paiement réutilise un cours accepté, planifié dans le futur et impayé. La confirmation attend la relecture du statut serveur. Les revenus du professeur séparent le prévisionnel, le dû, le disponible, les sommes réservées et celles effectivement versées. Les demandes de versement et remboursement utilisent une clé d’idempotence ; l’approbation d’une demande n’est pas présentée comme un mouvement d’argent réalisé. Un versement exige le numéro vérifié du compte et une session OTP de moins de 15 minutes.

L’écran **Mes données et mon compte** exporte les données JSON avec le sélecteur natif, règle les alertes transactionnelles WhatsApp/email et propose la suppression confirmée par `SUPPRIMER`. L’export et la suppression exigent une connexion récente. Une demande bloquée par des cours ou finances ouverts reste en attente et peut être retirée. La suppression clôt le compte, avec conservation des justificatifs requis selon la politique de confidentialité et nettoyage des fichiers qui peut être différé.

Les nouvelles vues sont regroupées dans `Screens/ProductionScreens.swift`. `Networking/ApiClient.swift` porte les contrats et `App/Router.swift` l’état et la navigation.

## Session et confidentialité

Login/signup reçoit un challenge serveur ; la vérification utilise `challengeId` + `code`. Une panne ne crée aucune session de démonstration. Le JWT et l’identité sont conservés dans Keychain, accessibles sur appareil déverrouillé et sans synchronisation iCloud. Les anciennes sessions UserDefaults sont supprimées, et `/api/me` valide la session restaurée. La déconnexion efface l’identité et la pile de navigation.

L’inscription et la candidature utilisent la version fournie par `/api/auth/otp-channels`, gardée dans l’écran lors de l’accord explicite. En cas de publication concurrente, les cases sont décochées et les conditions rechargées. Les paramètres proposent la réacceptation via `/api/account/consent`, avec un accès depuis les erreurs de réservation et paiement qui l’exigent. Le rôle de participation à chaque cours prime sur celui du compte, pour conserver le suivi des cours achetés avant ou après le passage au rôle professeur.

`Resources/PrivacyInfo.xcprivacy` déclare les données nécessaires aux comptes, cours, candidatures, paiements et demandes de support. L’accès à UserDefaults utilise le motif `CA92.1` pour les données propres à l’app. Il ne déclare pas de suivi publicitaire. Références Apple : [manifeste de confidentialité](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk) et [déclarations App Store](https://developer.apple.com/app-store/app-privacy-details/).

Le responsable de la publication doit vérifier ces déclarations avec les prestataires réellement configurés et renseigner App Store Connect. Le manifeste ne remplace pas les réponses de confidentialité de la fiche ni la politique applicable aux données des enfants.

## Tests sur macOS

```sh
cd ios
xcodegen generate
xcodebuild -list -project MonProfPerso.xcodeproj
xcodebuild test -project MonProfPerso.xcodeproj -scheme MonProfPerso \
  -destination 'platform=iOS Simulator,name=iPhone 16' CODE_SIGNING_ALLOWED=NO
```

Adapter le simulateur à ceux installés. `ApiClientTests` contrôle l’encodage des filtres et du préfixe ivoirien, l’éligibilité au paiement, les liens HTTPS, les demandes de suppression en attente, les montants de versement et les conditions financières manquantes d’un cours historique. Linux permet seulement une vérification des sources ; il ne compile pas SwiftUI et n’exécute pas ces tests.

## Archive et export de livraison

Configurer le compte Apple Developer et les certificats/profils de signature sur le Mac de publication. Fournir l’identifiant d’équipe dans `MPP_IOS_TEAM_ID`, puis lancer depuis `ios/` :

```sh
./scripts/archive-release.sh
```

Variables optionnelles : `MPP_IOS_API_URL` (HTTPS), `MPP_IOS_VERSION_NAME` (par défaut `1.1.0`) et `MPP_IOS_BUILD_NUMBER` (par défaut `3`). Le numéro de build doit augmenter à chaque envoi. Le script exige une équipe valide, génère le projet, archive Release et exporte localement vers `ios/build/`. Il ne téléverse rien vers App Store Connect.

La mise en diffusion nécessite encore les certificats et profils du propriétaire, les métadonnées et documents de confidentialité, les captures adaptées, les accès de revue et une validation des parcours sur appareils et préproduction. Une archive réussie ne prouve ni une validation App Review ni un paiement réel.
