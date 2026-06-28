package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import kotlinx.coroutines.launch
import android.provider.OpenableColumns
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.runtime.LaunchedEffect
import ci.monprofperso.app.data.Api
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ====================================================================== *
 * ÉCRAN 29, DEVENIR PROFESSEUR (candidature live → /api/teacher-applications)
 * ====================================================================== */
private data class DocPick(val name: String, val mime: String, val b64: String)

private val APP_LOCATIONS = listOf(
    "Cocody", "Plateau", "Yopougon", "Marcory", "Treichville", "Abobo", "Adjamé",
    "Koumassi", "Port-Bouët", "Bingerville", "Anyama", "Autre (Abidjan)",
)
private val APP_EXPERIENCES = listOf("Débutant", "1 à 3 ans", "3 à 5 ans", "5 à 10 ans", "10 ans et +", "Enseignant certifié")
private val APP_PRICES = listOf(2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000)
private val FB_SUBJECTS = listOf("Maths", "Physique", "Français", "Anglais", "SVT", "Philo", "Hist-Géo")
private val FB_LEVELS = listOf("Primaire", "Collège", "Lycée", "Supérieur", "Université")
private val FB_PROGRAMS = listOf("standard" to "Programme standard", "francais" to "Programme français")

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BecomeTeacherScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var step by remember { mutableIntStateOf(0) }
    var fullName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("Cocody") }
    var price by remember { mutableIntStateOf(4000) }
    var experience by remember { mutableStateOf("3 à 5 ans") }
    var bio by remember { mutableStateOf("") }
    var consent by remember { mutableStateOf(false) }
    var fmtHome by remember { mutableStateOf(true) }
    var fmtOnline by remember { mutableStateOf(true) }
    var negotiable by remember { mutableStateOf(false) }
    var subjectNames by remember { mutableStateOf(FB_SUBJECTS) }
    var levelNames by remember { mutableStateOf(FB_LEVELS) }
    var programItems by remember { mutableStateOf(FB_PROGRAMS) }
    var selectedSubjects by remember { mutableStateOf(setOf<String>()) }
    var selectedLevels by remember { mutableStateOf(setOf("Collège", "Lycée")) }
    var selectedPrograms by remember { mutableStateOf(setOf("standard")) }
    var locOpen by remember { mutableStateOf(false) }
    var expOpen by remember { mutableStateOf(false) }
    var priceOpen by remember { mutableStateOf(false) }
    var idCard by remember { mutableStateOf<DocPick?>(null) }
    var diploma by remember { mutableStateOf<DocPick?>(null) }
    var photo by remember { mutableStateOf<DocPick?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    var done by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var pickKind by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        runCatching { Api.service.subjects() }.getOrNull()?.map { it.name }?.takeIf { it.isNotEmpty() }?.let { subjectNames = it }
        runCatching { Api.service.levels() }.getOrNull()?.map { it.name }?.takeIf { it.isNotEmpty() }?.let { levelNames = it }
        runCatching { Api.service.programs() }.getOrNull()?.map { it.slug to it.name }?.takeIf { it.isNotEmpty() }?.let { programItems = it }
    }

    fun readUri(uri: android.net.Uri): DocPick? {
        val resolver = context.contentResolver
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
        var name = "fichier"
        resolver.query(uri, null, null, null, null)?.use { c ->
            val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && c.moveToFirst()) c.getString(idx)?.let { name = it }
        }
        val mime = resolver.getType(uri) ?: "application/octet-stream"
        val b64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
        return DocPick(name, mime, b64)
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        readUri(uri)?.let { doc ->
            when (pickKind) {
                "id" -> idCard = doc
                "dip" -> diploma = doc
                "photo" -> photo = doc
            }
        }
    }

    suspend fun submit() {
        loading = true
        err = null
        val formats = buildList {
            if (fmtHome) add("home")
            if (fmtOnline) add("online")
        }
        runCatching {
            Api.service.submitTeacherApplication(buildMap {
                put("fullName", fullName.trim())
                put("phone", phone.trim())
                if (email.isNotBlank()) put("email", email.trim())
                put("subjects", selectedSubjects.joinToString(" · "))
                put("location", location)
                put("pricePerHour", price)
                put("bio", bio.trim())
                put("experience", experience)
                put("levels", selectedLevels.toList())
                put("formats", formats.ifEmpty { listOf("home", "online") })
                put("programs", selectedPrograms.toList())
                put("negotiable", negotiable)
                put("consent", true)
                idCard?.let {
                    put("idCardBase64", it.b64); put("idCardFileName", it.name); put("idCardMimeType", it.mime)
                }
                diploma?.let {
                    put("diplomaBase64", it.b64); put("diplomaFileName", it.name); put("diplomaMimeType", it.mime)
                }
                photo?.let {
                    put("photoBase64", it.b64); put("photoFileName", it.name); put("photoMimeType", it.mime)
                }
            })
        }.onSuccess { done = true }
            .onFailure { err = it.message ?: "Envoi impossible" }
        loading = false
    }

    AkScreen {
        TopBar("Devenir professeur", onBack = { if (!done) nav.back() })
        if (done) {
            Column(Modifier.weight(1f).padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Icon(Icons.Filled.VerifiedUser, null, tint = AkColors.Green, modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(16.dp))
                Text("Candidature envoyée", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = AkColors.Ink)
                Text("Vérification sous 24 à 48 h. Vous serez contacté sur votre numéro.",
                    fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 10.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                Spacer(Modifier.height(24.dp))
                PrimaryButton("Retour au compte", Modifier.fillMaxWidth(), trailingIcon = null) { nav.back() }
            }
        } else {
            Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 14.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    repeat(3) { i ->
                        Box(Modifier.weight(1f).height(5.dp).clip(RoundedCornerShape(3.dp))
                            .background(if (i <= step) AkColors.Green else Color(0xFFEAE5DC)))
                    }
                }
                Text("Étape ${step + 1} / 3 · ${when (step) { 0 -> "Votre profil"; 1 -> "Consentement"; else -> "Vos documents" }}",
                    fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 7.dp))
                when (step) {
                    0 -> {
                        Text("Parlez-nous de vous", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 14.dp))
                        Spacer(Modifier.height(12.dp))
                        FieldLabel("Nom complet"); AppField(fullName, { fullName = it }, "Koffi N'Guessan")
                        Spacer(Modifier.height(10.dp))
                        FieldLabel("Téléphone"); AppField(phone, { phone = it }, "+2250700000000")
                        Spacer(Modifier.height(10.dp))
                        FieldLabel("E-mail (optionnel)"); AppField(email, { email = it }, "prof@exemple.com")
                        Spacer(Modifier.height(14.dp))
                        FieldLabel("Matières enseignées")
                        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            subjectNames.forEach { name ->
                                SelectChip(name, selectedSubjects.contains(name)) {
                                    selectedSubjects = if (selectedSubjects.contains(name)) selectedSubjects - name else selectedSubjects + name
                                }
                            }
                        }
                        Spacer(Modifier.height(14.dp))
                        FieldLabel("Niveaux")
                        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            levelNames.forEach { name ->
                                SelectChip(name, selectedLevels.contains(name)) {
                                    selectedLevels = if (selectedLevels.contains(name)) selectedLevels - name else selectedLevels + name
                                }
                            }
                        }
                        Spacer(Modifier.height(14.dp))
                        FieldLabel("Programmes scolaires")
                        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            programItems.forEach { (slug, label) ->
                                SelectChip(label, selectedPrograms.contains(slug)) {
                                    selectedPrograms = if (selectedPrograms.contains(slug)) selectedPrograms - slug else selectedPrograms + slug
                                }
                            }
                        }
                        Spacer(Modifier.height(14.dp))
                        FieldLabel("Quartier / commune")
                        PickField(location, locOpen, { locOpen = it }, APP_LOCATIONS) { location = it; locOpen = false }
                        Spacer(Modifier.height(10.dp))
                        FieldLabel("Tarif horaire")
                        PickField("${price.formatFr()} F / h", priceOpen, { priceOpen = it }, APP_PRICES.map { "${it.formatFr()} F / h" }) { label ->
                            price = APP_PRICES.first { "${it.formatFr()} F / h" == label }
                            priceOpen = false
                        }
                        Spacer(Modifier.height(10.dp))
                        FieldLabel("Expérience")
                        PickField(experience, expOpen, { expOpen = it }, APP_EXPERIENCES) { experience = it; expOpen = false }
                        Spacer(Modifier.height(12.dp))
                        FieldLabel("Modalités")
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { fmtHome = !fmtHome }) {
                            Checkbox(checked = fmtHome, onCheckedChange = { fmtHome = it })
                            Text("Cours à domicile", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Ink)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { fmtOnline = !fmtOnline }) {
                            Checkbox(checked = fmtOnline, onCheckedChange = { fmtOnline = it })
                            Text("Cours en ligne", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Ink)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { negotiable = !negotiable }) {
                            Checkbox(checked = negotiable, onCheckedChange = { negotiable = it })
                            Text("Tarif négociable", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Ink)
                        }
                        Spacer(Modifier.height(10.dp))
                        FieldLabel("Présentation (optionnel)"); AppField(bio, { bio = it }, "Votre parcours…", singleLine = false)
                    }
                    1 -> {
                        Text("Confidentialité", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 14.dp))
                        Text("Pour rassurer les parents, chaque professeur est vérifié avant d'apparaître sur Mon Prof Perso.",
                            fontFamily = Hanken, fontSize = 13.sp, lineHeight = 19.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 6.dp))
                        Spacer(Modifier.height(16.dp))
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(AkColors.GreenSoft).padding(14.dp), verticalAlignment = Alignment.Top) {
                            Icon(Icons.Filled.VerifiedUser, null, tint = AkColors.Green, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(9.dp))
                            Text("Vos documents sont confidentiels et vérifiés sous 24 à 48 h.", fontFamily = Hanken, fontSize = 12.5.sp, lineHeight = 18.sp, color = Color(0xFF3F6B59))
                        }
                        Spacer(Modifier.height(14.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { consent = !consent }) {
                            Checkbox(checked = consent, onCheckedChange = { consent = it })
                            Text("J'accepte les CGU et la politique de confidentialité.", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Ink)
                        }
                    }
                    else -> {
                        Text("Vérifions votre profil", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 14.dp))
                        Spacer(Modifier.height(12.dp))
                        DocRow(Icons.Filled.Badge, "Pièce d'identité (CNI)", idCard?.name ?: "Obligatoire", done = idCard != null) { pickKind = "id"; picker.launch(arrayOf("image/*", "application/pdf")) }
                        Spacer(Modifier.height(10.dp))
                        DocRow(Icons.Filled.WorkspacePremium, "Diplôme / attestation", diploma?.name ?: "Obligatoire", done = diploma != null) { pickKind = "dip"; picker.launch(arrayOf("image/*", "application/pdf")) }
                        Spacer(Modifier.height(10.dp))
                        DocRow(Icons.Filled.PhotoCamera, "Photo de profil", photo?.name ?: "Obligatoire", done = photo != null) { pickKind = "photo"; picker.launch(arrayOf("image/*")) }
                    }
                }
                err?.let { Text(it, color = Color(0xFFE0392B), fontFamily = Hanken, fontSize = 13.sp, modifier = Modifier.padding(top = 12.dp)) }
                Spacer(Modifier.height(16.dp))
            }
            Row(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (step > 0) {
                    Row(
                        Modifier.weight(1f).clip(RoundedCornerShape(15.dp)).border(1.dp, AkColors.Border, RoundedCornerShape(15.dp))
                            .clickable { step-- }.padding(vertical = 16.dp),
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        Text("Retour", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.5.sp, color = AkColors.Ink)
                    }
                }
                PrimaryButton(
                    if (step < 2) "Suivant" else if (loading) "Envoi…" else "Envoyer ma candidature",
                    Modifier.weight(1f), trailingIcon = null,
                ) {
                    if (loading) return@PrimaryButton
                    err = null
                    when (step) {
                        0 -> {
                            when {
                                fullName.isBlank() || phone.isBlank() -> err = "Remplissez nom et téléphone."
                                selectedSubjects.isEmpty() -> err = "Sélectionnez au moins une matière."
                                selectedLevels.isEmpty() -> err = "Sélectionnez au moins un niveau."
                                selectedPrograms.isEmpty() -> err = "Sélectionnez au moins un programme."
                                !fmtHome && !fmtOnline -> err = "Choisissez domicile ou en ligne."
                                else -> step++
                            }
                        }
                        1 -> {
                            if (!consent) err = "Acceptez les conditions."
                            else step++
                        }
                        else -> {
                            if (idCard == null || diploma == null || photo == null) err = "Ajoutez les trois documents."
                            else scope.launch { submit() }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppField(value: String, onValueChange: (String) -> Unit, placeholder: String, singleLine: Boolean = true) {
    OutlinedTextField(
        value = value, onValueChange = onValueChange, modifier = Modifier.fillMaxWidth(),
        placeholder = { Text(placeholder, fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Faint) },
        singleLine = singleLine, minLines = if (singleLine) 1 else 3,
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
private fun FieldLabel(text: String) {
    Text(text, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.Muted)
}

@Composable
private fun SelectChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val bg = if (selected) AkColors.GreenSoft else AkColors.White
    val fg = if (selected) AkColors.Green else AkColors.InkSoft
    Text(
        label, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = fg,
        modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(bg)
            .then(if (selected) Modifier.border(1.dp, AkColors.Green, RoundedCornerShape(999.dp)) else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(999.dp)))
            .clickable { onClick() }.padding(horizontal = 14.dp, vertical = 9.dp),
    )
}

@Composable
private fun PickField(value: String, expanded: Boolean, onExpanded: (Boolean) -> Unit, options: List<String>, onSelect: (String) -> Unit) {
    Box(Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, AkColors.Border, RoundedCornerShape(14.dp))
                .background(AkColors.White).clickable { onExpanded(true) }.padding(horizontal = 14.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(value, fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Ink)
            Icon(Icons.Filled.ArrowDropDown, null, tint = AkColors.Muted)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { onExpanded(false) }) {
            options.forEach { opt ->
                DropdownMenuItem(text = { Text(opt, fontFamily = Hanken) }, onClick = { onSelect(opt) })
            }
        }
    }
}

private fun Int.formatFr(): String = String.format("%,d", this).replace(',', ' ')

@Composable
private fun DocRow(icon: ImageVector, title: String, status: String, done: Boolean, onAdd: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White)
            .then(if (done) Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)) else Modifier.border(1.5.dp, Color(0xFFC9C2B5), RoundedCornerShape(15.dp)))
            .clickable(enabled = !done) { onAdd() }
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(40.dp).clip(RoundedCornerShape(11.dp)).background(if (done) AkColors.GreenSoft else AkColors.CardField), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = if (done) AkColors.Green else AkColors.Faint, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink)
            Text(status, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, color = if (done) Color(0xFF22A55D) else AkColors.Faint)
        }
        if (done) Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22A55D), modifier = Modifier.size(22.dp))
        else Text("Ajouter", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Green,
            modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(AkColors.GreenSoft).padding(horizontal = 12.dp, vertical = 7.dp))
    }
}

