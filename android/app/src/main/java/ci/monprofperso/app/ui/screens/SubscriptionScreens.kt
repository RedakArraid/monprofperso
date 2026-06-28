package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
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
 * ÉCRAN 23, FORMULES D'ABONNEMENT
 * ====================================================================== */
@Composable
fun SubscriptionPlansScreen(nav: NavActions) {
    var plan by remember { mutableIntStateOf(1) }
    var quarterly by remember { mutableStateOf(false) }
    AkScreen {
        TopBar("Abonnement", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 14.dp)) {
            Text("Un suivi régulier,\nle même professeur", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, lineHeight = 25.sp, color = AkColors.Ink)
            Text("Des cours chaque semaine pour de vrais progrès, sans avoir à réserver à chaque fois.",
                fontFamily = Hanken, fontSize = 13.sp, lineHeight = 19.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 7.dp))
            // toggle
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(AkColors.CardField).padding(4.dp)) {
                Box(Modifier.weight(1f).clip(RoundedCornerShape(10.dp)).background(if (!quarterly) AkColors.White else Color.Transparent).clickable { quarterly = false }.padding(vertical = 9.dp), contentAlignment = Alignment.Center) {
                    Text("Mensuel", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (!quarterly) AkColors.Ink else AkColors.Muted)
                }
                Box(Modifier.weight(1f).clip(RoundedCornerShape(10.dp)).background(if (quarterly) AkColors.White else Color.Transparent).clickable { quarterly = true }.padding(vertical = 9.dp), contentAlignment = Alignment.Center) {
                    Row {
                        Text("Trimestriel ", fontFamily = Hanken, fontWeight = if (quarterly) FontWeight.Bold else FontWeight.SemiBold, fontSize = 13.sp, color = if (quarterly) AkColors.Ink else AkColors.Muted)
                        Text("−10%", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Orange)
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            PlanOption("Découverte", "1 cours / sem · 4 / mois", "14 000 F", plan == 0, null) { plan = 0 }
            Spacer(Modifier.height(10.dp))
            PlanOption("Régulier", "2 cours / sem · 8 / mois", "26 000 F", plan == 1, "LE PLUS CHOISI") { plan = 1 }
            Spacer(Modifier.height(10.dp))
            PlanOption("Intensif", "3 cours / sem · 12 / mois", "36 000 F", plan == 2, null, suffix = "· prépa examen") { plan = 2 }
            // included
            Spacer(Modifier.height(14.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.GreenSoft).padding(horizontal = 15.dp, vertical = 14.dp)) {
                Text("INCLUS DANS LA FORMULE RÉGULIER", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Green)
                Spacer(Modifier.height(10.dp))
                IncludedRow("Même professeur attitré")
                IncludedRow("8 cours par mois (2 / semaine)")
                IncludedRow("Bilan de progression mensuel")
                IncludedRow("Support WhatsApp prioritaire", last = true)
            }
            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 13.dp, bottom = 24.dp)) {
            Row(Modifier.fillMaxWidth().padding(bottom = 11.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Sans engagement · résiliable à tout moment", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                Row(verticalAlignment = Alignment.Bottom) {
                    Text("26 000 F", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = AkColors.Ink)
                    Text("/mois", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.Faint)
                }
            }
            PrimaryButton("S'abonner", Modifier.fillMaxWidth(), color = AkColors.Green, onClick = { nav.go(Routes.SubscriptionActivation) })
        }
    }
}

