import SwiftUI
import UniformTypeIdentifiers

private func reportLabel(_ value: String) -> String {
    switch value {
    case "completed": return "Cours réalisé"
    case "teacher_absent": return "Absence du professeur signalée"
    case "student_absent": return "Absence de l’élève signalée"
    case "disputed": return "Difficulté signalée"
    default: return "Déclaration enregistrée"
    }
}

private func courseEventLabel(_ value: String) -> String {
    switch value {
    case "need_matched": return "Professeur attribué au besoin de cours"
    case "details_updated": return "Informations du rendez-vous mises à jour"
    case "schedule_proposed": return "Créneau proposé"
    case "schedule_accepted": return "Créneau accepté"
    case "schedule_declined": return "Créneau refusé"
    case "cancelled": return "Cours annulé"
    case "attendance_reported": return "Déclaration de réalisation reçue"
    case "admin_resolved": return "Traitement du cours par le support"
    case "review_created": return "Avis publié"
    case "historical_terms_documented": return "Conditions du cours précisées par le support"
    default: return "Activité du cours enregistrée"
    }
}

private struct OperationCard<Content: View>: View {
    let title: String
    @ViewBuilder var content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(AkFont.schibstedBold(17)).foregroundColor(Ak.ink)
            content()
        }.frame(maxWidth: .infinity, alignment: .leading).akCard(radius: 18, padding: 16)
    }
}

private struct OperationField: View {
    let label: String
    @Binding var value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label).font(AkFont.semibold(12)).foregroundColor(Ak.muted)
            TextField(label, text: $value, axis: .vertical).textFieldStyle(.roundedBorder)
        }
    }
}

struct ProductionAccountScreen: View {
    @EnvironmentObject var router: Router
    @State private var user: UserDTO?
    @State private var error: String?
    var body: some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: "Mon compte", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 15) {
                    if let error { Text(error).foregroundColor(Ak.danger) }
                    OperationCard(title: user?.full_name ?? router.authFullName) {
                        Text(user?.phone ?? router.authPhone)
                        Text(router.isTeacher ? "Professeur" : router.isAdmin ? "Administrateur" : "Parent / élève")
                    }
                    if router.isTeacher {
                        accountLink("Compléter mon profil professeur", .completeTeacherProfile)
                        Button("Voir mon profil public") {
                            router.selectedTeacherId = TokenStore.user?.teacher_id
                            router.go(.teacherProfile)
                        }.buttonStyle(.bordered)
                        accountLink("Revenus et versements", .earnings)
                        accountLink("Mon agenda", .agenda)
                    } else {
                        accountLink("Mes enfants", .myChildren)
                        accountLink("Mes demandes de cours", .myNeeds)
                        accountLink("Devenir professeur", .becomeTeacher)
                    }
                    accountLink("Mes cours et paiements", .myCourses)
                    accountLink("Ressources pédagogiques", .resources)
                    accountLink("Documents légaux", .legal)
                    accountLink("Mes données et mon compte", .settings)
                    accountLink("Aide et support", .helpFaq)
                    if router.isAdmin {
                        OperationCard(title: "Administration") {
                            accountLink("Catalogue", .adminCatalog)
                            accountLink("Ressources", .adminResources)
                            accountLink("Documents légaux", .adminLegal)
                            accountLink("Coordonnées et réseaux", .adminSocial)
                            accountLink("Configuration OTP", .adminOtp)
                            Text("Le suivi des opérations financières et des demandes de suppression est disponible dans la console web d’administration.").font(AkFont.regular(13))
                        }
                    }
                    Button("Se déconnecter", role: .destructive) {
                        router.logout()
                    }.buttonStyle(.bordered)
                }.padding(22)
            }
            if router.isTeacher { TeacherBottomNav(current: .profil) } else { BottomNav(current: .profil) }
        }.task {
            do { user = try await ApiClient.shared.me() } catch { self.error = error.localizedDescription }
        }
    }
    private func accountLink(_ title: String, _ route: Route) -> some View {
        Button(title) { router.go(route) }.buttonStyle(.bordered).frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct AccountExportDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data
    init(data: Data = Data()) { self.data = data }
    init(configuration: ReadConfiguration) throws { data = configuration.file.regularFileContents ?? Data() }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents: data) }
}

