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

// MARK: - Écran 5 — Accueil
struct HomeScreen: View {
    @EnvironmentObject var router: Router
    @StateObject private var store = HomeStore()
    var body: some View {
        AkScreen(ignoresBottom: true) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 11) {
                        InitialsAvatar(initials: "AK", size: 44, radius: 13, fontSize: 17)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Bonjour,").font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                            Text("Aya Koné").font(AkFont.bold(16)).foregroundColor(Ak.ink)
                        }
                        Spacer()
                        IconSquare(system: "bell", bg: .white, tint: Ak.inkSoft, size: 44) { router.go(.notifications) }
                            .overlay(alignment: .topTrailing) {
                                Circle().fill(Ak.orange).frame(width: 8, height: 8)
                                    .overlay(Circle().stroke(.white, lineWidth: 2)).offset(x: -10, y: 11)
                            }
                    }
                    Button { router.go(.searchResults) } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "magnifyingglass").font(.system(size: 18)).foregroundColor(Ak.faint)
                            Text("Rechercher une matière, un prof…").font(AkFont.regular(14.5)).foregroundColor(Ak.faint)
                            Spacer()
                        }.padding(.horizontal, 16).padding(.vertical, 14)
                        .background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 15).stroke(Ak.border, lineWidth: 1))
                    }.buttonStyle(.plain).padding(.top, 16)

                    // promo
                    VStack(alignment: .leading, spacing: 0) {
                        Pill(text: "SESSION 2026", fg: Ak.green, bg: Ak.orangeLight)
                        Text("Prépa BEPC & BAC\nen petits groupes").font(AkFont.schibstedExtra(19)).foregroundColor(.white).padding(.top, 10)
                        HStack(spacing: 7) {
                            Text("Découvrir").font(AkFont.bold(13)).foregroundColor(.white)
                                .padding(.horizontal, 14).padding(.vertical, 8).background(Ak.orange)
                                .clipShape(RoundedRectangle(cornerRadius: 10)).onTapGesture { router.go(.groupCourses) }
                            Text("dès 2 000 F / séance").font(AkFont.regular(12.5)).foregroundColor(Ak.onGreenSoft)
                        }.padding(.top, 13)
                    }.padding(18).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous)).padding(.top, 16)

                    SectionHeader(title: "Matières", action: nil).padding(.top, 20)
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
                        ForEach(store.subjects) { s in
                            let green = s.accent == "green"
                            VStack(spacing: 7) {
                                Image(systemName: sfSubjectIcon(s.icon)).font(.system(size: 22)).foregroundColor(green ? Ak.green : Ak.orange)
                                    .frame(maxWidth: .infinity).frame(height: 64)
                                    .background(green ? Ak.greenSoft : Ak.orangeSoft)
                                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                                Text(s.name).font(AkFont.semibold(11.5)).foregroundColor(Ak.inkSoft)
                            }.onTapGesture { router.go(.searchResults) }
                        }
                    }.padding(.top, 13)

                    SectionHeader(title: "Profs recommandés") { router.go(.searchResults) }.padding(.top, 20)
                    if store.teachers.isEmpty {
                        recoTeacher("KN", "Koffi N'Guessan", "Maths · Physique-Chimie", "4,9", "128 avis", "Cocody", "4 000 F", true).padding(.top, 13)
                        recoTeacher("MT", "Mariam Touré", "Anglais · Espagnol", "5,0", "74 avis", "Plateau", "4 500 F", false).padding(.top, 11)
                    } else {
                        ForEach(Array(store.teachers.prefix(2).enumerated()), id: \.element.id) { i, t in
                            recoTeacher(t.initials, t.name, t.subjects, t.ratingLabel, "\(t.reviews_count) avis", t.location, t.priceLabel, t.isGreen).padding(.top, i == 0 ? 13 : 11)
                        }
                    }
                }.padding(.horizontal, 22).padding(.top, 8).padding(.bottom, 16)
            }
            .task { await store.load() }
            BottomNav(current: .accueil)
        }
    }

    func recoTeacher(_ ini: String, _ name: String, _ subj: String, _ rating: String, _ reviews: String, _ place: String, _ price: String, _ green: Bool) -> some View {
        HStack(spacing: 13) {
            InitialsAvatar(initials: ini, size: 54, bg: green ? Ak.greenSoft : Ak.orangeSoft, fg: green ? Ak.green : Ak.orange, verified: true)
            VStack(alignment: .leading, spacing: 1) {
                Text(name).font(AkFont.bold(15)).foregroundColor(Ak.ink)
                Text(subj).font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                RatingInline(value: rating, reviews: reviews, place: place).padding(.top, 5)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 0) {
                Text(price).font(AkFont.schibstedExtra(15)).foregroundColor(Ak.green)
                Text("/ heure").font(AkFont.regular(11)).foregroundColor(Ak.faint)
            }
        }
        .akCard(radius: 18)
        .onTapGesture { router.go(.teacherProfile) }
    }
}

// MARK: - Écran 6 — Résultats de recherche (données live via l'API commune)
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
                    Text(store.fromApi ? "● Données en direct (API Mon Prof Perso)" : "○ Mode hors-ligne (données locales)")
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
        .onTapGesture { router.go(.teacherProfile) }
    }
}

// MARK: - Écran 7 — Filtres
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

