package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.nav.Routes
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ====================================================================== *
 * ÉCRAN 26 — COURS EN GROUPE (LISTE)
 * ====================================================================== */
private data class Group(
    val tag: String, val tagGreen: Boolean, val price: String, val title: String, val detail: String,
    val teacherInitials: String, val teacherGreen: Boolean, val teacherName: String,
    val enrolled: String?, val left: String?, val leftWarn: Boolean, val fraction: Float,
)

@Composable
fun GroupCoursesScreen(nav: NavActions) {
    var filter by remember { mutableIntStateOf(0) }
    AkScreen {
        TopBar("Cours en groupe", subtitle = "Prépa examens en petit comité", onBack = { nav.back() })
        Row(Modifier.padding(horizontal = 22.dp).padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Tous", "BEPC", "BAC", "Vacances").forEachIndexed { i, l -> PillTab(l, filter == i) { filter = i } }
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            GroupCard(Group("PRÉPA BAC", false, "2 000 F", "Maths & Physique-Chimie", "Terminale D · 8 semaines · Sam & Dim", "KN", true, "Koffi N'Guessan", "9 / 12 inscrits", "3 places restantes", true, 0.75f)) { nav.go(Routes.GroupDetail) }
            Spacer(Modifier.height(13.dp))
            GroupCard(Group("PRÉPA BEPC", true, "1 500 F", "Maths intensif", "3ᵉ · 6 semaines · Mer & Sam", "ID", false, "Ibrahim Diallo", "6 / 10 inscrits", "4 places restantes", false, 0.60f)) { nav.go(Routes.GroupDetail) }
            Spacer(Modifier.height(13.dp))
            GroupCard(Group("VACANCES", true, "1 500 F", "Stage de Français", "Collège · 2 semaines · Lun → Ven", "", true, "", null, null, false, 0f)) { nav.go(Routes.GroupDetail) }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun GroupCard(g: Group, onClick: () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(20.dp)).clickable { onClick() }.padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Tag(g.tag, if (g.tagGreen) AkColors.Green else AkColors.Orange, if (g.tagGreen) AkColors.GreenSoft else AkColors.OrangeSoft)
            Row(verticalAlignment = Alignment.Bottom) {
                Text(g.price, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = AkColors.Green)
                Text("/séance", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, color = AkColors.Faint)
            }
        }
        Text(g.title, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 16.5.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 11.dp))
        Text(g.detail, fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 2.dp))
        if (g.teacherName.isNotEmpty()) {
            Row(Modifier.padding(top = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                InitialsAvatar(g.teacherInitials, size = 30, radius = 9, fontSize = 11, bg = if (g.teacherGreen) AkColors.GreenSoft else AkColors.OrangeSoft, fg = if (g.teacherGreen) AkColors.Green else AkColors.Orange)
                Spacer(Modifier.width(8.dp))
                Text("avec ${g.teacherName}", fontFamily = Hanken, fontSize = 12.sp, color = Color(0xFF4A574F))
            }
        }
        if (g.enrolled != null) {
            Column(Modifier.padding(top = 13.dp)) {
                Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(g.enrolled, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Muted)
                    Text(g.left ?: "", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = if (g.leftWarn) AkColors.Orange else AkColors.Green)
                }
                Box(Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(4.dp)).background(Color(0xFFEAE5DC))) {
                    Box(Modifier.fillMaxHeight().fillMaxWidth(g.fraction).clip(RoundedCornerShape(4.dp)).background(AkColors.Green))
                }
            }
        }
    }
}

/* ====================================================================== *
 * ÉCRAN 27 — DÉTAIL DU GROUPE
 * ====================================================================== */
@Composable
fun GroupDetailScreen(nav: NavActions) {
    AkScreen(applyTopInset = false) {
        Column(Modifier.fillMaxWidth().background(AkColors.Green).statusBarsPaddingCompat().padding(horizontal = 22.dp).padding(top = 6.dp, bottom = 20.dp)) {
            IconSquare(Icons.AutoMirrored.Filled.ArrowBack, bg = AkColors.White.copy(alpha = 0.14f), tint = AkColors.White, onClick = { nav.back() })
            Spacer(Modifier.height(14.dp))
            Pill("PRÉPA BAC 2026", AkColors.Green, AkColors.OrangeLight)
            Text("Maths & Physique-Chimie", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, lineHeight = 26.sp, color = AkColors.White, modifier = Modifier.padding(top = 10.dp))
            Text("Terminale D · groupe de 12 max", fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.OnGreenSoft, modifier = Modifier.padding(top = 4.dp))
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                InfoTile(Icons.Filled.DateRange, "8 sem.", Modifier.weight(1f))
                InfoTile(Icons.Filled.Schedule, "Sam–Dim", Modifier.weight(1f))
                InfoTile(Icons.Filled.Groups, "12 max", Modifier.weight(1f))
            }
            Spacer(Modifier.height(13.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(AkColors.OrangeSoft).padding(horizontal = 15.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.LocalFireDepartment, null, tint = AkColors.Orange, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(11.dp))
                Column {
                    Text("3 places restantes", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Ink)
                    Text("9 élèves déjà inscrits · démarre le 6 juillet", fontFamily = Hanken, fontSize = 11.5.sp, color = Color(0xFF8A5B33))
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                InitialsAvatar("KN", size = 46, radius = 13, fontSize = 16, verified = true)
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text("Koffi N'Guessan", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("94% de réussite au BAC", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                }
                RatingInline("4,9")
            }
            Spacer(Modifier.height(18.dp))
            Text("Programme", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            ProgramRow("1", "Fonctions, limites & continuité")
            ProgramRow("2", "Probabilités & suites")
            ProgramRow("3", "Annales & sujets type BAC")
            Spacer(Modifier.height(16.dp))
        }
        Row(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp), verticalAlignment = Alignment.CenterVertically) {
            Column {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text("2 000 F", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = AkColors.Ink)
                    Text("/séance", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.Faint)
                }
                Text("payable par séance", fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Muted)
            }
            Spacer(Modifier.width(14.dp))
            PrimaryButton("Réserver ma place", Modifier.weight(1f), trailingIcon = null, onClick = { nav.go(Routes.Payment) })
        }
    }
}

@Composable
private fun InfoTile(icon: ImageVector, label: String, modifier: Modifier = Modifier) {
    Column(modifier.clip(RoundedCornerShape(14.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(14.dp)).padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, null, tint = AkColors.Green, modifier = Modifier.size(19.dp))
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 5.dp))
    }
}