struct PrivacySettingsScreen: View {
    @EnvironmentObject var router: Router
    @State private var state: AccountDeletionDTO?
    @State private var preferences: NotificationPreferencesDTO?
    @State private var accountConsent: AccountConsentDTO?
    @State private var consentChecked = false
    @State private var parentalConsentChecked = false
    @State private var error: String?
    @State private var info: String?
    @State private var busy = false
    @State private var confirmation = ""
    @State private var exportDocument = AccountExportDocument()
    @State private var exportPresented = false
    var body: some View {
        AkScreen {
            TopBar(title: "Mes données et mon compte", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if busy { ProgressView() }
                    if let error { Text(error).foregroundColor(Ak.danger) }
                    if let info { Text(info).foregroundColor(Ak.green) }
                    consentCard
                    OperationCard(title: "Exporter mes données") {
                        Text("Téléchargez un fichier JSON contenant les données de votre compte. Il peut inclure des informations concernant vos enfants et vos cours.")
                        Text("Une connexion OTP de moins de 15 minutes protège cet export.")
                        Button("Télécharger mes données") {
                            perform {
                                exportDocument = AccountExportDocument(data: try await ApiClient.shared.exportAccount())
                                exportPresented = true
                            }
                        }.buttonStyle(.borderedProminent).disabled(busy)
                    }
                    preferencesCard
                    deletionCard
                }.padding(22)
            }
        }
        .task {
            do { state = try await ApiClient.shared.accountDeletion() } catch { self.error = error.localizedDescription }
            do { preferences = try await ApiClient.shared.accountPreferences() } catch { self.error = error.localizedDescription }
            do {
                let latest = try await ApiClient.shared.accountConsent()
                if latest.version != accountConsent?.version { consentChecked = false; parentalConsentChecked = false }
                accountConsent = latest
            } catch { self.error = error.localizedDescription }
        }
        .fileExporter(isPresented: $exportPresented, document: exportDocument, contentType: .json,
                      defaultFilename: "monprofperso-donnees") { result in
            exportDocument = AccountExportDocument()
            switch result {
            case .success: info = "Export enregistré à l’emplacement choisi. Conservez ce fichier personnel en lieu sûr."
            case .failure(let failure): error = failure.localizedDescription
            }
        }
    }
    private var consentCard: some View {
        OperationCard(title: "Conditions et confidentialité") {
            if let legal = accountConsent {
                ForEach(legal.documents) { document in
                    Text("\(document.title) · version \(document.version)")
                    Button("Lire le document") { router.go(.pdfViewer(url: ApiConfig.baseURL.appendingPathComponent("api/legal/\(document.slug)/file").absoluteString, title: document.title)) }
                }
                if legal.accepted { Text("Vous avez accepté les conditions en vigueur.") }
                else {
                    Text("Consultez les documents à jour et confirmez votre accord pour continuer à réserver ou à payer.")
                    Toggle("J’accepte les conditions et la politique de confidentialité.", isOn: $consentChecked).disabled(busy)
                    if router.authRole == "student" { Toggle("Je confirme le consentement de mon parent ou tuteur légal.", isOn: $parentalConsentChecked).disabled(busy) }
                    Button("Accepter les conditions à jour") {
                        perform {
                            do {
                                try await ApiClient.shared.acceptAccountConsent(version: legal.version, parentalConsent: parentalConsentChecked)
                                consentChecked = false; parentalConsentChecked = false
                                accountConsent = try await ApiClient.shared.accountConsent()
                                info = accountConsent?.accepted == true ? "Votre accord est enregistré pour les conditions en vigueur." : "Les documents ont changé. Relisez-les et confirmez à nouveau votre accord."
                            } catch {
                                if (error as? ApiError)?.consentCode == "consent_version_changed" {
                                    consentChecked = false; parentalConsentChecked = false; accountConsent = nil
                                    accountConsent = try? await ApiClient.shared.accountConsent()
                                }
                                throw error
                            }
                        }
                    }.buttonStyle(.borderedProminent).disabled(busy || !consentChecked || legal.version.isEmpty || (router.authRole == "student" && !parentalConsentChecked))
                }
            } else {
                Text("Les conditions actuelles doivent être chargées avant toute acceptation.")
                Button("Recharger les conditions") { perform { accountConsent = try await ApiClient.shared.accountConsent(); consentChecked = false; parentalConsentChecked = false } }.buttonStyle(.bordered).disabled(busy)
            }
        }
    }
    @ViewBuilder private var preferencesCard: some View {
        if let preferences {
            OperationCard(title: "Alertes de cours et de paiement") {
                Toggle("WhatsApp", isOn: Binding(get: { self.preferences?.notificationsWhatsapp ?? false }, set: { self.preferences?.notificationsWhatsapp = $0 }))
                    .disabled(busy || (!preferences.whatsappAvailable && !preferences.notificationsWhatsapp))
                if !preferences.whatsappAvailable { Text("Ce canal nécessite un numéro vérifié et un service d’envoi disponible.") }
                Toggle("Email", isOn: Binding(get: { self.preferences?.notificationsEmail ?? false }, set: { self.preferences?.notificationsEmail = $0 }))
                    .disabled(busy || (!preferences.emailAvailable && !preferences.notificationsEmail))
                if !preferences.emailAvailable { Text("Ce canal nécessite une adresse email vérifiée et un service d’envoi disponible.") }
                Text("Ces préférences concernent les cours et les paiements. Vos notifications restent consultables dans l’application.")
                Button("Enregistrer mes préférences") {
                    perform {
                        self.preferences = try await ApiClient.shared.updateAccountPreferences(whatsapp: preferences.notificationsWhatsapp, email: preferences.notificationsEmail)
                        info = "Préférences enregistrées."
                    }
                }.buttonStyle(.bordered).disabled(busy)
            }
        }
    }
    private var deletionCard: some View {
        OperationCard(title: "Supprimer mon compte") {
            Text("La suppression retire votre profil et anonymise vos données personnelles. Les éléments nécessaires au règlement des cours, aux litiges et aux obligations de conservation sont traités selon la politique de confidentialité.")
            Text("Une connexion OTP de moins de 15 minutes est requise. Une demande reste en attente tant que des opérations doivent être clôturées.")
            ForEach(Array((state?.blockers ?? []).enumerated()), id: \.offset) { _, blocker in Text(blocker.message).foregroundColor(Ak.orange) }
            if state?.request?.status == "pending" {
                Text("Votre demande est enregistrée. Vous pouvez la retirer avant son traitement.")
                Button("Annuler ma demande de suppression") {
                    perform { state = try await ApiClient.shared.cancelAccountDeletion(); info = "Demande de suppression annulée." }
                }.buttonStyle(.bordered).disabled(busy)
            } else {
                OperationField(label: "Écrivez SUPPRIMER pour confirmer", value: $confirmation).textInputAutocapitalization(.characters)
                Button("Confirmer la suppression de mon compte", role: .destructive) {
                    perform {
                        let result = try await ApiClient.shared.requestAccountDeletion()
                        state = result; confirmation = ""
                        if result.request?.status == "completed" {
                            router.logout()
                        } else { info = "Votre demande est enregistrée. Les opérations indiquées doivent être clôturées avant la suppression." }
                    }
                }.buttonStyle(.bordered).disabled(busy || confirmation != "SUPPRIMER")
            }
            Button("Me reconnecter pour confirmer mon identité") {
                router.logout(); router.go(.login)
            }.disabled(busy)
            Button("Consulter la politique de confidentialité") { router.go(.legal) }
        }
    }
    @MainActor private func perform(_ action: @escaping () async throws -> Void) {
        busy = true; error = nil; info = nil
        Task { @MainActor in
            defer { busy = false }
            do { try await action() } catch is CancellationError { } catch { self.error = error.localizedDescription }
        }
    }
}

