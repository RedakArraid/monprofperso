package ci.monprofperso.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ----------------------------------------------------------------------------
 * Boutons
 * ------------------------------------------------------------------------- */

@Composable
fun PrimaryButton(
    label: String,
    modifier: Modifier = Modifier,
    color: Color = AkColors.Orange,
    trailingIcon: ImageVector? = Icons.AutoMirrored.Filled.ArrowForward,
    onClick: () -> Unit = {},
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(15.dp))
            .background(color)
            .clickable { onClick() }
            .padding(vertical = 16.dp, horizontal = 18.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = AkColors.White, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.5.sp)
        if (trailingIcon != null) {
            Spacer(Modifier.width(8.dp))
            Icon(trailingIcon, null, tint = AkColors.White, modifier = Modifier.size(18.dp))
        }
    }
}

/* ----------------------------------------------------------------------------
 * Barres de titre
 * ------------------------------------------------------------------------- */

/** Petit carré arrondi cliquable contenant une icône (back, fermer, etc.). */
@Composable
fun IconSquare(
    icon: ImageVector,
    modifier: Modifier = Modifier,
    bg: Color = AkColors.CardField,
    tint: Color = AkColors.Ink,
    size: Int = 40,
    onClick: () -> Unit = {},
) {
    Box(
        modifier = modifier
            .size(size.dp)
            .clip(RoundedCornerShape((size * 0.3).dp))
            .background(bg)
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size((size * 0.48).dp))
    }
}

@Composable
fun TopBar(
    title: String,
    subtitle: String? = null,
    onBack: () -> Unit = {},
    closeIcon: Boolean = false,
    trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconSquare(if (closeIcon) Icons.Filled.Close else Icons.AutoMirrored.Filled.ArrowBack, onClick = onBack)
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = AkColors.Ink)
            if (subtitle != null) {
                Text(subtitle, fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
            }
        }
        if (trailing != null) trailing()
    }
}

/* ----------------------------------------------------------------------------
 * En-tête de section + lien "Tout voir"
 * ------------------------------------------------------------------------- */

@Composable
fun SectionHeader(title: String, action: String? = "Tout voir", onAction: () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 16.5.sp, color = AkColors.Ink)
        if (action != null) {
            Text(action, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp,
                color = AkColors.Green, modifier = Modifier.clickable { onAction() })
        }
    }
}

/* ----------------------------------------------------------------------------
 * Chips (filtres, niveaux, matières)
 * ------------------------------------------------------------------------- */

@Composable
fun Chip(
    label: String,
    selected: Boolean = false,
    leading: ImageVector? = null,
    onClick: () -> Unit = {},
) {
    val bg = if (selected) AkColors.Green else AkColors.White
    val fg = if (selected) AkColors.White else AkColors.InkSoft
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(11.dp))
            .background(bg)
            .then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(11.dp)))
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leading != null) {
            Icon(leading, null, tint = fg, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(5.dp))
        }
        Text(label, color = fg, fontFamily = Hanken,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold, fontSize = 12.5.sp)
    }
}

/** Petite étiquette colorée (badge "À domicile", "En ligne", "Spécial BEPC"). */
@Composable
fun Tag(label: String, fg: Color = AkColors.Green, bg: Color = AkColors.GreenSoft) {
    Text(
        label,
        color = fg,
        fontFamily = Hanken,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.5.sp,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

/* ----------------------------------------------------------------------------
 * Avatar à initiales + sceau "vérifié"
 * ------------------------------------------------------------------------- */

@Composable
fun InitialsAvatar(
    initials: String,
    size: Int = 54,
    bg: Color = AkColors.GreenSoft,
    fg: Color = AkColors.Green,
    radius: Int = 15,
    fontSize: Int = 19,
    verified: Boolean = false,
) {
    Box(contentAlignment = Alignment.Center) {
        Box(
            modifier = Modifier
                .size(size.dp)
                .clip(RoundedCornerShape(radius.dp))
                .background(bg),
            contentAlignment = Alignment.Center,
        ) {
            Text(initials, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, color = fg, fontSize = fontSize.sp)
        }
        if (verified) {
            Icon(
                Icons.Filled.Verified, null, tint = AkColors.Green,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .offset(x = 4.dp, y = 4.dp)
                    .size(18.dp)
                    .clip(CircleShape)
                    .background(AkColors.White),
            )
        }
    }
}

/* ----------------------------------------------------------------------------
 * Note (étoile + valeur)
 * ------------------------------------------------------------------------- */

@Composable
fun RatingInline(value: String, reviews: String? = null, extra: String? = null) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            Icon(Icons.Filled.Star, null, tint = AkColors.Star, modifier = Modifier.size(13.dp))
            Text(value, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = AkColors.Ink)
        }
        if (reviews != null) Text(reviews, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Faint)
        if (extra != null) Text("· $extra", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Faint)
    }
}

/* ----------------------------------------------------------------------------
 * Carte blanche générique
 * ------------------------------------------------------------------------- */

@Composable
fun Card(
    modifier: Modifier = Modifier,
    radius: Int = 18,
    bg: Color = AkColors.White,
    border: Boolean = true,
    padding: Int = 13,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radius.dp))
            .background(bg)
            .then(if (border) Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(radius.dp)) else Modifier)
            .padding(padding.dp),
        content = content,
    )
}

/* ----------------------------------------------------------------------------
 * Pastille d'étape (badge texte capsule)
 * ------------------------------------------------------------------------- */

@Composable
fun Pill(text: String, fg: Color, bg: Color, bold: Boolean = true) {
    Text(
        text,
        color = fg,
        fontFamily = Hanken,
        fontWeight = if (bold) FontWeight.Bold else FontWeight.SemiBold,
        fontSize = 12.sp,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

/* ----------------------------------------------------------------------------
 * Champ de formulaire (affichage type maquette : libellé + valeur)
 * ------------------------------------------------------------------------- */

@Composable
fun FieldDisplay(
    label: String,
    value: String,
    leading: ImageVector? = null,
    trailing: ImageVector? = null,
    valueColor: Color = AkColors.Ink,
) {
    Column {
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.Muted)
        Spacer(Modifier.height(6.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(AkColors.White)
                .border(1.dp, AkColors.Border, RoundedCornerShape(14.dp))
                .padding(horizontal = 15.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (leading != null) {
                Icon(leading, null, tint = AkColors.Faint, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
            }
            Text(value, fontFamily = Hanken, fontWeight = FontWeight.Medium, fontSize = 14.5.sp,
                color = valueColor, modifier = Modifier.weight(1f))
            if (trailing != null) Icon(trailing, null, tint = AkColors.Faint, modifier = Modifier.size(18.dp))
        }
    }
}
