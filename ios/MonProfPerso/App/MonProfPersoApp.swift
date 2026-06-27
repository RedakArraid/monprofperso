import SwiftUI

@main
struct MonProfPersoApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

/// NavigationStack racine + table de routage des 37 écrans.
struct RootView: View {
    @StateObject private var router = Router()

    var body: some View {
        NavigationStack(path: $router.path) {
            WelcomeScreen()                       // écran 1 = racine
                .navigationDestination(for: Route.self) { route in
                    destination(route)
                        .navigationBarBackButtonHidden(true)
                        .toolbar(.hidden, for: .navigationBar)
                }
                .navigationBarBackButtonHidden(true)
                .toolbar(.hidden, for: .navigationBar)
        }
        .environmentObject(router)
        .tint(Ak.green)
    }

    @ViewBuilder
    func destination(_ route: Route) -> some View {
        switch route {
        case .signup:                 SignupScreen()
        case .login:                  LoginScreen()
        case .otp:                    OtpScreen()
        case .home:                   HomeScreen()
        case .searchResults:          SearchResultsScreen()
        case .filters:                FiltersScreen()
        case .teacherProfile:         TeacherProfileScreen()
        case .booking:                BookingScreen()
        case .payment:                PaymentScreen()
        case .confirmed:              ConfirmedScreen()
        case .myCourses:              MyCoursesScreen()
        case .onlineCourse:           OnlineCourseScreen()
        case .messaging:              MessagingScreen()
        case .review:                 ReviewScreen()
        case .progress:               ProgressScreen()
        case .notifications:          NotificationsScreen()
        case .account:                AccountScreen()
        case .wallet:                 WalletScreen()
        case .teacherDashboard:       TeacherDashboardScreen()
        case .courseRequests:         CourseRequestsScreen()
        case .earnings:               EarningsScreen()
        case .subscriptionPlans:      SubscriptionPlansScreen()
        case .subscriptionActivation: SubscriptionActivationScreen()
        case .mySubscription:         MySubscriptionScreen()
        case .groupCourses:           GroupCoursesScreen()
        case .groupDetail:            GroupDetailScreen()
        case .agenda:                 AgendaScreen()
        case .becomeTeacher:          BecomeTeacherScreen()
        case .withdraw:               WithdrawScreen()
        case .manageCourse:           ManageCourseScreen()
        case .progressReport:         ProgressReportScreen()
        case .receipt:                ReceiptScreen()
        case .helpFaq:                HelpFaqScreen()
        case .settings:               SettingsScreen()
        case .referral:               ReferralScreen()
        case .emptyState:             EmptyStateScreen()
        case .resources:              ResourcesScreen()
        case .legal:                  LegalScreen()
        case .adminCatalog:           AdminCatalogScreen()
        case .adminResources:         AdminResourcesScreen()
        case .adminLegal:             AdminLegalScreen()
        case let .pdfViewer(url, title): PdfViewerScreen(urlString: url, title: title)
        }
    }
}
