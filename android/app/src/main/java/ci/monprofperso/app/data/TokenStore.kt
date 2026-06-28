package ci.monprofperso.app.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Stockage du JWT d'authentification (persisté entre lancements via SharedPreferences).
 * Le token, une fois en mémoire, est injecté dans l'en-tête `Authorization: Bearer`
 * par l'intercepteur OkHttp (voir [Api]). En l'absence de token, le backend retombe
 * sur l'utilisateur de démo (rétrocompat).
 */
object TokenStore {
    private const val PREFS = "mpp_auth"
    private const val KEY_TOKEN = "jwt"
    private const val KEY_ROLE = "role"

    @Volatile
    var token: String? = null
        private set

    /** Rôle réel persisté (`parent|student|teacher|admin`), restauré au démarrage. */
    @Volatile
    var role: String? = null
        private set

    private var prefs: SharedPreferences? = null

    /** À appeler une fois au démarrage (MainActivity) pour recharger le token persisté. */
    fun init(context: Context) {
        val p = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs = p
        token = p.getString(KEY_TOKEN, null)
        role = p.getString(KEY_ROLE, null)
    }

    /** Enregistre le token (et, si fourni, le rôle réel renvoyé par le serveur). */
    fun save(value: String, userRole: String? = null) {
        token = value
        if (userRole != null) role = userRole
        prefs?.edit()?.apply {
            putString(KEY_TOKEN, value)
            if (userRole != null) putString(KEY_ROLE, userRole)
            apply()
        }
    }

    fun clear() {
        token = null
        role = null
        prefs?.edit()?.remove(KEY_TOKEN)?.remove(KEY_ROLE)?.apply()
    }
}
