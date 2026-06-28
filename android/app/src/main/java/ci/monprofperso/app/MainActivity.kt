package ci.monprofperso.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import ci.monprofperso.app.data.TokenStore
import ci.monprofperso.app.nav.MonProfPersoNavGraph
import ci.monprofperso.app.ui.theme.MonProfPersoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        TokenStore.init(applicationContext)
        ci.monprofperso.app.data.AppState.authRole = TokenStore.role
        setContent {
            MonProfPersoTheme {
                MonProfPersoNavGraph()
            }
        }
    }
}
