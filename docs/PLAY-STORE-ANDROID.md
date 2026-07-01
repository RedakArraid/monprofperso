# Publication Google Play — Mon Prof Perso (Android)

Guide **prêt à copier-coller** pour la Play Console.  
Remplis les champs marqués **⟨…⟩** après immatriculation CEPICI / validation juridique.

> **État app (2026-06)** : `ci.monprofperso.app`, v1.0 (code 1), API prod  
> `https://api.monprofperso.com`, site `https://www.monprofperso.com`.

---

## 1. Compte développeur Google Play

| Champ | Valeur |
|-------|--------|
| **Type de compte** | Organisation *(recommandé après création SAS)* ou Personnel |
| **Nom du développeur affiché** | ⟨Raison sociale⟩ *(ex. Mon Prof Perso SAS)* |
| **E-mail du compte** | ⟨e-mail pro⟩ |
| **Site web développeur** | `https://www.monprofperso.com` |
| **Adresse** | ⟨Siège social, Abidjan, Côte d'Ivoire⟩ |
| **Téléphone** | ⟨+225 …⟩ |
| **Frais d'inscription** | 25 USD (unique) |

---

## 2. Identification technique (depuis le repo)

| Champ Play Console | Valeur |
|--------------------|--------|
| **Nom du package** | `ci.monprofperso.app` |
| **VersionName** | `1.0.1` |
| **VersionCode** | `2` *(incrémenter à chaque upload)* |
| **minSdk** | 24 *(Android 7.0+)* |
| **targetSdk** | 35 *(Android 15 — exigence Play Console)* |
| **compileSdk** | 35 |
| **Langue par défaut de la fiche** | **Français (France)** ou **Français** |
| **Pays de distribution** | **Côte d'Ivoire** (+ pays CEDEAO si souhaité) |
| **Format de publication** | **Android App Bundle (AAB)** — obligatoire |
| **Signature** | Play App Signing *(recommandé)* + clé upload à créer |

### Commande build release (local)

Voir **`docs/APP-BUNDLE-ANDROID.md`** et `./scripts/build-android-bundle.sh`.

```bash
cd android
cp keystore.properties.example keystore.properties   # puis éditer
./gradlew bundleRelease
# Sortie : app/build/outputs/bundle/release/app-release.aab
```

### URL API en production (app)

```
https://api.monprofperso.com/
```

*(Définie dans `android/.../MonProfPersoApi.kt` → `ApiConfig.BASE_URL`)*

---

## 3. Fiche Play Store — textes (français)

### Nom de l'application *(max 30 caractères)*

```
Mon Prof Perso
```

*(14 caractères — OK)*

### Description courte *(max 80 caractères)*

```
Trouvez un prof vérifié : cours à domicile ou en ligne, Mobile Money, BEPC & BAC.
```

*(79 caractères)*

### Description complète *(max 4 000 caractères)*

```
Mon Prof Perso (MP²) — Un succès inévitable

La plateforme de soutien scolaire à domicile et en ligne en Côte d'Ivoire. Mon Prof Perso met en relation parents, élèves et professeurs vérifiés pour des cours particuliers adaptés à chaque niveau, du collège au lycée.

POUR LES PARENTS ET ÉLÈVES
• Recherchez un professeur par matière, niveau et format (à domicile ou en visio)
• Consultez les profils, notes et avis des familles
• Réservez un créneau en quelques taps — le professeur valide la demande
• Payez en Mobile Money (Orange Money, MTN MoMo, Wave)
• Suivez les progrès scolaires par matière
• Accédez aux ressources pédagogiques (cours, devoirs, exercices)
• Recevez des notifications sur vos réservations

POUR LES PROFESSEURS
• Espace dédié : tableau de bord, demandes de cours, revenus
• Acceptez ou refusez les réservations qui vous concernent
• Proposez vos tarifs et créneaux
• Candidatez via « Devenir professeur » (dossier en ligne)

POURQUOI MP² ?
✓ Profs vérifiés — identité et niveau contrôlés
✓ Préparation BEPC & BAC
✓ Paiement Mobile Money, simple et local
✓ Cours à domicile ou en ligne, vous choisissez
✓ Données hébergées en Côte d'Ivoire (conformité locale)

Téléchargez Mon Prof Perso et trouvez le bon prof, au bon moment.

Site : https://www.monprofperso.com
Support : ⟨support@monprofperso.com⟩
```

