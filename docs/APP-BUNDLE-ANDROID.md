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

### Script automatique *(recommandé — configure Java + keystore)*

```bash
./scripts/setup-android-signing.sh
```

Le script utilise le **JDK d'Android Studio** sur macOS et crée :
- `android/secrets/monprofperso-upload.jks`
- `android/keystore.properties` *(gitignoré)*

> Ne copiez pas les commentaires `# …` sur la même ligne qu'une commande — le shell peut les interpréter comme des arguments (`cp: passe: Not a directory`).

### Manuel (si besoin)

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

cd android
mkdir -p secrets

keytool -genkeypair -v \
  -keystore secrets/monprofperso-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

Puis copier le modèle **sans commentaire sur la ligne** :

```bash
cp keystore.properties.example keystore.properties
```

Éditer `keystore.properties` : `storePassword`, `keyPassword`, vérifier `storeFile` et `keyAlias`.

| Fichier | Versionné Git ? |
|---------|-----------------|
| `keystore.properties.example` | Oui (modèle) |
| `keystore.properties` | **Non** |
| `secrets/*.jks` | **Non** |

---

## 3. Générer l'App Bundle

### Prérequis Java (macOS)

Si `Unable to locate a Java Runtime` :

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

Les scripts `./scripts/setup-android-signing.sh` et `./scripts/build-android-bundle.sh` le font automatiquement.

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
# Première fois (mot de passe keystore demandé au clavier)
./scripts/setup-android-signing.sh

# Chaque release
./scripts/build-android-bundle.sh
# → android/app/build/outputs/bundle/release/app-release.aab
# → Play Console → App bundles → Téléverser
```
