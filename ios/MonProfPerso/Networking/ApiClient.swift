import Foundation

/// URL de base de l'API MonProfPerso commune (mêmes endpoints que côté Android).
enum ApiConfig {
    // Production VPS (Traefik + Let's Encrypt).
    static let baseURL = URL(string: "https://api.monprofperso.com")!
    // Dev simulateur : URL(string: "http://localhost:8099")!
    /// Numéro de démonstration (= utilisateur seed « Aya Koné »).
    static let demoPhone = "+2250758421903"
    /// Numéro de l'administrateur de démonstration (seed).
    static let adminPhone = "+2250700000001"
}

/// Stockage du JWT d'authentification (persisté entre lancements via UserDefaults).
/// Injecté en `Authorization: Bearer` par `ApiClient` ; en son absence, le backend
/// retombe sur l'utilisateur de démonstration (rétrocompat).
enum TokenStore {
    private static let key = "mpp_jwt"
    private static let roleKey = "mpp_role"
    static var token: String? {
        get { UserDefaults.standard.string(forKey: key) }
        set {
            if let v = newValue { UserDefaults.standard.set(v, forKey: key) }
            else { UserDefaults.standard.removeObject(forKey: key) }
        }
    }
    /// Rôle réel persisté (`parent|student|teacher|admin`), restauré au lancement.
    static var role: String? {
        get { UserDefaults.standard.string(forKey: roleKey) }
        set {
            if let v = newValue { UserDefaults.standard.set(v, forKey: roleKey) }
            else { UserDefaults.standard.removeObject(forKey: roleKey) }
        }
    }
    static func clear() { token = nil; role = nil }
}

// MARK: - Modèles (Codable), mêmes champs que les DTO Android

struct SubjectDTO: Codable, Identifiable {
    var id: String { slug }
    let slug, name, icon, accent: String
}

struct LevelDTO: Codable, Identifiable {
    var id: String { slug }
    let slug, name: String
}

struct ProgramDTO: Codable, Identifiable {
    var id: String { slug }
    let slug, name: String
}

struct ResourceDTO: Codable, Identifiable {
    let id: Int
    let type: String
    let subject_slug: String?
    let level: String?
    let title: String
    let description: String?
    let file_name: String?
    let mime_type: String?
    let size_bytes: Int?
    let created_at: String?
}

struct ReviewDTO: Codable {
    let author_initials, author_name: String
    let rating: Int
    let time_ago, text: String
}

struct TeacherDTO: Codable, Identifiable {
    let id: Int
    let initials, name, subjects: String
    let rating: Double
    let reviews_count: Int
    let location: String
    let price_per_hour: Int
    let distance_km: Double?
    let accent: String
    let verified: Bool
    let special_bepc: Bool
    let formats: [String]?
    let experience, students, bac_success, bio: String?
    let levels: [String]?
    let programs: [String]?
    let negotiable: Bool?
    let reviews: [ReviewDTO]?

    var priceLabel: String { "\(price_per_hour.formattedFCFA) F" }
    var ratingLabel: String { String(format: "%.1f", rating).replacingOccurrences(of: ".", with: ",") }
    var isGreen: Bool { accent == "green" }
    var distanceLabel: String {
        if let d = distance_km { return String(format: "%.1f km", d).replacingOccurrences(of: ".", with: ",") }
        return location
    }
}

struct CourseDTO: Codable, Identifiable {
    let id: Int
    let teacher_name, subject, level, day_label, day_num, time, duration, format: String
    let location: String?
    let price: Int
    let status: String
    let badge: String?
    let negotiable: Bool?
    let proposed_price: Int?
    let proposed_frequency: String?
    let counter_price: Int?
    let counter_frequency: String?
    let negotiation_status: String?
}

struct UnreadDTO: Codable { let count: Int }

struct LegalDocDTO: Codable, Identifiable {
    let slug, title: String
    let version, file_name: String?
    let size_bytes: Int?
    let updated_at: String?
    let hasFile: Bool
    var id: String { slug }
}

struct NotificationDTO: Codable, Identifiable {
    let icon, accent, text, time_ago: String
    let unread: Bool
    let section: String
    var id: String { "\(text)-\(time_ago)" }
}

