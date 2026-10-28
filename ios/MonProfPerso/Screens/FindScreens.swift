import SwiftUI

/// Mappe l'icône logique d'une matière (API) vers un SF Symbol.
func sfSubjectIcon(_ name: String) -> String {
    switch name {
    case "function": return "function"
    case "atom": return "atom"
    case "book": return "book.fill"
    case "translate": return "character.bubble.fill"
    case "leaf": return "leaf.fill"
    case "brain": return "brain.head.profile"
    case "globe": return "globe.europe.africa.fill"
    default: return "ellipsis"
    }
}

// MARK: - Accueil
struct HomeScreen: View {
    @EnvironmentObject var router: Router
    @Environment(\.dynamicTypeSize) private var typeSize
    @StateObject private var store = HomeStore()
    var body: some View {
        AkScreen(ignoresBottom: true) {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    HStack(alignment: .center, spacing: 12) {
                        InitialsAvatar(initials: router.authFullName.split(separator: " ").prefix(2).map { String($0.prefix(1)) }.joined(), size: 48, radius: 16, fontSize: 18)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Bonjour,").font(AkFont.regular(14)).foregroundColor(Ak.muted)
                            Text(router.authFullName.isEmpty ? "Mon compte" : router.authFullName)
                                .font(AkFont.schibstedBold(21)).foregroundColor(Ak.ink).fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer(minLength: 0)
                        NotificationBell()
                    }
                    VStack(alignment: .leading, spacing: 18) {
                        if typeSize.isAccessibilitySize {
                            heroText
                            LearningArtwork().frame(maxWidth: 220)
                        } else {
                            HStack(alignment: .center, spacing: 12) {
                                heroText
                                LearningArtwork().frame(width: 120)
                            }
                        }
                        PrimaryButton(label: "Trouver un professeur", color: Ak.green, trailingSystemIcon: "magnifyingglass") {
                            router.go(.searchResults)
                        }.accessibilityIdentifier("home.search")
                    }.akCard(radius: 24, bg: Ak.greenSoft, bordered: false, padding: 18)
                    if router.featureEnabled("needs") {
                        AccountNavigationRow(title: "Décrire mon besoin de cours", icon: "square.and.pencil", identifier: "home.need") { router.go(.expressNeed) }
                    }
                    if !store.subjects.isEmpty {
                        VStack(alignment: .leading, spacing: 14) {
                            SectionHeader(title: "À chaque matière, son prof", action: nil)
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: typeSize.isAccessibilitySize ? 150 : 88), spacing: 12)], spacing: 12) {
                                ForEach(store.subjects) { subject in
                                    Button {
                                        router.searchQuery = subject.name
                                        router.go(.searchResults)
                                    } label: {
                                        VStack(spacing: 10) {
                                            Image(systemName: sfSubjectIcon(subject.icon)).font(.system(size: 24)).foregroundColor(Ak.green).accessibilityHidden(true)
                                            Text(subject.name).font(AkFont.semibold(13)).foregroundColor(Ak.ink)
                                                .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                                        }.frame(maxWidth: .infinity, minHeight: 78).padding(12)
                                            .background(.white).clipShape(RoundedRectangle(cornerRadius: 17))
                                            .overlay(RoundedRectangle(cornerRadius: 17).stroke(Ak.border, lineWidth: 1))
                                    }.buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    VStack(alignment: .leading, spacing: 14) {
                        SectionHeader(title: "Des professeurs à découvrir") { router.go(.searchResults) }
                        if store.loading { LoadingRow() }
                        else if let error = store.error {
                            ScreenState(icon: "wifi.slash", title: "Le catalogue est indisponible", message: error) { Task { await store.load() } }
                        } else if store.teachers.isEmpty {
                            ScreenState(icon: "person.crop.rectangle.badge.plus", title: "Le catalogue se prépare", message: "Aucun professeur n’est disponible pour le moment. Revenez consulter la recherche.")
                        } else {
                            ForEach(store.teachers.prefix(2)) { teacher in
                                TeacherPreviewCard(teacher: teacher) { router.selectedTeacherId = teacher.id; router.go(.teacherProfile) }
                            }
                        }
                    }
                }.padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 24)
            }.refreshable { await store.load() }.task { await store.load() }.accessibilityIdentifier("home.scroll")
            BottomNav(current: .accueil)
        }
    }
    private var heroText: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text("Apprendre,\navec confiance.").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.greenDark)
            Text("Un professeur et un suivi adaptés à votre enfant.").font(AkFont.regular(14)).foregroundColor(Ak.inkSoft)
        }.frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true)
    }
}

