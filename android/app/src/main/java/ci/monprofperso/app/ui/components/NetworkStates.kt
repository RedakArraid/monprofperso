package ci.monprofperso.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken

/**
 * États réseau réutilisables et cohérents sur les écrans branchés en live.
 * Signale l'échec et permet une nouvelle lecture du serveur.
 */
@Composable
fun OfflineBanner(onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().padding(bottom = 10.dp)
            .clip(RoundedCornerShape(12.dp)).background(AkColors.OrangeSoft)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.CloudOff, null, tint = AkColors.Orange, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text(
            "Connexion indisponible", fontFamily = Hanken, fontWeight = FontWeight.SemiBold,
            fontSize = 12.sp, color = Color(0xFF8A5B33), modifier = Modifier.weight(1f),
        )
        TextButton(onClick = onRetry) {
            Text("Réessayer", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp,
                color = AkColors.OrangeStrong)
        }
    }
}

/** Message visible et annoncé après une erreur ou une confirmation. */
@Composable
fun FeedbackMessage(message: String, error: Boolean = true, modifier: Modifier = Modifier) {
    Text(message, color = if (error) AkColors.OrangeStrong else AkColors.GreenDark,
        fontFamily = Hanken, fontSize = 14.sp,
        modifier = modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
            .background(if (error) AkColors.OrangeSoft else AkColors.GreenSoft)
            .semantics { liveRegion = LiveRegionMode.Polite }.padding(16.dp))
}

@Composable
fun EmptyContent(title: String, description: String, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 17.sp, color = AkColors.Ink)
        Text(description, fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Muted)
    }
}

@Composable
fun LoadingRow(modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().padding(vertical = 22.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = AkColors.Green)
        Spacer(Modifier.width(10.dp))
        Text("Chargement…", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Faint)
    }
}
