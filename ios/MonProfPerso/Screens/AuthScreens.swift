import SwiftUI

// MARK: - Bienvenue et choix du rôle
struct WelcomeScreen: View {
    @EnvironmentObject var router: Router

    var body: some View {
        AkScreen(background: Ak.green) {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    HStack(spacing: 10) {
                        Image(systemName: "graduationcap.fill").font(.system(size: 22)).foregroundColor(Ak.green)
                            .frame(width: 44, height: 44).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 14))
                            .accessibilityHidden(true)
                        Text("Mon Prof Perso").font(AkFont.schibstedExtra(22)).foregroundColor(.white)
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Un prof à vos côtés.\nÀ chaque étape.")
                            .font(AkFont.schibstedExtra(31)).foregroundColor(.white)
                            .fixedSize(horizontal: false, vertical: true)
                        Text("Des cours individuels et un suivi attentif, au rythme de votre enfant en Côte d’Ivoire.")
                            .font(AkFont.regular(15)).foregroundColor(Ak.onGreenSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    LearningArtwork().frame(maxWidth: 290).frame(maxWidth: .infinity)
                    VStack(alignment: .leading, spacing: 10) {
                        Text("VOTRE ESPACE").font(AkFont.semibold(12)).foregroundColor(Ak.onGreenSoft)
                        roleRow(icon: "person.2.fill", title: "Un parent", sub: "Accompagner mon enfant", index: 0)
                        roleRow(icon: "graduationcap.fill", title: "Un élève", sub: "Apprendre avec confiance", index: 1)
                        roleRow(icon: "person.crop.rectangle", title: "Un professeur", sub: "Partager mes connaissances", index: 2)
                    }
                }.padding(.horizontal, 24).padding(.top, 20).padding(.bottom, 24)
            }.clipped().accessibilityIdentifier("welcome.scroll")
            VStack(spacing: 2) {
                PrimaryButton(label: "Continuer", color: Ak.orangeAction) { router.go(.signup) }
                    .accessibilityIdentifier("welcome.continue")
                Button("Déjà un compte ? Se connecter") { router.go(.login) }
                    .font(AkFont.bold(14)).foregroundColor(.white).frame(minHeight: 48)
                    .accessibilityIdentifier("welcome.login")
            }.padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 8)
                .background(Ak.green)
        }
    }

    private func roleRow(icon: String, title: String, sub: String, index: Int) -> some View {
        let selected = router.role == index
        return Button { router.role = index } label: {
            HStack(alignment: .center, spacing: 13) {
                Image(systemName: icon).font(.system(size: 21)).foregroundColor(selected ? Ak.green : .white)
                    .frame(width: 42, height: 42).background(selected ? Ak.greenSoft : .white.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 13)).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(AkFont.bold(16)).foregroundColor(selected ? Ak.ink : .white)
                    Text(sub).font(AkFont.regular(13)).foregroundColor(selected ? Ak.muted : Ak.greenSoft)
                }.fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22)).foregroundColor(selected ? Ak.green : Ak.onGreenSoft).accessibilityHidden(true)
            }.multilineTextAlignment(.leading).padding(15)
                .frame(maxWidth: .infinity, minHeight: 72, alignment: .leading)
                .background(selected ? Color.white : Color.white.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(selected ? Ak.orangeLight : .white.opacity(0.2), lineWidth: selected ? 2 : 1))
        }.buttonStyle(.plain).accessibilityIdentifier("welcome.role.\(index)")
            .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

// MARK: - Écran 2, Inscription
struct SignupScreen: View {
    @EnvironmentObject var router: Router
    @State private var consent = false
    @State private var consentVersion: String?
    @State private var parentalConsent = false
    @State private var sending = false
    @State private var error: String?
    private var isStudent: Bool { router.role == 1 }
    private var canSubmit: Bool {
        consentVersion != nil && consent && (!isStudent || parentalConsent)
            && !router.authFullName.trimmingCharacters(in: .whitespaces).isEmpty
            && router.authPhone.filter(\.isNumber).count >= 10 && !sending
    }

