package ci.monprofperso.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ci.monprofperso.app.data.*
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.nav.Routes
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

private fun failureText(error: Exception): String {
    if (error is CancellationException) throw error
    return if (error is IllegalArgumentException) error.message ?: "Vérifiez les informations saisies." else Auth.errorMessage(error)
}

internal fun courseStateLabel(value: String?): String = when (value) {
    "requested" -> "En attente du professeur"
    "awaiting_schedule" -> "Créneau à convenir"
    "scheduled" -> "Cours planifié"
    "completion_pending" -> "Réalisation à confirmer"
    "completed" -> "Cours réalisé"
    "disputed" -> "Signalement en cours de traitement"
    "cancelled" -> "Cours annulé"
    "refused" -> "Demande refusée"
    else -> "Consultez le détail du cours"
}

internal fun financeStateLabel(value: String): String = when (value) {
    "requested" -> "Demande enregistrée"
    "approved" -> "Demande approuvée, versement à vérifier"
    "verified" -> "Versement vérifié"
    "rejected" -> "Demande refusée"
    "reversed" -> "Versement annulé par le prestataire"
    else -> value
}

private fun reportLabel(value: String): String = when (value) {
    "completed" -> "Cours réalisé"
    "teacher_absent" -> "Absence du professeur signalée"
    "student_absent" -> "Absence de l’élève signalée"
    "disputed" -> "Difficulté signalée"
    else -> "Déclaration enregistrée"
}

private fun courseEventLabel(value: String): String = when (value) {
    "need_matched" -> "Professeur attribué au besoin de cours"
    "details_updated" -> "Informations du rendez-vous mises à jour"
    "schedule_proposed" -> "Créneau proposé"
    "schedule_accepted" -> "Créneau accepté"
    "schedule_declined" -> "Créneau refusé"
    "cancelled" -> "Cours annulé"
    "attendance_reported" -> "Déclaration de réalisation reçue"
    "admin_resolved" -> "Traitement du cours par le support"
    "review_created" -> "Avis publié"
    "historical_terms_documented" -> "Conditions du cours précisées par le support"
    else -> "Activité du cours enregistrée"
}

private fun money(amount: Int) = "%,d F CFA".format(Locale.FRANCE, amount).replace('\u202f', ' ').replace('\u00a0', ' ')

@Composable
private fun OperationCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = AkColors.White)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = AkColors.Ink)
            content()
        }
    }
}

@Composable
private fun OperationField(label: String, value: String, onChange: (String) -> Unit, enabled: Boolean = true) {
    OutlinedTextField(value = value, onValueChange = onChange, label = { Text(label) }, modifier = Modifier.fillMaxWidth(), enabled = enabled)
}

@Composable
fun ProductionAccountScreen(nav: NavActions) {
    var user by remember { mutableStateOf<UserDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        try { user = Api.service.me() } catch (e: Exception) { error = failureText(e) }
    }
    AkScreen(applyBottomInset = false) {
        TopBar("Mon compte", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            error?.let { Text(it, color = AkColors.Orange) }
            OperationCard(user?.fullName ?: AppState.authFullName.ifBlank { "Mon compte" }) {
                Text(user?.phone ?: AppState.authPhone)
                Text(when (user?.role ?: AppState.authRole) { "teacher" -> "Professeur"; "admin" -> "Administrateur"; "student" -> "Élève"; else -> "Parent" })
            }
            if (AppState.authRole == "teacher" && AppState.authTeacherId != null) {
                OutlinedButton(onClick = { nav.go(Routes.CompleteTeacherProfile) }, modifier = Modifier.fillMaxWidth()) { Text("Compléter mon profil professeur") }
                OutlinedButton(onClick = { nav.openTeacher(AppState.authTeacherId!!) }, modifier = Modifier.fillMaxWidth()) { Text("Voir mon profil public") }
                OutlinedButton(onClick = { nav.go(Routes.Earnings) }, modifier = Modifier.fillMaxWidth()) { Text("Revenus et versements") }
                OutlinedButton(onClick = { nav.go(Routes.Agenda) }, modifier = Modifier.fillMaxWidth()) { Text("Mon agenda") }
            } else {
                OutlinedButton(onClick = { nav.go(Routes.MyChildren) }, modifier = Modifier.fillMaxWidth()) { Text("Mes enfants") }
                OutlinedButton(onClick = { nav.go(Routes.MyNeeds) }, modifier = Modifier.fillMaxWidth()) { Text("Mes demandes de cours") }
                OutlinedButton(onClick = { nav.go(Routes.BecomeTeacher) }, modifier = Modifier.fillMaxWidth()) { Text("Devenir professeur") }
            }
            OutlinedButton(onClick = { nav.go(Routes.MyCourses) }, modifier = Modifier.fillMaxWidth()) { Text("Mes cours et paiements") }
            OutlinedButton(onClick = { nav.go(Routes.Resources) }, modifier = Modifier.fillMaxWidth()) { Text("Ressources pédagogiques") }
            OutlinedButton(onClick = { nav.go(Routes.Legal) }, modifier = Modifier.fillMaxWidth()) { Text("Documents légaux") }
            OutlinedButton(onClick = { nav.go(Routes.Settings) }, modifier = Modifier.fillMaxWidth()) { Text("Mes données et mon compte") }
            OutlinedButton(onClick = { nav.go(Routes.HelpFaq) }, modifier = Modifier.fillMaxWidth()) { Text("Aide et support") }
            if (AppState.isAdmin) {
                OperationCard("Administration") {
                    OutlinedButton(onClick = { nav.go(Routes.AdminCatalog) }) { Text("Catalogue") }
                    OutlinedButton(onClick = { nav.go(Routes.AdminResources) }) { Text("Ressources") }
                    OutlinedButton(onClick = { nav.go(Routes.AdminLegal) }) { Text("Documents légaux") }
                    OutlinedButton(onClick = { nav.go(Routes.AdminSocial) }) { Text("Coordonnées et réseaux") }
                    OutlinedButton(onClick = { nav.go(Routes.AdminOtp) }) { Text("Configuration OTP") }
                    Text("Le suivi des opérations financières et des demandes de suppression est disponible dans la console web d’administration.")
                }
            }
            TextButton(onClick = { Auth.logout(); nav.go(Routes.Welcome) }) { Text("Se déconnecter") }
        }
        if (AppState.authRole == "teacher") TeacherBottomNav(TeacherTab.Profil, nav::selectTeacherTab) else BottomNav(NavTab.Profil, nav::selectTab)
    }
}

