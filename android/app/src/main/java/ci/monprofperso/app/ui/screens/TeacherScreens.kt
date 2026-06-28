package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.nav.Routes
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ====================================================================== *
 * ÉCRAN 20, TABLEAU DE BORD PROF
 * ====================================================================== */
@Composable
fun TeacherDashboardScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var dash by remember { mutableStateOf<ci.monprofperso.app.data.TeacherDashboardDto?>(null) }
    var negotiable by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        dash = runCatching { Api.service.teacherDashboard() }.getOrNull()
        dash?.let { negotiable = it.negotiable }
    }
    val name = dash?.name ?: "Koffi N'Guessan"
    val revenueLabel = dash?.let { "%,d F".format(it.revenue).replace(',', ' ') } ?: "184 000 F"
    val trend = dash?.trend ?: "+12%"
    val stats = dash?.stats ?: listOf(
        ci.monprofperso.app.data.StatDto("14", "cours / semaine"),
        ci.monprofperso.app.data.StatDto("4,9", "note moyenne"),
        ci.monprofperso.app.data.StatDto("3", "nouveaux élèves"),
    )
    val pending = dash?.pendingRequests ?: 3
    val initials = name.split(" ").mapNotNull { it.firstOrNull() }.joinToString("").take(2).uppercase()

    AkScreen(applyBottomInset = false) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            InitialsAvatar(initials, size = 44, radius = 13, fontSize = 16)
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f)) {
                Text("Bonjour,", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
                Text(name, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AkColors.Ink)
            }
            NotificationBell(nav)
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 6.dp)) {
            // revenue hero
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.Green).padding(18.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Revenus en juin", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.OnGreenSoft)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.TrendingUp, null, tint = AkColors.OrangeLight, modifier = Modifier.size(13.dp))
                        Text(" $trend", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.OrangeLight)
                    }
                }
                Text(revenueLabel, fontFamily = Schibsted, fontWeight = FontWeight.Black, fontSize = 34.sp, color = AkColors.White, modifier = Modifier.padding(top = 4.dp))
                Row(Modifier.padding(top = 12.dp).clip(RoundedCornerShape(11.dp)).background(AkColors.Orange).clickable { nav.go(Routes.Withdraw) }.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Download, null, tint = AkColors.White, modifier = Modifier.size(15.dp))
                    Text("  Retirer mes gains", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.White)
                }
            }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                stats.take(3).forEach { s -> MiniStat(s.value, s.label, Modifier.weight(1f)) }
            }
            Spacer(Modifier.height(14.dp))
            // pending alert
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.OrangeSoft).clickable { nav.go(Routes.CourseRequests) }.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.Orange), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Inbox, null, tint = AkColors.White, modifier = Modifier.size(21.dp))
                }
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) {
                    Text("$pending demande${if (pending > 1) "s" else ""} en attente", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("Répondez vite pour ne pas les perdre", fontFamily = Hanken, fontSize = 12.sp, color = Color(0xFF8A5B33))
                }
                Text("Voir", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.White,
                    modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(AkColors.Orange).padding(horizontal = 13.dp, vertical = 8.dp))
            }
            Spacer(Modifier.height(14.dp))
            // Toggle « à négocier » : autorise les clients à proposer un tarif/fréquence.
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Offres à négocier", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("Les clients peuvent proposer un tarif et une fréquence", fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Muted)
                }
                androidx.compose.material3.Switch(
                    checked = negotiable,
                    onCheckedChange = { v ->
                        negotiable = v
                        scope.launch { runCatching { Api.service.setNegotiable(mapOf("negotiable" to v)) } }
                    },
                    colors = androidx.compose.material3.SwitchDefaults.colors(checkedTrackColor = AkColors.Green),
                )
            }
            Spacer(Modifier.height(18.dp))
            Text("Prochains cours", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).clickable { nav.go(Routes.ManageCourse) }.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.size(46.dp).clip(RoundedCornerShape(13.dp)).background(AkColors.GreenSoft), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text("SAM", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 9.5.sp, color = AkColors.Green)
                    Text("22", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = AkColors.Green)
                }
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) {
                    Text("Kouadio · Maths 3ᵉ", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink)
                    Text("16h00 · à domicile, Cocody", fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Muted)
                }
            }
            Spacer(Modifier.height(16.dp))
        }
        TeacherBottomNav(TeacherTab.Tableau, nav::selectTeacherTab)
    }
}

