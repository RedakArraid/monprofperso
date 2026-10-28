# Recette mobile sur WebKit

Le **28 octobre 2026**, les six parcours ciblés ont réussi sur **Playwright
WebKit 27.2, build 2370, sous Linux**, en environ 22 secondes, sans nouvelle
tentative. Les 26 contrôles axe ne signalent aucune violation parmi les règles
exécutées. Le [manifeste](manifest.json) conserve les statistiques, les empreintes
du build, la source CSS modifiée et les captures.

Les parcours couvrent les espaces parent à 320/390 px et professeur à 390 px,
le dialogue d’une offre à 320 px, le menu et son focus, le texte à 200 % et
l’inscription avec un consentement long. Ils passent par l’OTP de la fixture
locale. Aucun paiement ou envoi de réservation n’est effectué.

L’inspection des captures a révélé un texte natif de date/heure trop pâle, que
les règles automatiques ne signalaient pas. Le remplissage du texte de ces deux
types de champs reprend désormais la couleur de premier plan du formulaire.
Les sélecteurs natifs sont conservés ; une saisie de date et d’heure a également
été vérifiée avant la nouvelle recette.

| Capture inspectée | Contrôle |
| --- | --- |
| [Réservation, 320 px](reservation-mobile-320.png) | Champs natifs lisibles, saisie longue et action de demande |
| [Réservation, texte à 200 %](reservation-texte-200-320.png) | Texte agrandi, défilement, titre et bouton final accessibles |

Cette preuve concerne le moteur WebKit sous Linux. Elle ne remplace pas une
recette Safari sur iPhone physique, ni une certification d’accessibilité.
Les personnes, cours, montants et adresses affichés sont fictifs.

Reproduction : [documentation Playwright](../../../webapp/visual-tests/README.md).
