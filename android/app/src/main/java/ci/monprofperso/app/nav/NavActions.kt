package ci.monprofperso.app.nav

import androidx.navigation.NavHostController
import ci.monprofperso.app.data.AppState
import ci.monprofperso.app.data.TokenStore
import ci.monprofperso.app.ui.components.NavTab
import ci.monprofperso.app.ui.components.TeacherTab

/**
 * Encapsule les actions de navigation pour garder les écrans découplés du NavController.
 */
class NavActions(private val nav: NavHostController) {
    fun back() {
        if (!nav.popBackStack()) nav.navigate(Routes.Home)
    }

    fun go(route: String) {
        nav.navigate(route) { launchSingleTop = true }
    }

    fun openTeacher(id: Int) {
        AppState.selectedTeacherId = id
        go(Routes.TeacherProfile)
    }

    /** Ouvre un PDF dans le visualiseur in-app (mémorise la cible puis navigue). */
    fun openPdf(url: String, title: String) {
        AppState.pdfUrl = url
        AppState.pdfTitle = title
        go(Routes.PdfViewer)
    }

    /**
     * Entrée dans l'app après authentification : un professeur arrive sur
     * l'espace prof, un parent/élève sur l'accueil. Vide la pile d'auth.
     */
    fun enterApp() {
        if (TokenStore.token.isNullOrBlank()) {
            go(Routes.Login)
            return
        }
        val dest = when {
            AppState.authRole != "teacher" -> Routes.Home
            AppState.authTeacherId != null -> Routes.TeacherDashboard
            else -> Routes.BecomeTeacher
        }
        nav.navigate(dest) {
            popUpTo(Routes.Welcome) { inclusive = true }
            launchSingleTop = true
        }
    }

    /** Routage des onglets de la barre inférieure. */
    fun selectTab(tab: NavTab) {
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
    fun selectTeacherTab(tab: TeacherTab) {
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
