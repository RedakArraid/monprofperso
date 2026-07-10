import SwiftUI
import UniformTypeIdentifiers

private struct DocPick { let name: String; let mime: String; let b64: String }
private struct ProgramPick: Identifiable { let slug: String; let name: String; var id: String { slug } }

private func normalizePhone(_ raw: String) -> String {
    var p = raw.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: " ", with: "").replacingOccurrences(of: ".", with: "").replacingOccurrences(of: "-", with: "")
    if p.range(of: #"^0\d{9}$"#, options: .regularExpression) != nil { p = "+225" + String(p.dropFirst()) }
    else if p.range(of: #"^225\d{8,12}$"#, options: .regularExpression) != nil { p = "+" + p }
    return p
}

private let otherLabel = "Autre"
private let otherProgramSlug = "__autre__"
private let appLocations = ["Cocody", "Plateau", "Yopougon", "Marcory", "Treichville", "Abobo", "Adjamé", "Koumassi", "Port-Bouët", "Bingerville", "Anyama", "Autre (Abidjan)"]
private let appExperiences = ["Débutant", "1 à 3 ans", "3 à 5 ans", "5 à 10 ans", "10 ans et +", "Enseignant certifié"]
private let appPrices = [2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000]

private func finalizeSubjects(_ list: [String]) -> [String] {
    list.filter { $0 != otherLabel } + [otherLabel]
}

private func finalizeLevels(_ list: [String]) -> [String] {
    var out = list.filter { $0 != otherLabel && $0 != "Professionnel" }
    if let idx = out.firstIndex(of: "Lycée") { out.insert("Professionnel", at: idx + 1) }
    else if !out.contains("Professionnel") { out.append("Professionnel") }
    out.append(otherLabel)
    return out
}

private func finalizePrograms(_ list: [ProgramPick]) -> [ProgramPick] {
    list.filter { $0.slug != otherProgramSlug } + [ProgramPick(slug: otherProgramSlug, name: otherLabel)]
}

// MARK: - Écran 29, Devenir professeur (live → /api/teacher-applications)
struct BecomeTeacherScreen: View {
    @EnvironmentObject var router: Router
    @State private var step = 0
    @State private var fullName = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var consent = false
    @State private var subjectNames: [String] = ["Maths", "Physique", "Français", "Anglais", "SVT", "Philo", "Hist-Géo"]
    @State private var levelNames: [String] = ["Primaire", "Collège", "Lycée", "Professionnel", "Supérieur", "Université"]
    @State private var selectedSubjects = Set<String>()
    @State private var selectedLevels: Set<String> = ["Collège", "Lycée"]
    @State private var otherSubject = ""
    @State private var otherLevel = ""
    @State private var err: String?
    @State private var done = false
    @State private var loading = false

    var body: some View {
        AkScreen {
            TopBar(title: "Devenir professeur", onBack: { if !done { router.back() } })
            if done {
                VStack(spacing: 16) {
                    Spacer()
                    Image(systemName: "checkmark.shield.fill").font(.system(size: 48)).foregroundColor(Ak.green)
                    Text("Candidature envoyée").font(AkFont.schibstedExtra(22)).foregroundColor(Ak.ink)
                    Text("Vérification sous 24 à 48 h. Vous serez contacté sur votre numéro.")
                        .font(AkFont.regular(14)).foregroundColor(Ak.muted).multilineTextAlignment(.center).padding(.top, 4)
                    Spacer()
                    PrimaryButton(label: "Retour au compte", trailingSystemIcon: nil) { router.back() }
                }.padding(22)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 8) {
                            ForEach(0..<2, id: \.self) { i in
                                Capsule().fill(i <= step ? Ak.green : Color(hex: 0xEAE5DC)).frame(height: 5)
                            }
                        }
                        Text("Étape \(step + 1) / 2 · \(stepTitle)").font(AkFont.regular(12)).foregroundColor(Ak.muted).padding(.top, 7)
                        stepContent.padding(.top, 14)
                        if let err { Text(err).font(AkFont.regular(13)).foregroundColor(Ak.danger).padding(.top, 12) }
                    }.padding(.horizontal, 22).padding(.top, 14)
                }
                HStack(spacing: 10) {
                    if step > 0 {
                        Text("Retour").font(AkFont.bold(15.5)).foregroundColor(Ak.ink)
                            .frame(maxWidth: .infinity).padding(.vertical, 16)
                            .overlay(RoundedRectangle(cornerRadius: 15).stroke(Ak.border, lineWidth: 1))
                            .onTapGesture { step -= 1 }
                    }
                    PrimaryButton(label: primaryLabel, trailingSystemIcon: nil) { nextStep() }
                        .frame(maxWidth: .infinity)
                }.padding(.horizontal, 22).padding(.vertical, 14).background(.white)
            }
        }
        .task { await loadCatalog() }
    }

    private var stepTitle: String {
        step == 0 ? "Votre profil" : "Consentement"
    }

    private var primaryLabel: String {
        step == 0 ? "Suivant" : (loading ? "Envoi…" : "Envoyer ma candidature")
    }

    @ViewBuilder private var stepContent: some View {
        switch step {
        case 0:
            Text("Parlez-nous de vous").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.ink)
            fieldLabel("Nom complet").padding(.top, 12); appField($fullName, "Koffi N'Guessan")
            fieldLabel("Téléphone").padding(.top, 10); appField($phone, "+2250700000000")
            fieldLabel("E-mail (optionnel)").padding(.top, 10); appField($email, "prof@exemple.com")
            fieldLabel("Matières enseignées").padding(.top, 14)
            chipWrap(subjectNames, selected: $selectedSubjects)
            if selectedSubjects.contains(otherLabel) {
                fieldLabel("Précisez la matière").padding(.top, 8)
                appField($otherSubject, "Ex. Droit, Comptabilité…")
            }
            fieldLabel("Niveaux").padding(.top, 14)
            chipWrap(levelNames, selected: $selectedLevels)
            if selectedLevels.contains(otherLabel) {
                fieldLabel("Précisez le niveau").padding(.top, 8)
                appField($otherLevel, "Ex. Prépa concours, Adultes…")
            }
        case 1:
            Text("Confidentialité").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.ink)
            Text("Pour rassurer les parents, chaque professeur est vérifié avant d'apparaître sur Mon Prof Perso. Vous compléterez votre profil (documents, tarifs…) dans votre espace après validation.")
                .font(AkFont.regular(13)).foregroundColor(Ak.muted).padding(.top, 6)
            Toggle(isOn: $consent) {
                Text("J'accepte les CGU et la politique de confidentialité.").font(AkFont.regular(13)).foregroundColor(Ak.ink)
            }.padding(.top, 14)
        default:
            EmptyView()
        }
    }

    private func loadCatalog() async {
        if let s = try? await ApiClient.shared.subjects(), !s.isEmpty {
            subjectNames = finalizeSubjects(s.map(\.name))
        } else {
            subjectNames = finalizeSubjects(subjectNames)
        }
        if let l = try? await ApiClient.shared.levels(), !l.isEmpty {
            levelNames = finalizeLevels(l.map(\.name))
        } else {
            levelNames = finalizeLevels(levelNames)
        }
    }

    private func buildSubjectsString() -> String {
        var parts = selectedSubjects.filter { $0 != otherLabel }.sorted()
        if selectedSubjects.contains(otherLabel) {
            let custom = otherSubject.trimmingCharacters(in: .whitespaces)
            if !custom.isEmpty { parts.append(custom) }
        }
        return parts.joined(separator: " · ")
    }

    private func buildLevelsList() -> [String] {
        var parts = selectedLevels.filter { $0 != otherLabel }.sorted()
        if selectedLevels.contains(otherLabel) {
            let custom = otherLevel.trimmingCharacters(in: .whitespaces)
            if !custom.isEmpty { parts.append(custom) }
        }
        return parts
    }

    private func chipWrap(_ items: [String], selected: Binding<Set<String>>) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: 8)], spacing: 8) {
            ForEach(items, id: \.self) { item in
                let on = selected.wrappedValue.contains(item)
                Text(item).font(AkFont.bold(12)).foregroundColor(on ? Ak.green : Ak.inkSoft)
                    .padding(.horizontal, 12).padding(.vertical, 9)
                    .background(on ? Ak.greenSoft : .white)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(on ? Ak.green : Ak.border, lineWidth: 1))
                    .onTapGesture {
                        if on { selected.wrappedValue.remove(item) } else { selected.wrappedValue.insert(item) }
                    }
            }
        }.padding(.top, 8)
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text).font(AkFont.semibold(12)).foregroundColor(Ak.muted)
    }

    private func appField(_ text: Binding<String>, _ placeholder: String, lines: Int = 1) -> some View {
        TextField(placeholder, text: text, axis: lines > 1 ? .vertical : .horizontal)
            .lineLimit(lines > 1 ? lines...lines : 1...1)
            .font(AkFont.regular(14)).padding(14)
            .background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }

    private func nextStep() {
        guard !loading else { return }
        err = nil
        switch step {
        case 0:
            if fullName.trimmingCharacters(in: .whitespaces).isEmpty || phone.trimmingCharacters(in: .whitespaces).isEmpty {
                err = "Remplissez nom et téléphone."
            } else if selectedSubjects.isEmpty {
                err = "Sélectionnez au moins une matière."
            } else if selectedSubjects.contains(otherLabel) && otherSubject.trimmingCharacters(in: .whitespaces).isEmpty {
                err = "Précisez la matière « Autre »."
            } else if selectedLevels.isEmpty {
                err = "Sélectionnez au moins un niveau."
            } else if selectedLevels.contains(otherLabel) && otherLevel.trimmingCharacters(in: .whitespaces).isEmpty {
                err = "Précisez le niveau « Autre »."
            } else { step += 1 }
        case 1:
            if !consent { err = "Acceptez les conditions." } else { Task { await submit() } }
        default:
            break
        }
    }

    private func submit() async {
        loading = true; err = nil
        var json: [String: Any] = [
            "fullName": fullName.trimmingCharacters(in: .whitespaces),
            "phone": normalizePhone(phone),
            "subjects": buildSubjectsString(),
            "levels": buildLevelsList(),
            "consent": true,
        ]
        let em = email.trimmingCharacters(in: .whitespaces)
        if !em.isEmpty { json["email"] = em }
        do {
            _ = try await ApiClient.shared.submitTeacherApplication(json)
            done = true
        } catch {
            err = "Envoi impossible (\(error))"
        }
        loading = false
    }
}

