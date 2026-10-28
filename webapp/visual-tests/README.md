# Recette visuelle de l’espace web

Depuis `webapp/`, après installation des dépendances :

```sh
npm run build
npx playwright install --with-deps chromium
npx playwright test
```

Le fichier `playwright.config.ts` démarre le site compilé sur `127.0.0.1:8095` et
le serveur de données fictives sur `127.0.0.1:8099`. En local, ces serveurs peuvent
déjà tourner. La suite vérifie la signature `fixture: true, external: false` du
serveur avant toute authentification et ne doit jamais cibler une installation
client. Elle ne transmet ni réservation, ni paiement, ni demande de suppression.

Pour un navigateur Chrome for Testing déjà installé, définir
`MPP_CHROME_EXECUTABLE` avec le chemin absolu du binaire. En CI, utiliser le
navigateur Chromium correspondant à la version verrouillée de Playwright.

## Périmètre

- Connexion réelle par l’interface : réponse 202 sans session, saisie du code OTP
  local, puis ouverture de l’espace parent ou professeur.
- Largeurs 320, 390, 768 et 1440 px : connexion, accueil, catalogue, fiche professeur,
  réservation ; cours, détail, compte et confidentialité sur 390 et 1440 px.
- Accueil, demandes, finances et profil professeur sur 390 et 1440 px.
- Filtres et tri des offres : ouverture, Échap ou sélection, retour du focus.
  Un test séparé sur 320 px enrichit uniquement la réponse locale
  `GET /api/teacher/requests` avec une opportunité conforme au DTO `OfferReq`,
  en conservant la réservation directe. Il vérifie le dialogue de détail et
  l’accès à son bouton principal, sans accepter l’offre. L’API partagée avec
  les tests natifs et les réponses de production restent inchangées.
- Menu mobile : focus enfermé dans le dialogue, Échap, retour du focus et
  navigation ; formulaire avec texte calculé à 200 %, sans masquer les débordements.
- Reprise des canaux OTP après indisponibilité lors d’un changement d’onglet.
- Inscription et version de consentement longue ; données vides et erreurs 503
  distinctes, sans résultats fictifs de secours.
- Erreurs JavaScript, largeur du document et contrôles axe des règles WCAG A/AA
  disponibles. Ces contrôles automatiques ne constituent pas une certification
  d’accessibilité ou une validation sur un appareil physique.

Les captures montrent uniquement les personnes, adresses, montants et cours
fictifs du serveur de recette. Elles sont conservées avec les résultats JSON
axe dans `test-results/visual/` et dans le rapport `playwright-report/`.
Les traces de navigation sont conservées en cas d’échec. Les captures constituent
des preuves de rendu à inspecter ; aucun pixel de référence n’est accepté
automatiquement comme une approbation visuelle.