struct ProgressSubjectDTO: Codable { let subject, grade: String; let fraction: Double; let warn: Bool }
struct ProgressDTO: Codable { let student, average, trend, goal: String; let subjects: [ProgressSubjectDTO] }

// --- Espace professeur (live) ---
struct StatDTO: Codable, Identifiable { let value, label: String; var id: String { label } }
struct TeacherDashboardDTO: Codable {
    let name: String; let revenue: Int; let trend: String; let stats: [StatDTO]; let pendingRequests: Int
    let negotiable: Bool?
}
struct TeacherRequestDTO: Codable, Identifiable {
    let courseId: Int?
    let initials, accent, name, ago: String
    let price: Int
    let student, subject, slot, format: String?
    let negotiable: Bool?
    let proposedPrice: Int?
    let proposedFrequency: String?
    let counterPrice: Int?
    let counterFrequency: String?
    let negotiationStatus: String?
    var id: String { courseId.map(String.init) ?? "\(name)-\(slot ?? "")" }
}
struct EarningWeekDTO: Codable, Identifiable { let label: String; let f: Double; var id: String { label } }
struct PayoutDTO: Codable, Identifiable { let provider, date: String; let amount: Int; let color: String; var id: String { provider + date } }
struct TeacherEarningsDTO: Codable {
    let total: Int; let trend: String; let weeks: [EarningWeekDTO]; let stats: [StatDTO]; let payouts: [PayoutDTO]
}

extension Int {
    /// 184000 -> "184 000"
    var formattedFCFA: String {
        let f = NumberFormatter(); f.groupingSeparator = " "; f.numberStyle = .decimal
        return f.string(from: NSNumber(value: self)) ?? "\(self)"
    }
}

// MARK: - Client

enum ApiError: Error { case badStatus(Int) }

struct UserDTO: Codable { let id: Int; let role: String }
struct AuthResponse: Codable { let token: String; let user: UserDTO }
struct VerifyResponse: Codable { let token: String; let verified: Bool }

struct TeacherApplicationResultDTO: Codable {
    let id: Int
    let full_name: String?
    let phone: String
    let status: String
    let created_at: String?
}

struct TeacherApplicationStatusDTO: Codable {
    let status: String
    let rejectionReason: String?
    let createdAt: String?
}

struct ApiClient {
    static let shared = ApiClient()
    private let session = URLSession.shared

