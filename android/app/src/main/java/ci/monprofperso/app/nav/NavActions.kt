package ci.monprofperso.app.nav

import android.os.Handler
import android.os.Looper
import androidx.navigation.NavHostController
import ci.monprofperso.app.data.AppState
import ci.monprofperso.app.data.TokenStore
import ci.monprofperso.app.ui.components.NavTab
import ci.monprofperso.app.ui.components.TeacherTab

/**
 * Encapsule les actions de navigation pour garder les écrans découplés du NavController.
 */
class NavActions(private val nav: NavHostController) {
    private fun onMainThread(action: () -> Unit) {
        // NavController modifie des LifecycleRegistry, y compris après un retour réseau.
        if (Looper.myLooper() == Looper.getMainLooper()) action()
        else Handler(Looper.getMainLooper()).post { action() }
    }

    fun back() = onMainThread {
        if (!nav.popBackStack()) {
            go(when {
                TokenStore.token.isNullOrBlank() -> Routes.Welcome
                AppState.authRole == "teacher" -> Routes.TeacherDashboard
                else -> Routes.Home
            })
        }
    }

    fun go(route: String) = onMainThread {
        nav.navigate(route) {
            launchSingleTop = true
            if (route in listOf(Routes.Welcome, Routes.Login) && TokenStore.token.isNullOrBlank()) {
                popUpTo(nav.graph.id) { inclusive = true }
            }
        }
    }

    fun openTeacher(id: Int) = onMainThread {
        AppState.selectedTeacherId = id
        go(Routes.TeacherProfile)
    }

    /** Ouvre un PDF dans le visualiseur in-app (mémorise la cible puis navigue). */
    fun openPdf(url: String, title: String) = onMainThread {
        AppState.pdfUrl = url
        AppState.pdfTitle = title
        go(Routes.PdfViewer)
    }

    /**
     * Entrée dans l'app après authentification : un professeur arrive sur
     * l'espace prof, un parent/élève sur l'accueil. Vide la pile d'auth.
     */
    fun enterApp() = onMainThread {
        if (TokenStore.token.isNullOrBlank()) {
            go(Routes.Login)
            return@onMainThread
        }
        val dest = when {
            AppState.authRole != "teacher" -> Routes.Home
            AppState.authTeacherId != null -> Routes.TeacherDashboard
            else -> Routes.BecomeTeacher
        }
        nav.navigate(dest) {
            popUpTo(nav.graph.id) { inclusive = true }
            launchSingleTop = true
        }
    }

    /** Routage des onglets de la barre inférieure. */
    fun selectTab(tab: NavTab) = onMainThread {
        val route = when (tab) {
            NavTab.Accueil -> Routes.Home
            NavTab.Recherche -> Routes.SearchResults
            NavTab.Cours -> Routes.MyCourses
            NavTab.Progres -> Routes.Progress
            NavTab.Profil -> Routes.Account
        }
        nav.navigate(route) {
            launchSingleTop = true
            restoreState = true
            popUpTo(Routes.Home)
        }
    }

    /** Routage des onglets de l'espace professeur. */
    fun selectTeacherTab(tab: TeacherTab) = onMainThread {
        val route = when (tab) {
            TeacherTab.Tableau -> Routes.TeacherDashboard
            TeacherTab.Demandes -> Routes.CourseRequests
            TeacherTab.Agenda -> Routes.Agenda
            TeacherTab.Revenus -> Routes.Earnings
            TeacherTab.Profil -> Routes.Account
        }
        nav.navigate(route) {
            launchSingleTop = true
            restoreState = true
            popUpTo(Routes.TeacherDashboard)
        }
    }
}