// MARK: - Écran 6, Résultats de recherche (données live via l'API commune)
struct SearchResultsScreen: View {
    @EnvironmentObject var router: Router
    @StateObject private var store = TeachersStore()
    var body: some View {
        AkScreen(ignoresBottom: true) {
            VStack(spacing: 12) {
                HStack(spacing: 13) {
                    IconSquare(system: "arrow.left") { router.back() }
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Profs de Maths").font(AkFont.schibstedExtra(18)).foregroundColor(Ak.ink)
                        Text(store.loading ? "Chargement…" : "\(store.teachers.count) profs · Cocody, Abidjan").font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                    }
                    Spacer()
                    IconSquare(system: "slider.horizontal.3", bg: Ak.green, tint: .white) { router.go(.filters) }
                }
                HStack(spacing: 8) {
                    Chip(label: "À domicile", selected: true, systemIcon: "house.fill")
                    Chip(label: "En ligne", systemIcon: "video.fill")
                    Chip(label: "3ᵉ (BEPC)")
                    Spacer()
                }
                if !store.loading {
                    Text(store.fromApi ? "● Professeurs disponibles" : "Chargement des professeurs indisponible")
                        .font(AkFont.semibold(11)).foregroundColor(store.fromApi ? Ak.green : Ak.faint)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }.padding(.horizontal, 22).padding(.top, 10).padding(.bottom, 12).background(.white)

            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(store.teachers) { t in card(t) }
                    }.padding(.horizontal, 22).padding(.top, 14).padding(.bottom, 70)
                }
                .task { await store.load() }
                HStack(spacing: 7) {
                    Image(systemName: "map.fill").font(.system(size: 15))
                    Text("Voir sur la carte").font(AkFont.bold(13.5))
                }.foregroundColor(.white).padding(.horizontal, 18).padding(.vertical, 11)
                .background(Ak.ink).clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous)).padding(.bottom, 16)
            }
        }
    }

    func card(_ t: TeacherDTO) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 13) {
                InitialsAvatar(initials: t.initials, size: 58, bg: t.isGreen ? Ak.greenSoft : Ak.orangeSoft, fg: t.isGreen ? Ak.green : Ak.orange, radius: 16, fontSize: 20, verified: t.verified)
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(t.name).font(AkFont.bold(15.5)).foregroundColor(Ak.ink)
                        Spacer()
                        HStack(spacing: 0) {
                            Text(t.priceLabel).font(AkFont.schibstedExtra(15)).foregroundColor(Ak.green)
                            Text("/h").font(AkFont.semibold(11)).foregroundColor(Ak.faint)
                        }
                    }
                    Text(t.subjects).font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                    HStack(spacing: 10) {
                        RatingInline(value: t.ratingLabel, reviews: "\(t.reviews_count) avis")
                        HStack(spacing: 2) {
                            Image(systemName: "mappin.and.ellipse").font(.system(size: 11)).foregroundColor(Ak.faint)
                            Text(t.distanceLabel).font(AkFont.regular(12)).foregroundColor(Ak.faint)
                        }
                    }.padding(.top, 4)
                }
            }
            HStack(spacing: 7) {
                Tag(label: "À domicile")
                if t.formats?.contains("online") ?? t.isGreen { Tag(label: "En ligne") }
                if t.special_bepc { Tag(label: "Spécial BEPC", fg: Ak.orange, bg: Ak.orangeSoft) }
            }.padding(.top, 12)
        }
        .akCard(radius: 20, padding: 15)
        .onTapGesture { router.selectedTeacherId = t.id; router.go(.teacherProfile) }
    }
}

// MARK: - Écran 7, Filtres
struct FiltersScreen: View {
    @EnvironmentObject var router: Router
    @State private var format: Set<Int> = [0, 1]
    @State private var niveau = 1
    @State private var matiere = 0
    @State private var distance = 0

