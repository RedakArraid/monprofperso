package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.platform.testTag
import androidx.compose.runtime.saveable.rememberSaveable
import ci.monprofperso.app.R
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
    val role = AppState.role
    AkScreen(background = AkColors.Green) {
        Column(
            Modifier.weight(1f).fillMaxWidth().verticalScrollSafe()
                .padding(horizontal = 24.dp, vertical = 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(AkColors.GreenDark), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.School, null, tint = AkColors.White, modifier = Modifier.size(22.dp))
                }
                Text("Mon Prof Perso", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold,
                    fontSize = 21.sp, color = AkColors.White, modifier = Modifier.weight(1f))
            }
            Spacer(Modifier.height(22.dp))
            Text("Votre prof,\nà votre rythme.", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold,
                fontSize = 34.sp, lineHeight = 39.sp, color = AkColors.White)
            Spacer(Modifier.height(12.dp))
            Text("Des cours individuels et un suivi adapté, en Côte d’Ivoire.",
                fontFamily = Hanken, fontSize = 16.sp, lineHeight = 23.sp, color = AkColors.OnGreenSoft)
            Spacer(Modifier.height(20.dp))
            Image(painterResource(R.drawable.tutoring_hero), contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxWidth().heightIn(min = 140.dp, max = 230.dp)
                    .clip(RoundedCornerShape(22.dp)).background(AkColors.Canvas))
            Spacer(Modifier.height(22.dp))
            Text("Comment souhaitez-vous utiliser l’app ?", fontFamily = Hanken, fontWeight = FontWeight.Bold,
                fontSize = 15.sp, color = AkColors.White)
            Spacer(Modifier.height(12.dp))
            RoleOption(Icons.Filled.Groups, "Un parent", "Je cherche un prof pour mon enfant", selected = role == 0) { AppState.role = 0 }
            Spacer(Modifier.height(10.dp))
            RoleOption(Icons.Filled.School, "Un élève", "Je souhaite être accompagné", selected = role == 1) { AppState.role = 1 }
            Spacer(Modifier.height(10.dp))
            RoleOption(Icons.Filled.CoPresent, "Un professeur", "Je souhaite donner des cours", selected = role == 2) { AppState.role = 2 }
        }
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(top = 10.dp, bottom = 10.dp)) {
            PrimaryButton("Continuer", Modifier.fillMaxWidth(), onClick = { nav.go(Routes.Signup) })
            androidx.compose.material3.TextButton(onClick = { nav.go(Routes.Login) }, modifier = Modifier.fillMaxWidth()) {
                Text("J’ai déjà un compte · Se connecter", fontFamily = Hanken, fontWeight = FontWeight.Bold,
                    fontSize = 14.sp, textAlign = TextAlign.Center, color = AkColors.White)
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
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick)
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
    val role = AppState.role
    val scope = rememberCoroutineScope()
    var phone by rememberSaveable { mutableStateOf(AppState.authPhone) }
    var email by rememberSaveable { mutableStateOf(AppState.authEmail) }
    var fullName by rememberSaveable { mutableStateOf(AppState.authFullName) }
    var consent by remember { mutableStateOf(false) }
    var consentVersion by remember { mutableStateOf<String?>(null) }
    var parentalConsent by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    val isStudent = role == 1
    val canSubmit = !busy && !consentVersion.isNullOrBlank() && consent && (!isStudent || parentalConsent) && fullName.trim().length >= 2 && phone.count { it.isDigit() } >= 10

    suspend fun loadConsentVersion() {
        val version = Auth.refreshOtpChannels()?.consentVersion?.takeIf { it.isNotBlank() }
        if (version != consentVersion) { consent = false; parentalConsent = false }
        consentVersion = version
        if (version == null) AppState.authError = "Impossible de charger les conditions actuelles. Réessayez avant de créer le compte."
    }
    LaunchedEffect(Unit) { AppState.authError = null; loadConsentVersion() }
    fun openLegal(slug: String, title: String) {
        nav.openPdf(ci.monprofperso.app.data.ApiConfig.BASE_URL + "api/legal/$slug/file", title)
    }
    AkScreen {
        TopBar("", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 24.dp)) {
            Text("Créer mon compte", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 25.sp, color = AkColors.Ink)
            Text("Votre numéro sera vérifié par un code WhatsApp.", fontFamily = Hanken, fontSize = 13.5.sp,
                color = AkColors.Muted, modifier = Modifier.padding(top = 6.dp))
            Spacer(Modifier.height(20.dp))
            androidx.compose.material3.OutlinedTextField(value = fullName, onValueChange = { fullName = it },
                label = { Text("Nom & prénoms") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(14.dp))
            PhoneField(value = phone, onValueChange = { phone = it })
            Spacer(Modifier.height(14.dp))
            EmailField(value = email, onValueChange = { email = it })
            Text("E-mail facultatif. Il ne permettra pas de se connecter avant sa vérification.",
                fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Je m'inscris en tant que", modifier = Modifier.weight(1f), fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.Muted)
                androidx.compose.material3.TextButton(onClick = { nav.back() }) {
                    Text("Modifier", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(AkColors.GreenSoft)
                .padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.CheckCircle, null, tint = AkColors.Green, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(9.dp))
                Text(ci.monprofperso.app.data.roleLabels[role], fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
            }
            Spacer(Modifier.height(16.dp))
            if (consentVersion == null) androidx.compose.material3.TextButton(onClick = { scope.launch { loadConsentVersion() } }) { Text("Recharger les conditions") }
            ConsentCheckboxLinked(checked = consent, enabled = consentVersion != null && !busy, onToggle = { consent = !consent },
                onOpenCgu = { openLegal("cgu", "Conditions d'utilisation") },
                onOpenPrivacy = { openLegal("confidentialite", "Politique de confidentialité") })
            if (isStudent) {
                Spacer(Modifier.height(12.dp))
                ConsentCheckbox(checked = parentalConsent, onToggle = { parentalConsent = !parentalConsent },
                    "Je confirme avoir le consentement d'un parent ou tuteur légal (élève mineur).", enabled = !busy)
            }
            AppState.authError?.let { Text(it, color = AkColors.OrangeStrong, modifier = Modifier.padding(top = 12.dp)) }
        }
        Column(Modifier.padding(horizontal = 24.dp).padding(bottom = 24.dp, top = 12.dp)) {
            PrimaryButton(if (busy) "Vérification…" else "Créer mon compte", Modifier.fillMaxWidth(),
                color = AkColors.Green, enabled = canSubmit, onClick = {
                    if (!canSubmit) return@PrimaryButton
                    busy = true
                    scope.launch {
                        try {
                            AppState.authPhone = phone
                            AppState.authEmail = email
                            AppState.authFullName = fullName
                            AppState.authOtpChannel = "whatsapp"
                            val version = consentVersion ?: return@launch
                            if (Auth.signup(fullName, Auth.normalizePhone(phone), role, consent, parentalConsent, version)) {
                                if (AppState.authChallengeId != null) nav.go(Routes.Otp) else nav.enterApp()
                            } else if (AppState.authErrorCode == "consent_version_changed") {
                                consent = false; parentalConsent = false; consentVersion = null
                                loadConsentVersion()
                            }
                        } finally { busy = false }
                    }
                })
            Spacer(Modifier.height(13.dp))
            androidx.compose.material3.TextButton(onClick = { nav.go(Routes.Login) }, modifier = Modifier.fillMaxWidth()) {
                Text("Déjà un compte ? Se connecter", textAlign = TextAlign.Center, color = AkColors.Green)
            }
        }
    }
}

@Composable
private fun SegTab(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Box(
        modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) AkColors.Green else AkColors.White)
            .then(if (selected) Modifier else Modifier.border(1.dp, AkColors.Border, RoundedCornerShape(12.dp)))
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick)
            .padding(vertical = 11.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontFamily = Hanken, fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
            fontSize = 13.sp, color = if (selected) AkColors.White else AkColors.InkSoft)
    }
}