// MARK: - Compléter mon profil (espace professeur)
struct CompleteTeacherProfileScreen: View {
    @EnvironmentObject var router: Router
    @State private var step = 0
    @State private var location = "Cocody"
    @State private var bio = ""
    @State private var subjectsLine = ""
    @State private var levelsLine = ""
    @State private var programItems: [ProgramPick] = [
        ProgramPick(slug: "standard", name: "Programme standard"),
        ProgramPick(slug: "francais", name: "Programme français"),
    ]
    @State private var selectedPrograms: Set<String> = ["standard"]
    @State private var otherProgram = ""
    @State private var idCard: DocPick?
    @State private var diploma: DocPick?
    @State private var photo: DocPick?
    @State private var hasIdCard = false
    @State private var hasDiploma = false
    @State private var hasPhoto = false
    @State private var err: String?
    @State private var done = false
    @State private var loading = false
    @State private var pickKind = ""
    @State private var showImporter = false

    var body: some View {
        AkScreen {
            TopBar(title: "Compléter mon profil", onBack: { if !done { router.back() } })
            if done {
                VStack(spacing: 16) {
                    Spacer()
                    Image(systemName: "checkmark.circle.fill").font(.system(size: 48)).foregroundColor(Ak.green)
                    Text("Profil enregistré").font(AkFont.schibstedExtra(22)).foregroundColor(Ak.ink)
                    Text("Votre profil sera visible après vérification par l'équipe.").font(AkFont.regular(14)).foregroundColor(Ak.muted).multilineTextAlignment(.center)
                    Spacer()
                    PrimaryButton(label: "Retour", trailingSystemIcon: nil) { router.back() }
                }.padding(22)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 8) { ForEach(0..<2, id: \.self) { i in Capsule().fill(i <= step ? Ak.green : Color(hex: 0xEAE5DC)).frame(height: 5) } }
                        Text("Étape \(step + 1) / 2 · \(step == 0 ? "Infos pro" : "Documents")").font(AkFont.regular(12)).foregroundColor(Ak.muted).padding(.top, 7)
                        stepContent.padding(.top, 14)
                        if let err { Text(err).font(AkFont.regular(13)).foregroundColor(Ak.danger).padding(.top, 12) }
                    }.padding(.horizontal, 22).padding(.top, 14)
                }
                HStack(spacing: 10) {
                    if step > 0 {
                        Text("Retour").font(AkFont.bold(15.5)).foregroundColor(Ak.ink).frame(maxWidth: .infinity).padding(.vertical, 16)
                            .overlay(RoundedRectangle(cornerRadius: 15).stroke(Ak.border, lineWidth: 1)).onTapGesture { step -= 1 }
                    }
                    PrimaryButton(label: step == 0 ? "Suivant" : (loading ? "Envoi…" : "Enregistrer"), trailingSystemIcon: nil) { nextStep() }.frame(maxWidth: .infinity)
                }.padding(.horizontal, 22).padding(.vertical, 14).background(.white)
            }
        }
        .task { await loadProfile() }
        .fileImporter(isPresented: $showImporter, allowedContentTypes: pickKind == "photo" ? [.image] : [.pdf, .image], allowsMultipleSelection: false) { result in
            guard case .success(let urls) = result, let url = urls.first, url.startAccessingSecurityScopedResource() else { return }
            defer { url.stopAccessingSecurityScopedResource() }
            guard let data = try? Data(contentsOf: url) else { return }
            let pick = DocPick(name: url.lastPathComponent, mime: UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream", b64: data.base64EncodedString())
            switch pickKind { case "id": idCard = pick; case "dip": diploma = pick; case "photo": photo = pick; default: break }
        }
    }

    @ViewBuilder private var stepContent: some View {
        if step == 0 {
            Text("Finalisez votre profil public").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.ink)
            if !subjectsLine.isEmpty { fieldLabel("Matières").padding(.top, 12); Text(subjectsLine).font(AkFont.regular(13)).foregroundColor(Ak.ink) }
            if !levelsLine.isEmpty { fieldLabel("Niveaux").padding(.top, 10); Text(levelsLine).font(AkFont.regular(13)).foregroundColor(Ak.ink) }
            fieldLabel("Quartier / commune").padding(.top, 14)
            pickerField(selection: $location, options: appLocations)
            fieldLabel("Programmes scolaires").padding(.top, 14)
            programChips()
            if selectedPrograms.contains(otherProgramSlug) { fieldLabel("Précisez le programme").padding(.top, 8); appField($otherProgram, "Ex. Programme IB…") }
            fieldLabel("Présentation").padding(.top, 10)
            appField($bio, "Votre parcours…", lines: 3)
        } else {
            Text("Vérifions votre profil").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.ink)
            Text("Ces documents restent confidentiels.").font(AkFont.regular(13)).foregroundColor(Ak.muted).padding(.top, 6)
            profileDocRow("person.text.rectangle.fill", "Pièce d'identité (CNI)", idCard?.name ?? (hasIdCard ? "Déjà envoyé" : "Obligatoire"), done: idCard != nil || hasIdCard) { pickKind = "id"; showImporter = true }.padding(.top, 12)
            profileDocRow("rosette", "Diplôme / attestation", diploma?.name ?? (hasDiploma ? "Déjà envoyé" : "Obligatoire"), done: diploma != nil || hasDiploma) { pickKind = "dip"; showImporter = true }.padding(.top, 10)
            profileDocRow("camera.fill", "Photo de profil", photo?.name ?? (hasPhoto ? "Déjà envoyée" : "Obligatoire"), done: photo != nil || hasPhoto) { pickKind = "photo"; showImporter = true }.padding(.top, 10)
        }
    }

    private func loadProfile() async {
        if let p = try? await ApiClient.shared.teacherProfile() {
            subjectsLine = p.subjects; levelsLine = p.levels.joined(separator: " · ")
            location = p.location.isEmpty ? "Cocody" : p.location
            bio = p.bio ?? ""
            selectedPrograms = Set(p.programs.isEmpty ? ["standard"] : p.programs)
            hasIdCard = p.hasIdCard; hasDiploma = p.hasDiploma; hasPhoto = p.hasPhoto
        }
        if let progs = try? await ApiClient.shared.programs(), !progs.isEmpty {
            programItems = finalizePrograms(progs.map { ProgramPick(slug: $0.slug, name: $0.name) })
        }
    }

    private func buildProgramsList() -> [String] {
        var parts = selectedPrograms.filter { $0 != otherProgramSlug }.sorted()
        if selectedPrograms.contains(otherProgramSlug) {
            let c = otherProgram.trimmingCharacters(in: .whitespaces)
            if !c.isEmpty { parts.append(c) }
        }
        return parts
    }

    private func nextStep() {
        guard !loading else { return }
        err = nil
        if step == 0 {
            if selectedPrograms.isEmpty { err = "Sélectionnez au moins un programme." }
            else if selectedPrograms.contains(otherProgramSlug) && otherProgram.trimmingCharacters(in: .whitespaces).isEmpty { err = "Précisez le programme « Autre »." }
            else { step += 1 }
        } else {
            if !hasIdCard && idCard == nil || !hasDiploma && diploma == nil || !hasPhoto && photo == nil { err = "Ajoutez les documents manquants." }
            else { Task { await submit() } }
        }
    }

    private func submit() async {
        loading = true; err = nil
        var json: [String: Any] = [
            "location": location,
            "programs": buildProgramsList(),
        ]
        if !bio.trimmingCharacters(in: .whitespaces).isEmpty { json["bio"] = bio.trimmingCharacters(in: .whitespaces) }
        if let idCard { json["idCardBase64"] = idCard.b64; json["idCardFileName"] = idCard.name; json["idCardMimeType"] = idCard.mime }
        if let diploma { json["diplomaBase64"] = diploma.b64; json["diplomaFileName"] = diploma.name; json["diplomaMimeType"] = diploma.mime }
        if let photo { json["photoBase64"] = photo.b64; json["photoFileName"] = photo.name; json["photoMimeType"] = photo.mime }
        do { _ = try await ApiClient.shared.updateTeacherProfile(json); done = true }
        catch { err = "Enregistrement impossible" }
        loading = false
    }

    private func programChips() -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 8)], spacing: 8) {
            ForEach(programItems) { p in
                let on = selectedPrograms.contains(p.slug)
                Text(p.name).font(AkFont.bold(12)).foregroundColor(on ? Ak.green : Ak.inkSoft)
                    .padding(.horizontal, 12).padding(.vertical, 9).background(on ? Ak.greenSoft : .white).clipShape(Capsule())
                    .overlay(Capsule().stroke(on ? Ak.green : Ak.border, lineWidth: 1))
                    .onTapGesture { if on { selectedPrograms.remove(p.slug) } else { selectedPrograms.insert(p.slug) } }
            }
        }.padding(.top, 8)
    }

    private func pickerField<T: Hashable>(selection: Binding<T>, options: [T], label: ((T) -> String)? = nil) -> some View {
        Picker("", selection: selection) { ForEach(options, id: \.self) { opt in Text(label?(opt) ?? String(describing: opt)).tag(opt) } }
            .pickerStyle(.menu).frame(maxWidth: .infinity, alignment: .leading).padding(12).background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)).overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }

    private func fieldLabel(_ text: String) -> some View { Text(text).font(AkFont.semibold(12)).foregroundColor(Ak.muted) }

    private func appField(_ text: Binding<String>, _ placeholder: String, lines: Int = 1) -> some View {
        TextField(placeholder, text: text, axis: lines > 1 ? .vertical : .horizontal).lineLimit(lines > 1 ? lines...lines : 1...1)
            .font(AkFont.regular(14)).padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }

    private func profileDocRow(_ icon: String, _ title: String, _ status: String, done: Bool, onAdd: @escaping () -> Void) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 19)).foregroundColor(done ? Ak.green : Ak.faint)
                .frame(width: 40, height: 40).background(done ? Ak.greenSoft : Ak.cardField).clipShape(RoundedRectangle(cornerRadius: 11))
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(AkFont.bold(13.5)).foregroundColor(Ak.ink)
                Text(status).font(AkFont.semibold(11.5)).foregroundColor(done ? Ak.online : Ak.faint)
            }
            Spacer()
            Text(done ? "Remplacer" : "Ajouter").font(AkFont.bold(12)).foregroundColor(Ak.green).padding(.horizontal, 12).padding(.vertical, 7).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 10))
        }.padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(done ? Ak.border : Color(hex: 0xC9C2B5), style: StrokeStyle(lineWidth: done ? 1 : 1.5, dash: done ? [] : [5])))
        .onTapGesture { onAdd() }
    }
}

