package ci.monprofperso.app.ui.screens

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.data.AppState
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.URL

/* ====================================================================== *
 * VISUALISEUR PDF IN-APP (sans dépendance — android.graphics.pdf.PdfRenderer)
 * Télécharge le PDF (endpoint public), le rend page par page en images.
 * Repli « ouvrir dans le navigateur » si le rendu échoue.
 * ====================================================================== */
@Composable
fun PdfViewerScreen(nav: NavActions) {
    val url = AppState.pdfUrl
    val title = AppState.pdfTitle
    val context = LocalContext.current
    var pages by remember { mutableStateOf<List<Bitmap>?>(null) }
    var failed by remember { mutableStateOf(false) }

    LaunchedEffect(url) {
        runCatching { withContext(Dispatchers.IO) { renderPdf(context.cacheDir, url) } }
            .onSuccess { pages = it }
            .onFailure { failed = true }
    }

    AkScreen(applyBottomInset = false) {
        TopBar(title, subtitle = "Aperçu du document", onBack = { nav.back() })
        when {
            failed -> Column(Modifier.weight(1f).fillMaxWidth().padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Spacer(Modifier.height(40.dp))
                Text("Impossible d'afficher ce document.", fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Ink)
                Spacer(Modifier.height(12.dp))
                Text("Ouvrir dans le navigateur", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp,
                    color = AkColors.White,
                    modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(AkColors.Green)
                        .clickable {
                            runCatching {
                                context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)))
                            }
                        }.padding(horizontal = 18.dp, vertical = 12.dp))
            }
            pages == null -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) { LoadingRow() }
            else -> LazyColumn(
                Modifier.weight(1f).fillMaxWidth().background(AkColors.Cream).padding(horizontal = 14.dp),
                contentPadding = PaddingValues(vertical = 14.dp),
            ) {
                items(pages!!) { bmp ->
                    Image(
                        bmp.asImageBitmap(), contentDescription = null, contentScale = ContentScale.FillWidth,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                            .clip(RoundedCornerShape(8.dp)).background(AkColors.White),
                    )
                }
            }
        }
    }
}

/** Télécharge et rend chaque page du PDF en Bitmap (sur un thread IO). */
private fun renderPdf(cacheDir: File, url: String): List<Bitmap> {
    val bytes = URL(url).openStream().use { it.readBytes() }
    val file = File(cacheDir, "view_${System.currentTimeMillis()}.pdf").apply { writeBytes(bytes) }
    val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    val renderer = PdfRenderer(pfd)
    val out = ArrayList<Bitmap>(renderer.pageCount)
    val scale = 2
    for (i in 0 until renderer.pageCount) {
        val page = renderer.openPage(i)
        val bmp = Bitmap.createBitmap(page.width * scale, page.height * scale, Bitmap.Config.ARGB_8888)
        bmp.eraseColor(Color.WHITE)
        page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
        page.close()
        out.add(bmp)
    }
    renderer.close(); pfd.close(); file.delete()
    return out
}
