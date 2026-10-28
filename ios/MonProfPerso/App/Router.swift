import SwiftUI

/// Les 37 destinations de l'app (parcours complet de la maquette).
enum Route: Hashable {
    // A, Démarrage & compte
    case signup, login, otp
    // B, Trouver un prof
    case home, searchResults, filters, teacherProfile
    // C, Réserver & payer
    case booking, payment, confirmed
    // D, Apprendre & échanger
    case myCourses, onlineCourse, messaging, review
    // E, Suivi & compte
    case progress, notifications, account, wallet
    // F, Espace professeur
    case teacherDashboard, courseRequests, earnings
    // G, Abonnement
    case subscriptionPlans, subscriptionActivation, mySubscription
    // H, Cours en groupe
    case groupCourses, groupDetail, agenda
    // I, Côté professeur (gestion)
    case becomeTeacher, completeTeacherProfile, withdraw
    case myChildren, expressNeed, myNeeds
    // J, Gérer un cours & suivi détaillé
    case manageCourse, progressReport, receipt
    // K, Reçus, aide, réglages & parrainage
    case helpFaq, settings, referral, emptyState, resources, legal
    // L, Espace administrateur
    case adminCatalog, adminResources, adminLegal, adminSocial, adminOtp
    // M, Visualiseur PDF in-app (URL + titre)
    case pdfViewer(url: String, title: String)
}

/// Onglets de la barre inférieure (parent & professeur).
enum ParentTab: CaseIterable { case accueil, recherche, cours, progres, profil }
enum TeacherTab: CaseIterable { case tableau, demandes, agenda, revenus, profil }

/// 0 = Parent · 1 = Élève · 2 = Professeur
let roleLabels = ["Parent", "Élève", "Professeur"]

/// Pilote la pile de navigation. Injecté dans l'environnement.
final class Router: ObservableObject {
    @Published var path = NavigationPath()
    /// Rôle choisi à l'accueil, réutilisé à l'inscription (plus de double saisie).
    @Published var role = 0
    /// Rôle réel renvoyé par le serveur à la connexion (`parent|student|teacher|admin`).
    @Published var authRole: String? = nil

    var isAdmin: Bool { authRole == "admin" }
    var isTeacher: Bool { authRole == "teacher" && TokenStore.user?.teacher_id != nil }

    // MARK: Brouillon de réservation (fiche prof → Réservation → Paiement → Confirmé)
    @Published var selectedTeacherId: Int? = nil
    @Published var searchQuery = ""
    @Published var selectedCourseId: Int? = nil
    @Published var capabilities: [String: Bool] = [:]
    func featureEnabled(_ key: String) -> Bool { capabilities[key] == true }
    @Published var bkTeacherId = 0
    @Published var bkTeacherName = ""
    @Published var bkTeacherInitials = ""
    @Published var bkSubjectsLine = ""
    @Published var bkSubject = "Cours"
    @Published var bkLevel = "Non précisé"
    @Published var bkPricePerHour = 0
    @Published var bkLocation = ""
    @Published var bkNegotiable = false
    @Published var bkFormats: [String] = ["home", "online"]
    @Published var bkCourseId: Int? = nil
    @Published var bkAccepted = false
    @Published var bkPaid = false
    @Published var bkFormat = "home"
    @Published var bkDayLabel = ""
    @Published var bkDayNum = ""
    @Published var bkDayFull = ""
    @Published var bkTime = ""
    @Published var bkDuration = "1h30"
    @Published var bkPrice = 0
    @Published var bkProposedPrice: Int? = nil
    @Published var bkProposedFrequency: String? = nil
    @Published var bkHasProposal = false
    @Published var bkReference = ""

    // MARK: Session OTP (inscription / connexion)
    @Published var authPhone = ""
    @Published var authEmail = ""
    @Published var authFullName = ""
    @Published var authOtpChannel = "whatsapp"
    @Published var otpDemo = false
    @Published var otpCodeLength = 6
    @Published var otpTtlMinutes = 10
    @Published var otpWhatsappEnabled = false
    @Published var otpEmailEnabled = false
    @Published var authChallengeId: String? = nil
    @Published var authDestination = ""
    @Published var otpResendAt = Date()