*(~1 450 caractères — marge pour ajouts)*

### Slogan / tagline interne *(non affiché Play, utile marketing)*

```
Un succès inévitable
```

---

## 4. Catégorisation & découverte

| Champ | Valeur recommandée |
|-------|-------------------|
| **Catégorie principale** | **Éducation** |
| **Catégorie secondaire** | *(aucune, ou « Parentalité » si disponible)* |
| **Balises / tags** *(si proposés)* | `cours particuliers`, `soutien scolaire`, `professeur`, `BEPC`, `BAC`, `Côte d'Ivoire`, `Mobile Money`, `révisions`, `lycée`, `collège` |
| **Type d'application** | Application |
| **Gratuit / payant** | **Gratuit** *(monétisation in-app / commission sur cours)* |
| **Contient des annonces** | **Non** *(au lancement)* |
| **Achats intégrés** | **Oui** *(cours, abonnements — même si paiement Mobile Money côté serveur)* |
| **Classification du contenu** | À compléter via questionnaire IARC (section 8) |

---

## 5. Coordonnées & liens obligatoires

| Champ | Valeur |
|-------|--------|
| **E-mail de contact public** | ⟨support@monprofperso.com⟩ |
| **Site web** | `https://www.monprofperso.com` |
| **Politique de confidentialité (URL)** | `https://www.monprofperso.com/api/legal/confidentialite/file` |
| **CGU (URL, optionnel Play)** | `https://www.monprofperso.com/api/legal/cgu/file` |
| **Mentions légales** | `https://www.monprofperso.com/api/legal/mentions-legales/file` |

> Publier d'abord les **PDF légaux** via l'espace admin (`/admin/` → Documents légaux)  
> ou téléverser les PDF validés par le juriste. Sans PDF, les liens renvoient 404.

| Champ | Valeur |
|-------|--------|
| **Numéro de téléphone support** | ⟨+225 …⟩ *(optionnel mais recommandé en CI)* |

---

## 6. Graphismes — fichiers à produire

