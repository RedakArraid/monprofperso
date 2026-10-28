# Recette visuelle Android

## Révision initiale : 3539dc3

La [PR 5](https://github.com/RedakArraid/monprofperso/pull/5), de tête
`3539dc3c74d9db160d52854bdf2e6723670c7828`, a été contrôlée par le
[job Android du run 40745829826](https://github.com/RedakArraid/monprofperso/actions/runs/40745829826/job/123019222721).
Ce run de PR utilise le commit de fusion temporaire
`dd2cc01854696093853e548f884c202832bce3b6`.

- Le build Debug et les tests JVM ont réussi en CI.
- La vérification locale du même état Android, le 28 octobre 2026 à 18:33 UTC,
  a réexécuté 15 tests JVM : 6 d’authentification et 9 d’opérations de cours,
  sans échec, erreur ni test ignoré. Debug, Kotlin Release et Kotlin AndroidTest
  ont compilé. Ces résultats précèdent le correctif de navigation décrit ci-dessous.
- Le premier test instrumenté a échoué après la vérification OTP :
  `NavActions.enterApp` modifiait un `LifecycleRegistry` depuis la continuation
  du retour réseau, hors du thread principal. Le rapport comporte un test exécuté
  et un échec ; il ne constitue pas une recette visuelle réussie.
- L’[artefact 12842501174](https://github.com/RedakArraid/monprofperso/actions/runs/40745829826/artifacts/12842501174)
  conserve les rapports HTML/XML et les logs. Il ne contient aucun PNG : l’action
  émulateur exécutait chaque ligne de `script` dans un shell distinct et s’arrêtait
  avant la collecte après l’échec Gradle.

## Correctifs à valider par le prochain passage natif

`NavActions` exécute désormais ses mutations sur le Looper principal, immédiatement
si l’appel arrive déjà sur ce thread et par `Handler` dans le cas contraire.
Les parcours, les rôles et les contrôles de session restent identiques.

`scripts/run-visual-test.sh` garde l’exécution Gradle et la collecte des captures
dans un seul shell. La collecte est tentée même après un échec ; le code de sortie
Gradle est conservé. `bash -n` et quatre simulations ciblées de succès/échec des
deux commandes ont validé cette gestion des erreurs.

La compilation ciblée `:app:compileDebugKotlin :app:compileDebugAndroidTestKotlin`
du correctif a réussi le 28 octobre 2026 à 18:41 UTC, en 20 secondes. Le SHA-256
du fichier `NavActions.kt` compilé est
`819a39b158bc2a037deaf4a64ff9467deb3c160e873e1d57c727f5b7d15d9d60`.
Les 15 tests JVM n’ont pas été relancés : ils ne couvrent pas le chemin natif de
navigation, et leur ancien résultat ne doit pas être réattribué aux nouveaux octets.

La validation restante est l’exécution du scénario instrumenté sur Android 36,
puis l’inspection effective des PNG récupérés : petit téléphone, clavier,
police agrandie, parcours parent/professeur, états vide/erreur et paysage.
Une compilation réussie seule ne valide pas ces rendus.