    func startBooking(_ t: TeacherDTO) {
        bkTeacherId = t.id
        bkTeacherName = t.name
        bkTeacherInitials = t.initials
        bkSubjectsLine = t.subjects
        bkSubject = t.subjects.split(separator: "·").first.map { $0.trimmingCharacters(in: .whitespaces) } ?? "Cours"
        bkPricePerHour = t.price_per_hour
        bkLocation = ""
        bkNegotiable = t.negotiable ?? false
        bkFormats = (t.formats ?? ["home"]).filter { $0 == "home" || ($0 == "online" && featureEnabled("onlineCourses")) }
        bkCourseId = nil
        bkAccepted = false
        bkPaid = false
        bkReference = ""
        bkProposedPrice = nil
        bkProposedFrequency = nil
        bkHasProposal = false
    }

    func loadCourse(_ course: CourseDTO, reference: String? = nil) {
        bkCourseId = course.id
        bkAccepted = course.accepted == true
        bkPaid = course.payment_status == "paid"
        bkReference = reference ?? "AKW-\(2000 + course.id)"
        bkTeacherName = course.teacher_name
        bkTeacherInitials = course.teacher_name.split(separator: " ").compactMap { $0.first }.prefix(2).map(String.init).joined().uppercased()
        bkSubject = course.subject
        bkLevel = course.level
        bkFormat = course.format
        bkLocation = course.location ?? "À domicile"
        bkDayLabel = course.day_label
        bkDayNum = course.day_num
        bkDayFull = "\(course.day_label) \(course.day_num)"
        bkTime = course.time
        bkDuration = course.duration
        bkPrice = course.price
        bkHasProposal = false
        bkProposedPrice = nil
        bkProposedFrequency = nil
    }

    func applyChallenge(_ challenge: OtpChallenge) {
        authChallengeId = challenge.challengeId
        authOtpChannel = challenge.channel
        authDestination = challenge.destination
        otpTtlMinutes = challenge.expiresInMinutes
        otpResendAt = Date().addingTimeInterval(60)
    }

    func applyAuth(_ result: AuthResult) {
        switch result {
        case let .authenticated(user):
            authRole = user.role
            role = user.role == "teacher" && user.teacher_id != nil ? 2 : user.role == "student" ? 1 : 0
            authPhone = user.phone.map(ApiClient.localPhone) ?? authPhone
            authFullName = user.full_name ?? authFullName
            authChallengeId = nil
            enterApp()
        case let .challenge(challenge):
            applyChallenge(challenge)
            go(.otp)
        }
    }

    func go(_ route: Route) { path.append(route) }
    func back() { if !path.isEmpty { path.removeLast() } }
    func popToRoot() { path = NavigationPath() }

    func logout() {
        TokenStore.clear()
        authRole = nil
        authPhone = ""; authEmail = ""; authFullName = ""; authChallengeId = nil
        selectedCourseId = nil; selectedTeacherId = nil; searchQuery = ""; bkCourseId = nil
        bkTeacherName = ""; bkLocation = ""; bkPaid = false
        popToRoot()
    }

    /// Entrée dans l'app après authentification : un professeur arrive sur
    /// l'espace prof, un parent/élève sur l'accueil.
    func enterApp() {
        guard TokenStore.token != nil, authRole != nil else { return }
        popToRoot()
        if authRole == "teacher" && !isTeacher { go(.becomeTeacher) }
    }

    func selectTab(_ tab: ParentTab) {
        popToRoot()
        switch tab {
        case .accueil:   break               // racine = Accueil
        case .recherche: go(.searchResults)
        case .cours:     go(.myCourses)
        case .progres:   go(.progress)
        case .profil:    go(.account)
        }
    }

    func selectTeacherTab(_ tab: TeacherTab) {
        popToRoot()
        switch tab {
        case .tableau:  go(.teacherDashboard)
        case .demandes: go(.teacherDashboard); go(.courseRequests)
        case .agenda:   go(.teacherDashboard); go(.agenda)
        case .revenus:  go(.teacherDashboard); go(.earnings)
        case .profil:   go(.account)
        }
    }
}
