package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.data.Api
import ci.monprofperso.app.data.ApiConfig
import ci.monprofperso.app.data.LegalDocDto
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ====================================================================== *
 * ÉCRAN UTILISATEUR, DOCUMENTS LÉGAUX (lecture)
 * Liste les CGU / confidentialité / mentions ; ouvre le PDF via /legal/:slug/file.
 * ====================================================================== */
@Composable
fun LegalScreen(nav: NavActions) {
    var docs by remember { mutableStateOf<List<LegalDocDto>?>(null) }
    LaunchedEffect(Unit) { docs = runCatching { Api.service.legalDocs() }.getOrNull() }

    AkScreen(applyBottomInset = false) {
        TopBar("Documents légaux", subtitle = "CGU, confidentialité & mentions", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 12.dp)) {
            if (docs == null) LoadingRow()
            (docs ?: emptyList()).forEach { d ->
                LegalLinkRow(d) {
                    if (d.hasFile) nav.openPdf(ApiConfig.BASE_URL + "api/legal/${d.slug}/file", d.title)
                }
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun LegalLinkRow(d: LegalDocDto, onOpen: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(bottom = 10.dp).clip(RoundedCornerShape(16.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).clickable { onOpen() }.padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.GreenSoft), contentAlignment = Alignment.Center) {
            Icon(Icons.Filled.Description, null, tint = AkColors.Green, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(d.title, fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            Text(
                if (d.hasFile) "Disponible${d.version?.let { " · v$it" } ?: ""}" else "Bientôt disponible",
                fontFamily = Hanken, fontSize = 11.5.sp, color = if (d.hasFile) AkColors.Muted else AkColors.Faint,
            )
        }
        if (d.hasFile) Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = AkColors.Faint, modifier = Modifier.size(20.dp))
    }
}