@Composable
private fun ProgramRow(num: String, text: String) {
    Row(Modifier.padding(bottom = 9.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(24.dp).clip(RoundedCornerShape(8.dp)).background(AkColors.GreenSoft), contentAlignment = Alignment.Center) {
            Text(num, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 11.sp, color = AkColors.Green)
        }
        Spacer(Modifier.width(10.dp))
        Text(text, fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Ink)
    }
}

/* ====================================================================== *
 * ÉCRAN 28 — AGENDA & DISPONIBILITÉS
 * ====================================================================== */
@Composable
fun AgendaScreen(nav: NavActions) {
    var agendaDay by remember { mutableIntStateOf(4) }
    AkScreen(applyBottomInset = false) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Mon agenda", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Juin ", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Ink)
                Icon(Icons.Filled.KeyboardArrowDown, null, tint = AkColors.Ink, modifier = Modifier.size(16.dp))
            }
        }
        Row(Modifier.padding(horizontal = 22.dp).padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("LUN" to "17", "MAR" to "18", "MER" to "19", "VEN" to "20", "SAM" to "22", "DIM" to "23")
                .forEachIndexed { i, (d, n) -> AgendaDay(d, n, agendaDay == i, Modifier.weight(1f)) { agendaDay = i } }
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Text("Samedi 22 juin", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink, modifier = Modifier.padding(bottom = 11.dp))
            AgendaSlot("10:00", "Awa · Maths 2nde", "1h30 · à domicile, Marcory")
            AgendaSlot("16:00", "Kouadio · Maths 3ᵉ", "1h30 · à domicile, Cocody")
            // open slot
            Row(Modifier.fillMaxWidth().padding(bottom = 11.dp)) {
                Text("18:00", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFFC0B9AC), modifier = Modifier.width(40.dp).padding(top = 13.dp))
                Spacer(Modifier.width(12.dp))
                Row(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).border(1.5.dp, Color(0xFFC9C2B5), RoundedCornerShape(12.dp)).padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Add, null, tint = AkColors.Green, modifier = Modifier.size(15.dp))
                    Text("  Ouvrir un créneau", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = AkColors.Green)
                }
            }
            Spacer(Modifier.height(7.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(AkColors.GreenSoft).border(1.dp, AkColors.Green, RoundedCornerShape(14.dp)).padding(13.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Tune, null, tint = AkColors.Green, modifier = Modifier.size(17.dp))
                Text("  Définir mes disponibilités récurrentes", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Green)
            }
            Spacer(Modifier.height(16.dp))
        }
        TeacherBottomNav(TeacherTab.Agenda, nav::selectTeacherTab)
    }
}

@Composable
private fun AgendaDay(day: String, num: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Column(modifier.clip(RoundedCornerShape(12.dp)).background(if (selected) AkColors.Green else AkColors.White).then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(12.dp))).clickable { onClick() }.padding(vertical = 9.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(day, fontFamily = Hanken, fontSize = 10.sp, color = if (selected) AkColors.OnGreenSoft else AkColors.Faint)
        Text(num, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = if (selected) AkColors.White else AkColors.Ink)
    }
}

@Composable
private fun AgendaSlot(time: String, title: String, detail: String) {
    Row(Modifier.fillMaxWidth().padding(bottom = 11.dp)) {
        Text(time, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Muted, modifier = Modifier.width(40.dp).padding(top = 13.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(12.dp)).padding(start = 0.dp)) {
            Row {
                Box(Modifier.width(3.dp).height(50.dp).background(AkColors.Green))
                Column(Modifier.padding(horizontal = 13.dp, vertical = 12.dp)) {
                    Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink)
                    Text(detail, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Muted)
                }
            }
        }
    }
}
