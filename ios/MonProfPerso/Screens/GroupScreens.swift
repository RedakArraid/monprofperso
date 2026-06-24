import SwiftUI

// MARK: - Écran 26 — Cours en groupe (liste)
private struct Grp: Identifiable {
    let id = UUID(); let tag: String; let tagGreen: Bool; let price: String; let title: String; let detail: String
    let ini: String; let teacherGreen: Bool; let teacher: String; let enrolled: String?; let left: String?; let leftWarn: Bool; let fraction: CGFloat
}

struct GroupCoursesScreen: View {
    @EnvironmentObject var router: Router
    private let groups: [Grp] = [
        .init(tag: "PRÉPA BAC", tagGreen: false, price: "2 000 F", title: "Maths & Physique-Chimie", detail: "Terminale D · 8 semaines · Sam & Dim", ini: "KN", teacherGreen: true, teacher: "Koffi N'Guessan", enrolled: "9 / 12 inscrits", left: "3 places restantes", leftWarn: true, fraction: 0.75),
        .init(tag: "PRÉPA BEPC", tagGreen: true, price: "1 500 F", title: "Maths intensif", detail: "3ᵉ · 6 semaines · Mer & Sam", ini: "ID", teacherGreen: false, teacher: "Ibrahim Diallo", enrolled: "6 / 10 inscrits", left: "4 places restantes", leftWarn: false, fraction: 0.60),
        .init(tag: "VACANCES", tagGreen: true, price: "1 500 F", title: "Stage de Français", detail: "Collège · 2 semaines · Lun → Ven", ini: "", teacherGreen: true, teacher: "", enrolled: nil, left: nil, leftWarn: false, fraction: 0),
    ]
    var body: some View {
        AkScreen {
            TopBar(title: "Cours en groupe", subtitle: "Prépa examens en petit comité", onBack: { router.back() })
            HStack(spacing: 8) { PillTab(label: "Tous", selected: true); PillTab(label: "BEPC", selected: false); PillTab(label: "BAC", selected: false); PillTab(label: "Vacances", selected: false); Spacer() }
                .padding(.horizontal, 22).padding(.top, 8)
            ScrollView {
                VStack(spacing: 13) { ForEach(groups) { g in card(g) } }.padding(.horizontal, 22).padding(.top, 16)
            }
        }
    }
    private func card(_ g: Grp) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Tag(label: g.tag, fg: g.tagGreen ? Ak.green : Ak.orange, bg: g.tagGreen ? Ak.greenSoft : Ak.orangeSoft)
                Spacer()
                HStack(spacing: 0) { Text(g.price).font(AkFont.schibstedExtra(14)).foregroundColor(Ak.green); Text("/séance").font(AkFont.semibold(11)).foregroundColor(Ak.faint) }
            }
            Text(g.title).font(AkFont.schibstedExtra(16.5)).foregroundColor(Ak.ink).padding(.top, 11)
            Text(g.detail).font(AkFont.regular(12.5)).foregroundColor(Ak.muted).padding(.top, 2)
            if !g.teacher.isEmpty {
                HStack(spacing: 8) {
                    InitialsAvatar(initials: g.ini, size: 30, bg: g.teacherGreen ? Ak.greenSoft : Ak.orangeSoft, fg: g.teacherGreen ? Ak.green : Ak.orange, radius: 9, fontSize: 11)
                    Text("avec \(g.teacher)").font(AkFont.regular(12)).foregroundColor(Ak.textBody)
                }.padding(.top, 11)
            }
            if let enrolled = g.enrolled {
                VStack(spacing: 6) {
                    HStack { Text(enrolled).font(AkFont.regular(11.5)).foregroundColor(Ak.muted); Spacer(); Text(g.left ?? "").font(AkFont.bold(11.5)).foregroundColor(g.leftWarn ? Ak.orange : Ak.green) }
                    ProgressBarLine(fraction: g.fraction, height: 6)
                }.padding(.top, 13)
            }
        }.akCard(radius: 20, padding: 16).onTapGesture { router.go(.groupDetail) }
    }
}

