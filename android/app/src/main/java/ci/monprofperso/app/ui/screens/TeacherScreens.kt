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
    LaunchedEffect(Unit) {
        dash = runCatching { Api.service.teacherDashboard() }.getOrNull()
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
            val incomplete = dash?.profileCompletion?.let { !it.complete } == true
            val profilePct = dash?.profileCompletion?.percent
            val needsConfirmed = dash?.needsConfirmed != false
            if (incomplete && profilePct != null) {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.GreenSoft).clickable { nav.go(Routes.CompleteTeacherProfile) }.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Profil à compléter · $profilePct %", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("Documents et présentation", fontFamily = Hanken, fontSize = 12.sp, color = Color(0xFF3F6B59))
                    }
                    Text("Compléter", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.White,
                        modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(AkColors.Green).padding(horizontal = 13.dp, vertical = 8.dp))
                }
                Spacer(Modifier.height(14.dp))
            }
            if (!needsConfirmed) {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFFFFF3E8)).padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Accès aux offres en attente", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("Validation par tests en cours — vous serez notifié dès activation.", fontFamily = Hanken, fontSize = 12.sp, color = Color(0xFF8A5B33))
                    }
                }
                Spacer(Modifier.height(14.dp))
            }
            // pending alert
            if (needsConfirmed) Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.OrangeSoft).clickable { nav.go(Routes.CourseRequests) }.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.Orange), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Inbox, null, tint = AkColors.White, modifier = Modifier.size(21.dp))
                }
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) {
                    Text("$pending offre${if (pending > 1) "s" else ""} disponible${if (pending > 1) "s" else ""}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("Gains nets affichés — premier arrivé, premier servi", fontFamily = Hanken, fontSize = 12.sp, color = Color(0xFF8A5B33))
                }
                Text("Voir", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.White,
                    modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(AkColors.Orange).padding(horizontal = 13.dp, vertical = 8.dp))
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
 * ÉCRAN 21, OFFRES DE COURS (parité Completude web)
 * ====================================================================== */
private val TEACHER_HOME_LAT = 5.3599
private val TEACHER_HOME_LNG = -3.9769
private const val NO_VEHICLE_MAX_KM = 12.0
private const val MARKS_PREFS = "mpp_offer_marks"

private val fallbackRequests = listOf(
    ci.monprofperso.app.data.TeacherRequestDto(
        1, 1, "CO", "green", "Cocody Angré", "nouveau", 8500,
        "Kouadio · 3eme", "Maths", "Cocody Angré", "À domicile",
        netHourly = 4250, frequency = "1 fois/sem", duration = "2h00",
        isOpportunity = true, hasCat = true, lat = 5.3895, lng = -3.958,
    ),
)

private fun offerKey(r: ci.monprofperso.app.data.TeacherRequestDto) =
    (r.needId ?: r.courseId)?.toString() ?: "${r.name}-${r.slot}"

private fun isOnlineOffer(r: ci.monprofperso.app.data.TeacherRequestDto): Boolean {
    val f = (r.format ?: "") + (r.slot ?: "") + (r.name)
    return f.contains("ligne", true) || f.contains("online", true)
}

private fun distanceKm(r: ci.monprofperso.app.data.TeacherRequestDto): Double? {
    val lat = r.lat ?: return null
    val lng = r.lng ?: return null
    val rEarth = 6371.0
    val dLat = Math.toRadians(lat - TEACHER_HOME_LAT)
    val dLon = Math.toRadians(lng - TEACHER_HOME_LNG)
    val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(Math.toRadians(TEACHER_HOME_LAT)) * Math.cos(Math.toRadians(lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    return Math.round(rEarth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100.0) / 100.0
}

private fun moneyFcfa(v: Int) = "%,d F".format(v).replace(',', ' ')

@Composable
fun CourseRequestsScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    val marksPrefs = remember { context.getSharedPreferences(MARKS_PREFS, android.content.Context.MODE_PRIVATE) }

    var requests by remember { mutableStateOf<List<ci.monprofperso.app.data.TeacherRequestDto>?>(null) }
    var live by remember { mutableStateOf(false) }
    var needsConfirmed by remember { mutableStateOf(true) }
    var filterWeek by remember { mutableStateOf(true) }
    var filterWeekend by remember { mutableStateOf(true) }
    var filterVacations by remember { mutableStateOf(true) }
    var acceptCats by remember { mutableStateOf(true) }
    var acceptDogs by remember { mutableStateOf(true) }
    var hasVehicle by remember { mutableStateOf(false) }
    var showFilters by remember { mutableStateOf(false) }
    var consulting by remember { mutableStateOf<ci.monprofperso.app.data.TeacherRequestDto?>(null) }
    var marksTick by remember { mutableIntStateOf(0) }
    var toast by remember { mutableStateOf<String?>(null) }

    fun markOf(r: ci.monprofperso.app.data.TeacherRequestDto): String? {
        marksTick
        return marksPrefs.getString(offerKey(r), null)
    }

    fun setMark(r: ci.monprofperso.app.data.TeacherRequestDto, mark: String?) {
        marksPrefs.edit().apply {
            if (mark == null) remove(offerKey(r)) else putString(offerKey(r), mark)
        }.apply()
        marksTick++
    }

    suspend fun reload() {
        val fetched = runCatching { ci.monprofperso.app.data.Api.service.teacherRequests() }.getOrNull()
        live = fetched != null
        requests = fetched ?: fallbackRequests
        needsConfirmed = runCatching { Api.service.teacherDashboard() }.getOrNull()?.needsConfirmed != false
    }
    LaunchedEffect(Unit) { reload() }

    val raw = requests ?: emptyList()
    val opportunities = raw.filter { it.isOpportunity || it.needId != null }
    val filtered = opportunities.filter { r ->
        if (markOf(r) == "refused") return@filter false
        val whenOk = (filterWeek && r.availabilityWeek) ||
            (filterWeekend && r.availabilityWeekend) ||
            (filterVacations && r.availabilityHolidays)
        if (!whenOk) return@filter false
        if (!acceptCats && r.hasCat) return@filter false
        if (!acceptDogs && r.hasDog) return@filter false
        if (!isOnlineOffer(r)) {
            val d = distanceKm(r)
            if (!hasVehicle && d != null && d > NO_VEHICLE_MAX_KM) return@filter false
        }
        true
    }

    AkScreen(applyBottomInset = false) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Mes offres de cours", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, color = AkColors.Ink)
            Spacer(Modifier.width(10.dp))
            Text("${filtered.size}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.White,
                modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(AkColors.Orange).padding(horizontal = 9.dp, vertical = 3.dp))
            Spacer(Modifier.weight(1f))
            Text(
                "Filtres",
                fontFamily = Hanken,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = AkColors.Green,
                modifier = Modifier.clickable { showFilters = !showFilters }.padding(8.dp),
            )
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 8.dp)) {
            toast?.let {
                Text(it, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Green, modifier = Modifier.padding(bottom = 8.dp))
            }
            if (showFilters) {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.White)
                        .border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).padding(14.dp),
                ) {
                    Text("Quand ?", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
                    FilterCheck("Semaine scolaire", filterWeek) { filterWeek = it }
                    FilterCheck("Week-ends", filterWeekend) { filterWeekend = it }
                    FilterCheck("Vacances scolaires", filterVacations) { filterVacations = it }
                    Spacer(Modifier.height(8.dp))
                    Text("Préférences", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
                    FilterCheck("J'ai un véhicule", hasVehicle) { hasVehicle = it }
                    FilterCheck("Familles avec chats", acceptCats) { acceptCats = it }
                    FilterCheck("Familles avec chiens", acceptDogs) { acceptDogs = it }
                }
                Spacer(Modifier.height(12.dp))
            }
            if (requests == null) {
                LoadingRow()
            } else {
                if (!live) OfflineBanner(onRetry = { scope.launch { reload() } })
                if (!needsConfirmed) {
                    Text(
                        "Votre accès aux offres sera activé après validation par l'équipe.",
                        fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted, modifier = Modifier.padding(bottom = 12.dp),
                    )
                } else if (filtered.isEmpty()) {
                    Text("Aucune offre trouvée — ajustez vos filtres.", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Faint)
                }
            }
            filtered.forEach { r ->
                CompletudeOfferCard(
                    r = r,
                    distKm = distanceKm(r),
                    mark = markOf(r),
                    onConsult = { consulting = r },
                )
                Spacer(Modifier.height(13.dp))
            }
            Spacer(Modifier.height(16.dp))
        }
        TeacherBottomNav(TeacherTab.Demandes, nav::selectTeacherTab)
    }

    consulting?.let { r ->
        androidx.compose.ui.window.Dialog(onDismissRequest = { consulting = null }) {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.White).padding(20.dp),
            ) {
                Text("Détail de l'offre", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Green)
                Text(r.name.uppercase(), fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 4.dp))
                Spacer(Modifier.height(12.dp))
                DetailLine("Matière", r.subject ?: "—")
                DetailLine("Élève", r.student ?: "—")
                DetailLine("Format", if (isOnlineOffer(r)) "En ligne" else "À domicile")
                DetailLine("Rythme", listOfNotNull(r.frequency, r.duration).joinToString(" — ").ifBlank { "—" })
                DetailLine(
                    "Rémunération",
                    if (r.isOpportunity && r.netHourly != null) "${moneyFcfa(r.netHourly)}/h net" else moneyFcfa(r.price),
                )
                distanceKm(r)?.let { DetailLine("Distance", "%.2f km".format(it).replace('.', ',')) }
                Spacer(Modifier.height(14.dp))
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(AkColors.Green).clickable {
                        val id = r.needId ?: r.courseId
                        if (id != null) scope.launch {
                            runCatching { Api.service.acceptRequest(id) }
                                .onSuccess {
                                    setMark(r, null)
                                    toast = "Offre acceptée"
                                    consulting = null
                                    reload()
                                }
                                .onFailure { toast = it.message ?: "Erreur" }
                        }
                    }.padding(vertical = 14.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("Accepter cette offre", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.White)
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlineAction("Option", Modifier.weight(1f)) {
                        setMark(r, "option"); toast = "Option prise"; consulting = null
                    }
                    OutlineAction("Réflexion", Modifier.weight(1f)) {
                        setMark(r, "thinking"); toast = "Mise en réflexion"; consulting = null
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlineAction("Refuser / masquer", Modifier.fillMaxWidth()) {
                    if (!r.isOpportunity) {
                        val id = r.courseId
                        if (id != null) scope.launch {
                            runCatching { Api.service.refuseRequest(id) }.onSuccess { reload() }
                        }
                    }
                    setMark(r, "refused"); toast = "Offre masquée"; consulting = null
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    "Fermer",
                    fontFamily = Hanken,
                    fontSize = 13.sp,
                    color = AkColors.Muted,
                    modifier = Modifier.align(Alignment.CenterHorizontally).clickable { consulting = null }.padding(8.dp),
                )
            }
        }
    }
}

