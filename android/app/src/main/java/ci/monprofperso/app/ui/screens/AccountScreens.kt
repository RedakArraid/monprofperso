package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
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
 * ÉCRAN 16 — SUIVI DES PROGRÈS
 * ====================================================================== */
@Composable
fun ProgressScreen(nav: NavActions, vm: ci.monprofperso.app.data.ProgressViewModel = androidx.lifecycle.viewmodel.compose.viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    val p = (state as? ci.monprofperso.app.data.UiState.Success)?.data ?: ci.monprofperso.app.data.FallbackData.progress
    AkScreen(applyBottomInset = false) {
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 8.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Progrès de", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
                    Text(p.student, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 21.sp, color = AkColors.Ink)
                }
                InitialsAvatar("KO", size = 44, radius = 13, fontSize = 16, bg = AkColors.OrangeSoft, fg = AkColors.Orange)
            }
            // hero
            Spacer(Modifier.height(15.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.Green).padding(18.dp)) {
                Text("Moyenne générale ce trimestre", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.OnGreenSoft)
                Row(Modifier.padding(top = 5.dp), verticalAlignment = Alignment.Bottom) {
                    Text(p.average, fontFamily = Schibsted, fontWeight = FontWeight.Black, fontSize = 38.sp, color = AkColors.White)
                    Text(" /20", fontFamily = Hanken, fontSize = 14.sp, color = AkColors.OnGreenSoft, modifier = Modifier.padding(bottom = 5.dp))
                    Spacer(Modifier.width(10.dp))
                    Row(Modifier.padding(bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.TrendingUp, null, tint = AkColors.OrangeLight, modifier = Modifier.size(14.dp))
                        Text(" ${p.trend}", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.OrangeLight)
                    }
                }
                Text(p.goal, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.OnGreenSoft, modifier = Modifier.padding(top = 6.dp))
            }
            Spacer(Modifier.height(18.dp))
            Text("Par matière", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 15.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(12.dp))
            p.subjects.forEachIndexed { i, s ->
                if (i > 0) Spacer(Modifier.height(13.dp))
                SubjectProgress(s.subject, s.grade, s.fraction.toFloat(), s.warn)
            }
            Spacer(Modifier.height(18.dp))
            Text("Prochain cours", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 15.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).clickable { nav.go(Routes.ManageCourse) }.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.size(48.dp).clip(RoundedCornerShape(13.dp)).background(AkColors.GreenSoft), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text("SAM", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 10.sp, color = AkColors.Green)
                    Text("22", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = AkColors.Green)
                }
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) {
                    Text("Maths avec Koffi", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("16h00 · 1h30 · à domicile", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                }
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = AkColors.Faint, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.height(16.dp))
        }
        BottomNav(NavTab.Progres, nav::selectTab)
    }
}

@Composable
private fun SubjectProgress(subject: String, grade: String, fraction: Float, warn: Boolean) {
    val color = if (warn) AkColors.Orange else AkColors.Green
    Column {
        Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(subject, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.InkSoft)
            Text(grade, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = color)
        }
        Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(5.dp)).background(Color(0xFFEAE5DC))) {
            Box(Modifier.fillMaxHeight().fillMaxWidth(fraction).clip(RoundedCornerShape(5.dp)).background(color))
        }
    }
}

/* ====================================================================== *
 * ÉCRAN 17 — NOTIFICATIONS
 * ====================================================================== */
private data class Notif(val icon: ImageVector, val green: Boolean, val text: String, val time: String, val unread: Boolean)

@Composable
fun NotificationsScreen(nav: NavActions) {
    AkScreen(applyBottomInset = false) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Notifications", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
            Text("Tout lire", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = AkColors.Green)
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            NotifHeader("Aujourd'hui")
            NotifItem(Notif(Icons.Filled.EventAvailable, true, "Rappel : cours de Maths demain à 16h", "il y a 2 h", true)) { nav.go(Routes.MyCourses) }
            NotifItem(Notif(Icons.Filled.ChatBubble, false, "Koffi vous a envoyé un message", "il y a 5 h", true)) { nav.go(Routes.Messaging) }
            NotifItem(Notif(Icons.Filled.AccountBalanceWallet, true, "Paiement de 6 000 F confirmé", "il y a 6 h", false)) { nav.go(Routes.Wallet) }
            Spacer(Modifier.height(18.dp))
            NotifHeader("Cette semaine")
            NotifItem(Notif(Icons.Filled.Verified, true, "Koffi a accepté votre demande de cours", "lun.", false)) { nav.go(Routes.MyCourses) }
            NotifItem(Notif(Icons.Filled.CardGiftcard, false, "Parrainez un ami, gagnez 2 000 F", "dim.", false)) { nav.go(Routes.Referral) }
            Spacer(Modifier.height(16.dp))
        }
        BottomNav(NavTab.Accueil, nav::selectTab)
    }
}

