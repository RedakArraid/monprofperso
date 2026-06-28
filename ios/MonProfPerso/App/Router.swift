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
    case becomeTeacher, withdraw
    // J, Gérer un cours & suivi détaillé
    case manageCourse, progressReport, receipt
    // K, Reçus, aide, réglages & parrainage
    case helpFaq, settings, referral, emptyState, resources, legal
    // L, Espace administrateur
    case adminCatalog, adminResources, adminLegal, adminSocial
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

    // MARK: Brouillon de réservation (fiche prof → Réservation → Paiement → Confirmé)
    @Published var bkTeacherId = 1
    @Published var bkTeacherName = "Koffi N'Guessan"
    @Published var bkTeacherInitials = "KN"
    @Published var bkSubjectsLine = "Maths · Physique-Chimie"
    @Published var bkSubject = "Maths"
    @Published var bkLevel = "3ᵉ"
    @Published var bkPricePerHour = 4000
    @Published var bkLocation = "Cocody"
    @Published var bkNegotiable = false
    @Published var bkFormat = "home"
    @Published var bkDayLabel = "SAM"
    @Published var bkDayNum = "22"
    @Published var bkDayFull = "Sam. 22 juin"
    @Published var bkTime = "16:00"
    @Published var bkDuration = "1h30"
    @Published var bkPrice = 6000
    @Published var bkProposedPrice: Int? = nil
    @Published var bkProposedFrequency: String? = nil
    @Published var bkHasProposal = false
    @Published var bkReference = "AKW-2058"

    func startBooking(_ t: TeacherDTO) {
        bkTeacherId = t.id
        bkTeacherName = t.name
        bkTeacherInitials = t.initials
        bkSubjectsLine = t.subjects
        bkSubject = t.subjects.split(separator: "·").first.map { $0.trimmingCharacters(in: .whitespaces) } ?? "Cours"
        bkPricePerHour = t.price_per_hour
        bkLocation = t.location
        bkNegotiable = t.negotiable ?? false
        bkProposedPrice = nil
        bkProposedFrequency = nil
        bkHasProposal = false
    }

    func go(_ route: Route) { path.append(route) }
    func back() { if !path.isEmpty { path.removeLast() } }
    func popToRoot() { path = NavigationPath() }

    /// Entrée dans l'app après authentification : un professeur arrive sur
    /// l'espace prof, un parent/élève sur l'accueil.
    func enterApp() {
        popToRoot()
        go(role == 2 ? .teacherDashboard : .home)
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
