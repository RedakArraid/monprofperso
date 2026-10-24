plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

import java.util.Properties
import java.net.URI

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}

// CI et poste de publication peuvent fournir les secrets sans fichier versionné.
fun signingValue(key: String, variable: String): String? =
    providers.environmentVariable(variable).orNull?.takeIf { it.isNotBlank() }
        ?: (keystoreProperties[key] as? String)?.takeIf { it.isNotBlank() }
val releaseStorePath = signingValue("storeFile", "MPP_ANDROID_KEYSTORE")
val releaseStorePassword = signingValue("storePassword", "MPP_ANDROID_STORE_PASSWORD")
val releaseKeyAlias = signingValue("keyAlias", "MPP_ANDROID_KEY_ALIAS")
val releaseKeyPassword = signingValue("keyPassword", "MPP_ANDROID_KEY_PASSWORD")
val releaseSigningReady = listOf(releaseStorePath, releaseStorePassword, releaseKeyAlias, releaseKeyPassword).all { !it.isNullOrBlank() }

// -PdevApiUrl=... / -PstagingApiUrl=... / -PproductionApiUrl=... pour chaque environnement.
fun apiUrl(propertyName: String, defaultUrl: String, requireHttps: Boolean = false): String {
    val value = providers.gradleProperty(propertyName).getOrElse(defaultUrl).trimEnd('/') + "/"
    val uri = URI(value)
    require(uri.host != null && uri.userInfo == null && uri.query == null && uri.fragment == null)
    require(uri.scheme == "https" || (!requireHttps && uri.scheme == "http"))
    require(value.none { it == '"' || it == '\\' || it.isISOControl() })
    return "\"$value\""
}

android {
    namespace = "ci.monprofperso.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "ci.monprofperso.app"
        minSdk = 24
        targetSdk = 36
        versionCode = providers.gradleProperty("releaseVersionCode").getOrElse("3").toInt()
        versionName = providers.gradleProperty("releaseVersionName").getOrElse("1.1.0")
        vectorDrawables { useSupportLibrary = true }
        ndk {
            // Symboles natifs inclus dans l'AAB pour Play Console (crash/ANR).
            debugSymbolLevel = "SYMBOL_TABLE"
        }
    }

    signingConfigs {
        if (releaseSigningReady) {
            create("release") {
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
                storeFile = rootProject.file(releaseStorePath!!)
                storePassword = releaseStorePassword
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".dev"
            buildConfigField("String", "API_BASE_URL", apiUrl("devApiUrl", "http://10.0.2.2:8099/"))
            buildConfigField("boolean", "DEMO_DATA_ENABLED", (providers.gradleProperty("enableDemoData").orNull == "true").toString())
        }
        create("staging") {
            initWith(getByName("debug"))
            applicationIdSuffix = ".staging"
            matchingFallbacks += listOf("debug")
            buildConfigField("String", "API_BASE_URL", apiUrl("stagingApiUrl", "https://staging-api.monprofperso.com/", true))
            buildConfigField("boolean", "DEMO_DATA_ENABLED", "false")
        }
        release {
            buildConfigField("String", "API_BASE_URL", apiUrl("productionApiUrl", "https://api.monprofperso.com/", true))
            buildConfigField("boolean", "DEMO_DATA_ENABLED", "false")
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (releaseSigningReady) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true; buildConfig = true }
    packaging {
        resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    }
}

// Une compilation de contrôle reste possible ; un livrable Release doit être signé.
gradle.taskGraph.whenReady {
    if (allTasks.any { it.name in setOf("assembleRelease", "bundleRelease", "packageRelease", "signReleaseBundle") }) {
        check(releaseSigningReady && rootProject.file(releaseStorePath!!).isFile) {
            "Signature Release absente : configurer MPP_ANDROID_KEYSTORE, MPP_ANDROID_STORE_PASSWORD, MPP_ANDROID_KEY_ALIAS et MPP_ANDROID_KEY_PASSWORD (ou keystore.properties)."
        }
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    val composeBom = platform("androidx.compose:compose-bom:2024.09.02")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3:1.3.0")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.8.1")

    // Réseau (API Akwaba commune)
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