@Composable
private fun NotifHeader(text: String) {
    Text(text.uppercase(), fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Faint, modifier = Modifier.padding(bottom = 11.dp))
}

@Composable
private fun NotifItem(n: Notif, onClick: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(bottom = 10.dp).clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp)).clickable { onClick() }.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(if (n.green) AkColors.GreenSoft else AkColors.OrangeSoft), contentAlignment = Alignment.Center) {
            Icon(n.icon, null, tint = if (n.green) AkColors.Green else AkColors.Orange, modifier = Modifier.size(21.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(n.text, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, lineHeight = 18.sp, color = AkColors.Ink)
            Text(n.time, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Faint, modifier = Modifier.padding(top = 2.dp))
        }
        if (n.unread) Box(Modifier.size(8.dp).clip(CircleShape).background(AkColors.Orange))
    }
}

/* ====================================================================== *
 * ÉCRAN 18 — MON COMPTE
 * ====================================================================== */
@Composable
fun AccountScreen(nav: NavActions) {
    val isTeacher = ci.monprofperso.app.data.AppState.role == 2
    AkScreen(applyBottomInset = false) {
        Text("Mon compte", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, color = AkColors.Ink, modifier = Modifier.padding(horizontal = 22.dp, vertical = 8.dp))
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 6.dp)) {
            // carte profil (selon le rôle)
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.Green).padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                InitialsAvatar(if (isTeacher) "KN" else "AK", size = 56, radius = 16, fontSize = 20, bg = AkColors.OrangeLight, fg = AkColors.Green)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(if (isTeacher) "Koffi N'Guessan" else "Aya Koné", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AkColors.White)
                    Text(if (isTeacher) "+225 07 07 00 12 34" else "+225 07 58 42 19 03", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.OnGreenSoft, modifier = Modifier.padding(top = 2.dp))
                }
                Text("Modifier", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Green,
                    modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(AkColors.White).clickable { nav.go(Routes.Settings) }.padding(horizontal = 13.dp, vertical = 8.dp))
            }
            Spacer(Modifier.height(20.dp))
            if (isTeacher) {
                Text("Mon profil", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
                Spacer(Modifier.height(11.dp))
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).clickable { nav.go(Routes.TeacherProfile) }.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                    InitialsAvatar("KN", size = 44, radius = 13, fontSize = 15, verified = true)
                    Spacer(Modifier.width(13.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Voir mon profil public", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("Maths · Physique-Chimie · 4,9★", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    }
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = AkColors.Faint, modifier = Modifier.size(17.dp))
                }
            } else {
                Text("Mes enfants", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
                Spacer(Modifier.height(11.dp))
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).clickable { nav.go(Routes.Progress) }.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                    InitialsAvatar("KO", size = 44, radius = 13, fontSize = 15, bg = AkColors.OrangeSoft, fg = AkColors.Orange)
                    Spacer(Modifier.width(13.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Kouadio", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                        Text("3ᵉ (BEPC) · Collège Moderne", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    }
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = AkColors.Faint, modifier = Modifier.size(17.dp))
                }
                Spacer(Modifier.height(9.dp))
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).border(1.5.dp, Color(0xFFC9C2B5), RoundedCornerShape(15.dp)).clickable { nav.go(Routes.Settings) }.padding(12.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Add, null, tint = AkColors.Green, modifier = Modifier.size(16.dp))
                    Text("  Ajouter un enfant", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
                }
            }
            Spacer(Modifier.height(20.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(18.dp))) {
                if (isTeacher) {
                    AccountRow(Icons.Filled.AccountBalanceWallet, "Mes revenus") { nav.go(Routes.Earnings) }
                    RowDivider()
                    AccountRow(Icons.Filled.DateRange, "Mon agenda") { nav.go(Routes.Agenda) }
                } else {
                    AccountRow(Icons.Filled.WorkspacePremium, "Mon abonnement", badge = "Actif", badgeFg = AkColors.Green, badgeBg = AkColors.GreenSoft) { nav.go(Routes.MySubscription) }
                    RowDivider()
                    AccountRow(Icons.Filled.AccountBalanceWallet, "Moyens de paiement") { nav.go(Routes.Wallet) }
                }
                RowDivider()
                AccountRow(Icons.Filled.Description, "Ressources & supports") { nav.go(Routes.Resources) }
                RowDivider()
                AccountRow(Icons.Filled.CardGiftcard, "Parrainage", badge = "2 000 F", badgeFg = AkColors.Orange, badgeBg = AkColors.OrangeSoft) { nav.go(Routes.Referral) }
                RowDivider()
                AccountRow(Icons.AutoMirrored.Filled.HelpOutline, "Aide & support") { nav.go(Routes.HelpFaq) }
                RowDivider()
                AccountRow(Icons.Filled.Settings, "Paramètres") { nav.go(Routes.Settings) }
                if (ci.monprofperso.app.data.AppState.isAdmin) {
                    RowDivider()
                    AccountRow(Icons.Filled.Tune, "Gérer le catalogue", badge = "Admin", badgeFg = AkColors.Green, badgeBg = AkColors.GreenSoft) { nav.go(Routes.AdminCatalog) }
                    RowDivider()
                    AccountRow(Icons.Filled.Description, "Ressources pédagogiques", badge = "Admin", badgeFg = AkColors.Green, badgeBg = AkColors.GreenSoft) { nav.go(Routes.AdminResources) }
                }
            }
            Spacer(Modifier.height(14.dp))
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text("Se déconnecter", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = Color(0xFFE0392B),
                    modifier = Modifier.clickable { ci.monprofperso.app.data.AppState.role = 0; ci.monprofperso.app.data.AppState.authRole = null; nav.go(Routes.Welcome) })
            }
            if (!isTeacher) {
                Spacer(Modifier.height(8.dp))
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text("Espace professeur →", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = AkColors.Muted,
                        modifier = Modifier.clickable { nav.go(Routes.TeacherDashboard) })
                }
            }
            Spacer(Modifier.height(16.dp))
        }
        if (isTeacher) TeacherBottomNav(TeacherTab.Profil, nav::selectTeacherTab)
        else BottomNav(NavTab.Profil, nav::selectTab)
    }
}