    var body: some View {
        AkScreen {
            TopBar(title: "", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Créer mon compte").font(AkFont.schibstedExtra(25)).foregroundColor(Ak.ink)
                    Text(router.role == 2 ? "Créez votre compte, puis déposez votre candidature professeur."
                         : "Trouvez le bon prof pour réussir vos objectifs.")
                        .font(AkFont.regular(13.5)).foregroundColor(Ak.muted)
                    authTextField("Nom & prénoms", text: $router.authFullName)
                        .textContentType(.name)
                    PhoneField(value: $router.authPhone)
                    authTextField("Adresse e-mail (facultatif)", text: $router.authEmail)
                        .keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                    Text("Un code WhatsApp vérifiera votre numéro de téléphone.")
                        .font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                    HStack {
                        Text("Compte \(roleLabels[router.role].lowercased())").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                        Spacer()
                        Button("Modifier") { router.popToRoot() }.font(AkFont.bold(12)).foregroundColor(Ak.green)
                    }.padding(14).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 12))
                    consentCheckboxLinked
                    if consentVersion == nil { Button("Recharger les conditions") { Task { await loadConsentVersion() } }.disabled(sending) }
                    if isStudent {
                        Toggle("Je confirme avoir le consentement d'un parent ou tuteur légal.", isOn: $parentalConsent)
                            .font(AkFont.regular(12.5)).tint(Ak.green)
                    }
                    if let error { authError(error) }
                }.padding(.horizontal, 24).padding(.top, 8)
            }
            VStack(spacing: 13) {
                PrimaryButton(label: sending ? "Envoi…" : "Créer mon compte", color: canSubmit ? Ak.green : Ak.border) {
                    guard canSubmit, let version = consentVersion else { return }
                    sending = true; error = nil
                    Task { @MainActor in
                        defer { sending = false }
                        do {
                            let result = try await ApiClient.shared.signup(
                                fullName: router.authFullName.trimmingCharacters(in: .whitespaces),
                                phone: ApiClient.normalizePhone(router.authPhone), roleIndex: router.role,
                                consent: consent, parentalConsent: parentalConsent, consentVersion: version,
                                email: router.authEmail.isEmpty ? nil : router.authEmail)
                            router.applyAuth(result)
                        } catch {
                            self.error = error.localizedDescription
                            if (error as? ApiError)?.consentCode == "consent_version_changed" {
                                consent = false; parentalConsent = false; consentVersion = nil
                                await loadConsentVersion()
                            }
                        }
                    }
                }.disabled(!canSubmit)
                Button("Déjà un compte ? Se connecter") { router.go(.login) }
                    .font(AkFont.bold(13)).foregroundColor(Ak.green)
            }.padding(.horizontal, 24).padding(.vertical, 12)
        }
        .task { await loadConsentVersion() }
        .environment(\.openURL, OpenURLAction { url in
            if url.path.contains("/api/legal/") {
                let title = url.path.contains("/cgu/") ? "Conditions d'utilisation" : "Politique de confidentialité"
                router.go(.pdfViewer(url: url.absoluteString, title: title))
                return .handled
            }
            return .systemAction
        })
    }

    private var consentCheckboxLinked: some View {
        let cgu = ApiConfig.baseURL.appendingPathComponent("api/legal/cgu/file").absoluteString
        let privacy = ApiConfig.baseURL.appendingPathComponent("api/legal/confidentialite/file").absoluteString
        let text = (try? AttributedString(markdown: "J'accepte les [Conditions d'utilisation](\(cgu)) et la [politique de confidentialité](\(privacy)).")) ?? AttributedString("J'accepte les CGU et la politique de confidentialité.")
        return HStack(alignment: .top, spacing: 9) {
            Button { consent.toggle() } label: {
                Image(systemName: consent ? "checkmark.square.fill" : "square")
                    .font(.system(size: 23)).foregroundColor(Ak.green).frame(width: 44, height: 44)
            }.accessibilityValue(consent ? "Accepté" : "Non accepté").disabled(consentVersion == nil || sending).accessibilityLabel("Accepter les CGU et la politique de confidentialité")
            Text(text).font(AkFont.regular(12.5)).foregroundColor(Ak.muted).tint(Ak.green)
        }
    }

    @MainActor private func loadConsentVersion() async {
        do {
            let version = try await ApiClient.shared.currentConsentVersion()
            if version != consentVersion { consent = false; parentalConsent = false }
            consentVersion = version
        } catch {
            consent = false; consentVersion = nil
            self.error = "Impossible de charger les conditions actuelles. Réessayez avant de créer le compte."
        }
    }
}

