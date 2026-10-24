package ci.monprofperso.app.data

/** Résultats possibles de login/signup ; un challenge n'est jamais une session. */
sealed interface LoginResult {
    data class AwaitingOtp(val challengeId: String, val channel: String, val destination: String, val expiresInMinutes: Int) : LoginResult
    data class Authenticated(val token: String, val user: UserDto) : LoginResult
}

fun interpretLogin(response: AuthResponse, allowDemo: Boolean): LoginResult {
    if (response.otpRequired) {
        require(!response.demo && response.sent && response.token.isNullOrBlank() && response.user == null)
        val id = requireNotNull(response.challengeId).also { require(it.isNotBlank()) }
        val channel = requireNotNull(response.channel).also { require(it in listOf("whatsapp", "email")) }
        val destination = requireNotNull(response.destination).also { require(it.isNotBlank()) }
        val expires = requireNotNull(response.expiresInMinutes).also { require(it in 1..30) }
        return LoginResult.AwaitingOtp(id, channel, destination, expires)
    }
    require(allowDemo && response.demo && !response.token.isNullOrBlank())
    val user = requireNotNull(response.user)
    require(user.id > 0 && user.role in listOf("parent", "student", "teacher", "admin"))
    return LoginResult.Authenticated(response.token, user)
}

/** Le serveur reverifie l'éligibilité lors de l'encaissement. */
fun CourseDto.isPayable(): Boolean = id > 0 && price > 0 && accepted && status == "upcoming" && paymentStatus != "paid"
