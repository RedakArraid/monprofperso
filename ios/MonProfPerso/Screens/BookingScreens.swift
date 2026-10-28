import SwiftUI

// MARK: - Réservation : demande au professeur, puis paiement après son accord
struct BookingScreen: View {
    @EnvironmentObject var router: Router
    @State private var format = "home"
    @State private var startAt = Date().addingTimeInterval(86_400)
    @State private var duration = 1
    @State private var sending = false
    @State private var error: String?
    @State private var consentRequired = false
    private let durations = ["1h", "1h30", "2h"]
    private let durationFactors = [1.0, 1.5, 2.0]
    private let abidjan = TimeZone(identifier: "Africa/Abidjan")!

    var body: some View {
        let estimate = Int(Double(router.bkPricePerHour) * durationFactors[duration])
        return AkScreen {
            TopBar(title: "Réserver un cours", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack(spacing: 11) {
                        InitialsAvatar(initials: router.bkTeacherInitials, size: 42, radius: 12, fontSize: 15)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(router.bkTeacherName).font(AkFont.bold(14)).foregroundColor(Ak.ink)
                            Text(router.bkSubjectsLine).font(AkFont.regular(12)).foregroundColor(Ak.muted)
                        }
                        Spacer()
                    }.akCard(radius: 15, padding: 14)
                    Text("Format du cours").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink)
                    Picker("Format", selection: $format) {
                        if router.bkFormats.contains("home") { Text("À domicile").tag("home") }
                        if router.bkFormats.contains("online") { Text("En ligne").tag("online") }
                    }.pickerStyle(.segmented)
                    if router.bkFormats.isEmpty { Text("Aucun format de cours disponible pour ce professeur dans la version actuelle.").foregroundColor(Ak.orange) }
                    if format == "home" {
                        TextField("Adresse précise du cours", text: $router.bkLocation, prompt: Text("Adresse précise du cours").foregroundColor(Ak.muted), axis: .vertical).textFieldStyle(.roundedBorder)
                    }
                    TextField("Niveau de l’élève", text: $router.bkLevel, prompt: Text("Niveau de l’élève").foregroundColor(Ak.muted)).textFieldStyle(.roundedBorder)
                    Text("\(router.bkSubject) · \(router.bkLevel)").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                    Text("Choisir une date et une heure").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink)
                    DatePicker("Créneau souhaité", selection: $startAt, in: Date()...,
                               displayedComponents: [.date, .hourAndMinute])
                        .datePickerStyle(.compact).environment(\.timeZone, abidjan)
                        .environment(\.locale, Locale(identifier: "fr_CI"))
                    Text("Heure de Côte d'Ivoire. Le professeur confirmera sa disponibilité.")
                        .font(AkFont.regular(12)).foregroundColor(Ak.muted)
                    Text("Durée").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink)
                    Picker("Durée", selection: $duration) {
                        ForEach(durations.indices, id: \.self) { Text(durations[$0]).tag($0) }
                    }.pickerStyle(.segmented)
                    Text("Vous pourrez payer depuis Mes cours dès que le professeur aura accepté la demande.")
                        .font(AkFont.regular(13)).foregroundColor(Ak.muted)
                    if let error { Text(error).font(AkFont.regular(13)).foregroundColor(Ak.danger) }
                    if consentRequired { Button("Lire et accepter les conditions dans mes paramètres") { router.go(.settings) } }
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            VStack(spacing: 12) {
                HStack {
                    Text("Estimation pour \(durations[duration])").font(AkFont.regular(13)).foregroundColor(Ak.muted)
                    Spacer()
                    Text("\(estimate.formattedFCFA) F").font(AkFont.schibstedExtra(18)).foregroundColor(Ak.ink)
                }
                PrimaryButton(label: sending ? "Envoi…" : "Envoyer ma demande", color: Ak.green) { submit() }
                    .disabled(sending || startAt <= Date() || router.bkTeacherId < 1 || router.bkFormats.isEmpty || (format == "home" && router.bkLocation.trimmingCharacters(in: .whitespacesAndNewlines).count < 5))
            }.padding(22).background(.white)
        }
        .onAppear { format = router.bkFormats.contains("home") ? "home" : "online" }
    }

    private func submit() {
        guard !sending, startAt > Date(), router.bkTeacherId > 0 else { return }
        sending = true; error = nil
        let ownerToken = TokenStore.token
        Task { @MainActor in
            defer { sending = false }
            var body: [String: Any] = [
                "teacherId": router.bkTeacherId, "subject": router.bkSubject, "level": router.bkLevel,
                "duration": durations[duration], "format": format,
                "startAt": ISO8601DateFormatter().string(from: startAt),
            ]
            if format == "home" { body["location"] = router.bkLocation }
            do {
                let booking = try await ApiClient.shared.createBooking(body)
                guard ownerToken != nil, ownerToken == TokenStore.token else { return }
                router.loadCourse(booking.course, reference: booking.reference)
                router.go(.confirmed)
            } catch { consentRequired = (error as? ApiError)?.consentCode == "consent_required"; self.error = error.localizedDescription }
        }
    }
}