@Composable
fun PrivacySettingsScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var state by remember { mutableStateOf<AccountDeletionDto?>(null) }
    var preferences by remember { mutableStateOf<NotificationPreferencesDto?>(null) }
    var accountConsent by remember { mutableStateOf<AccountConsentDto?>(null) }
    var consentChecked by remember { mutableStateOf(false) }
    var parentalConsentChecked by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var confirmation by remember { mutableStateOf("") }
    var exportBytes by remember { mutableStateOf<ByteArray?>(null) }
    val saveExport = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val bytes = exportBytes
        exportBytes = null
        if (uri != null && bytes != null) scope.launch {
            try {
                withContext(Dispatchers.IO) { context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) } ?: throw IllegalStateException("Impossible d’ouvrir le fichier.") }
                info = "Export enregistré à l’emplacement choisi. Conservez ce fichier personnel en lieu sûr."
            } catch (e: Exception) { error = failureText(e) }
        }
    }
    fun perform(block: suspend () -> Unit) {
        scope.launch {
            busy = true; error = null; info = null
            try { block() } catch (e: Exception) { error = failureText(e) } finally { busy = false }
        }
    }
    LaunchedEffect(Unit) {
        try { state = Api.service.accountDeletion() } catch (e: Exception) { error = failureText(e) }
        try { preferences = Api.service.accountPreferences() } catch (e: Exception) { error = failureText(e) }
        try {
            val latest = Api.service.accountConsent()
            if (latest.version != accountConsent?.version) { consentChecked = false; parentalConsentChecked = false }
            accountConsent = latest
        } catch (e: Exception) { error = failureText(e) }
    }
    AkScreen {
        TopBar("Mes données et mon compte", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = AkColors.Orange) }
            info?.let { Text(it, color = AkColors.Green) }
            OperationCard("Conditions et confidentialité") {
                val legal = accountConsent
                if (legal == null) {
                    Text("Les conditions actuelles doivent être chargées avant toute acceptation.")
                    OutlinedButton(enabled = !busy, onClick = { perform { accountConsent = Api.service.accountConsent(); consentChecked = false; parentalConsentChecked = false } }) { Text("Recharger les conditions") }
                } else {
                    legal.documents.forEach { doc ->
                        Text("${doc.title} · version ${doc.version}")
                        TextButton(onClick = { nav.openPdf(ApiConfig.BASE_URL + "api/legal/${doc.slug}/file", doc.title) }) { Text("Lire le document") }
                    }
                    if (legal.accepted) Text("Vous avez accepté les conditions en vigueur.")
                    else {
                        Text("Consultez les documents à jour et confirmez votre accord pour continuer à réserver ou à payer.")
                        Row { Checkbox(checked = consentChecked, enabled = !busy, onCheckedChange = { consentChecked = it }); Text("J’accepte les conditions et la politique de confidentialité.", Modifier.padding(top = 12.dp)) }
                        if (AppState.authRole == "student") Row {
                            Checkbox(checked = parentalConsentChecked, enabled = !busy, onCheckedChange = { parentalConsentChecked = it })
                            Text("Je confirme le consentement de mon parent ou tuteur légal.", Modifier.padding(top = 12.dp))
                        }
                        Button(enabled = !busy && consentChecked && legal.version.isNotBlank() && (AppState.authRole != "student" || parentalConsentChecked), onClick = { perform {
                            try {
                                Api.service.acceptAccountConsent(mapOf("consent" to true, "consentVersion" to legal.version, "parentalConsent" to parentalConsentChecked)).close()
                                consentChecked = false; parentalConsentChecked = false
                                accountConsent = Api.service.accountConsent()
                                info = if (accountConsent?.accepted == true) "Votre accord est enregistré pour les conditions en vigueur." else "Les documents ont changé. Relisez-les et confirmez à nouveau votre accord."
                            } catch (e: Exception) {
                                if (Auth.errorCode(e) == "consent_version_changed") {
                                    consentChecked = false; parentalConsentChecked = false; accountConsent = null
                                    accountConsent = runCatching { Api.service.accountConsent() }.getOrNull()
                                }
                                throw e
                            }
                        } }) { Text("Accepter les conditions à jour") }
                    }
                }
            }
            OperationCard("Exporter mes données") {
                Text("Téléchargez un fichier JSON contenant les données de votre compte. Le fichier peut inclure des informations concernant vos enfants et vos cours.")
                Text("Une connexion OTP de moins de 15 minutes protège cet export.")
                Button(enabled = !busy, onClick = { perform {
                    exportBytes = Api.service.exportAccount().use { it.bytes() }
                    saveExport.launch("monprofperso-donnees.json")
                } }) { Text("Télécharger mes données") }
            }
            preferences?.let { p -> OperationCard("Alertes de cours et de paiement") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("WhatsApp", Modifier.padding(top = 12.dp))
                    Switch(checked = p.notificationsWhatsapp, enabled = !busy && (p.whatsappAvailable || p.notificationsWhatsapp), onCheckedChange = { preferences = p.copy(notificationsWhatsapp = it) })
                }
                if (!p.whatsappAvailable) Text("Ce canal nécessite un numéro vérifié et un service d’envoi disponible.")
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Email", Modifier.padding(top = 12.dp))
                    Switch(checked = p.notificationsEmail, enabled = !busy && (p.emailAvailable || p.notificationsEmail), onCheckedChange = { preferences = p.copy(notificationsEmail = it) })
                }
                if (!p.emailAvailable) Text("Ce canal nécessite une adresse email vérifiée et un service d’envoi disponible.")
                Text("Ces préférences concernent les cours et les paiements. Vos notifications restent consultables dans l’application.")
                Button(enabled = !busy, onClick = { perform {
                    preferences = Api.service.updateAccountPreferences(mapOf("notificationsWhatsapp" to p.notificationsWhatsapp, "notificationsEmail" to p.notificationsEmail))
                    info = "Préférences enregistrées."
                } }) { Text("Enregistrer mes préférences") }
            } }
            OperationCard("Supprimer mon compte") {
                Text("La suppression retire votre profil et anonymise vos données personnelles. Les éléments nécessaires au règlement des cours, aux litiges et aux obligations de conservation sont traités selon la politique de confidentialité.")
                Text("Une connexion OTP de moins de 15 minutes est requise pour confirmer. Une demande reste en attente tant que des opérations doivent être clôturées.")
                state?.blockers.orEmpty().forEach { Text("• ${it.message}", color = AkColors.Orange) }
                if (state?.request?.status == "pending") {
                    Text("Votre demande est enregistrée. Vous pouvez la retirer avant son traitement.")
                    Button(enabled = !busy, onClick = { perform { state = Api.service.cancelAccountDeletion(); info = "Demande de suppression annulée." } }) { Text("Annuler ma demande de suppression") }
                } else {
                    OperationField("Écrivez SUPPRIMER pour confirmer", confirmation, { confirmation = it }, !busy)
                    Button(enabled = !busy && confirmation == "SUPPRIMER", onClick = { perform {
                        val result = Api.service.requestAccountDeletion(mapOf("confirmation" to confirmation))
                        state = result
                        confirmation = ""
                        if (result.request?.status == "completed") {
                            Auth.logout(); nav.go(Routes.Welcome)
                        } else info = "Votre demande est enregistrée. Les opérations indiquées doivent être clôturées avant la suppression."
                    } }) { Text("Confirmer la suppression de mon compte") }
                }
                TextButton(enabled = !busy, onClick = { Auth.logout(); nav.go(Routes.Login) }) { Text("Me reconnecter pour confirmer mon identité") }
                TextButton(onClick = { nav.go(Routes.Legal) }) { Text("Consulter la politique de confidentialité") }
            }
        }
    }
}

