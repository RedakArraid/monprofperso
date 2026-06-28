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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ====================================================================== *
 * ÉCRAN 29, DEVENIR PROFESSEUR
 * ====================================================================== */
@Composable
fun BecomeTeacherScreen(nav: NavActions) {
    AkScreen {
        TopBar("Devenir professeur", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 14.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(1f).height(5.dp).clip(RoundedCornerShape(3.dp)).background(AkColors.Green))
                Box(Modifier.weight(1f).height(5.dp).clip(RoundedCornerShape(3.dp)).background(AkColors.Green))
                Box(Modifier.weight(1f).height(5.dp).clip(RoundedCornerShape(3.dp)).background(Color(0xFFEAE5DC)))
            }
            Text("Étape 2 / 3 · Vos documents", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 7.dp))
            Text("Vérifions votre profil", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = AkColors.Ink, modifier = Modifier.padding(top = 14.dp))
            Text("Pour rassurer les parents, chaque professeur est vérifié avant d'apparaître sur Mon Prof Perso.",
                fontFamily = Hanken, fontSize = 13.sp, lineHeight = 19.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 6.dp))
            Spacer(Modifier.height(16.dp))
            DocRow(Icons.Filled.Badge, "Pièce d'identité (CNI)", "Téléversée", done = true)
            Spacer(Modifier.height(10.dp))
            DocRow(Icons.Filled.WorkspacePremium, "Diplôme / attestation", "Téléversé", done = true)
            Spacer(Modifier.height(10.dp))
            DocRow(Icons.Filled.PhotoCamera, "Photo de profil", "Obligatoire", done = false)
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(AkColors.GreenSoft).padding(horizontal = 14.dp, vertical = 13.dp), verticalAlignment = Alignment.Top) {
                Icon(Icons.Filled.VerifiedUser, null, tint = AkColors.Green, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(9.dp))
                Text("Vos documents sont confidentiels et vérifiés sous 24 à 48h.", fontFamily = Hanken, fontSize = 12.5.sp, lineHeight = 18.sp, color = Color(0xFF3F6B59))
            }
            Spacer(Modifier.height(16.dp))
        }
        Box(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            PrimaryButton("Envoyer ma candidature", Modifier.fillMaxWidth(), trailingIcon = null, onClick = { nav.back() })
        }
    }
}

@Composable
private fun DocRow(icon: ImageVector, title: String, status: String, done: Boolean) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White)
            .then(if (done) Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)) else Modifier.border(1.5.dp, Color(0xFFC9C2B5), RoundedCornerShape(15.dp)))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(40.dp).clip(RoundedCornerShape(11.dp)).background(if (done) AkColors.GreenSoft else AkColors.CardField), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = if (done) AkColors.Green else AkColors.Faint, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink)
            Text(status, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, color = if (done) Color(0xFF22A55D) else AkColors.Faint)
        }
        if (done) Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22A55D), modifier = Modifier.size(22.dp))
        else Text("Ajouter", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Green,
            modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(AkColors.GreenSoft).padding(horizontal = 12.dp, vertical = 7.dp))
    }
}

/* ====================================================================== *
 * ÉCRAN 30, RETRAIT DES GAINS
 * ====================================================================== */
@Composable
fun WithdrawScreen(nav: NavActions) {
    val amounts = listOf("50 000" to "50 000", "100 000" to "100 000", "Tout" to "184 000")
    var amount by remember { mutableIntStateOf(1) }
    AkScreen {
        TopBar("Retirer mes gains", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.Green).padding(18.dp)) {
                Text("Solde disponible", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.OnGreenSoft)
                Text("184 000 F", fontFamily = Schibsted, fontWeight = FontWeight.Black, fontSize = 34.sp, color = AkColors.White, modifier = Modifier.padding(top = 3.dp))
            }
            Spacer(Modifier.height(18.dp))
            Text("Montant à retirer", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).padding(16.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.Bottom) {
                Text(amounts[amount].second, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 30.sp, color = AkColors.Ink)
                Text(" F", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = AkColors.Faint, modifier = Modifier.padding(bottom = 4.dp))
            }
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                amounts.forEachIndexed { i, (label, _) -> QuickAmount(label, amount == i, Modifier.weight(1f)) { amount = i } }
            }
            Spacer(Modifier.height(18.dp))
            Text("Verser sur", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
            Spacer(Modifier.height(11.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White).border(2.dp, AkColors.Green, RoundedCornerShape(15.dp)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF1D9BD8)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Waves, null, tint = AkColors.White, modifier = Modifier.size(19.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Wave", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("05 ** ** ** 11", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                }
                Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Green, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.height(13.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Lock, null, tint = AkColors.Green, modifier = Modifier.size(14.dp))
                Text("  Sans frais · versé sous 24h", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
            }
            Spacer(Modifier.height(16.dp))
        }
        Box(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            PrimaryButton("Retirer ${amounts[amount].second} F", Modifier.fillMaxWidth(), color = AkColors.Green, trailingIcon = null, onClick = { nav.back() })
        }
    }
}

@Composable
private fun QuickAmount(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Box(modifier.clip(RoundedCornerShape(11.dp)).background(if (selected) AkColors.Green else AkColors.White).then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(11.dp))).clickable { onClick() }.padding(vertical = 9.dp), contentAlignment = Alignment.Center) {
        Text(label, fontFamily = Hanken, fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold, fontSize = 12.5.sp, color = if (selected) AkColors.White else AkColors.InkSoft)
    }
}