struct CourseOperationsScreen: View {
    @EnvironmentObject var router: Router
    @Environment(\.openURL) private var openURL
    @State private var details: CourseDetailsDTO?
    @State private var busy = false
    @State private var error: String?
    @State private var info: String?
    @State private var address = ""
    @State private var meetingURL = ""
    @State private var accessNotes = ""
    @State private var startAt = Date().addingTimeInterval(86_400)
    @State private var scheduleReason = ""
    @State private var cancellationReason = ""
    @State private var reportOutcome = "completed"
    @State private var reportNote = ""
    @State private var progressSummary = ""
    @State private var reviewRating = 5
    @State private var reviewText = ""
    @State private var refundAmount = ""
    @State private var refundReason = ""
    @State private var refundKey = UUID().uuidString
    private var courseId: Int? { router.selectedCourseId ?? router.bkCourseId }
    private var teacherParticipant: Bool { details?.course.isTeacherParticipant(accountRole: router.authRole) ?? router.isTeacher }
    var body: some View {
        AkScreen {
            TopBar(title: "Détail du cours", onBack: { router.back() })
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    if busy { ProgressView() }
                    if let error { Text(error).foregroundColor(Ak.danger) }
                    if let info { Text(info).foregroundColor(Ak.green) }
                    if courseId == nil {
                        Text("Choisissez d’abord un cours dans votre agenda.")
                        Button("Voir mes cours") { router.go(.myCourses) }.buttonStyle(.bordered)
                    }
                    if let details {
                        summary(details)
                        if details.permissions.contains("edit_details") { detailsEditor(details) }
                        scheduleProposals(details)
                        if details.permissions.contains("schedule") { scheduleEditor }
                        if details.permissions.contains("report") { reportEditor }
                        if details.permissions.contains("cancel") { cancellationEditor }
                        if details.permissions.contains("request_refund") { refundEditor }
                        if details.permissions.contains("review") && router.featureEnabled("reviews") { reviewEditor }
                        history(details)
                    }
                }.padding(22)
            }
        }.task(id: courseId) { busy = true; defer { busy = false }; do { try await reload() } catch { self.error = error.localizedDescription } }
    }
    private func summary(_ d: CourseDetailsDTO) -> some View {
        OperationCard(title: "\(d.course.subject) · \(d.course.level)") {
            Text("Professeur : \(d.course.teacher_name)")
            if let name = d.course.parent_name { Text("Parent : \(name)") }
            Text(CourseOperations.statusLabel(d.course.lifecycle_status)).foregroundColor(Ak.green)
            Text(teacherParticipant ? "Vous intervenez comme professeur pour ce cours." : "Vous avez demandé ce cours en tant que parent ou élève.")
            Text("\(d.course.day_label) \(d.course.day_num) · \(d.course.time) · \(d.course.duration)")
            Text("Montant du cours : \(d.course.price.formattedFCFA) F CFA")
            Text("Encaissé : \(d.finance.capturedAmount.formattedFCFA) F · Remboursé : \(d.finance.refundAmount.formattedFCFA) F")
            if d.finance.refundPendingAmount > 0 { Text("Remboursement demandé : \(d.finance.refundPendingAmount.formattedFCFA) F") }
            if d.finance.reviewRequired { Text("Le support doit vérifier les montants ou le signalement avant de débloquer les opérations financières.") }
            if let address = d.course.private_address, !address.isEmpty { Text("Adresse : \(address)") }
            if let notes = d.course.access_notes, !notes.isEmpty { Text("Informations d’accès : \(notes)") }
            if let url = CourseOperations.safeMeetingURL(d.course.meeting_url) { Link("Rejoindre le cours en ligne", destination: url).buttonStyle(.bordered) }
            if let phone = teacherParticipant ? d.contacts.parentPhone : d.contacts.teacherPhone,
               phone.range(of: "^\\+?[0-9]{8,15}$", options: .regularExpression) != nil, let url = URL(string: "tel:\(phone)") {
                Link("Appeler : \(phone)", destination: url).buttonStyle(.bordered)
            }
            if d.course.canPay && !teacherParticipant {
                Button("Payer ce cours") { router.loadCourse(d.course); router.go(.payment) }.buttonStyle(.borderedProminent).disabled(busy)
            }
            Button("Actualiser") { perform("Cours actualisé.") { _ in } }.buttonStyle(.bordered).disabled(busy)
        }
    }
    private func detailsEditor(_ d: CourseDetailsDTO) -> some View {
        OperationCard(title: "Informations du rendez-vous") {
            if !teacherParticipant && d.course.format != "online" { OperationField(label: "Adresse précise du cours", value: $address) }
            if teacherParticipant && d.course.format == "online" { OperationField(label: "Lien HTTPS du cours", value: $meetingURL).textInputAutocapitalization(.never).autocorrectionDisabled() }
            OperationField(label: "Consignes d’accès", value: $accessNotes)
            Button("Enregistrer") {
                perform("Informations enregistrées.") { id in
                    var body: [String: Any] = ["accessNotes": accessNotes]
                    if teacherParticipant && d.course.format == "online" { body["meetingUrl"] = meetingURL }
                    if !teacherParticipant && d.course.format != "online" { body["privateAddress"] = address }
                    try await ApiClient.shared.updateCourseDetails(id, body: body)
                }
            }.buttonStyle(.borderedProminent).disabled(busy)
        }
    }
    @ViewBuilder private func scheduleProposals(_ d: CourseDetailsDTO) -> some View {
        ForEach(d.scheduleRequests.filter { $0.status == "pending" }) { proposal in
            OperationCard(title: "Créneau proposé") {
                Text(proposal.startAt)
                if let reason = proposal.reason { Text(reason) }
                if d.permissions.contains("respond_schedule") {
                    Button("Accepter ce créneau") { respond(proposal.id, decision: "accept") }.buttonStyle(.borderedProminent).disabled(busy)
                    Button("Refuser ce créneau") { respond(proposal.id, decision: "decline") }.buttonStyle(.bordered).disabled(busy)
                } else { Text("En attente de la réponse de l’autre participant.") }
            }
        }
    }
    private var scheduleEditor: some View {
        OperationCard(title: "Convenir d’un créneau") {
            Text("Heure de Côte d’Ivoire. Le créneau doit être accepté par l’autre participant.")
            DatePicker("Date et heure", selection: $startAt, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                .environment(\.timeZone, TimeZone(identifier: "Africa/Abidjan")!).environment(\.locale, Locale(identifier: "fr_CI"))
            OperationField(label: "Motif ou précision", value: $scheduleReason)
            Button("Proposer ce créneau") {
                perform("Proposition envoyée.") { id in
                    try await ApiClient.shared.courseAction(id, action: "schedule", body: ["startAt": ISO8601DateFormatter().string(from: startAt), "reason": scheduleReason])
                }
            }.buttonStyle(.borderedProminent).disabled(busy || startAt <= Date() || scheduleReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }
    private var reportEditor: some View {
        OperationCard(title: "Réalisation du cours") {
            Picker("Déclaration", selection: $reportOutcome) {
                Text("Le cours a été réalisé").tag("completed")
                Text("Professeur absent").tag("teacher_absent")
                Text("Élève absent").tag("student_absent")
                Text("Autre problème").tag("disputed")
            }
            OperationField(label: "Commentaire", value: $reportNote)
            if teacherParticipant { OperationField(label: "Bilan pédagogique du cours", value: $progressSummary) }
            Button("Enregistrer ma déclaration") {
                perform("Votre déclaration est enregistrée.") { id in
                    var body: [String: Any] = ["outcome": reportOutcome, "note": reportNote]
                    if teacherParticipant && !progressSummary.isEmpty { body["progressSummary"] = progressSummary }
                    try await ApiClient.shared.courseAction(id, action: "report", body: body)
                }
            }.buttonStyle(.borderedProminent).disabled(busy || reportNote.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }
    private var cancellationEditor: some View {
        OperationCard(title: "Annuler ce cours") {
            Text("L’annulation est enregistrée pour les deux participants. Le traitement d’un remboursement éventuel est suivi séparément.")
            OperationField(label: "Motif d’annulation", value: $cancellationReason)
            Button("Confirmer l’annulation du cours", role: .destructive) {
                perform("Cours annulé. Consultez le suivi du remboursement si nécessaire.") { id in
                    try await ApiClient.shared.courseAction(id, action: "cancel", body: ["reason": cancellationReason])
                }
            }.buttonStyle(.bordered).disabled(busy || cancellationReason.isEmpty)
        }
    }
    private var refundEditor: some View {
        OperationCard(title: "Demander un remboursement") {
            Text("Le support examine la demande. Le remboursement est confirmé uniquement après vérification de l’opération.")
            OperationField(label: "Montant en F CFA", value: $refundAmount).keyboardType(.numberPad)
            OperationField(label: "Motif", value: $refundReason)
            Button("Envoyer la demande") {
                guard let amount = Int(refundAmount), amount > 0 else { error = "Saisissez un montant positif en F CFA."; return }
                perform("Demande de remboursement enregistrée.") { id in
                    try await ApiClient.shared.courseAction(id, action: "refund-requests", body: ["amount": amount, "reason": refundReason, "idempotencyKey": refundKey])
                    refundKey = UUID().uuidString; refundAmount = ""; refundReason = ""
                }
            }.buttonStyle(.bordered).disabled(busy || refundReason.isEmpty)
        }
    }
    private var reviewEditor: some View {
        OperationCard(title: "Évaluer ce cours") {
            Stepper("Note : \(reviewRating)/5", value: $reviewRating, in: 1...5)
            OperationField(label: "Votre avis", value: $reviewText)
            Button("Publier mon avis") {
                perform("Avis enregistré.") { id in
                    try await ApiClient.shared.courseAction(id, action: "review", body: ["rating": reviewRating, "text": reviewText])
                }
            }.buttonStyle(.bordered).disabled(busy || reviewText.isEmpty)
        }
    }
    @ViewBuilder private func history(_ d: CourseDetailsDTO) -> some View {
        if !d.reports.isEmpty {
            OperationCard(title: "Déclarations et suivi pédagogique") {
                ForEach(d.reports) { report in
                    Text("\(report.actorRole == "teacher" ? "Professeur" : "Parent / élève") · \(reportLabel(report.outcome))").font(AkFont.bold(13))
                    if let note = report.note { Text(note) }
                    if let summary = report.progressSummary { Text(summary) }
                    Divider()
                }
            }
        }
        if !d.events.isEmpty {
            OperationCard(title: "Historique") {
                ForEach(Array(d.events.prefix(15))) { event in Text("\(event.createdAt ?? "") · \(courseEventLabel(event.type))").font(AkFont.regular(12)) }
            }
        }
    }
    @MainActor private func respond(_ proposalId: Int, decision: String) {
        perform(decision == "accept" ? "Créneau accepté." : "Proposition refusée.") { id in
            try await ApiClient.shared.courseAction(id, action: "schedule/\(proposalId)/respond", body: ["decision": decision])
        }
    }
    @MainActor private func reload() async throws {
        guard let courseId else { return }
        let value = try await ApiClient.shared.courseDetails(courseId)
        details = value
        address = value.course.private_address ?? ""
        meetingURL = value.course.meeting_url ?? ""
        accessNotes = value.course.access_notes ?? ""
    }
    @MainActor private func perform(_ message: String, action: @escaping (Int) async throws -> Void) {
        guard let courseId, !busy else { return }
        busy = true; error = nil; info = nil
        Task { @MainActor in
            defer { busy = false }
            do { try await action(courseId); try await reload(); info = message }
            catch is CancellationError { } catch { self.error = error.localizedDescription }
        }
    }
}

struct ProductionEarningsScreen: View {
    @EnvironmentObject var router: Router
    @State private var state: TeacherEarningsDTO?
    @State private var busy = false
    @State private var error: String?
    @State private var info: String?
    @State private var amount = ""
    @State private var provider = "orange"
    @State private var requestKey = UUID().uuidString
    var body: some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: "Revenus et versements", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if busy { ProgressView() }
                    if let error { Text(error).foregroundColor(Ak.danger) }
                    if let info { Text(info).foregroundColor(Ak.green) }
                    if let summary = state?.summary {
                        OperationCard(title: "Mes revenus") {
                            Text("Prévisionnel : \(summary.expected.formattedFCFA) F CFA")
                            Text("Dû après validation : \(summary.due.formattedFCFA) F CFA")
                            Text("Disponible : \(summary.releasable.formattedFCFA) F CFA")
                            Text("Réservé pour des versements : \(summary.reserved.formattedFCFA) F CFA")
                            Text("Déjà versé et vérifié : \(summary.paid.formattedFCFA) F CFA")
                        }
                        payoutForm(summary)
                    }
                    OperationCard(title: "Historique des demandes") {
                        if (state?.payoutRequests ?? []).isEmpty { Text("Aucune demande de versement.") }
                        ForEach(state?.payoutRequests ?? []) { request in
                            Text("\(request.amount.formattedFCFA) F CFA · \(request.provider ?? "")")
                            Text(payoutLabel(request.status))
                            if let ref = request.providerReference { Text("Référence : \(ref)") }
                            if let reason = request.reason, !reason.isEmpty { Text(reason) }
                            Divider()
                        }
                    }
                    Button("Actualiser") { Task { await reload() } }.buttonStyle(.bordered).disabled(busy)
                }.padding(22)
            }
            TeacherBottomNav(current: .revenus)
        }.task { await reload() }
    }
    private func payoutForm(_ summary: EarningsSummaryDTO) -> some View {
        OperationCard(title: "Demander un versement") {
            Text("Le versement est destiné au numéro vérifié de votre compte : \(TokenStore.user?.phone ?? router.authPhone).")
            Text("Les montants deviennent disponibles selon la réalisation des cours et la résolution des éventuels litiges.")
            Text("Votre numéro doit avoir été vérifié par OTP et votre connexion dater de moins de 15 minutes pour envoyer une demande.")
            Button("Me reconnecter et vérifier mon numéro") { router.logout(); router.go(.login) }.buttonStyle(.bordered).disabled(busy)
            OperationField(label: "Montant en F CFA", value: $amount).keyboardType(.numberPad)
            Picker("Opérateur", selection: $provider) {
                Text("Orange Money").tag("orange")
                Text("MTN Money").tag("mtn")
                Text("Wave").tag("wave")
            }
            Button("Envoyer ma demande de versement") {
                guard let value = Int(amount), value > 0, value <= summary.releasable else { error = "Le montant doit être compris entre 1 et \(summary.releasable) F CFA."; return }
                busy = true; error = nil; info = nil
                Task { @MainActor in
                    defer { busy = false }
                    do {
                        try await ApiClient.shared.requestPayout(amount: value, provider: provider, idempotencyKey: requestKey)
                        requestKey = UUID().uuidString; amount = ""
                        state = try await ApiClient.shared.teacherEarnings()
                        info = "Votre demande est enregistrée. Le versement reste à traiter et à vérifier."
                    } catch { self.error = error.localizedDescription }
                }
            }.buttonStyle(.borderedProminent).disabled(busy || summary.releasable <= 0)
        }
    }
    private func payoutLabel(_ status: String) -> String {
        switch status {
        case "requested": return "Demande enregistrée"
        case "approved": return "Demande approuvée, versement à vérifier"
        case "verified": return "Versement vérifié"
        case "rejected": return "Demande refusée"
        case "reversed": return "Versement annulé par le prestataire"
        default: return status
        }
    }
    @MainActor private func reload() async {
        busy = true; defer { busy = false }
        do { state = try await ApiClient.shared.teacherEarnings(); error = nil } catch { self.error = error.localizedDescription }
    }
}

