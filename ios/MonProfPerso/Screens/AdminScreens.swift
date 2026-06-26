import SwiftUI

/* ====================================================================== *
 * ÉCRAN ADMIN — GÉRER LE CATALOGUE (matières & niveaux)
 * Réservé au rôle admin ; les écritures appellent les routes /api/admin/… en live.
 * Pendant iOS du AdminCatalogScreen Android (mêmes endpoints, même UI).
 * ====================================================================== */

/// Translittère un libellé en slug ASCII (« Espagnol » → « espagnol »).
private func slugify(_ input: String) -> String {
    let folded = input.folding(options: .diacriticInsensitive, locale: .current).lowercased()
    let mapped = folded.map { ch -> Character in
        (ch.isLetter && ch.isASCII) || ch.isNumber ? ch : "-"
    }
    let collapsed = String(mapped).split(separator: "-", omittingEmptySubsequences: true).joined(separator: "-")
    return collapsed
}

struct AdminCatalogScreen: View {
    @EnvironmentObject var router: Router
    @State private var subjects: [SubjectDTO] = []
    @State private var levels: [LevelDTO] = []
    @State private var newSubject = ""
    @State private var newSubjectAccent = "green"
    @State private var newLevel = ""
    @State private var message: String? = nil

    var body: some View {
        AkScreen {
            TopBar(title: "Gérer le catalogue", subtitle: "Espace administrateur", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {

                    // ---------------------------------------------------- Matières
                    sectionTitle("Matières", count: subjects.count)
                    adminField(text: $newSubject, placeholder: "Ex. Musique, Espagnol…").padding(.top, 10)
                    HStack(spacing: 8) {
                        Text("Couleur").font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                        accentDot("green")
                        accentDot("orange")
                        Spacer()
                        addButton(enabled: !newSubject.trimmed.isEmpty, action: addSubject)
                    }.padding(.top, 8)

                    VStack(spacing: 9) {
                        ForEach(subjects) { s in
                            catalogRow(name: s.name, slug: s.slug, accent: s.accent) { deleteSubject(s) }
                        }
                    }.padding(.top, 14)

                    // ---------------------------------------------------- Niveaux
                    sectionTitle("Niveaux", count: levels.count).padding(.top, 22)
                    HStack(spacing: 10) {
                        adminField(text: $newLevel, placeholder: "Ex. Université, Master…")
                        addButton(enabled: !newLevel.trimmed.isEmpty, action: addLevel)
                    }.padding(.top, 10)

                    VStack(spacing: 9) {
                        ForEach(levels) { l in
                            catalogRow(name: l.name, slug: l.slug, accent: "green") { deleteLevel(l) }
                        }
                    }.padding(.top, 14)

                    if let message {
                        Text(message).font(AkFont.semibold(12.5)).foregroundColor(Ak.green).padding(.top, 16)
                    }
                    Spacer(minLength: 20)
                }
                .padding(.horizontal, 22).padding(.top, 8)
            }
        }
        .task { await reload() }
    }

    // MARK: Données
    private func reload() async {
        if let s = try? await ApiClient.shared.subjects() { subjects = s }
        if let l = try? await ApiClient.shared.levels() { levels = l }
    }

    private func addSubject() {
        let slug = slugify(newSubject)
        guard !slug.isEmpty else { return }
        Task { @MainActor in
            do {
                _ = try await ApiClient.shared.createSubject(slug: slug, name: newSubject.trimmed, accent: newSubjectAccent)
                newSubject = ""; message = "Matière ajoutée"; await reload()
            } catch { message = "Échec : matière déjà existante ?" }
        }
    }

    private func deleteSubject(_ s: SubjectDTO) {
        Task { @MainActor in
            if (try? await ApiClient.shared.deleteSubject(slug: s.slug)) != nil { message = "Matière supprimée"; await reload() }
        }
    }

    private func addLevel() {
        let slug = slugify(newLevel)
        guard !slug.isEmpty else { return }
        Task { @MainActor in
            do {
                _ = try await ApiClient.shared.createLevel(slug: slug, name: newLevel.trimmed, ord: levels.count + 1)
                newLevel = ""; message = "Niveau ajouté"; await reload()
            } catch { message = "Échec : niveau déjà existant ?" }
        }
    }

    private func deleteLevel(_ l: LevelDTO) {
        Task { @MainActor in
            if (try? await ApiClient.shared.deleteLevel(slug: l.slug)) != nil { message = "Niveau supprimé"; await reload() }
        }
    }

