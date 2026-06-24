@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.AddCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.nav.Routes
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ====================================================================== *
 * ÉCRAN 12 — MES COURS
 * ====================================================================== */
@Composable
fun MyCoursesScreen(nav: NavActions, vm: ci.monprofperso.app.data.CoursesViewModel = androidx.lifecycle.viewmodel.compose.viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    var tab by remember { mutableIntStateOf(0) }
    val courses = (state as? ci.monprofperso.app.data.UiState.Success)?.data ?: ci.monprofperso.app.data.FallbackData.courses
    val upcoming = courses.filter { it.status == "upcoming" }
    val done = courses.firstOrNull { it.status == "done" }
    AkScreen(applyBottomInset = false) {
        Text("Mes cours", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp,
            color = AkColors.Ink, modifier = Modifier.padding(horizontal = 22.dp, vertical = 8.dp))
        Row(Modifier.padding(horizontal = 22.dp).padding(bottom = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PillTab("À venir", tab == 0) { tab = 0 }; PillTab("Terminés", tab == 1) { tab = 1 }
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            upcoming.getOrNull(0)?.let { c ->
                // upcoming highlighted (1er cours)
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.White)
                    .border(1.5.dp, AkColors.Green, RoundedCornerShape(20.dp)).padding(16.dp)) {
                    Row(Modifier.fillMaxWidth()) {
                        DateTile(c.dayLabel, c.dayNum, true)
                        Spacer(Modifier.width(13.dp))
                        Column(Modifier.weight(1f)) {
                            Text("${c.subject} · ${c.level}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AkColors.Ink)
                            Text("avec ${c.teacherName}", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 2.dp))
                        }
                        if (c.badge != null) Tag(c.badge, AkColors.Orange, AkColors.OrangeSoft)
                    }
                    CourseMeta(c)
                    Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        Box(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(AkColors.Green).clickable { nav.go(Routes.ManageCourse) }.padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                            Text("Détails du cours", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.White)
                        }
                        Box(Modifier.size(46.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(12.dp)).clickable { nav.go(Routes.Messaging) }, contentAlignment = Alignment.Center) {
                            Icon(Icons.AutoMirrored.Filled.Chat, null, tint = AkColors.Green, modifier = Modifier.size(19.dp))
                        }
                    }
                }
            }
            upcoming.getOrNull(1)?.let { c ->
                Spacer(Modifier.height(13.dp))
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(20.dp)).clickable { nav.go(Routes.OnlineCourse) }.padding(16.dp)) {
                    Row {
                        DateTile(c.dayLabel, c.dayNum, false)
                        Spacer(Modifier.width(13.dp))
                        Column(Modifier.weight(1f)) {
                            Text("${c.subject} · ${c.level}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AkColors.Ink)
                            Text("avec ${c.teacherName}", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                    CourseMeta(c)
                }
            }
            Spacer(Modifier.height(20.dp))
            Text("Terminé récemment", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(44.dp).clip(RoundedCornerShape(13.dp)).background(AkColors.CardField), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Faint, modifier = Modifier.size(22.dp))
                }
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) {
                    Text("${done?.subject ?: "Maths"} · 14 juin", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("avec ${done?.teacherName ?: "Koffi N'Guessan"}", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                }
                Text("Noter", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Orange,
                    modifier = Modifier.clip(RoundedCornerShape(10.dp)).border(1.dp, Color(0xFFF3C9A8), RoundedCornerShape(10.dp)).clickable { nav.go(Routes.Review) }.padding(horizontal = 12.dp, vertical = 7.dp))
            }
            Spacer(Modifier.height(16.dp))
        }
        BottomNav(NavTab.Cours, nav::selectTab)
    }
}

/** Ligne « horaire · format » d'une carte de cours. */
@Composable
private fun CourseMeta(c: ci.monprofperso.app.data.CourseDto) {
    Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Filled.Schedule, null, tint = AkColors.Green, modifier = Modifier.size(15.dp))
        Text(" ${c.time} · ${c.duration} ", fontFamily = Hanken, fontSize = 12.5.sp, color = Color(0xFF4A574F))
        Text("·", color = Color(0xFFD8D2C8))
        Icon(if (c.format == "online") Icons.Filled.Videocam else Icons.Filled.Home, null, tint = AkColors.Green, modifier = Modifier.size(15.dp).padding(start = 4.dp))
        Text(if (c.format == "online") " En ligne" else " ${c.location ?: "À domicile"}", fontFamily = Hanken, fontSize = 12.5.sp, color = Color(0xFF4A574F))
    }
}

@Composable
fun PillTab(label: String, selected: Boolean, onClick: () -> Unit = {}) {
    Text(label, fontFamily = Hanken, fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold, fontSize = 13.sp,
        color = if (selected) AkColors.White else AkColors.Muted,
        modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(if (selected) AkColors.Green else AkColors.White)
            .then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(999.dp)))
            .clickable { onClick() }
            .padding(horizontal = 18.dp, vertical = 9.dp))
}

