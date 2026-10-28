# Preuves visuelles iOS

Recette du **28 octobre 2026**, pour le candidat
[`2c1b4c0b981898a189b2cfd5d9eea4921f94f096`](https://github.com/RedakArraid/monprofperso/commit/2c1b4c0b981898a189b2cfd5d9eea4921f94f096).
La [CI 40752999558](https://github.com/RedakArraid/monprofperso/actions/runs/40752999558)
a compilé l’application et réussi **11 tests unitaires et quatre parcours
XCUITest, sans échec ni exception inattendue**. Les parcours UI ont duré
179,686 secondes.

Le simulateur effectivement utilisé est un **iPhone SE de troisième génération,
iOS 26.4.1**, en portrait : 375 × 667 points, captures de 750 × 1334 pixels.
Le build Debug utilise une signature locale ad hoc et le vrai Keychain.
La connexion passe par le challenge HTTP 202 et la saisie OTP ; aucune session
n’est injectée dans l’application.

## Résultat de l’inspection

Les **25 PNG distincts** exportés ont été inspectés. Les accueils, la recherche,
la fiche professeur, la réservation, les cours et leurs détails, le compte,
la confidentialité et les revenus restent lisibles dans cette configuration.
Les textes indicatifs sont plus contrastés, le code de format `home` est présenté
en français, et les états vide et indisponible sont distincts. Aucun nouveau
défaut de mise en page bloquant n’a été identifié sur ces captures.

Avec **Dynamic Type Accessibility XXXL**, les initiales et la pastille de
notification restent des repères graphiques lisibles. Les noms et textes de
contenu continuent de s’agrandir. Le test confirme que le champ OTP est entièrement
visible au-dessus du clavier logiciel **avant tout tap ou défilement de XCTest
sur le champ**. Il fait ensuite réellement glisser le rail de navigation,
vérifie que **Compte** est entièrement visible, ouvre le compte et revient à
**Accueil**. La navigation agrandie défile horizontalement ; tous les onglets
ne sont pas visibles simultanément. Un texte partiellement hors de la zone
défilable n’est pas assimilé à un champ ou une action masqués.

Les noms `failure` injustifiés de la précédente recette ont disparu : aucune
des 25 pièces jointes de ce run ne porte ce préfixe. Les compteurs de réussite
ci-dessus proviennent du journal XCTest, indépendamment du nom des fichiers.

## Sélection conservée dans le dépôt

Ces six PNG sont **identiques octet par octet aux pièces jointes XCTest** :
aucune retouche, recompression, mise en scène ou capture de navigateur. Ils
représentent au total 913 943 octets.

| Capture | État montré |
| --- | --- |
| [Bienvenue](bienvenue-iphone-se.png) | Accueil illustré avant connexion |
| [Accueil parent](accueil-parent-iphone-se.png) | Session parent, action de recherche et navigation |
| [Navigation et grandes polices](navigation-accessibilite-iphone-se.png) | Dernier onglet entièrement visible après le geste de défilement réel |
| [Réservation](reservation-iphone-se.png) | Formulaire avant envoi de la demande |
| [Revenus](revenus-iphone-se.png) | Disponible, prévisionnel, dû, réservé et versé présentés séparément |
| [OTP et grandes polices](otp-accessibilite-iphone-se.png) | Champ OTP visible avec le clavier logiciel ouvert |

Le [manifeste](manifest.json) conserve les empreintes SHA256, dimensions,
horodatages, noms originaux des pièces jointes, inventaire des 25 captures,
résultats des tests et empreintes de 46 fichiers d’entrée de la recette.
Le merge effectivement exécuté est
`69aa615052f04ae72429d738dc21bfac4a081e6d`, dont l’arbre
`57b978329e952eb01cea84453dca965c6cadf521` est celui du candidat.
L’artefact GitHub complet inclut les autres PNG et le `.xcresult` ; sa rétention
est de 14 jours. Cette sélection reste versionnée dans le dépôt.

## Portée et reproduction

Les comptes, professeurs, notes et montants affichés proviennent du serveur local
de fixtures, explicitement activé et interdit en production. Ce sont des données
de recette fictives. Aucun prestataire OTP ou de paiement externe n’est contacté.
Les réservations, modifications de cours, versements et suppressions de compte
ne sont pas exécutés par ces parcours visuels.

Les commandes de reproduction et les neuf couples de couleurs mesurés sont
documentés dans le [README iOS](../../../ios/README.md#recette-visuelle-instrumentée).
Cette preuve couvre la configuration et les parcours décrits. Elle ne constitue
ni un audit complet d’accessibilité, ni une validation sur tous les iPhone et
toutes les versions d’iOS. Les essais VoiceOver sur appareil, l’installation
Release signée, les retours de paiement externes et la publication App Store
restent des validations distinctes.
