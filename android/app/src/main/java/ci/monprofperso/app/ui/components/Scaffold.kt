package ci.monprofperso.app.ui.components

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken

/** Contenu à l'abri des découpes et du clavier, y compris avec Android edge-to-edge. */
@Composable
fun AkScreen(
    background: Color = AkColors.Canvas,
    applyTopInset: Boolean = true,
    applyBottomInset: Boolean = true,
    statusBarBackground: Color = background,
    content: @Composable ColumnScope.() -> Unit,
) {
    val view = LocalView.current
    if (!view.isInEditMode) SideEffect {
        view.context.findActivity()?.window?.let { window ->
            WindowCompat.getInsetsController(window, view).apply {
                // Le thème de l'application est clair, même lorsque le système est sombre.
                isAppearanceLightStatusBars = statusBarBackground.luminance() > 0.25f
                isAppearanceLightNavigationBars = background.luminance() > 0.25f
            }
        }
    }
    Box(Modifier.fillMaxSize().background(background), contentAlignment = Alignment.TopCenter) {
        Column(
            modifier = Modifier
                .widthIn(max = 840.dp)
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Horizontal))
                .imePadding()
                .then(if (applyTopInset) Modifier.windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top)) else Modifier)
                .then(if (applyBottomInset) Modifier.windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Bottom)) else Modifier),
            content = content,
        )
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

enum class NavTab(val label: String, val icon: ImageVector) {
    Accueil("Accueil", Icons.Filled.Home),
    Recherche("Recherche", Icons.Filled.Search),
    Cours("Cours", Icons.Filled.CalendarMonth),
    Progres("Bilans", Icons.Filled.ShowChart),
    Profil("Compte", Icons.Outlined.Person),
}

@Composable
fun BottomNav(current: NavTab, onSelect: (NavTab) -> Unit = {}) {
    NavigationSurface {
        NavTab.entries.filter { it != NavTab.Progres || ci.monprofperso.app.data.AppState.featureEnabled("progress") }.forEach { tab ->
            NavigationItem(tab.label, tab.icon, tab == current, Modifier.weight(1f)) { onSelect(tab) }
        }
    }
}

enum class TeacherTab(val label: String, val icon: ImageVector) {
    Tableau("Accueil", Icons.Filled.GridView),
    Demandes("Demandes", Icons.Filled.Inbox),
    Agenda("Agenda", Icons.Filled.DateRange),
    Revenus("Revenus", Icons.Filled.AccountBalanceWallet),
    Profil("Compte", Icons.Outlined.Person),
}

@Composable
fun TeacherBottomNav(current: TeacherTab, onSelect: (TeacherTab) -> Unit = {}) {
    NavigationSurface {
        TeacherTab.entries.forEach { tab ->
            NavigationItem(tab.label, tab.icon, tab == current, Modifier.weight(1f)) { onSelect(tab) }
        }
    }
}

@Composable
private fun NavigationSurface(content: @Composable RowScope.() -> Unit) {
    Column(Modifier.fillMaxWidth().background(AkColors.White)) {
        HorizontalDivider(color = AkColors.Border)
        Row(
            Modifier.fillMaxWidth().navigationBarsPadding().selectableGroup()
                .padding(horizontal = 6.dp, vertical = 6.dp),
            verticalAlignment = Alignment.Top,
            content = content,
        )
    }
}

@Composable
private fun NavigationItem(label: String, icon: ImageVector, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier.heightIn(min = 64.dp).clip(RoundedCornerShape(14.dp))
            .selectable(selected = selected, role = Role.Tab, onClick = onClick)
            .padding(horizontal = 3.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Box(
            Modifier.width(48.dp).height(30.dp).clip(RoundedCornerShape(12.dp))
                .background(if (selected) AkColors.GreenSoft else Color.Transparent),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = if (selected) AkColors.Green else AkColors.Muted, modifier = Modifier.size(23.dp))
        }
        Text(label, fontFamily = Hanken, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            fontSize = 12.sp, lineHeight = 15.sp, textAlign = TextAlign.Center,
            color = if (selected) AkColors.Green else AkColors.Muted)
    }
}
