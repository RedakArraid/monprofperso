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
    @State private var channel = "whatsapp"
    private var isStudent: Bool { router.role == 1 }
    private var canSubmit: Bool { consent && (!isStudent || parentalConsent) }
    private var showChannel: Bool { router.otpWhatsappEnabled && router.otpEmailEnabled && !router.otpDemo }
    private var showEmail: Bool { channel == "email" && (router.otpEmailEnabled || router.otpDemo) }

    var body: some View {
        AkScreen {
            TopBar(title: "", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Créer mon compte").font(AkFont.schibstedExtra(25)).foregroundColor(Ak.ink)
                        Text(router.role == 1 ? "Trouvez le bon prof pour réussir vos examens."
                             : router.role == 2 ? "Créez votre profil et commencez à donner des cours."
                             : "Trouvez le bon prof pour votre enfant en quelques minutes.")
                            .font(AkFont.regular(13.5)).foregroundColor(Ak.muted)
                    }
                    FieldDisplay(label: "Nom & prénoms", value: router.authFullName, leadingIcon: "person")
                    PhoneField(value: $router.authPhone)
                    if showChannel { otpChannelPicker }
                    if showEmail { emailField }
                    FieldDisplay(label: "Mot de passe", value: "••••••••", leadingIcon: "lock.fill", trailingIcon: "eye.slash.fill")
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Je m'inscris en tant que").font(AkFont.semibold(12)).foregroundColor(Ak.muted)
                            Spacer()
                            Text("Modifier").font(AkFont.bold(12)).foregroundColor(Ak.green).onTapGesture { router.back() }
                        }
                        HStack(spacing: 9) {
                            Image(systemName: "checkmark.circle.fill").font(.system(size: 18)).foregroundColor(Ak.green)
                            Text(roleLabels[router.role]).font(AkFont.bold(14)).foregroundColor(Ak.ink)
                            Spacer()
                        }.padding(.horizontal, 14).padding(.vertical, 12)
                        .background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    consentCheckboxLinked(checked: consent) { consent.toggle() }
                    if isStudent {
                        consentCheckbox(checked: parentalConsent, label: "Je confirme avoir le consentement d'un parent ou tuteur légal (élève mineur).") { parentalConsent.toggle() }
                    }
                }.padding(.horizontal, 24).padding(.top, 8)
            }
            VStack(spacing: 13) {
                PrimaryButton(label: "Créer mon compte", color: canSubmit ? Ak.green : Ak.border) {
                    guard canSubmit else { return }
                    Task { @MainActor in
                        await ApiClient.shared.refreshOtpChannels(router: router)
                        let e164 = ApiClient.normalizePhone(router.authPhone)
                        router.authOtpChannel = channel
                        router.authRole = await ApiClient.shared.signup(
                            fullName: router.authFullName, phone: e164, roleIndex: router.role,
                            consent: consent, parentalConsent: parentalConsent, demo: router.otpDemo
                        )
                        await ApiClient.shared.requestOtp(phone: e164, channel: channel,
                                                          email: router.authEmail.isEmpty ? nil : router.authEmail)
                        router.go(.otp)
                    }
                }
                HStack(spacing: 4) {
                    Text("Déjà un compte ?").font(AkFont.regular(13)).foregroundColor(Ak.muted)
                    Text("Se connecter").font(AkFont.bold(13)).foregroundColor(Ak.green).onTapGesture { router.go(.login) }
                }
            }.padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 12)
        }
        .task { await ApiClient.shared.refreshOtpChannels(router: router); channel = router.authOtpChannel }
        .environment(\.openURL, OpenURLAction { url in
            if url.path.contains("/api/legal/") {
                let title = url.path.contains("/cgu/") ? "Conditions d'utilisation" : "Politique de confidentialité"
                router.go(.pdfViewer(url: url.absoluteString, title: title))
                return .handled
            }
            return .systemAction
        })
    }

    private var otpChannelPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Recevoir le code par").font(AkFont.semibold(12)).foregroundColor(Ak.muted)
            HStack(spacing: 10) {
                otpSegBtn("WhatsApp", on: channel == "whatsapp") { channel = "whatsapp" }
                otpSegBtn("E-mail", on: channel == "email") { channel = "email" }
            }
        }
    }

    private var emailField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Adresse e-mail").font(AkFont.semibold(12)).foregroundColor(Ak.muted)
            TextField("", text: $router.authEmail)
                .keyboardType(.emailAddress).textInputAutocapitalization(.never)
                .font(AkFont.regular(14.5)).foregroundColor(Ak.ink)
                .padding(.horizontal, 14).padding(.vertical, 14)
                .background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
        }
    }

    private func consentCheckboxLinked(checked: Bool, toggle: @escaping () -> Void) -> some View {
        let cgu = ApiConfig.baseURL.appendingPathComponent("api/legal/cgu/file").absoluteString
        let priv = ApiConfig.baseURL.appendingPathComponent("api/legal/confidentialite/file").absoluteString
        let md = "J'accepte les [Conditions d'utilisation](\(cgu)) et la [politique de confidentialité](\(priv))."
        var attributed = (try? AttributedString(markdown: md)) ?? AttributedString("J'accepte les Conditions d'utilisation et la politique de confidentialité.")
        attributed.foregroundColor = Ak.muted
        return HStack(alignment: .top, spacing: 9) {
            Image(systemName: checked ? "checkmark" : "")
                .font(.system(size: 12, weight: .bold)).foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(checked ? Ak.green : .white)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(checked ? Ak.green : Ak.border, lineWidth: 1.5))
                .contentShape(Rectangle()).onTapGesture(perform: toggle)
            Text(attributed).font(AkFont.regular(12.5)).tint(Ak.green)
            Spacer(minLength: 0)
        }
    }

    private func consentCheckbox(checked: Bool, label: String, toggle: @escaping () -> Void) -> some View {
        HStack(alignment: .top, spacing: 9) {
            Image(systemName: checked ? "checkmark" : "")
                .font(.system(size: 12, weight: .bold)).foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(checked ? Ak.green : .white)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(checked ? Ak.green : Ak.border, lineWidth: 1.5))
            Text(label).font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
            Spacer(minLength: 0)
        }.contentShape(Rectangle()).onTapGesture(perform: toggle)
    }
}

