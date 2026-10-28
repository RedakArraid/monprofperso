package ci.monprofperso.app

import android.app.Activity
import android.app.Instrumentation
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Point
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.PixelCopy
import androidx.core.graphics.ColorUtils
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.nio.ByteBuffer
import java.security.MessageDigest
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

internal data class PresentedScreen(
    val bitmap: Bitmap,
    val configuration: Configuration,
    val comparedBounds: Rect,
    val windowContentSha256: String,
    val imeVisible: Boolean,
    val systemBars: SystemBarsEvidence?,
)

internal data class SystemBarRegionEvidence(
    val region: Rect,
    val backgroundArgb: Int,
    val uniformWindowBackground: Boolean,
    val matchingBackgroundPixels: Int,
    val contrastingGlyphPixels: Int,
    val totalPixels: Int,
) {
    val ready: Boolean get() = uniformWindowBackground && matchingBackgroundPixels * 2 > totalPixels &&
        contrastingGlyphPixels >= 16
}

internal data class SystemBarsEvidence(
    val expectedDarkIcons: Boolean,
    val statusClock: SystemBarRegionEvidence,
    val navigationHandle: SystemBarRegionEvidence,
) {
    val ready: Boolean get() = statusClock.ready && navigationHandle.ready
}

/**
 * Conserve l'écran Android original, clavier et barres système compris.
 * Une frame soumise n'est pas encore nécessairement présentée : PixelCopy fournit
 * la référence de la fenêtre, puis les pixels visibles doivent correspondre
 * exactement à ceux de l'écran. Aucun collage, délai fixe ni tolérance de couleur.
 */
internal fun capturePresentedScreen(
    activity: Activity,
    instrumentation: Instrumentation,
    expectedDarkSystemBars: Boolean? = null,
): PresentedScreen {
    val deadline = SystemClock.uptimeMillis() + 15_000
    val view = activity.window.decorView
    if (expectedDarkSystemBars != null) {
        // La quiescence des événements ne garantit pas le rendu de SystemUI : les pixels des
        // deux régions identifiables ci-dessous doivent aussi présenter l'apparence attendue.
        instrumentation.uiAutomation.waitForIdle(200, 3_000)
    }
    var lastMismatch = "La fenêtre n'est pas encore présentée."
    while (true) {
        val committed = CountDownLatch(1)
        instrumentation.runOnMainSync {
            check(view.isAttachedToWindow && view.isHardwareAccelerated) {
                "La capture exige une fenêtre attachée avec rendu matériel."
            }
            view.viewTreeObserver.registerFrameCommitCallback { committed.countDown() }
            view.postInvalidateOnAnimation()
        }
        check(awaitWithinDeadline(committed, deadline)) { "La fenêtre n'a pas soumis sa frame." }

        lateinit var windowBitmap: Bitmap
        lateinit var configuration: Configuration
        lateinit var viewport: Rect
        val origin = Point()
        var imeVisible = false
        var statusBarHeight = 0
        var navigationBarHeight = 0
        var copyResult = PixelCopy.ERROR_UNKNOWN
        val copied = CountDownLatch(1)
        instrumentation.runOnMainSync {
            configuration = Configuration(activity.resources.configuration)
            val insets = checkNotNull(ViewCompat.getRootWindowInsets(view))
            val occupied = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or
                    WindowInsetsCompat.Type.ime()
            )
            imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())
            statusBarHeight = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top
            navigationBarHeight = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
            // Les ombres du clavier et le décor système ne font pas partie de la fenêtre copiée.
            val edge = (8 * activity.resources.displayMetrics.density).roundToInt()
            viewport = Rect(occupied.left + edge, occupied.top + edge,
                view.width - occupied.right - edge, view.height - occupied.bottom - edge)
            check(viewport.width() > 0 && viewport.height() > 0) { "Zone visible de l'application vide." }
            val location = IntArray(2)
            view.getLocationOnScreen(location)
            origin.set(location[0], location[1])
            windowBitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            PixelCopy.request(activity.window, windowBitmap, { result ->
                copyResult = result
                copied.countDown()
            }, Handler(Looper.getMainLooper()))
        }
        try {
            check(awaitWithinDeadline(copied, deadline)) { "PixelCopy n'a pas répondu." }
            check(copyResult == PixelCopy.SUCCESS) { "PixelCopy a échoué : $copyResult." }
            val captured = checkNotNull(instrumentation.uiAutomation.takeScreenshot()) { "Capture écran indisponible." }
            val screen = if (captured.config == Bitmap.Config.HARDWARE) {
                checkNotNull(captured.copy(Bitmap.Config.ARGB_8888, false)).also { captured.recycle() }
            } else captured
            var retained = false
            try {
                val screenViewport = Rect(viewport).apply { offset(origin.x, origin.y) }
                val fullWindow = origin.x == 0 && origin.y == 0 &&
                    windowBitmap.width == screen.width && windowBitmap.height == screen.height
                val contentPresented = fullWindow && samePixels(windowBitmap, viewport, screen, screenViewport)
                val systemBars = if (contentPresented && expectedDarkSystemBars != null) {
                    check(!imeVisible && statusBarHeight > 0 && navigationBarHeight > 0 &&
                        configuration.screenWidthDp < configuration.screenHeightDp) {
                        "Le contrôle ciblé de SystemUI exige le portrait avec ses deux barres et sans clavier."
                    }
                    val density = configuration.densityDpi / 160f
                    // Sur cet émulateur, l'horloge se trouve à gauche de la barre d'état et le trait
                    // gestuel au centre de la barre basse. Le fond vient de PixelCopy, sans glyphes.
                    SystemBarsEvidence(expectedDarkSystemBars,
                        inspectSystemBarRegion(windowBitmap, screen,
                            Rect((16 * density).roundToInt(), 0, (112 * density).roundToInt(), statusBarHeight),
                            expectedDarkSystemBars),
                        inspectSystemBarRegion(windowBitmap, screen,
                            Rect(screen.width / 4, screen.height - navigationBarHeight, screen.width * 3 / 4, screen.height),
                            expectedDarkSystemBars))
                } else null
                if (contentPresented && (expectedDarkSystemBars == null || systemBars?.ready == true)) {
                    val bytes = ByteBuffer.allocate(windowBitmap.byteCount)
                    windowBitmap.copyPixelsToBuffer(bytes)
                    val digest = MessageDigest.getInstance("SHA-256").digest(bytes.array())
                        .joinToString("") { "%02x".format(it) }
                    retained = true
                    return PresentedScreen(screen, configuration, screenViewport, digest, imeVisible, systemBars)
                }
                lastMismatch = if (!contentPresented) "La fenêtre n'est pas encore présentée."
                    else "Les glyphes SystemUI n'ont pas l'apparence attendue : $systemBars"
            } finally {
                if (!retained) screen.recycle()
            }
        } finally {
            windowBitmap.recycle()
        }
        check(SystemClock.uptimeMillis() < deadline) {
            "L'écran présenté n'est pas prêt après 15 secondes. $lastMismatch"
        }
        // La prochaine tentative attend une nouvelle frame réelle, sans pause arbitraire.
    }
}

