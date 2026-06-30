# App Bundle Android (.aab) — Mon Prof Perso

Guide pour **générer, signer et publier** l'Android App Bundle sur Google Play.  
Complète `docs/PLAY-STORE-ANDROID.md` (fiche store, Data safety, etc.).

---

## 1. Fichier produit

| Champ | Valeur |
|-------|--------|
| **Format** | Android App Bundle (`.aab`) — **obligatoire** sur Play Store |
| **Nom du fichier généré** | `app-release.aab` |
| **Chemin local** | `android/app/build/outputs/bundle/release/app-release.aab` |
| **Package** | `ci.monprofperso.app` |
| **Version actuelle** | `1.0` (versionCode **1**) |

---

## 2. Création du keystore upload (une fois)

Google Play App Signing : tu signes l'AAB avec une **clé upload** ; Google resigne avec la clé de prod.

```bash
cd android
mkdir -p secrets

keytool -genkey -v \
  -keystore secrets/monprofperso-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

| Question keytool | Valeur suggérée |
|------------------|-----------------|
| Mot de passe keystore | ⟨secret fort — gestionnaire de mots de passe⟩ |
| Nom / prénom | ⟨Représentant légal ou raison sociale⟩ |
| Unité organisationnelle | ⟨ex. Direction technique⟩ |
| Organisation | ⟨Mon Prof Perso SAS⟩ |
| Ville | Abidjan |
| État / province | Lagunes |
| Code pays | CI |

Puis :

```bash
cp keystore.properties.example keystore.properties
# Éditer storePassword, keyPassword, vérifier storeFile et keyAlias
```

| Fichier | Versionné Git ? |
|---------|-----------------|
| `keystore.properties.example` | Oui (modèle) |
| `keystore.properties` | **Non** |
| `secrets/*.jks` | **Non** |

---

## 3. Générer l'App Bundle

### Script (recommandé)

```bash
./scripts/build-android-bundle.sh
```

### Manuel

```bash
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"  # macOS + Android Studio
./gradlew bundleRelease
```

### Vérifier la signature

```bash
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```

---

## 4. Champs Play Console — section « App bundles »

Lors de **Créer une version** → **App bundles** :

| Champ | Valeur / action |
|-------|-----------------|
| **Fichier à téléverser** | `app-release.aab` |
| **Nom du package** | `ci.monprofperso.app` *(auto-détecté)* |
| **versionCode** | `1` *(incrémenter à chaque nouvelle version)* |
| **versionName** | `1.0` |
| **Play App Signing** | **Activer** à la première upload |
| **Clé upload** | Exporter certificat PEM si demandé : voir § 5 |

Après upload, Play Console affiche :

| Métrique | Attendu v1 |
|----------|------------|
| Taille téléchargement estimée | ~15–25 Mo *(selon device)* |
| ABI supportées | arm64-v8a, armeabi-v7a, x86_64 *(automatique)* |
| Langues | Français *(strings par défaut)* |
| API min | 24 |
| API cible | 34 |

---

## 5. Export certificat upload (Play App Signing)

Si Play demande la clé upload lors de la première publication :

```bash
keytool -export -rfc \
  -alias upload \
  -file monprofperso-upload-cert.pem \
  -keystore android/secrets/monprofperso-upload.jks
```

Téléverser `monprofperso-upload-cert.pem` dans Play Console → **Intégrité de l'app** → **App signing**.

---

## 6. Incrémenter une nouvelle version

Éditer `android/app/build.gradle.kts` :

```kotlin
versionCode = 2      // entier strictement croissant
versionName = "1.0.1"
```

Puis regénérer l'AAB et créer une **nouvelle version** sur Play (même piste ou production).

| Release | versionCode | versionName | Notes |
|---------|-------------|-------------|-------|
| Lancement | 1 | 1.0 | Première prod |
| Correctif | 2 | 1.0.1 | Bugfix |
| Feature | 3 | 1.1.0 | Nouvelle fonctionnalité |

---

## 7. Pistes de déploiement Play (ordre conseillé)

| Piste | Usage | Testeurs |
|-------|-------|----------|
| **Test interne** | CI rapide, équipe | E-mails Google |
| **Test fermé** | Beta Abidjan | Liste fermée |
| **Test ouvert** | Beta publique | Optionnel |
| **Production** | Store public | Tous |

Compte test review Google : voir `docs/PLAY-STORE-ANDROID.md` § 7.

---

## 8. Checklist avant upload AAB

- [ ] `ApiConfig.BASE_URL` = `https://api.monprofperso.com/` (prod)
- [ ] `versionCode` incrémenté si mise à jour
- [ ] `keystore.properties` + `.jks` en place
- [ ] `./scripts/build-android-bundle.sh` OK
- [ ] Fiche store + captures complétées (`PLAY-STORE-ANDROID.md`)
- [ ] PDF confidentialité / CGU en ligne
- [ ] Notes de version rédigées

---

## 9. Dépannage

| Problème | Solution |
|----------|----------|
| `keystore.properties manquant` | Copier `.example` → `.properties` |
| `Failed to read key upload` | Vérifier alias et mots de passe |
| `SDK location not found` | Créer `android/local.properties` : `sdk.dir=...` |
| Upload rejeté « signed with debug » | Configurer keystore release (§ 2) |
| `versionCode already used` | Incrémenter `versionCode` dans `build.gradle.kts` |

---

## 10. Fichiers du repo

| Fichier | Rôle |
|---------|------|
| `android/app/build.gradle.kts` | versionCode, signing release |
| `android/keystore.properties.example` | Modèle secrets signature |
| `scripts/build-android-bundle.sh` | Build AAB en une commande |
| `docs/PLAY-STORE-ANDROID.md` | Fiche Play Store complète |
| `.gitignore` | Ignore `*.aab`, `*.jks`, `keystore.properties` |

---

## Résumé

```bash
# Première fois
cd android && mkdir -p secrets && keytool ... -keystore secrets/monprofperso-upload.jks -alias upload
cp keystore.properties.example keystore.properties   # éditer les mots de passe

# Chaque release
./scripts/build-android-bundle.sh
# → android/app/build/outputs/bundle/release/app-release.aab
# → Play Console → App bundles → Téléverser
```