struct ProductionSupportScreen: View {
    @EnvironmentObject var router: Router
    @State private var settings: [String: String] = [:]
    @State private var error: String?
    var body: some View {
        AkScreen {
            TopBar(title: "Aide et support", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let error { Text(error).foregroundColor(Ak.danger) }
                    OperationCard(title: "Contacter le support") {
                        let phone = settings["contact_phone"] ?? ""
                        let email = settings["contact_email"] ?? ""
                        if phone.isEmpty && email.isEmpty { Text("Les coordonnées du support ne sont pas disponibles pour le moment. Réessayez plus tard.") }
                        if !phone.isEmpty, let url = URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })") { Link("Appeler : \(phone)", destination: url).buttonStyle(.bordered) }
                        if !email.isEmpty {
                            Text(email)
                            if let encoded = email.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed), let url = URL(string: "mailto:\(encoded)") { Link("Écrire au support", destination: url).buttonStyle(.bordered) }
                        }
                    }
                    OperationCard(title: "Cours et paiements") {
                        Text("Le détail de chaque cours permet de suivre son créneau, le paiement, sa réalisation et les éventuels signalements. Les conditions applicables sont précisées dans les documents légaux.")
                        Button("Ouvrir mes cours") { router.go(.myCourses) }.buttonStyle(.borderedProminent)
                        Button("Conditions et confidentialité") { router.go(.legal) }.buttonStyle(.bordered)
                    }
                }.padding(22)
            }
        }.task { do { settings = try await ApiClient.shared.settings() } catch { self.error = error.localizedDescription } }
    }
}

