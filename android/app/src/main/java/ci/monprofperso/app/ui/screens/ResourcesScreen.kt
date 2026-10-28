package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.data.Api
import ci.monprofperso.app.data.Auth
import ci.monprofperso.app.data.ResourceDto
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted
import kotlinx.coroutines.CancellationException

/* ====================================================================== *
 * ÉCRAN UTILISATEUR, RESSOURCES & SUPPORTS (lecture seule)
 * Consomme /api/resources en live, sans contenu de remplacement.
 * Filtrage par type (cours/devoir/exercice) et par programme scolaire.
 * ====================================================================== */
private val resourceFilters = listOf(null to "Tout", "course" to "Cours", "homework" to "Devoirs", "exercise" to "Exercices")
private val programFilters = listOf(null to "Tout", "standard" to "Standard", "francais" to "Français", "other" to "Autre")

private fun resTypeLabel(type: String): String = when (type) {
    "course" -> "Cours"; "homework" -> "Devoir"; "exercise" -> "Exercice"; else -> type
}

private fun resTypeIcon(type: String): ImageVector = when (type) {
    "homework" -> Icons.Filled.Edit
    "exercise" -> Icons.Filled.Description
    else -> Icons.Filled.School
}

private fun matchesProgram(r: ResourceDto, filter: String?): Boolean {
    if (filter == null) return true
    val p = r.program ?: "standard"
    if (filter == "other") return p !in setOf("standard", "francais")
    return p == filter
}

@Composable
fun ResourcesScreen(nav: NavActions) {
    var all by remember { mutableStateOf<List<ResourceDto>?>(null) }
    var typeFilter by remember { mutableStateOf<String?>(null) }
    var programFilter by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }

    LaunchedEffect(typeFilter, programFilter, reload) {
        all = null
        error = null
        try {
            all = Api.service.resources(type = typeFilter, program = programFilter)
        } catch (failure: CancellationException) {
            throw failure
        } catch (failure: Exception) {
            error = Auth.errorMessage(failure)
        }
    }

    val items = (all ?: emptyList()).filter { r ->
        (typeFilter == null || r.type == typeFilter) && matchesProgram(r, programFilter)
    }

    AkScreen {
        TopBar("Ressources & supports", subtitle = "Cours, devoirs & exercices", onBack = { nav.back() })
        Row(Modifier.horizontalScroll(rememberScrollState()).selectableGroup().padding(horizontal = 22.dp, vertical = 4.dp)) {
            resourceFilters.forEach { (value, label) ->
                ResourceFilterChip("Type de ressource", label, typeFilter == value) { typeFilter = value }
                Spacer(Modifier.width(8.dp))
            }
        }
        Row(Modifier.horizontalScroll(rememberScrollState()).selectableGroup().padding(horizontal = 22.dp, vertical = 4.dp)) {
            programFilters.forEach { (value, label) ->
                ResourceFilterChip("Programme", label, programFilter == value) { programFilter = value }
                Spacer(Modifier.width(8.dp))
            }
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 8.dp)) {
            if (error != null) {
                FeedbackMessage(requireNotNull(error))
                Spacer(Modifier.height(8.dp))
                OfflineBanner(onRetry = { reload++ })
            } else if (all == null) {
                LoadingRow()
            } else if (items.isEmpty()) {
                EmptyContent("Aucune ressource disponible", "Aucune ressource ne correspond aux filtres sélectionnés.")
            } else {
                items.forEach { r -> ResourceCard(r, nav) }
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun ResourceFilterChip(group: String, label: String, selected: Boolean, onClick: () -> Unit) {
    val bg = if (selected) AkColors.Green else AkColors.White
    val fg = if (selected) AkColors.White else AkColors.InkSoft
    Box(
        modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp).clip(RoundedCornerShape(11.dp)).background(bg)
            .then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(11.dp)))
            .selectable(selected = selected, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = "$group : $label" }
            .padding(horizontal = 14.dp, vertical = 9.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = fg)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ResourceCard(r: ResourceDto, nav: NavActions) {
    val accent = if (r.type == "homework") AkColors.OrangeStrong else AkColors.Green
    val soft = if (r.type == "homework") AkColors.OrangeSoft else AkColors.GreenSoft
    val context = LocalContext.current
    val hasFile = !r.fileName.isNullOrBlank()
    val isPdf = r.mimeType == "application/pdf" || r.fileName?.endsWith(".pdf", ignoreCase = true) == true
    val progLabel = programLabel(r.program ?: "standard")
    val open = {
        val url = ci.monprofperso.app.data.ApiConfig.BASE_URL + "api/files/${r.id}"
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
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(resTypeLabel(r.type), fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 10.5.sp, color = accent,
                    modifier = Modifier.clip(RoundedCornerShape(7.dp)).background(soft).padding(horizontal = 7.dp, vertical = 2.dp))
                Text(progLabel, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 10.5.sp, color = AkColors.Green,
                    modifier = Modifier.clip(RoundedCornerShape(7.dp)).background(AkColors.GreenSoft).padding(horizontal = 7.dp, vertical = 2.dp))
                val tags = listOfNotNull(r.subjectSlug, r.level).joinToString(" · ")
                if (tags.isNotEmpty()) {
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