// MARK: - Écran 27 — Détail du groupe
struct GroupDetailScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen(ignoresBottom: true) {
            VStack(alignment: .leading, spacing: 0) {
                IconSquare(system: "arrow.left", bg: .white.opacity(0.14), tint: .white) { router.back() }
                Pill(text: "PRÉPA BAC 2026", fg: Ak.green, bg: Ak.orangeLight).padding(.top, 14)
                Text("Maths & Physique-Chimie").font(AkFont.schibstedExtra(23)).foregroundColor(.white).padding(.top, 10)
                Text("Terminale D · groupe de 12 max").font(AkFont.regular(13.5)).foregroundColor(Ak.onGreenSoft).padding(.top, 4)
            }.padding(.horizontal, 22).padding(.top, 6).padding(.bottom, 20).frame(maxWidth: .infinity, alignment: .leading).background(Ak.green)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 10) { infoTile("calendar", "8 sem."); infoTile("clock", "Sam–Dim"); infoTile("person.3.fill", "12 max") }
                    HStack(spacing: 11) {
                        Image(systemName: "flame.fill").font(.system(size: 20)).foregroundColor(Ak.orange)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("3 places restantes").font(AkFont.bold(13)).foregroundColor(Ak.ink)
                            Text("9 élèves déjà inscrits · démarre le 6 juillet").font(AkFont.regular(11.5)).foregroundColor(Color(hex: 0x8A5B33))
                        }
                        Spacer()
                    }.padding(.horizontal, 15).padding(.vertical, 13).background(Ak.orangeSoft).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)).padding(.top, 13)

                    HStack(spacing: 11) {
                        InitialsAvatar(initials: "KN", size: 46, radius: 13, fontSize: 16, verified: true)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Koffi N'Guessan").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                            Text("94% de réussite au BAC").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                        }
                        Spacer()
                        RatingInline(value: "4,9")
                    }.akCard(radius: 15).padding(.top, 16)

                    Text("Programme").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18)
                    programRow("1", "Fonctions, limites & continuité").padding(.top, 11)
                    programRow("2", "Probabilités & suites")
                    programRow("3", "Annales & sujets type BAC")
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 0) { Text("2 000 F").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.ink); Text("/séance").font(AkFont.semibold(13)).foregroundColor(Ak.faint) }
                    Text("payable par séance").font(AkFont.regular(11.5)).foregroundColor(Ak.muted)
                }
                PrimaryButton(label: "Réserver ma place", trailingSystemIcon: nil) { router.go(.payment) }
            }.padding(.horizontal, 22).padding(.top, 14).padding(.bottom, 12).background(.white)
        }
    }
    func infoTile(_ icon: String, _ label: String) -> some View {
        VStack(spacing: 5) { Image(systemName: icon).font(.system(size: 18)).foregroundColor(Ak.green); Text(label).font(AkFont.bold(12)).foregroundColor(Ak.ink) }
            .frame(maxWidth: .infinity).padding(.vertical, 12).background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }
    func programRow(_ n: String, _ t: String) -> some View {
        HStack(spacing: 10) {
            Text(n).font(AkFont.schibstedExtra(11)).foregroundColor(Ak.green).frame(width: 24, height: 24).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 8))
            Text(t).font(AkFont.regular(13)).foregroundColor(Ak.ink)
            Spacer()
        }.padding(.bottom, 9)
    }
}

// MARK: - Écran 28 — Agenda & disponibilités
struct AgendaScreen: View {
    @EnvironmentObject var router: Router
    @State private var day = 4
    var body: some View {
        AkScreen(ignoresBottom: true) {
            HStack {
                Text("Mon agenda").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink)
                Spacer()
                HStack(spacing: 4) { Text("Juin").font(AkFont.bold(13)).foregroundColor(Ak.ink); Image(systemName: "chevron.down").font(.system(size: 12)).foregroundColor(Ak.ink) }
            }.padding(.horizontal, 22).padding(.vertical, 8)
            HStack(spacing: 6) {
                dayCell("LUN", "17", 0); dayCell("MAR", "18", 1); dayCell("MER", "19", 2); dayCell("VEN", "20", 3); dayCell("SAM", "22", 4); dayCell("DIM", "23", 5)
            }.padding(.horizontal, 22).padding(.top, 6)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Samedi 22 juin").font(AkFont.schibstedBold(14)).foregroundColor(Ak.ink).padding(.bottom, 11)
                    slot("10:00", "Awa · Maths 2nde", "1h30 · à domicile, Marcory")
                    slot("16:00", "Kouadio · Maths 3ᵉ", "1h30 · à domicile, Cocody")
                    HStack(alignment: .top, spacing: 12) {
                        Text("18:00").font(AkFont.bold(12)).foregroundColor(Color(hex: 0xC0B9AC)).frame(width: 40, alignment: .leading).padding(.top, 13)
                        HStack(spacing: 0) {
                            Image(systemName: "plus").font(.system(size: 13, weight: .bold)).foregroundColor(Ak.green)
                            Text("  Ouvrir un créneau").font(AkFont.bold(12.5)).foregroundColor(Ak.green)
                            Spacer()
                        }.padding(13).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: 0xC9C2B5), style: StrokeStyle(lineWidth: 1.5, dash: [5])))
                    }.padding(.bottom, 11)
                    HStack(spacing: 0) {
                        Image(systemName: "slider.horizontal.3").font(.system(size: 15)).foregroundColor(Ak.green)
                        Text("  Définir mes disponibilités récurrentes").font(AkFont.bold(13.5)).foregroundColor(Ak.green)
                    }.frame(maxWidth: .infinity).padding(13).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.green, lineWidth: 1)).padding(.top, 7)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            TeacherBottomNav(current: .agenda)
        }
    }
    func dayCell(_ d: String, _ n: String, _ idx: Int) -> some View {
        let sel = day == idx
        return VStack(spacing: 0) {
            Text(d).font(AkFont.regular(10)).foregroundColor(sel ? Ak.onGreenSoft : Ak.faint)
            Text(n).font(AkFont.schibstedExtra(15)).foregroundColor(sel ? .white : Ak.ink)
        }.frame(maxWidth: .infinity).padding(.vertical, 9).background(sel ? Ak.green : .white).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Ak.border, lineWidth: sel ? 0 : 1)).onTapGesture { day = idx }
    }
    func slot(_ time: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(time).font(AkFont.bold(12)).foregroundColor(Ak.muted).frame(width: 40, alignment: .leading).padding(.top, 13)
            HStack(spacing: 0) {
                Rectangle().fill(Ak.green).frame(width: 3)
                VStack(alignment: .leading, spacing: 0) {
                    Text(title).font(AkFont.bold(13.5)).foregroundColor(Ak.ink)
                    Text(detail).font(AkFont.regular(11.5)).foregroundColor(Ak.muted)
                }.padding(.horizontal, 13).padding(.vertical, 12)
                Spacer()
            }.background(.white).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous)).overlay(RoundedRectangle(cornerRadius: 12).stroke(Ak.border, lineWidth: 1))
        }.padding(.bottom, 11)
    }
}
