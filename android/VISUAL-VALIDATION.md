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

## Révision 2c1b4c0 : parcours et collecte réussis, captures décalées

Le [job Android du run 40752999558](https://github.com/RedakArraid/monprofperso/actions/runs/40752999558/job/123044363301)
contrôle la tête `2c1b4c0b981898a189b2cfd5d9eea4921f94f096` via le commit de
fusion temporaire `69aa615052f04ae72429d738dc21bfac4a081e6d`. Les deux commits
ont l’arbre `57b978329e952eb01cea84453dca965c6cadf521`.

Le rapport XML indique **un test instrumenté réussi, zéro échec, erreur ou test
ignoré, en 60,119 secondes**, horodaté du 28 octobre 2026 à 19:26:21 UTC.
Le build Debug, les tests JVM et la collecte UTP ont réussi. L’[artefact
12846020254](https://github.com/RedakArraid/monprofperso/actions/runs/40752999558/artifacts/12846020254)
contient 23 PNG et leurs 23 JSON ; le SHA-256 du ZIP téléchargé a été vérifié :
`57106ae28d32411ce82db64d8762a7498b4a2cf06b944bec2f5e1c4315b9c927`.

Les 23 images ont été inspectées. Plusieurs représentent encore une frame
précédente : `03-signup` montre l’accueil, le profil et les cours montrent encore
un chargement, et le paysage contient l’ancien portrait avec une zone noire.
Les accueils parent et professeur à 100 % et 200 % produisent chacun deux PNG
identiques, bien que leurs JSON indiquent des échelles différentes. Les deux
captures OTP avec et sans clavier sont également identiques. Ce lot conserve
une preuve du parcours et de la récupération UTP, mais ses captures ne sont
pas retenues comme preuve visuelle finale à 200 %.

## Delta de synchronisation du rendu

`PresentedScreenCapture.kt` attend le callback de frame commit, puis copie la
fenêtre par `PixelCopy`. La capture d’écran entière fournie par `UiAutomation`
n’est retenue qu’après correspondance ARGB exacte avec cette référence sur la
zone applicative visible, et seulement si la fenêtre occupe exactement les
dimensions de l’écran. Le clavier, les barres système et les découpes sont
exclus de la comparaison, avec une marge supplémentaire de 8 dp pour les ombres
du décor ; ils restent présents dans le PNG original. Il n’y a aucun collage,
aucune retouche ni tolérance de couleur. Une nouvelle frame réelle est attendue
à chaque tentative ; l’absence de correspondance sous 15 secondes fait échouer
la capture, sans délai fixe ajouté au parcours.

Ce choix suit la [documentation Android du callback de frame commit](https://developer.android.com/reference/android/view/ViewTreeObserver#registerFrameCommitCallback(java.lang.Runnable)) :
un rendu soumis n’est pas nécessairement déjà présenté à l’écran ; `PixelCopy`
fournit la référence du contenu rendu. Les métadonnées précisent l’API de capture,
la zone comparée, l’état du clavier et l’empreinte du bitmap de fenêtre. Les
accueils à 100 % et 200 % doivent avoir des contenus de fenêtre distincts,
indépendamment d’un changement d’heure dans la barre système. Les champs et
boutons de connexion et OTP sont contrôlés au-dessus du clavier et sous les
zones système. Les pages attendent aussi leurs données propres avant la capture.

La compilation ciblée `:app:compileDebugAndroidTestKotlin` du delta final a réussi le
28 octobre 2026 à 19:37 UTC en 17 secondes. Les attentes de frame et de copie
utilisent le temps restant au budget global ; les bitmaps sont aussi libérés
si la vérification du clavier ou l’encodage échoue. Aucun code produit ni contrat API
n’a changé dans ce delta. Sa validation native et la revue des nouvelles images
restent à effectuer avant de qualifier les preuves finales.

## Correction ciblée des ressources pédagogiques

La revue de `ResourcesScreen.kt`, accessible depuis le compte, a trouvé trois
ressources d’exemple injectées à la fois après une réponse vide et après une
erreur de l’API. Ce repli est supprimé. L’écran distingue maintenant chargement,
liste vide et erreur avec réessai ; un changement de filtre relit le même contrat
`GET /api/resources`, et une annulation de coroutine n’est pas traitée comme une
panne. Seules les ressources reçues du serveur peuvent produire des cartes.

Les filtres ont une cible minimale de 48 dp, un rôle de bouton, une sélection
explicite et un nom distinguant le type de ressource du programme. Les tags des
cartes passent à la ligne au besoin, le libellé orange utilise le ton contrasté,
et l’écran respecte la zone de navigation système en bas.

Deux étapes instrumentées supplémentaires ouvrent cet écran depuis le compte :
`16a-resources-empty` vérifie le vide et les filtres du compte 0198 ;
`17a-resources-error` vérifie l’erreur 503 et son réessai pour le compte 0199.
Elles n’effectuent aucune écriture métier. La fixture de ce dernier compte doit
renvoyer 503 pour `/api/resources`, y compris avec ses filtres ; les comptes
normaux et 0198 renvoient une liste vide. Le parcours prévoit désormais 25 PNG.

Le 28 octobre 2026 à 19:48 UTC, les tâches `:app:compileDebugKotlin` et
`:app:compileDebugAndroidTestKotlin` de ce delta ont réussi en 19 secondes.
Ce correctif et ces deux étapes ne font pas partie du candidat `6bd10c1` ;
son résultat de recette ne doit pas leur être attribué.

## Révision 6bd10c1 : capture synchronisée réussie et revue des 23 rendus

Le [job Android du run 40756599455](https://github.com/RedakArraid/monprofperso/actions/runs/40756599455/job/123057065911)
contrôle la tête `6bd10c1686e7f9e793894aa8ce86648dd40b0964`, via le commit de
fusion temporaire `b9eea812424bb77a2798c2b5b4b75d1daf43ec53`. Les deux arbres
correspondent à `f96959636d859ec12e036b0721d64bd2670220b4`.

Le XML horodaté du 28 octobre 2026 à 19:47:58 UTC indique **un test réussi,
zéro échec, erreur ou test ignoré, en 78,572 secondes**. Le job entier a réussi,
y compris compilation, tests JVM et collecte. L’[artefact 12845558786](https://github.com/RedakArraid/monprofperso/actions/runs/40756599455/artifacts/12845558786)
contient 23 PNG distincts et leurs JSON ; le SHA-256 vérifié du ZIP est
`a7d8a2525e942fb0753e922118b76dd83b49384e3b4f6ff8b613f8dde9c95ec3`.

Tous les PNG ont été inspectés. Les métadonnées confirment la comparaison exacte
avec PixelCopy, quatre captures à l’échelle 2.0, les états de clavier ouvert et
fermé, et le paysage de 1600 × 1000 px. Les rendus à 100 % et 200 % des accueils
ont des empreintes de fenêtre différentes. L’inscription est désormais réellement
capturée, les listes attendent leurs données et le paysage n’a plus de bande noire.
Le profil agrandi, ses actions et le formulaire OTP avec clavier sont lisibles.

La revue a également trouvé trois défauts concrets : des icônes système blanches
sur le fond crème de l’inscription/connexion, des mots d’onglets coupés à 200 %,
et les petites dates orange insuffisamment contrastées des cours en attente.
Ces images restent conservées avec leur provenance ; elles ne sont pas présentées
comme le rendu final des corrections suivantes ni du correctif Ressources.

## Delta après la revue 6bd10c1

Le style système est appliqué au `ON_RESUME` du propriétaire de destination par
`LifecycleResumeEffect`. Une destination sortante ne restaure plus son ancien
style. Cela évite la concurrence des `SideEffect` de deux écrans pendant la
transition du NavHost. La documentation de [Navigation 2](https://developer.android.com/reference/androidx/navigation/NavController#getVisibleEntries())
distingue l’entrée entrante `STARTED` pendant la transition puis `RESUMED` à son
terme ; la [documentation Lifecycle](https://developer.android.com/topic/libraries/architecture/lifecycle)
décrit l’effet employé. Les icônes attendues sont vérifiées dans le scénario,
et leur rendu sera à relire sur les nouvelles captures.

À une échelle de police supérieure à 1.0, les onglets disposent de leur largeur
de contenu et défilent horizontalement, avec des libellés entiers sur une ligne.
Leur taille de texte reste agrandie par Android ; la barre normale conserve ses
colonnes pondérées. L’onglet sélectionné est rendu visible après sa mise en page.
Le parcours utilise de vrais glissements jusqu’à « Compte », le sélectionne,
puis revient à « Accueil » pour le parent et le professeur. Il vérifie la cible
de 48 dp, le cadre entier, l’absence de débordement du texte et la sélection
unique, sans `performScrollTo` pour la navigation.

Les deux textes de `DateTile` passent de `Orange` à `OrangeStrong` sur
`OrangeSoft` : leur contraste calculé passe de 2,59:1 à 4,88:1. Cette correction
de couleur ne change pas les statuts de cours. Le lot conserve le correctif
Ressources et prévoit 25 captures ; sa recette native reste à effectuer.

La compilation finale de `compileDebugKotlin` et `compileDebugAndroidTestKotlin`
a réussi le 28 octobre 2026 à 19:58 UTC en 48 secondes, sans compilation Kotlin
incrémentale et avec le compilateur dans le processus Gradle. Cette reprise suit
un arrêt du daemon Kotlin lors de l’essai incrémental précédent. Les cinq fichiers
de produit et de test sont restés identiques pendant le build ; leurs empreintes
et le résultat sont conservés dans la [preuve de compilation](../docs/visual-evidence/android/final-native-polish-compilation.json).
Ce résultat confirme la compilation du lot ; il ne remplace pas sa prochaine
exécution instrumentée et l’inspection de ses captures.

## Révision 4601340 : rendu du rail lisible, contrôle sémantique à corriger

Le [job Android du run 40759860433](https://github.com/RedakArraid/monprofperso/actions/runs/40759860433/job/123068531109)
contrôle la tête `4601340fc7a3983d81d924a654deda4645c45149` via le commit de
fusion temporaire `b588991063075c916598bfa4572d896c27ea0505`. Leur arbre commun
est `33c91b9b4300245381762bf040fba824c045964d`. Le build Debug et les tests JVM
ont réussi. Le rapport XML horodaté du 28 octobre 2026 à 20:07:47 UTC indique
un test instrumenté, un échec et aucune erreur ni étape ignorée, en 25,533 secondes.

L’[artefact 12847928051](https://github.com/RedakArraid/monprofperso/actions/runs/40759860433/artifacts/12847928051)
conserve neuf PNG distincts, leurs métadonnées et les rapports. Le ZIP de
1 086 900 octets a le SHA-256 vérifié
`e2f4a0e719766b165b0386b2048107bf08c12fbf6c293e85e762d032331c18b9`.
Les neuf images ont été inspectées. Le rail affiche « Accueil » en entier sur
une ligne à 200 %, mais l’assertion combinant `lineCount` et `hasVisualOverflow`
s’arrête avant le premier glissement ; ce run ne valide donc pas les gestes,
le reste du parcours ni les nouveaux états Ressources.

Le diagnostic utilise les sources exactes de
[Compose Foundation 1.7.2](https://dl.google.com/dl/android/maven2/androidx/compose/foundation/foundation-android/1.7.2/foundation-android-1.7.2-sources.jar)
et [Compose UI Text 1.7.2](https://dl.google.com/dl/android/maven2/androidx/compose/ui/ui-text-android/1.7.2/ui-text-android-1.7.2-sources.jar).
`ParagraphLayoutCache.slowCreateTextLayoutResultOrNull`, appelé pour la sémantique
de `Text(String)`, reconstruit un `MultiParagraph` avec les contraintes brutes du
rail, dont la largeur maximale est infinie. `MultiParagraph.width` prend cette
largeur ; `didOverflowWidth` la compare à la taille réelle finie du texte. La
mise en page effectivement dessinée utilise, elle, la largeur intrinsèque.

Le contrôle révisé conserve une ligne, une hauteur suffisante, la largeur
intrinsèque complète inférieure ou égale à la largeur réelle, une fin de ligne
couvrant tout le libellé et l’absence d’ellipse. Aucune tolérance n’est ajoutée.
Les trois métriques de débordement, dimensions et contraintes sont conservées
dans `navigation-text-metrics.jsonl`. L’inclusion des cadres dans le viewport
réel est aussi vérifiée : des bornes sémantiques hors écran peuvent conserver
leur largeur entière. `navigation-gestures.jsonl` consigne les glissements ;
un nombre strictement positif de vrais gestes est exigé vers « Compte » puis
vers « Accueil », pour les deux rôles.

Les icônes système sont correctes sur les captures de connexion et d’OTP, mais
restent blanches sur la capture d’inscription alors que les flags de fenêtre
sont déjà sombres. Ce décalage de présentation de SystemUI n’est pas couvert
par la comparaison de la zone applicative avec PixelCopy. La nouvelle capture
d’inscription attend une quiescence d’événements UI bornée, puis vérifie les pixels
réellement affichés dans deux régions identifiables : l’horloge de la barre
supérieure et le trait gestuel central de la barre inférieure, en portrait sans
clavier. Dans chaque région, le fond PixelCopy doit être uniforme, plus de la
moitié des pixels écran doivent correspondre exactement à ce fond et au moins
16 pixels de glyphes sombres doivent atteindre un contraste de 4,5:1 avec lui.
Les régions, seuils et mesures figurent dans le JSON de la capture.

L’attente d’idle seule n’est pas une preuve du rendu de SystemUI. Une image
conservant l’ancienne apparence déclenche une nouvelle tentative dans le budget
global de 15 secondes. Le PNG reste l’écran entier original, sans retouche,
et la comparaison exacte de la fenêtre est maintenue. Seuls les tests et ce
rapport changent dans ce delta ; le code produit et la fixture restent identiques.

Le garde de pixels a été vérifié en lecture seule sur les PNG originaux de ce
run : l’inscription est rejetée avec zéro pixel sombre qualifié dans chaque
région ; la connexion et l’OTP sans clavier sont acceptés avec 542 pixels
qualifiés pour l’horloge et 1 708 pour le trait gestuel, sur des fonds majoritaires.
Les fichiers image n’ont pas été modifiés. Le bitmap PixelCopy n’étant pas
conservé dans les anciens artefacts, son uniformité sera contrôlée par le
prochain passage instrumenté, sans lui attribuer rétrospectivement cette mesure.

La seule tâche `:app:compileDebugAndroidTestKotlin` a réussi le 28 octobre 2026
à 20:14 UTC en 19 secondes, sans compilation incrémentale et avec le compilateur
dans le processus Gradle. Les deux fichiers de test sont restés identiques
pendant le build ; le code produit est inchangé par rapport à `4601340`.
Cette compilation et l’analyse des pixels précédents ne remplacent pas le
prochain parcours complet et la revue de ses nouvelles captures.

Preuves conservées : [compilation des deux fichiers de test](../docs/visual-evidence/android/evidence-guards-compilation.json)
et [analyse des pixels des PNG originaux](../docs/visual-evidence/android/system-bar-pixel-analysis.json).
