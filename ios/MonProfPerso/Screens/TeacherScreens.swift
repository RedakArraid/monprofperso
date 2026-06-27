import SwiftUI

// MARK: - Écran 20 — Tableau de bord prof
struct TeacherDashboardScreen: View {
    @EnvironmentObject var router: Router
    @State private var dash: TeacherDashboardDTO = Fallback.teacherDashboard
    private var initials: String {
        dash.name.split(separator: " ").compactMap { $0.first }.prefix(2).map(String.init).joined().uppercased()
    }
    var body: some View {
        AkScreen(ignoresBottom: true) {
            HStack(spacing: 11) {
                InitialsAvatar(initials: initials, size: 44, radius: 13, fontSize: 16)
                VStack(alignment: .leading, spacing: 0) {
                    Text("Bonjour,").font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                    Text(dash.name).font(AkFont.bold(16)).foregroundColor(Ak.ink)
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
                            HStack(spacing: 3) { Image(systemName: "arrow.up.right").font(.system(size: 11, weight: .bold)); Text(dash.trend).font(AkFont.bold(12)) }.foregroundColor(Ak.orangeLight)
                        }
                        Text("\(dash.revenue.formattedFCFA) F").font(AkFont.schibstedBlack(34)).foregroundColor(.white).padding(.top, 4)
                        HStack(spacing: 7) {
                            Image(systemName: "arrow.down.circle.fill").font(.system(size: 14)).foregroundColor(.white)
                            Text("Retirer mes gains").font(AkFont.bold(13)).foregroundColor(.white)
                        }.padding(.horizontal, 16).padding(.vertical, 10).background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 11)).padding(.top, 12).onTapGesture { router.go(.withdraw) }
                    }.padding(18).frame(maxWidth: .infinity, alignment: .leading).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                    HStack(spacing: 10) { ForEach(dash.stats.prefix(3)) { s in miniStat(s.value, s.label) } }.padding(.top, 14)

                    HStack(spacing: 13) {
                        Image(systemName: "tray.fill").font(.system(size: 20)).foregroundColor(.white).frame(width: 42, height: 42).background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 12))
                        VStack(alignment: .leading, spacing: 0) {
                            Text("\(dash.pendingRequests) demande\(dash.pendingRequests > 1 ? "s" : "") en attente").font(AkFont.bold(14)).foregroundColor(Ak.ink)
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
        .task { if let d = try? await ApiClient.shared.teacherDashboard() { dash = d } }
    }
    func miniStat(_ v: String, _ l: String) -> some View {
        VStack(spacing: 2) {
            Text(v).font(AkFont.schibstedExtra(19)).foregroundColor(Ak.green)
            Text(l).font(AkFont.regular(10.5)).foregroundColor(Ak.muted).multilineTextAlignment(.center)
        }.frame(maxWidth: .infinity).padding(.vertical, 13).background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
    }
}

// MARK: - Écran 21 — Demandes de cours (live + validation)
struct CourseRequestsScreen: View {
    @EnvironmentObject var router: Router
    @State private var reqs: [TeacherRequestDTO] = Fallback.teacherRequests