    /// Requête bas niveau : ajoute l'en-tête `Authorization: Bearer` si un token est connu.
    private func request(_ path: String, method: String = "GET", json: [String: Any]? = nil) async throws -> Data {
        let url = ApiConfig.baseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        if let token = TokenStore.token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let json = json {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: json)
        }
        let (data, resp) = try await session.data(for: req)
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw ApiError.badStatus(http.statusCode)
        }
        return data
    }

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try JSONDecoder().decode(T.self, from: try await request(path))
    }

    // MARK: Authentification, récupère le JWT et le persiste dans TokenStore.
    // Tolérant aux pannes : en cas d'échec, l'app continue en mode démo (repli serveur).
    private static let apiRoles = ["parent", "student", "teacher"]

    /// Renvoie le rôle réel du compte (`parent|student|teacher|admin`) si la connexion réussit.
    @discardableResult
    func login(phone: String = ApiConfig.demoPhone) async -> String? {
        if let data = try? await request("api/auth/login", method: "POST", json: ["phone": phone]),
           let r = try? JSONDecoder().decode(AuthResponse.self, from: data) {
            TokenStore.token = r.token; TokenStore.role = r.user.role; return r.user.role
        }
        return nil
    }

    @discardableResult
    func signup(fullName: String, phone: String = ApiConfig.demoPhone, roleIndex: Int,
                consent: Bool = true, parentalConsent: Bool = false) async -> String? {
        let role = Self.apiRoles[min(max(roleIndex, 0), 2)]
        if let data = try? await request("api/auth/signup", method: "POST",
                                         json: ["fullName": fullName, "phone": phone, "role": role,
                                                "consent": consent, "parentalConsent": parentalConsent]),
           let r = try? JSONDecoder().decode(AuthResponse.self, from: data) {
            TokenStore.token = r.token; TokenStore.role = r.user.role; return r.user.role
        }
        return nil
    }

    func verifyOtp(phone: String = ApiConfig.demoPhone) async {
        if let data = try? await request("api/auth/verify-otp", method: "POST", json: ["phone": phone]),
           let r = try? JSONDecoder().decode(VerifyResponse.self, from: data) { TokenStore.token = r.token }
    }

    // MARK: Candidatures professeur
    func submitTeacherApplication(_ body: [String: Any]) async throws -> TeacherApplicationResultDTO {
        let data = try await request("api/teacher-applications", method: "POST", json: body)
        return try JSONDecoder().decode(TeacherApplicationResultDTO.self, from: data)
    }

    func teacherApplicationStatus(phone: String) async throws -> TeacherApplicationStatusDTO {
        let enc = phone.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? phone
        return try await get("api/teacher-applications/status?phone=\(enc)")
    }

    func subjects() async throws -> [SubjectDTO] { try await get("api/subjects") }
    func levels() async throws -> [LevelDTO] { try await get("api/levels") }
    func programs() async throws -> [ProgramDTO] { try await get("api/programs") }
    func teachers() async throws -> [TeacherDTO] { try await get("api/teachers") }
    func teacher(_ id: Int) async throws -> TeacherDTO { try await get("api/teachers/\(id)") }
    func courses(status: String? = nil) async throws -> [CourseDTO] {
        try await get("api/courses" + (status.map { "?status=\($0)" } ?? ""))
    }
    /// Crée une réservation (peut porter une proposition de négociation) ; renvoie la référence.
    @discardableResult
    func createBooking(_ body: [String: Any]) async throws -> String {
        let data = try await request("api/bookings", method: "POST", json: body)
        struct R: Codable { let reference: String? }
        return (try? JSONDecoder().decode(R.self, from: data))?.reference ?? ""
    }
    func progress() async throws -> ProgressDTO { try await get("api/progress") }
    func notifications() async throws -> [NotificationDTO] { try await get("api/notifications") }
    func markNotificationsRead() async throws { _ = try await request("api/notifications/read", method: "POST") }
    func unreadCount() async throws -> Int { (try await get("api/notifications/unread") as UnreadDTO).count }

    // MARK: Espace professeur
    func teacherDashboard() async throws -> TeacherDashboardDTO { try await get("api/teacher/dashboard") }
    func teacherRequests() async throws -> [TeacherRequestDTO] { try await get("api/teacher/requests") }
    func teacherEarnings() async throws -> TeacherEarningsDTO { try await get("api/teacher/earnings") }
    func acceptRequest(courseId: Int) async throws { _ = try await request("api/teacher/requests/\(courseId)/accept", method: "POST") }
    func refuseRequest(courseId: Int) async throws { _ = try await request("api/teacher/requests/\(courseId)/refuse", method: "POST") }
    /// Contre-proposition du prof (tarif et/ou fréquence).
    func counterRequest(courseId: Int, price: Int?, frequency: String?) async throws {
        var json: [String: Any] = [:]
        if let price { json["price"] = price }
        if let frequency, !frequency.isEmpty { json["frequency"] = frequency }
        _ = try await request("api/teacher/requests/\(courseId)/counter", method: "POST", json: json)
    }
    /// Le prof active/désactive « à négocier » sur ses offres.
    @discardableResult
    func setNegotiable(_ negotiable: Bool) async throws -> Bool {
        let data = try await request("api/teacher/negotiable", method: "POST", json: ["negotiable": negotiable])
        struct R: Codable { let negotiable: Bool }
        return (try? JSONDecoder().decode(R.self, from: data))?.negotiable ?? negotiable
    }
    /// Le client accepte / refuse la contre-proposition du prof.
    func acceptNegotiation(courseId: Int) async throws { _ = try await request("api/courses/\(courseId)/negotiation/accept", method: "POST") }
    func refuseNegotiation(courseId: Int) async throws { _ = try await request("api/courses/\(courseId)/negotiation/refuse", method: "POST") }

    // MARK: Espace admin (rôle admin requis ; le token Bearer est ajouté à chaque requête).
    func createSubject(slug: String, name: String, accent: String, icon: String = "more") async throws -> SubjectDTO {
        let data = try await request("api/admin/subjects", method: "POST",
                                     json: ["slug": slug, "name": name, "accent": accent, "icon": icon])
        return try JSONDecoder().decode(SubjectDTO.self, from: data)
    }
    func deleteSubject(slug: String) async throws { _ = try await request("api/admin/subjects/\(slug)", method: "DELETE") }

    func createLevel(slug: String, name: String, ord: Int) async throws -> LevelDTO {
        let data = try await request("api/admin/levels", method: "POST",
                                     json: ["slug": slug, "name": name, "ord": ord])
        return try JSONDecoder().decode(LevelDTO.self, from: data)
    }
    func deleteLevel(slug: String) async throws { _ = try await request("api/admin/levels/\(slug)", method: "DELETE") }

    func createProgram(slug: String, name: String, ord: Int) async throws -> ProgramDTO {
        let data = try await request("api/admin/programs", method: "POST",
                                     json: ["slug": slug, "name": name, "ord": ord])
        return try JSONDecoder().decode(ProgramDTO.self, from: data)
    }
    func deleteProgram(slug: String) async throws { _ = try await request("api/admin/programs/\(slug)", method: "DELETE") }

    func resources(type: String? = nil, subject: String? = nil, level: String? = nil) async throws -> [ResourceDTO] {
        var q: [String] = []
        if let type { q.append("type=\(type)") }
        if let subject { q.append("subject=\(subject)") }
        if let level { q.append("level=\(level)") }
        return try await get("api/resources" + (q.isEmpty ? "" : "?" + q.joined(separator: "&")))
    }
    func createResource(type: String, title: String, subjectSlug: String?, level: String?, description: String?,
                        fileName: String? = nil, mimeType: String? = nil, contentBase64: String? = nil) async throws -> ResourceDTO {
        var json: [String: Any] = ["type": type, "title": title]
        if let subjectSlug { json["subjectSlug"] = subjectSlug }
        if let level { json["level"] = level }
        if let description, !description.isEmpty { json["description"] = description }
        if let contentBase64 {
            json["contentBase64"] = contentBase64
            json["fileName"] = fileName ?? "fichier"
            if let mimeType { json["mimeType"] = mimeType }
        }
        let data = try await request("api/admin/resources", method: "POST", json: json)
        return try JSONDecoder().decode(ResourceDTO.self, from: data)
    }
    func deleteResource(id: Int) async throws { _ = try await request("api/admin/resources/\(id)", method: "DELETE") }

    // MARK: Paramètres plateforme (réseaux sociaux + contact)
    func settings() async throws -> [String: String] { try await get("api/settings") }
    func updateSettings(_ values: [String: String]) async throws -> [String: String] {
        let data = try await request("api/admin/settings", method: "PUT", json: values)
        return try JSONDecoder().decode([String: String].self, from: data)
    }

    // MARK: Documents légaux
    func legalDocs() async throws -> [LegalDocDTO] { try await get("api/legal") }
    func uploadLegalDoc(slug: String, fileName: String, mimeType: String, contentBase64: String) async throws -> LegalDocDTO {
        let data = try await request("api/admin/legal/\(slug)", method: "PUT",
                                     json: ["fileName": fileName, "mimeType": mimeType, "contentBase64": contentBase64])
        return try JSONDecoder().decode(LegalDocDTO.self, from: data)
    }
}

