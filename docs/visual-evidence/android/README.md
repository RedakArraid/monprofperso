# Validation locale Android

Le 28 octobre 2026, le code Android a compilé avec les derniers correctifs de
rotation, de taille du texte, de clavier et de navigation. Les tâches ont été
réexécutées avec `--rerun-tasks`, sans réutiliser un ancien résultat de test.

- `assembleDebug` : réussi.
- `compileReleaseKotlin` : réussi.
- `compileDebugAndroidTestKotlin` : réussi.
- `testDebugUnitTest` : 15 tests réussis, aucun échec, erreur ou test ignoré.

[Build et empreinte de l’index](build-validation.json) ;
[résultats JVM et empreinte de l’APK](jvm-tests.json).

La base Git enregistrée au démarrage était `3d1da9e`, avec les modifications
Android déjà dans l’index. Ces fichiers sont ensuite entrés dans le commit
`3539dc3c74d9db160d52854bdf2e6723670c7828`. L’empreinte de l’index Android
identifie les sources exactes et est restée identique pendant la compilation.

Cette exécution Linux locale ne dispose pas de KVM : elle n’a pas exécuté
l’émulateur. Les parcours instrumentés et leurs captures sont produits par
la CI du commit concerné. Ne pas assimiler la compilation des tests Android
à leur exécution, ni un APK Debug à une livraison signée Google Play.

## Premier passage natif et correction

Le run40745829826 a révélé, après la vérification OTP, une mutation de
`NavController` depuis un retour réseau hors thread principal. Le correctif
centralisé dans `NavActions` a compilé avec le code de test instrumenté le
28 octobre ; [son empreinte et son résultat](navigation-fix-compilation.json)
sont distincts de la preuve JVM précédente. La validation utile suivante
est l’exécution du parcours sur émulateur.

Le collecteur a aussi été placé dans un script shell unique afin que la
récupération des captures soit tentée même quand le test échoue. Les quatre
combinaisons succès/échec du test et de la collecte ont été vérifiées.
Le [rapport Android par révision](../../../android/VISUAL-VALIDATION.md)
détaille ces résultats sans assimiler un build à une recette native réussie.
