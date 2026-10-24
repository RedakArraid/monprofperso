package ci.monprofperso.app.data

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

/** JWT et rôle chiffrés avec une clé AES non exportable de l'Android Keystore. */
object TokenStore {
    private const val PREFS = "mpp_auth"
    private const val KEY_SESSION = "session_v2"
    private const val KEY_ALIAS = "ci.monprofperso.auth.v2"

    @Volatile var token: String? = null
        private set
    @Volatile var role: String? = null
        private set
    private var prefs: SharedPreferences? = null

    private fun secretKey(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build())
        }.generateKey()
    }

    @Synchronized fun init(context: Context) {
        val storage = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs = storage
        // Les anciens JWT sans preuve sont révoqués côté serveur ; supprimer leur copie en clair.
        storage.edit().remove("jwt").remove("role").apply()
        token = null
        role = null
        val encoded = storage.getString(KEY_SESSION, null) ?: return
        runCatching {
            val parts = encoded.split(":", limit = 2)
            require(parts.size == 2)
            val iv = Base64.decode(parts[0], Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
                init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, iv))
            }
            val session = JSONObject(String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8))
            val restoredToken = session.getString("token")
            val restoredRole = session.getString("role")
            require(restoredToken.isNotBlank() && restoredRole in listOf("parent", "student", "teacher", "admin"))
            token = restoredToken
            role = restoredRole
        }.onFailure { clear() }
    }

    @Synchronized fun save(value: String, userRole: String) {
        require(value.isNotBlank() && userRole in listOf("parent", "student", "teacher", "admin"))
        val storage = checkNotNull(prefs) { "Stockage de session indisponible." }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, secretKey()) }
        val session = JSONObject().put("token", value).put("role", userRole).toString().toByteArray(Charsets.UTF_8)
        val encoded = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" +
            Base64.encodeToString(cipher.doFinal(session), Base64.NO_WRAP)
        check(storage.edit().putString(KEY_SESSION, encoded).remove("jwt").remove("role").commit()) {
            "Impossible de conserver la session de manière sécurisée."
        }
        token = value
        role = userRole
    }

    @Synchronized fun clear() {
        token = null
        role = null
        prefs?.edit()?.remove(KEY_SESSION)?.remove("jwt")?.remove("role")?.apply()
    }
}