// MARK: - Écran 30, Retrait des gains
struct WithdrawScreen: View {
    @EnvironmentObject var router: Router
    @State private var amount = 1
    var body: some View {
        AkScreen {
            TopBar(title: "Retirer mes gains", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Solde disponible").font(AkFont.regular(12.5)).foregroundColor(Ak.onGreenSoft)
                        Text("184 000 F").font(AkFont.schibstedBlack(34)).foregroundColor(.white).padding(.top, 3)
                    }.padding(18).frame(maxWidth: .infinity, alignment: .leading).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                    Text("Montant à retirer").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18)
                    HStack(alignment: .bottom, spacing: 0) {
                        Text("100 000").font(AkFont.schibstedExtra(30)).foregroundColor(Ak.ink)
                        Text(" F").font(AkFont.semibold(15)).foregroundColor(Ak.faint).padding(.bottom, 4)
                    }.frame(maxWidth: .infinity).padding(16).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 15).stroke(Ak.border, lineWidth: 1)).padding(.top, 11)
                    HStack(spacing: 8) { quick("50 000", 0); quick("100 000", 1); quick("Tout", 2) }.padding(.top, 11)

                    Text("Verser sur").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18)
                    HStack(spacing: 12) {
                        Image(systemName: "waveform").font(.system(size: 19)).foregroundColor(.white).frame(width: 38, height: 38).background(Ak.wave).clipShape(RoundedRectangle(cornerRadius: 10))
                        VStack(alignment: .leading, spacing: 0) { Text("Wave").font(AkFont.bold(14)).foregroundColor(Ak.ink); Text("05 ** ** ** 11").font(AkFont.regular(12)).foregroundColor(Ak.muted) }
                        Spacer()
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 21)).foregroundColor(Ak.green)
                    }.padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 15).stroke(Ak.green, lineWidth: 2)).padding(.top, 11)
                    HStack(spacing: 8) {
                        Image(systemName: "lock.fill").font(.system(size: 12)).foregroundColor(Ak.green)
                        Text("Sans frais · versé sous 24h").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                    }.frame(maxWidth: .infinity).padding(.top, 13)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            PrimaryButton(label: "Retirer 100 000 F", color: Ak.green, trailingSystemIcon: nil) { router.back() }.padding(.horizontal, 22).padding(.vertical, 14).background(.white)
        }
    }
    func quick(_ label: String, _ idx: Int) -> some View {
        let sel = amount == idx
        return Text(label).font(sel ? AkFont.bold(12.5) : AkFont.semibold(12.5)).foregroundColor(sel ? .white : Ak.inkSoft)
            .frame(maxWidth: .infinity).padding(.vertical, 9).background(sel ? Ak.green : .white).clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(Ak.border, lineWidth: sel ? 0 : 1)).onTapGesture { amount = idx }
    }
}
