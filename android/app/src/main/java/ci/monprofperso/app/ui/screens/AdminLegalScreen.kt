package ci.monprofperso.app.ui.screens

import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.data.Api
import ci.monprofperso.app.data.LegalDocDto
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted
import kotlinx.coroutines.launch

/* ====================================================================== *
 * ÉCRAN ADMIN — DOCUMENTS LÉGAUX (CGU, confidentialité, mentions légales)
 * L'admin téléverse/remplace le PDF de chaque document (PUT /admin/legal/:slug).
 * Réutilise le sélecteur de fichier SAF. Conformité Loi CI N°2013-450.
 * ====================================================================== */
@Composable
fun AdminLegalScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var docs by remember { mutableStateOf<List<LegalDocDto>?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var targetSlug by remember { mutableStateOf<String?>(null) }

    suspend fun reload() { docs = runCatching { Api.service.legalDocs() }.getOrNull() }
    LaunchedEffect(Unit) { reload() }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        val slug = targetSlug
        if (uri != null && slug != null) {
            val resolver = context.contentResolver
            val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
            if (bytes != null) {
                var name = "document.pdf"
                resolver.query(uri, null, null, null, null)?.use { c ->
                    val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0 && c.moveToFirst()) c.getString(idx)?.let { name = it }
                }
                val b64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                val mime = resolver.getType(uri) ?: "application/pdf"
                scope.launch {
                    runCatching {
                        Api.service.uploadLegalDoc(slug, buildMap {
                            put("contentBase64", b64); put("fileName", name); put("mimeType", mime)
                        })
                    }.onSuccess { message = "Document mis à jour"; reload() }
                        .onFailure { message = "Échec de l'envoi" }
                }
            }
        }
    }

    AkScreen(applyBottomInset = false) {
        TopBar("Documents légaux", subtitle = "Espace administrateur", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 8.dp)) {
            Text("Téléversez le PDF de chaque document pour le mettre à jour. Les utilisateurs y accèdent depuis « Mon compte ».",
                fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, lineHeight = 17.sp)
            Spacer(Modifier.height(16.dp))
            if (docs == null) LoadingRow()
            (docs ?: emptyList()).forEach { d ->
                LegalDocRow(d) { targetSlug = d.slug; picker.launch(arrayOf("application/pdf")) }
            }
            message?.let {
                Spacer(Modifier.height(14.dp))
                Text(it, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, color = AkColors.Green)
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun LegalDocRow(d: LegalDocDto, onPick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().padding(bottom = 11.dp).clip(RoundedCornerShape(16.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.GreenSoft), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.Description, null, tint = AkColors.Green, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(d.title, fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
                val sub = buildString {
                    d.version?.let { append("v$it") }
                    if (d.hasFile) { if (isNotEmpty()) append(" · "); append(d.fileName ?: "PDF en ligne") }
                    else { if (isNotEmpty()) append(" · "); append("aucun PDF") }
                }
                Text(sub, fontFamily = Hanken, fontSize = 11.5.sp, color = if (d.hasFile) AkColors.Muted else AkColors.Orange)
            }
            if (d.hasFile) Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Green, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.height(11.dp))
        Row(
            Modifier.clip(RoundedCornerShape(12.dp)).background(AkColors.GreenSoft).clickable { onPick() }
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.AttachFile, null, tint = AkColors.Green, modifier = Modifier.size(15.dp))
            Text(if (d.hasFile) "  Remplacer le PDF" else "  Téléverser un PDF", fontFamily = Hanken,
                fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = AkColors.Green)
        }
    }
}
