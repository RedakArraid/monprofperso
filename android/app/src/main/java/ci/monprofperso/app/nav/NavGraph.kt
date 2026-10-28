package ci.monprofperso.app.nav

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import ci.monprofperso.app.ui.screens.*

/** Toutes les destinations de l'app (37 écrans de la maquette). */
object Routes {
    // A, Démarrage & compte
    const val Welcome = "welcome"
    const val Signup = "signup"
    const val Login = "login"
    const val Otp = "otp"
    // B, Trouver un prof
    const val Home = "home"
    const val SearchResults = "search_results"
    const val Filters = "filters"
    const val TeacherProfile = "teacher_profile"
    // C, Réserver & payer
    const val Booking = "booking"
    const val Payment = "payment"
    const val Confirmed = "confirmed"
    // D, Apprendre & échanger
    const val MyCourses = "my_courses"
    const val OnlineCourse = "online_course"
    const val Messaging = "messaging"
    const val Review = "review"
    // E, Suivi & compte
    const val Progress = "progress"
    const val Notifications = "notifications"
    const val Account = "account"
    const val Wallet = "wallet"
    // F, Espace professeur
    const val TeacherDashboard = "teacher_dashboard"
    const val CourseRequests = "course_requests"
    const val Earnings = "earnings"
    // G, Abonnement
    const val SubscriptionPlans = "subscription_plans"
    const val SubscriptionActivation = "subscription_activation"
    const val MySubscription = "my_subscription"
    // H, Cours en groupe
    const val GroupCourses = "group_courses"
    const val GroupDetail = "group_detail"
    const val Agenda = "agenda"
    // I, Côté professeur (gestion)
    const val BecomeTeacher = "become_teacher"
    const val CompleteTeacherProfile = "complete_teacher_profile"
    const val Withdraw = "withdraw"
    // J, Gérer un cours & suivi détaillé
    const val ManageCourse = "manage_course"
    const val ProgressReport = "progress_report"
    const val Receipt = "receipt"
    // K, Reçus, aide, réglages & parrainage
    const val HelpFaq = "help_faq"
    const val Settings = "settings"
    const val Referral = "referral"
    const val EmptyState = "empty_state"
    const val Resources = "resources"
    const val Legal = "legal"
    const val PdfViewer = "pdf_viewer"
    const val MyChildren = "my_children"
    const val ExpressNeed = "express_need"
    const val MyNeeds = "my_needs"
    // L, Espace administrateur
    const val AdminCatalog = "admin_catalog"
    const val AdminResources = "admin_resources"
    const val AdminLegal = "admin_legal"
    const val AdminSocial = "admin_social"
    const val AdminOtp = "admin_otp"
}

/** Conservé lors d'une rotation, recréé avec le processus : la session reste revérifiée au lancement. */
class SessionStartupViewModel : ViewModel() {
    var completed = false
}

@Composable
fun MonProfPersoNavGraph() {
    val nav = rememberNavController()
    val actions = NavActions(nav)
    val startup: SessionStartupViewModel = viewModel()
    androidx.compose.runtime.LaunchedEffect(Unit) {
        if (!startup.completed) {
            val restored = ci.monprofperso.app.data.Auth.restoreSession()
            startup.completed = true
            if (restored) actions.enterApp()
        }
    }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        ci.monprofperso.app.data.AppState.capabilities = runCatching { ci.monprofperso.app.data.Api.service.capabilities() }.getOrDefault(emptyMap())
    }

    NavHost(navController = nav, startDestination = Routes.Welcome) {
        composable(Routes.Welcome) { WelcomeScreen(actions) }
        composable(Routes.Signup) { SignupScreen(actions) }
        composable(Routes.Login) { LoginScreen(actions) }
        composable(Routes.Otp) { OtpScreen(actions) }

        composable(Routes.Home) { HomeScreen(actions) }
        composable(Routes.SearchResults) { ProductionSearchScreen(actions) }
        composable(Routes.Filters) { ProductionSearchScreen(actions) }
        composable(Routes.TeacherProfile) { TeacherProfileScreen(actions) }

        composable(Routes.Booking) { BookingScreen(actions) }
        composable(Routes.Payment) { PaymentScreen(actions) }
        composable(Routes.Confirmed) { ConfirmedScreen(actions) }

        composable(Routes.MyCourses) { MyCoursesScreen(actions) }
        composable(Routes.OnlineCourse) { CourseOperationsScreen(actions) }
        composable(Routes.Messaging) { UnavailableFeatureScreen(actions, "Messagerie") }
        composable(Routes.Review) { CourseOperationsScreen(actions) }

        composable(Routes.Progress) { ProductionProgressScreen(actions) }
        composable(Routes.Notifications) { NotificationsScreen(actions) }
        composable(Routes.Account) { ProductionAccountScreen(actions) }
        composable(Routes.Wallet) { MyCoursesScreen(actions) }

        composable(Routes.TeacherDashboard) { ProductionTeacherDashboardScreen(actions) }
        composable(Routes.CourseRequests) { ProductionRequestsScreen(actions) }
        composable(Routes.Earnings) { ProductionEarningsScreen(actions) }

        composable(Routes.SubscriptionPlans) { UnavailableFeatureScreen(actions, "Abonnements") }
        composable(Routes.SubscriptionActivation) { UnavailableFeatureScreen(actions, "Abonnements") }
        composable(Routes.MySubscription) { UnavailableFeatureScreen(actions, "Abonnements") }

        composable(Routes.GroupCourses) { UnavailableFeatureScreen(actions, "Cours en groupe") }
        composable(Routes.GroupDetail) { UnavailableFeatureScreen(actions, "Cours en groupe") }
        composable(Routes.Agenda) { MyCoursesScreen(actions) }

        composable(Routes.BecomeTeacher) { BecomeTeacherScreen(actions) }
        composable(Routes.MyChildren) { MyChildrenScreen(actions) }
        composable(Routes.ExpressNeed) { ExpressNeedScreen(actions) }
        composable(Routes.MyNeeds) { MyNeedsScreen(actions) }
        composable(Routes.CompleteTeacherProfile) { CompleteTeacherProfileScreen(actions) }
        composable(Routes.Withdraw) { ProductionEarningsScreen(actions) }

        composable(Routes.ManageCourse) { CourseOperationsScreen(actions) }
        composable(Routes.ProgressReport) { CourseOperationsScreen(actions) }
        composable(Routes.Receipt) { CourseOperationsScreen(actions) }

        composable(Routes.HelpFaq) { ProductionSupportScreen(actions) }
        composable(Routes.Settings) { PrivacySettingsScreen(actions) }
        composable(Routes.Referral) { UnavailableFeatureScreen(actions, "Parrainage") }
        composable(Routes.EmptyState) { EmptyStateScreen(actions) }

        composable(Routes.Resources) { ResourcesScreen(actions) }
        composable(Routes.Legal) { LegalScreen(actions) }
        composable(Routes.PdfViewer) { PdfViewerScreen(actions) }

        composable(Routes.AdminCatalog) { AdminCatalogScreen(actions) }
        composable(Routes.AdminResources) { AdminResourcesScreen(actions) }
        composable(Routes.AdminLegal) { AdminLegalScreen(actions) }
        composable(Routes.AdminSocial) { AdminSocialScreen(actions) }
        composable(Routes.AdminOtp) { AdminOtpScreen(actions) }
    }
}