@Composable
private fun MiniStat(value: String, label: String, modifier: Modifier = Modifier) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).padding(vertical = 13.dp, horizontal = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp, color = AkColors.Green)
        Text(label, fontFamily = Hanken, fontSize = 10.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 2.dp))
    }
}

/* ====================================================================== *
 * ÉCRAN 21, DEMANDES DE COURS
 * ====================================================================== */
private val fallbackRequests = listOf(
    ci.monprofperso.app.data.TeacherRequestDto(null, "FB", "green", "Fatou Bamba", "il y a 1 h", 6000, "Awa · 2nde", "Mathématiques", "Sam. 28 juin · 15h00", "À domicile · Marcory"),
    ci.monprofperso.app.data.TeacherRequestDto(null, "YK", "orange", "Yao Kouamé", "il y a 3 h", 4000, "Junior · 3ᵉ", "Physique-Chimie", "Dim. 29 juin · 10h00", "En ligne"),
)

@Composable
fun CourseRequestsScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var requests by remember { mutableStateOf<List<ci.monprofperso.app.data.TeacherRequestDto>?>(null) }
    var live by remember { mutableStateOf(false) }
    var counterFor by remember { mutableStateOf<Int?>(null) }

    suspend fun reload() {
        val fetched = runCatching { ci.monprofperso.app.data.Api.service.teacherRequests() }.getOrNull()
        live = fetched != null
        requests = fetched ?: fallbackRequests
    }
    LaunchedEffect(Unit) { reload() }

    counterFor?.let { cid ->
        CounterDialog(
            onDismiss = { counterFor = null },
            onSubmit = { price, freq ->
                counterFor = null
                scope.launch {
                    val body = buildMap<String, Any?> {
                        price?.let { put("price", it) }
                        if (!freq.isNullOrBlank()) put("frequency", freq)
                    }
                    runCatching { Api.service.counterRequest(cid, body) }.onSuccess { reload() }
                }
            },
        )
    }

    val items = requests ?: emptyList()
    AkScreen(applyBottomInset = false) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Demandes", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, color = AkColors.Ink)
            Spacer(Modifier.width(10.dp))
            Text("${items.size}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.White,
                modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(AkColors.Orange).padding(horizontal = 9.dp, vertical = 3.dp))
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            if (requests == null) {
                LoadingRow()
            } else {
                if (!live) OfflineBanner(onRetry = { scope.launch { reload() } })
                if (items.isEmpty()) Text("Aucune demande en attente.", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Faint)
            }
            items.forEach { r ->
                RequestCard(
                    r,
                    onRefuse = {
                        val id = r.courseId
                        if (id != null) scope.launch { runCatching { Api.service.refuseRequest(id) }.onSuccess { reload() } }
                        else nav.go(Routes.TeacherDashboard)
                    },
                    onAccept = {
                        val id = r.courseId
                        if (id != null) scope.launch { runCatching { Api.service.acceptRequest(id) }.onSuccess { reload() } }
                        else nav.go(Routes.Agenda)
                    },
                    onCounter = { r.courseId?.let { counterFor = it } },
                )
                Spacer(Modifier.height(13.dp))
            }
            Spacer(Modifier.height(16.dp))
        }
        TeacherBottomNav(TeacherTab.Demandes, nav::selectTeacherTab)
    }
}