    // MARK: Sous-vues
    private func sectionTitle(_ title: String, count: Int) -> some View {
        HStack(spacing: 8) {
            Text(title).font(AkFont.schibstedExtra(18)).foregroundColor(Ak.ink)
            Text("\(count)").font(AkFont.bold(11.5)).foregroundColor(Ak.green)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private func adminField(text: Binding<String>, placeholder: String) -> some View {
        TextField("", text: text, prompt: Text(placeholder).foregroundColor(Ak.faint))
            .font(AkFont.regular(14)).foregroundColor(Ak.ink).tint(Ak.green)
            .padding(.horizontal, 14).padding(.vertical, 13)
            .background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }

    private func accentDot(_ accent: String) -> some View {
        let selected = newSubjectAccent == accent
        let c = accent == "orange" ? Ak.orange : Ak.green
        return RoundedRectangle(cornerRadius: 8, style: .continuous).fill(c).frame(width: 26, height: 26)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Ak.ink, lineWidth: selected ? 2 : 0))
            .contentShape(Rectangle()).onTapGesture { newSubjectAccent = accent }
    }

    private func addButton(enabled: Bool, action: @escaping () -> Void) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "plus").font(.system(size: 13, weight: .bold))
            Text("Ajouter").font(AkFont.bold(13))
        }
        .foregroundColor(.white)
        .padding(.horizontal, 16).padding(.vertical, 11)
        .background(enabled ? Ak.green : Ak.border)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .contentShape(Rectangle())
        .onTapGesture { if enabled { action() } }
    }

    private func catalogRow(name: String, slug: String, accent: String, onDelete: @escaping () -> Void) -> some View {
        let dot = accent == "orange" ? Ak.orange : Ak.green
        return HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 3, style: .continuous).fill(dot).frame(width: 10, height: 10)
            VStack(alignment: .leading, spacing: 1) {
                Text(name).font(AkFont.bold(14)).foregroundColor(Ak.ink)
                Text(slug).font(AkFont.regular(11.5)).foregroundColor(Ak.faint)
            }
            Spacer()
            Image(systemName: "xmark").font(.system(size: 13, weight: .bold)).foregroundColor(Ak.orange)
                .frame(width: 30, height: 30).background(Ak.orangeSoft)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                .contentShape(Rectangle()).onTapGesture(perform: onDelete)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }
}

/* ====================================================================== *
 * ÉCRAN ADMIN — RESSOURCES PÉDAGOGIQUES (cours / devoirs / exercices)
 * Création de métadonnées (titre, matière, niveau, description) ; le fichier
 * reste optionnel côté API. Écritures en live sur les routes /api/admin/resources.
 * ====================================================================== */
private let resourceTypes: [(value: String, label: String)] = [
    ("course", "Cours"), ("homework", "Devoir"), ("exercise", "Exercice"),
]
private func resourceTypeLabel(_ type: String) -> String {
    resourceTypes.first { $0.value == type }?.label ?? type
}

struct AdminResourcesScreen: View {
    @EnvironmentObject var router: Router
    @State private var subjects: [SubjectDTO] = []
    @State private var levels: [LevelDTO] = []
    @State private var resources: [ResourceDTO] = []
    @State private var type = "course"
    @State private var title = ""
    @State private var subjectSlug: String? = nil
    @State private var level: String? = nil
    @State private var desc = ""
    @State private var message: String? = nil

    var body: some View {
        AkScreen {
            TopBar(title: "Ressources pédagogiques", subtitle: "Espace administrateur", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {

                    fieldLabel("Type")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(resourceTypes, id: \.value) { t in
                                pickChip(t.label, selected: type == t.value) { type = t.value }
                            }
                        }
                    }.padding(.top, 8)

                    fieldLabel("Titre").padding(.top, 14)
                    adminField(text: $title, placeholder: "Ex. Fiche de révision — Théorème de Thalès").padding(.top, 8)

                    fieldLabel("Matière (facultatif)").padding(.top, 14)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            pickChip("Aucune", selected: subjectSlug == nil) { subjectSlug = nil }
                            ForEach(subjects) { s in
                                pickChip(s.name, selected: subjectSlug == s.slug) { subjectSlug = s.slug }
                            }
                        }
                    }.padding(.top, 8)

