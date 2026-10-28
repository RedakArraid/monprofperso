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

## Correctif de navigation et première correction du collecteur

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

## Révision 7d926c0 : parcours fonctionnel réussi, PNG non récupérés

Le [job Android du run 40749309467](https://github.com/RedakArraid/monprofperso/actions/runs/40749309467/job/123031403504)
contrôle la tête `7d926c022d7475ed63f79213e50cd8b16aab77d0`, via le commit de
fusion temporaire `43c8fa820d3acceb5d58aebf8620b113d692f3b2`.

Le rapport XML `TEST-emulator-5554 - 16-_app-.xml`, horodaté du 28 octobre 2026 à
19:01:12 UTC, indique **un test instrumenté réussi, zéro échec, erreur ou test
ignoré, en 47,477 secondes**. La durée Gradle de 2 minutes 13 secondes comprend
la préparation et ne doit pas être présentée comme la seule durée du scénario.
Ce parcours a utilisé une police à 160 % sur l’accueil et le profil professeur,
et une police normale sur les autres écrans connectés.

Le job a ensuite échoué à la collecte ADB. Le fichier `utp.0.log` explique le
problème : Gradle injecte le répertoire natif
`/sdcard/Android/media/ci.monprofperso.app.dev/additional_test_output`, copie son
contenu vers `app/build/outputs/connected_android_test_additional_output/debugAndroidTest/connected/`,
puis désinstalle les APK. Le test écrivait dans le stockage privé externe de
l’application, hors de cette collecte ; ses PNG ont donc disparu au nettoyage.
L’archive conserve les rapports, mais aucun PNG. Ce résultat valide le parcours
et ses assertions à 160 %, sans constituer une preuve visuelle inspectée.

## Delta suivant : collecte UTP et couverture à 200 %

Le test écrit maintenant dans l’argument `additionalTestOutputDir` fourni par
Gradle. Le script récupère les fichiers déjà copiés sur l’hôte par UTP, avant le
nettoyage des APK ; aucune permission de stockage supplémentaire n’est requise.
L’absence de PNG fait échouer la collecte. Ce mécanisme est décrit dans la
[documentation Android de collecte des résultats](https://developer.android.com/topic/performance/benchmarking/benchmarking-in-ci#collect-results)
et confirmé dans les sources de la version AGP 8.10.1 et dans le log UTP du run.

La couverture prévue passe à 200 % sur l’accueil et le profil professeur et
ajoute les accueils parent et professeur à 200 %. Les onglets doivent rester
entièrement visibles, activés, sélectionnables et mesurer au moins 48 dp dans
les deux dimensions. Les captures reçoivent des métadonnées JSON avec l’échelle
effective, les dimensions et la densité de l’écran. Ce delta ne constitue pas
encore un résultat de recette à 200 %.

La compilation ciblée Debug et AndroidTest de ce delta a réussi le 28 octobre
2026 à 19:07 UTC, en 23 secondes. Le script de collecte a passé `bash -n` et
cinq simulations ciblées : présence/absence de PNG avec succès/échec Gradle,
et destination non inscriptible. Une ancienne sortie UTP ne permet pas de
faire réussir une nouvelle collecte vide ; les archives précédentes restent intactes.

Les sous-titres des rôles non sélectionnés passent de `#A9C7BB` à `#E2EFE9`.
Sur leur carte blanche à 12 % superposée au vert `#0E5A43`, le contraste sRGB
calculé passe de 3,34:1 à 5,12:1.

Le badge de notifications utilise maintenant `Ink` sur `Orange` (contraste
calculé de 5,25:1), avec une capsule d'au moins 18 dp dont la taille suit le
texte. Le bouton annonce le nombre exact de notifications non lues ; la pastille
est décorative et ne crée pas une seconde annonce. La compilation ciblée
`:app:compileDebugKotlin` de ce dernier correctif a réussi le 28 octobre 2026
à 19:15 UTC en 17 secondes. Le SHA-256 de `NotificationBell.kt` compilé est
`793da6bc31432dcaee796f23e2e20e37a4a3eb1d23a88c1b5dc22706bb89bdc4`.
La vérification du rendu de ce badge à 200 % reste à effectuer sur les PNG.

La validation restante est le nouveau passage instrumenté Android 36 et
l’inspection effective de tous les PNG produits. Les archives des deux premières
révisions restent conservées séparément. Une compilation réussie ou une assertion
de mise en page seule ne valide pas les rendus.