/* ====================================================================== *
 * ÉCRAN 30, RETRAIT DES GAINS
 * ====================================================================== */
@Composable
fun WithdrawScreen(nav: NavActions) {
    val amounts = listOf("50 000" to "50 000", "100 000" to "100 000", "Tout" to "184 000")
    var amount by remember { mutableIntStateOf(1) }
    AkScreen {
        TopBar("Retirer mes gains", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.Green).padding(18.dp)) {
                Text("Solde disponible", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.OnGreenSoft)
                Text("184 000 F", fontFamily = Schibsted, fontWeight = FontWeight.Black, fontSize = 34.sp, color = AkColors.White, modifier = Modifier.padding(top = 3.dp))
            }
            Spacer(Modifier.height(18.dp))
            Text("Montant à retirer", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).padding(16.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.Bottom) {
                Text(amounts[amount].second, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 30.sp, color = AkColors.Ink)
                Text(" F", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = AkColors.Faint, modifier = Modifier.padding(bottom = 4.dp))
            }
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                amounts.forEachIndexed { i, (label, _) -> QuickAmount(label, amount == i, Modifier.weight(1f)) { amount = i } }
            }
            Spacer(Modifier.height(18.dp))
            Text("Verser sur", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(2.dp, AkColors.Green, RoundedCornerShape(15.dp)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF1D9BD8)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Waves, null, tint = AkColors.White, modifier = Modifier.size(19.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Wave", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("05 ** ** ** 11", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                }
                Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Green, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.height(13.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Lock, null, tint = AkColors.Green, modifier = Modifier.size(14.dp))
                Text("  Sans frais · versé sous 24h", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
            }
            Spacer(Modifier.height(16.dp))
        }
        Box(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            PrimaryButton("Retirer ${amounts[amount].second} F", Modifier.fillMaxWidth(), color = AkColors.Green, trailingIcon = null, onClick = { nav.back() })
        }
    }
}

@Composable
private fun QuickAmount(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Box(modifier.clip(RoundedCornerShape(11.dp)).background(if (selected) AkColors.Green else AkColors.White).then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(11.dp))).clickable { onClick() }.padding(vertical = 9.dp), contentAlignment = Alignment.Center) {
        Text(label, fontFamily = Hanken, fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold, fontSize = 12.5.sp, color = if (selected) AkColors.White else AkColors.InkSoft)
    }
}
