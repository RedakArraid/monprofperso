package ci.monprofperso.app.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue

/**
 * État applicatif léger partagé entre écrans (le rôle choisi à l'accueil
 * est réutilisé à l'inscription, plus besoin de le redemander).
 */
object AppState {
    /** 0 = Parent · 1 = Élève · 2 = Professeur */
    var role by mutableIntStateOf(0)
}

val roleLabels = listOf("Parent", "Élève", "Professeur")