// MARK: - Écran 3, Connexion
struct LoginScreen: View {
    @EnvironmentObject var router: Router
    @State private var channel = "whatsapp"
    @State private var sending = false
    @State private var error: String?

    var body: some View {
        AkScreen {
            TopBar(title: "", onBack: { router.back() })
            ScrollView {
                VStack(spacing: 16) {
                    Image(systemName: "graduationcap.fill").font(.system(size: 29)).foregroundColor(.white)
                        .frame(width: 56, height: 56).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 16))
                    Text("Content de vous revoir").font(AkFont.schibstedExtra(26)).foregroundColor(Ak.ink).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                    Text("Recevez un code de connexion sur votre téléphone.")
                        .font(AkFont.regular(13.5)).foregroundColor(Ak.muted)
                    PhoneField(value: $router.authPhone)
                    if router.otpEmailEnabled {
                        Picker("Recevoir le code par", selection: $channel) {
                            Text("WhatsApp").tag("whatsapp")
                            Text("E-mail vérifié").tag("email")
                        }.pickerStyle(.segmented)
                    }
                    if channel == "email" {
                        authTextField("E-mail vérifié de votre compte", text: $router.authEmail)
                            .keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                    }
                    if let error { authError(error) }
                    PrimaryButton(label: sending ? "Envoi…" : "Recevoir mon code", color: Ak.green, trailingSystemIcon: nil) {
                        login(phone: ApiClient.normalizePhone(router.authPhone))
                    }.disabled(sending || router.authPhone.filter(\.isNumber).count < 10).accessibilityIdentifier("auth.submit")
                    #if DEBUG
                    if router.otpDemo {
                        Button("Compte administrateur de démonstration") { login(phone: ApiConfig.adminPhone) }
                            .font(AkFont.regular(12)).foregroundColor(Ak.faint).disabled(sending)
                    }
                    #endif
                }.padding(.horizontal, 26).padding(.top, 30)
            }.clipped()
            Button("Nouveau sur Mon Prof Perso ? Créer un compte") { router.go(.signup) }
                .font(AkFont.bold(14)).foregroundColor(Ak.green).multilineTextAlignment(.center).frame(minHeight: 48).padding(.horizontal, 24).padding(.bottom, 8)
        }
        .task {
            await ApiClient.shared.refreshOtpChannels(router: router)
            channel = router.authOtpChannel
        }
    }

    private func login(phone: String) {
        guard !sending else { return }
        sending = true; error = nil
        Task { @MainActor in
            defer { sending = false }
            do {
                let result = try await ApiClient.shared.login(phone: phone, channel: channel,
                    email: channel == "email" ? router.authEmail : nil)
                router.applyAuth(result)
            } catch { self.error = error.localizedDescription }
        }
    }
}

// MARK: - Écran 4, Vérification du challenge reçu
struct OtpScreen: View {
    @EnvironmentObject var router: Router
    @State private var code = ""
    @State private var error: String?
    @State private var resendSec = 60
    @State private var sending = false
    @FocusState private var focused: Bool
    private var codeLen: Int { 6 }

