# Mon Prof Perso, Android

## Stack
- **Kotlin** 2.0.20 · **Jetpack Compose** (Material 3, BOM 2024.09)
- **Navigation Compose** pour les 37 écrans
- Polices **Schibsted Grotesk** (titres) + **Hanken Grotesk** (corps), bundlées dans `res/font`
- Icônes : **Material Icons Extended** (équivalents des Phosphor de la maquette)
- `minSdk = 24`, `targetSdk = 35`, `compileSdk = 35`


## Environnements

Prérequis : JDK 17 et SDK Android 35. Ouvrir ce dossier dans Android Studio, ou utiliser le wrapper Gradle.

| Variante | API par défaut | Identifiant de l'application |
| --- | --- | --- |
| `debug` | `http://10.0.2.2:8099/` | `ci.monprofperso.app.dev` |
| `staging` | `https://staging-api.monprofperso.com/` | `ci.monprofperso.app.staging` |
| `release` | `https://api.monprofperso.com/` | `ci.monprofperso.app` |

L'URL est injectée dans `BuildConfig.API_BASE_URL`. Les options Gradle `-PdevApiUrl=...`, `-PstagingApiUrl=...` et `-PproductionApiUrl=...` la remplacent lors de la compilation. Les URLs staging/production doivent utiliser HTTPS. Le HTTP est réservé aux hôtes locaux de la variante debug. Retrofit ajoute le préfixe `api/` dans les chemins des requêtes.

```sh
./gradlew :app:testDebugUnitTest :app:assembleDebug
./gradlew :app:assembleStaging
./gradlew :app:assembleRelease
```

La signature release utilise le fichier de configuration de signature existant ; aucun secret ne doit être ajouté au dépôt.

## Connexion et session

Une réponse `202` de login/signup ouvre la saisie du code lié à `challengeId`. Elle ne crée pas de session. La vérification envoie exclusivement `{challengeId, code}` ; le renvoi conserve ce contexte et remplace l'identifiant de challenge. Le premier code est déjà envoyé par login/signup.

Un JWT direct de login/signup est accepté seulement si le serveur déclare explicitement `demo:true` et si l'application est une compilation de débogage. Le serveur doit aussi avoir `DEMO_MODE=true` hors production. L'absence de réseau ne déclenche jamais une connexion de démonstration.

Le JWT et le rôle sont chiffrés ensemble en AES-GCM avec une clé non exportable de l'Android Keystore. Les anciennes préférences contenant des JWT en clair sont supprimées. La session restaurée est vérifiée par `/api/me` avant de rejoindre l'espace utilisateur. Les sauvegardes Android de l'application sont désactivées.

Les exemples de données nécessitent explicitement `-PenableDemoData=true` pour debug. Ils sont désactivés dans staging et release et ne permettent pas de réserver ni de payer.

## Réservation et paiement

La fiche affiche le professeur sélectionné. Une demande de cours contient une date future `startAt` avec fuseau horaire, une durée et l'identifiant du professeur. Le montant retenu est celui retourné par le serveur. La demande reste en attente jusqu'à l'acceptation du professeur.

Le paiement reprend l'identifiant d'un cours accepté depuis « Mes cours » et ne recrée jamais de réservation. L'écran de confirmation de paiement n'apparaît qu'après lecture d'un statut payé sur l'API. Les demandes de cours directs et les opportunités issues de besoins utilisent leurs routes d'acceptation respectives.

Les tests JVM de `AuthenticationFlowTest` couvrent les réponses d'authentification sans preuve, les challenges incomplets, le mode démo et l'éligibilité d'un cours au paiement. Ils ne remplacent pas un test sur émulateur du Keystore, des écrans Compose et du fournisseur de paiement configuré.

## Architecture
```
app/src/main/java/ci/monprofperso/app/
├── MainActivity.kt              # point d'entrée (edge-to-edge)
├── nav/
│   ├── NavGraph.kt              # Routes + NavHost (37 destinations)
│   └── NavActions.kt            # actions de navigation + routage des onglets
├── ui/theme/                    # AkColors, polices (Type), MonProfPersoTheme
├── ui/components/               # design system : boutons, cartes, chips, avatars,
│                                #   TopBar, BottomNav, TeacherBottomNav, AkScreen…
└── ui/screens/                  # les 37 écrans, regroupés par étape (A→K)
    ├── AuthScreens.kt           # 1-4   Bienvenue, Inscription, Connexion, OTP
    ├── FindScreens.kt           # 5-8   Accueil, Résultats, Filtres, Profil prof
    ├── BookingScreens.kt        # 9-11  Réservation, Paiement, Confirmé
    ├── LearnScreens.kt          # 12-15 Mes cours, Visio, Messagerie, Avis
    ├── AccountScreens.kt        # 16-19 Progrès, Notifications, Compte, Portefeuille
    ├── TeacherScreens.kt        # 20-22 Tableau de bord, Demandes, Revenus (prof)
    ├── SubscriptionScreens.kt   # 23-25 Formules, Activation, Mon abonnement
    ├── GroupScreens.kt          # 26-28 Cours en groupe, Détail, Agenda
    ├── TeacherMgmtScreens.kt    # 29-30 Devenir prof, Retrait des gains
    ├── ManageScreens.kt         # 31-33 Gérer le cours, Bilan, Reçu
    └── MiscScreens.kt           # 34-37 Aide/FAQ, Paramètres, Parrainage, État vide
```


## App Bundle (Google Play)

Publication Play Store : **AAB signé** obligatoire.

```bash
# Voir docs/APP-BUNDLE-ANDROID.md
./scripts/build-android-bundle.sh
```

Modèle secrets : `keystore.properties.example` → `keystore.properties` (gitignoré).