struct UnavailableFeatureScreen: View {
    @EnvironmentObject var router: Router
    let title: String
    var body: some View {
        AkScreen {
            TopBar(title: title, onBack: { router.back() })
            VStack(alignment: .leading, spacing: 16) {
                Text("Ce service n’est pas proposé dans la version actuelle. Retrouvez vos cours individuels et leur suivi dans votre espace.")
                Button("Mes cours") { router.go(.myCourses) }.buttonStyle(.borderedProminent)
                Button("Contacter le support") { router.go(.helpFaq) }.buttonStyle(.bordered)
                Spacer()
            }.padding(22)
        }
    }
}

struct ProductionSearchScreen: View {
    @EnvironmentObject var router: Router
    @State private var teachers: [TeacherDTO] = []
    @State private var query = ""
    @State private var level = ""
    @State private var format = ""
    @State private var busy = false
    @State private var error: String?
    private var visible: [TeacherDTO] {
        teachers.filter { teacher in
            (query.isEmpty || "\(teacher.name) \(teacher.subjects) \(teacher.location)".localizedCaseInsensitiveContains(query.trimmingCharacters(in: .whitespaces))) &&
            (level.isEmpty || (teacher.levels ?? []).contains { $0.localizedCaseInsensitiveContains(level.trimmingCharacters(in: .whitespaces)) }) &&
            (format.isEmpty || (teacher.formats ?? []).contains(format))
        }
    }
    var body: some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: "Trouver un professeur", onBack: { router.back() })
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    OperationField(label: "Nom, matière ou quartier", value: $query)
                    OperationField(label: "Niveau, facultatif", value: $level)
                    Picker("Format", selection: $format) {
                        Text("Tous").tag("")
                        Text("À domicile").tag("home")
                        if router.featureEnabled("onlineCourses") { Text("En ligne").tag("online") }
                    }.pickerStyle(.segmented)
                    if busy { ProgressView() }
                    if let error { Text(error).foregroundColor(Ak.danger) }
                    Button("Actualiser") { Task { await load() } }.buttonStyle(.bordered).disabled(busy)
                    if !busy && visible.isEmpty { Text("Aucun professeur ne correspond à ces critères.") }
                    ForEach(visible) { teacher in
                        OperationCard(title: teacher.name) {
                            Text(teacher.subjects)
                            Text(teacher.location)
                            Text("\(teacher.priceLabel) / heure")
                            Text(teacher.ratingLabel + (teacher.reviews_count > 0 ? " · \(teacher.reviews_count) avis" : ""))
                            if teacher.verified { Text("Profil vérifié").foregroundColor(Ak.green) }
                            Button("Consulter le profil") { router.selectedTeacherId = teacher.id; router.go(.teacherProfile) }.buttonStyle(.bordered)
                        }
                    }
                }.padding(22)
            }
            BottomNav(current: .recherche)
        }.task { await load() }
    }
    @MainActor private func load() async {
        busy = true; defer { busy = false }
        do { teachers = try await ApiClient.shared.teachers(); error = nil } catch { self.error = error.localizedDescription }
    }
}

