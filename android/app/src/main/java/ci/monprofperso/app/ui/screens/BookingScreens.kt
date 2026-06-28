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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import ci.monprofperso.app.data.Api
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
    var format by remember { mutableIntStateOf(0) }
    var day by remember { mutableIntStateOf(1) }
    var time by remember { mutableIntStateOf(2) }
    var duration by remember { mutableIntStateOf(1) }
    var proposeOn by remember { mutableStateOf(false) }
    var propPrice by remember { mutableStateOf("") }
    var propFreq by remember { mutableStateOf("") }
    val days = listOf("VEN" to "21", "SAM" to "22", "DIM" to "23", "LUN" to "24", "MAR" to "25")
    val daysFull = listOf("Ven.", "Sam.", "Dim.", "Lun.", "Mar.")
    val times = listOf("10:00", "14:00", "16:00", "17:30")
    val durations = listOf("1h", "1h30", "2h")
    val durationFactors = listOf(1.0, 1.5, 2.0)
    val price = (app.bkPricePerHour * durationFactors[duration]).toInt()
    val priceLabel = "%,d F".format(price).replace(',', ' ')
    AkScreen {
        TopBar("Réserver un cours", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            // prof mini
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White)
                    .border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).padding(11.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                InitialsAvatar(app.bkTeacherInitials, size = 42, radius = 12, fontSize = 15)
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text(app.bkTeacherName, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text(app.bkSubjectsLine, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                }
                Icon(Icons.Filled.Verified, null, tint = AkColors.Green, modifier = Modifier.size(20.dp))
            }
            SubLabel("Format du cours")
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                FormatCard(Icons.Filled.Home, "À domicile", "Cocody · chez vous", format == 0, Modifier.weight(1f)) { format = 0 }
                FormatCard(Icons.Filled.Videocam, "En ligne", "visio Mon Prof Perso", format == 1, Modifier.weight(1f)) { format = 1 }
            }
            SubLabel("Matière & niveau")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip(app.bkSubject, true); Chip(app.bkLevel, false)
            }
            SubLabel("Choisir un créneau")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                days.forEachIndexed { i, (d, n) -> DayCell(d, n, day == i, Modifier.weight(1f)) { day = i } }
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                times.forEachIndexed { i, t ->
                    val st = when { i == 0 -> TimeState.Disabled; time == i -> TimeState.Selected; else -> TimeState.Idle }
                    TimeChip(t, state = st) { if (i != 0) time = i }
                }
            }
            SubLabel("Durée")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                durations.forEachIndexed { i, d -> DurationChip(d, duration == i, Modifier.weight(1f)) { duration = i } }
            }
            if (app.bkNegotiable) {
                SubLabel("Proposer mon tarif")
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.OrangeSoft).padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Ce professeur accepte la négociation", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Ink)
                            Text("Proposez un tarif et une fréquence", fontFamily = Hanken, fontSize = 11.5.sp, color = Color(0xFF8A5B33))
                        }
                        androidx.compose.material3.Switch(
                            checked = proposeOn, onCheckedChange = { proposeOn = it },
                            colors = androidx.compose.material3.SwitchDefaults.colors(checkedTrackColor = AkColors.Orange),
                        )
                    }
                    if (proposeOn) {
                        Spacer(Modifier.height(10.dp))
                        androidx.compose.material3.OutlinedTextField(
                            value = propPrice, onValueChange = { propPrice = it.filter { c -> c.isDigit() } },
                            label = { Text("Tarif souhaité (F / h)") }, singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                        )
                        Spacer(Modifier.height(8.dp))
                        androidx.compose.material3.OutlinedTextField(
                            value = propFreq, onValueChange = { propFreq = it }, label = { Text("Fréquence (ex. 2 cours / sem)") },
                            singleLine = true, modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            Row(Modifier.fillMaxWidth().padding(bottom = 11.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("${daysFull[day]} ${days[day].second} juin · ${times[time]} · ${durations[duration]}", fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.Muted)
                Text(priceLabel, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = AkColors.Ink)
            }
            PrimaryButton("Continuer vers le paiement", Modifier.fillMaxWidth(), onClick = {
                app.bkFormat = if (format == 0) "home" else "online"
                app.bkDayLabel = days[day].first
                app.bkDayNum = days[day].second
                app.bkDayFull = "${daysFull[day]} ${days[day].second} juin"
                app.bkTime = times[time]
                app.bkDuration = durations[duration]
                app.bkPrice = price
                val pp = if (proposeOn) propPrice.toIntOrNull() else null
                val pf = if (proposeOn) propFreq.ifBlank { null } else null
                app.bkProposedPrice = pp
                app.bkProposedFrequency = pf
                app.bkHasProposal = app.bkNegotiable && (pp != null || pf != null)
                nav.go(Routes.Payment)
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
    val priceLabel = "%,d F".format(app.bkPrice).replace(',', ' ')
    val lieu = if (app.bkFormat == "online") "En ligne" else "À domicile · ${app.bkLocation}"
    AkScreen {
        TopBar("Paiement", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            // récap
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).padding(16.dp)) {
                Text("RÉCAPITULATIF", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Faint)
                Row(Modifier.padding(top = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    InitialsAvatar("KN", size = 42, radius = 12, fontSize = 15)
                    Spacer(Modifier.width(11.dp))
                    Column {
                        Text("Cours de ${app.bkSubject} · ${app.bkLevel}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("avec ${app.bkTeacherName}", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    }
                }
                Divider13()
                RecapRow("Date", "${app.bkDayFull} · ${app.bkTime}")
                RecapRow("Durée", app.bkDuration)
                if (app.bkHasProposal) {
                    app.bkProposedPrice?.let { RecapRow("Tarif proposé", "%,d F".format(it).replace(',', ' ')) }
                    app.bkProposedFrequency?.let { RecapRow("Fréquence", it) }
                }
                RecapRow("Lieu", lieu, last = true)
            }
            SubLabel2("Moyen de paiement")
            PaymentMethod(Color(0xFFF2761A), Icons.Filled.PhoneAndroid, "Orange Money", "07 ** ** ** 42", selected = method == 0) { method = 0 }
            Spacer(Modifier.height(10.dp))
            PaymentMethod(Color(0xFF1D9BD8), Icons.Filled.Waves, "Wave", "Sans frais", selected = method == 1) { method = 1 }
            Spacer(Modifier.height(10.dp))
            PaymentMethod(Color(0xFFF5C518), Icons.Filled.PhoneAndroid, "MTN MoMo", "05 ** ** ** 11", selected = method == 2, iconTint = AkColors.Ink) { method = 2 }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Lock, null, tint = AkColors.Green, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(8.dp))
                Text("Paiement 100% sécurisé · argent libéré après le cours", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
            }
            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            RecapRow("Cours (${app.bkDuration})", priceLabel, valueColor = AkColors.Ink)
            Row(Modifier.fillMaxWidth().padding(bottom = 11.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Frais de service", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted)
                Text("Offert", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
            }
            PrimaryButton(if (sending) "Validation…" else "Payer $priceLabel", Modifier.fillMaxWidth(), color = AkColors.Green, trailingIcon = Icons.Filled.Lock, onClick = {
                if (sending) return@PrimaryButton
                sending = true
                scope.launch {
                    val body = buildMap<String, Any?> {
                        put("teacherId", app.bkTeacherId)
                        put("teacherName", app.bkTeacherName)
                        put("subject", app.bkSubject)
                        put("level", app.bkLevel)
                        put("dayLabel", app.bkDayLabel)
                        put("dayNum", app.bkDayNum)
                        put("time", app.bkTime)
                        put("duration", app.bkDuration)
                        put("format", app.bkFormat)
                        if (app.bkFormat == "home") put("location", "À domicile, ${app.bkLocation}")
                        put("price", app.bkPrice)
                        if (app.bkHasProposal) {
                            app.bkProposedPrice?.let { put("proposedPrice", it) }
                            app.bkProposedFrequency?.let { put("proposedFrequency", it) }
                        }
                    }
                    val ref = runCatching { Api.service.book(body) }.getOrNull()?.get("reference") as? String
                    app.bkReference = ref ?: "AKW-${2000}"
                    nav.go(Routes.Confirmed)
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
            Text(if (app.bkHasProposal) "Demande envoyée !" else "C'est confirmé !", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, color = AkColors.Ink)
            Text(
                if (app.bkHasProposal)
                    "Votre proposition a été transmise à ${app.bkTeacherName}. Vous serez notifié de sa réponse."
                else
                    "Votre demande de cours avec ${app.bkTeacherName} est envoyée. Il va la confirmer.",
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
                    Text(if (app.bkHasProposal) "Tarif proposé" else "Montant", fontFamily = Hanken, fontSize = 13.sp, color = Color(0xFF4A574F))
                    Text("%,d F".format(app.bkProposedPrice ?: app.bkPrice).replace(',', ' '), fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = AkColors.Green)
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { nav.go(Routes.MyCourses) }) {
                Icon(Icons.Filled.CalendarMonth, null, tint = AkColors.Green, modifier = Modifier.size(17.dp))
                Spacer(Modifier.width(8.dp))
                Text("Ajouter à mon agenda", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Green)
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
