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
import androidx.compose.runtime.LaunchedEffect
import ci.monprofperso.app.data.isPayable
import ci.monprofperso.app.data.isTeacherParticipant
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import ci.monprofperso.app.data.Auth
import ci.monprofperso.app.data.Api
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.nav.Routes
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ====================================================================== *
 * ÉCRAN 9, RÉSERVATION DU COURS
 * ====================================================================== */
@Composable
fun BookingScreen(nav: NavActions) {
    val app = ci.monprofperso.app.data.AppState
    val scope = rememberCoroutineScope()
    var format by remember { mutableStateOf(app.bkFormats.firstOrNull().orEmpty()) }
    var day by remember { mutableIntStateOf(0) }
    var time by remember { mutableIntStateOf(2) }
    var duration by remember { mutableIntStateOf(1) }
    var location by remember { mutableStateOf(app.bkLocation) }
    var level by remember { mutableStateOf(app.bkLevel) }
    var busy by remember { mutableStateOf(false) }
    var bookingError by remember { mutableStateOf<String?>(null) }
    var consentRequired by remember { mutableStateOf(false) }
    val timezone = remember { TimeZone.getTimeZone("Africa/Abidjan") }
    val days = remember { List(5) { offset -> Calendar.getInstance(timezone).apply { add(Calendar.DAY_OF_YEAR, offset + 1) }.time } }
    val shortDay = remember { SimpleDateFormat("EEE", Locale.FRENCH).apply { timeZone = timezone } }
    val dayNumber = remember { SimpleDateFormat("dd", Locale.FRENCH).apply { timeZone = timezone } }
    val fullDay = remember { SimpleDateFormat("EEE dd MMM yyyy", Locale.FRENCH).apply { timeZone = timezone } }
    val times = listOf("10:00", "14:00", "16:00", "17:30")
    val durations = listOf("1h", "1h30", "2h")
    val estimatedPrice = (app.bkPricePerHour * listOf(1.0, 1.5, 2.0)[duration]).toInt()
    val priceLabel = "%,d F".format(estimatedPrice).replace(',', ' ')
    AkScreen {
        TopBar("Demander un cours", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White)
                .border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).padding(11.dp), verticalAlignment = Alignment.CenterVertically) {
                InitialsAvatar(app.bkTeacherInitials, size = 42, radius = 12, fontSize = 15)
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text(app.bkTeacherName, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text(app.bkSubjectsLine, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                }
            }
            SubLabel("Format du cours")
            if (app.bkFormats.isEmpty()) Text("Aucun format de cours disponible pour ce professeur dans la version actuelle.", color = AkColors.Orange)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if ("home" in app.bkFormats) FormatCard(Icons.Filled.Home, "À domicile", "Adresse du cours", format == "home", Modifier.weight(1f)) { format = "home" }
                if ("online" in app.bkFormats) FormatCard(Icons.Filled.Videocam, "En ligne", "À convenir avec le prof", format == "online", Modifier.weight(1f)) { format = "online" }
            }
            if (format == "home") {
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(location, { location = it }, label = { Text("Adresse du cours") }, modifier = Modifier.fillMaxWidth())
            }
            SubLabel("Matière & niveau")
            Text(app.bkSubject, fontFamily = Hanken, color = AkColors.Ink)
            OutlinedTextField(level, { level = it }, label = { Text("Niveau de l'élève") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            SubLabel("Proposer un créneau · heure d'Abidjan")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                days.forEachIndexed { i, date -> DayCell(shortDay.format(date).uppercase(Locale.FRENCH), dayNumber.format(date), day == i, Modifier.weight(1f)) { day = i } }
            }
            Text(fullDay.format(days[day]), fontFamily = Hanken, color = AkColors.Muted, modifier = Modifier.padding(top = 8.dp))
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                times.forEachIndexed { i, label -> TimeChip(label, if (time == i) TimeState.Selected else TimeState.Idle) { time = i } }
            }
            SubLabel("Durée")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                durations.forEachIndexed { i, label -> DurationChip(label, duration == i, Modifier.weight(1f)) { duration = i } }
            }
            Text("Le professeur doit accepter votre demande. Le paiement sera ensuite disponible dans Mes cours.",
                fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 18.dp))
            bookingError?.let { Text(it, color = AkColors.Orange, modifier = Modifier.padding(top = 12.dp)) }
            if (consentRequired) TextButton(onClick = { nav.go(Routes.Settings) }) { Text("Lire et accepter les conditions dans mes paramètres") }
            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            RecapRow("Estimation (${durations[duration]})", priceLabel)
            PrimaryButton(if (busy) "Envoi…" else "Envoyer la demande", Modifier.fillMaxWidth(), enabled = !busy && format.isNotBlank() && (format != "home" || location.trim().length >= 5), onClick = {
                if (busy) return@PrimaryButton
                if (ci.monprofperso.app.data.TokenStore.token.isNullOrBlank()) { nav.go(Routes.Login); return@PrimaryButton }
                busy = true
                bookingError = null
                scope.launch {
                    try {
                        val requestedTime = times[time].split(":")
                        val requestedDate = Calendar.getInstance(timezone).apply {
                            this.time = days[day]
                            set(Calendar.HOUR_OF_DAY, requestedTime[0].toInt())
                            set(Calendar.MINUTE, requestedTime[1].toInt())
                            set(Calendar.SECOND, 0)
                            set(Calendar.MILLISECOND, 0)
                        }.time
                        val startAt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(requestedDate)
                        val booking = Api.service.book(mapOf(
                            "teacherId" to app.bkTeacherId, "subject" to app.bkSubject, "level" to level,
                            "format" to format, "duration" to durations[duration], "startAt" to startAt,
                            "location" to location.takeIf { format == "home" },
                        ))
                        app.resumePayment(booking.course)
                        app.bkReference = booking.reference
                        app.bkPaymentConfirmed = false
                        nav.go(Routes.Confirmed)
                    } catch (error: Exception) {
                        if (error is kotlinx.coroutines.CancellationException) throw error
                        bookingError = Auth.errorMessage(error)
                        consentRequired = Auth.errorCode(error) == "consent_required"
                    } finally { busy = false }
                }
            })
        }
    }
}

