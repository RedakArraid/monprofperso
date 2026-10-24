import SwiftUI

// MARK: - Écran 1, Bienvenue & choix du rôle
struct WelcomeScreen: View {
    @EnvironmentObject var router: Router

    var body: some View {
        AkScreen(background: Ak.green) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 10) {
                    Image(systemName: "graduationcap.fill").font(.system(size: 20)).foregroundColor(.white)
                        .frame(width: 36, height: 36).background(Ak.greenDark)
                        .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                    HStack(spacing: 0) {
                        Text("Mon Prof Perso").font(AkFont.schibstedExtra(21)).foregroundColor(.white)
                        Text(".").font(AkFont.schibstedExtra(21)).foregroundColor(Ak.orangeLight)
                    }
                }
                .padding(.top, 14)

                Text("Le bon prof,\nchez vous ou\nen ligne.")
                    .font(AkFont.schibstedExtra(39)).foregroundColor(.white)
                    .lineSpacing(2).padding(.top, 48)
                Text("Soutien scolaire du CP à la Terminale, avec des professeurs vérifiés partout en Côte d'Ivoire.")
                    .font(AkFont.regular(15.5)).foregroundColor(Ak.onGreenSoft)
                    .lineSpacing(4).frame(maxWidth: 300, alignment: .leading).padding(.top, 18)

                HStack(spacing: 14) {
                    stat("2 500+", "professeurs")
                    Rectangle().fill(Ak.greenLine).frame(width: 1, height: 34)
                    stat("4,9★", "note moyenne")
                    Rectangle().fill(Ak.greenLine).frame(width: 1, height: 34)
                    stat("18", "villes")
                }.padding(.top, 28)

                Spacer()

                Text("JE SUIS…").font(AkFont.semibold(12.5)).foregroundColor(Ak.onGreenFaint).padding(.bottom, 10)
                roleRow(icon: "person.3.fill", title: "Un parent", sub: "Je cherche un prof pour mon enfant", index: 0)
                roleRow(icon: "graduationcap.fill", title: "Un élève", sub: "Je révise pour réussir mes examens", index: 1).padding(.top, 9)
                roleRow(icon: "rectangle.inset.filled.and.person.filled", title: "Un professeur", sub: "Je veux donner des cours", index: 2).padding(.top, 9)

                PrimaryButton(label: "Continuer") { router.go(.signup) }.padding(.top, 14)
                HStack(spacing: 4) {
                    Text("Déjà un compte ?").font(AkFont.regular(13.5)).foregroundColor(Ak.onGreenFaint)
                    Text("Se connecter").font(AkFont.bold(13.5)).foregroundColor(.white).onTapGesture { router.go(.login) }
                }.frame(maxWidth: .infinity).padding(.top, 10)
            }
            .padding(.horizontal, 28).padding(.bottom, 26)
        }
    }

    func stat(_ v: String, _ l: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(v).font(AkFont.schibstedExtra(20)).foregroundColor(.white)
            Text(l).font(AkFont.regular(11.5)).foregroundColor(Ak.onGreenFaint)
        }
    }

    func roleRow(icon: String, title: String, sub: String, index: Int) -> some View {
        let sel = router.role == index
        return HStack(spacing: 13) {
            Image(systemName: icon).font(.system(size: 20)).foregroundColor(sel ? Ak.orange : .white)
                .frame(width: 40, height: 40)
                .background(sel ? Ak.orangeSoft : Color.white.opacity(0.16))
                .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(AkFont.bold(15.5)).foregroundColor(sel ? Ak.ink : .white)
                Text(sub).font(AkFont.regular(12.5)).foregroundColor(sel ? Ak.muted : Ak.onGreenFaint)
            }
            Spacer()
            if sel { Image(systemName: "checkmark.circle.fill").font(.system(size: 22)).foregroundColor(Ak.orange) }
        }
        .padding(.horizontal, 16).padding(.vertical, 15)
        .background(sel ? Color.white : Color.white.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(sel ? Ak.orangeLight : Color.white.opacity(0.18), lineWidth: sel ? 2 : 1.5))
        .contentShape(Rectangle())
        .onTapGesture { router.role = index }
    }
}