struct ProductionProgressScreen: View {
    @EnvironmentObject var router: Router
    @State private var entries: [ProgressEntryDTO] = []
    @State private var error: String?
    @State private var busy = true
    var body: some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: "Suivi pédagogique", onBack: { router.back() })
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    if busy { ProgressView() }
                    if let error { Text(error).foregroundColor(Ak.danger) }
                    if !busy && entries.isEmpty { Text("Les bilans saisis par les professeurs après vos cours apparaîtront ici.") }
                    ForEach(entries) { entry in
                        OperationCard(title: entry.subject) {
                            Text("Professeur : \(entry.teacherName)")
                            if let student = entry.studentName { Text("Élève : \(student)") }
                            if let date = entry.completedAt { Text(date) }
                            Text(entry.summary)
                            Button("Voir le cours") { router.selectedCourseId = entry.courseId; router.go(.manageCourse) }.buttonStyle(.bordered)
                        }
                    }
                }.padding(22)
            }
            BottomNav(current: .progres)
        }.task {
            defer { busy = false }
            do { entries = try await ApiClient.shared.progress().entries ?? [] } catch { self.error = error.localizedDescription }
        }
    }
}

struct ProductionTeacherDashboardScreen: View {
    @EnvironmentObject var router: Router
    @State private var dashboard: TeacherDashboardDTO?
    @State private var earnings: EarningsSummaryDTO?
    @State private var courses: [CourseDTO] = []
    @State private var error: String?
    @State private var busy = true
    var body: some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: "Espace professeur", onBack: { router.back() })
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    if busy { ProgressView() }
                    if let error { Text(error).foregroundColor(Ak.danger) }
                    if let dashboard {
                        OperationCard(title: "Bonjour, \(dashboard.name)") {
                            if let completion = dashboard.profileCompletion, !completion.complete {
                                Text("Profil à compléter : \(completion.percent) %")
                                Button("Compléter mon profil") { router.go(.completeTeacherProfile) }.buttonStyle(.bordered)
                            }
                            if dashboard.needsConfirmed == false { Text("Votre accès aux offres attend la validation de l’administration.") }
                            Text("Demandes et offres disponibles : \(dashboard.pendingRequests)")
                            Button("Voir les demandes et offres") { router.go(.courseRequests) }.buttonStyle(.bordered)
                        }
                    }
                    if let earnings {
                        OperationCard(title: "Mes revenus") {
                            Text("Montant net dû : \(earnings.due.formattedFCFA) F CFA")
                            Text("Disponible pour versement : \(earnings.releasable.formattedFCFA) F CFA")
                            Button("Revenus et versements") { router.go(.earnings) }.buttonStyle(.borderedProminent)
                        }
                    }
                    Text("Prochains cours").font(AkFont.schibstedBold(17))
                    if !busy && courses.isEmpty { Text("Aucun cours à venir.") }
                    ForEach(Array(courses.sorted { ($0.starts_at ?? "9999") < ($1.starts_at ?? "9999") }.prefix(5))) { course in
                        OperationCard(title: "\(course.subject) · \(course.level)") {
                            if course.isTeacherParticipant(accountRole: router.authRole) {
                                if let parent = course.parent_name { Text("Parent : \(parent)") }
                            } else { Text("Mon professeur : \(course.teacher_name)") }
                            Text(CourseOperations.statusLabel(course.lifecycle_status))
                            Text("\(course.day_label) \(course.day_num) · \(course.time)")
                            Button("Détails et suivi") { router.selectedCourseId = course.id; router.go(.manageCourse) }.buttonStyle(.bordered)
                        }
                    }
                    Button("Actualiser") { Task { await load() } }.buttonStyle(.bordered).disabled(busy)
                }.padding(22)
            }
            TeacherBottomNav(current: .tableau)
        }.task { await load() }
    }
    @MainActor private func load() async {
        busy = true; defer { busy = false }
        do {
            dashboard = try await ApiClient.shared.teacherDashboard()
            earnings = try await ApiClient.shared.teacherEarnings().summary
            courses = try await ApiClient.shared.courses(status: "upcoming")
            error = nil
        } catch { self.error = error.localizedDescription }
    }
}