@Composable
private fun FilterCheck(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable { onChange(!checked) }.padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.material3.Checkbox(
            checked = checked,
            onCheckedChange = onChange,
            colors = androidx.compose.material3.CheckboxDefaults.colors(checkedColor = AkColors.Green),
        )
        Text(label, fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Ink)
    }
}

@Composable
private fun OutlineAction(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier.clip(RoundedCornerShape(12.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Ink)
    }
}

@Composable
private fun CompletudeOfferCard(
    r: ci.monprofperso.app.data.TeacherRequestDto,
    distKm: Double?,
    mark: String?,
    onConsult: () -> Unit,
) {
    val priceLabel = if (r.isOpportunity && r.netHourly != null)
        "${moneyFcfa(r.netHourly)}/h net"
    else moneyFcfa(r.price)
    val freq = listOfNotNull(r.frequency, r.duration).joinToString(" - ").ifBlank {
        if (isOnlineOffer(r)) "En ligne" else "À domicile"
    }
    val ref = "Réf. ${2000 + (r.needId ?: r.courseId ?: 0)}"
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Text(r.name.uppercase(), fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
            if (distKm != null) {
                Text(
                    "%.2f km".format(distKm).replace('.', ','),
                    fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Text("${r.subject ?: "—"} · ${r.student ?: "—"}", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Ink)
        Text("$freq  ·  $priceLabel", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 4.dp))
        Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (r.availabilityWeek) AvailBadge("SE")
            if (r.availabilityWeekend) AvailBadge("WE")
            if (r.availabilityHolidays) AvailBadge("VS")
        }
        if (r.hasCat || r.hasDog) {
            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (r.hasCat) PetBadge("Chat")
                if (r.hasDog) PetBadge("Chien")
            }
        }
        mark?.let {
            val label = when (it) {
                "option" -> "Option"
                "thinking" -> "En réflexion"
                "refused" -> "Refusée"
                else -> it
            }
            Text(label.uppercase(), fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AkColors.Green, modifier = Modifier.padding(top = 6.dp))
        }
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("$ref — ${r.ago}", fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Faint)
            Box(
                Modifier.clip(RoundedCornerShape(10.dp)).background(AkColors.Green).clickable(onClick = onConsult)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text("CONSULTER", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.White)
            }
        }
    }
}

@Composable
private fun AvailBadge(label: String) {
    Box(
        Modifier.size(28.dp).clip(RoundedCornerShape(999.dp)).background(AkColors.Green),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = AkColors.White)
    }
}

@Composable
private fun PetBadge(label: String) {
    Box(
        Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0xFF4A90D9)).padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, color = AkColors.White)
    }
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
