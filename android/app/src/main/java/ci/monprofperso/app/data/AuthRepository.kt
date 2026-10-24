package ci.monprofperso.app.data

import ci.monprofperso.app.BuildConfig
import kotlinx.coroutines.CancellationException
import org.json.JSONObject
import retrofit2.HttpException

/** Une session existe seulement après preuve OTP ou réponse explicite d'un serveur de démonstration. */
object Auth {
    const val ADMIN_PHONE = "+2250700000001"
    private val apiRole = listOf("parent", "student", "teacher")

    fun normalizePhone(local: String): String {
        val digits = local.filter { it.isDigit() }
        return if (digits.length == 10 && digits.startsWith("0")) "+225$digits" else "+$digits"
    }

    fun maskPhone(e164: String): String {
        val digits = e164.filter { it.isDigit() }
        return if (digits.length < 8) e164 else "+${digits.take(5)} ** ** ${digits.takeLast(2)}"
    }

    fun errorMessage(error: Throwable): String {
        if (error is HttpException) {
            val message = runCatching { JSONObject(error.response()?.errorBody()?.string().orEmpty()).optString("message") }.getOrNull()
            if (!message.isNullOrBlank()) return message
            return when (error.code()) {
                401 -> "Connexion nécessaire ou code incorrect."
                403 -> "Cette opération n'est pas autorisée pour ce compte."
                429 -> "Trop de tentatives. Patientez avant de réessayer."
                503 -> "Le service de vérification est indisponible. Réessayez plus tard."
                else -> "La demande a échoué. Réessayez."
            }
        }
        return "Impossible de joindre le service ou de conserver la session. Vérifiez votre connexion puis réessayez."
    }

    private fun fail(error: Throwable) {
        if (error is CancellationException) throw error
        AppState.authError = errorMessage(error)
    }

    private fun saveSession(token: String, user: UserDto) {
        TokenStore.save(token, user.role)
        AppState.authRole = user.role
        AppState.authTeacherId = user.teacherId
        AppState.authPhone = user.phone
        AppState.authFullName = user.fullName
        AppState.authChallengeId = null
        AppState.authError = null
    }

    private fun acceptResponse(response: AuthResponse) {
        when (val result = interpretLogin(response, allowDemo = BuildConfig.DEBUG)) {
            is LoginResult.AwaitingOtp -> {
                TokenStore.clear()
                AppState.authRole = null
                AppState.authTeacherId = null
                AppState.authChallengeId = result.challengeId
                AppState.authDestination = result.destination
                AppState.authOtpChannel = result.channel
                AppState.otpTtlMinutes = result.expiresInMinutes
            }
            is LoginResult.Authenticated -> saveSession(result.token, result.user)
        }
    }

    suspend fun refreshOtpChannels(): OtpChannelsDto? = try {
        Api.service.otpChannels().also { channels ->
            AppState.otpDemo = channels.demo && BuildConfig.DEBUG
            AppState.otpCodeLength = channels.codeLength
            AppState.otpTtlMinutes = channels.ttlMinutes
            AppState.otpWhatsappEnabled = channels.whatsapp
            AppState.otpEmailEnabled = channels.email
        }
    } catch (error: Exception) {
        if (error is CancellationException) throw error
        AppState.otpDemo = false
        null
    }

    suspend fun login(phone: String, channel: String = AppState.authOtpChannel, email: String? = null): Boolean {
        AppState.authError = null
        AppState.authChallengeId = null
        TokenStore.clear()
        AppState.authRole = null
        return try {
            val body = mutableMapOf("phone" to phone, "channel" to channel)
            email?.takeIf { it.isNotBlank() }?.let { body["email"] = it.trim() }
            acceptResponse(Api.service.login(body))
            true
        } catch (error: Exception) { fail(error); false }
    }

    suspend fun signup(fullName: String, phone: String, roleIndex: Int, consent: Boolean, parentalConsent: Boolean): Boolean {
        AppState.authError = null
        AppState.authChallengeId = null
        TokenStore.clear()
        AppState.authRole = null
        return try {
            val body = mutableMapOf(
                "fullName" to fullName.trim(), "phone" to phone, "role" to apiRole[roleIndex.coerceIn(0, 2)],
                "consent" to consent.toString(), "parentalConsent" to parentalConsent.toString(),
            )
            AppState.authEmail.takeIf { it.isNotBlank() }?.let { body["email"] = it.trim() }
            acceptResponse(Api.service.signup(body))
            true
        } catch (error: Exception) { fail(error); false }
    }

    /** Le renvoi conserve l'identité et l'opération liées au challenge côté serveur. */
    suspend fun resendOtp(): Boolean {
        AppState.authError = null
        val challengeId = AppState.authChallengeId ?: return false
        return try {
            val response = Api.service.requestOtp(mapOf("challengeId" to challengeId))
            check(response.sent && response.otpRequired && !response.challengeId.isNullOrBlank())
            AppState.authChallengeId = response.challengeId
            AppState.authDestination = response.destination.orEmpty()
            AppState.authOtpChannel = response.channel ?: AppState.authOtpChannel
            AppState.otpTtlMinutes = response.expiresInMinutes
            true
        } catch (error: Exception) { fail(error); false }
    }

    suspend fun verifyOtp(code: String): Boolean {
        AppState.authError = null
        val challengeId = AppState.authChallengeId ?: run {
            AppState.authError = "La vérification a expiré. Recommencez la connexion."
            return false
        }
        return try {
            val response = Api.service.verifyOtp(mapOf("challengeId" to challengeId, "code" to code))
            check(response.verified && response.token.isNotBlank() && response.user != null)
            saveSession(response.token, response.user!!)
            true
        } catch (error: Exception) { fail(error); false }
    }

    suspend fun restoreSession(): Boolean {
        val token = TokenStore.token ?: return false
        return try {
            saveSession(token, Api.service.me())
            true
        } catch (error: Exception) {
            if (error is CancellationException) throw error
            if (error is HttpException && error.code() in listOf(401, 403)) logout()
            AppState.authError = errorMessage(error)
            false
        }
    }

    fun logout() {
        TokenStore.clear()
        AppState.authRole = null
        AppState.authTeacherId = null
        AppState.authChallengeId = null
        AppState.authError = null
        AppState.bkCourseId = null
    }
}