@Composable
private fun DateTile(day: String, num: String, green: Boolean) {
    Column(Modifier.size(50.dp).clip(RoundedCornerShape(14.dp)).background(if (green) AkColors.GreenSoft else AkColors.OrangeSoft),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(day, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 10.sp, color = if (green) AkColors.Green else AkColors.Orange)
        Text(num, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = if (green) AkColors.Green else AkColors.Orange)
    }
}

/* ====================================================================== *
 * ÉCRAN 13 — COURS EN LIGNE (VISIO)
 * ====================================================================== */
@Composable
fun OnlineCourseScreen(nav: NavActions) {
    AkScreen(background = Color(0xFF141A17)) {
        // top status pill
        Row(Modifier.fillMaxWidth().padding(top = 6.dp, bottom = 12.dp), horizontalArrangement = Arrangement.Center) {
            Row(Modifier.clip(RoundedCornerShape(999.dp)).background(AkColors.White.copy(alpha = 0.1f)).padding(horizontal = 15.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(7.dp).clip(CircleShape).background(AkColors.Orange))
                Text("  Maths · 3ᵉ    ·    12:45", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, color = AkColors.White)
            }
        }
        Box(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp).clip(RoundedCornerShape(26.dp))
            .background(Brush.radialGradient(listOf(Color(0xFF1F6B52), Color(0xFF0C2C20))))) {
            // main avatar
            Box(Modifier.align(Alignment.Center).size(104.dp).clip(CircleShape).background(AkColors.OrangeLight), contentAlignment = Alignment.Center) {
                Text("KN", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 38.sp, color = AkColors.Green)
            }
            // name label
            Row(Modifier.align(Alignment.BottomStart).padding(14.dp).clip(RoundedCornerShape(10.dp)).background(Color.Black.copy(alpha = 0.4f)).padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Mic, null, tint = AkColors.White, modifier = Modifier.size(14.dp))
                Text("  Koffi N'Guessan", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.White)
            }
            // self PIP
            Column(Modifier.align(Alignment.TopEnd).padding(14.dp).size(width = 92.dp, height = 124.dp).clip(RoundedCornerShape(18.dp))
                .background(Brush.linearGradient(listOf(Color(0xFF3A2A1E), Color(0xFF1A130D)))).border(1.5.dp, AkColors.White.copy(alpha = 0.15f), RoundedCornerShape(18.dp)),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Box(Modifier.size(46.dp).clip(CircleShape).background(AkColors.GreenSoft), contentAlignment = Alignment.Center) {
                    Text("AK", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = AkColors.Green)
                }
                Spacer(Modifier.height(9.dp))
                Text("Vous", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, color = AkColors.White)
            }
            // recording indicator
            Row(Modifier.align(Alignment.TopStart).padding(14.dp).clip(RoundedCornerShape(9.dp)).background(Color.Black.copy(alpha = 0.35f)).padding(horizontal = 11.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).clip(CircleShape).background(AkColors.Orange))
                Text("  Enregistré", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, color = AkColors.White)
            }
        }
        // controls
        Row(Modifier.fillMaxWidth().padding(horizontal = 26.dp).padding(top = 24.dp, bottom = 24.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            CallButton(Icons.Filled.Mic)
            CallButton(Icons.Filled.Videocam)
            CallButton(Icons.Filled.Edit)
            CallButton(Icons.Filled.ChatBubble)
            CallButton(Icons.Filled.CallEnd, bg = Color(0xFFE0392B), onClick = { nav.go(Routes.Review) })
        }
    }
}

@Composable
private fun CallButton(icon: ImageVector, bg: Color = AkColors.White.copy(alpha = 0.12f), onClick: () -> Unit = {}) {
    Box(Modifier.size(54.dp).clip(CircleShape).background(bg).clickable { onClick() }, contentAlignment = Alignment.Center) {
        Icon(icon, null, tint = AkColors.White, modifier = Modifier.size(23.dp))
    }
}

/* ====================================================================== *
 * ÉCRAN 14 — MESSAGERIE
 * ====================================================================== */