@Composable
fun CourseOperationsScreen(nav: NavActions) {
    val id = AppState.selectedCourseId ?: AppState.bkCourseId
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var details by remember(id) { mutableStateOf<CourseDetailsDto?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var address by remember { mutableStateOf("") }
    var meetingUrl by remember { mutableStateOf("") }
    var accessNotes by remember { mutableStateOf("") }
    var dateText by remember { mutableStateOf("") }
    var scheduleReason by remember { mutableStateOf("") }
    var cancellationReason by remember { mutableStateOf("") }
    var outcome by remember { mutableStateOf("completed") }
    var reportNote by remember { mutableStateOf("") }
    var progressSummary by remember { mutableStateOf("") }
    var reviewRating by remember { mutableFloatStateOf(5f) }
    var reviewText by remember { mutableStateOf("") }
    var refundAmount by remember { mutableStateOf("") }
    var refundReason by remember { mutableStateOf("") }
    var refundKey by remember { mutableStateOf(UUID.randomUUID().toString()) }
    suspend fun reload() {
        if (id == null) return
        details = Api.service.courseDetails(id)
        address = details?.course?.privateAddress.orEmpty()
        meetingUrl = details?.course?.meetingUrl.orEmpty()
        accessNotes = details?.course?.accessNotes.orEmpty()
    }
    fun perform(message: String, action: suspend (Int) -> Unit) {
        if (id == null) return
        scope.launch {
            busy = true; error = null; info = null
            try { action(id); reload(); info = message } catch (e: Exception) { error = failureText(e) } finally { busy = false }
        }
    }
    LaunchedEffect(id) { busy = true; try { reload() } catch (e: Exception) { error = failureText(e) } finally { busy = false } }
    AkScreen {
        TopBar("Détail du cours", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = AkColors.Orange) }
            info?.let { Text(it, color = AkColors.Green) }
            if (id == null) {
                Text("Choisissez d’abord un cours dans votre agenda.")
                Button(onClick = { nav.go(Routes.MyCourses) }) { Text("Voir mes cours") }
            }
            details?.let { d ->
                val c = d.course
                val teacherParticipant = c.isTeacherParticipant(AppState.authRole)
                OperationCard("${c.subject} · ${c.level}") {
                    Text("Professeur : ${c.teacherName}")
                    c.parentName?.let { Text("Parent : $it") }
                    Text(courseStateLabel(c.lifecycleStatus))
                    Text(if (teacherParticipant) "Vous intervenez comme professeur pour ce cours." else "Vous avez demandé ce cours en tant que parent ou élève.")
                    Text("${c.dayLabel} ${c.dayNum} · ${c.time} · ${c.duration}")
                    Text("Montant du cours : ${money(c.price)}")
                    Text("Encaissé : ${money(d.finance.capturedAmount)} · Remboursé : ${money(d.finance.refundAmount)}")
                    if (d.finance.refundPendingAmount > 0) Text("Remboursement demandé : ${money(d.finance.refundPendingAmount)}")
                    if (d.finance.reviewRequired) Text("Le support doit vérifier les montants ou le signalement avant de débloquer les opérations financières.")
                    if (!c.privateAddress.isNullOrBlank()) Text("Adresse : ${c.privateAddress}")
                    if (!c.accessNotes.isNullOrBlank()) Text("Informations d’accès : ${c.accessNotes}")
                    c.meetingUrl?.takeIf { isSafeMeetingUrl(it) }?.let { url ->
                        OutlinedButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }.onFailure { error = "Aucune application ne peut ouvrir ce lien." } }) { Text("Rejoindre le cours en ligne") }
                    }
                    val phone = if (teacherParticipant) d.contacts.parentPhone else d.contacts.teacherPhone
                    phone?.takeIf { it.matches(Regex("\\+?[0-9]{8,15}")) }?.let {
                        OutlinedButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$it"))) }.onFailure { error = "La fonction téléphone est indisponible." } }) { Text("Appeler : $it") }
                    }
                    if (c.isPayable() && !teacherParticipant) Button(enabled = !busy, onClick = { AppState.resumePayment(c); nav.go(Routes.Payment) }) { Text("Payer ce cours") }
                    OutlinedButton(enabled = !busy, onClick = { perform("Cours actualisé.") {} }) { Text("Actualiser") }
                }
                if ("edit_details" in d.permissions) OperationCard("Informations du rendez-vous") {
                    if (!teacherParticipant && c.format != "online") OperationField("Adresse précise du cours", address, { address = it }, !busy)
                    if (teacherParticipant && c.format == "online") OperationField("Lien HTTPS du cours", meetingUrl, { meetingUrl = it }, !busy)
                    OperationField("Consignes d’accès", accessNotes, { accessNotes = it }, !busy)
                    Button(enabled = !busy, onClick = { perform("Informations enregistrées.") { courseId ->
                        val body = mutableMapOf<String, Any?>("accessNotes" to accessNotes)
                        if (teacherParticipant && c.format == "online") body["meetingUrl"] = meetingUrl
                        if (!teacherParticipant && c.format != "online") body["privateAddress"] = address
                        Api.service.updateCourseDetails(courseId, body)
                    } }) { Text("Enregistrer") }
                }
                d.scheduleRequests.filter { it.status == "pending" }.forEach { proposal ->
                    OperationCard("Créneau proposé") {
                        Text(proposal.startAt); Text(proposal.reason.orEmpty())
                        if ("respond_schedule" in d.permissions) {
                            Button(enabled = !busy, onClick = { perform("Créneau accepté.") { Api.service.respondSchedule(it, proposal.id, mapOf("decision" to "accept")) } }) { Text("Accepter ce créneau") }
                            OutlinedButton(enabled = !busy, onClick = { perform("Proposition refusée.") { Api.service.respondSchedule(it, proposal.id, mapOf("decision" to "decline")) } }) { Text("Refuser ce créneau") }
                        } else Text("En attente de la réponse de l’autre participant.")
                    }
                }
                if ("schedule" in d.permissions) OperationCard("Convenir d’un créneau") {
                    Text("Heure de Côte d’Ivoire. Le créneau doit être accepté par l’autre participant.")
                    OperationField("Date et heure : AAAA-MM-JJ HH:mm", dateText, { dateText = it }, !busy)
                    OperationField("Motif ou précision", scheduleReason, { scheduleReason = it }, !busy)
                    Button(enabled = !busy && dateText.isNotBlank() && scheduleReason.isNotBlank(), onClick = { perform("Proposition envoyée.") {
                        Api.service.proposeSchedule(it, mapOf("startAt" to parseCourseLocalDate(dateText), "reason" to scheduleReason))
                    } }) { Text("Proposer ce créneau") }
                }
                if ("report" in d.permissions) OperationCard("Réalisation du cours") {
                    listOf("completed" to "Le cours a été réalisé", "teacher_absent" to "Professeur absent", "student_absent" to "Élève absent", "disputed" to "Autre problème").forEach { (key, label) ->
                        Row { RadioButton(selected = outcome == key, onClick = { outcome = key }, enabled = !busy); Text(label, Modifier.padding(top = 12.dp)) }
                    }
                    OperationField("Commentaire", reportNote, { reportNote = it }, !busy)
                    if (teacherParticipant) OperationField("Bilan pédagogique du cours", progressSummary, { progressSummary = it }, !busy)
                    Button(enabled = !busy && reportNote.isNotBlank(), onClick = { perform("Votre déclaration est enregistrée.") {
                        val body = mutableMapOf("outcome" to outcome, "note" to reportNote)
                        if (teacherParticipant && progressSummary.isNotBlank()) body["progressSummary"] = progressSummary
                        Api.service.reportCourse(it, body)
                    } }) { Text("Enregistrer ma déclaration") }
                }
                if ("cancel" in d.permissions) OperationCard("Annuler ce cours") {
                    Text("L’annulation est enregistrée pour les deux participants. Le traitement d’un remboursement éventuel est suivi séparément.")
                    OperationField("Motif d’annulation", cancellationReason, { cancellationReason = it }, !busy)
                    Button(enabled = !busy && cancellationReason.isNotBlank(), onClick = { perform("Cours annulé. Consultez le suivi du remboursement si nécessaire.") {
                        Api.service.cancelCourse(it, mapOf("reason" to cancellationReason))
                    } }) { Text("Confirmer l’annulation du cours") }
                }
                if ("request_refund" in d.permissions) OperationCard("Demander un remboursement") {
                    Text("Le support examine la demande. Le remboursement est confirmé uniquement après vérification de l’opération.")
                    OperationField("Montant en F CFA", refundAmount, { refundAmount = it.filter(Char::isDigit) }, !busy)
                    OperationField("Motif", refundReason, { refundReason = it }, !busy)
                    Button(enabled = !busy && refundReason.isNotBlank(), onClick = { perform("Demande de remboursement enregistrée.") {
                        val amount = refundAmount.toIntOrNull()
                        require(amount != null && amount > 0) { "Saisissez un montant positif en F CFA." }
                        Api.service.requestRefund(it, mapOf("amount" to amount, "reason" to refundReason, "idempotencyKey" to refundKey)).close()
                        refundKey = UUID.randomUUID().toString(); refundAmount = ""; refundReason = ""
                    } }) { Text("Envoyer la demande") }
                }
                if ("review" in d.permissions && AppState.featureEnabled("reviews")) OperationCard("Évaluer ce cours") {
                    Text("Note : ${reviewRating.toInt()}/5")
                    Slider(value = reviewRating, onValueChange = { reviewRating = it }, valueRange = 1f..5f, steps = 3, enabled = !busy)
                    OperationField("Votre avis", reviewText, { reviewText = it }, !busy)
                    Button(enabled = !busy && reviewText.isNotBlank(), onClick = { perform("Avis enregistré.") { Api.service.reviewCourse(it, mapOf("rating" to reviewRating.toInt(), "text" to reviewText)).close() } }) { Text("Publier mon avis") }
                }
                if (d.reports.isNotEmpty()) OperationCard("Déclarations et suivi pédagogique") {
                    d.reports.forEach { report ->
                        Text("${if (report.actorRole == "teacher") "Professeur" else "Parent / élève"} · ${reportLabel(report.outcome)}")
                        report.note?.takeIf { it.isNotBlank() }?.let { Text(it) }
                        report.progressSummary?.takeIf { it.isNotBlank() }?.let { Text(it) }
                    }
                }
                if (d.events.isNotEmpty()) OperationCard("Historique") {
                    d.events.take(15).forEach { Text("${it.createdAt.orEmpty()} · ${courseEventLabel(it.type)}") }
                }
            }
        }
    }
}

