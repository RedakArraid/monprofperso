package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.runtime.LaunchedEffect
import ci.monprofperso.app.data.AppState
import ci.monprofperso.app.data.Auth
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.foundation.text.ClickableText
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.nav.Routes
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

/* ====================================================================== *
 * ÉCRAN 1, BIENVENUE & CHOIX DU RÔLE
 * ====================================================================== */
@Composable
fun WelcomeScreen(nav: NavActions) {
    val role = ci.monprofperso.app.data.AppState.role
    AkScreen(background = AkColors.Green) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp)
                .padding(top = 14.dp, bottom = 26.dp),
        ) {
            // logo
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    Modifier.size(36.dp).clip(RoundedCornerShape(11.dp)).background(AkColors.GreenDark),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Filled.School, null, tint = AkColors.White, modifier = Modifier.size(20.dp)) }
                Row {
                    Text("Mon Prof Perso", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 21.sp, color = AkColors.White)
                    Text(".", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 21.sp, color = AkColors.OrangeLight)
                }
            }

            Spacer(Modifier.height(48.dp))
            Text(
                "Le bon prof,\nchez vous ou\nen ligne.",
                fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 39.sp,
                lineHeight = 41.sp, color = AkColors.White,
            )
            Spacer(Modifier.height(18.dp))
            Text(
                "Soutien scolaire du CP à la Terminale, avec des professeurs vérifiés partout en Côte d'Ivoire.",
                fontFamily = Hanken, fontSize = 15.5.sp, lineHeight = 23.sp, color = AkColors.OnGreenSoft,
                modifier = Modifier.widthIn(max = 300.dp),
            )

            Spacer(Modifier.height(28.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Stat("2 500+", "professeurs")
                Box(Modifier.width(1.dp).height(34.dp).background(AkColors.GreenLine))
                Stat("4,9★", "note moyenne")
                Box(Modifier.width(1.dp).height(34.dp).background(AkColors.GreenLine))
                Stat("18", "villes")
            }

            Spacer(Modifier.weight(1f))
            Text("JE SUIS…", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp,
                color = AkColors.OnGreenFaint)
            Spacer(Modifier.height(10.dp))
            RoleOption(Icons.Filled.Groups, "Un parent", "Je cherche un prof pour mon enfant", selected = role == 0) { ci.monprofperso.app.data.AppState.role = 0 }
            Spacer(Modifier.height(9.dp))
            RoleOption(Icons.Filled.School, "Un élève", "Je révise pour réussir mes examens", selected = role == 1) { ci.monprofperso.app.data.AppState.role = 1 }
            Spacer(Modifier.height(9.dp))
            RoleOption(Icons.Filled.CoPresent, "Un professeur", "Je veux donner des cours", selected = role == 2) { ci.monprofperso.app.data.AppState.role = 2 }
            Spacer(Modifier.height(14.dp))
            PrimaryButton("Continuer", Modifier.fillMaxWidth(), onClick = { nav.go(Routes.Signup) })
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                Text("Déjà un compte ? ", fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.OnGreenFaint)
                Text("Se connecter", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp,
                    color = AkColors.White, modifier = Modifier.clickable { nav.go(Routes.Login) })
            }
        }
    }
}

@Composable
private fun Stat(value: String, label: String) {
    Column {
        Text(value, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = AkColors.White)
        Text(label, fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.OnGreenFaint)
    }
}

@Composable
private fun RoleOption(icon: ImageVector, title: String, subtitle: String, selected: Boolean = false, onClick: () -> Unit = {}) {
    val bg = if (selected) AkColors.White else AkColors.White.copy(alpha = 0.12f)
    val titleColor = if (selected) AkColors.Ink else AkColors.White
    val subColor = if (selected) AkColors.Muted else AkColors.OnGreenFaint
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(bg)
            .then(if (selected) Modifier.border(2.dp, AkColors.OrangeLight, RoundedCornerShape(16.dp))
            else Modifier.border(1.5.dp, AkColors.White.copy(alpha = 0.18f), RoundedCornerShape(16.dp)))
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 15.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(40.dp).clip(RoundedCornerShape(11.dp))
                .background(if (selected) AkColors.OrangeSoft else AkColors.White.copy(alpha = 0.16f)),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, null, tint = if (selected) AkColors.Orange else AkColors.White, modifier = Modifier.size(21.dp)) }
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.5.sp, color = titleColor)
            Text(subtitle, fontFamily = Hanken, fontSize = 12.5.sp, color = subColor)
        }
        if (selected) Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Orange, modifier = Modifier.size(23.dp))
    }
}