// MARK: - Paiement d'un cours existant et accepté
struct PaymentScreen: View {
    @EnvironmentObject var router: Router
    @State private var method = 0
    @State private var phone = ""
    @State private var sending = false
    @State private var loading = true
    @State private var eligible = false
    @State private var showOtp = false
    @State private var needsOtp = false
    @State private var pendingPaymentId: Int?
    @State private var otpCode = ""
    @State private var payError: String?
    @State private var consentRequired = false
    @State private var ownerToken: String?
    @State private var selectedCourseId: Int?
    @State private var active = false

    private var provider: String { method == 1 ? "wave" : method == 2 ? "mtn" : "orange" }
    private var isCurrentSession: Bool {
        active && ownerToken != nil && ownerToken == TokenStore.token && selectedCourseId == router.bkCourseId
    }
    private var canSubmit: Bool { isCurrentSession && !sending && !loading && eligible && phone.filter(\.isNumber).count >= 10 }

    var body: some View {
        AkScreen {
            TopBar(title: "Paiement", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 9) {
                        Text("RÉCAPITULATIF").font(AkFont.bold(12)).foregroundColor(Ak.faint)
                        Text("\(router.bkSubject) · \(router.bkLevel)").font(AkFont.bold(16)).foregroundColor(Ak.ink)
                        Text("avec \(router.bkTeacherName)").font(AkFont.regular(13)).foregroundColor(Ak.muted)
                        recapRow("Date", "\(router.bkDayFull) · \(router.bkTime)")
                        recapRow("Durée", router.bkDuration)
                        recapRow("Lieu", router.bkFormat == "online" ? "En ligne" : router.bkLocation)
                        recapRow("Montant confirmé", "\(router.bkPrice.formattedFCFA) F")
                    }.akCard(radius: 18, padding: 16)
                    if loading { LoadingRow() }
                    Text("Moyen de paiement").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink)
                    Picker("Moyen de paiement", selection: $method) {
                        Text("Orange Money").tag(0)
                        Text("Wave").tag(1)
                        Text("MTN MoMo").tag(2)
                    }.pickerStyle(.segmented).disabled(pendingPaymentId != nil)
                    PhoneField(value: $phone).disabled(pendingPaymentId != nil)
                    Text("Validez la demande sur votre téléphone. Le statut sera confirmé par le service de paiement.")
                        .font(AkFont.regular(12)).foregroundColor(Ak.muted)
                    if let payError { Text(payError).font(AkFont.regular(13)).foregroundColor(Ak.danger) }
                    if consentRequired { Button("Lire et accepter les conditions dans mes paramètres") { router.go(.settings) } }
                    if needsOtp {
                        Button("Saisir le code de paiement") { showOtp = true }
                            .font(AkFont.bold(14)).foregroundColor(Ak.green).disabled(sending)
                    }
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            PrimaryButton(label: sending ? "Vérification…" : pendingPaymentId != nil ? "Vérifier le paiement" : "Payer \(router.bkPrice.formattedFCFA) FCFA",
                          color: Ak.green, trailingSystemIcon: "lock.fill") { pay() }
                .disabled(!canSubmit).padding(22).background(.white)
        }
        .task {
            loading = true
            active = true
            ownerToken = TokenStore.token
            selectedCourseId = router.bkCourseId
            phone = router.authPhone
            do { try await refreshCourse() }
            catch { consentRequired = (error as? ApiError)?.consentCode == "consent_required"; payError = error.localizedDescription }
            loading = false
        }
        .onDisappear { active = false }
        .alert("Code de paiement", isPresented: $showOtp) {
            TextField("Code reçu", text: $otpCode).keyboardType(.numberPad)
            Button("Valider") { submitOtp() }
            Button("Annuler", role: .cancel) { }
        } message: { Text("Saisissez le code reçu sur le téléphone utilisé pour ce paiement.") }
    }

    @MainActor private func refreshCourse() async throws {
        guard isCurrentSession, let id = selectedCourseId else { throw CancellationError() }
        let courses = try await ApiClient.shared.courses()
        guard isCurrentSession else { throw CancellationError() }
        guard let course = courses.first(where: { $0.id == id }) else {
            eligible = false
            throw ApiError.badStatus(404, "Cours introuvable. Retrouvez-le dans Mes cours.")
        }
        router.loadCourse(course)
        eligible = course.canPay && !course.isTeacherParticipant(accountRole: router.authRole)
        if course.payment_status == "paid" {
            router.go(.confirmed)
        } else if !eligible {
            throw ApiError.badStatus(409, "Le professeur doit accepter le cours avant le paiement.")
        }
    }

    private func pay() {
        guard canSubmit else { return }
        sending = true; payError = nil
        Task { @MainActor in
            defer { sending = false }
            do {
                if let id = pendingPaymentId { await checkPayment(id); return }
                try await refreshCourse()
                guard eligible, let id = router.bkCourseId else { return }
                let charge = try await ApiClient.shared.chargeMobile(courseId: id, provider: provider,
                                                                    phone: ApiClient.normalizePhone(phone))
                await handleCharge(charge)
            } catch { consentRequired = (error as? ApiError)?.consentCode == "consent_required"; payError = error.localizedDescription }
        }
    }

    @MainActor private func handleCharge(_ charge: ChargeMobileResponse) async {
        guard isCurrentSession else { return }
        pendingPaymentId = charge.paymentId
        if charge.status == "otp_required" {
            needsOtp = true; otpCode = ""; showOtp = true
        } else {
            needsOtp = false
            await checkPayment(charge.paymentId)
        }
    }

    @MainActor private func checkPayment(_ id: Int) async {
        guard isCurrentSession else { return }
        let paid = await ApiClient.shared.pollUntilPaid(paymentId: id)
        guard isCurrentSession else { return }
        if paid {
            router.bkPaid = true
            eligible = false
            router.go(.confirmed)
            return
        }
        if let status = try? await ApiClient.shared.paymentStatus(id), status.status == "failed" {
            pendingPaymentId = nil; needsOtp = false
            payError = "Le paiement a été refusé. Vous pouvez réessayer."
        } else {
            payError = "Le paiement n'est pas encore confirmé. Vérifiez son statut avant toute nouvelle tentative."
        }
    }

    private func submitOtp() {
        guard !sending, let id = pendingPaymentId, !otpCode.isEmpty else { return }
        sending = true; payError = nil
        Task { @MainActor in
            defer { sending = false }
            do {
                let response = try await ApiClient.shared.submitPaymentOtp(paymentId: id, otp: otpCode)
                await handleCharge(response)
            } catch { consentRequired = (error as? ApiError)?.consentCode == "consent_required"; payError = error.localizedDescription }
        }
    }

    private func recapRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(AkFont.regular(13)).foregroundColor(Ak.muted)
            Spacer()
            Text(value).font(AkFont.semibold(13)).foregroundColor(Ak.ink)
        }
    }
}

