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
    compileSdk = 35

    defaultConfig {
        applicationId = "ci.monprofperso.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
        vectorDrawables { useSupportLibrary = true }
        ndk {
            // Symboles natifs inclus dans l'AAB pour Play Console (crash/ANR).
            debugSymbolLevel = "SYMBOL_TABLE"
        }
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = rootProject.file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
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
            if (keystorePropertiesFile.exists()) {
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