@Composable
fun MessagingScreen(nav: NavActions) {
    AkScreen {
        // header
        Row(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 18.dp).padding(top = 6.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = AkColors.Ink, modifier = Modifier.size(20.dp).clickable { nav.back() })
            Spacer(Modifier.width(11.dp))
            Box {
                InitialsAvatar("KN", size = 42, radius = 12, fontSize = 15)
                Box(Modifier.align(Alignment.BottomEnd).size(11.dp).clip(CircleShape).background(Color(0xFF22A55D)).border(2.dp, AkColors.White, CircleShape))
            }
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f)) {
                Text("Koffi N'Guessan", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
                Text("En ligne", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, color = Color(0xFF22A55D))
            }
            Icon(Icons.Filled.Call, null, tint = AkColors.Green, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(16.dp))
            Icon(Icons.Filled.Videocam, null, tint = AkColors.Green, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 18.dp).padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text("Aujourd'hui", fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Faint,
                    modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0xFFEAE5DC)).padding(horizontal = 12.dp, vertical = 4.dp))
            }
            Bubble("Bonjour Madame Koné ! Pour samedi, votre fils peut réviser les fonctions affines avant le cours ?", false)
            Bubble("Bonjour Koffi, oui bien sûr. Il a un peu de mal avec les graphiques.", true)
            // pdf bubble
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterStart) {
                Row(Modifier.widthIn(max = 260.dp).clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).padding(11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(AkColors.OrangeSoft), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.PictureAsPdf, null, tint = AkColors.Orange, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(11.dp))
                    Column {
                        Text("Exercices_fonctions.pdf", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Ink)
                        Text("PDF · 240 Ko", fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Faint)
                    }
                }
            }
            Bubble("Parfait, on travaillera ça ensemble. À samedi !", false)
            Bubble("Merci beaucoup, à samedi.", true)
        }
        // input
        Row(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 16.dp).padding(top = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.AddCircle, null, tint = AkColors.Faint, modifier = Modifier.size(26.dp))
            Spacer(Modifier.width(10.dp))
            Text("Votre message…", fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.Faint,
                modifier = Modifier.weight(1f).clip(RoundedCornerShape(999.dp)).background(AkColors.CardField).padding(horizontal = 16.dp, vertical = 11.dp))
            Spacer(Modifier.width(10.dp))
            Box(Modifier.size(44.dp).clip(CircleShape).background(AkColors.Orange), contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Filled.Send, null, tint = AkColors.White, modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
private fun Bubble(text: String, sent: Boolean) {
    Box(Modifier.fillMaxWidth(), contentAlignment = if (sent) Alignment.CenterEnd else Alignment.CenterStart) {
        Text(text, fontFamily = Hanken, fontSize = 13.5.sp, lineHeight = 20.sp,
            color = if (sent) AkColors.White else AkColors.Ink,
            modifier = Modifier.widthIn(max = 280.dp)
                .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp, bottomStart = if (sent) 16.dp else 4.dp, bottomEnd = if (sent) 4.dp else 16.dp))
                .background(if (sent) AkColors.Green else AkColors.White)
                .then(if (sent) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp, bottomStart = 4.dp, bottomEnd = 16.dp)))
                .padding(horizontal = 14.dp, vertical = 11.dp))
    }
}

/* ====================================================================== *
 * ÉCRAN 15 — LAISSER UN AVIS
 * ====================================================================== */
@Composable
fun ReviewScreen(nav: NavActions) {
    var rating by remember { mutableIntStateOf(5) }
    var qualities by remember { mutableStateOf(setOf(0, 1, 3)) }
    val labels = listOf("Excellent !", "Très bien", "Bien", "Moyen", "À améliorer")
    AkScreen {
        TopBar("Votre avis", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            InitialsAvatar("KN", size = 64, radius = 18, fontSize = 23)
            Spacer(Modifier.height(12.dp))
            Text("Koffi N'Guessan", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = AkColors.Ink)
            Text("Cours de Maths · 14 juin", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 2.dp))
            Spacer(Modifier.height(22.dp))
            Text("Comment s'est passé le cours ?", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AkColors.Ink)
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                (1..5).forEach { star ->
                    Icon(Icons.Filled.Star, null, tint = if (star <= rating) AkColors.Star else AkColors.Border,
                        modifier = Modifier.size(36.dp).clickable { rating = star })
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(labels[5 - rating], fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
            Spacer(Modifier.height(20.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 3, modifier = Modifier.fillMaxWidth()) {
                listOf("Ponctuel", "Pédagogue", "Patient", "Explications claires").forEachIndexed { i, label ->
                    QualityChip(label, i in qualities) { qualities = if (i in qualities) qualities - i else qualities + i }
                }
            }
            Spacer(Modifier.height(20.dp))
            Box(Modifier.fillMaxWidth().height(88.dp).clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).padding(14.dp)) {
                Text("Partagez votre expérience pour aider les autres parents (optionnel)…", fontFamily = Hanken, fontSize = 13.sp, lineHeight = 20.sp, color = AkColors.Faint)
            }
            Spacer(Modifier.height(16.dp))
        }
        Box(Modifier.padding(horizontal = 22.dp).padding(bottom = 26.dp)) {
            PrimaryButton("Envoyer mon avis", Modifier.fillMaxWidth(), trailingIcon = null, onClick = { nav.go(Routes.MyCourses) })
        }
    }
}

@Composable
private fun QualityChip(label: String, selected: Boolean, onClick: () -> Unit = {}) {
    Text(label, fontFamily = Hanken, fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold, fontSize = 12.5.sp,
        color = if (selected) AkColors.White else AkColors.InkSoft,
        modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(if (selected) AkColors.Green else AkColors.White)
            .then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(999.dp)))
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 8.dp))
}
