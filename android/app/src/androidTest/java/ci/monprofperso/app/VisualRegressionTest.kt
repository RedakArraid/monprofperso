package ci.monprofperso.app

import android.graphics.Bitmap
import android.os.ParcelFileDescriptor
import android.view.inputmethod.InputMethodManager
import android.content.Context
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.TextLayoutResult
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
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
            assertSystemBarAppearance(darkIcons = false)
            capture("01-welcome-phone")

            changeFontScale(2f)
            waitForText("Continuer")
            assertWholeButton("Continuer")
            compose.onNodeWithText("Un professeur").performScrollTo().performClick().assertIsSelected()
            assertSystemBarAppearance(darkIcons = false)
            capture("02-welcome-large-text")
            compose.onNodeWithText("Un parent").performScrollTo().performClick().assertIsSelected()
            changeFontScale(1f)
            click("Continuer")
            waitForText("Créer mon compte")
            assertSystemBarAppearance(darkIcons = true)
            capture("03-signup", expectedDarkSystemBars = true)
            back()

            login("0700000101")
            waitForText("Bonjour,")
            waitForText("Mariam Coulibaly")
            capture("06-parent-home")
            changeFontScale(2f)
            waitForText("Mariam Coulibaly")
            exerciseLargeTextNavigation("Bonjour,")
            waitForText("Mariam Coulibaly")
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
            exerciseLargeTextNavigation("Demandes et offres disponibles", substring = true)
            waitForText("Détails et suivi")
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
            openResources()
            waitForText("Aucune ressource disponible")
            compose.onAllNodesWithText("Connexion indisponible").assertCountEquals(0)
            resourceFilter("Type de ressource : Tout").assertIsSelected()
            resourceFilter("Programme : Tout").assertIsSelected()
            resourceFilter("Type de ressource : Cours").performClick().assertIsSelected()
            resourceFilter("Programme : Standard").performClick().assertIsSelected()
            waitForText("Aucune ressource disponible")
            capture("16a-resources-empty")
            back()
            logout()

            login("0700000199")
            tab("Cours")
            waitForText("Connexion indisponible")
            compose.onAllNodesWithText("Aucun cours dans cette rubrique").assertCountEquals(0)
            capture("17-network-error")
            openResources()
            waitForText("Connexion indisponible")
            compose.onAllNodesWithText("Aucune ressource disponible").assertCountEquals(0)
            assertWholeButton("Réessayer")
            click("Réessayer")
            waitForText("Connexion indisponible")
            compose.onAllNodesWithText("Aucune ressource disponible").assertCountEquals(0)
            capture("17a-resources-error")
            back()
            logout()

            shell("wm size 1600x1000")
            shell("wm density 240")
            compose.waitUntil(20_000) {
                val configuration = compose.activity.resources.configuration
                configuration.densityDpi == 240 && configuration.screenWidthDp > configuration.screenHeightDp
            }
            waitForText("Continuer")
            assertWholeButton("Continuer")
            assertSystemBarAppearance(darkIcons = false)
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
            assertSystemBarAppearance(darkIcons = true)
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
            assertSystemBarAppearance(darkIcons = true)
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

    private fun openResources() {
        tab("Compte")
        waitForText("Ressources pédagogiques")
        click("Ressources pédagogiques", scroll = true)
        waitForText("Ressources & supports")
    }

    private fun resourceFilter(label: String): SemanticsNodeInteraction =
        compose.onNodeWithContentDescription(label).assert(hasRole(Role.Button)).assertHasClickAction()
            .assertIsEnabled().assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp)

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
    private fun assertWholeNavigationTab(label: String): SemanticsNodeInteraction {
        val tab = compose.onNode(hasText(label) and hasRole(Role.Tab))
        val node = tab.assertIsDisplayed().assertIsEnabled().assertHasClickAction()
            .assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp).fetchSemanticsNode()
        val viewport = navigationViewport()
        assertTrue("L'onglet $label doit être entièrement dans le viewport", wholeNodeIsInside(node, viewport))
        val layouts = mutableListOf<TextLayoutResult>()
        val text = compose.onNodeWithText(label, useUnmergedTree = true)
        text.performSemanticsAction(SemanticsActions.GetTextLayoutResult) { it(layouts) }
        val textNode = text.fetchSemanticsNode()
        assertTrue("Le texte $label doit être entièrement dans l'onglet", wholeNodeIsInside(textNode, node.boundsInRoot))
        assertTrue("Le libellé $label doit fournir sa disposition", layouts.isNotEmpty())
        layouts.forEach { layout ->
            val metrics = JSONObject().put("label", label)
                .put("fontScale", compose.activity.resources.configuration.fontScale.toDouble())
                .put("tabBounds", rectMetadata(node.boundsInRoot)).put("viewport", rectMetadata(viewport))
                .put("textBounds", rectMetadata(textNode.boundsInRoot))
                .put("lineCount", layout.lineCount).put("didOverflowWidth", layout.didOverflowWidth)
                .put("didOverflowHeight", layout.didOverflowHeight)
                .put("didExceedMaxLines", layout.multiParagraph.didExceedMaxLines)
                .put("layoutWidth", layout.size.width).put("layoutHeight", layout.size.height)
                .put("paragraphWidth", layout.multiParagraph.width.toDouble())
                .put("paragraphHeight", layout.multiParagraph.height.toDouble())
                .put("maxIntrinsicWidth", layout.multiParagraph.intrinsics.maxIntrinsicWidth.toDouble())
                .put("constraintMaxWidth", layout.layoutInput.constraints.maxWidth)
                .put("constraintMaxHeight", layout.layoutInput.constraints.maxHeight)
                .put("lineEnd", if (layout.lineCount > 0) layout.getLineEnd(0, visibleEnd = true) else -1)
                .put("ellipsized", layout.lineCount > 0 && layout.isLineEllipsized(0))
            File(evidenceDirectory, "navigation-text-metrics.jsonl").appendText(metrics.toString() + "\n")
            // Compose 1.7.2 reconstruit le MultiParagraph sémantique de Text(String) avec la
            // contrainte brute infinie du rail : didOverflowWidth ne décrit alors pas les glyphes.
            // La largeur intrinsèque complète, la taille réelle et la fin de ligne restent vérifiées.
            assertTrue("Le libellé $label doit rester entier sur une ligne : $metrics",
                layout.lineCount == 1 && !layout.didOverflowHeight && !layout.multiParagraph.didExceedMaxLines &&
                    layout.multiParagraph.intrinsics.maxIntrinsicWidth <= layout.size.width &&
                    layout.getLineEnd(0, visibleEnd = true) == label.length && !layout.isLineEllipsized(0))
        }
        return tab
    }
    private fun navigationViewport(): Rect = compose.onNodeWithTag("main-navigation").fetchSemanticsNode().boundsInRoot
        .intersect(compose.onRoot().fetchSemanticsNode().boundsInRoot)
    private fun wholeNodeIsInside(node: SemanticsNode, viewport: Rect): Boolean {
        val bounds = node.boundsInRoot
        return bounds.width > 0 && bounds.height > 0 && bounds.width >= node.size.width && bounds.height >= node.size.height &&
            bounds.left >= viewport.left && bounds.top >= viewport.top &&
            bounds.right <= viewport.right && bounds.bottom <= viewport.bottom
    }
    private fun rectMetadata(rect: Rect) = JSONObject().put("left", rect.left.toDouble()).put("top", rect.top.toDouble())
        .put("right", rect.right.toDouble()).put("bottom", rect.bottom.toDouble())
    private fun wholeTabIsVisible(label: String): Boolean {
        val node = compose.onAllNodes(hasText(label) and hasRole(Role.Tab)).fetchSemanticsNodes().singleOrNull() ?: return false
        return wholeNodeIsInside(node, navigationViewport())
    }
    private fun swipeNavigationTo(label: String, left: Boolean): Int {
        var swipes = 0
        while (!wholeTabIsVisible(label) && swipes < 5) {
            compose.onNodeWithTag("main-navigation").performTouchInput { if (left) swipeLeft() else swipeRight() }
            compose.waitForIdle()
            swipes++
        }
        File(evidenceDirectory, "navigation-gestures.jsonl").appendText(JSONObject().put("target", label)
            .put("direction", if (left) "left" else "right").put("swipeCount", swipes)
            .put("fullyVisibleAfterGesture", wholeTabIsVisible(label)).toString() + "\n")
        assertTrue("L'onglet $label doit être accessible par glissement", wholeTabIsVisible(label))
        return swipes
    }
    private fun exerciseLargeTextNavigation(homeMarker: String, substring: Boolean = false) {
        assertTrue("La navigation connectée doit rester présente",
            compose.onAllNodes(hasRole(Role.Tab)).fetchSemanticsNodes().size >= 4)
        assertWholeNavigationTab("Accueil").assertIsSelected()
        assertTrue("Le parcours doit effectuer un vrai geste vers Compte", swipeNavigationTo("Compte", left = true) > 0)
        assertWholeNavigationTab("Compte").performClick()
        waitForText("Mon compte")
        compose.waitUntil(20_000) { wholeTabIsVisible("Compte") }
        assertWholeNavigationTab("Compte").assertIsSelected()
        compose.onAllNodes(hasRole(Role.Tab) and isSelected()).assertCountEquals(1)
        assertTrue("Le parcours doit effectuer un vrai geste vers Accueil", swipeNavigationTo("Accueil", left = false) > 0)
        assertWholeNavigationTab("Accueil").performClick()
        waitForText(homeMarker, substring)
        compose.waitUntil(20_000) { wholeTabIsVisible("Accueil") }
        assertWholeNavigationTab("Accueil").assertIsSelected()
        compose.onAllNodes(hasRole(Role.Tab) and isSelected()).assertCountEquals(1)
    }
    private fun assertSystemBarAppearance(darkIcons: Boolean) {
        compose.waitUntil(20_000) {
            val activity = compose.activity
            var matches = false
            instrumentation.runOnMainSync {
                val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
                matches = controller.isAppearanceLightStatusBars == darkIcons &&
                    controller.isAppearanceLightNavigationBars == darkIcons
            }
            matches
        }
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

    private fun capture(name: String, keyboardVisible: Boolean? = null, expectedDarkSystemBars: Boolean? = null) {
        compose.waitForIdle()
        val frame = capturePresentedScreen(compose.activity, instrumentation, expectedDarkSystemBars)
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
            frame.systemBars?.let { bars ->
                metadata.put("systemBars", JSONObject().put("expectedDarkIcons", bars.expectedDarkIcons)
                    .put("minimumContrastRatio", 4.5).put("minimumContrastingGlyphPixels", 16)
                    .put("requiredBackgroundFractionExclusive", 0.5)
                    .put("statusClock", systemBarRegionMetadata(bars.statusClock))
                    .put("navigationHandle", systemBarRegionMetadata(bars.navigationHandle)))
            }
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
    private fun systemBarRegionMetadata(evidence: SystemBarRegionEvidence) = JSONObject()
        .put("region", JSONObject().put("left", evidence.region.left).put("top", evidence.region.top)
            .put("right", evidence.region.right).put("bottom", evidence.region.bottom))
        .put("backgroundArgb", "%08x".format(evidence.backgroundArgb))
        .put("uniformWindowBackground", evidence.uniformWindowBackground)
        .put("matchingBackgroundPixels", evidence.matchingBackgroundPixels)
        .put("contrastingGlyphPixels", evidence.contrastingGlyphPixels)
        .put("totalPixels", evidence.totalPixels)
}