@Composable
fun ProductionEarningsScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf<TeacherEarningsDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var amount by remember { mutableStateOf("") }
    var provider by remember { mutableStateOf("orange") }
    var requestKey by remember { mutableStateOf(UUID.randomUUID().toString()) }
    suspend fun reload() { state = Api.service.teacherEarnings() }
    LaunchedEffect(Unit) { busy = true; try { reload() } catch (e: Exception) { error = failureText(e) } finally { busy = false } }
    AkScreen(applyBottomInset = false) {
        TopBar("Revenus et versements", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = AkColors.Orange) }
            info?.let { Text(it, color = AkColors.Green) }
            state?.summary?.let { s ->
                OperationCard("Mes revenus") {
                    Text("Prévisionnel : ${money(s.expected)}")
                    Text("Dû après validation : ${money(s.due)}")
                    Text("Disponible pour une demande : ${money(s.releasable)}")
                    Text("Réservé pour des versements : ${money(s.reserved)}")
                    Text("Déjà versé et vérifié : ${money(s.paid)}")
                }
                OperationCard("Demander un versement") {
                    Text("Le versement est destiné au numéro vérifié de votre compte : ${AppState.authPhone}.")
                    Text("Les montants deviennent disponibles selon la réalisation des cours et la résolution des éventuels litiges.")
                    Text("Votre numéro doit avoir été vérifié par OTP et votre connexion dater de moins de 15 minutes pour envoyer une demande.")
                    OutlinedButton(enabled = !busy, onClick = { Auth.logout(); nav.go(Routes.Login) }) { Text("Me reconnecter et vérifier mon numéro") }
                    OperationField("Montant en F CFA", amount, { amount = it.filter(Char::isDigit) }, !busy)
                    listOf("orange" to "Orange Money", "mtn" to "MTN Money", "wave" to "Wave").forEach { (key, label) ->
                        Row { RadioButton(selected = provider == key, onClick = { provider = key }, enabled = !busy); Text(label, Modifier.padding(top = 12.dp)) }
                    }
                    Button(enabled = !busy && s.releasable > 0, onClick = {
                        scope.launch {
                            busy = true; error = null; info = null
                            try {
                                val requested = amount.toIntOrNull()
                                require(requested != null && requested in 1..s.releasable) { "Le montant doit être compris entre 1 et ${s.releasable} F CFA." }
                                Api.service.requestPayout(mapOf("amount" to requested, "provider" to provider, "idempotencyKey" to requestKey)).close()
                                requestKey = UUID.randomUUID().toString(); amount = ""; reload(); info = "Votre demande est enregistrée. Le versement reste à traiter et à vérifier."
                            } catch (e: Exception) { error = failureText(e) } finally { busy = false }
                        }
                    }) { Text("Envoyer ma demande de versement") }
                }
            }
            OperationCard("Historique des demandes") {
                if (state?.payoutRequests.orEmpty().isEmpty()) Text("Aucune demande de versement.")
                state?.payoutRequests.orEmpty().forEach { p ->
                    Text("${money(p.amount)} · ${p.provider.orEmpty()}")
                    Text(financeStateLabel(p.status))
                    p.providerReference?.let { Text("Référence : $it") }
                    p.reason?.takeIf { it.isNotBlank() }?.let { Text(it) }
                    HorizontalDivider()
                }
            }
            OutlinedButton(enabled = !busy, onClick = { scope.launch { busy = true; try { reload(); error = null } catch (e: Exception) { error = failureText(e) } finally { busy = false } } }) { Text("Actualiser") }
        }
        TeacherBottomNav(TeacherTab.Revenus, nav::selectTeacherTab)
    }
}