@Composable
private fun PlanOption(title: String, detail: String, price: String, selected: Boolean, badge: String?, suffix: String? = null, onClick: () -> Unit = {}) {
    Box {
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.White)
                .border(if (selected) 2.dp else 1.5.dp, if (selected) AkColors.Green else AkColors.Border, RoundedCornerShape(16.dp))
                .clickable { onClick() }
                .padding(horizontal = 14.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(22.dp).clip(CircleShape).border(2.dp, if (selected) AkColors.Green else Color(0xFFD8D2C8), CircleShape), contentAlignment = Alignment.Center) {
                if (selected) Box(Modifier.size(11.dp).clip(CircleShape).background(AkColors.Green))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row {
                    Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
                    if (suffix != null) Text(" $suffix", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AkColors.Orange, modifier = Modifier.align(Alignment.CenterVertically))
                }
                Text(detail, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(price, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = if (selected) AkColors.Green else AkColors.Ink)
                Text("/ mois", fontFamily = Hanken, fontSize = 10.5.sp, color = AkColors.Faint)
            }
        }
        if (badge != null) {
            Text(badge, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = AkColors.White,
                modifier = Modifier.align(Alignment.TopStart).offset(x = 16.dp, y = (-9).dp).clip(RoundedCornerShape(7.dp)).background(AkColors.Orange).padding(horizontal = 9.dp, vertical = 3.dp))
        }
    }
}

@Composable
private fun IncludedRow(text: String, last: Boolean = false) {
    Row(Modifier.padding(bottom = if (last) 0.dp else 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Filled.Check, null, tint = AkColors.Green, modifier = Modifier.size(14.dp))
        Spacer(Modifier.width(9.dp))
        Text(text, fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Ink)
    }
}

/* ====================================================================== *
 * ÉCRAN 24, ACTIVATION & PAIEMENT
 * ====================================================================== */
@Composable
fun SubscriptionActivationScreen(nav: NavActions) {
    AkScreen {
        TopBar("Activer l'abonnement", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).padding(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Formule Régulier", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = AkColors.Ink)
                    Text("2 cours / sem", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AkColors.Green,
                        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(AkColors.GreenSoft).padding(horizontal = 10.dp, vertical = 5.dp))
                }
                Row(Modifier.padding(top = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                    InitialsAvatar("KN", size = 42, radius = 12, fontSize = 15)
                    Spacer(Modifier.width(11.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Koffi N'Guessan", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("Professeur attitré · Maths", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    }
                    Icon(Icons.Filled.Verified, null, tint = AkColors.Green, modifier = Modifier.size(20.dp))
                }
                Box(Modifier.fillMaxWidth().padding(vertical = 13.dp).height(1.dp).background(AkColors.CardField))
                SubRow("Abonnement mensuel", "26 000 F", bold = true)
                SubRow("1ᵉʳ prélèvement", "Aujourd'hui")
            }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color(0xFFFBF1E6)).padding(horizontal = 14.dp, vertical = 13.dp), verticalAlignment = Alignment.Top) {
                Icon(Icons.Filled.Autorenew, null, tint = AkColors.Orange, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(9.dp))
                Text("Renouvelé automatiquement le 1ᵉʳ de chaque mois. Vous pouvez mettre en pause ou résilier quand vous voulez.",
                    fontFamily = Hanken, fontSize = 12.5.sp, lineHeight = 18.sp, color = Color(0xFF7A5733))
            }
            Spacer(Modifier.height(18.dp))
            Text("Moyen de paiement", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            ActivationPayment(Color(0xFFF2761A), Icons.Filled.PhoneAndroid, "Orange Money", "07 ** ** ** 42", selected = true)
            Spacer(Modifier.height(10.dp))
            ActivationPayment(Color(0xFF1D9BD8), Icons.Filled.Waves, "Wave", "Sans frais")
            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            Row(Modifier.fillMaxWidth().padding(bottom = 11.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Total aujourd'hui", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted)
                Row(verticalAlignment = Alignment.Bottom) {
                    Text("26 000 F", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = AkColors.Ink)
                    Text("/mois", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.Faint)
                }
            }
            PrimaryButton("Activer mon abonnement", Modifier.fillMaxWidth(), color = AkColors.Green, trailingIcon = Icons.Filled.Lock, onClick = { nav.go(Routes.MySubscription) })
        }
    }
}

@Composable
private fun SubRow(label: String, value: String, bold: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(bottom = 7.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontFamily = Hanken, fontSize = 13.sp, color = Color(0xFF4A574F))
        Text(value, fontFamily = Hanken, fontWeight = if (bold) FontWeight.Bold else FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.Ink)
    }
}