// MARK: - Écran 3, Connexion
struct LoginScreen: View {
    @EnvironmentObject var router: Router
    @State private var channel = "whatsapp"
    private var showChannel: Bool { router.otpWhatsappEnabled && router.otpEmailEnabled && !router.otpDemo }
    private var showEmail: Bool { channel == "email" && (router.otpEmailEnabled || router.otpDemo) }

    var body: some View {
        AkScreen {
            ScrollView {
                VStack(spacing: 0) {
                    Image(systemName: "graduationcap.fill").font(.system(size: 29)).foregroundColor(.white)
                        .frame(width: 56, height: 56).background(Ak.green)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    Text("Content de vous revoir").font(AkFont.schibstedExtra(24)).foregroundColor(Ak.ink).padding(.top, 14)
                    Text("Connectez-vous pour continuer").font(AkFont.regular(13.5)).foregroundColor(Ak.muted)
                    VStack(spacing: 14) {
                        PhoneField(value: $router.authPhone)
                        if showChannel { otpChannelPicker }
                        if showEmail { emailField }
                        FieldDisplay(label: "Mot de passe", value: "••••••••", leadingIcon: "lock.fill", trailingIcon: "eye.fill")
                    }.padding(.top, 30)
                    Text("Mot de passe oublié ?").font(AkFont.bold(12.5)).foregroundColor(Ak.green)
                        .frame(maxWidth: .infinity, alignment: .trailing).padding(.top, 12)
                        .onTapGesture { goOtp() }
                    PrimaryButton(label: "Se connecter", color: Ak.green, trailingSystemIcon: nil) {
                        Task { @MainActor in
                            await ApiClient.shared.refreshOtpChannels(router: router)
                            let e164 = ApiClient.normalizePhone(router.authPhone)
                            router.authOtpChannel = channel
                            if router.otpDemo {
                                router.authRole = await ApiClient.shared.login(phone: e164)
                                router.enterApp()
                            } else {
                                await ApiClient.shared.requestOtp(phone: e164, channel: channel,
                                                                email: router.authEmail.isEmpty ? nil : router.authEmail)
                                router.go(.otp)
                            }
                        }
                    }.padding(.top, 20)
                    HStack(spacing: 12) {
                        Rectangle().fill(Ak.border).frame(height: 1)
                        Text("ou continuer avec").font(AkFont.regular(12)).foregroundColor(Ak.faint).fixedSize()
                        Rectangle().fill(Ak.border).frame(height: 1)
                    }.padding(.vertical, 22)
                    HStack(spacing: 11) {
                        social("Google", "globe").onTapGesture { router.enterApp() }
                        social("Apple", "apple.logo").onTapGesture { router.enterApp() }
                    }
                }.padding(.horizontal, 26).padding(.top, 30)
            }
            VStack(spacing: 10) {
                HStack(spacing: 4) {
                    Text("Nouveau sur Mon Prof Perso ?").font(AkFont.regular(13)).foregroundColor(Ak.muted)
                    Text("Créer un compte").font(AkFont.bold(13)).foregroundColor(Ak.green).onTapGesture { router.go(.signup) }
                }
                Text("Démo administrateur").font(AkFont.bold(12)).foregroundColor(Ak.faint)
                    .onTapGesture {
                        Task { @MainActor in
                            router.authRole = await ApiClient.shared.login(phone: ApiConfig.adminPhone)
                            router.enterApp()
                        }
                    }
            }.padding(.bottom, 12)
        }
        .task { await ApiClient.shared.refreshOtpChannels(router: router); channel = router.authOtpChannel }
    }