@Composable
fun ProductionSupportScreen(nav: NavActions) {
    val context = LocalContext.current
    var settings by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { try { settings = Api.service.settings() } catch (e: Exception) { error = failureText(e) } }
    AkScreen {
        TopBar("Aide et support", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            error?.let { Text(it, color = AkColors.Orange) }
            OperationCard("Contacter le support") {
                val phone = settings["contact_phone"].orEmpty()
                val email = settings["contact_email"].orEmpty()
                if (phone.isBlank() && email.isBlank()) Text("Les coordonnées du support ne sont pas disponibles pour le moment. Réessayez plus tard.")
                if (phone.isNotBlank()) {
                    Text(phone)
                    val dial = phone.filter { it.isDigit() || it == '+' }
                    OutlinedButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$dial"))) }.onFailure { error = "La fonction téléphone est indisponible." } }) { Text("Appeler le support") }
                }
                if (email.isNotBlank()) {
                    Text(email)
                    OutlinedButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.fromParts("mailto", email, null))) }.onFailure { error = "Aucune application de messagerie disponible." } }) { Text("Écrire au support") }
                }
            }
            OperationCard("Cours et paiements") {
                Text("Le détail de chaque cours permet de suivre son créneau, le paiement, sa réalisation et les éventuels signalements. Les conditions applicables sont précisées dans les documents légaux.")
                Button(onClick = { nav.go(Routes.MyCourses) }) { Text("Ouvrir mes cours") }
                OutlinedButton(onClick = { nav.go(Routes.Legal) }) { Text("Conditions et confidentialité") }
            }
        }
    }
}