// MARK: - Données de repli (identiques à la maquette) si l'API est injoignable

enum Fallback {
    static let teachers: [TeacherDTO] = [
        .init(id: 1, initials: "KN", name: "Koffi N'Guessan", subjects: "Maths · Physique-Chimie · 8 ans d'exp.", rating: 4.9, reviews_count: 128, location: "Cocody", price_per_hour: 4000, distance_km: 2.4, accent: "green", verified: true, special_bepc: true, formats: ["home","online"], experience: nil, students: nil, bac_success: nil, bio: nil, levels: nil, reviews: nil),
        .init(id: 2, initials: "ID", name: "Ibrahim Diallo", subjects: "Maths · Statistiques · 5 ans d'exp.", rating: 4.7, reviews_count: 210, location: "Yopougon", price_per_hour: 3000, distance_km: 5.1, accent: "orange", verified: true, special_bepc: false, formats: ["home","online"], experience: nil, students: nil, bac_success: nil, bio: nil, levels: nil, reviews: nil),
        .init(id: 3, initials: "AY", name: "Adjoua Yao", subjects: "Maths · SVT · 6 ans d'exp.", rating: 4.9, reviews_count: 88, location: "Cocody", price_per_hour: 4000, distance_km: 1.8, accent: "green", verified: true, special_bepc: false, formats: ["home"], experience: nil, students: nil, bac_success: nil, bio: nil, levels: nil, reviews: nil),
    ]
}

