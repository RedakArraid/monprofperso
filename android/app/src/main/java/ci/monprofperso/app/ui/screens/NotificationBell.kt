package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.data.Api
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.nav.Routes
import ci.monprofperso.app.ui.components.IconSquare
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken

/**
 * Icône cloche avec pastille du nombre de notifications non lues
 * (compté en live via /notifications/unread ; pas de pastille si 0 ou API absente).
 */
@Composable
fun NotificationBell(nav: NavActions, size: Int = 44) {
    var count by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) { count = runCatching { Api.service.unreadCount().count }.getOrDefault(0) }
    val notificationLabel = when {
        count == 1 -> "Notifications, 1 notification non lue"
        count > 1 -> "Notifications, $count notifications non lues"
        else -> "Notifications"
    }

    Box {
        IconSquare(Icons.Outlined.Notifications, bg = AkColors.White, tint = AkColors.InkSoft, size = size, contentDescription = notificationLabel,
            onClick = { nav.go(Routes.Notifications) })
        if (count > 0) {
            Box(
                Modifier.align(Alignment.TopEnd).offset(x = 4.dp, y = (-4).dp)
                    .sizeIn(minWidth = 18.dp, minHeight = 18.dp)
                    .clip(CircleShape).background(AkColors.Orange)
                    .padding(horizontal = 4.dp, vertical = 2.dp)
                    .clearAndSetSemantics {},
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (count > 9) "9+" else "$count",
                    fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 10.sp,
                    lineHeight = 12.sp, color = AkColors.Ink, maxLines = 1,
                )
            }
        }
    }
}
