package ci.monprofperso.app.ui.theme

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import ci.monprofperso.app.R

/**
 * Deux familles, comme la maquette :
 *  - Schibsted Grotesk → titres (display)
 *  - Hanken Grotesk     → corps / UI
 */
val Schibsted = FontFamily(
    Font(R.font.schibsted_grotesk_bold, FontWeight.Bold),
    Font(R.font.schibsted_grotesk_extrabold, FontWeight.ExtraBold),
    Font(R.font.schibsted_grotesk_black, FontWeight.Black),
)

val Hanken = FontFamily(
    Font(R.font.hanken_grotesk_regular, FontWeight.Normal),
    Font(R.font.hanken_grotesk_medium, FontWeight.Medium),
    Font(R.font.hanken_grotesk_semibold, FontWeight.SemiBold),
    Font(R.font.hanken_grotesk_bold, FontWeight.Bold),
    Font(R.font.hanken_grotesk_extrabold, FontWeight.ExtraBold),
)
