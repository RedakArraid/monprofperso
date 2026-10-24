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
    @StateObject private var router: Router

    init() {
        // Restaure le rôle réel persisté (l'espace admin réapparaît au lancement).
        _router = StateObject(wrappedValue: {
            let r = Router()
            if let user = TokenStore.user {
                r.authRole = user.role
                r.role = user.role == "teacher" && user.teacher_id != nil ? 2 : user.role == "student" ? 1 : 0
                r.authPhone = user.phone.map(ApiClient.localPhone) ?? ""
                r.authFullName = user.full_name ?? ""
            }
            return r
        }())
    }

    var body: some View {
        NavigationStack(path: $router.path) {
            Group {
                if router.authRole == nil { WelcomeScreen() }
                else if router.isTeacher { ProductionTeacherDashboardScreen() }
                else { HomeScreen() }
            }
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
        .task {
            router.capabilities = (try? await ApiClient.shared.capabilities()) ?? [:]
            guard TokenStore.token != nil else { return }
            do {
                let user = try await ApiClient.shared.me()
                if let token = TokenStore.token { try TokenStore.save(token: token, user: user) }
                router.authRole = user.role
                router.authFullName = user.full_name ?? ""
                router.authPhone = user.phone ?? ""
            } catch let ApiError.badStatus(code, _) where code == 401 || code == 403 {
                router.logout()
            } catch { /* La session n’est pas supprimée lors d’une panne réseau. */ }
        }
    }

    @ViewBuilder
    func destination(_ route: Route) -> some View {
        switch route {
        case .signup:                 SignupScreen()
        case .login:                  LoginScreen()
        case .otp:                    OtpScreen()
        case .home:                   HomeScreen()
        case .searchResults:          ProductionSearchScreen()
        case .filters:                ProductionSearchScreen()
        case .teacherProfile:         TeacherProfileScreen()
        case .booking:                BookingScreen()
        case .payment:                PaymentScreen()
        case .confirmed:              ConfirmedScreen()
        case .myCourses:              MyCoursesScreen()
        case .onlineCourse:           CourseOperationsScreen()
        case .messaging:              UnavailableFeatureScreen(title: "Messagerie")
        case .review:                 CourseOperationsScreen()
        case .progress:               ProductionProgressScreen()
        case .notifications:          NotificationsScreen()
        case .account:                ProductionAccountScreen()
        case .wallet:                 MyCoursesScreen()
        case .teacherDashboard:       ProductionTeacherDashboardScreen()
        case .courseRequests:         ProductionRequestsScreen()
        case .earnings:               ProductionEarningsScreen()
        case .subscriptionPlans:      UnavailableFeatureScreen(title: "Abonnements")
        case .subscriptionActivation: UnavailableFeatureScreen(title: "Abonnements")
        case .mySubscription:         UnavailableFeatureScreen(title: "Abonnements")
        case .groupCourses:           UnavailableFeatureScreen(title: "Cours en groupe")
        case .groupDetail:            UnavailableFeatureScreen(title: "Cours en groupe")
        case .agenda:                 MyCoursesScreen()
        case .becomeTeacher:          BecomeTeacherScreen()
        case .completeTeacherProfile: CompleteTeacherProfileScreen()
        case .myChildren:             MyChildrenScreen()
        case .expressNeed:            ExpressNeedScreen()
        case .myNeeds:                MyNeedsScreen()
        case .withdraw:               ProductionEarningsScreen()
        case .manageCourse:           CourseOperationsScreen()
        case .progressReport:         CourseOperationsScreen()
        case .receipt:                CourseOperationsScreen()
        case .helpFaq:                ProductionSupportScreen()
        case .settings:               PrivacySettingsScreen()
        case .referral:               UnavailableFeatureScreen(title: "Parrainage")
        case .emptyState:             EmptyStateScreen()
        case .resources:              ResourcesScreen()
        case .legal:                  LegalScreen()
        case .adminCatalog:           AdminCatalogScreen()
        case .adminResources:         AdminResourcesScreen()
        case .adminLegal:             AdminLegalScreen()
        case .adminSocial:            AdminSocialScreen()
        case .adminOtp:               AdminOtpScreen()
        case let .pdfViewer(url, title): PdfViewerScreen(urlString: url, title: title)
        }
    }
}
