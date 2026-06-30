# Mon Prof Perso, Android (Kotlin + Jetpack Compose)

Application native Android reproduisant fidèlement la maquette « Akwaba, Cours
particuliers » (soutien scolaire à domicile / en ligne en Côte d'Ivoire).

## Stack
- **Kotlin** 2.0.20 · **Jetpack Compose** (Material 3, BOM 2024.09)
- **Navigation Compose** pour les 37 écrans
- Polices **Schibsted Grotesk** (titres) + **Hanken Grotesk** (corps), bundlées dans `res/font`
- Icônes : **Material Icons Extended** (équivalents des Phosphor de la maquette)
- `minSdk = 24`, `targetSdk = 34`

## Ouvrir / compiler
✅ **Build vérifié** : `app-debug.apk` produit et lancé sur émulateur (écran Bienvenue
rendu correctement, polices chargées, aucun crash).

1. Le plus simple : ouvrir `android/` dans **Android Studio** → Run.
2. En ligne de commande (le wrapper Gradle est déjà versionné) :
   ```bash
   cd android
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"  # JDK 17/21
   ./gradlew assembleDebug
   # installer + lancer sur un émulateur démarré :
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   adb shell am start -n ci.monprofperso.app/.MainActivity
   ```
   `local.properties` doit pointer le SDK (`sdk.dir=$HOME/Library/Android/sdk`).

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

## Navigation
- Démarrage : **Bienvenue** → Inscription/Connexion → Accueil.
- Barre inférieure parent : Accueil · Recherche · Cours · Progrès · Profil.
- Barre inférieure prof : Tableau · Demandes · Agenda · Revenus · Profil
  (accessible via « Espace professeur → » au bas de l'écran Compte).
- Les écrans secondaires (paiement, reçu, abonnement, etc.) sont poussés sur la pile.

Les écrans sont **statiques/fidèles à la maquette** (pas de back-end) : les boutons
naviguent mais les données sont celles de la maquette.

## App Bundle (Google Play)

Publication Play Store : **AAB signé** obligatoire.

```bash
# Voir docs/APP-BUNDLE-ANDROID.md
./scripts/build-android-bundle.sh
```

Modèle secrets : `keystore.properties.example` → `keystore.properties` (gitignoré).
