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
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
 * ÉCRAN 34 — CENTRE D'AIDE & FAQ
 * ====================================================================== */
@Composable
fun HelpFaqScreen(nav: NavActions) {
    AkScreen {
        TopBar("Centre d'aide", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Search, null, tint = AkColors.Faint, modifier = Modifier.size(20.dp))
                Text("  Une question ? Cherchez ici…", fontFamily = Hanken, fontSize = 14.5.sp, color = AkColors.Faint)
            }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                Column(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(AkColors.Green).padding(horizontal = 13.dp, vertical = 15.dp)) {
                    Icon(Icons.Filled.ChatBubble, null, tint = AkColors.White, modifier = Modifier.size(22.dp))
                    Text("Chat support", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.White, modifier = Modifier.padding(top = 8.dp))
                    Text("Réponse en ~5 min", fontFamily = Hanken, fontSize = 11.sp, color = AkColors.OnGreenSoft, modifier = Modifier.padding(top = 1.dp))
                }
                Column(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).padding(horizontal = 13.dp, vertical = 15.dp)) {
                    Icon(Icons.AutoMirrored.Filled.Chat, null, tint = Color(0xFF22A55D), modifier = Modifier.size(22.dp))
                    Text("WhatsApp", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 8.dp))
                    Text("07 07 00 12 34", fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Faint, modifier = Modifier.padding(top = 1.dp))
                }
            }
            Spacer(Modifier.height(20.dp))
            Text("Questions fréquentes", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(12.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp))) {
                Column(Modifier.padding(15.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Comment fonctionne le paiement ?", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
                        Icon(Icons.Filled.Remove, null, tint = AkColors.Green, modifier = Modifier.size(16.dp))
                    }
                    Text("Vous payez via Orange Money, Wave ou MTN. L'argent n'est versé au professeur qu'après le cours.",
                        fontFamily = Hanken, fontSize = 12.5.sp, lineHeight = 19.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 9.dp))
                }
                FaqDivider()
                FaqQuestion("Puis-je annuler un cours ?")
                FaqDivider()
                FaqQuestion("Les professeurs sont-ils vérifiés ?")
                FaqDivider()
                FaqQuestion("Comment résilier mon abonnement ?")
            }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.GreenSoft).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Flag, null, tint = AkColors.Green, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text("Signaler un problème", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Ink)
                    Text("Litige, comportement, paiement…", fontFamily = Hanken, fontSize = 11.5.sp, color = Color(0xFF3F6B59))
                }
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = AkColors.Green, modifier = Modifier.size(16.dp))
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun FaqQuestion(q: String) {
    Row(Modifier.fillMaxWidth().padding(15.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(q, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
        Icon(Icons.Filled.Add, null, tint = AkColors.Faint, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun FaqDivider() = Box(Modifier.fillMaxWidth().padding(horizontal = 15.dp).height(1.dp).background(AkColors.CardField))

/* ====================================================================== *
 * ÉCRAN 35 — PARAMÈTRES
 * ====================================================================== */
@Composable
fun SettingsScreen(nav: NavActions) {
    AkScreen {
        TopBar("Paramètres", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            SettingsGroupLabel("Notifications")
            SettingsCard {
                ToggleRow(Icons.Filled.Notifications, "Rappels de cours", on = true)
                FaqDivider()
                ToggleRow(Icons.AutoMirrored.Filled.Chat, "Messages", on = true)
                FaqDivider()
                ToggleRow(Icons.Filled.Campaign, "Promotions", on = false, iconMuted = true)
            }
            SettingsGroupLabel("Préférences", top = 18)
            SettingsCard {
                ValueRow(Icons.Filled.Translate, "Langue", "Français")
                FaqDivider()
                ToggleRow(Icons.Filled.NetworkCell, "Mode éco-data", on = true, subtitle = "Réduit la consommation de données")
                FaqDivider()
                ToggleRow(Icons.Filled.DarkMode, "Thème sombre", on = false, iconMuted = true)
            }
            SettingsGroupLabel("Compte", top = 18)
            SettingsCard {
                NavRow(Icons.Filled.Lock, "Confidentialité & sécurité")
                FaqDivider()
                NavRow(Icons.Filled.Description, "Conditions & mentions légales")
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SettingsGroupLabel(text: String, top: Int = 0) {
    if (top > 0) Spacer(Modifier.height(top.dp))
    Text(text.uppercase(), fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Faint, modifier = Modifier.padding(bottom = 11.dp))
}

@Composable
private fun SettingsCard(content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)), content = content)
}

@Composable
private fun ToggleRow(icon: ImageVector, label: String, on: Boolean, subtitle: String? = null, iconMuted: Boolean = false) {
    var checked by remember { mutableStateOf(on) }
    Row(Modifier.fillMaxWidth().clickable { checked = !checked }.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = if (iconMuted && !checked) AkColors.Faint else AkColors.Green, modifier = Modifier.size(19.dp))
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text(label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = AkColors.Ink)
            if (subtitle != null) Text(subtitle, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Muted)
        }
        Toggle(checked)
    }
}

@Composable
private fun Toggle(on: Boolean) {
    Box(Modifier.size(width = 44.dp, height = 26.dp).clip(CircleShape).background(if (on) AkColors.Green else Color(0xFFD8D2C8)).padding(3.dp), contentAlignment = if (on) Alignment.CenterEnd else Alignment.CenterStart) {
        Box(Modifier.size(20.dp).clip(CircleShape).background(AkColors.White))
    }
}

@Composable
private fun ValueRow(icon: ImageVector, label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = AkColors.Green, modifier = Modifier.size(19.dp))
        Spacer(Modifier.width(13.dp))
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
        Text(value, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.Muted)
        Spacer(Modifier.width(8.dp))
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = AkColors.Faint, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun NavRow(icon: ImageVector, label: String) {
    Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = AkColors.Green, modifier = Modifier.size(19.dp))
        Spacer(Modifier.width(13.dp))
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = AkColors.Faint, modifier = Modifier.size(16.dp))
    }
}

/* ====================================================================== *
 * ÉCRAN 36 — PARRAINAGE
 * ====================================================================== */
@Composable
fun ReferralScreen(nav: NavActions) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val code = "AYA2026"
    val shareMsg = "Rejoins-moi sur Mon Prof Perso ! Utilise mon code $code et reçois 2 000 F sur ton 1ᵉʳ cours."
    var copied by remember { mutableStateOf(false) }
    AkScreen(background = AkColors.Green) {
        Box(Modifier.padding(horizontal = 22.dp, vertical = 6.dp)) {
            IconSquare(Icons.AutoMirrored.Filled.ArrowBack, bg = AkColors.White.copy(alpha = 0.14f), tint = AkColors.White, onClick = { nav.back() })
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 26.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(Modifier.height(6.dp))
            Box(Modifier.size(84.dp).clip(RoundedCornerShape(24.dp)).background(AkColors.OrangeLight), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.CardGiftcard, null, tint = AkColors.Green, modifier = Modifier.size(42.dp))
            }
            Spacer(Modifier.height(18.dp))
            Text("Parrainez, gagnez\n2 000 F chacun", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 25.sp, lineHeight = 28.sp, color = AkColors.White, textAlign = TextAlign.Center)
            Text("Votre filleul reçoit 2 000 F sur son 1ᵉʳ cours. Vous gagnez 2 000 F dès qu'il le réserve.",
                fontFamily = Hanken, fontSize = 13.5.sp, lineHeight = 20.sp, color = AkColors.OnGreenSoft, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 10.dp))
            Spacer(Modifier.height(22.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.White.copy(alpha = 0.1f)).border(1.5.dp, AkColors.White.copy(alpha = 0.35f), RoundedCornerShape(16.dp)).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(if (copied) "CODE COPIÉ ✓" else "VOTRE CODE", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, color = AkColors.OnGreenFaint)
                    Text(code, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = AkColors.White, modifier = Modifier.padding(top = 2.dp))
                }
                Box(Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.White).clickable { copyToClipboard(context, "Code parrainage", code); copied = true }, contentAlignment = Alignment.Center) {
                    Icon(if (copied) Icons.Filled.Check else Icons.Filled.ContentCopy, null, tint = AkColors.Green, modifier = Modifier.size(21.dp))
                }
            }
            Spacer(Modifier.height(13.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.White.copy(alpha = 0.07f)).padding(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Amis parrainés", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.OnGreenSoft)
                    Text("3", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = AkColors.White)
                }
                Box(Modifier.fillMaxWidth().padding(vertical = 11.dp).height(1.dp).background(AkColors.White.copy(alpha = 0.12f)))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Total gagné", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.OnGreenSoft)
                    Text("6 000 F", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = AkColors.OrangeLight)
                }
            }
            Spacer(Modifier.height(16.dp))
        }
        Box(Modifier.padding(horizontal = 26.dp).padding(bottom = 26.dp)) {
            PrimaryButton("Partager mon code", Modifier.fillMaxWidth(), trailingIcon = Icons.Filled.Share, onClick = { shareText(context, shareMsg) })
        }
    }
}

