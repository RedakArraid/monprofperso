# Mon Prof Perso — Android

Application Kotlin et Jetpack Compose, consommant la même API que l’application iOS et l’espace web. La navigation publique propose les services livrés ; les écrans de prototype de groupes, d’abonnement, de messagerie et de parrainage ne sont pas accessibles comme des services actifs.

## Environnement de compilation

- Kotlin 2.0.20, Jetpack Compose / Material 3.
- JDK 17, Android SDK 36 ; `minSdk = 24`, `targetSdk = compileSdk = 36`.
- Android Gradle Plugin **8.10.1** et wrapper Gradle **8.11.1**. Cette combinaison prend en charge l’API 36 selon les [notes officielles AGP 8.10](https://developer.android.com/build/releases/agp-8-10-0-release-notes).
- Le SDK et les dépendances sont téléchargés par les outils de build ; aucun SDK ni secret n’est versionné.

Ouvrir `android/` dans Android Studio, ou depuis ce dossier :

```sh
./gradlew :app:testDebugUnitTest :app:assembleDebug
./gradlew :app:compileReleaseKotlin :app:testReleaseUnitTest
```

La deuxième commande contrôle le code de production sans créer de livrable signé.

| Variante | API par défaut | Identifiant |
| --- | --- | --- |
| `debug` | `http://10.0.2.2:8099/` | `ci.monprofperso.app.dev` |
| `staging` | `https://staging-api.monprofperso.com/` | `ci.monprofperso.app.staging` |
| `release` | `https://api.monprofperso.com/` | `ci.monprofperso.app` |

Les propriétés Gradle `devApiUrl`, `stagingApiUrl`, `productionApiUrl` remplacent ces valeurs. Staging et production exigent HTTPS, sans identifiants, requête ni fragment dans l’URL de base. Les appels Retrofit ajoutent `api/`. La politique réseau autorise HTTP uniquement pour les hôtes locaux de développement. Un domaine configuré n’est pas une preuve que le serveur a été déployé.

## Parcours servis par l’API

`GET /api/capabilities` active les fonctions disponibles. Les capacités optionnelles restent désactivées lorsque cette lecture échoue. En particulier, un cours en ligne utilise le lien HTTPS réel du cours ; aucune salle vidéo intégrée n’est simulée.

- Catalogue et recherche sur les vrais professeurs, disponibilités de formats, avis existants, prix serveur.
- Besoins avec sélection ou création d’un enfant, proposition de tarif, acceptation ou annulation, puis accès au cours attribué.
- Mes cours et agenda avec rendez-vous privés, contacts autorisés, proposition initiale ou report du créneau accepté par l’autre partie, annulation motivée.
- Réalisation, absence ou litige déclarés après la séance ; bilan pédagogique professeur et avis parent lorsque le serveur les autorise.
- Paiement seulement pour un cours accepté, planifié dans le futur et encore impayé. Le statut serveur est relu avant toute confirmation.
- Revenus professeur répartis entre prévisionnel, dû, disponible, réservé et déjà versé. La demande de versement possède une clé d’idempotence ; un montant approuvé reste distinct d’un versement prouvé. Le numéro du compte doit être vérifié et la connexion OTP dater de moins de 15 minutes.
- Demande de remboursement motivée depuis un cours, sans annoncer le remboursement avant sa confirmation par le prestataire.
- Export JSON des données vers l’emplacement choisi, suppression de compte confirmée par `SUPPRIMER`, retrait d’une demande en attente. Export et suppression nécessitent une authentification récente ; la suppression peut attendre la clôture des cours ou opérations financières. La conservation légale des preuves financières et les fichiers en cours de nettoyage sont décrits par la politique de confidentialité.
- Préférences d’alertes transactionnelles WhatsApp/email, activables uniquement lorsque le canal vérifié est disponible. Les notifications restent consultables dans l’application.

## Session et données

Une réponse login/signup `202` ouvre le challenge OTP. Seule la vérification de `{challengeId, code}` établit la session. Le renvoi garde ce contexte. Une réponse de démonstration directe n’est acceptée que dans un build de débogage et avec `demo:true` explicitement envoyé par le serveur.

L’inscription et la candidature chargent la version des documents via `/api/auth/otp-channels` et envoient cette version avec l’accord explicite. Une publication concurrente décoche l’accord et impose une nouvelle lecture. Les paramètres permettent d’accepter les conditions actualisées via `/api/account/consent` ; réservation et paiement y orientent l’utilisateur lorsque l’API exige cette réacceptation. Dans les cours, `participant_role` prime sur le rôle du compte : un professeur conserve l’accès à ses cours achetés en tant que parent.

Le JWT et le rôle sont stockés chiffrés avec une clé protégée par Android Keystore ; les anciennes sessions en clair sont retirées. La session restaurée est vérifiée via `/api/me`. La déconnexion efface l’identité et la navigation du compte précédent. Les sauvegardes Android sont désactivées. Les exemples de données, réservés à `-PenableDemoData=true` en debug, ne permettent pas d’encaisser.

Les nouvelles vues opérationnelles sont dans `ui/screens/ProductionScreens.kt`, les contrats dans `data/ApiModels.kt` et `MonProfPersoApi.kt`, les règles de créneaux et liens dans `CourseOperations.kt`. `nav/NavGraph.kt` isole les destinations non livrées.

## Construire le livrable Google Play

Fournir un keystore détenu par le propriétaire de l’application et les quatre variables secrètes suivantes, via le gestionnaire de secrets CI ou le terminal de publication :

| Variable | Valeur attendue |
| --- | --- |
| `MPP_ANDROID_KEYSTORE` | Chemin du keystore de publication |
| `MPP_ANDROID_STORE_PASSWORD` | Mot de passe du keystore |
| `MPP_ANDROID_KEY_ALIAS` | Alias de la clé |
| `MPP_ANDROID_KEY_PASSWORD` | Mot de passe de la clé |

Le fichier local ignoré `keystore.properties` reste une alternative ; voir son modèle. Ne pas mettre ces valeurs dans Git ni les imprimer dans des logs.

```sh
./gradlew :app:bundleRelease -PreleaseVersionCode=3 -PreleaseVersionName=1.1.0
```

Résultat : `app/build/outputs/bundle/release/app-release.aab`. Les tâches produisant un livrable Release échouent explicitement lorsque la signature est absente. Le numéro de version doit être augmenté à chaque livraison. La génération ne téléverse rien vers Google Play.

## Vérification avant diffusion

Les tests JVM couvrent challenges/authentification, formats et dates, conditions de paiement, refus des liens non HTTPS, lecture des demandes de suppression et séparation des montants dus/réservés/versés. Ils vérifient aussi les finances historiques dont les conditions n’ont pas encore été documentées.

Une compilation ne valide pas le parcours sur appareil : tester avec l’API de préproduction les deux rôles, l’OTP, le cycle complet d’un cours, une panne réseau, le retour de l’opérateur de paiement, l’export, la suppression et les alertes configurées. Les comptes et clés de publication, fiches Play Console, déclarations Data Safety et validation sur appareils restent nécessaires pour diffuser une version.
