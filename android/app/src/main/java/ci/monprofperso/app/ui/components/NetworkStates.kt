package ci.monprofperso.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken

/**
 * États réseau réutilisables et cohérents sur les écrans branchés en live.
 * Le design privilégie le repli sur données de démo : on signale le mode
 * hors-ligne par un bandeau discret avec « Réessayer » plutôt qu'un écran bloquant.
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
            "Hors-ligne — données de démonstration", fontFamily = Hanken, fontWeight = FontWeight.SemiBold,
            fontSize = 12.sp, color = Color(0xFF8A5B33), modifier = Modifier.weight(1f),
        )
        Text(
            "Réessayer", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp,
            color = AkColors.Orange, modifier = Modifier.clickable { onRetry() }.padding(start = 8.dp),
        )
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