    private func toggle(_ set: inout Set<Int>, _ i: Int) { if set.contains(i) { set.remove(i) } else { set.insert(i) } }

    var body: some View {
        AkScreen {
            HStack(spacing: 13) {
                IconSquare(system: "xmark") { router.back() }
                Text("Filtres").font(AkFont.schibstedExtra(18)).foregroundColor(Ak.ink)
                Spacer()
                Text("Réinitialiser").font(AkFont.bold(13)).foregroundColor(Ak.orange)
                    .onTapGesture { format = []; niveau = -1; matiere = -1; distance = -1 }
            }.padding(.horizontal, 22).padding(.vertical, 6)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    label("Format du cours")
                    HStack(spacing: 8) {
                        Chip(label: "À domicile", selected: format.contains(0), systemIcon: "house.fill").onTapGesture { toggle(&format, 0) }
                        Chip(label: "En ligne", selected: format.contains(1), systemIcon: "video.fill").onTapGesture { toggle(&format, 1) }
                        Spacer()
                    }
                    label("Niveau scolaire", top: 20)
                    HStack(spacing: 8) { chips(["Primaire", "Collège", "Lycée", "Supérieur"], niveau) { niveau = $0 } }
                    label("Matière", top: 20)
                    HStack(spacing: 8) { chips(["Mathématiques", "Physique-Chimie"], matiere) { matiere = $0 } }
                    HStack { Text("Tarif horaire").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink); Spacer(); Text("1 000 – 6 000 F").font(AkFont.bold(13)).foregroundColor(Ak.green) }.padding(.top, 20)
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color(hex: 0xEAE5DC)).frame(height: 6)
                        Capsule().fill(Ak.green).frame(width: 200, height: 6).offset(x: 40)
                    }.padding(.vertical, 18).padding(.horizontal, 8)
                    HStack { Text("Note minimale").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink); Spacer(); RatingInline(value: "4,5 et plus") }
                    label("Distance", top: 20)
                    HStack(spacing: 8) { chips(["Moins de 2 km", "5 km", "10 km"], distance) { distance = $0 } }
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            PrimaryButton(label: "Voir 36 professeurs", trailingSystemIcon: nil) { router.go(.searchResults) }
                .padding(.horizontal, 22).padding(.vertical, 14).background(.white)
        }
    }
    func label(_ t: String, top: CGFloat = 0) -> some View {
        Text(t).font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, top).padding(.bottom, 11)
    }
    /// Rangée de chips à sélection unique.
    @ViewBuilder func chips(_ options: [String], _ selected: Int, _ onSelect: @escaping (Int) -> Void) -> some View {
        ForEach(Array(options.enumerated()), id: \.offset) { i, label in
            Chip(label: label, selected: i == selected).onTapGesture { onSelect(i) }
        }
        Spacer()
    }
}

// MARK: - Écran 8, Profil du professeur (données live via l'API commune)
struct TeacherProfileScreen: View {
    @EnvironmentObject var router: Router
    @StateObject private var store = TeacherStore()
    var body: some View {
        Group {
            if let teacher = store.teacher { profile(teacher) }
            else {
                AkScreen {
                    TopBar(title: "Profil professeur", onBack: { router.back() })
                    if let error = store.error {
                        Text(error).font(AkFont.regular(14)).foregroundColor(Ak.danger).padding(22)
                        Button("Réessayer") { Task { await load() } }.foregroundColor(Ak.green)
                    } else { LoadingRow() }
                    Spacer()
                }
            }
        }.task { await load() }
    }

    private func load() async {
        guard let id = router.selectedTeacherId else { store.error = "Sélectionnez un professeur dans la recherche."; return }
        await store.load(id)
    }