private fun inspectSystemBarRegion(window: Bitmap, screen: Bitmap, region: Rect, darkIcons: Boolean): SystemBarRegionEvidence {
    check(Rect(0, 0, screen.width, screen.height).contains(region) && region.width() > 0 && region.height() > 0)
    val background = window.getPixel(region.left, region.top)
    val windowPixels = IntArray(region.width() * region.height())
    val screenPixels = IntArray(windowPixels.size)
    window.getPixels(windowPixels, 0, region.width(), region.left, region.top, region.width(), region.height())
    screen.getPixels(screenPixels, 0, region.width(), region.left, region.top, region.width(), region.height())
    val backgroundLuminance = ColorUtils.calculateLuminance(background)
    val contrastingPixels = screenPixels.asIterable().groupingBy { it }.eachCount().entries.sumOf { (color, count) ->
        val luminance = ColorUtils.calculateLuminance(color)
        val expectedDirection = if (darkIcons) luminance < backgroundLuminance else luminance > backgroundLuminance
        if (expectedDirection && ColorUtils.calculateContrast(color, background) >= 4.5) count else 0
    }
    return SystemBarRegionEvidence(region, background, windowPixels.all { it == background },
        screenPixels.count { it == background }, contrastingPixels, screenPixels.size)
}

private fun awaitWithinDeadline(latch: CountDownLatch, deadline: Long): Boolean {
    val remaining = deadline - SystemClock.uptimeMillis()
    return remaining > 0 && latch.await(remaining.coerceAtMost(5_000), TimeUnit.MILLISECONDS)
}

private fun samePixels(window: Bitmap, viewport: Rect, screen: Bitmap, screenViewport: Rect): Boolean {
    if (!Rect(0, 0, screen.width, screen.height).contains(screenViewport)) return false
    val windowPixels = IntArray(viewport.width() * viewport.height())
    val screenPixels = IntArray(windowPixels.size)
    window.getPixels(windowPixels, 0, viewport.width(), viewport.left, viewport.top, viewport.width(), viewport.height())
    screen.getPixels(screenPixels, 0, viewport.width(), screenViewport.left, screenViewport.top, viewport.width(), viewport.height())
    return windowPixels.contentEquals(screenPixels)
}
