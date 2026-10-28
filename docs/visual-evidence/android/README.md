# Preuves visuelles Android

Recette du **28 octobre 2026**, pour le candidat
[a035f18](https://github.com/RedakArraid/monprofperso/commit/a035f18971973179d22167d8cce84bcd2a443ea7).
Le [job Android 123085728504](https://github.com/RedakArraid/monprofperso/actions/runs/40764741671/job/123085728504)
a réussi le build, les tests JVM, le parcours instrumenté et la collecte UTP.

## Résultat natif inspecté

**Un test instrumenté réussi, zéro échec, erreur ou test ignoré.** La suite XML
dure **55,524 secondes**, dont **48,58 secondes** pour le scénario. Les
**25 PNG distincts ont été inspectés en résolution originale** : aucun nouveau
défaut de mise en page bloquant observé sur cette configuration.

L’émulateur utilise **Android 16 / API 36**, un téléphone de **360 × 640 dp**
(captures 720 × 1280 px), puis un paysage de 1067 × 667 dp
(capture 1600 × 1000 px). Quatre captures utilisent une taille de texte de **200 %**.
Les dix mesures de libellés et les quatre glissements réels confirment que
Compte puis Accueil restent accessibles, pour le parent et le professeur.

L’inscription présente une horloge et une poignée système sombres. Le JSON
conserve les pixels qualifiés dans les régions contrôlées : **574** pour la
région horloge et **1 708** pour la poignée, sur des fonds uniformes et majoritaires.
Les captures de connexion et d’OTP montrent le clavier logiciel ouvert.
Les ressources vides et indisponibles restent distinctes, sans anciens exemples.
Réessayer satisfait le minimum explicite de **48 dp**, puis le message d’erreur
reste présent lorsque le serveur répond toujours 503. Le paysage est correctement
présenté, sans ancienne frame portrait.

## Neuf PNG originaux conservés

Ces fichiers sont identiques octet par octet aux captures natives de l’archive ;
ils représentent au total **772,079 octets**.
Les noms, comptes et montants affichés sont des données de recette fictives.

| Capture | Dimensions en pixels |
| --- | --- |
| [Inscription et barres système](inscription-android.png) | 720 × 1280 |
| [Code OTP et clavier logiciel](otp-clavier-android.png) | 720 × 1280 |
| [Accueil parent](accueil-parent-android.png) | 720 × 1280 |
| [Accueil parent et navigation à 200 %](accueil-parent-200-android.png) | 720 × 1280 |
| [Formulaire de réservation avant envoi](reservation-android.png) | 720 × 1280 |
| [Espace professeur et navigation à 200 %](tableau-professeur-200-android.png) | 720 × 1280 |
| [Ressources vides, filtres Cours et Standard](ressources-vides-android.png) | 720 × 1280 |
| [Ressources indisponibles après Réessayer](ressources-indisponibles-android.png) | 720 × 1280 |
| [Bienvenue en paysage](bienvenue-paysage-android.png) | 1600 × 1000 |

Le [manifeste](manifest.json) conserve les SHA256 des 25 PNG, leurs 25 métadonnées
JSON natives, les mesures de navigation et les empreintes des sources d’entrée.
La fusion exécutée est **56308d02ad68ba4e7681cd07895fee3f559083d6**, avec l’arbre
**1aaaeef61cf57019621d93074d28196ef3735e0b**, identique au candidat.

L’[artefact original](https://github.com/RedakArraid/monprofperso/actions/runs/40764741671/artifacts/12850431280)
est identifié par son SHA256 **70dca29e4e85d0133fac19259d05cb9049f6ca877f4b23f65e5edf80e50518ae** et ses **2677628 octets**.
Sa rétention expire le 11 novembre 2026. La sélection versionnée reste dans le dépôt.

L’archivage a été terminé depuis ce ZIP après l’indisponibilité du workspace
local. Le workflow de transport, en lecture seule sur GitHub, est identifié
séparément dans le manifeste. Les images sont celles du parcours a035f18 déjà
inspecté ; aucun rendu ou test natif supplémentaire n’a été fabriqué pour cet archivage.

## Portée

Cette recette ne valide pas un appareil physique, TalkBack, les claviers
constructeurs, les paiements externes, la signature de distribution ou Google Play.
Les commandes de reproduction et l’historique sont dans le
[rapport Android](../../../android/VISUAL-VALIDATION.md).

## Historique de la compilation locale

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

### Premier passage natif et correction

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
