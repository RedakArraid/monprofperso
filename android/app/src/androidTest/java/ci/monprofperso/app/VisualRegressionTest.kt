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
import java.io.File
import java.net.URI

/** Recette des vraies vues Compose contre l'API locale de fixtures, jamais un prestataire. */
@RunWith(AndroidJUnit4::class)
class VisualRegressionTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val instrumentation get() = InstrumentationRegistry.getInstrumentation()
    private val evidenceDirectory get() = File(instrumentation.targetContext.getExternalFilesDir(null), "visual-proof").apply { mkdirs() }

    @Test
    fun accessiblePhoneFlowsAndVisualEvidence() {
        assertLocalFixture()
        try {
            shell("wm size 720x1280")
            shell("wm density 320")
            shell("settings put secure show_ime_with_hard_keyboard 1")
            changeFontScale(1f)
            waitForText("Continuer")
            assertWholeButton("Continuer")
            capture("01-welcome-phone")

            changeFontScale(1.6f)
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
            capture("06-parent-home")
            tab("Recherche")
            waitForText("Consulter le profil")
            capture("07-search")
            compose.onAllNodesWithText("Consulter le profil")[0].performScrollTo().performClick()
            waitForText("Réserver un cours")
            assertWholeButton("Réserver un cours")
            capture("08-teacher-profile")
            changeFontScale(1.6f)
            waitForText("Réserver un cours")
            assertWholeButton("Réserver un cours")
            compose.onNodeWithText("À propos").performScrollTo().assertIsDisplayed()
            capture("08a-teacher-profile-large-text")
            changeFontScale(1f)
            waitForText("Réserver un cours")
            click("Réserver un cours")
            waitForText("Demander un cours")
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
            waitForText("Prochains cours")
            capture("14-teacher-dashboard")
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
                compose.activity.resources.configuration.screenWidthDp > compose.activity.resources.configuration.screenHeightDp
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
            capture("04a-login-keyboard")
        }
        hideKeyboard()
        if (phone == "0700000101") capture("04-login")
        click("Se connecter", scroll = true)
        waitForTag("auth-otp")
        compose.onNodeWithTag("auth-otp").performClick().performTextInput("123456")
        if (phone == "0700000101") {
            waitForKeyboard()
            assertWholeButton("Vérifier")
            capture("05a-otp-keyboard")
        }
        hideKeyboard()
        if (phone == "0700000101") capture("05-otp")
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
    private fun waitForKeyboard() {
        compose.waitUntil(20_000) {
            ViewCompat.getRootWindowInsets(compose.activity.window.decorView)?.isVisible(WindowInsetsCompat.Type.ime()) == true
        }
        compose.waitForIdle()
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

    private fun capture(name: String) {
        compose.waitForIdle()
        val bitmap = checkNotNull(instrumentation.uiAutomation.takeScreenshot()) { "Capture indisponible" }
        File(evidenceDirectory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
        File(evidenceDirectory, "$name.txt").writeText(compose.onRoot().printToString())
        File(evidenceDirectory, "README.txt").writeText(
            "Captures des vraies vues Android, API36 en émulation. Données et OTP de fixtures locales. " +
                "Aucun paiement ni message prestataire réel. Ces captures ne remplacent pas une recette sur appareils physiques.\n"
        )
    }
}
