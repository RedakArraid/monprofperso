import SwiftUI

private let needStatusLabel: [String: String] = [
    "submitted": "En analyse", "priced": "Tarif proposé", "published": "Recherche prof",
    "matched": "Prof trouvé", "cancelled": "Annulé",
]

struct ExpressNeedScreen: View {
    @EnvironmentObject var router: Router
    @State private var children: [ChildDTO] = []
    @State private var childId = 0
    @State private var name = ""
    @State private var level = "3eme"
    @State private var subject = "Maths"
    @State private var location = "Cocody"
    @State private var frequency = "1 fois/sem"
    @State private var duration = "2h00"
    @State private var description = ""
    @State private var sending = false
    @State private var error: String?

    var body: some View {
        AkScreen {
            TopBar(title: "Exprimer un besoin", subtitle: "Décrivez le besoin de votre enfant", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    needField("Matière", text: $subject)
                    needField("Niveau", text: $level)
                    needField("Lieu", text: $location)
                    needField("Fréquence", text: $frequency)
                    needField("Durée", text: $duration)
                    needField("Précisions", text: $description)
                    if let error { Text(error).font(AkFont.regular(12)).foregroundColor(Ak.orange) }
                    AkButton(sending ? "Envoi…" : "Envoyer ma demande") {
                        Task { await submit() }
                    }.disabled(sending).padding(.top, 8)
                }.padding(.horizontal, 22).padding(.bottom, 20)
            }
        }
        .task {
            children = (try? await ApiClient.shared.children()) ?? []
            childId = children.first?.id ?? 0
        }
    }

    private func submit() async {
        sending = true; error = nil
        defer { sending = false }
        do {
            var cid: Int? = childId > 0 ? childId : nil
            if cid == nil, !name.isEmpty {
                cid = try await ApiClient.shared.createChild(["name": name, "level": level]).id
            }
            var body: [String: Any] = ["subject": subject, "level": level, "format": "home", "location": location, "frequency": frequency, "duration": duration]
            if let cid { body["childId"] = cid }
            if !description.isEmpty { body["description"] = description }
            _ = try await ApiClient.shared.createNeed(body)
            router.go(.myNeeds)
        } catch { error = error.localizedDescription }
    }
}

struct MyNeedsScreen: View {
    @EnvironmentObject var router: Router
    @State private var needs: [NeedDTO]?

    var body: some View {
        AkScreen {
            TopBar(title: "Mes demandes", onBack: { router.back() })
            ScrollView {
                VStack(spacing: 12) {
                    if needs == nil { LoadingRow() }
                    ForEach(needs ?? []) { n in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(n.reference).font(AkFont.regular(11)).foregroundColor(Ak.faint)
                            Text("\(n.subject) · \(n.level)").font(AkFont.bold(15)).foregroundColor(Ak.ink)
                            Text(needStatusLabel[n.status] ?? n.status).font(AkFont.regular(12)).foregroundColor(Ak.muted)
                            if let p = n.parentPrice {
                                Text("Tarif proposé : \(p.formattedFCFA) F / séance").font(AkFont.medium(13)).foregroundColor(Ak.ink)
                            }
                            if n.status == "priced" {
                                AkButton("Accepter ce tarif") {
                                    Task { _ = try? await ApiClient.shared.acceptNeedPrice(id: n.id); await reload() }
                                }
                            }
                        }.akCard()
                    }
                    AkButton("Nouvelle demande") { router.go(.expressNeed) }
                }.padding(.horizontal, 22).padding(.bottom, 20)
            }
        }
        .task { await reload() }
    }

    private func reload() async { needs = try? await ApiClient.shared.needs() }
}

struct MyChildrenScreen: View {
    @EnvironmentObject var router: Router
    @State private var children: [ChildDTO]?

    var body: some View {
        AkScreen {
            TopBar(title: "Mes enfants", onBack: { router.back() })
            ScrollView {
                VStack(spacing: 10) {
                    ForEach(children ?? []) { c in
                        HStack {
                            InitialsAvatar(c.name.prefix(2).uppercased(), size: 44)
                            VStack(alignment: .leading) {
                                Text(c.name).font(AkFont.bold(14)).foregroundColor(Ak.ink)
                                Text(c.level).font(AkFont.regular(12)).foregroundColor(Ak.muted)
                            }
                            Spacer()
                        }.akCard()
                    }
                    AkButton("Exprimer un besoin") { router.go(.expressNeed) }
                }.padding(.horizontal, 22)
            }
        }
        .task { children = try? await ApiClient.shared.children() }
    }
}

@ViewBuilder
private func needField(_ label: String, text: Binding<String>) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(label).font(AkFont.medium(12)).foregroundColor(Ak.muted)
        TextField("", text: text).font(AkFont.medium(14)).padding(12).background(.white).clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }
}