// MARK: - Écran 2, Inscription
struct SignupScreen: View {
    @EnvironmentObject var router: Router
    @State private var consent = false
    @State private var parentalConsent = false
    @State private var sending = false
    @State private var error: String?
    private var isStudent: Bool { router.role == 1 }
    private var canSubmit: Bool {
        consent && (!isStudent || parentalConsent)
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
                        Button("Modifier") { router.back() }.font(AkFont.bold(12)).foregroundColor(Ak.green)
                    }.padding(14).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 12))
                    consentCheckboxLinked
                    if isStudent {
                        Toggle("Je confirme avoir le consentement d'un parent ou tuteur légal.", isOn: $parentalConsent)
                            .font(AkFont.regular(12.5)).tint(Ak.green)
                    }
                    if let error { authError(error) }
                }.padding(.horizontal, 24).padding(.top, 8)
            }
            VStack(spacing: 13) {
                PrimaryButton(label: sending ? "Envoi…" : "Créer mon compte", color: canSubmit ? Ak.green : Ak.border) {
                    guard canSubmit else { return }
                    sending = true; error = nil
                    Task { @MainActor in
                        defer { sending = false }
                        do {
                            let result = try await ApiClient.shared.signup(
                                fullName: router.authFullName.trimmingCharacters(in: .whitespaces),
                                phone: ApiClient.normalizePhone(router.authPhone), roleIndex: router.role,
                                consent: consent, parentalConsent: parentalConsent,
                                email: router.authEmail.isEmpty ? nil : router.authEmail)
                            router.applyAuth(result)
                        } catch { self.error = error.localizedDescription }
                    }
                }.disabled(!canSubmit)
                Button("Déjà un compte ? Se connecter") { router.go(.login) }
                    .font(AkFont.bold(13)).foregroundColor(Ak.green)
            }.padding(.horizontal, 24).padding(.vertical, 12)
        }
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
                    .font(.system(size: 23)).foregroundColor(Ak.green)
            }.accessibilityLabel("Accepter les CGU et la politique de confidentialité")
            Text(text).font(AkFont.regular(12.5)).foregroundColor(Ak.muted).tint(Ak.green)
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
                    Text("Content de vous revoir").font(AkFont.schibstedExtra(24)).foregroundColor(Ak.ink)
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
                    }.disabled(sending || router.authPhone.filter(\.isNumber).count < 10)
                    #if DEBUG
                    if router.otpDemo {
                        Button("Compte administrateur de démonstration") { login(phone: ApiConfig.adminPhone) }
                            .font(AkFont.regular(12)).foregroundColor(Ak.faint).disabled(sending)
                    }
                    #endif
                }.padding(.horizontal, 26).padding(.top, 30)
            }
            Button("Nouveau sur Mon Prof Perso ? Créer un compte") { router.go(.signup) }
                .font(AkFont.bold(13)).foregroundColor(Ak.green).padding(.bottom, 20)
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
            VStack(alignment: .leading, spacing: 18) {
                Image(systemName: "ellipsis.bubble.fill").font(.system(size: 30)).foregroundColor(Ak.green)
                    .frame(width: 64, height: 64).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 18))
                Text("Entrez le code").font(AkFont.schibstedExtra(25)).foregroundColor(Ak.ink)
                Text("Code envoyé par \(router.authOtpChannel == "email" ? "e-mail" : "WhatsApp") à \(router.authDestination). Valable \(router.otpTtlMinutes) minutes.")
                    .font(AkFont.regular(13.5)).foregroundColor(Ak.muted)
                TextField("Code à 6 chiffres", text: $code)
                    .keyboardType(.numberPad).textContentType(.oneTimeCode).focused($focused)
                    .font(.system(size: 28, weight: .semibold, design: .monospaced))
                    .padding(18).background(.white).clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
                    .onChange(of: code) { value in
                        code = String(value.filter { $0 >= "0" && $0 <= "9" }.prefix(codeLen))
                        error = nil
                    }
                if let error { authError(error) }
                Button(resendSec > 0 ? "Renvoyer dans \(resendSec) s" : "Renvoyer le code") { resend() }
                    .font(AkFont.bold(13)).foregroundColor(Ak.green).disabled(resendSec > 0 || sending)
            }.padding(.horizontal, 28).padding(.top, 16)
            Spacer()
            PrimaryButton(label: sending ? "Vérification…" : "Vérifier", color: Ak.green) { verify() }
                .disabled(sending || code.count != codeLen)
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
        TextField(label, text: text).font(AkFont.regular(14.5)).foregroundColor(Ak.ink)
            .padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }
}

private func authError(_ text: String) -> some View {
    Text(text).font(AkFont.regular(13)).foregroundColor(Ak.danger)
        .frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.updatesFrequently)
}