@Composable
fun UnavailableFeatureScreen(nav: NavActions, title: String) {
    AkScreen {
        TopBar(title, onBack = { nav.back() })
        Column(Modifier.weight(1f).padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Ce service n’est pas proposé dans la version actuelle. Retrouvez vos cours individuels et leur suivi dans votre espace.")
            Button(onClick = { nav.go(Routes.MyCourses) }) { Text("Mes cours") }
            OutlinedButton(onClick = { nav.go(Routes.HelpFaq) }) { Text("Contacter le support") }
        }
    }
}

@Composable
fun ProductionSearchScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var teachers by remember { mutableStateOf<List<TeacherDto>>(emptyList()) }
    var query by remember { mutableStateOf("") }
    var level by remember { mutableStateOf("") }
    var format by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    suspend fun load() {
        busy = true
        try { teachers = Api.service.teachers(); error = null }
        catch (e: Exception) { error = failureText(e) }
        finally { busy = false }
    }
    LaunchedEffect(Unit) { load() }
    val visible = teachers.filter { teacher ->
        (query.isBlank() || "${teacher.name} ${teacher.subjects} ${teacher.location}".contains(query.trim(), ignoreCase = true)) &&
            (level.isBlank() || teacher.levels.orEmpty().any { it.contains(level.trim(), ignoreCase = true) }) &&
            (format.isBlank() || teacher.formats.orEmpty().contains(format))
    }
    AkScreen(applyBottomInset = false) {
        TopBar("Trouver un professeur", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            OperationField("Nom, matière ou quartier", query, { query = it })
            OperationField("Niveau, facultatif", level, { level = it })
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = format.isBlank(), onClick = { format = "" }, label = { Text("Tous") })
                FilterChip(selected = format == "home", onClick = { format = "home" }, label = { Text("À domicile") })
                if (AppState.featureEnabled("onlineCourses")) FilterChip(selected = format == "online", onClick = { format = "online" }, label = { Text("En ligne") })
            }
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = AkColors.Orange) }
            OutlinedButton(enabled = !busy, onClick = { scope.launch { load() } }) { Text("Actualiser") }
            if (!busy && visible.isEmpty()) Text("Aucun professeur ne correspond à ces critères.")
            visible.forEach { teacher ->
                OperationCard(teacher.name) {
                    Text(teacher.subjects)
                    Text(teacher.location)
                    Text("${teacher.priceLabel} / heure")
                    Text(teacher.ratingLabel + if (teacher.reviewsCount > 0) " · ${teacher.reviewsCount} avis" else "")
                    if (teacher.verified) Text("Profil vérifié", color = AkColors.Green)
                    OutlinedButton(onClick = { nav.openTeacher(teacher.id) }) { Text("Consulter le profil") }
                }
            }
        }
        BottomNav(NavTab.Recherche, nav::selectTab)
    }
}

