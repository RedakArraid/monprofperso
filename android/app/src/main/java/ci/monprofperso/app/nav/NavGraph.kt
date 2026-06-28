package ci.monprofperso.app.nav

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
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
    // L, Espace administrateur
    const val AdminCatalog = "admin_catalog"
    const val AdminResources = "admin_resources"
    const val AdminLegal = "admin_legal"
    const val AdminSocial = "admin_social"
}

@Composable
fun MonProfPersoNavGraph() {
    val nav = rememberNavController()
    val actions = NavActions(nav)

    NavHost(navController = nav, startDestination = Routes.Welcome) {
        composable(Routes.Welcome) { WelcomeScreen(actions) }
        composable(Routes.Signup) { SignupScreen(actions) }
        composable(Routes.Login) { LoginScreen(actions) }
        composable(Routes.Otp) { OtpScreen(actions) }

        composable(Routes.Home) { HomeScreen(actions) }
        composable(Routes.SearchResults) { SearchResultsScreen(actions) }
        composable(Routes.Filters) { FiltersScreen(actions) }
        composable(Routes.TeacherProfile) { TeacherProfileScreen(actions) }

        composable(Routes.Booking) { BookingScreen(actions) }
        composable(Routes.Payment) { PaymentScreen(actions) }
        composable(Routes.Confirmed) { ConfirmedScreen(actions) }

        composable(Routes.MyCourses) { MyCoursesScreen(actions) }
        composable(Routes.OnlineCourse) { OnlineCourseScreen(actions) }
        composable(Routes.Messaging) { MessagingScreen(actions) }
        composable(Routes.Review) { ReviewScreen(actions) }

        composable(Routes.Progress) { ProgressScreen(actions) }
        composable(Routes.Notifications) { NotificationsScreen(actions) }
        composable(Routes.Account) { AccountScreen(actions) }
        composable(Routes.Wallet) { WalletScreen(actions) }

        composable(Routes.TeacherDashboard) { TeacherDashboardScreen(actions) }
        composable(Routes.CourseRequests) { CourseRequestsScreen(actions) }
        composable(Routes.Earnings) { EarningsScreen(actions) }

        composable(Routes.SubscriptionPlans) { SubscriptionPlansScreen(actions) }
        composable(Routes.SubscriptionActivation) { SubscriptionActivationScreen(actions) }
        composable(Routes.MySubscription) { MySubscriptionScreen(actions) }

        composable(Routes.GroupCourses) { GroupCoursesScreen(actions) }
        composable(Routes.GroupDetail) { GroupDetailScreen(actions) }
        composable(Routes.Agenda) { AgendaScreen(actions) }

        composable(Routes.BecomeTeacher) { BecomeTeacherScreen(actions) }
        composable(Routes.Withdraw) { WithdrawScreen(actions) }

        composable(Routes.ManageCourse) { ManageCourseScreen(actions) }
        composable(Routes.ProgressReport) { ProgressReportScreen(actions) }
        composable(Routes.Receipt) { ReceiptScreen(actions) }

        composable(Routes.HelpFaq) { HelpFaqScreen(actions) }
        composable(Routes.Settings) { SettingsScreen(actions) }
        composable(Routes.Referral) { ReferralScreen(actions) }
        composable(Routes.EmptyState) { EmptyStateScreen(actions) }

        composable(Routes.Resources) { ResourcesScreen(actions) }
        composable(Routes.Legal) { LegalScreen(actions) }
        composable(Routes.PdfViewer) { PdfViewerScreen(actions) }

        composable(Routes.AdminCatalog) { AdminCatalogScreen(actions) }
        composable(Routes.AdminResources) { AdminResourcesScreen(actions) }
        composable(Routes.AdminLegal) { AdminLegalScreen(actions) }
        composable(Routes.AdminSocial) { AdminSocialScreen(actions) }
    }
}
