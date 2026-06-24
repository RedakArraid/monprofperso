package ci.monprofperso.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import ci.monprofperso.app.nav.MonProfPersoNavGraph
import ci.monprofperso.app.ui.theme.MonProfPersoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            MonProfPersoTheme {
                MonProfPersoNavGraph()
            }
        }
    }
}