@Composable
fun PhoneField(
    value: String = "",
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
                value = value.removePrefix("+225"),
                onValueChange = { onValueChange(it.filter { c -> c.isDigit() }.let { digits -> if (digits.length > 10 && digits.startsWith("225")) digits.drop(3) else digits }.take(10)) },
                textStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Medium, fontSize = 14.5.sp, color = AkColors.Ink),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                singleLine = true,
                modifier = Modifier.weight(1f).heightIn(min = 48.dp).testTag("auth-phone")
                    .semantics { contentDescription = "Numéro de téléphone, indicatif Côte d’Ivoire +225" },
                decorationBox = { field ->
                    Box(Modifier.fillMaxWidth().heightIn(min = 48.dp), contentAlignment = Alignment.CenterStart) { field() }
                },
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
                .fillMaxWidth().heightIn(min = 56.dp).semantics { contentDescription = "Adresse e-mail" }
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
    var phone by rememberSaveable { mutableStateOf(AppState.authPhone) }
    var channel by remember { mutableStateOf("whatsapp") }
    var email by rememberSaveable { mutableStateOf(AppState.authEmail) }
    var busy by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        AppState.authError = null
        Auth.refreshOtpChannels()?.let { channel = it.defaultChannel }
    }
    fun connect(number: String = phone) {
        if (busy) return
        busy = true
        scope.launch {
            try {
                AppState.authPhone = number
                AppState.authEmail = email
                AppState.authOtpChannel = channel
                if (Auth.login(Auth.normalizePhone(number), channel, email.takeIf { it.isNotBlank() })) {
                    if (AppState.authChallengeId != null) nav.go(Routes.Otp) else nav.enterApp()
                }
            } finally { busy = false }
        }
    }
    AkScreen {
        TopBar("Connexion", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 26.dp).padding(top = 20.dp, bottom = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.size(56.dp).clip(RoundedCornerShape(16.dp)).background(AkColors.Green), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.School, null, tint = AkColors.White, modifier = Modifier.size(29.dp))
            }
            Spacer(Modifier.height(14.dp))
            Text("Content de vous revoir", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = AkColors.Ink, textAlign = TextAlign.Center)
            Text("Connectez-vous avec un code de vérification.", fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Muted, textAlign = TextAlign.Center)
            Spacer(Modifier.height(30.dp))
            PhoneField(value = phone, onValueChange = { phone = it })
            if (AppState.otpWhatsappEnabled && AppState.otpEmailEnabled && !AppState.otpDemo) {
                Spacer(Modifier.height(14.dp))
                OtpChannelPicker(channel) { channel = it }
            }
            if (channel == "email") {
                Spacer(Modifier.height(14.dp))
                EmailField(value = email, onValueChange = { email = it })
                Text("Utilisez uniquement l'adresse déjà vérifiée pour ce compte.", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
            }
            AppState.authError?.let { Text(it, color = AkColors.OrangeStrong, modifier = Modifier.padding(top = 14.dp)) }
            Spacer(Modifier.height(20.dp))
            PrimaryButton(if (busy) "Connexion…" else "Se connecter", Modifier.fillMaxWidth(),
                color = AkColors.Green, enabled = !busy && phone.count(Char::isDigit) >= 10, trailingIcon = null, onClick = { connect() })
        }
        Column(Modifier.fillMaxWidth().padding(bottom = 26.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Nouveau sur Mon Prof Perso ?", fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Muted, textAlign = TextAlign.Center)
            androidx.compose.material3.TextButton(onClick = { nav.go(Routes.Signup) }, modifier = Modifier.fillMaxWidth()) {
                Text("Créer un compte", color = AkColors.Green)
            }
            if (AppState.otpDemo) {
                Spacer(Modifier.height(10.dp))
                Text("Démo administrateur", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Faint,
                    modifier = Modifier.clickable(enabled = !busy) { connect(Auth.ADMIN_PHONE) })
            }
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
private fun ConsentCheckbox(checked: Boolean, onToggle: () -> Unit, label: String, enabled: Boolean = true) {
    Row(Modifier.fillMaxWidth().toggleable(value = checked, enabled = enabled, role = Role.Checkbox, onValueChange = { onToggle() }),
        verticalAlignment = Alignment.CenterVertically) {
        androidx.compose.material3.Checkbox(checked = checked, onCheckedChange = null, enabled = enabled, modifier = Modifier.padding(12.dp))
        Text(label, fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Muted, lineHeight = 21.sp,
            modifier = Modifier.weight(1f).padding(vertical = 12.dp))
    }
}

/** Les liens des documents restent des actions séparées du consentement. */
@Composable
private fun ConsentCheckboxLinked(checked: Boolean, onToggle: () -> Unit, onOpenCgu: () -> Unit, onOpenPrivacy: () -> Unit, enabled: Boolean = true) {
    Column {
        ConsentCheckbox(checked, onToggle, "J’accepte les conditions d’utilisation et la politique de confidentialité.", enabled)
        androidx.compose.material3.TextButton(onClick = onOpenCgu) { Text("Lire les conditions d’utilisation") }
        androidx.compose.material3.TextButton(onClick = onOpenPrivacy) { Text("Lire la politique de confidentialité") }
    }
}

/* ====================================================================== *
 * ÉCRAN 4, VÉRIFICATION (OTP)
 * ====================================================================== */
@Composable
fun OtpScreen(nav: NavActions) {
    val scope = rememberCoroutineScope()
    val codeLen = 6
    var code by remember { mutableStateOf("") }
    var resendSec by remember { mutableIntStateOf(60) }
    var sending by remember { mutableStateOf(false) }
    var verifying by remember { mutableStateOf(false) }
    val destination = AppState.authDestination.ifBlank { Auth.maskPhone(Auth.normalizePhone(AppState.authPhone)) }
    val channelLabel = if (AppState.authOtpChannel == "email") "e-mail" else "WhatsApp"

    // Le premier code a déjà été envoyé par login/signup. Aucun second envoi à l'ouverture.
    LaunchedEffect(resendSec) {
        if (resendSec > 0) { delay(1000); resendSec -= 1 }
    }
    AkScreen {
        TopBar("", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 28.dp).padding(top = 16.dp)) {
            Box(Modifier.size(64.dp).clip(RoundedCornerShape(18.dp)).background(AkColors.GreenSoft), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.ChatBubble, null, tint = AkColors.Green, modifier = Modifier.size(32.dp))
            }
            Spacer(Modifier.height(18.dp))
            Text("Entrez le code", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 25.sp, color = AkColors.Ink)
            Spacer(Modifier.height(8.dp))
            Text("Code à $codeLen chiffres envoyé par $channelLabel à $destination. Valable ${AppState.otpTtlMinutes} minutes.",
                fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.Muted, lineHeight = 20.sp)
            Spacer(Modifier.height(28.dp))
            androidx.compose.material3.OutlinedTextField(value = code,
                onValueChange = { code = it.filter { digit -> digit in '0'..'9' }.take(codeLen); AppState.authError = null },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                label = { Text("Code de vérification") }, singleLine = true, modifier = Modifier.fillMaxWidth().testTag("auth-otp"))
            AppState.authError?.let { Text(it, fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.OrangeStrong, modifier = Modifier.padding(top = 12.dp)) }
            Spacer(Modifier.height(24.dp))
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Vous n'avez rien reçu ?", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted)
                if (resendSec > 0) {
                    Text("Renvoyer dans ${resendSec / 60}:${(resendSec % 60).toString().padStart(2, '0')}",
                        fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted, modifier = Modifier.padding(vertical = 12.dp))
                } else {
                    Text(if (sending) "Envoi…" else "Renvoyer", fontFamily = Hanken, fontWeight = FontWeight.Bold,
                        fontSize = 13.sp, color = AkColors.Green, modifier = Modifier.heightIn(min = 48.dp).clickable(enabled = !sending && !verifying, role = Role.Button) {
                            sending = true
                            scope.launch {
                                try { if (Auth.resendOtp()) { resendSec = 60; code = "" } } finally { sending = false }
                            }
                        })
                }
            }
        }
        Box(Modifier.padding(horizontal = 28.dp).padding(bottom = 26.dp)) {
            PrimaryButton(if (verifying) "Vérification…" else "Vérifier", Modifier.fillMaxWidth(),
                color = AkColors.Green, enabled = code.length == codeLen && !verifying && !sending, onClick = {
                    if (verifying || sending || code.length != codeLen) return@PrimaryButton
                    verifying = true
                    scope.launch {
                        try { if (Auth.verifyOtp(code)) nav.enterApp() } finally { verifying = false }
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
