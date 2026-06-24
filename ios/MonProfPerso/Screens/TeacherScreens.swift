import SwiftUI

// MARK: - Écran 20 — Tableau de bord prof
struct TeacherDashboardScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen(ignoresBottom: true) {
            HStack(spacing: 11) {
                InitialsAvatar(initials: "KN", size: 44, radius: 13, fontSize: 16)
                VStack(alignment: .leading, spacing: 0) {
                    Text("Bonjour,").font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                    Text("Koffi N'Guessan").font(AkFont.bold(16)).foregroundColor(Ak.ink)
                }
                Spacer()
                IconSquare(system: "bell", bg: .white, tint: Ak.inkSoft, size: 44) { router.go(.notifications) }
            }.padding(.horizontal, 22).padding(.vertical, 8)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Text("Revenus en juin").font(AkFont.regular(12.5)).foregroundColor(Ak.onGreenSoft)
                            Spacer()
                            HStack(spacing: 3) { Image(systemName: "arrow.up.right").font(.system(size: 11, weight: .bold)); Text("+12%").font(AkFont.bold(12)) }.foregroundColor(Ak.orangeLight)
                        }
                        Text("184 000 F").font(AkFont.schibstedBlack(34)).foregroundColor(.white).padding(.top, 4)
                        HStack(spacing: 7) {
                            Image(systemName: "arrow.down.circle.fill").font(.system(size: 14)).foregroundColor(.white)
                            Text("Retirer mes gains").font(AkFont.bold(13)).foregroundColor(.white)
                        }.padding(.horizontal, 16).padding(.vertical, 10).background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 11)).padding(.top, 12).onTapGesture { router.go(.withdraw) }
                    }.padding(18).frame(maxWidth: .infinity, alignment: .leading).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                    HStack(spacing: 10) { miniStat("14", "cours / semaine"); miniStat("4,9", "note moyenne"); miniStat("3", "nouveaux élèves") }.padding(.top, 14)

                    HStack(spacing: 13) {
                        Image(systemName: "tray.fill").font(.system(size: 20)).foregroundColor(.white).frame(width: 42, height: 42).background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 12))
                        VStack(alignment: .leading, spacing: 0) {
                            Text("3 demandes en attente").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                            Text("Répondez vite pour ne pas les perdre").font(AkFont.regular(12)).foregroundColor(Color(hex: 0x8A5B33))
                        }
                        Spacer()
                        Text("Voir").font(AkFont.bold(12)).foregroundColor(.white).padding(.horizontal, 13).padding(.vertical, 8).background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 10))
                    }.padding(15).background(Ak.orangeSoft).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)).padding(.top, 14).onTapGesture { router.go(.courseRequests) }

                    Text("Prochains cours").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18)
                    HStack(spacing: 13) {
                        VStack(spacing: 0) { Text("SAM").font(AkFont.semibold(9.5)).foregroundColor(Ak.green); Text("22").font(AkFont.schibstedExtra(16)).foregroundColor(Ak.green) }
                            .frame(width: 46, height: 46).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 13))
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Kouadio · Maths 3ᵉ").font(AkFont.bold(13.5)).foregroundColor(Ak.ink)
                            Text("16h00 · à domicile, Cocody").font(AkFont.regular(11.5)).foregroundColor(Ak.muted)
                        }
                        Spacer()
                    }.akCard(radius: 16).padding(.top, 11).onTapGesture { router.go(.manageCourse) }
                }.padding(.horizontal, 22).padding(.top, 6).padding(.bottom, 16)
            }
            TeacherBottomNav(current: .tableau)
        }
    }
    func miniStat(_ v: String, _ l: String) -> some View {
        VStack(spacing: 2) {
            Text(v).font(AkFont.schibstedExtra(19)).foregroundColor(Ak.green)
            Text(l).font(AkFont.regular(10.5)).foregroundColor(Ak.muted).multilineTextAlignment(.center)
        }.frame(maxWidth: .infinity).padding(.vertical, 13).background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
    }
}

// MARK: - Écran 21 — Demandes de cours
private struct Req: Identifiable { let id = UUID(); let ini: String; let green: Bool; let name: String; let ago: String; let price: String; let student: String; let subject: String; let slot: String; let format: String }