@Composable
fun ProductionProgressScreen(nav: NavActions) {
    var entries by remember { mutableStateOf<List<ProgressEntryDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        try { entries = Api.service.progress().entries.orEmpty() } catch (e: Exception) { error = failureText(e) } finally { busy = false }
    }
    AkScreen(applyBottomInset = false) {
        TopBar("Suivi pédagogique", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = AkColors.Orange) }
            if (!busy && entries.isEmpty()) Text("Les bilans saisis par les professeurs après vos cours apparaîtront ici.")
            entries.forEach { entry ->
                OperationCard(entry.subject) {
                    Text("Professeur : ${entry.teacherName}")
                    entry.studentName?.let { Text("Élève : $it") }
                    entry.completedAt?.let { Text(it) }
                    Text(entry.summary)
                    OutlinedButton(onClick = { AppState.selectedCourseId = entry.courseId; nav.go(Routes.ManageCourse) }) { Text("Voir le cours") }
                }
            }
        }
        BottomNav(NavTab.Progres, nav::selectTab)
    }
}

@Composable
fun ProductionTeacherDashboardScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var dashboard by remember { mutableStateOf<TeacherDashboardDto?>(null) }
    var earnings by remember { mutableStateOf<EarningsSummaryDto?>(null) }
    var courses by remember { mutableStateOf<List<CourseDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(true) }
    suspend fun load() {
        busy = true
        try {
            dashboard = Api.service.teacherDashboard()
            earnings = Api.service.teacherEarnings().summary
            courses = Api.service.courses("upcoming"); error = null
        } catch (e: Exception) { error = failureText(e) }
        finally { busy = false }
    }
    LaunchedEffect(Unit) { load() }
    AkScreen(applyBottomInset = false) {
        TopBar("Espace professeur", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = AkColors.Orange) }
            dashboard?.let { d ->
                OperationCard("Bonjour, ${d.name}") {
                    d.profileCompletion?.takeIf { !it.complete }?.let { p ->
                        Text("Profil à compléter : ${p.percent} %")
                        OutlinedButton(onClick = { nav.go(Routes.CompleteTeacherProfile) }) { Text("Compléter mon profil") }
                    }
                    if (!d.needsConfirmed) Text("Votre accès aux offres attend la validation de l’administration.")
                    Text("Demandes et offres disponibles : ${d.pendingRequests}")
                    OutlinedButton(onClick = { nav.go(Routes.CourseRequests) }) { Text("Voir les demandes et offres") }
                }
            }
            earnings?.let { s -> OperationCard("Mes revenus") {
                Text("Montant net dû : ${money(s.due)}")
                Text("Disponible pour versement : ${money(s.releasable)}")
                Button(onClick = { nav.go(Routes.Earnings) }) { Text("Revenus et versements") }
            } }
            Text("Prochains cours", style = MaterialTheme.typography.titleMedium)
            if (!busy && courses.isEmpty()) Text("Aucun cours à venir.")
            courses.sortedBy { it.startAt ?: "9999" }.take(5).forEach { c ->
                OperationCard("${c.subject} · ${c.level}") {
                    if (c.isTeacherParticipant(AppState.authRole)) c.parentName?.let { Text("Parent : $it") }
                    else Text("Mon professeur : ${c.teacherName}")
                    Text(courseStateLabel(c.lifecycleStatus))
                    Text("${c.dayLabel} ${c.dayNum} · ${c.time}")
                    OutlinedButton(onClick = { AppState.selectedCourseId = c.id; nav.go(Routes.ManageCourse) }) { Text("Détails et suivi") }
                }
            }
            OutlinedButton(enabled = !busy, onClick = { scope.launch { load() } }) { Text("Actualiser") }
        }
        TeacherBottomNav(TeacherTab.Tableau, nav::selectTeacherTab)
    }
}

