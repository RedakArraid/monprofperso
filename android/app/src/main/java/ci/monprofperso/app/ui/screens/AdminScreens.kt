package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.data.Api
import ci.monprofperso.app.data.LevelDto
import ci.monprofperso.app.data.ResourceDto
import ci.monprofperso.app.data.SubjectDto
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted
import kotlinx.coroutines.launch

/* ====================================================================== *
 * ÉCRAN ADMIN — GÉRER LE CATALOGUE (matières & niveaux)
 * Réservé au rôle admin ; les écritures appellent les routes /api/admin/… en live.
 * ====================================================================== */
private fun slugify(input: String): String {
    val n = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD).replace(Regex("\\p{Mn}+"), "")
    return n.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
}

@Composable
fun AdminCatalogScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var subjects by remember { mutableStateOf(listOf<SubjectDto>()) }
    var levels by remember { mutableStateOf(listOf<LevelDto>()) }
    var newSubject by remember { mutableStateOf("") }
    var newSubjectAccent by remember { mutableStateOf("green") }
    var newLevel by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }

    suspend fun reload() {
        runCatching { Api.service.subjects() }.onSuccess { subjects = it }
        runCatching { Api.service.levels() }.onSuccess { levels = it }
    }
    LaunchedEffect(Unit) { reload() }

    AkScreen(applyBottomInset = false) {
        TopBar("Gérer le catalogue", subtitle = "Espace administrateur", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 8.dp)) {

            // ---------------------------------------------------------- Matières
            SectionTitle("Matières", "${subjects.size}")
            Spacer(Modifier.height(10.dp))
            AdminField(value = newSubject, onValueChange = { newSubject = it }, placeholder = "Ex. Musique, Espagnol…")
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Couleur", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
                Spacer(Modifier.width(10.dp))
                AccentDot("green", newSubjectAccent == "green") { newSubjectAccent = "green" }
                Spacer(Modifier.width(8.dp))
                AccentDot("orange", newSubjectAccent == "orange") { newSubjectAccent = "orange" }
                Spacer(Modifier.weight(1f))
                AddButton(enabled = newSubject.isNotBlank()) {
                    val slug = slugify(newSubject)
                    if (slug.isBlank()) return@AddButton
                    scope.launch {
                        runCatching {
                            Api.service.createSubject(mapOf("slug" to slug, "name" to newSubject.trim(),
                                "accent" to newSubjectAccent, "icon" to "more"))
                        }.onSuccess { newSubject = ""; message = "Matière ajoutée"; reload() }
                            .onFailure { message = "Échec : matière déjà existante ?" }
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            subjects.forEach { s ->
                CatalogRow(s.name, s.slug, s.accent) {
                    scope.launch { runCatching { Api.service.deleteSubject(s.slug) }.onSuccess { message = "Matière supprimée"; reload() } }
                }
            }

            Spacer(Modifier.height(22.dp))

            // ---------------------------------------------------------- Niveaux
            SectionTitle("Niveaux", "${levels.size}")
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                AdminField(value = newLevel, onValueChange = { newLevel = it }, placeholder = "Ex. Université, Master…",
                    modifier = Modifier.weight(1f))
                Spacer(Modifier.width(10.dp))
                AddButton(enabled = newLevel.isNotBlank()) {
                    val slug = slugify(newLevel)
                    if (slug.isBlank()) return@AddButton
                    scope.launch {
                        runCatching {
                            Api.service.createLevel(mapOf("slug" to slug, "name" to newLevel.trim(), "ord" to levels.size + 1))
                        }.onSuccess { newLevel = ""; message = "Niveau ajouté"; reload() }
                            .onFailure { message = "Échec : niveau déjà existant ?" }
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            levels.forEach { l ->
                CatalogRow(l.name, l.slug, "green") {
                    scope.launch { runCatching { Api.service.deleteLevel(l.slug) }.onSuccess { message = "Niveau supprimé"; reload() } }
                }
            }

            message?.let {
                Spacer(Modifier.height(16.dp))
                Text(it, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, color = AkColors.Green)
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun SectionTitle(title: String, count: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = AkColors.Ink)
        Spacer(Modifier.width(8.dp))
        Text(count, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = AkColors.Green,
            modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(AkColors.GreenSoft).padding(horizontal = 8.dp, vertical = 3.dp))
    }
}

@Composable
private fun AdminField(value: String, onValueChange: (String) -> Unit, placeholder: String, modifier: Modifier = Modifier, singleLine: Boolean = true) {
    OutlinedTextField(
        value = value, onValueChange = onValueChange, modifier = modifier.fillMaxWidth(),
        placeholder = { Text(placeholder, fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Faint) },
        singleLine = singleLine,
        minLines = if (singleLine) 1 else 3,
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = AkColors.Green, unfocusedBorderColor = AkColors.Border,
            focusedContainerColor = AkColors.White, unfocusedContainerColor = AkColors.White,
            cursorColor = AkColors.Green,
        ),
    )
}

@Composable
private fun AccentDot(accent: String, selected: Boolean, onClick: () -> Unit) {
    val c = if (accent == "orange") AkColors.Orange else AkColors.Green
    Box(
        Modifier.size(26.dp).clip(RoundedCornerShape(8.dp)).background(c)
            .then(if (selected) Modifier.border(2.dp, AkColors.Ink, RoundedCornerShape(8.dp)) else Modifier)
            .clickable { onClick() }
    )
}

@Composable
private fun AddButton(enabled: Boolean, onClick: () -> Unit) {
    val bg = if (enabled) AkColors.Green else AkColors.Border
    Row(
        Modifier.clip(RoundedCornerShape(12.dp)).background(bg).clickable(enabled = enabled) { onClick() }
            .padding(horizontal = 16.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.Add, null, tint = AkColors.White, modifier = Modifier.size(17.dp))
        Text(" Ajouter", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.White)
    }
}

/* ====================================================================== *
 * ÉCRAN ADMIN — RESSOURCES PÉDAGOGIQUES (cours / devoirs / exercices)
 * Création de métadonnées (titre, matière, niveau, description) ; le fichier
 * reste optionnel côté API. Écritures en live sur /api/admin/resources.
 * ====================================================================== */
private val RESOURCE_TYPES = listOf("course" to "Cours", "homework" to "Devoir", "exercise" to "Exercice")

private fun typeLabel(type: String): String = RESOURCE_TYPES.firstOrNull { it.first == type }?.second ?: type

@Composable
fun AdminResourcesScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var subjects by remember { mutableStateOf(listOf<SubjectDto>()) }
    var levels by remember { mutableStateOf(listOf<LevelDto>()) }
    var resources by remember { mutableStateOf(listOf<ResourceDto>()) }
    var type by remember { mutableStateOf("course") }
    var title by remember { mutableStateOf("") }
    var subjectSlug by remember { mutableStateOf<String?>(null) }
    var level by remember { mutableStateOf<String?>(null) }
    var description by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }

    suspend fun reload() {
        runCatching { Api.service.subjects() }.onSuccess { subjects = it }
        runCatching { Api.service.levels() }.onSuccess { levels = it }
        runCatching { Api.service.resources() }.onSuccess { resources = it }
    }
    LaunchedEffect(Unit) { reload() }

    AkScreen(applyBottomInset = false) {
        TopBar("Ressources pédagogiques", subtitle = "Espace administrateur", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 8.dp)) {

            Text("Type", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
            Spacer(Modifier.height(8.dp))
            Row(Modifier.horizontalScroll(rememberScrollState())) {
                RESOURCE_TYPES.forEach { (value, label) ->
                    PickChip(label, value == type) { type = value }
                    Spacer(Modifier.width(8.dp))
                }
            }
            Spacer(Modifier.height(14.dp))

            Text("Titre", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
            Spacer(Modifier.height(8.dp))
            AdminField(value = title, onValueChange = { title = it }, placeholder = "Ex. Fiche de révision — Théorème de Thalès")
            Spacer(Modifier.height(14.dp))

            Text("Matière (facultatif)", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
            Spacer(Modifier.height(8.dp))
            Row(Modifier.horizontalScroll(rememberScrollState())) {
                PickChip("Aucune", subjectSlug == null) { subjectSlug = null }
                Spacer(Modifier.width(8.dp))
                subjects.forEach { s ->
                    PickChip(s.name, subjectSlug == s.slug) { subjectSlug = s.slug }
                    Spacer(Modifier.width(8.dp))
                }
            }
            Spacer(Modifier.height(14.dp))

            Text("Niveau (facultatif)", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
            Spacer(Modifier.height(8.dp))
            Row(Modifier.horizontalScroll(rememberScrollState())) {
                PickChip("Aucun", level == null) { level = null }
                Spacer(Modifier.width(8.dp))
                levels.forEach { l ->
                    PickChip(l.name, level == l.slug) { level = l.slug }
                    Spacer(Modifier.width(8.dp))
                }
            }
            Spacer(Modifier.height(14.dp))

            Text("Description (facultatif)", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
            Spacer(Modifier.height(8.dp))
            AdminField(value = description, onValueChange = { description = it }, placeholder = "Quelques mots sur la ressource…",
                singleLine = false)
            Spacer(Modifier.height(14.dp))

            AddButton(enabled = title.isNotBlank()) {
                scope.launch {
                    runCatching {
                        Api.service.createResource(buildMap {
                            put("type", type); put("title", title.trim())
                            subjectSlug?.let { put("subjectSlug", it) }
                            level?.let { put("level", it) }
                            if (description.isNotBlank()) put("description", description.trim())
                        })
                    }.onSuccess {
                        title = ""; description = ""; subjectSlug = null; level = null
                        message = "Ressource ajoutée"; reload()
                    }.onFailure { message = "Échec de l'ajout" }
                }
            }

            Spacer(Modifier.height(22.dp))
            SectionTitle("Ressources", "${resources.size}")
            Spacer(Modifier.height(12.dp))
            if (resources.isEmpty()) {
                Text("Aucune ressource pour l'instant.", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Faint)
            }
            resources.forEach { r -> ResourceRow(r) {
                scope.launch { runCatching { Api.service.deleteResource(r.id) }.onSuccess { message = "Ressource supprimée"; reload() } }
            } }

            message?.let {
                Spacer(Modifier.height(16.dp))
                Text(it, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, color = AkColors.Green)
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun PickChip(label: String, selected: Boolean, onClick: () -> Unit) {
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
private fun ResourceRow(r: ResourceDto, onDelete: () -> Unit) {
    val accent = if (r.type == "homework") AkColors.Orange else AkColors.Green
    val soft = if (r.type == "homework") AkColors.OrangeSoft else AkColors.GreenSoft
    Row(
        Modifier.fillMaxWidth().padding(bottom = 9.dp).clip(RoundedCornerShape(14.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(typeLabel(r.type), fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 10.5.sp, color = accent,
                    modifier = Modifier.clip(RoundedCornerShape(7.dp)).background(soft).padding(horizontal = 7.dp, vertical = 2.dp))
                val tags = listOfNotNull(r.subjectSlug, r.level).joinToString(" · ")
                if (tags.isNotEmpty()) {
                    Spacer(Modifier.width(8.dp))
                    Text(tags, fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Faint)
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(r.title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            r.description?.takeIf { it.isNotBlank() }?.let {
                Text(it, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 2.dp))
            }
        }
        Spacer(Modifier.width(10.dp))
        Box(
            Modifier.size(30.dp).clip(RoundedCornerShape(9.dp)).background(AkColors.OrangeSoft).clickable { onDelete() },
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Filled.Close, "Supprimer", tint = AkColors.Orange, modifier = Modifier.size(16.dp)) }
    }
}

@Composable
private fun CatalogRow(name: String, slug: String, accent: String, onDelete: () -> Unit) {
    val dot = if (accent == "orange") AkColors.Orange else AkColors.Green
    Row(
        Modifier.fillMaxWidth().padding(bottom = 9.dp).clip(RoundedCornerShape(14.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(10.dp).clip(RoundedCornerShape(3.dp)).background(dot))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(name, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            Text(slug, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Faint)
        }
        Box(
            Modifier.size(30.dp).clip(RoundedCornerShape(9.dp)).background(AkColors.OrangeSoft).clickable { onDelete() },
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Filled.Close, "Supprimer", tint = AkColors.Orange, modifier = Modifier.size(16.dp)) }
    }
}
