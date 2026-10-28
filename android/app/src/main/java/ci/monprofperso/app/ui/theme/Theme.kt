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
    onSecondary = AkColors.Ink,
    secondaryContainer = AkColors.OrangeSoft,
    onSecondaryContainer = AkColors.OrangeStrong,
    primaryContainer = AkColors.GreenSoft,
    onPrimaryContainer = AkColors.GreenDark,
    background = AkColors.Canvas,
    onBackground = AkColors.Ink,
    surface = AkColors.White,
    onSurface = AkColors.Ink,
    onSurfaceVariant = AkColors.Muted,
    surfaceVariant = AkColors.CardField,
)

private val AkTypography = Typography(
    displayLarge = TextStyle(fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 36.sp, lineHeight = 42.sp),
    displayMedium = TextStyle(fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 32.sp, lineHeight = 38.sp),
    displaySmall = TextStyle(fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, lineHeight = 34.sp),
    headlineLarge = TextStyle(fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, lineHeight = 34.sp),
    headlineMedium = TextStyle(fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 25.sp, lineHeight = 31.sp),
    headlineSmall = TextStyle(fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 22.sp, lineHeight = 28.sp),
    titleLarge = TextStyle(fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 21.sp, lineHeight = 28.sp),
    titleMedium = TextStyle(fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 25.sp),
    titleSmall = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 23.sp),
    bodyLarge = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.sp, lineHeight = 21.sp),
    labelMedium = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, lineHeight = 18.sp),
    labelSmall = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, lineHeight = 16.sp),
)

@Composable
fun MonProfPersoTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AkColorScheme,
        typography = AkTypography,
        content = content,
    )
}
