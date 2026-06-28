import SwiftUI
import UniformTypeIdentifiers

private struct DocPick { let name: String; let mime: String; let b64: String }

// MARK: - Écran 29, Devenir professeur (live → /api/teacher-applications)
struct BecomeTeacherScreen: View {
    @EnvironmentObject var router: Router
    @State private var step = 0
    @State private var fullName = ""
    @State private var phone = ""
    @State private var subjects = ""
    @State private var location = "Abidjan"
    @State private var price = "4000"
    @State private var bio = ""
    @State private var consent = false
    @State private var idCard: DocPick?
    @State private var diploma: DocPick?
    @State private var photo: DocPick?
    @State private var err: String?
    @State private var done = false
    @State private var loading = false
    @State private var pickKind = ""
    @State private var showImporter = false

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
                            ForEach(0..<3, id: \.self) { i in
                                Capsule().fill(i <= step ? Ak.green : Color(hex: 0xEAE5DC)).frame(height: 5)
                            }
                        }
                        Text("Étape \(step + 1) / 3 · \(stepTitle)").font(AkFont.regular(12)).foregroundColor(Ak.muted).padding(.top, 7)
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
        .fileImporter(isPresented: $showImporter, allowedContentTypes: allowedTypes, allowsMultipleSelection: false) { result in
            guard case .success(let urls) = result, let url = urls.first else { return }
            guard url.startAccessingSecurityScopedResource() else { return }
            defer { url.stopAccessingSecurityScopedResource() }
            guard let data = try? Data(contentsOf: url) else { return }
            let name = url.lastPathComponent
            let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
            let pick = DocPick(name: name, mime: mime, b64: data.base64EncodedString())
            switch pickKind {
            case "id": idCard = pick
            case "dip": diploma = pick
            case "photo": photo = pick
            default: break
            }
        }
    }

    private var stepTitle: String {
        switch step { case 0: return "Votre profil"; case 1: return "Consentement"; default: return "Vos documents" }
    }

    private var primaryLabel: String {
        if step < 2 { return "Suivant" }
        return loading ? "Envoi…" : "Envoyer ma candidature"
    }

    private var allowedTypes: [UTType] {
        pickKind == "photo" ? [.image] : [.pdf, .image]
    }

    @ViewBuilder private var stepContent: some View {
        switch step {
        case 0:
            Text("Parlez-nous de vous").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.ink)
            fieldLabel("Nom complet"); appField($fullName, "Koffi N'Guessan").padding(.top, 12)
            fieldLabel("Téléphone").padding(.top, 10); appField($phone, "+2250700000000")
            fieldLabel("Matières").padding(.top, 10); appField($subjects, "Maths · Physique")
            fieldLabel("Quartier / ville").padding(.top, 10); appField($location, "Cocody")
            fieldLabel("Tarif horaire (F)").padding(.top, 10); appField($price, "4000")
            fieldLabel("Présentation").padding(.top, 10); appField($bio, "Votre parcours…", lines: 3)
        case 1:
            Text("Confidentialité").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.ink)
            Text("Pour rassurer les parents, chaque professeur est vérifié avant d'apparaître sur Mon Prof Perso.")
                .font(AkFont.regular(13)).foregroundColor(Ak.muted).padding(.top, 6)
            HStack(alignment: .top, spacing: 9) {
                Image(systemName: "checkmark.shield.fill").font(.system(size: 16)).foregroundColor(Ak.green)
                Text("Vos documents sont confidentiels et vérifiés sous 24 à 48 h.").font(AkFont.regular(12.5)).foregroundColor(Color(hex: 0x3F6B59)).lineSpacing(3)
            }.padding(.horizontal, 14).padding(.vertical, 13).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)).padding(.top, 16)
            Toggle(isOn: $consent) {
                Text("J'accepte les CGU et la politique de confidentialité.").font(AkFont.regular(13)).foregroundColor(Ak.ink)
            }.padding(.top, 14)
        default:
            Text("Vérifions votre profil").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.ink)
            docRow("person.text.rectangle.fill", "Pièce d'identité (CNI)", idCard?.name ?? "Obligatoire", done: idCard != nil) { pickKind = "id"; showImporter = true }.padding(.top, 12)
            docRow("rosette", "Diplôme / attestation", diploma?.name ?? "Obligatoire", done: diploma != nil) { pickKind = "dip"; showImporter = true }.padding(.top, 10)
            docRow("camera.fill", "Photo de profil", photo?.name ?? "Obligatoire", done: photo != nil) { pickKind = "photo"; showImporter = true }.padding(.top, 10)
        }
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
            if fullName.trimmingCharacters(in: .whitespaces).isEmpty || phone.trimmingCharacters(in: .whitespaces).isEmpty || subjects.trimmingCharacters(in: .whitespaces).isEmpty {
                err = "Remplissez les champs obligatoires."
            } else { step += 1 }
        case 1:
            if !consent { err = "Acceptez les conditions." } else { step += 1 }
        default:
            if idCard == nil || diploma == nil || photo == nil {
                err = "Ajoutez les trois documents."
            } else { Task { await submit() } }
        }
    }

    private func submit() async {
        loading = true; err = nil
        var json: [String: Any] = [
            "fullName": fullName.trimmingCharacters(in: .whitespaces),
            "phone": phone.trimmingCharacters(in: .whitespaces),
            "subjects": subjects.trimmingCharacters(in: .whitespaces),
            "location": location.trimmingCharacters(in: .whitespaces),
            "pricePerHour": Int(price) ?? 4000,
            "bio": bio.trimmingCharacters(in: .whitespaces),
            "levels": ["Collège", "Lycée"],
            "formats": ["home", "online"],
            "programs": ["standard"],
            "consent": true,
        ]
        if let idCard {
            json["idCardBase64"] = idCard.b64; json["idCardFileName"] = idCard.name; json["idCardMimeType"] = idCard.mime
        }
        if let diploma {
            json["diplomaBase64"] = diploma.b64; json["diplomaFileName"] = diploma.name; json["diplomaMimeType"] = diploma.mime
        }
        if let photo {
            json["photoBase64"] = photo.b64; json["photoFileName"] = photo.name; json["photoMimeType"] = photo.mime
        }
        do {
            _ = try await ApiClient.shared.submitTeacherApplication(json)
            done = true
        } catch {
            err = "Envoi impossible (\(error))"
        }
        loading = false
    }

    func docRow(_ icon: String, _ title: String, _ status: String, done: Bool, onAdd: @escaping () -> Void) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 19)).foregroundColor(done ? Ak.green : Ak.faint)
                .frame(width: 40, height: 40).background(done ? Ak.greenSoft : Ak.cardField).clipShape(RoundedRectangle(cornerRadius: 11))
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(AkFont.bold(13.5)).foregroundColor(Ak.ink)
                Text(status).font(AkFont.semibold(11.5)).foregroundColor(done ? Ak.online : Ak.faint)
            }
            Spacer()
            if done { Image(systemName: "checkmark.circle.fill").font(.system(size: 21)).foregroundColor(Ak.online) }
            else { Text("Ajouter").font(AkFont.bold(12)).foregroundColor(Ak.green).padding(.horizontal, 12).padding(.vertical, 7).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 10)) }
        }.padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(done ? Ak.border : Color(hex: 0xC9C2B5), style: StrokeStyle(lineWidth: done ? 1 : 1.5, dash: done ? [] : [5])))
        .onTapGesture { if !done { onAdd() } }
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