| Asset | Spécifications Play | Source projet |
|-------|---------------------|---------------|
| **Icône haute résolution** | PNG/JPEG **512 × 512**, max 1 Mo | `docs/logo/mp2-logo.png` → adapter fond + marges |
| **Icône app (déjà dans l'APK)** | Adaptive icon | `android/app/src/main/res/mipmap-*`, `drawable/ic_launcher_foreground.xml` |
| **Graphique de présentation** | **1024 × 500** PNG/JPEG | Créer : logo MP² + slogan « Le bon prof, au bon moment » + vert `#0E5A43` |
| **Captures téléphone** | Min **2**, max 8 — ratio **16:9** ou **9:16**, côté long **320–3840 px** | Capturer les écrans : Accueil, Recherche prof, Réservation, Mes cours, Progrès, Espace prof |
| **Captures tablette 7"** | Optionnel | Idem sur tablette ou émulateur Pixel Tablet |
| **Captures tablette 10"** | Optionnel | Idem |
| **Vidéo promo** | YouTube URL, optionnel | — |

### Écrans recommandés pour les captures

1. Bienvenue / choix du rôle  
2. Accueil (recherche matière)  
3. Résultats professeurs  
4. Profil professeur  
5. Réservation + Mobile Money  
6. Mes cours  
7. Suivi des progrès  
8. Devenir professeur *(optionnel)*

*(Maquette vitrine : `web/assets/screens/app_home.png` si disponible)*

### Couleurs de marque (design system)

| Token | Hex |
|-------|-----|
| Vert principal | `#0E5A43` |
| Orange accent | `#E8722A` |
| Crème fond | `#ECE7DE` |

---

## 7. Accès à l'application (review Google)

| Question Play Console | Réponse |
|-----------------------|---------|
| **L'app nécessite-t-elle une connexion ?** | **Oui** — compte téléphone + OTP |
| **Existe-t-il un mode démo / compte test ?** | **Oui** — fournir les identifiants ci-dessous |
| **Restrictions géographiques ?** | Non *(API ouverte ; usage cible CI)* |
| **Fonctionnalités limitées sans paiement ?** | Consultation profs oui ; réservation/paiement nécessitent compte |

### Instructions pour l'équipe de review *(coller dans « Accès à l'app »)*

```
Compte administrateur (test complet) :
  Téléphone : +2250700000001
  Connexion : saisir le numéro → écran OTP → code démo accepté par l'API

Compte parent/élève démo (sans token persistant) :
  Utiliser l'inscription avec un numéro +225… ; OTP simulé en environnement actuel.

L'API de production est : https://api.monprofperso.com
L'app cible les parents, élèves et professeurs en Côte d'Ivoire.
Paiement Mobile Money : flux présent en UI ; certains parcours peuvent être en mode démo.
```

> Quand l'OTP SMS réel sera activé, ajouter un **numéro de test** avec code fixe  
> ou désactiver la vérification pour le numéro review.

---

## 8. Classification du contenu (questionnaire IARC)

Réponses indicatives pour une app **Éducation / mise en relation** :

| Thème | Réponse |
|-------|---------|
| Violence | Non |
| Sexualité / nudité | Non |
| Langage grossier | Non |
| Drogues / alcool / tabac | Non |
| Jeux d'argent | Non |
| Interactions utilisateurs | **Oui** *(messagerie / réservations entre users)* |
| Partage de localisation | **Oui** *(adresse du cours à domicile, saisie manuelle)* |
| Achats numériques | **Oui** *(cours, abonnements)* |
| **Classification attendue** | **PEGI 3 / Everyone** ou **3+** selon questionnaire |

---

## 9. Public cible & programme Families

| Champ | Valeur recommandée |
|-------|-------------------|
| **Tranche d'âge cible** | **13 ans et plus** *(Parents, lycéens, profs)* |
| **App conçue pour les enfants** | **Non** |
| **Peut être utilisée par des moins de 13 ans** | **Oui, avec consentement parental** *(case à l'inscription)* |
| **Programme Google Play Families** | **Non** au lancement *(évite contraintes Children’s API)* |
| **Annonces ciblant les enfants** | Non |

> L'app collecte des données d'**élèves mineurs** avec consentement parental  
> (Loi CI 2013-450). Le déclarer dans **Sécurité des données** et la politique de confidentialité.

---

## 10. Sécurité des données (formulaire « Data safety »)

### Données collectées

| Type | Collecté | Partagé | Obligatoire | Finalité |
|------|----------|---------|-------------|----------|
| **Nom** | Oui | Non | Oui (inscription) | Compte, réservations |
| **Numéro de téléphone** | Oui | Non | Oui | Auth OTP, contact |
| **Adresse e-mail** | Optionnel | Non | Non | Contact |
| **Identifiants utilisateur** | Oui | Non | Oui | Session JWT |
| **Historique achats / transactions** | Oui | Non | Non | Mobile Money, wallet |
| **Performance scolaire** | Oui | Non | Non | Suivi des progrès |
| **Messages / réservations** | Oui | Non | Oui | Service |
| **Fichiers** *(candidature prof, PDF)* | Oui | Non | Non | Dossiers prof / ressources |
| **Adresse du cours** | Oui | Non | Oui | Cours à domicile |
| **Données de diagnostic crash** | Non *(au lancement)* | — | — | — |

### Pratiques de sécurité

| Question | Réponse |
|----------|---------|
| Données chiffrées en transit | **Oui** (HTTPS/TLS) |
| Données chiffrées au repos | **Oui** *(objectif prod — DB + stockage fichiers)* |
| L'utilisateur peut demander la suppression | **Oui** *(à finaliser côté API — voir ROADMAP)* |
| Politique de confidentialité | **Oui** — URL section 5 |

### Destinataires des données

| Destinataire | Usage |
|--------------|-------|
| Éditeur (⟨raison sociale⟩) | Exploitation du service |
| Hébergeur CI *(Hodi / futur)* | Stockage API + fichiers |
| *(Futur)* Passerelle Mobile Money | Paiements |
| *(Futur)* Fournisseur SMS OTP | Vérification téléphone |

> **Pas de vente de données** à des tiers publicitaires.

---

## 11. Permissions Android déclarées

| Permission | Présente | Justification Play Console |
|------------|----------|----------------------------|
| `INTERNET` | Oui | Appels API, téléchargement ressources PDF |
| Stockage / fichiers | Via SAF *(OpenDocument)* | Upload candidature prof, ressources admin — **pas de permission manifest** |
| Localisation GPS | **Non** | — |
| Caméra / micro | **Non** | Visio : UI maquette *(préciser si activé plus tard)* |
| Notifications | **Non** *(push FCM pas encore)* | — |

**FileProvider** : partage PDF in-app (`ci.monprofperso.app.fileprovider`) — usage interne, pas à déclarer séparément.

---

## 12. Signature & release (à faire avant upload)

Guide détaillé : **`docs/APP-BUNDLE-ANDROID.md`** · script `./scripts/build-android-bundle.sh`

| Élément | Action |
|---------|--------|
| **Keystore upload** | Créer : `keytool -genkey -v -keystore monprofperso-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload` |
| **Mot de passe keystore** | ⟨À stocker dans gestionnaire de secrets — jamais dans Git⟩ |
| **Play App Signing** | Activer → Google gère la clé de signature finale |
| **ProGuard / R8** | `isMinifyEnabled = false` aujourd'hui — OK pour v1 |
| **Test interne** | Piste « Internal testing » → ajouter e-mails testeurs |
| **Test fermé** | Beta testeurs CI avant production |

### Checklist release

- [ ] `versionCode` incrémenté  
- [ ] `ApiConfig.BASE_URL` = prod (`https://api.monprofperso.com/`)  
- [ ] OTP / paiement : préciser « démo » ou « prod » dans notes de version  
- [ ] PDF CGU + confidentialité publiés sur l'API  
- [ ] Captures + icône 512 px prêtes  
- [ ] AAB signé uploadé  
- [ ] Formulaire Sécurité des données complété  
- [ ] Classification IARC validée  

---

## 13. Notes de version *(exemple v1.0)*

```
Première version publique de Mon Prof Perso (MP²) :

• Recherche de professeurs vérifiés par matière et niveau
• Réservation de cours à domicile ou en ligne
• Espace parent/élève : cours, progrès, ressources pédagogiques
• Espace professeur : demandes, revenus, candidature en ligne
• Paiement Mobile Money (Orange, MTN, Wave)
• Conformité : consentement CGU et consentement parental pour les mineurs

Site : https://www.monprofperso.com
Contact : ⟨support@monprofperso.com⟩
```

---

## 14. Champs légaux encore à compléter (CEPICI)

À renseigner partout où Google ou les textes l'exigent :

| Champ | Exemple / placeholder |
|-------|----------------------|
| **Raison sociale** | ⟨Mon Prof Perso SAS⟩ |
| **RCCM** | ⟨CI-ABJ-…⟩ |
| **Siège social** | ⟨Adresse, commune, Abidjan, Côte d'Ivoire⟩ |
| **Représentant légal** | ⟨Nom, Président⟩ |
| **E-mail DPO / données** | ⟨dpo@monprofperso.com⟩ |
| **Hébergeur** | ⟨Hodi / ST Digital, Grand-Bassam, CI⟩ |

Voir `docs/legal/MENTIONS-LEGALES.md`, `docs/COMPLIANCE.md`, `docs/BUDGET-LANCEMENT.md`.

---

## 15. Récapitulatif — ordre de publication

1. Créer compte Play Console (25 USD)  
2. Créer l'application → package `ci.monprofperso.app`  
3. Remplir **Fiche Play Store** (sections 3–6)  
4. Téléverser **AAB** + notes de version (section 13)  
5. **Sécurité des données** (section 10)  
6. **Classification contenu** (section 8)  
7. **Public cible** (section 9)  
8. **Accès app / comptes test** (section 7)  
9. Test interne → test fermé → **Production**  

---

## 16. iOS (prochaine étape)

Fiche équivalente à créer : `docs/APP-STORE-IOS.md` *(App Store Connect)*.
