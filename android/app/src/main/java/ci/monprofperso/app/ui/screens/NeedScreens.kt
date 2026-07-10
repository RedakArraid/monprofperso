package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.data.Api
import ci.monprofperso.app.data.ChildDto
import ci.monprofperso.app.data.NeedDto
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.nav.Routes
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted
import kotlinx.coroutines.launch

private fun fcfa(n: Int) = "%,d F".format(n).replace(',', ' ')

private val needStatusLabel = mapOf(
    "submitted" to "En analyse",
    "priced" to "Tarif proposé",
    "published" to "Recherche prof",
    "matched" to "Prof trouvé",
    "cancelled" to "Annulé",
)

@Composable
fun MyChildrenScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var children by remember { mutableStateOf<List<ChildDto>?>(null) }
    LaunchedEffect(Unit) { children = runCatching { Api.service.children() }.getOrNull() }
    AkScreen {
        TopBar("Mes enfants", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp)) {
            if (children == null) LoadingRow()
            children?.forEach { c ->
                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp).clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                    InitialsAvatar(c.name.take(2).uppercase(), size = 44, radius = 13, fontSize = 15)
                    Spacer(Modifier.width(13.dp))
                    Column(Modifier.weight(1f)) {
                        Text(c.name, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("${c.level}${c.school?.let { " · $it" } ?: ""}", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).border(1.5.dp, AkColors.Border, RoundedCornerShape(15.dp)).clickable { nav.go(Routes.ExpressNeed) }.padding(12.dp), horizontalArrangement = Arrangement.Center) {
                Icon(Icons.Filled.Add, null, tint = AkColors.Green, modifier = Modifier.size(16.dp))
                Text("  Exprimer un besoin", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
            }
        }
    }
}

@Composable
fun ExpressNeedScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var children by remember { mutableStateOf<List<ChildDto>>(emptyList()) }
    var childId by remember { mutableIntStateOf(0) }
    var name by remember { mutableStateOf("") }
    var level by remember { mutableStateOf("3eme") }
    var subject by remember { mutableStateOf("Maths") }
    var format by remember { mutableStateOf("home") }
    var location by remember { mutableStateOf("Cocody") }
    var frequency by remember { mutableStateOf("1 fois/sem") }
    var duration by remember { mutableStateOf("2h00") }
    var description by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        children = runCatching { Api.service.children() }.getOrNull() ?: emptyList()
        childId = children.firstOrNull()?.id ?: 0
    }

    AkScreen {
        TopBar("Exprimer un besoin", subtitle = "Décrivez le besoin de votre enfant", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp)) {
            Text("Enfant", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            if (children.isEmpty()) {
                AkField("Prénom de l'enfant", name) { name = it }
                AkField("Niveau (ex. 3eme)", level) { level = it }
            } else {
                children.forEach { c ->
                    val sel = childId == c.id
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp).clip(RoundedCornerShape(12.dp))
                        .background(if (sel) AkColors.GreenSoft else AkColors.White)
                        .border(1.dp, if (sel) AkColors.Green else AkColors.Border, RoundedCornerShape(12.dp))
                        .clickable { childId = c.id }.padding(12.dp)) {
                        Text(c.name, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink)
                        Text(" · ${c.level}", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            AkField("Matière", subject) { subject = it }
            AkField("Niveau scolaire", level) { level = it }
            AkField("Lieu (commune)", location) { location = it }
            AkField("Fréquence", frequency) { frequency = it }
            AkField("Durée par séance", duration) { duration = it }
            AkField("Précisions (objectifs, créneaux…)", description) { description = it }
            error?.let { Text(it, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Orange, modifier = Modifier.padding(top = 8.dp)) }
            Spacer(Modifier.height(16.dp))
            PrimaryButton(if (sending) "Envoi…" else "Envoyer ma demande", enabled = !sending) {
                scope.launch {
                    sending = true; error = null
                    try {
                        var cid = childId.takeIf { it > 0 }
                        if (cid == null && name.isNotBlank()) {
                            cid = Api.service.createChild(mapOf("name" to name, "level" to level)).id
                        }
                        Api.service.createNeed(mapOf(
                            "childId" to cid,
                            "subject" to subject,
                            "level" to level,
                            "format" to format,
                            "location" to location,
                            "frequency" to frequency,
                            "duration" to duration,
                            "description" to description.ifBlank { null },
                        ))
                        nav.go(Routes.MyNeeds)
                    } catch (e: Exception) { error = e.message }
                    sending = false
                }
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
fun MyNeedsScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var needs by remember { mutableStateOf<List<NeedDto>?>(null) }
    suspend fun reload() { needs = runCatching { Api.service.needs() }.getOrNull() }
    LaunchedEffect(Unit) { reload() }
    AkScreen {
        TopBar("Mes demandes", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp)) {
            if (needs == null) LoadingRow()
            needs?.forEach { n ->
                NeedCard(n, onAccept = {
                    scope.launch { runCatching { Api.service.acceptNeedPrice(n.id) }.onSuccess { reload() } }
                })
                Spacer(Modifier.height(12.dp))
            }
            PrimaryButton("Nouvelle demande") { nav.go(Routes.ExpressNeed) }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun NeedCard(n: NeedDto, onAccept: () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).padding(15.dp)) {
        Text(n.reference, fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Faint)
        Text("${n.subject} · ${n.level}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AkColors.Ink)
        Text(needStatusLabel[n.status] ?: n.status, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 4.dp))
        if (n.parentPrice != null) {
            Text("Tarif proposé : ${fcfa(n.parentPrice)} / séance", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 8.dp))
            n.netTeacherAmount?.let { Text("Gain prof (net) : ${fcfa(it)}", fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Faint) }
        }
        if (n.status == "priced") {
            Spacer(Modifier.height(12.dp))
            PrimaryButton("Accepter ce tarif", onClick = onAccept)
        }
    }
}

@Composable
private fun AkField(label: String, value: String, onChange: (String) -> Unit) {
    Text(label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 10.dp, bottom = 6.dp))
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 12.dp)) {
        androidx.compose.foundation.text.BasicTextField(value, onChange, modifier = Modifier.fillMaxWidth(), textStyle = androidx.compose.ui.text.TextStyle(fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Ink))
    }
}