/* ====================================================================== *
 * ÉCRAN 2, INSCRIPTION
 * ====================================================================== */
@Composable
fun SignupScreen(nav: NavActions) {
    val role = ci.monprofperso.app.data.AppState.role
    val scope = rememberCoroutineScope()
    var phone by remember { mutableStateOf(AppState.authPhone) }
    var email by remember { mutableStateOf(AppState.authEmail) }
    var fullName by remember { mutableStateOf(AppState.authFullName) }
    var channel by remember { mutableStateOf(AppState.authOtpChannel) }
    var consent by remember { mutableStateOf(false) }
    var parentalConsent by remember { mutableStateOf(false) }
    val isStudent = role == 1
    val canSubmit = consent && (!isStudent || parentalConsent)
    val showChannel = AppState.otpWhatsappEnabled && AppState.otpEmailEnabled && !AppState.otpDemo
    val showEmail = channel == "email" && (AppState.otpEmailEnabled || AppState.otpDemo)

    LaunchedEffect(Unit) { Auth.refreshOtpChannels() }

    fun openLegal(slug: String, title: String) {
        nav.openPdf(ci.monprofperso.app.data.ApiConfig.BASE_URL + "api/legal/$slug/file", title)
    }
    AkScreen {
        TopBar("", onBack = { nav.back() })
        Column(
            Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 24.dp),
        ) {
            Text("Créer mon compte", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold,
                fontSize = 25.sp, color = AkColors.Ink)
            Text(
                when (role) {
                    1 -> "Trouvez le bon prof pour réussir vos examens."
                    2 -> "Créez votre profil et commencez à donner des cours."
                    else -> "Trouvez le bon prof pour votre enfant en quelques minutes."
                },
                fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 6.dp))

            Spacer(Modifier.height(20.dp))
            FieldDisplay("Nom & prénoms", fullName, leading = Icons.Outlined.Person)
            Spacer(Modifier.height(14.dp))
            PhoneField(value = phone, onValueChange = { phone = it })
            if (showChannel) {
                Spacer(Modifier.height(14.dp))
                OtpChannelPicker(channel) { channel = it }
            }
            if (showEmail) {
                Spacer(Modifier.height(14.dp))
                EmailField(value = email, onValueChange = { email = it })
            }
            Spacer(Modifier.height(14.dp))
            FieldDisplay("Mot de passe", "••••••••", leading = Icons.Outlined.Lock, trailing = Icons.Filled.VisibilityOff)
            Spacer(Modifier.height(14.dp))
                Text("Je m'inscris en tant que", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.Muted)
                Text("Modifier", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Green,
                    modifier = Modifier.clickable { nav.back() })
            }
            Spacer(Modifier.height(8.dp))
            // Rôle choisi à l'accueil, affiché, pas redemandé.
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(AkColors.GreenSoft)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Green, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(9.dp))
                Text(ci.monprofperso.app.data.roleLabels[role], fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            }
            Spacer(Modifier.height(16.dp))
            ConsentCheckboxLinked(
                checked = consent, onToggle = { consent = !consent },
                onOpenCgu = { openLegal("cgu", "Conditions d'utilisation") },
                onOpenPrivacy = { openLegal("confidentialite", "Politique de confidentialité") },
            )
            if (isStudent) {
                Spacer(Modifier.height(12.dp))
                ConsentCheckbox(
                    checked = parentalConsent, onToggle = { parentalConsent = !parentalConsent },
                    "Je confirme avoir le consentement d'un parent ou tuteur légal (élève mineur).",
                )
            }
        }
        Column(Modifier.padding(horizontal = 24.dp).padding(bottom = 24.dp, top = 12.dp)) {
            PrimaryButton("Créer mon compte", Modifier.fillMaxWidth(),
                color = if (canSubmit) AkColors.Green else AkColors.Border,
                onClick = {
                    if (!canSubmit) return@PrimaryButton
                    scope.launch {
                        val e164 = Auth.normalizePhone(phone)
                        AppState.authPhone = phone
                        AppState.authEmail = email
                        AppState.authFullName = fullName
                        AppState.authOtpChannel = channel
                        if (!Auth.signup(fullName = fullName, phone = e164, roleIndex = role,
                                consent = consent, parentalConsent = parentalConsent)) return@launch
                        Auth.requestOtp(e164, channel, email.takeIf { it.isNotBlank() })
                        nav.go(Routes.Otp)
                    }
                })
            Spacer(Modifier.height(13.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                Text("Déjà un compte ? ", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted)
                Text("Se connecter", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp,
                    color = AkColors.Green, modifier = Modifier.clickable { nav.go(Routes.Login) })
            }
        }
    }
}

