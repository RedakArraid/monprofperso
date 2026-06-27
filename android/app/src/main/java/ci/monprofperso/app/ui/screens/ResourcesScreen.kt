package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.data.Api
import ci.monprofperso.app.data.ResourceDto
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ====================================================================== *
 * ÉCRAN UTILISATEUR — RESSOURCES & SUPPORTS (lecture seule)
 * Consomme /api/resources en live ; repli sur quelques exemples hors-ligne.
 * Les ressources sont publiées par l'admin (cours / devoirs / exercices).
 * ====================================================================== */
private val resourceFilters = listOf(null to "Tout", "course" to "Cours", "homework" to "Devoirs", "exercise" to "Exercices")

private fun resTypeLabel(type: String): String = when (type) {
    "course" -> "Cours"; "homework" -> "Devoir"; "exercise" -> "Exercice"; else -> type
}

private fun resTypeIcon(type: String): ImageVector = when (type) {
    "homework" -> Icons.Filled.Edit
    "exercise" -> Icons.Filled.Description
    else -> Icons.Filled.School
}

private val fallbackResources = listOf(
    ResourceDto(1, "course", "maths", "3eme", "Fiche — Théorème de Thalès", "Rappels de cours et exemples corrigés.", null, null, null, null),
    ResourceDto(2, "exercise", "physique", "2nde", "Série d'exercices — Optique", "10 exercices progressifs avec corrigés.", null, null, null, null),
    ResourceDto(3, "homework", "francais", "1ere", "Devoir — Commentaire de texte", "Sujet type BAC à rendre.", null, null, null, null),
)

@Composable
fun ResourcesScreen(nav: NavActions) {
    var all by remember { mutableStateOf<List<ResourceDto>?>(null) }
    var filter by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        all = runCatching { Api.service.resources() }.getOrNull()?.ifEmpty { fallbackResources } ?: fallbackResources
    }

    val items = (all ?: emptyList()).filter { filter == null || it.type == filter }

    AkScreen(applyBottomInset = false) {
        TopBar("Ressources & supports", subtitle = "Cours, devoirs & exercices", onBack = { nav.back() })
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 22.dp, vertical = 4.dp)) {
            resourceFilters.forEach { (value, label) ->
                FilterChip(label, filter == value) { filter = value }
                Spacer(Modifier.width(8.dp))
            }
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 8.dp)) {
            if (all == null) {
                Text("Chargement…", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Faint)
            } else if (items.isEmpty()) {
                Text("Aucune ressource disponible pour ce filtre.", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Faint)
            }
            items.forEach { r -> ResourceCard(r, nav) }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun FilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val bg = if (selected) AkColors.Green else AkColors.White
    val fg = if (selected) AkColors.White else AkColors.InkSoft
    Text(
        label, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = fg,
        modifier = Modifier.clip(RoundedCornerShape(11.dp)).background(bg)
            .then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(11.dp)))
            .clickable { onClick() }.padding(horizontal = 14.dp, vertical = 9.dp),
    )
}

@Composable
private fun ResourceCard(r: ResourceDto, nav: NavActions) {
    val accent = if (r.type == "homework") AkColors.Orange else AkColors.Green
    val soft = if (r.type == "homework") AkColors.OrangeSoft else AkColors.GreenSoft
    val context = LocalContext.current
    val hasFile = !r.fileName.isNullOrBlank()
    val isPdf = r.mimeType == "application/pdf" || r.fileName?.endsWith(".pdf", ignoreCase = true) == true
    val open = {
        val url = ci.monprofperso.app.data.ApiConfig.BASE_URL + "api/files/${r.id}"
        // Les PDF s'ouvrent dans le visualiseur in-app ; les autres types en externe.
        if (isPdf) nav.openPdf(url, r.title)
        else runCatching {
            context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)))
        }
    }
    Row(
        Modifier.fillMaxWidth().padding(bottom = 10.dp).clip(RoundedCornerShape(16.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(16.dp))
            .then(if (hasFile) Modifier.clickable { open() } else Modifier).padding(14.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(soft),
            contentAlignment = Alignment.Center,
        ) { Icon(resTypeIcon(r.type), null, tint = accent, modifier = Modifier.size(20.dp)) }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(resTypeLabel(r.type), fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 10.5.sp, color = accent,
                    modifier = Modifier.clip(RoundedCornerShape(7.dp)).background(soft).padding(horizontal = 7.dp, vertical = 2.dp))
                val tags = listOfNotNull(r.subjectSlug, r.level).joinToString(" · ")
                if (tags.isNotEmpty()) {
                    Spacer(Modifier.width(8.dp))
                    Text(tags, fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Faint)
                }
            }
            Spacer(Modifier.height(5.dp))
            Text(r.title, fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            r.description?.takeIf { it.isNotBlank() }?.let {
                Spacer(Modifier.height(3.dp))
                Text(it, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
            }
            r.fileName?.takeIf { it.isNotBlank() }?.let {
                Spacer(Modifier.height(7.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.AttachFile, null, tint = AkColors.Green, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(it, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, color = AkColors.Green)
                }
            }
        }
    }
}