@Composable
private fun RequestCard(r: ci.monprofperso.app.data.TeacherRequestDto, onRefuse: () -> Unit = {}, onAccept: () -> Unit = {}, onCounter: () -> Unit = {}) {
    val green = r.accent != "orange"
    val priceLabel = "%,d F".format(r.price).replace(',', ' ')
    fun money(v: Int) = "%,d F".format(v).replace(',', ' ')
    val hasProposal = r.proposedPrice != null || !r.proposedFrequency.isNullOrBlank()
    val negotiable = r.negotiable || hasProposal || r.courseId != null
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(20.dp)).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            InitialsAvatar(r.initials, size = 42, radius = 12, fontSize = 15, bg = if (green) AkColors.GreenSoft else AkColors.OrangeSoft, fg = if (green) AkColors.Green else AkColors.Orange)
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f)) {
                Text(r.name, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
                Text(r.ago, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Faint)
            }
            Text(priceLabel, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = AkColors.Green)
        }
        Spacer(Modifier.height(13.dp))
        DetailLine("Élève", r.student ?: "-")
        DetailLine("Matière", r.subject ?: "-")
        DetailLine("Créneau", r.slot ?: "-")
        DetailLine("Format", r.format ?: "-")
        if (hasProposal) {
            Column(Modifier.fillMaxWidth().padding(top = 4.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.OrangeSoft).padding(11.dp)) {
                Text("Proposition du client", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = AkColors.Orange)
                r.proposedPrice?.let { Text("Tarif souhaité : ${money(it)}", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Ink) }
                r.proposedFrequency?.let { Text("Fréquence : $it", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Ink) }
            }
        }
        if (r.negotiationStatus == "countered") {
            Text("Contre-proposition envoyée, en attente du client", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, color = AkColors.Orange, modifier = Modifier.padding(top = 8.dp))
        }
        Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
            Box(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(12.dp)).clickable { onRefuse() }.padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                Text("Refuser", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Muted)
            }
            Box(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(AkColors.Green).clickable { onAccept() }.padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                Text("Accepter", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.White)
            }
        }
        if (negotiable && r.courseId != null && r.negotiationStatus != "countered") {
            Box(Modifier.fillMaxWidth().padding(top = 9.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, AkColors.Orange, RoundedCornerShape(12.dp)).clickable { onCounter() }.padding(vertical = 11.dp), contentAlignment = Alignment.Center) {
                Text("Faire une contre-proposition", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Orange)
            }
        }
    }
}

@Composable
private fun CounterDialog(onDismiss: () -> Unit, onSubmit: (Int?, String?) -> Unit) {
    var price by remember { mutableStateOf("") }
    var freq by remember { mutableStateOf("") }
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Contre-proposition", fontFamily = Schibsted, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Proposez un tarif et/ou une fréquence.", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted)
                Spacer(Modifier.height(10.dp))
                androidx.compose.material3.OutlinedTextField(
                    value = price, onValueChange = { price = it.filter { c -> c.isDigit() } },
                    label = { Text("Tarif (F / h)") }, singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                )
                Spacer(Modifier.height(8.dp))
                androidx.compose.material3.OutlinedTextField(
                    value = freq, onValueChange = { freq = it }, label = { Text("Fréquence (ex. 2 cours / sem)") }, singleLine = true,
                )
            }
        },
        confirmButton = {
            androidx.compose.material3.TextButton(onClick = { onSubmit(price.toIntOrNull(), freq.ifBlank { null }) }) {
                Text("Envoyer", color = AkColors.Green, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = { androidx.compose.material3.TextButton(onClick = onDismiss) { Text("Annuler", color = AkColors.Muted) } },
    )
}

@Composable
private fun DetailLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(bottom = 7.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
        Text(value, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, color = AkColors.Ink)
    }
}

/* ====================================================================== *
 * ÉCRAN 22, REVENUS
 * ====================================================================== */