    private var otpChannelPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Recevoir le code par").font(AkFont.semibold(12)).foregroundColor(Ak.muted)
            HStack(spacing: 10) {
                otpSegBtn("WhatsApp", on: channel == "whatsapp") { channel = "whatsapp" }
                otpSegBtn("E-mail", on: channel == "email") { channel = "email" }
            }
        }
    }

    private var emailField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Adresse e-mail").font(AkFont.semibold(12)).foregroundColor(Ak.muted)
            TextField("", text: $router.authEmail)
                .keyboardType(.emailAddress).textInputAutocapitalization(.never)
                .font(AkFont.regular(14.5)).foregroundColor(Ak.ink)
                .padding(.horizontal, 14).padding(.vertical, 14)
                .background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
        }
    }

    private func goOtp() {
        Task { @MainActor in
            await ApiClient.shared.refreshOtpChannels(router: router)
            let e164 = ApiClient.normalizePhone(router.authPhone)
            router.authOtpChannel = channel
            await ApiClient.shared.requestOtp(phone: e164, channel: channel,
                                            email: router.authEmail.isEmpty ? nil : router.authEmail)
            router.go(.otp)
        }
    }

    func social(_ label: String, _ icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon).font(.system(size: 16))
            Text(label).font(AkFont.bold(13.5))
        }
        .foregroundColor(Ak.inkSoft).frame(maxWidth: .infinity).padding(.vertical, 13)
        .background(.white).clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 13).stroke(Ak.border, lineWidth: 1))
    }
}

// MARK: - Écran 4, Vérification (OTP)
struct OtpScreen: View {
    @EnvironmentObject var router: Router
    @State private var code = ""
    @State private var error: String?
    @State private var resendSec = 0
    @State private var sending = false

    private var phoneE164: String { ApiClient.normalizePhone(router.authPhone) }
    private var codeLen: Int { min(max(router.otpCodeLength, 4), 8) }
    private var channelLabel: String { router.authOtpChannel == "email" ? "e-mail" : "WhatsApp" }
    private var subtitle: String {
        if router.otpDemo {
            return "Mode démo : saisissez n'importe quel code à \(codeLen) chiffres."
        }
        if router.authOtpChannel == "email" {
            return "Nous avons envoyé un code à \(codeLen) chiffres par e-mail à \(router.authEmail)."
        }
        return "Nous avons envoyé un code à \(codeLen) chiffres par \(channelLabel) au \(ApiClient.maskPhone(phoneE164))."
    }

