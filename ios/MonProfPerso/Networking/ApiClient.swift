import Foundation
import Security
import Combine

/// URL de base de l'API MonProfPerso commune (mêmes endpoints que côté Android).
enum ApiConfig {
    /// Renseignée par API_BASE_URL dans project.yml, ou par la configuration Xcode.
    static let baseURL: URL = {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String,
              let url = URL(string: value), let host = url.host,
              url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
              url.scheme == "https" || (url.scheme == "http" && ["localhost", "127.0.0.1"].contains(host)) else {
            fatalError("Configurer API_BASE_URL avec une URL HTTPS (HTTP autorisé uniquement en local).")
        }
        return url
    }()
    /// Numéro de démonstration (= utilisateur seed « Aya Koné »).
    static let demoPhone = "+2250758421903"
    /// Numéro de l'administrateur de démonstration (seed).
    static let adminPhone = "+2250700000001"
}

/// Session conservée dans le trousseau, disponible uniquement sur cet appareil déverrouillé.
enum TokenStore {
    private struct Session: Codable { let token: String; let user: UserDTO }
    private static var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "\(Bundle.main.bundleIdentifier ?? "ci.monprofperso.app").session.\(ApiConfig.baseURL.host ?? "")",
         kSecAttrAccount as String: "current-user"]
    }
    private static var saved: Session? {
        // Les sessions de l'ancien prototype ne sont pas réutilisées.
        UserDefaults.standard.removeObject(forKey: "mpp_jwt")
        UserDefaults.standard.removeObject(forKey: "mpp_role")
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return try? JSONDecoder().decode(Session.self, from: data)
    }
    static var token: String? { saved?.token }
    static var role: String? { saved?.user.role }
    static var user: UserDTO? { saved?.user }
    static func save(token: String, user: UserDTO) throws {
        let data = try JSONEncoder().encode(Session(token: token, user: user))
        let attributes: [String: Any] = [kSecValueData as String: data,
                                       kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let updated = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updated == errSecItemNotFound {
            var item = query
            attributes.forEach { item[$0.key] = $0.value }
            guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw ApiError.sessionStorage }
        } else if updated != errSecSuccess { throw ApiError.sessionStorage }
    }
    static func clear() {
        SecItemDelete(query as CFDictionary)
        UserDefaults.standard.removeObject(forKey: "mpp_jwt")
        UserDefaults.standard.removeObject(forKey: "mpp_role")
    }
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
    let program: String?
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
    var ratingLabel: String { reviews_count > 0 ? String(format: "%.1f", rating).replacingOccurrences(of: ".", with: ",") : "Pas encore noté" }
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
    let payment_status: String?
    let accepted: Bool?
    let starts_at: String?
    let duration_minutes: Int?
    var lifecycle_status: String? = nil
    var private_address: String? = nil
    var meeting_url: String? = nil
    var access_notes: String? = nil
    var parent_name: String? = nil
    var participant_role: String? = nil

    func isTeacherParticipant(accountRole: String?) -> Bool {
        participant_role == "teacher" || (participant_role == nil && accountRole == "teacher")
    }

    var canPay: Bool {
        guard participant_role == nil || participant_role == "parent",
              accepted == true, status == "upcoming", lifecycle_status == "scheduled", ["pending", "unpaid"].contains(payment_status ?? ""), let starts_at,
              let date = CourseOperations.parseISODate(starts_at) else { return false }
        return price > 0 && date > Date()
    }
}

struct GroupDTO: Codable, Identifiable {
    let id: Int
    let tag: String
    let tag_accent: String
    let price: Int
    let title, detail: String
    let teacher_initials: String?
    let teacher_name: String?
    let teacher_accent: String?
    let enrolled: Int?
    let capacity: Int?
    let places_left: Int?
    let kind: String
    let start_date: String?
    let end_date: String?

    var isTagGreen: Bool { tag_accent != "orange" }
    var isTeacherGreen: Bool { teacher_accent != "orange" }
    var isStage: Bool { kind == "stage" }
    var priceLabel: String { "\(price.formattedFCFA) F" }
    var dateRangeLabel: String? {
        guard isStage, let s = start_date, let e = end_date else { return nil }
        return "\(s) → \(e)"
    }
}

struct BookingResult: Codable {
    let reference: String
    let course: CourseDTO
}

struct ChargeMobileResponse: Codable {
    let paymentId: Int
    let status: String
    let message: String?
    let reference: String?
}