@Composable
private fun SubLabel(text: String) {
    Spacer(Modifier.height(18.dp))
    Text(text, fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink, modifier = Modifier.padding(bottom = 10.dp))
}

@Composable
private fun FormatCard(icon: ImageVector, title: String, subtitle: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Column(
        modifier.clip(RoundedCornerShape(15.dp)).background(if (selected) AkColors.GreenSoft else AkColors.White)
            .border(if (selected) 2.dp else 1.5.dp, if (selected) AkColors.Green else AkColors.Border, RoundedCornerShape(15.dp))
            .clickable { onClick() }
            .padding(13.dp),
        verticalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Icon(icon, null, tint = if (selected) AkColors.Green else AkColors.Faint, modifier = Modifier.size(21.dp))
        Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = if (selected) AkColors.Ink else AkColors.InkSoft)
        Text(subtitle, fontFamily = Hanken, fontSize = 11.sp, color = if (selected) AkColors.Muted else AkColors.Faint)
    }
}

@Composable
private fun DayCell(day: String, num: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Column(
        modifier.clip(RoundedCornerShape(13.dp)).background(if (selected) AkColors.Green else AkColors.White)
            .border(if (selected) 2.dp else 1.5.dp, if (selected) AkColors.Green else AkColors.Border, RoundedCornerShape(13.dp))
            .clickable { onClick() }
            .padding(vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(day, fontFamily = Hanken, fontSize = 11.sp, color = if (selected) AkColors.OnGreenSoft else AkColors.Faint)
        Text(num, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = if (selected) AkColors.White else AkColors.Ink)
    }
}

private enum class TimeState { Idle, Selected, Disabled }

@Composable
private fun TimeChip(time: String, state: TimeState, onClick: () -> Unit = {}) {
    val bg = when (state) { TimeState.Selected -> AkColors.Orange; TimeState.Disabled -> AkColors.CardField; else -> AkColors.White }
    val fg = when (state) { TimeState.Selected -> AkColors.White; TimeState.Disabled -> AkColors.Faint; else -> AkColors.InkSoft }
    Text(
        time, fontFamily = Hanken, fontWeight = if (state == TimeState.Selected) FontWeight.Bold else FontWeight.SemiBold,
        fontSize = 12.5.sp, color = fg,
        textDecoration = if (state == TimeState.Disabled) TextDecoration.LineThrough else null,
        modifier = Modifier.clip(RoundedCornerShape(11.dp)).background(bg)
            .then(if (state == TimeState.Idle) Modifier.border(1.5.dp, AkColors.Border, RoundedCornerShape(11.dp)) else Modifier)
            .clickable(enabled = state != TimeState.Disabled) { onClick() }
            .padding(horizontal = 14.dp, vertical = 9.dp),
    )
}

@Composable
private fun DurationChip(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Box(
        modifier.clip(RoundedCornerShape(11.dp)).background(if (selected) AkColors.Green else AkColors.White)
            .then(if (selected) Modifier else Modifier.border(1.5.dp, AkColors.Border, RoundedCornerShape(11.dp)))
            .clickable { onClick() }
            .padding(vertical = 10.dp), contentAlignment = Alignment.Center,
    ) {
        Text(label, fontFamily = Hanken, fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
            fontSize = 12.5.sp, color = if (selected) AkColors.White else AkColors.InkSoft)
    }
}

/* ====================================================================== *
 * ÉCRAN 10, PAIEMENT MOBILE MONEY
 * ====================================================================== */
@Composable
fun PaymentScreen(nav: NavActions) {
    val app = ci.monprofperso.app.data.AppState
    val scope = rememberCoroutineScope()
    var method by remember { mutableIntStateOf(0) }
    var sending by remember { mutableStateOf(false) }
    var showOtp by remember { mutableStateOf(false) }
    var otpPaymentId by remember { mutableIntStateOf(0) }
    var otpCode by remember { mutableStateOf("") }
    var payError by remember { mutableStateOf<String?>(null) }
    var consentRequired by remember { mutableStateOf(false) }
    var payable by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(true) }
    var payerPhone by remember { mutableStateOf(app.authPhone) }
    LaunchedEffect(app.bkCourseId) {
        try {
            val course = Api.service.courses().firstOrNull { it.id == app.bkCourseId }
            if (course == null) payError = "Retrouvez votre cours dans Mes cours pour le payer."
            else {
                app.resumePayment(course)
                payable = course.isPayable() && !course.isTeacherParticipant(app.authRole)
                if (!payable) payError = if (course.paymentStatus == "paid") "Ce cours est déjà payé." else "Le professeur doit d'abord accepter ce cours."
            }
        } catch (error: Exception) {
            if (error is kotlinx.coroutines.CancellationException) throw error
            consentRequired = Auth.errorCode(error) == "consent_required"; payError = Auth.errorMessage(error)
        } finally { loading = false }
    }

    fun paymentConfirmed() {
        app.bkPaymentConfirmed = true
        payable = false
        nav.go(Routes.Confirmed)
    }
    val priceLabel = "%,d F".format(app.bkPrice).replace(',', ' ')
    val lieu = if (app.bkFormat == "online") "En ligne" else "À domicile · ${app.bkLocation}"

    fun paymentPhone(): String = Auth.normalizePhone(payerPhone)

    fun providerForMethod() = when (method) {
        1 -> "wave"
        2 -> "mtn"
        else -> "orange"
    }

    suspend fun pollUntilPaid(paymentId: Int): Boolean {
        repeat(24) {
            val st = Api.service.paymentStatus(paymentId)
            if (st.paid) return true
            if (st.status == "failed") return false
            delay(2500)
        }
        return Api.service.paymentStatus(paymentId).paid
    }

    if (showOtp) {
        AlertDialog(
            onDismissRequest = { if (!sending) showOtp = false },
            title = { Text("Code de confirmation", fontFamily = Schibsted, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Saisissez le code reçu sur votre téléphone.", fontFamily = Hanken, fontSize = 13.sp)
                    payError?.let { Text(it, color = AkColors.Orange) }
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = otpCode,
                        onValueChange = { if (it.length <= 6) otpCode = it.filter { c -> c.isDigit() } },
                        singleLine = true,
                        placeholder = { Text("000000") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = otpCode.length >= 4 && !sending,
                    onClick = {
                        sending = true
                        scope.launch {
                            try {
                                val response = Api.service.submitPaymentOtp(mapOf("paymentId" to otpPaymentId, "otp" to otpCode))
                                if (pollUntilPaid(otpPaymentId)) {
                                    showOtp = false
                                    paymentConfirmed()
                                } else payError = response.message ?: "Paiement en attente ou code refusé. Consultez Mes cours."
                            } catch (error: Exception) {
                                if (error is kotlinx.coroutines.CancellationException) throw error
                                consentRequired = Auth.errorCode(error) == "consent_required"; payError = Auth.errorMessage(error)
                            } finally { sending = false }
                        }
                    },
                ) { Text("Valider") }
            },
            dismissButton = {
                TextButton(onClick = { showOtp = false }) { Text("Annuler") }
            },
        )
    }

    AkScreen {
        TopBar("Paiement", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).padding(16.dp)) {
                Text("RÉCAPITULATIF", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Faint)
                Row(Modifier.padding(top = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    InitialsAvatar(app.bkTeacherInitials, size = 42, radius = 12, fontSize = 15)
                    Spacer(Modifier.width(11.dp))
                    Column {
                        Text("Cours de ${app.bkSubject} · ${app.bkLevel}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("avec ${app.bkTeacherName}", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    }
                }
                Divider13()
                RecapRow("Date", "${app.bkDayFull} · ${app.bkTime}")
                RecapRow("Durée", app.bkDuration)
                RecapRow("Lieu", lieu, last = true)
            }
            if (loading) Text("Vérification du cours…", fontFamily = Hanken, color = AkColors.Muted)
            SubLabel2("Numéro Mobile Money")
            PhoneField(value = payerPhone, onValueChange = { payerPhone = it })
            SubLabel2("Moyen de paiement")
            PaymentMethod(Color(0xFFF2761A), Icons.Filled.PhoneAndroid, "Orange Money", paymentPhone(), selected = method == 0) { method = 0 }
            Spacer(Modifier.height(10.dp))
            PaymentMethod(Color(0xFF1D9BD8), Icons.Filled.Waves, "Wave", "Mobile Money", selected = method == 1) { method = 1 }
            Spacer(Modifier.height(10.dp))
            PaymentMethod(Color(0xFFF5C518), Icons.Filled.PhoneAndroid, "MTN MoMo", "Mobile Money", selected = method == 2, iconTint = AkColors.Ink) { method = 2 }
            payError?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, fontFamily = Hanken, fontSize = 12.sp, color = Color(0xFFB42318))
            }
            if (consentRequired) TextButton(onClick = { nav.go(Routes.Settings) }) { Text("Lire et accepter les conditions dans mes paramètres") }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Lock, null, tint = AkColors.Green, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(8.dp))
                Text("Paiement Mobile Money", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
            }
            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            RecapRow("Cours (${app.bkDuration})", priceLabel, valueColor = AkColors.Ink)
            PrimaryButton(if (sending) "Validation…" else "Payer $priceLabel", Modifier.fillMaxWidth(), color = if (payable && !loading) AkColors.Green else AkColors.Border, trailingIcon = Icons.Filled.Lock, onClick = {
                if (sending || loading || !payable) return@PrimaryButton
                sending = true
                payError = null
                scope.launch {
                    try {
                        val courseId = app.bkCourseId ?: throw IllegalStateException("Cours introuvable")
                        val charge = Api.service.chargeMobile(mapOf(
                            "courseId" to courseId, "provider" to providerForMethod(), "phone" to paymentPhone(),
                        ))
                        when (charge.status) {
                            "otp_required" -> {
                                otpPaymentId = charge.paymentId
                                otpCode = ""
                                showOtp = true
                            }
                            else -> {
                                if (pollUntilPaid(charge.paymentId)) paymentConfirmed()
                                else payError = charge.message ?: "Paiement en attente ou refusé"
                            }
                        }
                    } catch (error: Exception) {
                        if (error is kotlinx.coroutines.CancellationException) throw error
                        consentRequired = Auth.errorCode(error) == "consent_required"; payError = Auth.errorMessage(error)
                    } finally { sending = false }
                }
            })
        }
    }
}