    var body: some View {
        AkScreen {
            TopBar(title: "", onBack: { router.back() })
            VStack(alignment: .leading, spacing: 0) {
                Image(systemName: "ellipsis.bubble.fill").font(.system(size: 30)).foregroundColor(Ak.green)
                    .frame(width: 64, height: 64).background(Ak.greenSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                Text("Entrez le code").font(AkFont.schibstedExtra(25)).foregroundColor(Ak.ink).padding(.top, 18)
                Text(subtitle).font(AkFont.regular(13.5)).foregroundColor(Ak.muted).lineSpacing(3).padding(.top, 8)
                HStack(spacing: 10) {
                    ForEach(0..<codeLen, id: \.self) { i in
                        otpBox(i < code.count ? String(code[code.index(code.startIndex, offsetBy: i)]) : "", active: code.count == i)
                    }
                }.padding(.top, 28)
                TextField("", text: $code)
                    .keyboardType(.numberPad)
                    .opacity(0.01).frame(height: 1)
                    .onChange(of: code) { v in
                        let d = v.filter(\.isNumber)
                        code = String(d.prefix(codeLen))
                        error = nil
                    }
                if let error {
                    Text(error).font(AkFont.regular(12.5)).foregroundColor(Ak.orange).padding(.top, 12)
                }
                HStack(spacing: 4) {
                    Text("Vous n'avez rien reçu ?").font(AkFont.regular(13)).foregroundColor(Ak.muted)
                    if resendSec > 0 {
                        Text("Renvoyer dans 0:\(String(format: "%02d", resendSec))").font(AkFont.regular(13)).foregroundColor(Ak.faint)
                    } else {
                        Text(sending ? "Envoi…" : "Renvoyer")
                            .font(AkFont.bold(13)).foregroundColor(Ak.green)
                            .onTapGesture { if !sending { resend() } }
                    }
                }.frame(maxWidth: .infinity).padding(.top, 24)
            }.padding(.horizontal, 28).padding(.top, 16)
            Spacer()
            PrimaryButton(label: "Vérifier", color: Ak.green) {
                Task { @MainActor in
                    if !router.otpDemo && code.count < codeLen {
                        error = "Saisissez le code à \(codeLen) chiffres."
                        return
                    }
                    let ok = await ApiClient.shared.verifyOtp(
                        phone: phoneE164,
                        code: code,
                        email: router.authEmail.isEmpty ? nil : router.authEmail
                    )
                    if ok {
                        router.authRole = TokenStore.role
                        router.enterApp()
                    } else {
                        error = "Code invalide ou expiré."
                    }
                }
            }
            .padding(.horizontal, 28).padding(.bottom, 12)
        }
        .task {
            await ApiClient.shared.refreshOtpChannels(router: router)
            resendSec = router.otpTtlMinutes * 60
            sending = true
            await ApiClient.shared.requestOtp(phone: phoneE164, channel: router.authOtpChannel,
                                            email: router.authEmail.isEmpty ? nil : router.authEmail)
            sending = false
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            if resendSec > 0 { resendSec -= 1 }
        }
    }

    private func resend() {
        Task { @MainActor in
            sending = true
            await ApiClient.shared.requestOtp(phone: phoneE164, channel: router.authOtpChannel,
                                            email: router.authEmail.isEmpty ? nil : router.authEmail)
            sending = false
            resendSec = router.otpTtlMinutes * 60
        }
    }

    func otpBox(_ digit: String, active: Bool = false) -> some View {
        ZStack {
            if active { Rectangle().fill(Ak.green).frame(width: 2, height: 28) }
            else { Text(digit).font(AkFont.schibstedExtra(27)).foregroundColor(Ak.ink) }
        }
        .frame(maxWidth: .infinity).frame(height: 66)
        .background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(active ? Ak.green : Ak.border, lineWidth: active ? 2 : 1.5))
    }
}

// MARK: - Helpers OTP auth
private func otpSegBtn(_ label: String, on: Bool, action: @escaping () -> Void) -> some View {
    Text(label)
        .font(AkFont.semibold(13))
        .foregroundColor(on ? .white : Ak.inkSoft)
        .frame(maxWidth: .infinity).padding(.vertical, 11)
        .background(on ? Ak.green : .white)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Ak.border, lineWidth: on ? 0 : 1))
        .contentShape(Rectangle()).onTapGesture(perform: action)
}
