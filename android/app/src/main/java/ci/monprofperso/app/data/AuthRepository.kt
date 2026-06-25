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

    /** Index de rôle UI (0/1/2) -> valeur attendue par l'API. */
    private val apiRole = listOf("parent", "student", "teacher")

    suspend fun login(phone: String = DEMO_PHONE) {
        runCatching { Api.service.login(mapOf("phone" to phone)) }
            .onSuccess { TokenStore.save(it.token) }
    }

    suspend fun signup(fullName: String, phone: String = DEMO_PHONE, roleIndex: Int) {
        runCatching {
            Api.service.signup(
                mapOf("fullName" to fullName, "phone" to phone, "role" to apiRole[roleIndex.coerceIn(0, 2)])
            )
        }.onSuccess { TokenStore.save(it.token) }
    }

    suspend fun verifyOtp(phone: String = DEMO_PHONE) {
        runCatching { Api.service.verifyOtp(mapOf("phone" to phone)) }
            .onSuccess { TokenStore.save(it.token) }
    }

    fun logout() = TokenStore.clear()
}