@Composable
fun ProductionRequestsScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var requests by remember { mutableStateOf<List<TeacherRequestDto>>(emptyList()) }
    var busy by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var query by remember { mutableStateOf("") }
    suspend fun reload() { requests = Api.service.teacherRequests() }
    fun respond(request: TeacherRequestDto, accept: Boolean) {
        scope.launch {
            busy = true; error = null; info = null
            try {
                val response = if (request.isOpportunity) Api.service.acceptOpportunity(requireNotNull(request.needId))
                    else if (accept) Api.service.acceptRequest(requireNotNull(request.courseId))
                    else Api.service.refuseRequest(requireNotNull(request.courseId))
                if (!response.isSuccessful) throw retrofit2.HttpException(response)
                reload()
                info = if (accept) "Demande acceptée. Retrouvez le cours dans votre agenda pour vérifier le rendez-vous." else "Demande refusée."
            } catch (e: Exception) { error = failureText(e) } finally { busy = false }
        }
    }
    LaunchedEffect(Unit) { try { reload() } catch (e: Exception) { error = failureText(e) } finally { busy = false } }
    val visible = requests.filter { query.isBlank() || "${it.name} ${it.subject.orEmpty()} ${it.slot.orEmpty()}".contains(query, ignoreCase = true) }
    AkScreen(applyBottomInset = false) {
        TopBar("Demandes et offres", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = AkColors.Orange) }
            info?.let { Text(it, color = AkColors.Green) }
            OperationField("Rechercher une matière ou un quartier", query, { query = it })
            if (!busy && visible.isEmpty()) Text("Aucune demande correspondant à ces critères.")
            visible.forEach { request ->
                OperationCard(if (request.isOpportunity) "Offre de cours" else "Réservation directe") {
                    Text(request.name)
                    request.student?.let { Text(it) }; request.subject?.let { Text(it) }
                    request.slot?.let { Text(it) }; request.format?.let { Text(it) }
                    request.duration?.let { Text("Durée : $it") }; request.frequency?.let { Text("Fréquence : $it") }
                    Text(if (request.isOpportunity) "Rémunération proposée : ${money(request.price)}" else "Prix du cours : ${money(request.price)}")
                    request.netHourly?.let { Text("Net par heure : ${money(it)}") }
                    if (request.hasCat || request.hasDog) Text("Animaux au domicile : ${listOfNotNull(if (request.hasCat) "chat" else null, if (request.hasDog) "chien" else null).joinToString(", ")}")
                    Button(enabled = !busy, onClick = { respond(request, true) }) { Text(if (request.isOpportunity) "Accepter l’offre" else "Accepter la réservation") }
                    if (!request.isOpportunity) OutlinedButton(enabled = !busy, onClick = { respond(request, false) }) { Text("Refuser la réservation") }
                }
            }
            OutlinedButton(enabled = !busy, onClick = { scope.launch { busy = true; try { reload(); error = null } catch (e: Exception) { error = failureText(e) } finally { busy = false } } }) { Text("Actualiser") }
            OutlinedButton(onClick = { nav.go(Routes.Agenda) }) { Text("Ouvrir mon agenda") }
        }
        TeacherBottomNav(TeacherTab.Demandes, nav::selectTeacherTab)
    }
}
