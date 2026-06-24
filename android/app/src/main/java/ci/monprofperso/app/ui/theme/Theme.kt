package ci.monprofperso.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val AkColorScheme = lightColorScheme(
    primary = AkColors.Green,
    onPrimary = AkColors.White,
    secondary = AkColors.Orange,
    onSecondary = AkColors.White,
    background = AkColors.Canvas,
    onBackground = AkColors.Ink,
    surface = AkColors.White,
    onSurface = AkColors.Ink,
)

private val AkTypography = Typography(
    bodyLarge = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Normal, fontSize = 15.sp),
    bodyMedium = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Normal, fontSize = 13.5.sp),
    labelLarge = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.sp),
)

@Composable
fun MonProfPersoTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AkColorScheme,
        typography = AkTypography,
        content = content,
    )
}
