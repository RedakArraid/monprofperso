package ci.monprofperso.app.ui.components

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.background
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.LifecycleResumeEffect
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
    if (!view.isInEditMode) LifecycleResumeEffect(view, statusBarBackground, background) {
        view.context.findActivity()?.window?.let { window ->
            WindowCompat.getInsetsController(window, view).apply {
                // Le thème de l'application est clair, même lorsque le système est sombre.
                isAppearanceLightStatusBars = statusBarBackground.luminance() > 0.25f
                isAppearanceLightNavigationBars = background.luminance() > 0.25f
            }
        }
        // L'écran suivant applique son propre style ; ne pas restaurer celui de l'écran sortant.
        onPauseOrDispose { }
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
    NavigationSurface { scrollable ->
        NavTab.entries.filter { it != NavTab.Progres || ci.monprofperso.app.data.AppState.featureEnabled("progress") }.forEach { tab ->
            val modifier = if (scrollable) Modifier.widthIn(min = 72.dp) else Modifier.weight(1f)
            NavigationItem(tab.label, tab.icon, tab == current, modifier, scrollable) { onSelect(tab) }
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
    NavigationSurface { scrollable ->
        TeacherTab.entries.forEach { tab ->
            val modifier = if (scrollable) Modifier.widthIn(min = 72.dp) else Modifier.weight(1f)
            NavigationItem(tab.label, tab.icon, tab == current, modifier, scrollable) { onSelect(tab) }
        }
    }
}

@Composable
private fun NavigationSurface(content: @Composable RowScope.(Boolean) -> Unit) {
    val scrollable = LocalDensity.current.fontScale > 1f
    val scrollState = rememberScrollState()
    Column(Modifier.fillMaxWidth().background(AkColors.White)) {
        HorizontalDivider(color = AkColors.Border)
        Row(
            Modifier.fillMaxWidth().navigationBarsPadding().testTag("main-navigation")
                .then(if (scrollable) Modifier.horizontalScroll(scrollState) else Modifier)
                .selectableGroup()
                .padding(horizontal = 6.dp, vertical = 6.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(if (scrollable) 8.dp else 0.dp),
        ) { content(scrollable) }
    }
}

@Composable
@OptIn(ExperimentalFoundationApi::class)
private fun NavigationItem(label: String, icon: ImageVector, selected: Boolean, modifier: Modifier, scrollable: Boolean, onClick: () -> Unit) {
    val bringIntoView = remember { BringIntoViewRequester() }
    var placed by remember { mutableStateOf(false) }
    LaunchedEffect(selected, scrollable, placed) {
        if (selected && scrollable && placed) bringIntoView.bringIntoView()
    }
    Column(
        modifier.heightIn(min = 64.dp).clip(RoundedCornerShape(14.dp))
            .bringIntoViewRequester(bringIntoView).onPlaced { placed = true }
            .selectable(selected = selected, role = Role.Tab, onClick = onClick)
            .padding(horizontal = if (scrollable) 12.dp else 3.dp, vertical = 6.dp),
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
            maxLines = if (scrollable) 1 else Int.MAX_VALUE, softWrap = !scrollable,
            color = if (selected) AkColors.Green else AkColors.Muted)
    }
}