    var body: some View {
        AkScreen(ignoresBottom: true) {
            HStack(spacing: 10) {
                Text("Demandes").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink)
                Text("\(reqs.count)").font(AkFont.bold(12)).foregroundColor(.white).padding(.horizontal, 9).padding(.vertical, 3).background(Ak.orange).clipShape(Capsule())
                Spacer()
            }.padding(.horizontal, 22).padding(.vertical, 8)
            ScrollView {
                if reqs.isEmpty {
                    Text("Aucune demande en attente.").font(AkFont.regular(13)).foregroundColor(Ak.faint)
                        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 22).padding(.top, 16)
                }
                VStack(spacing: 13) { ForEach(reqs) { r in card(r) } }.padding(.horizontal, 22).padding(.top, 16)
            }
            TeacherBottomNav(current: .demandes)
        }
        .task { await reload() }
    }

    private func reload() async {
        if let live = try? await ApiClient.shared.teacherRequests() { reqs = live }
    }

    private func accept(_ r: TeacherRequestDTO) {
        guard let id = r.courseId else { router.go(.agenda); return }
        Task { @MainActor in
            try? await ApiClient.shared.acceptRequest(courseId: id)
            await reload()
        }
    }

    private func card(_ r: TeacherRequestDTO) -> some View {
        let green = r.accent != "orange"
        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 11) {
                InitialsAvatar(initials: r.initials, size: 42, bg: green ? Ak.greenSoft : Ak.orangeSoft, fg: green ? Ak.green : Ak.orange, radius: 12, fontSize: 15)
                VStack(alignment: .leading, spacing: 0) {
                    Text(r.name).font(AkFont.bold(14.5)).foregroundColor(Ak.ink)
                    Text(r.ago).font(AkFont.regular(11.5)).foregroundColor(Ak.faint)
                }
                Spacer()
                Text("\(r.price.formattedFCFA) F").font(AkFont.schibstedExtra(15)).foregroundColor(Ak.green)
            }
            VStack(spacing: 7) {
                detail("Élève", r.student ?? "—"); detail("Matière", r.subject ?? "—")
                detail("Créneau", r.slot ?? "—"); detail("Format", r.format ?? "—")
            }.padding(.top, 13)
            HStack(spacing: 9) {
                Text("Refuser").font(AkFont.bold(13.5)).foregroundColor(Ak.muted).frame(maxWidth: .infinity).padding(.vertical, 12)
                    .background(.white).clipShape(RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(Ak.border, lineWidth: 1))
                    .contentShape(Rectangle()).onTapGesture { router.go(.teacherDashboard) }
                Text("Accepter").font(AkFont.bold(13.5)).foregroundColor(.white).frame(maxWidth: .infinity).padding(.vertical, 12).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 12))
                    .contentShape(Rectangle()).onTapGesture { accept(r) }
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
    @State private var data: TeacherEarningsDTO = Fallback.teacherEarnings
    var body: some View {
        AkScreen(ignoresBottom: true) {
            Text("Revenus").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 22).padding(.vertical, 8)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 8) { PillTab(label: "Semaine", selected: false); PillTab(label: "Mois", selected: true); PillTab(label: "Année", selected: false); Spacer() }
                    Text("Total perçu en juin").font(AkFont.regular(12.5)).foregroundColor(Ak.muted).padding(.top, 16)
                    HStack(alignment: .bottom, spacing: 9) {
                        Text("\(data.total.formattedFCFA) F").font(AkFont.schibstedBlack(34)).foregroundColor(Ak.ink)
                        HStack(spacing: 3) { Image(systemName: "arrow.up.right").font(.system(size: 11, weight: .bold)); Text(data.trend).font(AkFont.bold(13)) }.foregroundColor(Ak.green).padding(.bottom, 6)
                    }.padding(.top, 3)
                    HStack(alignment: .bottom, spacing: 9) {
                        let maxF = max(data.weeks.map(\.f).max() ?? 1, 0.0001)
                        ForEach(Array(data.weeks.enumerated()), id: \.element.id) { i, w in
                            bar(CGFloat(w.f), w.label, i == data.weeks.count - 1 && w.f >= maxF)
                        }
                    }.frame(height: 118).padding(.top, 18)
                    HStack(spacing: 10) { ForEach(data.stats.prefix(3)) { s in miniStat(s.value, s.label) } }.padding(.top, 18)
                    Text("Derniers versements").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18).padding(.bottom, 11)
                    ForEach(Array(data.payouts.enumerated()), id: \.element.id) { i, p in
                        let isWave = p.color == "wave"
                        payout(isWave ? Ak.wave : Ak.orangeMoney, isWave ? "waveform" : "iphone", p.provider, p.date, "\(p.amount.formattedFCFA) F")
                            .padding(.top, i == 0 ? 0 : 11)
                    }
                }.padding(.horizontal, 22).padding(.top, 6).padding(.bottom, 16)
            }
            TeacherBottomNav(current: .revenus)
        }
        .task { if let e = try? await ApiClient.shared.teacherEarnings() { data = e } }
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