    private func profile(_ teacher: TeacherDTO) -> some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: "Profil professeur", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 17) {
                        HStack(alignment: .top, spacing: 15) {
                            InitialsAvatar(initials: teacher.initials, size: 68, bg: Ak.greenSoft, fg: Ak.green, radius: 21, fontSize: 24, verified: teacher.verified)
                                .accessibilityHidden(true)
                            VStack(alignment: .leading, spacing: 8) {
                                Text(teacher.name).font(AkFont.schibstedExtra(24)).foregroundColor(.white)
                                Text(teacher.subjects).font(AkFont.regular(15)).foregroundColor(Ak.onGreenSoft)
                            }.fixedSize(horizontal: false, vertical: true)
                        }
                        Label(teacher.location, systemImage: "mappin.and.ellipse").font(AkFont.regular(14)).foregroundColor(Ak.onGreenSoft)
                        Text(teacher.ratingLabel + (teacher.reviews_count > 0 ? " · \(teacher.reviews_count) avis" : ""))
                            .font(AkFont.bold(14)).foregroundColor(.white)
                        FlowLayout(spacing: 8) {
                            if teacher.verified { Tag(label: "Profil vérifié") }
                            if teacher.formats?.contains("home") == true { Tag(label: "À domicile") }
                            if router.featureEnabled("onlineCourses"), teacher.formats?.contains("online") == true { Tag(label: "En ligne") }
                        }
                    }.akCard(radius: 24, bg: Ak.green, bordered: false, padding: 20)
                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(title: "À propos", action: nil)
                        Text(teacher.bio?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? teacher.bio! : "La présentation de ce professeur n’est pas encore renseignée.")
                            .font(AkFont.regular(16)).foregroundColor(Ak.textBody).lineSpacing(4).fixedSize(horizontal: false, vertical: true)
                        if let experience = teacher.experience, !experience.isEmpty {
                            Label(experience + " d’expérience", systemImage: "briefcase").font(AkFont.semibold(14)).foregroundColor(Ak.green)
                        }
                    }.akCard(radius: 20, padding: 18)
                    if let levels = teacher.levels, !levels.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionHeader(title: "Niveaux accompagnés", action: nil)
                            FlowLayout(spacing: 8) { ForEach(levels, id: \.self) { Tag(label: $0, fg: Ak.inkSoft, bg: Ak.cardField) } }
                        }
                    }
                    if let programs = teacher.programs, !programs.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionHeader(title: "Programmes", action: nil)
                            FlowLayout(spacing: 8) { ForEach(programs, id: \.self) { Tag(label: programLabel($0), fg: Ak.inkSoft, bg: Ak.cardField) } }
                        }
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        SectionHeader(title: "Avis des parents", action: nil)
                        if (teacher.reviews ?? []).isEmpty {
                            Text("Aucun avis pour le moment.").font(AkFont.regular(15)).foregroundColor(Ak.muted)
                        }
                        ForEach(Array((teacher.reviews ?? []).enumerated()), id: \.offset) { _, review in
                            VStack(alignment: .leading, spacing: 12) {
                                HStack(alignment: .top, spacing: 12) {
                                    InitialsAvatar(initials: review.author_initials, size: 42, radius: 13, fontSize: 15).accessibilityHidden(true)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(review.author_name).font(AkFont.bold(15)).foregroundColor(Ak.ink)
                                        Text(review.time_ago).font(AkFont.regular(12)).foregroundColor(Ak.muted)
                                        Text("\(max(0, min(5, review.rating))) / 5").font(AkFont.semibold(13)).foregroundColor(Ak.green)
                                            .accessibilityLabel("\(review.rating) étoiles sur 5")
                                    }
                                }
                                Text(review.text).font(AkFont.regular(15)).foregroundColor(Ak.textBody).fixedSize(horizontal: false, vertical: true)
                            }.akCard(radius: 18, padding: 16)
                        }
                    }
                }.padding(20)
            }.accessibilityIdentifier("teacher.profile.scroll")
            VStack(alignment: .leading, spacing: 10) {
                Text("\(teacher.price_per_hour.formattedFCFA) F CFA / heure").font(AkFont.schibstedBold(19)).foregroundColor(Ak.ink)
                    .fixedSize(horizontal: false, vertical: true)
                PrimaryButton(label: "Réserver un cours") { router.startBooking(teacher); router.go(.booking) }
                    .accessibilityIdentifier("teacher.book")
            }.padding(.horizontal, 20).padding(.vertical, 12).background(.white)
        }
    }

    private func programLabel(_ slug: String) -> String {
        switch slug {
        case "standard": return "Programme standard"
        case "francais": return "Programme français"
        default: return slug.prefix(1).uppercased() + slug.dropFirst()
        }
    }
}