struct ProductionRequestsScreen: View {
    @EnvironmentObject var router: Router
    @State private var requests: [TeacherRequestDTO] = []
    @State private var busy = true
    @State private var error: String?
    @State private var info: String?
    @State private var query = ""
    private var visible: [TeacherRequestDTO] {
        requests.filter { query.isEmpty || "\($0.name) \($0.subject ?? "") \($0.slot ?? "")".localizedCaseInsensitiveContains(query) }
    }
    var body: some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: "Demandes et offres", onBack: { router.back() })
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    if busy { ProgressView() }
                    if let error { Text(error).foregroundColor(Ak.danger) }
                    if let info { Text(info).foregroundColor(Ak.green) }
                    OperationField(label: "Rechercher une matière ou un quartier", value: $query)
                    if !busy && visible.isEmpty { Text("Aucune demande correspondant à ces critères.") }
                    ForEach(Array(visible.enumerated()), id: \.offset) { _, request in offer(request) }
                    Button("Actualiser") { Task { await load() } }.buttonStyle(.bordered).disabled(busy)
                    Button("Ouvrir mon agenda") { router.go(.agenda) }.buttonStyle(.bordered)
                }.padding(22)
            }
            TeacherBottomNav(current: .demandes)
        }.task { await load() }
    }
    private func offer(_ request: TeacherRequestDTO) -> some View {
        OperationCard(title: request.isOpportunity == true ? "Offre de cours" : "Réservation directe") {
            Text(request.name)
            if let student = request.student { Text(student) }
            if let subject = request.subject { Text(subject) }
            if let slot = request.slot { Text(slot) }
            if let format = request.format { Text(format) }
            if let duration = request.duration { Text("Durée : \(duration)") }
            if let frequency = request.frequency { Text("Fréquence : \(frequency)") }
            Text("\(request.isOpportunity == true ? "Rémunération proposée" : "Prix du cours") : \(request.price.formattedFCFA) F CFA")
            if let net = request.netHourly { Text("Net par heure : \(net.formattedFCFA) F CFA") }
            if request.hasCat == true { Text("Chat au domicile") }
            if request.hasDog == true { Text("Chien au domicile") }
            Button(request.isOpportunity == true ? "Accepter l’offre" : "Accepter la réservation") { respond(request, accept: true) }.buttonStyle(.borderedProminent).disabled(busy)
            if request.isOpportunity != true { Button("Refuser la réservation") { respond(request, accept: false) }.buttonStyle(.bordered).disabled(busy) }
        }
    }
    @MainActor private func respond(_ request: TeacherRequestDTO, accept: Bool) {
        guard !busy else { return }
        busy = true; error = nil; info = nil
        Task { @MainActor in
            defer { busy = false }
            do {
                if request.isOpportunity == true, let id = request.needId {
                    try await ApiClient.shared.acceptOpportunity(needId: id)
                } else if let id = request.courseId {
                    if accept { try await ApiClient.shared.acceptRequest(courseId: id) }
                    else { try await ApiClient.shared.refuseRequest(courseId: id) }
                } else { throw ApiError.invalidResponse }
                requests = try await ApiClient.shared.teacherRequests()
                info = accept ? "Demande acceptée. Retrouvez le cours dans votre agenda pour vérifier le rendez-vous." : "Demande refusée."
            } catch { self.error = error.localizedDescription }
        }
    }
    @MainActor private func load() async {
        busy = true; defer { busy = false }
        do { requests = try await ApiClient.shared.teacherRequests(); error = nil } catch { self.error = error.localizedDescription }
    }
}
