package ci.monprofperso.app.data

/**
 * Authentification : appelle les endpoints `api/auth/...`, récupère le JWT et le
 * persiste via [TokenStore]. Les appels suivants l'envoient en `Authorization: Bearer`.
 *
 * Tolérant aux pannes : si l'API est injoignable, on n'échoue pas (l'app continue
 * en mode démo, le backend retombant alors sur l'utilisateur de démonstration).
 */
object Auth {
    /** Numéro de démonstration (= utilisateur seed « Aya Koné »). */
    const val DEMO_PHONE = "+2250758421903"

    /** Numéro de l'administrateur de démonstration (seed). */
    const val ADMIN_PHONE = "+2250700000001"

    /** Index de rôle UI (0/1/2) -> valeur attendue par l'API. */
    private val apiRole = listOf("parent", "student", "teacher")

    /** Formate un numéro local (8–10 chiffres) en E.164 ivoirien. */
    fun normalizePhone(local: String): String {
        val digits = local.filter { it.isDigit() }
        return when {
            digits.startsWith("225") -> "+$digits"
            else -> "+225$digits"
        }
    }

    /** Masque un numéro pour l'affichage OTP (ex. +225 07 58 ** ** 03). */
    fun maskPhone(e164: String): String {
        val d = e164.filter { it.isDigit() }
        if (d.length < 8) return e164
        val local = if (d.startsWith("225")) d.drop(3) else d
        val a = local.take(2)
        val b = local.drop(2).take(2)
        val last = local.takeLast(2)
        return "+225 $a $b ** ** $last"
    }

    suspend fun refreshOtpChannels(): OtpChannelsDto? {
        return runCatching { Api.service.otpChannels() }.onSuccess { c ->
            AppState.otpDemo = c.demo
            AppState.otpCodeLength = c.codeLength
            AppState.otpTtlMinutes = c.ttlMinutes
            AppState.otpWhatsappEnabled = c.whatsapp
            AppState.otpEmailEnabled = c.email
            if (c.defaultChannel == "email" || c.defaultChannel == "whatsapp") {
                AppState.authOtpChannel = c.defaultChannel
            }
        }.getOrNull()
    }

    suspend fun login(phone: String = DEMO_PHONE) {
        runCatching { Api.service.login(mapOf("phone" to phone)) }
            .onSuccess { TokenStore.save(it.token, it.user.role); AppState.authRole = it.user.role }
    }

    suspend fun signup(
        fullName: String,
        phone: String = DEMO_PHONE,
        roleIndex: Int,
        consent: Boolean = true,
        parentalConsent: Boolean = false,
    ): Boolean {
        val channels = refreshOtpChannels()
        val demo = channels?.demo != false
        return runCatching {
            Api.service.signup(
                mapOf(
                    "fullName" to fullName, "phone" to phone, "role" to apiRole[roleIndex.coerceIn(0, 2)],
                    "consent" to consent.toString(), "parentalConsent" to parentalConsent.toString(),
                )
            )
        }.onSuccess { r ->
            if (demo) {
                TokenStore.save(r.token, r.user.role)
                AppState.authRole = r.user.role
            }
        }.isSuccess
    }

    suspend fun requestOtp(
        phone: String,
        channel: String = AppState.authOtpChannel,
        email: String? = null,
    ): RequestOtpResponse? {
        val body = mutableMapOf("phone" to phone, "channel" to channel)
        email?.takeIf { it.isNotBlank() }?.let { body["email"] = it }
        return runCatching { Api.service.requestOtp(body) }.getOrNull()
    }

    suspend fun verifyOtp(
        phone: String,
        code: String,
        email: String? = null,
    ): Boolean {
        val body = mutableMapOf("phone" to phone, "code" to code)
        email?.takeIf { it.isNotBlank() }?.let { body["email"] = it }
        return runCatching { Api.service.verifyOtp(body) }
            .onSuccess { r ->
                val role = r.user?.role
                TokenStore.save(r.token, role)
                if (role != null) AppState.authRole = role
            }
            .isSuccess
    }

    /** Connexion : OTP si activé côté serveur, sinon JWT direct. */
    suspend fun loginOrRequestOtp(phone: String): Boolean {
        val channels = refreshOtpChannels()
        return if (channels?.demo != false) {
            login(phone)
            true
        } else {
            requestOtp(phone, AppState.authOtpChannel, AppState.authEmail.takeIf { it.isNotBlank() }) != null
        }
    }

    fun logout() = TokenStore.clear()
}