// MARK: - Confirmation distincte de la demande et du paiement
struct ConfirmedScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen {
            HStack { Spacer(); IconSquare(system: "xmark") { router.popToRoot() } }.padding(22)
            ScrollView {
                VStack(spacing: 18) {
                    Image(systemName: "checkmark.circle.fill").font(.system(size: 72)).foregroundColor(Ak.green)
                    Text(router.bkPaid ? "Paiement confirmé" : "Demande envoyée")
                        .font(AkFont.schibstedExtra(26)).foregroundColor(Ak.ink)
                    Text(router.bkPaid ? "Le paiement de votre cours a été confirmé."
                         : "\(router.bkTeacherName) doit confirmer votre créneau. Vous pourrez ensuite payer depuis Mes cours.")
                        .font(AkFont.regular(14)).foregroundColor(Ak.muted).multilineTextAlignment(.center)
                    VStack(alignment: .leading, spacing: 12) {
                        Text("RÉF. #\(router.bkReference)").font(AkFont.bold(11.5)).foregroundColor(Ak.faint)
                        Text("\(router.bkSubject) · \(router.bkLevel)").font(AkFont.bold(15)).foregroundColor(Ak.ink)
                        Text("\(router.bkDayFull) · \(router.bkTime) · \(router.bkDuration)")
                            .font(AkFont.regular(13)).foregroundColor(Ak.muted)
                        Text("\(router.bkPrice.formattedFCFA) F").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.green)
                    }.frame(maxWidth: .infinity, alignment: .leading).akCard(radius: 18, padding: 18)
                }.padding(26)
            }
            PrimaryButton(label: "Voir mes cours", trailingSystemIcon: nil) {
                router.popToRoot(); router.go(.myCourses)
            }.padding(26)
        }
    }
}
