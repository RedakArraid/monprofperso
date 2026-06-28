package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.foundation.clickable
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
 * ÉCRAN 31, GÉRER LE COURS (ANNULER / REPROGRAMMER)
 * ====================================================================== */
@Composable
fun ManageCourseScreen(nav: NavActions) {
    var slot by remember { mutableIntStateOf(1) }
    AkScreen {
        TopBar("Détail du cours", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).padding(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Maths · 3ᵉ", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = AkColors.Ink)
                    Row(Modifier.clip(RoundedCornerShape(8.dp)).background(AkColors.GreenSoft).padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF22A55D)))
                        Text("  Confirmé", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AkColors.Green)
                    }
                }
                Row(Modifier.padding(top = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                    InitialsAvatar("KN", size = 42, radius = 12, fontSize = 15)
                    Spacer(Modifier.width(11.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Koffi N'Guessan", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("Professeur de Maths", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    }
                    IconSquare(Icons.AutoMirrored.Filled.Chat, bg = AkColors.CardField, tint = AkColors.Green, size = 38, onClick = { nav.go(ci.monprofperso.app.nav.Routes.Messaging) })
                }
                Box(Modifier.fillMaxWidth().padding(vertical = 13.dp).height(1.dp).background(AkColors.CardField))
                IconLine(Icons.Filled.DateRange, "Samedi 22 juin · 16h00 · 1h30")
                IconLine(Icons.Filled.Home, "À domicile · Cocody, Riviera 3")
                IconLine(Icons.Filled.AccountBalanceWallet, "6 000 F · payé via Orange Money", last = true)
            }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(Color(0xFFFBF1E6)).padding(14.dp), verticalAlignment = Alignment.Top) {
                Icon(Icons.Filled.Info, null, tint = AkColors.Orange, modifier = Modifier.size(19.dp))
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("Conditions d'annulation", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Ink)
                    Text("Gratuit jusqu'à 24h avant le cours. Au-delà, 50% du montant est facturé au professeur pour son déplacement.",
                        fontFamily = Hanken, fontSize = 12.sp, lineHeight = 18.sp, color = Color(0xFF7A5733), modifier = Modifier.padding(top = 3.dp))
                }
            }
            Spacer(Modifier.height(14.dp))
            Text("Reprogrammer, nouveaux créneaux", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Dim 23 · 14h", "Lun 24 · 17h", "Mar 25 · 16h").forEachIndexed { i, label ->
                    Chip(label, slot == i) { slot = i }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
        Row(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).border(1.dp, Color(0xFFE0392B), RoundedCornerShape(14.dp)).clickable { nav.go(Routes.MyCourses) }.padding(vertical = 15.dp), contentAlignment = Alignment.Center) {
                Text("Annuler", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFFE0392B))
            }
            Box(Modifier.weight(1.4f).clip(RoundedCornerShape(14.dp)).background(AkColors.Green).clickable { nav.go(Routes.MyCourses) }.padding(vertical = 15.dp), contentAlignment = Alignment.Center) {
                Text("Confirmer le report", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.White)
            }
        }
    }
}

@Composable
private fun IconLine(icon: ImageVector, text: String, last: Boolean = false) {
    Row(Modifier.padding(bottom = if (last) 0.dp else 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = AkColors.Green, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(9.dp))
        Text(text, fontFamily = Hanken, fontSize = 13.sp, color = Color(0xFF4A574F))
    }
}

/* ====================================================================== *
 * ÉCRAN 32, BILAN DE PROGRESSION DÉTAILLÉ
 * ====================================================================== */
@Composable
fun ProgressReportScreen(nav: NavActions) {
    AkScreen {
        TopBar("Bilan de juin", subtitle = "Kouadio · 3ᵉ", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 14.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).padding(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
                    Column {
                        Text("Moyenne générale", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                        Row(Modifier.padding(top = 2.dp), verticalAlignment = Alignment.Bottom) {
                            Text("13,2", fontFamily = Schibsted, fontWeight = FontWeight.Black, fontSize = 30.sp, color = AkColors.Ink)
                            Text(" /20", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Faint, modifier = Modifier.padding(bottom = 3.dp))
                        }
                    }
                    Row(Modifier.clip(RoundedCornerShape(9.dp)).background(AkColors.GreenSoft).padding(horizontal = 11.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.TrendingUp, null, tint = AkColors.Green, modifier = Modifier.size(13.dp))
                        Text(" +1,4", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
                    }
                }
                Row(Modifier.fillMaxWidth().height(78.dp).padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(9.dp), verticalAlignment = Alignment.Bottom) {
                    Bar2(0.56f, "Mars", false, Modifier.weight(1f))
                    Bar2(0.59f, "Avr", false, Modifier.weight(1f))
                    Bar2(0.64f, "Mai", false, Modifier.weight(1f))
                    Bar2(0.84f, "Juin", true, Modifier.weight(1f))
                }
            }
            Spacer(Modifier.height(13.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StrengthCard("Points forts", AkColors.Green, listOf("Calcul littéral", "Géométrie"), warn = false, Modifier.weight(1f))
                StrengthCard("À travailler", AkColors.Orange, listOf("Fonctions affines", "Probabilités"), warn = true, Modifier.weight(1f))
            }
            Spacer(Modifier.height(13.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.GreenSoft).padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(30.dp).clip(RoundedCornerShape(9.dp)).background(AkColors.Green), contentAlignment = Alignment.Center) {
                        Text("KN", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 11.sp, color = AkColors.White)
                    }
                    Spacer(Modifier.width(9.dp))
                    Text("Mot du professeur", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = AkColors.Ink)
                }
                Text("« Kouadio progresse bien et gagne en confiance. On vise 14/20 au prochain bilan en consolidant les fonctions. »",
                    fontFamily = Hanken, fontSize = 12.5.sp, lineHeight = 19.sp, color = Color(0xFF3F6B59), modifier = Modifier.padding(top = 8.dp))
            }
            Spacer(Modifier.height(16.dp))
        }
        Box(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, AkColors.Green, RoundedCornerShape(14.dp)).padding(vertical = 15.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Download, null, tint = AkColors.Green, modifier = Modifier.size(18.dp))
                Text("  Télécharger le bilan (PDF)", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Green)
            }
        }
    }
}