extension Fallback {
    static let subjects: [SubjectDTO] = [
        .init(slug: "maths", name: "Maths", icon: "function", accent: "green"),
        .init(slug: "physique", name: "Physique", icon: "atom", accent: "orange"),
        .init(slug: "francais", name: "Français", icon: "book", accent: "green"),
        .init(slug: "anglais", name: "Anglais", icon: "translate", accent: "orange"),
        .init(slug: "svt", name: "SVT", icon: "leaf", accent: "orange"),
        .init(slug: "philo", name: "Philo", icon: "brain", accent: "green"),
        .init(slug: "histgeo", name: "Hist-Géo", icon: "globe", accent: "green"),
        .init(slug: "plus", name: "Plus", icon: "more", accent: "orange"),
    ]
    static let teacherDashboard = TeacherDashboardDTO(
        name: "Koffi N'Guessan", revenue: 184000, trend: "+12%",
        stats: [.init(value: "14", label: "cours / semaine"), .init(value: "4,9", label: "note moyenne"), .init(value: "3", label: "nouveaux élèves")],
        pendingRequests: 3)
    static let teacherRequests: [TeacherRequestDTO] = [
        .init(courseId: nil, initials: "FB", accent: "green", name: "Fatou Bamba", ago: "il y a 1 h", price: 6000, student: "Awa · 2nde", subject: "Mathématiques", slot: "Sam. 28 juin · 15h00", format: "À domicile · Marcory"),
        .init(courseId: nil, initials: "YK", accent: "orange", name: "Yao Kouamé", ago: "il y a 3 h", price: 4000, student: "Junior · 3ᵉ", subject: "Physique-Chimie", slot: "Dim. 29 juin · 10h00", format: "En ligne"),
    ]
    static let teacherEarnings = TeacherEarningsDTO(
        total: 184000, trend: "+12%",
        weeks: [.init(label: "S1", f: 0.48), .init(label: "S2", f: 0.66), .init(label: "S3", f: 0.58), .init(label: "S4", f: 0.88)],
        stats: [.init(value: "38", label: "cours donnés"), .init(value: "52 h", label: "enseignées"), .init(value: "3 800", label: "F / h moyen")],
        payouts: [.init(provider: "Retrait Wave", date: "15 juin", amount: 60000, color: "wave"),
                  .init(provider: "Retrait Orange Money", date: "1 juin", amount: 80000, color: "orange")])
    static let resources: [ResourceDTO] = [
        .init(id: 1, type: "course", subject_slug: "maths", level: "3eme", title: "Fiche, Théorème de Thalès", description: "Rappels de cours et exemples corrigés.", file_name: nil, mime_type: nil, size_bytes: nil, created_at: nil),
        .init(id: 2, type: "exercise", subject_slug: "physique", level: "2nde", title: "Série d'exercices, Optique", description: "10 exercices progressifs avec corrigés.", file_name: nil, mime_type: nil, size_bytes: nil, created_at: nil),
        .init(id: 3, type: "homework", subject_slug: "francais", level: "1ere", title: "Devoir, Commentaire de texte", description: "Sujet type BAC à rendre.", file_name: nil, mime_type: nil, size_bytes: nil, created_at: nil),
    ]
    static let courses: [CourseDTO] = [
        .init(id: 1, teacher_name: "Koffi N'Guessan", subject: "Maths", level: "3ᵉ", day_label: "SAM", day_num: "22", time: "16h00", duration: "1h30", format: "home", location: "À domicile, Cocody", price: 6000, status: "upcoming", badge: "Dans 2 jours"),
        .init(id: 2, teacher_name: "Mariam Touré", subject: "Anglais", level: "3ᵉ", day_label: "LUN", day_num: "24", time: "17h00", duration: "1h", format: "online", location: nil, price: 4500, status: "upcoming", badge: nil),
        .init(id: 3, teacher_name: "Koffi N'Guessan", subject: "Maths", level: "3ᵉ", day_label: "VEN", day_num: "14", time: "15h00", duration: "1h30", format: "home", location: "À domicile, Cocody", price: 6000, status: "done", badge: nil),
    ]
    static let progress = ProgressDTO(
        student: "Kouadio, 3ᵉ", average: "13,2", trend: "+1,4",
        goal: "Objectif BEPC : 14/20, vous y êtes presque !",
        subjects: [
            .init(subject: "Mathématiques", grade: "14/20", fraction: 0.70, warn: false),
            .init(subject: "Physique-Chimie", grade: "12/20", fraction: 0.60, warn: false),
            .init(subject: "Français", grade: "15/20", fraction: 0.75, warn: false),
            .init(subject: "Anglais", grade: "11/20", fraction: 0.55, warn: true),
        ])
    static let teacherDetail = TeacherDTO(
        id: 1, initials: "KN", name: "Koffi N'Guessan", subjects: "Maths · Physique-Chimie", rating: 4.9, reviews_count: 128,
        location: "Cocody", price_per_hour: 4000, distance_km: 2.4, accent: "green", verified: true, special_bepc: true,
        formats: ["home", "online"], experience: "8 ans", students: "340+", bac_success: "94%",
        bio: "Professeur certifié, ancien du Lycée Classique d'Abidjan. J'accompagne les élèves de la 3ᵉ à la Terminale avec une méthode claire, des fiches et beaucoup d'exercices types examen. Patient et à l'écoute.",
        levels: ["Collège", "Lycée", "Prépa BEPC", "Prépa BAC"],
        reviews: [.init(author_initials: "FB", author_name: "Fatou B.", rating: 5, time_ago: "il y a 2 semaines", text: "Ma fille est passée de 9 à 14 en maths en un trimestre. Très pédagogue et toujours ponctuel. Je recommande vivement !")])
}

