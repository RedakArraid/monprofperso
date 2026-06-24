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
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
 * ÉCRAN 9 — RÉSERVATION DU COURS
 * ====================================================================== */
@Composable
fun BookingScreen(nav: NavActions) {
    var format by remember { mutableIntStateOf(0) }
    var day by remember { mutableIntStateOf(1) }
    var time by remember { mutableIntStateOf(2) }
    var duration by remember { mutableIntStateOf(1) }
    val days = listOf("VEN" to "21", "SAM" to "22", "DIM" to "23", "LUN" to "24", "MAR" to "25")
    val times = listOf("10:00", "14:00", "16:00", "17:30")
    val durations = listOf("1h", "1h30", "2h")
    AkScreen {
        TopBar("Réserver un cours", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            // prof mini
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White)
                    .border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).padding(11.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                InitialsAvatar("KN", size = 42, radius = 12, fontSize = 15)
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text("Koffi N'Guessan", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("Maths · Physique-Chimie", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
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
                Chip("Mathématiques", true); Chip("3ᵉ (BEPC)", false)
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
            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            Row(Modifier.fillMaxWidth().padding(bottom = 11.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("${days[day].first} ${days[day].second} juin · ${times[time]} · ${durations[duration]}", fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.Muted)
                Text("6 000 F", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = AkColors.Ink)
            }
            PrimaryButton("Continuer vers le paiement", Modifier.fillMaxWidth(), onClick = { nav.go(Routes.Payment) })
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
 * ÉCRAN 10 — PAIEMENT MOBILE MONEY
 * ====================================================================== */
@Composable
fun PaymentScreen(nav: NavActions) {
    var method by remember { mutableIntStateOf(0) }
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
                        Text("Cours de Maths · 3ᵉ", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("avec Koffi N'Guessan", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    }
                }
                Divider13()
                RecapRow("Date", "Sam. 22 juin · 16h00")
                RecapRow("Durée", "1h30")
                RecapRow("Lieu", "À domicile · Cocody", last = true)
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
            RecapRow("Cours (1h30)", "6 000 F", valueColor = AkColors.Ink)
            Row(Modifier.fillMaxWidth().padding(bottom = 11.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Frais de service", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted)
                Text("Offert", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
            }
            PrimaryButton("Payer 6 000 FCFA", Modifier.fillMaxWidth(), color = AkColors.Green, trailingIcon = Icons.Filled.Lock, onClick = { nav.go(Routes.Confirmed) })
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
 * ÉCRAN 11 — COURS CONFIRMÉ
 * ====================================================================== */
@Composable
fun ConfirmedScreen(nav: NavActions) {
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
            Text("C'est confirmé !", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, color = AkColors.Ink)
            Text("Votre cours avec Koffi N'Guessan est réservé. Il vient d'être prévenu.",
                fontFamily = Hanken, fontSize = 14.sp, lineHeight = 21.sp, color = AkColors.Muted,
                textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp).widthIn(max = 280.dp))
            Spacer(Modifier.height(24.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).padding(16.dp)) {
                Text("RÉF. #AKW-2058", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = AkColors.Faint)
                Divider13()
                RecapRow("Matière", "Maths · 3ᵉ"); Spacer(Modifier.height(3.dp))
                RecapRow("Date", "Sam. 22 juin · 16h00"); Spacer(Modifier.height(3.dp))
                RecapRow("Lieu", "À domicile · Cocody"); Spacer(Modifier.height(3.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Montant payé", fontFamily = Hanken, fontSize = 13.sp, color = Color(0xFF4A574F))
                    Text("6 000 F", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = AkColors.Green)
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
