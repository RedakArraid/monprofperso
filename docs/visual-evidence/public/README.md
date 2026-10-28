# Recette visuelle — vitrine et administration

Contrôle réalisé le **28 octobre 2026** dans Chrome for Testing **156.0.8078.73**,
avec Playwright **1.64.1** et axe-core **4.14.0**. Les neuf images de ce dossier
sont des captures du site exécuté localement, prises après le chargement des
polices et la fin des animations, puis inspectées visuellement.

**Toutes les personnes, coordonnées, cours et sommes visibles dans les écrans
administratifs sont des données fictives de recette.** Aucun paiement, message
prestataire, remboursement ou reversement réel n’a été effectué. L’illustration
de l’accueil est une création éditoriale et ne présente pas un professeur réel
du catalogue.

## Révision et traçabilité

La base Git au début de la recette était
`3d1da9ef20d7072a6b285fccceaeedc23b05cd32`, complétée par les modifications
visuelles locales en cours. **Cette base n’est pas le commit final de la
version contrôlée.** Les empreintes SHA-256 des fichiers effectivement testés
figurent dans [source-manifest.json](source-manifest.json). Leur contenu est
resté identique du début à la fin de cette recette. Les espaces en fin de ligne des deux licences OFL ont ensuite été normalisés ;
les deux empreintes avant/après sont consignées dans le manifeste. Les fontes
et les sources de l’interface n’ont pas changé. Le manifeste couvre
`web/` hors le build `web/espace/`, ainsi que le serveur de données fictives.

Cette recette ne concerne pas la validation de l’espace React, d’Android ou
d’iOS. Elle ne prouve ni le déploiement de la version, ni une validation sur
appareil physique, ni une publication sur les boutiques.

## Résultats

Les résultats détaillés sont conservés dans [results.json](results.json).

| Contrôle | Résultat |
| --- | --- |
| Accueil, candidature et connexion admin sur 320, 390, 768, 1024 et 1440 px | 15 rendus contrôlés |
| Menus, formulaires et écrans admin sur 320, 390 et 1440 px | 55 états supplémentaires contrôlés |
| Contrôles d’interaction et de focus | 21 réussis |
| Débordements horizontaux de page dans les 70 états | Aucun détecté |
| Exceptions JavaScript pendant la recette | Aucune détectée |
| Violations détectées par axe, règles WCAG 2 A/AA, 2.1 AA et 2.2 AA | Aucune dans les 70 états |
| Syntaxe des scripts publics et admin, `git diff --check` | Réussie |
| Tests de consentement public après adaptation du DOM simulé | 4 / 4 réussis |

Les contrôles d’interaction couvrent le confinement du focus dans les menus
et dialogues, Tab et Maj+Tab, la fermeture avec Échap, la restitution du focus,
les erreurs de formulaire, la candidature en deux étapes, les confirmations
de soumission et le défilement des tableaux au clavier. L’authentification
admin passe par les vrais écrans de l’application, avec challenge HTTP 202
puis saisie du code fourni par le serveur local de recette.

Les tests de consentement conservent les assertions empêchant un renvoi
implicite après un changement de documents : la nouvelle version doit être
acceptée explicitement et une version indisponible bloque l’envoi. Le DOM
simulé du test a été complété pour représenter les attributs et le focus ;
le comportement de production n’a pas été modifié pour satisfaire ce mock.

L’absence de violation automatique ne constitue pas une certification
d’accessibilité. La recette sur Safari physique, VoiceOver ou TalkBack n’est
pas couverte par ces résultats.

## Captures sélectionnées

| Capture | Contexte |
| --- | --- |
| [Accueil téléphone](home-390.png) | 390 × 900 px : actions accessibles avant l’illustration |
| [Accueil tablette](home-768.png) | 768 × 900 px : menu compact et contenu centré |
| [Accueil ordinateur](home-1440.png) | 1440 × 900 px : composition en deux colonnes |
| [Candidature téléphone](application-mobile.png) | Étape 2, consentement, détail de version dépliable et boutons |
| [Administration ordinateur](admin-desktop.png) | Tableau de bord et navigation persistante |
| [Menu admin téléphone](admin-menu-mobile.png) | Navigation au clavier avec focus visible |
| [Dialogue professeur téléphone](admin-teacher-dialog-mobile.png) | Formulaire dans un dialogue défilable, avec fermeture accessible |
| [Finances téléphone](admin-finance-mobile.png) | Contenu complet ; le tableau défile dans sa propre région |
| [Réglages OTP téléphone](admin-otp-mobile.png) | Champs et actions de configuration avec réglages fictifs |

## Données de recette et reproduction

Le site a été servi sur `http://127.0.0.1:8095`, avec le serveur
`scripts/visual/fixture-server.mjs` sur `http://127.0.0.1:8099` lancé uniquement
avec `MPP_VISUAL_FIXTURES=1`. Les formulaires publics ont soumis leurs données
à ce serveur local. Les modifications de professeur, les actions financières,
la suppression de comptes, l’enregistrement de paramètres et les tests d’envoi
OTP n’ont pas été déclenchés.

Le serveur commun n’exposait pas `GET /api/admin/otp-settings` au moment de la
recette. Pour cet écran seulement, le harnais Playwright a fourni une réponse
GET synthétique contenant des réglages locaux. Cette substitution est limitée
au test et ne fait partie ni du site déployé, ni d’un chemin de secours de
l’application.

Le harnais réutilisable est versionné dans `scripts/visual/public-review.cjs`.
Après avoir installé les dépendances dans `webapp/`, lancé le serveur de données
fictives et servi `web/` sur le port8095, exécuter :

```sh
cd webapp
npx playwright install chromium
npm run test:visual:public
```

`MPP_CHROME_EXECUTABLE` permet d’utiliser un navigateur déjà installé.
`MPP_PUBLIC_VISUAL_OUT` permet de choisir le dossier de preuves ; par défaut,
les nouvelles captures et les résultats vont dans `webapp/test-results/public/`.
Le harnais refuse un serveur sans marqueur explicite de fixture locale.
Une nouvelle recette produit ses propres résultats ; elle ne réattribue pas
les captures de ce dossier à une autre révision.