    var body: some View {
        AkScreen {
            TopBar(title: "", onBack: { router.back() })
            ScrollViewReader { scroll in
              ScrollView {
              VStack(alignment: .leading, spacing: 18) {
                Image(systemName: "ellipsis.bubble.fill").font(.system(size: 30)).foregroundColor(Ak.green)
                    .frame(width: 64, height: 64).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 18))
                Text("Entrez le code").font(AkFont.schibstedExtra(25)).foregroundColor(Ak.ink)
                Text("Code envoyé par \(router.authOtpChannel == "email" ? "e-mail" : "WhatsApp") à \(router.authDestination). Valable \(router.otpTtlMinutes) minutes.")
                    .font(AkFont.regular(13.5)).foregroundColor(Ak.muted)
                TextField("Code à 6 chiffres", text: $code, prompt: Text("6 chiffres").foregroundColor(Ak.muted))
                    .keyboardType(.numberPad).textContentType(.oneTimeCode).focused($focused)
                    .accessibilityIdentifier("otp.code")
                    .toolbar { ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Terminé") { focused = false } } }
                    .font(.system(size: 28, weight: .semibold, design: .monospaced))
                    .padding(18).background(.white).clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
                    .onChange(of: code) { value in
                        code = String(value.filter { $0 >= "0" && $0 <= "9" }.prefix(codeLen))
                        error = nil
                    }
                    .id("otp.input")
                if let error { authError(error) }
                Button(resendSec > 0 ? "Renvoyer dans \(resendSec) s" : "Renvoyer le code") { resend() }
                    .font(AkFont.bold(13)).foregroundColor(Ak.green).disabled(resendSec > 0 || sending)
              }.padding(.horizontal, 24).padding(.vertical, 16)
              }.scrollDismissesKeyboard(.interactively).clipped().accessibilityIdentifier("otp.scroll")
                .onChange(of: focused) { isFocused in
                    if isFocused { scroll.scrollTo("otp.input", anchor: .bottom) }
                }
                .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardDidShowNotification)) { _ in
                    if focused { scroll.scrollTo("otp.input", anchor: .bottom) }
                }
            }
            PrimaryButton(label: sending ? "Vérification…" : "Vérifier", color: Ak.green) { verify() }
                .disabled(sending || code.count != codeLen).accessibilityIdentifier("otp.verify")
                .padding(.horizontal, 28).padding(.bottom, 18)
        }
        .onAppear {
            // Le code a déjà été envoyé par login/signup ; aucun second envoi à l'ouverture.
            focused = true
            updateCountdown()
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in updateCountdown() }
    }

    private func updateCountdown() { resendSec = max(0, Int(ceil(router.otpResendAt.timeIntervalSinceNow))) }

    private func verify() {
        guard !sending, code.count == codeLen, let id = router.authChallengeId else {
            error = "Recommencez la connexion pour recevoir un code."; return
        }
        sending = true; error = nil
        Task { @MainActor in
            defer { sending = false }
            do {
                let user = try await ApiClient.shared.verifyOtp(challengeId: id, code: code)
                router.applyAuth(.authenticated(user))
            } catch { self.error = error.localizedDescription }
        }
    }

    private func resend() {
        guard !sending, let id = router.authChallengeId else { return }
        sending = true; error = nil
        Task { @MainActor in
            defer { sending = false }
            do {
                let challenge = try await ApiClient.shared.requestOtp(challengeId: id)
                router.applyChallenge(challenge)
                code = ""
                updateCountdown()
            } catch { self.error = error.localizedDescription }
        }
    }
}

private func authTextField(_ label: String, text: Binding<String>) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(label).font(AkFont.semibold(12)).foregroundColor(Ak.muted)
        TextField(label, text: text, prompt: Text(label).foregroundColor(Ak.muted)).font(AkFont.regular(14.5)).foregroundColor(Ak.ink)
            .padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }
}

private func authError(_ text: String) -> some View {
    Text(text).font(AkFont.regular(13)).foregroundColor(Ak.danger)
        .frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.updatesFrequently)
}