// MARK: - Écran 8 — Profil du professeur (données live via l'API commune)
struct TeacherProfileScreen: View {
    @EnvironmentObject var router: Router
    @StateObject private var store = TeacherStore()
    var body: some View {
        let t = store.teacher
        let levels = t.levels ?? ["Collège", "Lycée", "Prépa BEPC", "Prépa BAC"]
        let review = t.reviews?.first
        return AkScreen(ignoresBottom: true) {
            // header vert
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    IconSquare(system: "arrow.left", bg: .white.opacity(0.14), tint: .white) { router.back() }
                    Spacer()
                    IconSquare(system: "heart", bg: .white.opacity(0.14), tint: .white)
                }
                HStack(spacing: 15) {
                    InitialsAvatar(initials: t.initials, size: 76, bg: Ak.orangeLight, fg: Ak.green, radius: 22, fontSize: 27, verified: true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(t.name).font(AkFont.schibstedExtra(22)).foregroundColor(.white)
                        Text(t.subjects).font(AkFont.regular(13.5)).foregroundColor(Ak.onGreenSoft)
                        HStack(spacing: 8) {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill").font(.system(size: 11)).foregroundColor(Ak.star)
                                Text("\(t.ratingLabel) · \(t.reviews_count) avis").font(AkFont.bold(12.5)).foregroundColor(.white)
                            }.padding(.horizontal, 9).padding(.vertical, 4).background(.white.opacity(0.15)).clipShape(RoundedRectangle(cornerRadius: 8))
                            HStack(spacing: 2) {
                                Image(systemName: "mappin.and.ellipse").font(.system(size: 11)).foregroundColor(Ak.onGreenSoft)
                                Text(t.location).font(AkFont.regular(12)).foregroundColor(Ak.onGreenSoft)
                            }
                        }.padding(.top, 7)
                    }
                    Spacer()
                }.padding(.top, 14)
            }.padding(.horizontal, 22).padding(.top, 6).padding(.bottom, 22).background(Ak.green)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 10) {
                        statTile(t.experience ?? "8 ans", "expérience"); statTile(t.students ?? "340+", "élèves suivis"); statTile(t.bac_success ?? "94%", "réussite BAC")
                    }
                    Text("À propos").font(AkFont.schibstedBold(16)).foregroundColor(Ak.ink).padding(.top, 18)
                    Text(t.bio ?? "Professeur certifié, ancien du Lycée Classique d'Abidjan. J'accompagne les élèves de la 3ᵉ à la Terminale avec une méthode claire et beaucoup d'exercices types examen.")
                        .font(AkFont.regular(13.5)).foregroundColor(Ak.textBody).lineSpacing(4).padding(.top, 8)
                    HStack(spacing: 7) { ForEach(levels, id: \.self) { neutralTag($0) } }.padding(.top, 14)
                    SectionHeader(title: "Avis des parents").padding(.top, 18)
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 10) {
                            InitialsAvatar(initials: review?.author_initials ?? "FB", size: 36, bg: Ak.orangeSoft, fg: Ak.orange, radius: 11, fontSize: 13)
                            VStack(alignment: .leading, spacing: 0) {
                                Text(review?.author_name ?? "Fatou B.").font(AkFont.bold(13.5)).foregroundColor(Ak.ink)
                                Text(review?.time_ago ?? "il y a 2 semaines").font(AkFont.regular(11)).foregroundColor(Ak.faint)
                            }
                            Spacer()
                            HStack(spacing: 1) { ForEach(0..<5, id: \.self) { _ in Image(systemName: "star.fill").font(.system(size: 11)).foregroundColor(Ak.star) } }
                        }
                        Text(review?.text ?? "Ma fille est passée de 9 à 14 en maths en un trimestre. Très pédagogue et toujours ponctuel. Je recommande vivement !")
                            .font(AkFont.regular(13)).foregroundColor(Ak.textBody).lineSpacing(3).padding(.top, 9)
                    }.akCard(radius: 16, padding: 14).padding(.top, 11)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            .task { await store.load() }
            // CTA collant
            VStack(spacing: 12) {
                HStack(spacing: 10) {
                    Image(systemName: "crown.fill").font(.system(size: 17)).foregroundColor(Ak.green)
                    Text("Suivi régulier ? Abonnez-vous dès 14 000 F/mois").font(AkFont.regular(12.5)).foregroundColor(Ak.ink)
                    Spacer()
                    Image(systemName: "arrow.right").font(.system(size: 13, weight: .bold)).foregroundColor(Ak.green)
                }.padding(.horizontal, 13).padding(.vertical, 11).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 13)).onTapGesture { router.go(.subscriptionPlans) }
                HStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 0) {
                            Text("4 000 F").font(AkFont.schibstedExtra(21)).foregroundColor(Ak.ink)
                            Text("/h").font(AkFont.semibold(13)).foregroundColor(Ak.faint)
                        }
                        Text("1ᵉʳ cours d'essai -50%").font(AkFont.regular(11.5)).foregroundColor(Ak.muted)
                    }
                    PrimaryButton(label: "Réserver un cours") { router.go(.booking) }
                }
            }.padding(.horizontal, 22).padding(.top, 12).padding(.bottom, 12).background(.white)
        }
    }

    func statTile(_ v: String, _ l: String) -> some View {
        VStack(spacing: 2) {
            Text(v).font(AkFont.schibstedExtra(19)).foregroundColor(Ak.green)
            Text(l).font(AkFont.regular(11)).foregroundColor(Ak.muted)
        }.frame(maxWidth: .infinity).padding(.vertical, 13)
        .background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
    }
    func neutralTag(_ t: String) -> some View {
        Text(t).font(AkFont.semibold(12)).foregroundColor(Ak.inkSoft)
            .padding(.horizontal, 12).padding(.vertical, 7).background(Ak.cardField).clipShape(RoundedRectangle(cornerRadius: 9))
    }
}