@Composable
private fun SegTab(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Box(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) AkColors.Green else AkColors.White)
            .then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(12.dp)))
            .clickable { onClick() }
            .padding(vertical = 11.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontFamily = Hanken, fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
            fontSize = 13.sp, color = if (selected) AkColors.White else AkColors.InkSoft)
    }
}

@Composable
fun PhoneField(
    value: String = "0758421903",
    onValueChange: (String) -> Unit = {},
) {
    Column {
        Text("Numéro de téléphone", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.Muted)
        Spacer(Modifier.height(6.dp))
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(AkColors.White)
                .border(1.dp, AkColors.Border, RoundedCornerShape(14.dp))
                .padding(horizontal = 14.dp, vertical = 11.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                Modifier.clip(RoundedCornerShape(9.dp)).background(AkColors.CardField).padding(horizontal = 9.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Row(Modifier.size(width = 18.dp, height = 12.dp).clip(RoundedCornerShape(2.dp))) {
                    Box(Modifier.weight(1f).fillMaxHeight().background(Color(0xFFF2761A)))
                    Box(Modifier.weight(1f).fillMaxHeight().background(AkColors.White))
                    Box(Modifier.weight(1f).fillMaxHeight().background(Color(0xFF0E9F6E)))
                }
                Text("+225", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Ink)
            }
            Spacer(Modifier.width(10.dp))
            BasicTextField(
                value = value,
                onValueChange = { onValueChange(it.filter { c -> c.isDigit() }.take(10)) },
                textStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Medium, fontSize = 14.5.sp, color = AkColors.Ink),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                singleLine = true,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun EmailField(value: String, onValueChange: (String) -> Unit) {
    Column {
        Text("Adresse e-mail", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.Muted)
        Spacer(Modifier.height(6.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            textStyle = TextStyle(fontFamily = Hanken, fontSize = 14.5.sp, color = AkColors.Ink),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(AkColors.White)
                .border(1.dp, AkColors.Border, RoundedCornerShape(14.dp))
                .padding(horizontal = 14.dp, vertical = 14.dp),
        )
    }
}

@Composable
private fun OtpChannelPicker(selected: String, onSelect: (String) -> Unit) {
    Column {
        Text("Recevoir le code par", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.Muted)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SegTab("WhatsApp", selected == "whatsapp", Modifier.weight(1f)) { onSelect("whatsapp") }
            SegTab("E-mail", selected == "email", Modifier.weight(1f)) { onSelect("email") }
        }
    }
}

/* ====================================================================== *
 * ÉCRAN 3, CONNEXION
 * ====================================================================== */
@Composable
fun LoginScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    var phone by remember { mutableStateOf(AppState.authPhone) }
    var channel by remember { mutableStateOf(AppState.authOtpChannel) }
    var email by remember { mutableStateOf(AppState.authEmail) }
    val showChannel = AppState.otpWhatsappEnabled && AppState.otpEmailEnabled && !AppState.otpDemo
    val showEmail = channel == "email" && (AppState.otpEmailEnabled || AppState.otpDemo)

    LaunchedEffect(Unit) { Auth.refreshOtpChannels() }

    fun goOtp() {
        scope.launch {
            val e164 = Auth.normalizePhone(phone)
            AppState.authPhone = phone
            AppState.authEmail = email
            AppState.authOtpChannel = channel
            Auth.requestOtp(e164, channel, email.takeIf { it.isNotBlank() })
            nav.go(Routes.Otp)
        }
    }

    AkScreen {
        Column(
            Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 26.dp).padding(top = 30.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                Modifier.size(56.dp).clip(RoundedCornerShape(16.dp)).background(AkColors.Green),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.School, null, tint = AkColors.White, modifier = Modifier.size(29.dp)) }
            Spacer(Modifier.height(14.dp))
            Text("Content de vous revoir", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = AkColors.Ink)
            Text("Connectez-vous pour continuer", fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.Muted)

            Spacer(Modifier.height(30.dp))
            PhoneField(value = phone, onValueChange = { phone = it })
            if (showChannel) {
                Spacer(Modifier.height(14.dp))
                OtpChannelPicker(channel) { channel = it }
            }
            if (showEmail) {
                Spacer(Modifier.height(14.dp))
                EmailField(value = email, onValueChange = { email = it })
            }
            Spacer(Modifier.height(14.dp))
            FieldDisplay("Mot de passe", "••••••••", leading = Icons.Outlined.Lock, trailing = Icons.Filled.Visibility)
            Text("Mot de passe oublié ?", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp,
                color = AkColors.Green, modifier = Modifier.align(Alignment.End).clickable { goOtp() }.padding(top = 12.dp))
            Spacer(Modifier.height(20.dp))
            PrimaryButton("Se connecter", Modifier.fillMaxWidth(), color = AkColors.Green, trailingIcon = null,
                onClick = {
                    scope.launch {
                        val e164 = Auth.normalizePhone(phone)
                        AppState.authPhone = phone
                        AppState.authEmail = email
                        AppState.authOtpChannel = channel
                        if (AppState.otpDemo) {
                            Auth.login(e164)
                            nav.enterApp()
                        } else {
                            Auth.requestOtp(e164, channel, email.takeIf { it.isNotBlank() })
                            nav.go(Routes.Otp)
                        }
                    }
                })

            Spacer(Modifier.height(22.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f).height(1.dp).background(AkColors.Border))
                Text("  ou continuer avec  ", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Faint)
                Box(Modifier.weight(1f).height(1.dp).background(AkColors.Border))
            }
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                SocialButton("Google", Icons.Filled.Public, Modifier.weight(1f)) { nav.enterApp() }
                SocialButton("Apple", Icons.Filled.PhoneIphone, Modifier.weight(1f)) { nav.enterApp() }
            }
        }
        Column(Modifier.fillMaxWidth().padding(bottom = 26.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(horizontalArrangement = Arrangement.Center) {
                Text("Nouveau sur Mon Prof Perso ? ", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted)
                Text("Créer un compte", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp,
                    color = AkColors.Green, modifier = Modifier.clickable { nav.go(Routes.Signup) })
            }
            Spacer(Modifier.height(10.dp))
            Text("Démo administrateur", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Faint,
                modifier = Modifier.clickable { scope.launch { Auth.login(Auth.ADMIN_PHONE); nav.enterApp() } })
        }
    }
}