@Composable
fun EarningsScreen(nav: NavActions) {
    var period by remember { mutableIntStateOf(1) }
    var data by remember { mutableStateOf<ci.monprofperso.app.data.TeacherEarningsDto?>(null) }
    LaunchedEffect(Unit) { data = runCatching { Api.service.teacherEarnings() }.getOrNull() }

    val totalLabel = data?.let { "%,d F".format(it.total).replace(',', ' ') } ?: "184 000 F"
    val trend = data?.trend ?: "+12%"
    val weeks = data?.weeks ?: listOf(
        ci.monprofperso.app.data.EarningWeekDto("S1", 0.48), ci.monprofperso.app.data.EarningWeekDto("S2", 0.66),
        ci.monprofperso.app.data.EarningWeekDto("S3", 0.58), ci.monprofperso.app.data.EarningWeekDto("S4", 0.88),
    )
    val stats = data?.stats ?: listOf(
        ci.monprofperso.app.data.StatDto("38", "cours donnés"),
        ci.monprofperso.app.data.StatDto("52 h", "enseignées"),
        ci.monprofperso.app.data.StatDto("3 800", "F / h moyen"),
    )
    val payouts = data?.payouts ?: listOf(
        ci.monprofperso.app.data.PayoutDto("Retrait Wave", "15 juin", 60000, "wave"),
        ci.monprofperso.app.data.PayoutDto("Retrait Orange Money", "1 juin", 80000, "orange"),
    )

    AkScreen(applyBottomInset = false) {
        Text("Revenus", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, color = AkColors.Ink, modifier = Modifier.padding(horizontal = 22.dp, vertical = 8.dp))
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 6.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Semaine", "Mois", "Année").forEachIndexed { i, l -> PillTab(l, period == i) { period = i } }
            }
            Spacer(Modifier.height(16.dp))
            Text("Total perçu en juin", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
            Row(Modifier.padding(top = 3.dp), verticalAlignment = Alignment.Bottom) {
                Text(totalLabel, fontFamily = Schibsted, fontWeight = FontWeight.Black, fontSize = 34.sp, color = AkColors.Ink)
                Spacer(Modifier.width(9.dp))
                Row(Modifier.padding(bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.TrendingUp, null, tint = AkColors.Green, modifier = Modifier.size(13.dp))
                    Text(" $trend", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
                }
            }
            // bar chart
            Row(Modifier.fillMaxWidth().height(118.dp).padding(top = 18.dp), horizontalArrangement = Arrangement.spacedBy(9.dp), verticalAlignment = Alignment.Bottom) {
                val maxF = (weeks.maxOfOrNull { it.f } ?: 1.0).coerceAtLeast(0.0001)
                weeks.forEachIndexed { i, w ->
                    Bar(w.f.toFloat(), w.label, active = i == weeks.lastIndex && w.f >= maxF, Modifier.weight(1f))
                }
            }
            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                stats.take(3).forEach { s -> MiniStat(s.value, s.label, Modifier.weight(1f)) }
            }
            Spacer(Modifier.height(18.dp))
            Text("Derniers versements", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            payouts.forEachIndexed { i, p ->
                val isWave = p.color == "wave"
                PayoutRow(
                    if (isWave) Color(0xFF1D9BD8) else Color(0xFFF2761A),
                    if (isWave) Icons.Filled.Waves else Icons.Filled.PhoneAndroid,
                    p.provider, p.date, "%,d F".format(p.amount).replace(',', ' '),
                )
                if (i != payouts.lastIndex) Spacer(Modifier.height(11.dp))
            }
            Spacer(Modifier.height(16.dp))
        }
        TeacherBottomNav(TeacherTab.Revenus, nav::selectTeacherTab)
    }
}

@Composable
private fun Bar(fraction: Float, label: String, active: Boolean, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
        Box(Modifier.fillMaxWidth().fillMaxHeight(fraction).clip(RoundedCornerShape(topStart = 7.dp, topEnd = 7.dp)).background(if (active) AkColors.Green else AkColors.GreenSoft))
        Spacer(Modifier.height(7.dp))
        Text(label, fontFamily = Hanken, fontWeight = if (active) FontWeight.Bold else FontWeight.Normal, fontSize = 10.sp, color = if (active) AkColors.Green else AkColors.Faint)
    }
}

@Composable
private fun PayoutRow(tint: Color, icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, date: String, amount: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(tint), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = AkColors.White, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = AkColors.Ink)
            Text(date, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Faint)
        }
        Text(amount, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Green)
    }
}