@Composable
private fun ActivationPayment(tint: Color, icon: ImageVector, title: String, sub: String, selected: Boolean = false) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(if (selected) 2.dp else 1.5.dp, if (selected) AkColors.Green else AkColors.Border, RoundedCornerShape(15.dp)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(tint), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = AkColors.White, modifier = Modifier.size(19.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            Text(sub, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
        }
        if (selected) Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Green, modifier = Modifier.size(22.dp))
        else Box(Modifier.size(21.dp).clip(CircleShape).border(2.dp, Color(0xFFD8D2C8), CircleShape))
    }
}

/* ====================================================================== *
 * ÉCRAN 25, MON ABONNEMENT
 * ====================================================================== */
@Composable
fun MySubscriptionScreen(nav: NavActions) {
    AkScreen {
        TopBar("Mon abonnement", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            // green card
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.Green).padding(18.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Formule Régulier", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp, color = AkColors.White)
                    Row(Modifier.clip(RoundedCornerShape(8.dp)).background(AkColors.White).padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF22A55D)))
                        Text("  Actif", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AkColors.Green)
                    }
                }
                Text("2 cours par semaine · Prof attitré Koffi", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.OnGreenSoft, modifier = Modifier.padding(top = 4.dp))
                Box(Modifier.fillMaxWidth().padding(vertical = 14.dp).height(1.dp).background(AkColors.White.copy(alpha = 0.15f)))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Prochain prélèvement", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.OnGreenSoft)
                    Text("1 juil. · 26 000 F", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.White)
                }
            }
            Spacer(Modifier.height(14.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).padding(15.dp)) {
                Row(Modifier.fillMaxWidth().padding(bottom = 9.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Cours utilisés en juin", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.InkSoft)
                    Text("5 / 8", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = AkColors.Ink)
                }
                Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(5.dp)).background(Color(0xFFEAE5DC))) {
                    Box(Modifier.fillMaxHeight().fillMaxWidth(0.62f).clip(RoundedCornerShape(5.dp)).background(AkColors.Green))
                }
                Text("Il vous reste 3 cours ce mois-ci.", fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 8.dp))
            }
            Spacer(Modifier.height(13.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.GreenSoft).clickable { nav.go(Routes.ProgressReport) }.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.Green), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.TrendingUp, null, tint = AkColors.White, modifier = Modifier.size(20.dp))
                }
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) {
                    Text("Bilan de juin disponible", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink)
                    Text("Moyenne en hausse : +1,4 ce mois", fontFamily = Hanken, fontSize = 12.sp, color = Color(0xFF3F6B59))
                }
                Text("Voir", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Green)
            }
            Spacer(Modifier.height(18.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp))) {
                SubMenuRow(Icons.Filled.SwapHoriz, "Changer de formule") { nav.go(Routes.SubscriptionPlans) }
                MenuDivider()
                SubMenuRow(Icons.Filled.PauseCircle, "Mettre en pause")
                MenuDivider()
                SubMenuRow(Icons.Filled.AccountBalanceWallet, "Gérer le paiement") { nav.go(Routes.Wallet) }
            }
            Spacer(Modifier.height(14.dp))
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text("Résilier mon abonnement", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = Color(0xFFE0392B))
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SubMenuRow(icon: ImageVector, label: String, onClick: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().clickable { onClick() }.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = AkColors.Green, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(13.dp))
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = AkColors.Faint, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun MenuDivider() = Box(Modifier.fillMaxWidth().padding(horizontal = 15.dp).height(1.dp).background(AkColors.CardField))
