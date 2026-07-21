import SwiftUI

// MARK: - Écran 20, Tableau de bord prof
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
                NotificationBell()
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

                    if let pc = dash.profileCompletion, !pc.complete {
                        HStack(spacing: 13) {
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Profil à compléter · \(pc.percent) %").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                                Text("Documents et présentation").font(AkFont.regular(12)).foregroundColor(Color(hex: 0x3F6B59))
                            }
                            Spacer()
                            Text("Compléter").font(AkFont.bold(12)).foregroundColor(.white).padding(.horizontal, 13).padding(.vertical, 8).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 10))
                        }.padding(15).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)).padding(.top, 14)
                        .contentShape(Rectangle()).onTapGesture { router.go(.completeTeacherProfile) }
                    }

                    if dash.needsConfirmed == false {
                        HStack(spacing: 13) {
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Accès aux offres en attente").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                                Text("Validation par tests en cours — vous serez notifié dès activation.").font(AkFont.regular(12)).foregroundColor(Color(hex: 0x8A5B33))
                            }
                            Spacer()
                        }.padding(15).background(Color(hex: 0xFFF3E8)).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)).padding(.top, 14)
                    }

                    if dash.needsConfirmed != false {
                    HStack(spacing: 13) {
                        Image(systemName: "tray.fill").font(.system(size: 20)).foregroundColor(.white).frame(width: 42, height: 42).background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 12))
                        VStack(alignment: .leading, spacing: 0) {
                            Text("\(dash.pendingRequests) offre\(dash.pendingRequests > 1 ? "s" : "") disponible\(dash.pendingRequests > 1 ? "s" : "")").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                            Text("Gains nets affichés — premier arrivé, premier servi").font(AkFont.regular(12)).foregroundColor(Color(hex: 0x8A5B33))
                        }
                        Spacer()
                        Text("Voir").font(AkFont.bold(12)).foregroundColor(.white).padding(.horizontal, 13).padding(.vertical, 8).background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 10))
                    }.padding(15).background(Ak.orangeSoft).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)).padding(.top, 14).onTapGesture { router.go(.courseRequests) }
                    }

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
        .task {
            if let d = try? await ApiClient.shared.teacherDashboard() { dash = d }
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

// MARK: - Écran 21, Offres de cours (parité Completude web)
private let teacherHomeLat = 5.3599
private let teacherHomeLng = -3.9769
private let noVehicleMaxKm = 12.0

struct CourseRequestsScreen: View {
    @EnvironmentObject var router: Router
    @State private var reqs: [TeacherRequestDTO] = Fallback.teacherRequests
    @State private var isLive = false
    @State private var attempted = false
    @State private var needsConfirmed = true
    @State private var showFilters = false
    @State private var filterWeek = true
    @State private var filterWeekend = true
    @State private var filterVacations = true
    @State private var acceptCats = true
    @State private var acceptDogs = true
    @State private var hasVehicle = false
    @State private var consulting: TeacherRequestDTO?
    @State private var toast: String?
    @State private var marksTick = 0

    private var marksStore: UserDefaults { UserDefaults.standard }
    private let marksKey = "mpp_offer_marks"

    private var marks: [String: String] {
        marksTick
        return (marksStore.dictionary(forKey: marksKey) as? [String: String]) ?? [:]
    }

    private var filtered: [TeacherRequestDTO] {
        reqs.filter { r in
            guard r.isOpportunity == true || r.needId != nil else { return false }
            if marks[r.offerKey] == "refused" { return false }
            let whenOk = (filterWeek && (r.availabilityWeek ?? true))
                || (filterWeekend && (r.availabilityWeekend ?? false))
                || (filterVacations && (r.availabilityHolidays ?? false))
            guard whenOk else { return false }
            if !acceptCats && (r.hasCat == true) { return false }
            if !acceptDogs && (r.hasDog == true) { return false }
            if !isOnline(r), let d = distanceKm(r), !hasVehicle, d > noVehicleMaxKm { return false }
            return true
        }
    }

    var body: some View {
        AkScreen(ignoresBottom: true) {
            HStack(spacing: 10) {
                Text("Mes offres de cours").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink)
                Text("\(filtered.count)").font(AkFont.bold(12)).foregroundColor(.white).padding(.horizontal, 9).padding(.vertical, 3).background(Ak.orange).clipShape(Capsule())
                Spacer()
                Button("Filtres") { showFilters.toggle() }
                    .font(AkFont.bold(13)).foregroundColor(Ak.green)
            }.padding(.horizontal, 22).padding(.vertical, 8)
            ScrollView {
                if let toast {
                    Text(toast).font(AkFont.regular(12)).foregroundColor(Ak.green)
                        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 22).padding(.top, 8)
                }
                if showFilters {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Quand ?").font(AkFont.bold(13)).foregroundColor(Ak.green)
                        Toggle("Semaine scolaire", isOn: $filterWeek)
                        Toggle("Week-ends", isOn: $filterWeekend)
                        Toggle("Vacances scolaires", isOn: $filterVacations)
                        Text("Préférences").font(AkFont.bold(13)).foregroundColor(Ak.green).padding(.top, 8)
                        Toggle("J'ai un véhicule", isOn: $hasVehicle)
                        Toggle("Familles avec chats", isOn: $acceptCats)
                        Toggle("Familles avec chiens", isOn: $acceptDogs)
                    }
                    .font(AkFont.regular(13))
                    .padding(14)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
                    .padding(.horizontal, 22).padding(.top, 8)
                }
                if attempted && !isLive {
                    OfflineBanner { Task { await reload() } }.padding(.horizontal, 22).padding(.top, 16)
                }
                if !needsConfirmed {
                    Text("Votre accès aux offres sera activé après validation par l'équipe.")
                        .font(AkFont.regular(13)).foregroundColor(Ak.muted)
                        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 22).padding(.top, 16)
                } else if filtered.isEmpty {
                    Text("Aucune offre trouvée — ajustez vos filtres.")
                        .font(AkFont.regular(13)).foregroundColor(Ak.faint)
                        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 22).padding(.top, 16)
                }
                VStack(spacing: 13) {
                    ForEach(filtered) { r in card(r) }
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            TeacherBottomNav(current: .demandes)
        }
        .task { await reload() }
        .sheet(item: $consulting) { r in
            consultSheet(r)
        }
    }

    private func reload() async {
        if let live = try? await ApiClient.shared.teacherRequests() { reqs = live; isLive = true } else { isLive = false }
        if let d = try? await ApiClient.shared.teacherDashboard() { needsConfirmed = d.needsConfirmed != false }
        attempted = true
    }

    private func setMark(_ r: TeacherRequestDTO, _ mark: String?) {
        var m = marks
        if let mark { m[r.offerKey] = mark } else { m.removeValue(forKey: r.offerKey) }
        marksStore.set(m, forKey: marksKey)
        marksTick += 1
    }

    private func isOnline(_ r: TeacherRequestDTO) -> Bool {
        let f = (r.format ?? "") + (r.slot ?? "") + r.name
        return f.localizedCaseInsensitiveContains("ligne") || f.localizedCaseInsensitiveContains("online")
    }

    private func distanceKm(_ r: TeacherRequestDTO) -> Double? {
        guard let lat = r.lat, let lng = r.lng else { return nil }
        let dLat = (lat - teacherHomeLat) * .pi / 180
        let dLon = (lng - teacherHomeLng) * .pi / 180
        let a = sin(dLat / 2) * sin(dLat / 2)
            + cos(teacherHomeLat * .pi / 180) * cos(lat * .pi / 180) * sin(dLon / 2) * sin(dLon / 2)
        return (round(6371 * 2 * atan2(sqrt(a), sqrt(1 - a)) * 100) / 100)
    }

    private func accept(_ r: TeacherRequestDTO) {
        guard let id = r.needId ?? r.courseId else { return }
        Task { @MainActor in
            do {
                try await ApiClient.shared.acceptRequest(courseId: id)
                setMark(r, nil)
                toast = "Offre acceptée"
                consulting = nil
                await reload()
            } catch {
                toast = error.localizedDescription
            }
        }
    }

    private func refuse(_ r: TeacherRequestDTO) {
        if r.isOpportunity != true, let id = r.courseId {
            Task { @MainActor in
                try? await ApiClient.shared.refuseRequest(courseId: id)
                await reload()
            }
        }
        setMark(r, "refused")
        toast = "Offre masquée"
        consulting = nil
    }

    private func card(_ r: TeacherRequestDTO) -> some View {
        let priceLabel: String = {
            if r.isOpportunity == true, let h = r.netHourly {
                return "\(h.formattedFCFA) F/h net"
            }
            return "\(r.price.formattedFCFA) F"
        }()
        let freq = [r.frequency, r.duration].compactMap { $0 }.joined(separator: " - ")
        let freqLabel = freq.isEmpty ? (isOnline(r) ? "En ligne" : "À domicile") : freq
        let dist = distanceKm(r)
        let mark = marks[r.offerKey]
        let ref = "Réf. \(2000 + (r.needId ?? r.courseId ?? 0))"
        return VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                Text(r.name.uppercased()).font(AkFont.bold(15)).foregroundColor(Ak.ink)
                Spacer()
                if let dist {
                    Text(String(format: "%.2f km", dist).replacingOccurrences(of: ".", with: ","))
                        .font(AkFont.regular(12)).foregroundColor(Ak.muted)
                }
            }
            Text("\(r.subject ?? "—") · \(r.student ?? "—")")
                .font(AkFont.regular(13)).foregroundColor(Ak.ink).padding(.top, 10)
            Text("\(freqLabel)  ·  \(priceLabel)")
                .font(AkFont.semibold(13)).foregroundColor(Ak.ink).padding(.top, 4)
            HStack(spacing: 6) {
                if r.availabilityWeek ?? true { availBadge("SE") }
                if r.availabilityWeekend == true { availBadge("WE") }
                if r.availabilityHolidays == true { availBadge("VS") }
            }.padding(.top, 10)
            if r.hasCat == true || r.hasDog == true {
                HStack(spacing: 6) {
                    if r.hasCat == true { petBadge("Chat") }
                    if r.hasDog == true { petBadge("Chien") }
                }.padding(.top, 8)
            }
            if let mark {
                Text(mark == "option" ? "OPTION" : mark == "thinking" ? "EN RÉFLEXION" : "REFUSÉE")
                    .font(AkFont.bold(11)).foregroundColor(Ak.green).padding(.top, 6)
            }
            HStack {
                Text("\(ref) — \(r.ago)").font(AkFont.regular(11)).foregroundColor(Ak.faint)
                Spacer()
                Text("CONSULTER").font(AkFont.bold(12)).foregroundColor(.white)
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 10))
                    .contentShape(Rectangle()).onTapGesture { consulting = r }
            }.padding(.top, 12)
        }.akCard(radius: 16, padding: 16)
    }

    private func availBadge(_ t: String) -> some View {
        Text(t).font(AkFont.bold(10)).foregroundColor(.white)
            .frame(width: 28, height: 28)
            .background(Ak.green).clipShape(Circle())
    }

    private func petBadge(_ t: String) -> some View {
        Text(t).font(AkFont.semibold(11)).foregroundColor(.white)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(Color(red: 0.29, green: 0.56, blue: 0.85))
            .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func consultSheet(_ r: TeacherRequestDTO) -> some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Détail de l'offre").font(AkFont.bold(12)).foregroundColor(Ak.green)
                    Text(r.name.uppercased()).font(AkFont.schibstedExtra(22)).foregroundColor(Ak.ink)
                    detail("Matière", r.subject ?? "—")
                    detail("Élève", r.student ?? "—")
                    detail("Format", isOnline(r) ? "En ligne" : "À domicile")
                    detail("Rythme", [r.frequency, r.duration].compactMap { $0 }.joined(separator: " — ").ifEmpty("—"))
                    detail("Rémunération", {
                        if r.isOpportunity == true, let h = r.netHourly { return "\(h.formattedFCFA) F/h net" }
                        return "\(r.price.formattedFCFA) F"
                    }())
                    if let d = distanceKm(r) {
                        detail("Distance", String(format: "%.2f km", d).replacingOccurrences(of: ".", with: ","))
                    }
                    Button { accept(r) } label: {
                        Text("Accepter cette offre").font(AkFont.bold(14)).foregroundColor(.white)
                            .frame(maxWidth: .infinity).padding(.vertical, 14)
                            .background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 12))
                    }.padding(.top, 8)
                    HStack(spacing: 8) {
                        Button("Option") { setMark(r, "option"); toast = "Option prise"; consulting = nil }
                            .buttonStyle(.bordered)
                        Button("Réflexion") { setMark(r, "thinking"); toast = "Mise en réflexion"; consulting = nil }
                            .buttonStyle(.bordered)
                    }
                    Button("Refuser / masquer", role: .destructive) { refuse(r) }
                        .buttonStyle(.bordered)
                }.padding(20)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { consulting = nil }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    func detail(_ l: String, _ v: String) -> some View {
        HStack { Text(l).font(AkFont.regular(12.5)).foregroundColor(Ak.muted); Spacer(); Text(v).font(AkFont.semibold(12.5)).foregroundColor(Ak.ink) }
    }
}

private extension String {
    func ifEmpty(_ fallback: String) -> String { isEmpty ? fallback : self }
}

// MARK: - Écran 22, Revenus
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