struct PaymentStatusResponse: Codable {
    let paymentId: Int
    let status: String
    let amount: Int?
    let provider: String?
    let coursePaymentStatus: String?
    let paid: Bool
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
struct ProgressDTO: Codable {
    let student, average, trend, goal: String
    let subjects: [ProgressSubjectDTO]
    var entries: [ProgressEntryDTO]? = nil
}
struct ProgressEntryDTO: Codable, Identifiable {
    var id: Int { courseId }
    let courseId: Int
    let subject, teacherName, summary: String
    let studentName, completedAt: String?
}

// --- Espace professeur (live) ---
struct StatDTO: Codable, Identifiable { let value, label: String; var id: String { label } }
struct TeacherDashboardDTO: Codable {
    let name: String; let revenue: Int; let trend: String; let stats: [StatDTO]; let pendingRequests: Int
    let negotiable: Bool?
    let needsConfirmed: Bool?
    let profileCompletion: ProfileCompletionDTO?
}
struct ProfileCompletionDTO: Codable {
    let percent: Int; let complete: Bool; let missing: [String]
}
struct TeacherProfileDTO: Codable {
    let name: String; let subjects: String; let email: String?
    let location: String; let pricePerHour: Int?; let experience: String?; let bio: String?
    let levels: [String]; let formats: [String]; let programs: [String]
    let negotiable: Bool; let hasIdCard: Bool; let hasDiploma: Bool; let hasPhoto: Bool
    let completion: ProfileCompletionDTO
}
struct TeacherRequestDTO: Codable, Identifiable {
    let courseId: Int?
    let needId: Int?
    let initials, accent, name, ago: String
    let price: Int
    let student, subject, slot, format: String?
    let netHourly: Int?
    let frequency, duration, startDate: String?
    let isOpportunity: Bool?
    let availabilityWeek, availabilityWeekend, availabilityHolidays: Bool?
    let hasCat, hasDog: Bool?
    let lat, lng: Double?
    var id: String {
        if let needId { return "need:\(needId)" }
        if let courseId { return "course:\(courseId)" }
        return "\(name)-\(slot ?? "")"
    }
    var offerKey: String { id }
}
struct ChildDTO: Codable, Identifiable {
    let id: Int; let name, level: String
    let gender, school, program: String?
}
struct NeedDTO: Codable, Identifiable {
    let id: Int; let reference, subject, level, format, status: String
    let childId: Int?; let location, frequency, duration, description: String?
    let parentPrice, netTeacherAmount, netTeacherHourly: Int?
    let startDate: String?
    let durationMinutes: Int?
    var courseId: Int? = nil
}
struct EarningWeekDTO: Codable, Identifiable { let label: String; let f: Double; var id: String { label } }
struct PayoutDTO: Codable, Identifiable { let provider, date: String; let amount: Int; let color: String; var id: String { provider + date } }
struct TeacherEarningsDTO: Codable {
    let total: Int; let trend: String; let weeks: [EarningWeekDTO]; let stats: [StatDTO]; let payouts: [PayoutDTO]
    var summary: EarningsSummaryDTO? = nil
    var payoutRequests: [FinanceRequestDTO]? = nil
}

struct EarningsSummaryDTO: Codable { let expected, due, releasable, reserved, paid: Int }
struct FinanceRequestDTO: Codable, Identifiable {
    let id, amount: Int
    let status: String
    let provider, providerReference, createdAt, reason, beneficiaryPhone: String?
}
struct CourseContactsDTO: Codable { let parentPhone, teacherPhone: String? }
struct ScheduleRequestDTO: Codable, Identifiable {
    let id, proposedBy: Int
    let startAt, status: String
    let reason, createdAt: String?
}
struct CourseReportDTO: Codable, Identifiable {
    let id: Int
    let actorRole, outcome: String
    let note, progressSummary, createdAt: String?
}
struct CourseEventDTO: Codable, Identifiable { let id: Int; let type: String; let actorRole, createdAt: String? }
struct CourseFinanceDTO: Codable {
    let grossAmount, capturedAmount, refundAmount, refundPendingAmount: Int
    let commissionAmount, teacherNetAmount: Int?
    let commissionPct: Double?
    let teacherDue: Int?
    let teacherReleasable, teacherReserved, teacherPaid: Int
    let reviewRequired: Bool
}
struct CourseDetailsDTO: Codable {
    let course: CourseDTO
    let contacts: CourseContactsDTO
    let scheduleRequests: [ScheduleRequestDTO]
    let reports: [CourseReportDTO]
    let events: [CourseEventDTO]
    let finance: CourseFinanceDTO
    let permissions: [String]
}
struct AccountDeletionRequestDTO: Codable { let id: Int; let status, requestedAt: String; let completedAt, cancelledAt: String? }
struct AccountBlockerDTO: Codable { let code, message: String; let count: Int? }
struct AccountDeletionDTO: Codable { let request: AccountDeletionRequestDTO?; let blockers: [AccountBlockerDTO] }
struct NotificationPreferencesDTO: Codable {
    var notificationsWhatsapp, notificationsEmail: Bool
    let whatsappAvailable, emailAvailable: Bool
}
struct ConsentDocumentDTO: Codable, Identifiable { let slug, title, version: String; var id: String { slug } }
struct AccountConsentDTO: Codable { let version: String; let accepted: Bool; let documents: [ConsentDocumentDTO] }

enum CourseOperations {
    static func parseISODate(_ value: String) -> Date? {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = parser.date(from: value) { return date }
        parser.formatOptions = [.withInternetDateTime]
        return parser.date(from: value)
    }
    static func safeMeetingURL(_ value: String?) -> URL? {
        guard let value, let url = URL(string: value), url.scheme == "https", let host = url.host,
              !host.isEmpty, url.user == nil, url.password == nil else { return nil }
        return url
    }
    static func statusLabel(_ value: String?) -> String {
        switch value {
        case "requested": return "En attente du professeur"
        case "awaiting_schedule": return "Créneau à convenir"
        case "scheduled": return "Cours planifié"
        case "completion_pending": return "Réalisation à confirmer"
        case "completed": return "Cours réalisé"
        case "disputed": return "Signalement en cours de traitement"
        case "cancelled": return "Cours annulé"
        case "refused": return "Demande refusée"
        default: return "Consultez le détail du cours"
        }
    }
}

extension Int {
    /// 184000 -> "184 000"
    var formattedFCFA: String {
        let f = NumberFormatter(); f.groupingSeparator = " "; f.numberStyle = .decimal
        return f.string(from: NSNumber(value: self)) ?? "\(self)"
    }
}

// MARK: - Client

enum ApiError: LocalizedError {
    case badStatus(Int, String?)
    case legalConsent(String, String?)
    case invalidResponse
    case sessionStorage
    var errorDescription: String? {
        switch self {
        case let .legalConsent(code, _):
            return code == "consent_version_changed"
                ? "Les conditions ont changé. Relisez les documents et cochez à nouveau votre accord."
                : "Acceptez les conditions à jour dans « Mes données et mon compte » avant de poursuivre."
        case let .badStatus(code, message):
            if let message, !message.isEmpty { return message }
            if code == 401 { return "Connectez-vous à nouveau pour continuer." }
            if code == 403 { return "Votre compte n'a pas accès à cette action." }
            if code == 429 { return "Patientez avant de réessayer." }
            return "La demande a échoué (\(code)). Réessayez."
        case .invalidResponse: return "Réponse du serveur incomplète. Réessayez."
        case .sessionStorage: return "La session n'a pas pu être enregistrée dans le trousseau."
        }
    }
    var consentCode: String? { if case let .legalConsent(code, _) = self { return code }; return nil }
}

struct UserDTO: Codable {
    let id: Int
    let role: String
    let phone: String?
    let full_name: String?
    let teacher_id: Int?
}
struct AuthResponse: Codable {
    let token: String?
    let user: UserDTO?
    let verified: Bool?
    let otpRequired: Bool?
    let challengeId: String?
    let channel: String?
    let destination: String?
    let expiresInMinutes: Int?
}
struct OtpChallenge: Codable {
    let challengeId: String
    let channel: String
    let destination: String
    let expiresInMinutes: Int
}
enum AuthResult {
    case authenticated(UserDTO)
    case challenge(OtpChallenge)
}

struct OtpChannelsDTO: Codable {
    let demo: Bool
    let whatsapp: Bool
    let email: Bool
    let defaultChannel: String
    let codeLength: Int
    let ttlMinutes: Int
    let consentVersion: String?
}

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
    static func makeURL(base: URL, path: String, query: [URLQueryItem] = []) throws -> URL {
        guard var components = URLComponents(url: base.appendingPathComponent(path), resolvingAgainstBaseURL: false) else {
            throw ApiError.invalidResponse
        }
        if !query.isEmpty {
            components.queryItems = query
            // Express décode « + » comme un espace dans une query de formulaire.
            components.percentEncodedQuery = components.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B")
        }
        guard let url = components.url else { throw ApiError.invalidResponse }
        return url
    }