struct CourseRequestsScreen: View {
    @EnvironmentObject var router: Router
    private let reqs: [Req] = [
        .init(ini: "FB", green: true, name: "Fatou Bamba", ago: "il y a 1 h", price: "6 000 F", student: "Awa · 2nde", subject: "Mathématiques", slot: "Sam. 28 juin · 15h00", format: "À domicile · Marcory"),
        .init(ini: "YK", green: false, name: "Yao Kouamé", ago: "il y a 3 h", price: "4 000 F", student: "Junior · 3ᵉ", subject: "Physique-Chimie", slot: "Dim. 29 juin · 10h00", format: "En ligne"),
    ]
    var body: some View {
        AkScreen(ignoresBottom: true) {
            HStack(spacing: 10) {
                Text("Demandes").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink)
                Text("3").font(AkFont.bold(12)).foregroundColor(.white).padding(.horizontal, 9).padding(.vertical, 3).background(Ak.orange).clipShape(Capsule())
                Spacer()
            }.padding(.horizontal, 22).padding(.vertical, 8)
            ScrollView {
                VStack(spacing: 13) { ForEach(reqs) { r in card(r) } }.padding(.horizontal, 22).padding(.top, 16)
            }
            TeacherBottomNav(current: .demandes)
        }
    }
    private func card(_ r: Req) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 11) {
                InitialsAvatar(initials: r.ini, size: 42, bg: r.green ? Ak.greenSoft : Ak.orangeSoft, fg: r.green ? Ak.green : Ak.orange, radius: 12, fontSize: 15)
                VStack(alignment: .leading, spacing: 0) {
                    Text(r.name).font(AkFont.bold(14.5)).foregroundColor(Ak.ink)
                    Text(r.ago).font(AkFont.regular(11.5)).foregroundColor(Ak.faint)
                }
                Spacer()
                Text(r.price).font(AkFont.schibstedExtra(15)).foregroundColor(Ak.green)
            }
            VStack(spacing: 7) {
                detail("Élève", r.student); detail("Matière", r.subject); detail("Créneau", r.slot); detail("Format", r.format)
            }.padding(.top, 13)
            HStack(spacing: 9) {
                Text("Refuser").font(AkFont.bold(13.5)).foregroundColor(Ak.muted).frame(maxWidth: .infinity).padding(.vertical, 12)
                    .background(.white).clipShape(RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(Ak.border, lineWidth: 1))
                    .contentShape(Rectangle()).onTapGesture { router.go(.teacherDashboard) }
                Text("Accepter").font(AkFont.bold(13.5)).foregroundColor(.white).frame(maxWidth: .infinity).padding(.vertical, 12).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 12))
                    .contentShape(Rectangle()).onTapGesture { router.go(.agenda) }
            }.padding(.top, 14)
        }.akCard(radius: 20, padding: 16)
    }
    func detail(_ l: String, _ v: String) -> some View {
        HStack { Text(l).font(AkFont.regular(12.5)).foregroundColor(Ak.muted); Spacer(); Text(v).font(AkFont.semibold(12.5)).foregroundColor(Ak.ink) }
    }
}

// MARK: - Écran 22 — Revenus
struct EarningsScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen(ignoresBottom: true) {
            Text("Revenus").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 22).padding(.vertical, 8)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 8) { PillTab(label: "Semaine", selected: false); PillTab(label: "Mois", selected: true); PillTab(label: "Année", selected: false); Spacer() }
                    Text("Total perçu en juin").font(AkFont.regular(12.5)).foregroundColor(Ak.muted).padding(.top, 16)
                    HStack(alignment: .bottom, spacing: 9) {
                        Text("184 000 F").font(AkFont.schibstedBlack(34)).foregroundColor(Ak.ink)
                        HStack(spacing: 3) { Image(systemName: "arrow.up.right").font(.system(size: 11, weight: .bold)); Text("+12%").font(AkFont.bold(13)) }.foregroundColor(Ak.green).padding(.bottom, 6)
                    }.padding(.top, 3)
                    HStack(alignment: .bottom, spacing: 9) {
                        bar(0.48, "S1", false); bar(0.66, "S2", false); bar(0.58, "S3", false); bar(0.88, "S4", true)
                    }.frame(height: 118).padding(.top, 18)
                    HStack(spacing: 10) { miniStat("38", "cours donnés"); miniStat("52 h", "enseignées"); miniStat("3 800", "F / h moyen") }.padding(.top, 18)
                    Text("Derniers versements").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18).padding(.bottom, 11)
                    payout(Ak.wave, "waveform", "Retrait Wave", "15 juin", "60 000 F")
                    payout(Ak.orangeMoney, "iphone", "Retrait Orange Money", "1 juin", "80 000 F").padding(.top, 11)
                }.padding(.horizontal, 22).padding(.top, 6).padding(.bottom, 16)
            }
            TeacherBottomNav(current: .revenus)
        }
    }
    func bar(_ f: CGFloat, _ l: String, _ active: Bool) -> some View {
        VStack(spacing: 6) {
            Spacer(minLength: 0)
            GeometryReader { geo in
                VStack { Spacer(minLength: 0); RoundedRectangle(cornerRadius: 7).fill(active ? Ak.green : Ak.greenSoft).frame(height: geo.size.height * f) }
            }
            Text(l).font(active ? AkFont.bold(10) : AkFont.regular(10)).foregroundColor(active ? Ak.green : Ak.faint)
        }.frame(maxWidth: .infinity)
    }
    func miniStat(_ v: String, _ l: String) -> some View {
        VStack(spacing: 2) { Text(v).font(AkFont.schibstedExtra(18)).foregroundColor(Ak.green); Text(l).font(AkFont.regular(10.5)).foregroundColor(Ak.muted).multilineTextAlignment(.center) }
            .frame(maxWidth: .infinity).padding(.vertical, 13).background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
    }
    func payout(_ tint: Color, _ icon: String, _ title: String, _ date: String, _ amount: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 18)).foregroundColor(.white).frame(width: 38, height: 38).background(tint).clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 0) { Text(title).font(AkFont.semibold(13.5)).foregroundColor(Ak.ink); Text(date).font(AkFont.regular(11.5)).foregroundColor(Ak.faint) }
            Spacer()
            Text(amount).font(AkFont.bold(14)).foregroundColor(Ak.green)
        }
    }
}