/* ====================================================================== *
 * ÉCRAN 37 — ÉTAT VIDE & HORS-LIGNE
 * ====================================================================== */
@Composable
fun EmptyStateScreen(nav: NavActions) {
    var tab by remember { mutableStateOf(0) }
    AkScreen(applyBottomInset = false) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp).padding(top = 8.dp).clip(RoundedCornerShape(13.dp)).background(Color(0xFFFBF1E6)).border(1.dp, Color(0xFFF3D8BC), RoundedCornerShape(13.dp)).padding(horizontal = 14.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.SignalCellularAlt, null, tint = AkColors.Orange, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(9.dp))
            Text("Mode éco-data actif · images allégées pour économiser vos données", fontFamily = Hanken, fontSize = 12.5.sp, lineHeight = 17.sp, color = Color(0xFF7A5733))
        }
        Text("Mes cours", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, color = AkColors.Ink, modifier = Modifier.padding(horizontal = 22.dp).padding(top = 14.dp))
        Row(Modifier.padding(horizontal = 22.dp).padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PillTab("À venir", tab == 0) { tab = 0 }; PillTab("Terminés", tab == 1) { tab = 1 }
        }
        Column(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 40.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Box(Modifier.size(104.dp).clip(CircleShape).background(AkColors.GreenSoft), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.CalendarMonth, null, tint = AkColors.Green, modifier = Modifier.size(50.dp))
            }
            Spacer(Modifier.height(22.dp))
            Text("Aucun cours prévu", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp, color = AkColors.Ink)
            Text("Trouvez un professeur près de chez vous et réservez votre premier cours en quelques minutes.",
                fontFamily = Hanken, fontSize = 13.5.sp, lineHeight = 20.sp, color = AkColors.Muted, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
            Spacer(Modifier.height(22.dp))
            Row(Modifier.clip(RoundedCornerShape(14.dp)).background(AkColors.Orange).clickable { nav.go(Routes.SearchResults) }.padding(horizontal = 26.dp, vertical = 15.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Search, null, tint = AkColors.White, modifier = Modifier.size(17.dp))
                Text("  Trouver un professeur", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.White)
            }
        }
        BottomNav(NavTab.Cours, nav::selectTab)
    }
}
