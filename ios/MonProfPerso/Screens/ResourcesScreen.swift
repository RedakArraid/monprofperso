import SwiftUI

/* ====================================================================== *
 * ÉCRAN UTILISATEUR, RESSOURCES & SUPPORTS (lecture seule)
 * Consomme /api/resources en live ; repli sur quelques exemples hors-ligne.
 * Les ressources sont publiées par l'admin (cours / devoirs / exercices).
 * ====================================================================== */
private let resourceFilters: [(value: String?, label: String)] = [
    (nil, "Tout"), ("course", "Cours"), ("homework", "Devoirs"), ("exercise", "Exercices"),
]
private func resTypeLabel(_ type: String) -> String {
    switch type { case "course": return "Cours"; case "homework": return "Devoir"; case "exercise": return "Exercice"; default: return type }
}
private func resTypeIcon(_ type: String) -> String {
    switch type { case "homework": return "square.and.pencil"; case "exercise": return "doc.text.fill"; default: return "book.fill" }
}

struct ResourcesScreen: View {
    @EnvironmentObject var router: Router
    @Environment(\.openURL) private var openURL
    @State private var all: [ResourceDTO]? = nil
    @State private var filter: String? = nil

    private var items: [ResourceDTO] {
        (all ?? []).filter { filter == nil || $0.type == filter }
    }

    var body: some View {
        AkScreen {
            TopBar(title: "Ressources & supports", subtitle: "Cours, devoirs & exercices", onBack: { router.back() })
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(resourceFilters, id: \.label) { f in
                        filterChip(f.label, selected: filter == f.value) { filter = f.value }
                    }
                }.padding(.horizontal, 22)
            }.padding(.vertical, 4)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if all == nil {
                        Text("Chargement…").font(AkFont.regular(13)).foregroundColor(Ak.faint)
                    } else if items.isEmpty {
                        Text("Aucune ressource disponible pour ce filtre.").font(AkFont.regular(13)).foregroundColor(Ak.faint)
                    }
                    VStack(spacing: 10) {
                        ForEach(items) { r in resourceCard(r) }
                    }
                    Spacer(minLength: 20)
                }
                .padding(.horizontal, 22).padding(.top, 8)
            }
        }
        .task {
            let live = try? await ApiClient.shared.resources()
            all = (live?.isEmpty == false ? live : Fallback.resources)
        }
    }

    private func filterChip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Text(label).font(AkFont.bold(12.5)).foregroundColor(selected ? .white : Ak.inkSoft)
            .padding(.horizontal, 14).padding(.vertical, 9)
            .background(selected ? Ak.green : .white)
            .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(Ak.border, lineWidth: selected ? 0 : 1))
            .contentShape(Rectangle()).onTapGesture(perform: action)
    }

    private func resourceCard(_ r: ResourceDTO) -> some View {
        let accent = r.type == "homework" ? Ak.orange : Ak.green
        let soft = r.type == "homework" ? Ak.orangeSoft : Ak.greenSoft
        let tags = [r.subject_slug, r.level].compactMap { $0 }.joined(separator: " · ")
        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: resTypeIcon(r.type)).font(.system(size: 18)).foregroundColor(accent)
                .frame(width: 40, height: 40).background(soft)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 8) {
                    Text(resTypeLabel(r.type)).font(AkFont.bold(10.5)).foregroundColor(accent)
                        .padding(.horizontal, 7).padding(.vertical, 2)
                        .background(soft).clipShape(RoundedRectangle(cornerRadius: 7))
                    if !tags.isEmpty { Text(tags).font(AkFont.regular(11)).foregroundColor(Ak.faint) }
                }
                Text(r.title).font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink)
                if let d = r.description, !d.isEmpty {
                    Text(d).font(AkFont.regular(12)).foregroundColor(Ak.muted)
                }
                if let f = r.file_name, !f.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "paperclip").font(.system(size: 11)).foregroundColor(Ak.green)
                        Text(f).font(AkFont.semibold(11.5)).foregroundColor(Ak.green)
                    }.padding(.top, 2)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
        .contentShape(Rectangle())
        .onTapGesture {
            guard let f = r.file_name, !f.isEmpty else { return }
            let url = ApiConfig.baseURL.appendingPathComponent("api/files/\(r.id)")
            // Les PDF s'ouvrent dans le visualiseur in-app ; les autres types en externe.
            let isPdf = r.mime_type == "application/pdf" || f.lowercased().hasSuffix(".pdf")
            if isPdf { router.go(.pdfViewer(url: url.absoluteString, title: r.title)) }
            else { openURL(url) }
        }
    }
}