                    fieldLabel("Niveau (facultatif)").padding(.top, 14)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            pickChip("Aucun", selected: level == nil) { level = nil }
                            ForEach(levels) { l in
                                pickChip(l.name, selected: level == l.slug) { level = l.slug }
                            }
                        }
                    }.padding(.top, 8)

                    fieldLabel("Description (facultatif)").padding(.top, 14)
                    descField(text: $desc, placeholder: "Quelques mots sur la ressource…").padding(.top, 8)

                    HStack {
                        Spacer()
                        addButton(enabled: !title.trimmed.isEmpty, action: addResource)
                    }.padding(.top, 14)

                    sectionTitle("Ressources", count: resources.count).padding(.top, 22)
                    if resources.isEmpty {
                        Text("Aucune ressource pour l'instant.").font(AkFont.regular(13)).foregroundColor(Ak.faint).padding(.top, 12)
                    }
                    VStack(spacing: 9) {
                        ForEach(resources) { r in resourceRow(r) }
                    }.padding(.top, 12)

                    if let message {
                        Text(message).font(AkFont.semibold(12.5)).foregroundColor(Ak.green).padding(.top, 16)
                    }
                    Spacer(minLength: 20)
                }
                .padding(.horizontal, 22).padding(.top, 8)
            }
        }
        .task { await reload() }
    }

    private func reload() async {
        if let s = try? await ApiClient.shared.subjects() { subjects = s }
        if let l = try? await ApiClient.shared.levels() { levels = l }
        if let r = try? await ApiClient.shared.resources() { resources = r }
    }

    private func addResource() {
        Task { @MainActor in
            do {
                _ = try await ApiClient.shared.createResource(type: type, title: title.trimmed,
                                                              subjectSlug: subjectSlug, level: level, description: desc.trimmed)
                title = ""; desc = ""; subjectSlug = nil; level = nil
                message = "Ressource ajoutée"; await reload()
            } catch { message = "Échec de l'ajout" }
        }
    }

    private func deleteResource(_ r: ResourceDTO) {
        Task { @MainActor in
            if (try? await ApiClient.shared.deleteResource(id: r.id)) != nil { message = "Ressource supprimée"; await reload() }
        }
    }

    // MARK: Sous-vues
    private func fieldLabel(_ text: String) -> some View {
        Text(text).font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
    }

    private func adminField(text: Binding<String>, placeholder: String) -> some View {
        TextField("", text: text, prompt: Text(placeholder).foregroundColor(Ak.faint))
            .font(AkFont.regular(14)).foregroundColor(Ak.ink).tint(Ak.green)
            .padding(.horizontal, 14).padding(.vertical, 13)
            .background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }

    private func descField(text: Binding<String>, placeholder: String) -> some View {
        TextField("", text: text, prompt: Text(placeholder).foregroundColor(Ak.faint), axis: .vertical)
            .lineLimit(3...5)
            .font(AkFont.regular(14)).foregroundColor(Ak.ink).tint(Ak.green)
            .padding(.horizontal, 14).padding(.vertical, 13)
            .background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }

    private func pickChip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Text(label).font(AkFont.bold(12.5)).foregroundColor(selected ? .white : Ak.inkSoft)
            .padding(.horizontal, 14).padding(.vertical, 9)
            .background(selected ? Ak.green : .white)
            .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(Ak.border, lineWidth: selected ? 0 : 1))
            .contentShape(Rectangle()).onTapGesture(perform: action)
    }

    private func sectionTitle(_ title: String, count: Int) -> some View {
        HStack(spacing: 8) {
            Text(title).font(AkFont.schibstedExtra(18)).foregroundColor(Ak.ink)
            Text("\(count)").font(AkFont.bold(11.5)).foregroundColor(Ak.green)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private func addButton(enabled: Bool, action: @escaping () -> Void) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "plus").font(.system(size: 13, weight: .bold))
            Text("Ajouter").font(AkFont.bold(13))
        }
        .foregroundColor(.white)
        .padding(.horizontal, 16).padding(.vertical, 11)
        .background(enabled ? Ak.green : Ak.border)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .contentShape(Rectangle())
        .onTapGesture { if enabled { action() } }
    }

    private func resourceRow(_ r: ResourceDTO) -> some View {
        let accent = r.type == "homework" ? Ak.orange : Ak.green
        let soft = r.type == "homework" ? Ak.orangeSoft : Ak.greenSoft
        let tags = [r.subject_slug, r.level].compactMap { $0 }.joined(separator: " · ")
        return HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(resourceTypeLabel(r.type)).font(AkFont.bold(10.5)).foregroundColor(accent)
                        .padding(.horizontal, 7).padding(.vertical, 2)
                        .background(soft).clipShape(RoundedRectangle(cornerRadius: 7))
                    if !tags.isEmpty { Text(tags).font(AkFont.regular(11)).foregroundColor(Ak.faint) }
                }
                Text(r.title).font(AkFont.bold(14)).foregroundColor(Ak.ink)
                if let d = r.description, !d.isEmpty {
                    Text(d).font(AkFont.regular(11.5)).foregroundColor(Ak.muted)
                }
            }
            Spacer()
            Image(systemName: "xmark").font(.system(size: 13, weight: .bold)).foregroundColor(Ak.orange)
                .frame(width: 30, height: 30).background(Ak.orangeSoft)
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                .contentShape(Rectangle()).onTapGesture { deleteResource(r) }
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }
}

private extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}
