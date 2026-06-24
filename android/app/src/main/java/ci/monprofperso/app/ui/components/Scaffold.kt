package ci.monprofperso.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken

/**
 * Conteneur d'écran : applique le fond + les insets système (status bar / nav bar).
 * Pas de fausse barre 9:41 : la vraie barre système de l'appareil est utilisée.
 */
@Composable
fun AkScreen(
    background: Color = AkColors.Canvas,
    applyTopInset: Boolean = true,
    applyBottomInset: Boolean = true,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(background)
            .then(if (applyTopInset) Modifier.statusBarsPadding() else Modifier)
            .then(if (applyBottomInset) Modifier.navigationBarsPadding() else Modifier),
        content = content,
    )
}

enum class NavTab(val label: String, val icon: ImageVector) {
    Accueil("Accueil", Icons.Filled.Home),
    Recherche("Recherche", Icons.Filled.Search),
    Cours("Cours", Icons.Filled.CalendarMonth),
    Progres("Progrès", Icons.Filled.ShowChart),
    Profil("Profil", Icons.Outlined.Person),
}

@Composable
fun BottomNav(current: NavTab, onSelect: (NavTab) -> Unit = {}) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(AkColors.White)
            .padding(start = 28.dp, end = 28.dp, top = 12.dp, bottom = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        NavTab.values().forEach { tab ->
            val active = tab == current
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.clickable { onSelect(tab) },
            ) {
                Icon(
                    tab.icon, null,
                    tint = if (active) AkColors.Green else AkColors.Faint,
                    modifier = Modifier.size(23.dp),
                )
                Text(
                    tab.label,
                    fontFamily = Hanken,
                    fontWeight = if (active) FontWeight.Bold else FontWeight.SemiBold,
                    fontSize = 10.sp,
                    color = if (active) AkColors.Green else AkColors.Faint,
                )
            }
        }
    }
}

enum class TeacherTab(val label: String, val icon: ImageVector) {
    Tableau("Tableau", Icons.Filled.GridView),
    Demandes("Demandes", Icons.Filled.Inbox),
    Agenda("Agenda", Icons.Filled.DateRange),
    Revenus("Revenus", Icons.Filled.AccountBalanceWallet),
    Profil("Profil", Icons.Outlined.Person),
}

@Composable
fun TeacherBottomNav(current: TeacherTab, onSelect: (TeacherTab) -> Unit = {}) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(AkColors.White)
            .padding(start = 26.dp, end = 26.dp, top = 12.dp, bottom = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        TeacherTab.values().forEach { tab ->
            val active = tab == current
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.clickable { onSelect(tab) },
            ) {
                Icon(tab.icon, null, tint = if (active) AkColors.Green else AkColors.Faint, modifier = Modifier.size(22.dp))
                Text(tab.label, fontFamily = Hanken, fontWeight = if (active) FontWeight.Bold else FontWeight.SemiBold,
                    fontSize = 10.sp, color = if (active) AkColors.Green else AkColors.Faint)
            }
        }
    }
}