/// Store partagé : liste des professeurs.
@MainActor
final class TeachersStore: ObservableObject {
    @Published var teachers: [TeacherDTO] = []
    @Published var loading = true
    @Published var fromApi = false
    func load() async {
        loading = true
        do { teachers = try await ApiClient.shared.teachers(); fromApi = true }
        catch { teachers = Fallback.teachers; fromApi = false }
        loading = false
    }
}

/// Store : accueil (matières + profs recommandés).
@MainActor
final class HomeStore: ObservableObject {
    @Published var subjects: [SubjectDTO] = Fallback.subjects
    @Published var teachers: [TeacherDTO] = []
    func load() async {
        async let s = try? ApiClient.shared.subjects()
        async let t = try? ApiClient.shared.teachers()
        if let s = await s { subjects = s }
        if let t = await t { teachers = t }
    }
}

/// Store : mes cours.
@MainActor
final class CoursesStore: ObservableObject {
    @Published var courses: [CourseDTO] = Fallback.courses
    func load() async {
        if let c = try? await ApiClient.shared.courses() { courses = c }
    }
}

/// Store : suivi des progrès.
@MainActor
final class ProgressStore: ObservableObject {
    @Published var data: ProgressDTO = Fallback.progress
    func load() async {
        if let p = try? await ApiClient.shared.progress() { data = p }
    }
}

/// Store : profil d'un professeur.
@MainActor
final class TeacherStore: ObservableObject {
    @Published var teacher: TeacherDTO = Fallback.teacherDetail
    func load(_ id: Int = 1) async {
        if let t = try? await ApiClient.shared.teacher(id) { teacher = t }
    }
}
