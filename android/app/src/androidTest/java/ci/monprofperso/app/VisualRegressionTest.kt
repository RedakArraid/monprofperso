package ci.monprofperso.app

import android.graphics.Bitmap
import android.os.ParcelFileDescriptor
import android.view.inputmethod.InputMethodManager
import android.content.Context
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.dp
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import ci.monprofperso.app.data.ApiConfig
import ci.monprofperso.app.data.Auth
import okhttp3.OkHttpClient
import okhttp3.Request
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject
import java.io.File
import java.net.URI

/** Recette des vraies vues Compose contre l'API locale de fixtures, jamais un prestataire. */
@RunWith(AndroidJUnit4::class)
class VisualRegressionTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val instrumentation get() = InstrumentationRegistry.getInstrumentation()
    private val capturedWindowHashes = mutableMapOf<String, String>()
    private val evidenceDirectory get(): File {
        val output = checkNotNull(InstrumentationRegistry.getArguments().getString("additionalTestOutputDir")) {
            "La recette exige la collecte Gradle additionalTestOutputDir."
        }
        return File(output, "visual-proof").apply {
            check(isDirectory || mkdirs()) { "Impossible de créer le répertoire de captures UTP." }
        }
    }

    @Test
    fun accessiblePhoneFlowsAndVisualEvidence() {
        assertLocalFixture()
        try {
            shell("wm size 720x1280")
            shell("wm density 320")
            compose.waitUntil(20_000) {
                val configuration = compose.activity.resources.configuration
                configuration.densityDpi == 320 && configuration.screenWidthDp == 360
            }
            shell("settings put secure show_ime_with_hard_keyboard 1")
            changeFontScale(1f)
            waitForText("Continuer")
            assertWholeButton("Continuer")
            capture("01-welcome-phone")

            changeFontScale(2f)
            waitForText("Continuer")
            assertWholeButton("Continuer")
            compose.onNodeWithText("Un professeur").performScrollTo().performClick().assertIsSelected()
            capture("02-welcome-large-text")
            compose.onNodeWithText("Un parent").performScrollTo().performClick().assertIsSelected()
            changeFontScale(1f)
            click("Continuer")
            waitForText("Créer mon compte")
            capture("03-signup")
            back()

            login("0700000101")
            waitForText("Bonjour,")
            waitForText("Mariam Coulibaly")
            capture("06-parent-home")
            changeFontScale(2f)
            waitForText("Mariam Coulibaly")
            assertWholeNavigationTabs()
            capture("06a-parent-home-large-text")
            assertDifferentWindowContent("06-parent-home", "06a-parent-home-large-text")
            changeFontScale(1f)
            tab("Recherche")
            waitForText("Consulter le profil")
            capture("07-search")
            compose.onAllNodesWithText("Consulter le profil")[0].performScrollTo().performClick()
            waitForText("Réserver un cours")
            waitForText("Mariam Coulibaly")
            waitForText("À propos")
            assertWholeButton("Réserver un cours")
            capture("08-teacher-profile")
            changeFontScale(2f)
            waitForText("Réserver un cours")
            assertWholeButton("Réserver un cours")
            compose.onNodeWithText("À propos").performScrollTo().assertIsDisplayed()
            capture("08a-teacher-profile-large-text")
            changeFontScale(1f)
            waitForText("Réserver un cours")
            click("Réserver un cours")
            waitForText("Demander un cours")
            waitForText("Mariam Coulibaly")
            waitForText("Format du cours")
            capture("09-booking")
            back(); back()
            tab("Cours")
            waitForText("Détails et suivi")
            capture("10-courses")
            compose.onAllNodesWithText("Détails et suivi")[0].performScrollTo().performClick()
            waitForText("Informations du rendez-vous")
            capture("11-course-details")
            back()
            tab("Compte")
            waitForText("Mes données et mon compte")
            capture("12-account")
            click("Mes données et mon compte", scroll = true)
            waitForText("Conditions et confidentialité")
            capture("13-privacy")
            back()
            logout()

            login("0700000102")
            waitForText("Demandes et offres disponibles", substring = true)
            waitForText("Détails et suivi")
            capture("14-teacher-dashboard")
            changeFontScale(2f)
            waitForText("Demandes et offres disponibles", substring = true)
            waitForText("Détails et suivi")
            assertWholeNavigationTabs()
            capture("14a-teacher-dashboard-large-text")
            assertDifferentWindowContent("14-teacher-dashboard", "14a-teacher-dashboard-large-text")
            changeFontScale(1f)
            tab("Revenus")
            waitForText("Disponible pour une demande", substring = true)
            capture("15-teacher-finances")
            logout()

            login("0700000198")
            tab("Cours")
            waitForText("Aucun cours dans cette rubrique")
            capture("16-empty-courses")
            logout()

            login("0700000199")
            tab("Cours")
            waitForText("Connexion indisponible")
            compose.onAllNodesWithText("Aucun cours dans cette rubrique").assertCountEquals(0)
            capture("17-network-error")
            logout()

            shell("wm size 1600x1000")
            shell("wm density 240")
            compose.waitUntil(20_000) {
                val configuration = compose.activity.resources.configuration
                configuration.densityDpi == 240 && configuration.screenWidthDp > configuration.screenHeightDp
            }
            waitForText("Continuer")
            assertWholeButton("Continuer")
            capture("18-welcome-landscape")
        } catch (error: Throwable) {
            runCatching { capture("failure") }
            throw error
        } finally {
            instrumentation.runOnMainSync { Auth.logout() }
            shell("settings put secure show_ime_with_hard_keyboard 0")
            shell("settings put system font_scale 1.0")
            shell("wm size reset")
            shell("wm density reset")
        }
    }

    private fun assertLocalFixture() {
        check(BuildConfig.DEBUG && URI(ApiConfig.BASE_URL).host in setOf("10.0.2.2", "127.0.0.1", "localhost")) {
            "La recette visuelle exige une API locale et un build Debug."
        }
        OkHttpClient().newCall(Request.Builder().url(ApiConfig.BASE_URL + "health").build()).execute().use { response ->
            check(response.isSuccessful && response.header("X-MPP-Visual-Fixture") == "local-only") {
                "Le serveur local de fixtures doit être lancé explicitement avant la recette."
            }
        }
    }

    private fun login(phone: String) {
        waitForText("J’ai déjà un compte · Se connecter")
        click("J’ai déjà un compte · Se connecter")
        waitForTag("auth-phone")
        compose.onNodeWithTag("auth-phone").performClick().performTextReplacement(phone)
        if (phone == "0700000101") {
            waitForKeyboard()
            compose.onNodeWithText("Se connecter").performScrollTo().assertIsDisplayed()
            assertAboveKeyboard(compose.onNodeWithTag("auth-phone"))
            assertAboveKeyboard(compose.onNodeWithText("Se connecter"))
            capture("04a-login-keyboard", keyboardVisible = true)
        }
        hideKeyboard()
        if (phone == "0700000101") capture("04-login", keyboardVisible = false)
        click("Se connecter", scroll = true)
        waitForTag("auth-otp")
        compose.onNodeWithTag("auth-otp").performClick().performTextInput("123456")
        if (phone == "0700000101") {
            waitForKeyboard()
            assertWholeButton("Vérifier")
            assertAboveKeyboard(compose.onNodeWithTag("auth-otp"))
            assertAboveKeyboard(compose.onNodeWithText("Vérifier"))
            capture("05a-otp-keyboard", keyboardVisible = true)
        }
        hideKeyboard()
        if (phone == "0700000101") capture("05-otp", keyboardVisible = false)
        click("Vérifier")
        compose.waitUntil(40_000) { compose.onAllNodes(hasRole(Role.Tab)).fetchSemanticsNodes().isNotEmpty() }
    }

    private fun logout() {
        tab("Compte")
        waitForText("Se déconnecter")
        click("Se déconnecter", scroll = true)
        waitForText("Continuer")
    }

    private fun hasRole(role: Role) = SemanticsMatcher.expectValue(SemanticsProperties.Role, role)
    private fun tab(label: String) {
        compose.onNode(hasText(label) and hasRole(Role.Tab)).performClick()
        compose.waitForIdle()
    }
    private fun click(label: String, scroll: Boolean = false) {
        val node = compose.onNodeWithText(label)
        if (scroll) node.performScrollTo()
        node.performClick()
        compose.waitForIdle()
    }
    private fun back() {
        compose.activityRule.scenario.onActivity { it.onBackPressedDispatcher.onBackPressed() }
        compose.waitForIdle()
    }
    private fun waitForText(text: String, substring: Boolean = false) {
        compose.waitUntil(40_000) { compose.onAllNodesWithText(text, substring = substring).fetchSemanticsNodes().isNotEmpty() }
        compose.waitForIdle()
    }
    private fun waitForTag(tag: String) {
        compose.waitUntil(40_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }
    private fun changeFontScale(scale: Float) {
        shell("settings put system font_scale $scale")
        compose.waitUntil(20_000) { kotlin.math.abs(compose.activity.resources.configuration.fontScale - scale) < .02f }
        compose.waitForIdle()
    }
    private fun assertWholeButton(label: String) {
        val button = compose.onNodeWithText(label).assertIsDisplayed().assertHeightIsAtLeast(48.dp).fetchSemanticsNode()
        assertTrue("Le bouton $label doit rester entièrement visible", button.boundsInRoot.height >= button.size.height - 1f)
    }
    private fun assertWholeNavigationTabs() {
        val tabs = compose.onAllNodes(hasRole(Role.Tab))
        val nodes = tabs.fetchSemanticsNodes()
        assertTrue("La navigation connectée doit rester présente", nodes.size >= 4)
        nodes.indices.forEach { index ->
            val node = tabs[index].assertIsDisplayed().assertIsEnabled().assertHasClickAction()
                .assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp).fetchSemanticsNode()
            assertTrue("Un onglet est rogné horizontalement", node.boundsInRoot.width >= node.size.width - 1f)
            assertTrue("Un onglet est rogné verticalement", node.boundsInRoot.height >= node.size.height - 1f)
        }
        compose.onAllNodes(hasRole(Role.Tab) and isSelected()).assertCountEquals(1)
    }
    private fun waitForKeyboard() {
        compose.waitUntil(20_000) {
            ViewCompat.getRootWindowInsets(compose.activity.window.decorView)?.isVisible(WindowInsetsCompat.Type.ime()) == true
        }
        compose.waitForIdle()
    }
    private fun assertAboveKeyboard(node: SemanticsNodeInteraction) {
        val bounds = node.assertIsDisplayed().fetchSemanticsNode().boundsInWindow
        val view = compose.activity.window.decorView
        var keyboardTop = 0
        var safeTop = 0
        instrumentation.runOnMainSync {
            val insets = checkNotNull(ViewCompat.getRootWindowInsets(view))
            check(insets.isVisible(WindowInsetsCompat.Type.ime()))
            keyboardTop = view.height - insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
            safeTop = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()).top
        }
        assertTrue("Le champ ou bouton doit rester au-dessus du clavier", bounds.bottom <= keyboardTop + 1f)
        assertTrue("Le champ ou bouton doit rester sous la zone système", bounds.top >= safeTop - 1f)
    }
    private fun hideKeyboard() {
        compose.activityRule.scenario.onActivity { activity ->
            (activity.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager)
                .hideSoftInputFromWindow(activity.window.decorView.windowToken, 0)
        }
        compose.waitUntil(20_000) {
            ViewCompat.getRootWindowInsets(compose.activity.window.decorView)?.isVisible(WindowInsetsCompat.Type.ime()) != true
        }
        compose.waitForIdle()
    }
    private fun shell(command: String): String = ParcelFileDescriptor.AutoCloseInputStream(
        instrumentation.uiAutomation.executeShellCommand(command)
    ).bufferedReader().use { it.readText() }

    private fun assertDifferentWindowContent(normal: String, large: String) {
        assertTrue("Les rendus à 100 % et 200 % doivent être différents : $normal / $large",
            capturedWindowHashes.getValue(normal) != capturedWindowHashes.getValue(large))
    }

    private fun capture(name: String, keyboardVisible: Boolean? = null) {
        compose.waitForIdle()
        val frame = capturePresentedScreen(compose.activity, instrumentation)
        val bitmap = frame.bitmap
        try {
            val configuration = frame.configuration
            keyboardVisible?.let { check(frame.imeVisible == it) { "Visibilité clavier inattendue pour $name." } }
            val metadata = JSONObject().put("screen", name).put("apiLevel", android.os.Build.VERSION.SDK_INT)
                .put("fontScale", configuration.fontScale.toDouble()).put("densityDpi", configuration.densityDpi)
                .put("screenWidthDp", configuration.screenWidthDp).put("screenHeightDp", configuration.screenHeightDp)
                .put("imageWidth", bitmap.width).put("imageHeight", bitmap.height).put("fixture", "local-only")
                .put("captureMethod", "display-verified-with-window-pixelcopy")
                .put("pixelTolerance", 0).put("comparisonEdgeInsetDp", 8)
                .put("comparedBounds", JSONObject().put("left", frame.comparedBounds.left).put("top", frame.comparedBounds.top)
                    .put("right", frame.comparedBounds.right).put("bottom", frame.comparedBounds.bottom))
                .put("imeVisible", frame.imeVisible).put("windowBitmapSha256Argb8888", frame.windowContentSha256)
            val encoded = File(evidenceDirectory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            check(encoded) { "Échec d’encodage de la capture $name." }
            capturedWindowHashes[name] = frame.windowContentSha256
            File(evidenceDirectory, "$name.json").writeText(metadata.toString(2))
            File(evidenceDirectory, "$name.txt").writeText(compose.onRoot().printToString())
            File(evidenceDirectory, "README.txt").writeText(
                "Captures des vraies vues Android, API36 en émulation. Données et OTP de fixtures locales. " +
                    "Écran entier original, sans collage : correspondance ARGB exacte de la zone applicative visible " +
                    "avec PixelCopy après frame commit, hors insets système/clavier et bord de 8 dp pour leurs ombres. " +
                    "Aucun paiement ni message prestataire réel. Ces captures ne remplacent pas une recette sur appareils physiques.\n"
            )
        } finally {
            bitmap.recycle()
        }
    }
}
