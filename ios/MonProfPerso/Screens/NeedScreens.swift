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
    @State private var level = ""
    @State private var subject = ""
    @State private var location = ""
    @State private var format = "home"
    @State private var frequency = "1 fois/sem"
    @State private var duration = "2h00"
    @State private var description = ""
    @State private var sending = false
    @State private var childrenLoaded = false
    @State private var error: String?

    var body: some View {
        AkScreen {
            TopBar(title: "Exprimer un besoin", subtitle: "Décrivez le besoin de votre enfant", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if childrenLoaded {
                        Picker("Élève", selection: $childId) {
                            Text("Nouvel élève ou sans enfant associé").tag(0)
                            ForEach(children) { child in Text("\(child.name) · \(child.level)").tag(child.id) }
                        }.onChange(of: childId) { id in
                            if let child = children.first(where: { $0.id == id }) { level = child.level }
                        }
                        if childId == 0 { needField("Prénom de l'enfant, facultatif", text: $name) }
                    } else {
                        Text("Chargement de vos enfants…")
                        if error != nil { Button("Réessayer") { Task { await loadChildren() } } }
                    }
                    needField("Matière", text: $subject)
                    needField("Niveau", text: $level)
                    Picker("Format", selection: $format) {
                        Text("À domicile").tag("home")
                        if router.featureEnabled("onlineCourses") { Text("En ligne").tag("online") }
                    }
                    needField("Lieu", text: $location)
                    needField("Fréquence", text: $frequency)
                    needField("Durée", text: $duration)
                    needField("Précisions", text: $description)
                    if let error { Text(error).font(AkFont.regular(12)).foregroundColor(Ak.orange) }
                    PrimaryButton(label: sending ? "Envoi…" : "Envoyer ma demande") {
                        Task { await submit() }
                    }.disabled(sending || !childrenLoaded || subject.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || level.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || (format == "home" && location.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)).padding(.top, 8)
                }.padding(.horizontal, 22).padding(.bottom, 20)
            }
        }
        .task { await loadChildren() }
    }

    @MainActor private func loadChildren() async {
        do {
            children = try await ApiClient.shared.children()
            childId = children.first?.id ?? 0
            level = children.first?.level ?? ""
            childrenLoaded = true; error = nil
        } catch { self.error = error.localizedDescription }
    }

    @MainActor private func submit() async {
        sending = true; error = nil
        defer { sending = false }
        do {
            var cid: Int? = childId > 0 ? childId : nil
            if cid == nil, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let child = try await ApiClient.shared.createChild(["name": name.trimmingCharacters(in: .whitespacesAndNewlines), "level": level])
                cid = child.id; childId = child.id; children.append(child)
            }
            var body: [String: Any] = ["subject": subject, "level": level, "format": format, "location": location, "frequency": frequency, "duration": duration]
            if let cid { body["childId"] = cid }
            if !description.isEmpty { body["description"] = description }
            _ = try await ApiClient.shared.createNeed(body)
            router.go(.myNeeds)
        } catch { self.error = error.localizedDescription }
    }
}

struct MyNeedsScreen: View {
    @EnvironmentObject var router: Router
    @State private var needs: [NeedDTO]?
    @State private var error: String?
    @State private var accepting = false

    var body: some View {
        AkScreen {
            TopBar(title: "Mes demandes", onBack: { router.back() })
            ScrollView {
                VStack(spacing: 12) {
                    if needs == nil { LoadingRow() }
                    if let error {
                        Text(error).font(AkFont.regular(13)).foregroundColor(Ak.danger)
                        Button("Réessayer") { Task { await reload() } }.foregroundColor(Ak.green)
                    }
                    if needs?.isEmpty == true && error == nil { Text("Aucune demande de cours pour le moment.") }
                    ForEach(needs ?? []) { n in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(n.reference).font(AkFont.regular(11)).foregroundColor(Ak.faint)
                            Text("\(n.subject) · \(n.level)").font(AkFont.bold(15)).foregroundColor(Ak.ink)
                            Text(needStatusLabel[n.status] ?? n.status).font(AkFont.regular(12)).foregroundColor(Ak.muted)
                            if let p = n.parentPrice {
                                Text("Tarif proposé : \(p.formattedFCFA) F / séance").font(AkFont.medium(13)).foregroundColor(Ak.ink)
                            }
                            if n.status == "priced" {
                                PrimaryButton(label: "Accepter ce tarif") {
                                    guard !accepting else { return }
                                    accepting = true; error = nil
                                    Task { @MainActor in
                                        defer { accepting = false }
                                        do { _ = try await ApiClient.shared.acceptNeedPrice(id: n.id); await reload() }
                                        catch { self.error = error.localizedDescription }
                                    }
                                }.disabled(accepting)
                            }
                            if let courseId = n.courseId {
                                Button("Convenir du créneau et suivre le cours") { router.selectedCourseId = courseId; router.go(.manageCourse) }.buttonStyle(.bordered)
                            }
                            if ["submitted", "priced", "published"].contains(n.status) {
                                Button("Annuler cette demande de cours", role: .destructive) {
                                    guard !accepting else { return }
                                    accepting = true; error = nil
                                    Task { @MainActor in
                                        defer { accepting = false }
                                        do { try await ApiClient.shared.cancelNeed(id: n.id); await reload() }
                                        catch { self.error = error.localizedDescription }
                                    }
                                }.buttonStyle(.bordered).disabled(accepting)
                            }
                        }.akCard()
                    }
                    PrimaryButton(label: "Nouvelle demande") { router.go(.expressNeed) }
                }.padding(.horizontal, 22).padding(.bottom, 20)
            }
        }
        .task { await reload() }
    }

    private func reload() async {
        do { needs = try await ApiClient.shared.needs(); error = nil }
        catch { needs = []; self.error = error.localizedDescription }
    }
}

struct MyChildrenScreen: View {
    @EnvironmentObject var router: Router
    @State private var children: [ChildDTO]?
    @State private var error: String?

    var body: some View {
        AkScreen {
            TopBar(title: "Mes enfants", onBack: { router.back() })
            ScrollView {
                VStack(spacing: 10) {
                    if children == nil { LoadingRow() }
                    if let error {
                        Text(error).foregroundColor(Ak.danger)
                        Button("Réessayer") { Task { await reload() } }
                    }
                    if children?.isEmpty == true && error == nil { Text("Aucun enfant enregistré. Vous pouvez en ajouter en décrivant un besoin de cours.") }
                    ForEach(children ?? []) { c in
                        HStack {
                            InitialsAvatar(initials: c.name.prefix(2).uppercased(), size: 44)
                            VStack(alignment: .leading) {
                                Text(c.name).font(AkFont.bold(14)).foregroundColor(Ak.ink)
                                Text(c.level).font(AkFont.regular(12)).foregroundColor(Ak.muted)
                            }
                            Spacer()
                        }.akCard()
                    }
                    PrimaryButton(label: "Exprimer un besoin") { router.go(.expressNeed) }
                }.padding(.horizontal, 22)
            }
        }
        .task { await reload() }
    }

    @MainActor private func reload() async {
        do { children = try await ApiClient.shared.children(); error = nil }
        catch { children = []; self.error = error.localizedDescription }
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