    private func request(_ path: String, method: String = "GET", json: [String: Any]? = nil,
                         query: [URLQueryItem] = []) async throws -> Data {
        let url = try Self.makeURL(base: ApiConfig.baseURL, path: path, query: query)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.timeoutInterval = 25
        if let token = TokenStore.token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let json = json {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: json)
        }
        let (data, resp) = try await session.data(for: req)
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            struct ErrorBody: Decodable { let error, message: String? }
            let failure = try? JSONDecoder().decode(ErrorBody.self, from: data)
            if http.statusCode == 409, let code = failure?.error, ["consent_required", "consent_version_changed"].contains(code) {
                throw ApiError.legalConsent(code, failure?.message)
            }
            throw ApiError.badStatus(http.statusCode, failure?.message)
        }
        return data
    }

    private func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        try JSONDecoder().decode(T.self, from: try await request(path, query: query))
    }

    // MARK: Authentification : seule une réponse contenant une session vérifiée ouvre le compte.
    private static let apiRoles = ["parent", "student", "teacher"]

    static func normalizePhone(_ local: String) -> String {
        let digits = local.filter(\.isNumber)
        if digits.count == 10 && digits.hasPrefix("0") { return "+225\(digits)" }
        return "+\(digits)"
    }

    static func localPhone(_ phone: String) -> String {
        phone.hasPrefix("+225") ? String(phone.dropFirst(4)) : phone
    }

    static func maskPhone(_ e164: String) -> String {
        let d = e164.filter(\.isNumber)
        let local = d.hasPrefix("225") ? String(d.dropFirst(3)) : d
        guard local.count >= 8 else { return e164 }
        let a = local.prefix(2)
        let b = local.dropFirst(2).prefix(2)
        let last = local.suffix(2)
        return "+225 \(a) \(b) ** ** \(last)"
    }

    func refreshOtpChannels(router: Router) async {
        if let c: OtpChannelsDTO = try? await get("api/auth/otp-channels") {
            await MainActor.run {
                router.otpDemo = c.demo
                router.otpCodeLength = c.codeLength
                router.otpTtlMinutes = c.ttlMinutes
                router.otpWhatsappEnabled = c.whatsapp
                router.otpEmailEnabled = c.email
                if c.defaultChannel == "email" || c.defaultChannel == "whatsapp" {
                    router.authOtpChannel = c.defaultChannel
                }
            }
        }
    }

    func currentConsentVersion() async throws -> String {
        let channels: OtpChannelsDTO = try await get("api/auth/otp-channels")
        guard let version = channels.consentVersion, !version.isEmpty else { throw ApiError.invalidResponse }
        return version
    }

    func accountConsent() async throws -> AccountConsentDTO { try await get("api/account/consent") }

    func acceptAccountConsent(version: String, parentalConsent: Bool) async throws {
        _ = try await request("api/account/consent", method: "POST", json: ["consent": true, "consentVersion": version, "parentalConsent": parentalConsent])
    }

    private func authResult(_ data: Data) throws -> AuthResult {
        let r = try JSONDecoder().decode(AuthResponse.self, from: data)
        if let token = r.token, !token.isEmpty, let user = r.user, r.verified == true {
            try TokenStore.save(token: token, user: user)
            return .authenticated(user)
        }
        guard r.otpRequired == true, let id = r.challengeId, !id.isEmpty,
              let channel = r.channel, let destination = r.destination,
              let expires = r.expiresInMinutes else { throw ApiError.invalidResponse }
        return .challenge(OtpChallenge(challengeId: id, channel: channel, destination: destination, expiresInMinutes: expires))
    }

    func login(phone: String, channel: String = "whatsapp", email: String? = nil) async throws -> AuthResult {
        var body: [String: Any] = ["phone": phone, "channel": channel]
        if let email, !email.isEmpty { body["email"] = email }
        return try authResult(try await request("api/auth/login", method: "POST", json: body))
    }

    func signup(fullName: String, phone: String, roleIndex: Int,
                consent: Bool, parentalConsent: Bool, consentVersion: String, email: String? = nil) async throws -> AuthResult {
        guard consent, !consentVersion.isEmpty else { throw ApiError.legalConsent("consent_required", nil) }
        let role = Self.apiRoles[min(max(roleIndex, 0), 2)]
        var body: [String: Any] = ["fullName": fullName, "phone": phone, "role": role,
                                  "channel": "whatsapp", "consent": consent, "parentalConsent": parentalConsent, "consentVersion": consentVersion]
        if let email, !email.isEmpty { body["email"] = email }
        return try authResult(try await request("api/auth/signup", method: "POST", json: body))
    }

    func requestOtp(challengeId: String) async throws -> OtpChallenge {
        let data = try await request("api/auth/request-otp", method: "POST", json: ["challengeId": challengeId])
        let challenge = try JSONDecoder().decode(OtpChallenge.self, from: data)
        guard !challenge.challengeId.isEmpty else { throw ApiError.invalidResponse }
        return challenge
    }

    func verifyOtp(challengeId: String, code: String) async throws -> UserDTO {
        let data = try await request("api/auth/verify-otp", method: "POST", json: ["challengeId": challengeId, "code": code])
        guard case let .authenticated(user) = try authResult(data) else { throw ApiError.invalidResponse }
        return user
    }

    func otpSettings() async throws -> [String: String] { try await get("api/admin/otp-settings") }
    func updateOtpSettings(_ values: [String: String]) async throws -> [String: String] {
        let data = try await request("api/admin/otp-settings", method: "PUT", json: values as [String: Any])
        return try JSONDecoder().decode([String: String].self, from: data)
    }

    // MARK: Candidatures professeur
    func submitTeacherApplication(_ body: [String: Any]) async throws -> TeacherApplicationResultDTO {
        let data = try await request("api/teacher-applications", method: "POST", json: body)
        return try JSONDecoder().decode(TeacherApplicationResultDTO.self, from: data)
    }

    func teacherApplicationStatus(phone: String) async throws -> TeacherApplicationStatusDTO {
        try await get("api/teacher-applications/status", query: [URLQueryItem(name: "phone", value: phone)])
    }

    func subjects() async throws -> [SubjectDTO] { try await get("api/subjects") }
    func levels() async throws -> [LevelDTO] { try await get("api/levels") }
    func programs() async throws -> [ProgramDTO] { try await get("api/programs") }
    func teachers() async throws -> [TeacherDTO] { try await get("api/teachers") }
    func teacher(_ id: Int) async throws -> TeacherDTO { try await get("api/teachers/\(id)") }
    func courses(status: String? = nil) async throws -> [CourseDTO] {
        try await get("api/courses", query: status.map { [URLQueryItem(name: "status", value: $0)] } ?? [])
    }
    func me() async throws -> UserDTO { try await get("api/me") }
    func capabilities() async throws -> [String: Bool] { try await get("api/capabilities") }
    func exportAccount() async throws -> Data { try await request("api/account/export") }
    func accountDeletion() async throws -> AccountDeletionDTO { try await get("api/account/deletion-request") }
    func requestAccountDeletion() async throws -> AccountDeletionDTO {
        try JSONDecoder().decode(AccountDeletionDTO.self, from: try await request("api/account/deletion-request", method: "POST", json: ["confirmation": "SUPPRIMER"]))
    }
    func cancelAccountDeletion() async throws -> AccountDeletionDTO {
        try JSONDecoder().decode(AccountDeletionDTO.self, from: try await request("api/account/deletion-request", method: "DELETE"))
    }
    func accountPreferences() async throws -> NotificationPreferencesDTO { try await get("api/account/preferences") }
    func updateAccountPreferences(whatsapp: Bool, email: Bool) async throws -> NotificationPreferencesDTO {
        try JSONDecoder().decode(NotificationPreferencesDTO.self, from: try await request("api/account/preferences", method: "PUT", json: ["notificationsWhatsapp": whatsapp, "notificationsEmail": email]))
    }
    func courseDetails(_ id: Int) async throws -> CourseDetailsDTO { try await get("api/courses/\(id)") }
    func updateCourseDetails(_ id: Int, body: [String: Any]) async throws {
        _ = try await request("api/courses/\(id)/details", method: "PUT", json: body)
    }
    func courseAction(_ id: Int, action: String, body: [String: Any]) async throws {
        _ = try await request("api/courses/\(id)/\(action)", method: "POST", json: body)
    }
    func requestPayout(amount: Int, provider: String, idempotencyKey: String) async throws {
        _ = try await request("api/teacher/payout-requests", method: "POST", json: ["amount": amount, "provider": provider, "idempotencyKey": idempotencyKey])
    }
    /// Crée une réservation ; renvoie référence + cours (payment_status pending).
    func createBooking(_ body: [String: Any]) async throws -> BookingResult {
        let data = try await request("api/bookings", method: "POST", json: body)
        return try JSONDecoder().decode(BookingResult.self, from: data)
    }

    func chargeMobile(courseId: Int, provider: String, phone: String) async throws -> ChargeMobileResponse {
        let data = try await request("api/payments/charge-mobile", method: "POST", json: [
            "courseId": courseId, "provider": provider, "phone": phone,
        ])
        return try JSONDecoder().decode(ChargeMobileResponse.self, from: data)
    }

    func submitPaymentOtp(paymentId: Int, otp: String) async throws -> ChargeMobileResponse {
        let data = try await request("api/payments/submit-otp", method: "POST", json: [
            "paymentId": paymentId, "otp": otp,
        ])
        return try JSONDecoder().decode(ChargeMobileResponse.self, from: data)
    }

    func paymentStatus(_ paymentId: Int) async throws -> PaymentStatusResponse {
        try await get("api/payments/\(paymentId)/status")
    }

    func pollUntilPaid(paymentId: Int) async -> Bool {
        for _ in 0..<24 {
            if Task.isCancelled { return false }
            if let st = try? await paymentStatus(paymentId) {
                if st.paid { return true }
                if st.status == "failed" { return false }
            }
            do { try await Task.sleep(nanoseconds: 2_500_000_000) } catch { return false }
        }
        return (try? await paymentStatus(paymentId))?.paid ?? false
    }
    func progress() async throws -> ProgressDTO { try await get("api/progress") }
    func groups() async throws -> [GroupDTO] { try await get("api/groups") }
    func notifications() async throws -> [NotificationDTO] { try await get("api/notifications") }
    func markNotificationsRead() async throws { _ = try await request("api/notifications/read", method: "POST") }
    func unreadCount() async throws -> Int { (try await get("api/notifications/unread") as UnreadDTO).count }

    // MARK: Espace professeur
    func teacherDashboard() async throws -> TeacherDashboardDTO { try await get("api/teacher/dashboard") }
    func teacherRequests() async throws -> [TeacherRequestDTO] { try await get("api/teacher/requests") }
    func teacherEarnings() async throws -> TeacherEarningsDTO { try await get("api/teacher/earnings") }
    func teacherProfile() async throws -> TeacherProfileDTO { try await get("api/teacher/profile") }
    func updateTeacherProfile(_ json: [String: Any]) async throws -> TeacherProfileDTO {
        let data = try await request("api/teacher/profile", method: "PUT", json: json)
        return try JSONDecoder().decode(TeacherProfileDTO.self, from: data)
    }
    func acceptRequest(courseId: Int) async throws { _ = try await request("api/teacher/requests/\(courseId)/accept", method: "POST") }
    func acceptOpportunity(needId: Int) async throws { _ = try await request("api/teacher/opportunities/\(needId)/accept", method: "POST") }
    func refuseRequest(courseId: Int) async throws { _ = try await request("api/teacher/requests/\(courseId)/refuse", method: "POST") }

    // MARK: Besoins parents
    func children() async throws -> [ChildDTO] { try await get("api/children") }
    func cancelNeed(id: Int) async throws { _ = try await request("api/needs/\(id)/cancel", method: "POST") }
    func createChild(_ json: [String: Any]) async throws -> ChildDTO {
        let data = try await request("api/children", method: "POST", json: json)
        return try JSONDecoder().decode(ChildDTO.self, from: data)
    }
    func needs() async throws -> [NeedDTO] { try await get("api/needs") }
    func createNeed(_ json: [String: Any]) async throws -> NeedDTO {
        let data = try await request("api/needs", method: "POST", json: json)
        return try JSONDecoder().decode(NeedDTO.self, from: data)
    }
    func acceptNeedPrice(id: Int) async throws -> NeedDTO {
        let data = try await request("api/needs/\(id)/accept-price", method: "POST")
        return try JSONDecoder().decode(NeedDTO.self, from: data)
    }

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

    func resources(type: String? = nil, subject: String? = nil, level: String? = nil, program: String? = nil) async throws -> [ResourceDTO] {
        var q: [URLQueryItem] = []
        if let type { q.append(URLQueryItem(name: "type", value: type)) }
        if let subject { q.append(URLQueryItem(name: "subject", value: subject)) }
        if let level { q.append(URLQueryItem(name: "level", value: level)) }
        if let program { q.append(URLQueryItem(name: "program", value: program)) }
        return try await get("api/resources", query: q)
    }
    func createResource(type: String, title: String, program: String, subjectSlug: String?, level: String?, description: String?,
                        fileName: String? = nil, mimeType: String? = nil, contentBase64: String? = nil) async throws -> ResourceDTO {
        var json: [String: Any] = ["type": type, "title": title, "program": program]
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
        .init(id: 1, initials: "KN", name: "Koffi N'Guessan", subjects: "Maths · Physique-Chimie · 8 ans d'exp.", rating: 4.9, reviews_count: 128, location: "Cocody", price_per_hour: 4000, distance_km: 2.4, accent: "green", verified: true, special_bepc: true, formats: ["home","online"], experience: nil, students: nil, bac_success: nil, bio: nil, levels: nil, programs: nil, negotiable: nil, reviews: nil),
        .init(id: 2, initials: "ID", name: "Ibrahim Diallo", subjects: "Maths · Statistiques · 5 ans d'exp.", rating: 4.7, reviews_count: 210, location: "Yopougon", price_per_hour: 3000, distance_km: 5.1, accent: "orange", verified: true, special_bepc: false, formats: ["home","online"], experience: nil, students: nil, bac_success: nil, bio: nil, levels: nil, programs: nil, negotiable: nil, reviews: nil),
        .init(id: 3, initials: "AY", name: "Adjoua Yao", subjects: "Maths · SVT · 6 ans d'exp.", rating: 4.9, reviews_count: 88, location: "Cocody", price_per_hour: 4000, distance_km: 1.8, accent: "green", verified: true, special_bepc: false, formats: ["home"], experience: nil, students: nil, bac_success: nil, bio: nil, levels: nil, programs: nil, negotiable: nil, reviews: nil),
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
        pendingRequests: 3, negotiable: false, needsConfirmed: true, profileCompletion: nil)
    static let teacherRequests: [TeacherRequestDTO] = [
        .init(courseId: 1, needId: 1, initials: "CO", accent: "green", name: "Cocody Angré", ago: "nouveau", price: 8500, student: "Kouadio · 3eme", subject: "Maths", slot: "Cocody Angré", format: "À domicile", netHourly: 4250, frequency: "1 fois/sem", duration: "2h00", startDate: nil, isOpportunity: true, availabilityWeek: true, availabilityWeekend: false, availabilityHolidays: false, hasCat: true, hasDog: false, lat: 5.3895, lng: -3.958),
    ]
    static let teacherEarnings = TeacherEarningsDTO(
        total: 184000, trend: "+12%",
        weeks: [.init(label: "S1", f: 0.48), .init(label: "S2", f: 0.66), .init(label: "S3", f: 0.58), .init(label: "S4", f: 0.88)],
        stats: [.init(value: "38", label: "cours donnés"), .init(value: "52 h", label: "enseignées"), .init(value: "3 800", label: "F / h moyen")],
        payouts: [.init(provider: "Retrait Wave", date: "15 juin", amount: 60000, color: "wave"),
                  .init(provider: "Retrait Orange Money", date: "1 juin", amount: 80000, color: "orange")])
    static let resources: [ResourceDTO] = [
        .init(id: 1, type: "course", subject_slug: "maths", level: "3eme", program: "standard", title: "Fiche, Théorème de Thalès", description: "Rappels de cours et exemples corrigés.", file_name: nil, mime_type: nil, size_bytes: nil, created_at: nil),
        .init(id: 2, type: "exercise", subject_slug: "physique", level: "2nde", program: "standard", title: "Série d'exercices, Optique", description: "10 exercices progressifs avec corrigés.", file_name: nil, mime_type: nil, size_bytes: nil, created_at: nil),
        .init(id: 3, type: "homework", subject_slug: "francais", level: "1ere", program: "francais", title: "Devoir, Commentaire de texte", description: "Sujet type BAC à rendre.", file_name: nil, mime_type: nil, size_bytes: nil, created_at: nil),
    ]
    static let courses: [CourseDTO] = [
        .init(id: 1, teacher_name: "Koffi N'Guessan", subject: "Maths", level: "3ᵉ", day_label: "SAM", day_num: "22", time: "16h00", duration: "1h30", format: "home", location: "À domicile, Cocody", price: 6000, status: "upcoming", badge: "Dans 2 jours", negotiable: nil, proposed_price: nil, proposed_frequency: nil, counter_price: nil, counter_frequency: nil, negotiation_status: nil, payment_status: nil, accepted: false, starts_at: nil, duration_minutes: nil),
        .init(id: 2, teacher_name: "Mariam Touré", subject: "Anglais", level: "3ᵉ", day_label: "LUN", day_num: "24", time: "17h00", duration: "1h", format: "online", location: nil, price: 4500, status: "upcoming", badge: nil, negotiable: nil, proposed_price: nil, proposed_frequency: nil, counter_price: nil, counter_frequency: nil, negotiation_status: nil, payment_status: nil, accepted: false, starts_at: nil, duration_minutes: nil),
        .init(id: 3, teacher_name: "Koffi N'Guessan", subject: "Maths", level: "3ᵉ", day_label: "VEN", day_num: "14", time: "15h00", duration: "1h30", format: "home", location: "À domicile, Cocody", price: 6000, status: "done", badge: nil, negotiable: nil, proposed_price: nil, proposed_frequency: nil, counter_price: nil, counter_frequency: nil, negotiation_status: nil, payment_status: nil, accepted: false, starts_at: nil, duration_minutes: nil),
    ]
    static let groups: [GroupDTO] = [
        .init(id: 1, tag: "PRÉPA BAC", tag_accent: "orange", price: 2000, title: "Maths & Physique-Chimie", detail: "Terminale D · 8 semaines · Sam & Dim", teacher_initials: "KN", teacher_name: "Koffi N'Guessan", teacher_accent: "green", enrolled: 9, capacity: 12, places_left: 3, kind: "regular", start_date: nil, end_date: nil),
        .init(id: 2, tag: "PRÉPA BEPC", tag_accent: "green", price: 1500, title: "Maths intensif", detail: "3ᵉ · 6 semaines · Mer & Sam", teacher_initials: "ID", teacher_name: "Ibrahim Diallo", teacher_accent: "orange", enrolled: 6, capacity: 10, places_left: 4, kind: "regular", start_date: nil, end_date: nil),
        .init(id: 3, tag: "VACANCES", tag_accent: "green", price: 1500, title: "Stage de Français", detail: "Collège · 2 semaines · Lun → Ven", teacher_initials: nil, teacher_name: nil, teacher_accent: "green", enrolled: nil, capacity: nil, places_left: nil, kind: "stage", start_date: "2026-08-03", end_date: "2026-08-14"),
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
        levels: ["Collège", "Lycée", "Prépa BEPC", "Prépa BAC"], programs: ["standard"], negotiable: false,
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
        catch { teachers = []; fromApi = false }
        loading = false
    }
}

/// Store : accueil (matières + profs recommandés).
@MainActor
final class HomeStore: ObservableObject {
    @Published var subjects: [SubjectDTO] = []
    @Published var teachers: [TeacherDTO] = []
    @Published var loading = true
    @Published var error: String?
    func load() async {
        loading = true
        defer { loading = false }
        do {
            async let s = ApiClient.shared.subjects()
            async let t = ApiClient.shared.teachers()
            let result = try await (s, t)
            subjects = result.0; teachers = result.1; error = nil
        } catch { subjects = []; teachers = []; self.error = error.localizedDescription }
    }
}

/// Store : mes cours.
@MainActor
final class CoursesStore: ObservableObject {
    @Published var courses: [CourseDTO] = []
    @Published var loading = false
    @Published var error: String?
    func load() async {
        loading = true
        defer { loading = false }
        do { courses = try await ApiClient.shared.courses(); error = nil }
        catch { courses = []; self.error = error.localizedDescription }
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
    @Published var teacher: TeacherDTO?
    @Published var error: String?
    func load(_ id: Int) async {
        do { teacher = try await ApiClient.shared.teacher(id); error = nil }
        catch { teacher = nil; self.error = error.localizedDescription }
    }
}