@Composable
private fun AccountRow(icon: ImageVector, label: String, badge: String? = null, badgeFg: Color = AkColors.Green, badgeBg: Color = AkColors.GreenSoft, onClick: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().clickable { onClick() }.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = AkColors.Green, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(13.dp))
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
        if (badge != null) {
            Text(badge, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = badgeFg,
                modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(badgeBg).padding(horizontal = 9.dp, vertical = 4.dp))
            Spacer(Modifier.width(8.dp))
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = AkColors.Faint, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun RowDivider() = Box(Modifier.fillMaxWidth().padding(horizontal = 15.dp).height(1.dp).background(AkColors.CardField))

/* ====================================================================== *
 * ÉCRAN 19 — PORTEFEUILLE & PAIEMENTS
 * ====================================================================== */
private data class Tx(val title: String, val sub: String, val amount: String, val credit: Boolean)

@Composable
fun WalletScreen(nav: NavActions) {
    AkScreen(applyBottomInset = false) {
        TopBar("Portefeuille", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Text("Comptes Mobile Money", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            MoneyAccount(Color(0xFFF2761A), Icons.Filled.PhoneAndroid, "Orange Money", "07 ** ** ** 42", badgeLabel = "Par défaut")
            Spacer(Modifier.height(9.dp))
            MoneyAccount(Color(0xFF1D9BD8), Icons.Filled.Waves, "Wave", "05 ** ** ** 11")
            Spacer(Modifier.height(9.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).border(1.5.dp, Color(0xFFC9C2B5), RoundedCornerShape(15.dp)).padding(12.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Add, null, tint = AkColors.Green, modifier = Modifier.size(16.dp))
                Text("  Ajouter un compte", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
            }
            Spacer(Modifier.height(20.dp))
            Text("Transactions", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            TxRow(Tx("Cours Maths · Koffi", "22 juin · Orange Money", "- 6 000 F", false))
            TxRow(Tx("Crédit de parrainage", "20 juin", "+ 2 000 F", true))
            TxRow(Tx("Cours Anglais · Mariam", "14 juin · Wave", "- 4 500 F", false))
            TxRow(Tx("Remboursement cours annulé", "10 juin", "+ 3 000 F", true))
            Spacer(Modifier.height(16.dp))
        }
        BottomNav(NavTab.Profil, nav::selectTab)
    }
}

@Composable
private fun MoneyAccount(tint: Color, icon: ImageVector, title: String, sub: String, badgeLabel: String? = null) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(40.dp).clip(RoundedCornerShape(11.dp)).background(tint), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = AkColors.White, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            Text(sub, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
        }
        if (badgeLabel != null) Text(badgeLabel, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AkColors.Green,
            modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(AkColors.GreenSoft).padding(horizontal = 10.dp, vertical = 5.dp))
    }
}

@Composable
private fun TxRow(tx: Tx) {
    Row(Modifier.fillMaxWidth().padding(bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(if (tx.credit) AkColors.GreenSoft else AkColors.OrangeSoft), contentAlignment = Alignment.Center) {
            Icon(if (tx.credit) Icons.Filled.SouthWest else Icons.Filled.NorthEast, null, tint = if (tx.credit) AkColors.Green else AkColors.Orange, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(tx.title, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = AkColors.Ink)
            Text(tx.sub, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Faint)
        }
        Text(tx.amount, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (tx.credit) AkColors.Green else AkColors.Ink)
    }
}