@Composable
private fun SocialButton(label: String, icon: ImageVector, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Row(
        modifier
            .clip(RoundedCornerShape(13.dp))
            .background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(13.dp))
            .clickable { onClick() }
            .padding(vertical = 13.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = AkColors.InkSoft, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(label, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.InkSoft)
    }
}

/** Case à cocher de consentement (CGU / parental), conforme au design Akwaba. */
@Composable
private fun ConsentCheckbox(checked: Boolean, onToggle: () -> Unit, label: String) {
    Row(Modifier.clickable { onToggle() }, verticalAlignment = Alignment.Top) {
        Box(
            Modifier.size(20.dp).clip(RoundedCornerShape(6.dp))
                .background(if (checked) AkColors.Green else AkColors.White)
                .border(1.5.dp, if (checked) AkColors.Green else AkColors.Border, RoundedCornerShape(6.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (checked) Icon(Icons.Filled.Check, null, tint = AkColors.White, modifier = Modifier.size(13.dp))
        }
        Spacer(Modifier.width(9.dp))
        Text(label, fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, lineHeight = 18.sp)
    }
}

/** Case CGU avec « Conditions d'utilisation » et « politique de confidentialité » cliquables (ouvrent le PDF). */
@Composable
private fun ConsentCheckboxLinked(checked: Boolean, onToggle: () -> Unit, onOpenCgu: () -> Unit, onOpenPrivacy: () -> Unit) {
    val link = SpanStyle(color = AkColors.Green, fontWeight = FontWeight.Bold)
    val annotated = buildAnnotatedString {
        append("J'accepte les ")
        pushStringAnnotation("cgu", "cgu"); withStyle(link) { append("Conditions d'utilisation") }; pop()
        append(" et la ")
        pushStringAnnotation("privacy", "privacy"); withStyle(link) { append("politique de confidentialité") }; pop()
        append(".")
    }
    Row(verticalAlignment = Alignment.Top) {
        Box(
            Modifier.size(20.dp).clip(RoundedCornerShape(6.dp))
                .background(if (checked) AkColors.Green else AkColors.White)
                .border(1.5.dp, if (checked) AkColors.Green else AkColors.Border, RoundedCornerShape(6.dp))
                .clickable { onToggle() },
            contentAlignment = Alignment.Center,
        ) {
            if (checked) Icon(Icons.Filled.Check, null, tint = AkColors.White, modifier = Modifier.size(13.dp))
        }
        Spacer(Modifier.width(9.dp))
        ClickableText(
            text = annotated,
            style = TextStyle(fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, lineHeight = 18.sp),
        ) { offset ->
            when {
                annotated.getStringAnnotations("cgu", offset, offset).isNotEmpty() -> onOpenCgu()
                annotated.getStringAnnotations("privacy", offset, offset).isNotEmpty() -> onOpenPrivacy()
                else -> onToggle()
            }
        }
    }
}

/* ====================================================================== *
 * ÉCRAN 4, VÉRIFICATION (OTP)
 * ====================================================================== */
@Composable
fun OtpScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    val phoneE164 = Auth.normalizePhone(AppState.authPhone)
    val codeLen = AppState.otpCodeLength.coerceIn(4, 8)
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var resendSec by remember { mutableIntStateOf(AppState.otpTtlMinutes * 60) }
    var sending by remember { mutableStateOf(false) }

    val channelLabel = when (AppState.authOtpChannel) {
        "email" -> "e-mail"
        else -> "WhatsApp"
    }
    val subtitle = if (AppState.otpDemo) {
        "Mode démo : saisissez n'importe quel code à $codeLen chiffres."
    } else if (AppState.authOtpChannel == "email") {
        "Nous avons envoyé un code à $codeLen chiffres par e-mail à ${AppState.authEmail}."
    } else {
        "Nous avons envoyé un code à $codeLen chiffres par $channelLabel au ${Auth.maskPhone(phoneE164)}."
    }

    LaunchedEffect(Unit) {
        Auth.refreshOtpChannels()
        sending = true
        Auth.requestOtp(phoneE164, AppState.authOtpChannel, AppState.authEmail.takeIf { it.isNotBlank() })
        sending = false
        resendSec = AppState.otpTtlMinutes * 60
    }

    LaunchedEffect(resendSec) {
        if (resendSec > 0) {
            delay(1000)
            resendSec -= 1
        }
    }

    AkScreen {
        TopBar("", onBack = { nav.back() })
        Column(Modifier.weight(1f).padding(horizontal = 28.dp).padding(top = 16.dp)) {
            Box(
                Modifier.size(64.dp).clip(RoundedCornerShape(18.dp)).background(AkColors.GreenSoft),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.ChatBubble, null, tint = AkColors.Green, modifier = Modifier.size(32.dp)) }
            Spacer(Modifier.height(18.dp))
            Text("Entrez le code", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 25.sp, color = AkColors.Ink)
            Spacer(Modifier.height(8.dp))
            Text(subtitle, fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.Muted, lineHeight = 20.sp)
            Spacer(Modifier.height(28.dp))
            BasicTextField(
                value = code,
                onValueChange = { v ->
                    code = v.filter { it.isDigit() }.take(codeLen)
                    error = null
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                modifier = Modifier.size(1.dp),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(codeLen) { i ->
                    val digit = code.getOrNull(i)?.toString() ?: ""
                    val active = code.length == i
                    OtpBox(digit, Modifier.weight(1f), active = active)
                }
            }
            error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Orange)
            }
            Spacer(Modifier.height(24.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                Text("Vous n'avez rien reçu ? ", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted)
                if (resendSec > 0) {
                    Text("Renvoyer dans 0:${resendSec.toString().padStart(2, '0')}", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Faint)
                } else {
                    Text(
                        if (sending) "Envoi…" else "Renvoyer",
                        fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green,
                        modifier = Modifier.clickable(enabled = !sending) {
                            scope.launch {
                                sending = true
                                Auth.requestOtp(phoneE164, AppState.authOtpChannel, AppState.authEmail.takeIf { it.isNotBlank() })
                                sending = false
                                resendSec = AppState.otpTtlMinutes * 60
                            }
                        },
                    )
                }
            }
        }
        Box(Modifier.padding(horizontal = 28.dp).padding(bottom = 26.dp)) {
            PrimaryButton("Vérifier", Modifier.fillMaxWidth(), color = AkColors.Green,
                onClick = {
                    scope.launch {
                        if (!AppState.otpDemo && code.length < codeLen) {
                            error = "Saisissez le code à $codeLen chiffres."
                            return@launch
                        }
                        val ok = Auth.verifyOtp(
                            phoneE164,
                            code,
                            AppState.authEmail.takeIf { it.isNotBlank() },
                        )
                        if (ok) nav.enterApp()
                        else error = "Code invalide ou expiré."
                    }
                })
        }
    }
}

@Composable
private fun OtpBox(digit: String, modifier: Modifier = Modifier, active: Boolean = false) {
    Box(
        modifier
            .height(66.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(AkColors.White)
            .border(if (active) 2.dp else 1.5.dp, if (active) AkColors.Green else AkColors.Border, RoundedCornerShape(16.dp)),
        contentAlignment = Alignment.Center,
    ) {
        if (active) Box(Modifier.size(width = 2.dp, height = 28.dp).background(AkColors.Green))
        else Text(digit, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 27.sp, color = AkColors.Ink)
    }
}