@Composable
private fun Bar2(fraction: Float, label: String, active: Boolean, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
        Box(Modifier.fillMaxWidth().fillMaxHeight(fraction).clip(RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp)).background(if (active) AkColors.Green else AkColors.GreenSoft))
        Spacer(Modifier.height(6.dp))
        Text(label, fontFamily = Hanken, fontWeight = if (active) FontWeight.Bold else FontWeight.Normal, fontSize = 9.5.sp, color = if (active) AkColors.Green else AkColors.Faint)
    }
}

@Composable
private fun StrengthCard(title: String, color: Color, items: List<String>, warn: Boolean, modifier: Modifier = Modifier) {
    Column(modifier.clip(RoundedCornerShape(14.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(14.dp)).padding(12.dp)) {
        Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = color, modifier = Modifier.padding(bottom = 7.dp))
        items.forEach {
            Row(Modifier.padding(bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(if (warn) Icons.Filled.Error else Icons.Filled.CheckCircle, null, tint = if (warn) AkColors.Orange else Color(0xFF22A55D), modifier = Modifier.size(13.dp))
                Spacer(Modifier.width(5.dp))
                Text(it, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Ink)
            }
        }
    }
}

/* ====================================================================== *
 * ÉCRAN 33, REÇU / FACTURE
 * ====================================================================== */
@Composable
fun ReceiptScreen(nav: NavActions) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val receiptText = "Reçu Mon Prof Perso N° AKW-2058, Cours de Maths · 3ᵉ avec Koffi N'Guessan, Total payé 6 000 F (Orange Money)."
    AkScreen {
        TopBar("Reçu de paiement", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(20.dp)).padding(20.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(34.dp).clip(RoundedCornerShape(10.dp)).background(AkColors.Green), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.School, null, tint = AkColors.White, modifier = Modifier.size(18.dp))
                        }
                        Spacer(Modifier.width(9.dp))
                        Row {
                            Text("Mon Prof Perso", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = AkColors.Ink)
                            Text(".", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = AkColors.Orange)
                        }
                    }
                    Row(Modifier.clip(RoundedCornerShape(8.dp)).background(AkColors.GreenSoft).padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Green, modifier = Modifier.size(13.dp))
                        Text("  Payé", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AkColors.Green)
                    }
                }
                Box(Modifier.fillMaxWidth().padding(vertical = 16.dp).height(1.dp).background(AkColors.CardField))
                Text("REÇU N° AKW-2058", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = AkColors.Faint)
                Text("Émis le 20 juin 2026", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 3.dp))
                Spacer(Modifier.height(16.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                    Column {
                        Text("Cours de Maths · 3ᵉ", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = AkColors.Ink)
                        Text("Koffi N'Guessan · 1h30", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Faint)
                    }
                    Text("6 000 F", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink)
                }
                Row(Modifier.fillMaxWidth().padding(top = 11.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Frais de service", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted)
                    Text("Offert", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.Green)
                }
                Box(Modifier.fillMaxWidth().padding(vertical = 14.dp).height(1.dp).background(AkColors.CardField))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Total payé", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("6 000 F", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = AkColors.Green)
                }
                Row(Modifier.fillMaxWidth().padding(top = 16.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.Canvas).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(32.dp).clip(RoundedCornerShape(9.dp)).background(Color(0xFFF2761A)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.PhoneAndroid, null, tint = AkColors.White, modifier = Modifier.size(16.dp))
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text("Orange Money", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = AkColors.Ink)
                        Text("Transaction OM240620.1432.A58", fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Faint)
                    }
                }
                Box(Modifier.fillMaxWidth().padding(top = 16.dp), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(96.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.Ink), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.QrCode2, null, tint = AkColors.White, modifier = Modifier.size(72.dp))
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
        Row(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(14.dp)).clickable { shareText(context, receiptText) }.padding(vertical = 15.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Share, null, tint = AkColors.InkSoft, modifier = Modifier.size(17.dp))
                Text("  Partager", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.InkSoft)
            }
            Row(Modifier.weight(1.3f).clip(RoundedCornerShape(14.dp)).background(AkColors.Green).clickable { nav.back() }.padding(vertical = 15.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Download, null, tint = AkColors.White, modifier = Modifier.size(17.dp))
                Text("  Télécharger (PDF)", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.White)
            }
        }
    }
}
