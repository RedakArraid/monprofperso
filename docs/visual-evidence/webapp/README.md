# Captures de recette de l’espace connecté

**Recette locale du 28 octobre 2026 : 12 tests Playwright réussis, sans nouvelle
tentative automatique.** Le résultat détaillé, le navigateur, les empreintes du
build et les sources exactes des images sont conservés dans [manifest.json](manifest.json).

Les personnes, cours, adresses et montants de ces captures proviennent uniquement
du serveur de données fictives. Aucune capture ne représente une transaction
réelle. La suite passe par la connexion et la vérification OTP de l’interface.

| Capture | Ce qui est vérifié |
| --- | --- |
| [Connexion, 390 px](connexion-mobile-390.png) | Formulaire lisible, champs nommés, action principale accessible |
| [Accueil mobile, 390 px](accueil-mobile-390.png) | Actions utiles, prochain cours et raccourcis sans débordement |
| [Accueil ordinateur, 1440 px](accueil-desktop-1440.png) | Illustration intégrée et hiérarchie des informations |
| [Réservation, 320 px](reservation-mobile-320.png) | Champs, adresse longue et bouton de demande sur petit écran |
| [Réservation, texte à 200 %](reservation-texte-200-320.png) | Texte calculé doublé, défilement et action finale accessibles |
| [Détail du cours, 390 px](cours-mobile-390.png) | Rendez-vous, suivi financier et formulaires d’action |
| [Revenus, 390 px](revenus-mobile-390.png) | Montants distincts et tableau accessible au clavier avec indication de défilement |
| [Détail d’une offre, 320 px](offre-dialogue-mobile-320.png) | Dialogue nommé, bouton principal accessible, Échap et retour du focus |

La suite couvre également les largeurs 768 px, les menus et leur focus, le tri et
les filtres, l’inscription avec une version de consentement longue, les profils,
la confidentialité, les données vides et les pannes API, ainsi que la reprise après indisponibilité des canaux OTP. L’opportunité du dernier
test est ajoutée à une seule réponse locale par Playwright, en conservant la
réservation directe ; ce cas est décrit dans la documentation de la suite.

Les contrôles axe ne détectent aucune violation sur les pages vérifiées avec les
règles A/AA sélectionnées. Les règles nécessitant une appréciation manuelle sont
listées dans le manifeste. Ce résultat ne vaut pas certification d’accessibilité,
validation Safari, test sur appareil physique ou preuve de déploiement.

Reproduire la recette : voir [la documentation Playwright](../../../webapp/visual-tests/README.md).
