package ci.monprofperso.app.ui.components

import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/** Rend un contenu scrollable verticalement avec un état mémorisé. */
@Composable
fun Modifier.verticalScrollSafe(): Modifier = this.verticalScroll(rememberScrollState())

/** Applique le padding de la barre de statut (utile pour les en-têtes colorés en plein écran). */
fun Modifier.statusBarsPaddingCompat(): Modifier = this.statusBarsPadding()