@Composable private fun Divider13() = Box(Modifier.fillMaxWidth().padding(vertical = 13.dp).height(1.dp).background(AkColors.CardField))

@Composable
private fun RecapRow(label: String, value: String, last: Boolean = false, valueColor: Color = AkColors.Ink) {
    Row(Modifier.fillMaxWidth().padding(bottom = if (last) 0.dp else 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontFamily = Hanken, fontSize = 13.sp, color = Color(0xFF4A574F))
        Text(value, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = valueColor)
    }
}

@Composable
private fun SubLabel2(text: String) {
    Spacer(Modifier.height(18.dp))
    Text(text, fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink, modifier = Modifier.padding(bottom = 11.dp))
}

@Composable
private fun PaymentMethod(badge: Color, icon: ImageVector, title: String, subtitle: String, selected: Boolean = false, iconTint: Color = AkColors.White, onClick: () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White)
            .border(if (selected) 2.dp else 1.5.dp, if (selected) AkColors.Orange else AkColors.Border, RoundedCornerShape(15.dp))
            .clickable { onClick() }
            .padding(14.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(badge), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = iconTint, modifier = Modifier.size(19.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            Text(subtitle, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
        }
        if (selected) Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Orange, modifier = Modifier.size(22.dp))
        else Box(Modifier.size(21.dp).clip(CircleShape).border(2.dp, Color(0xFFD8D2C8), CircleShape))
    }
}

/* ====================================================================== *
 * ÉCRAN 11, COURS CONFIRMÉ
 * ====================================================================== */
@Composable
fun ConfirmedScreen(nav: NavActions) {
    val app = ci.monprofperso.app.data.AppState
    val lieu = if (app.bkFormat == "online") "En ligne" else "À domicile · ${app.bkLocation}"
    AkScreen {
        Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 6.dp), horizontalArrangement = Arrangement.End) {
            IconSquare(Icons.Filled.Close, onClick = { nav.go(Routes.Home) })
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 26.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(Modifier.height(16.dp))
            Box(Modifier.size(96.dp).clip(CircleShape).background(AkColors.GreenSoft), contentAlignment = Alignment.Center) {
                Box(Modifier.size(66.dp).clip(CircleShape).background(AkColors.Green), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Check, null, tint = AkColors.White, modifier = Modifier.size(34.dp))
                }
            }
            Spacer(Modifier.height(22.dp))
            Text(if (app.bkPaymentConfirmed) "Paiement confirmé" else "Demande envoyée", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, color = AkColors.Ink)
            Text(
                if (app.bkPaymentConfirmed)
                    "Votre paiement pour le cours avec ${app.bkTeacherName} a été confirmé."
                else
                    "Votre demande a été transmise à ${app.bkTeacherName}. Le paiement sera disponible après son acceptation.",
                fontFamily = Hanken, fontSize = 14.sp, lineHeight = 21.sp, color = AkColors.Muted,
                textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp).widthIn(max = 280.dp))
            Spacer(Modifier.height(24.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).padding(16.dp)) {
                Text("RÉF. #${app.bkReference}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = AkColors.Faint)
                Divider13()
                RecapRow("Matière", "${app.bkSubject} · ${app.bkLevel}"); Spacer(Modifier.height(3.dp))
                RecapRow("Date", "${app.bkDayFull} · ${app.bkTime}"); Spacer(Modifier.height(3.dp))
                RecapRow("Lieu", lieu); Spacer(Modifier.height(3.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(if (app.bkPaymentConfirmed) "Montant payé" else "Montant du cours", fontFamily = Hanken, fontSize = 13.sp, color = Color(0xFF4A574F))
                    Text("%,d F".format(app.bkPrice).replace(',', ' '), fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = AkColors.Green)
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { nav.go(Routes.MyCourses) }) {
                Icon(Icons.Filled.CalendarMonth, null, tint = AkColors.Green, modifier = Modifier.size(17.dp))
                Spacer(Modifier.width(8.dp))
                Text("Consulter mes cours", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Green)
            }
            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.padding(horizontal = 26.dp).padding(bottom = 26.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            PrimaryButton("Voir mon cours", Modifier.fillMaxWidth(), trailingIcon = null, onClick = { nav.go(Routes.MyCourses) })
            Box(Modifier.fillMaxWidth().clickable { nav.go(Routes.Home) }.padding(6.dp), contentAlignment = Alignment.Center) {
                Text("Retour à l'accueil", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Muted)
            }
        }
    }
}
