import SwiftUI

// MARK: - Écran 16 — Suivi des progrès (données live via l'API commune)
struct ProgressScreen: View {
    @EnvironmentObject var router: Router
    @StateObject private var store = ProgressStore()
    var body: some View {
        let p = store.data
        return AkScreen(ignoresBottom: true) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Progrès de").font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                            Text(p.student).font(AkFont.schibstedExtra(21)).foregroundColor(Ak.ink)
                        }
                        Spacer()
                        InitialsAvatar(initials: "KO", size: 44, bg: Ak.orangeSoft, fg: Ak.orange, radius: 13, fontSize: 16)
                    }
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Moyenne générale ce trimestre").font(AkFont.regular(12.5)).foregroundColor(Ak.onGreenSoft)
                        HStack(alignment: .bottom, spacing: 0) {
                            Text(p.average).font(AkFont.schibstedBlack(38)).foregroundColor(.white)
                            Text(" /20").font(AkFont.regular(14)).foregroundColor(Ak.onGreenSoft).padding(.bottom, 5)
                            HStack(spacing: 3) {
                                Image(systemName: "arrow.up.right").font(.system(size: 12, weight: .bold)).foregroundColor(Ak.orangeLight)
                                Text(p.trend).font(AkFont.bold(13)).foregroundColor(Ak.orangeLight)
                            }.padding(.leading, 10).padding(.bottom, 6)
                        }.padding(.top, 5)
                        Text(p.goal).font(AkFont.regular(12)).foregroundColor(Ak.onGreenSoft).padding(.top, 6)
                    }.padding(18).frame(maxWidth: .infinity, alignment: .leading).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous)).padding(.top, 15)

                    Text("Par matière").font(AkFont.schibstedBold(15.5)).foregroundColor(Ak.ink).padding(.top, 18)
                    ForEach(Array(p.subjects.enumerated()), id: \.offset) { i, s in
                        subjectProgress(s.subject, s.grade, CGFloat(s.fraction), s.warn).padding(.top, i == 0 ? 12 : 13)
                    }

                    Text("Prochain cours").font(AkFont.schibstedBold(15.5)).foregroundColor(Ak.ink).padding(.top, 18)
                    HStack(spacing: 13) {
                        VStack(spacing: 0) {
                            Text("SAM").font(AkFont.semibold(10)).foregroundColor(Ak.green)
                            Text("22").font(AkFont.schibstedExtra(17)).foregroundColor(Ak.green)
                        }.frame(width: 48, height: 48).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 13))
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Maths avec Koffi").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                            Text("16h00 · 1h30 · à domicile").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").font(.system(size: 14)).foregroundColor(Ak.faint)
                    }.akCard(radius: 16).padding(.top, 11).onTapGesture { router.go(.manageCourse) }
                }.padding(.horizontal, 22).padding(.top, 8).padding(.bottom, 16)
            }
            .task { await store.load() }
            BottomNav(current: .progres)
        }
    }
    func subjectProgress(_ s: String, _ g: String, _ f: CGFloat, _ warn: Bool) -> some View {
        let c = warn ? Ak.orange : Ak.green
        return VStack(alignment: .leading, spacing: 6) {
            HStack { Text(s).font(AkFont.semibold(13)).foregroundColor(Ak.inkSoft); Spacer(); Text(g).font(AkFont.bold(13)).foregroundColor(c) }
            ProgressBarLine(fraction: f, color: c)
        }
    }
}

// MARK: - Écran 17 — Notifications
private struct NotifItem: Identifiable { let id = UUID(); let icon: String; let green: Bool; let text: String; let time: String; let unread: Bool }

struct NotificationsScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen(ignoresBottom: true) {
            HStack {
                Text("Notifications").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink)
                Spacer()
                Text("Tout lire").font(AkFont.bold(12.5)).foregroundColor(Ak.green)
            }.padding(.horizontal, 22).padding(.vertical, 8)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header("Aujourd'hui")
                    item(NotifItem(icon: "calendar", green: true, text: "Rappel : cours de Maths demain à 16h", time: "il y a 2 h", unread: true))
                    item(NotifItem(icon: "bubble.left.and.bubble.right.fill", green: false, text: "Koffi vous a envoyé un message", time: "il y a 5 h", unread: true))
                    item(NotifItem(icon: "creditcard.fill", green: true, text: "Paiement de 6 000 F confirmé", time: "il y a 6 h", unread: false))
                    header("Cette semaine").padding(.top, 18)
                    item(NotifItem(icon: "checkmark.seal.fill", green: true, text: "Koffi a accepté votre demande de cours", time: "lun.", unread: false))
                    item(NotifItem(icon: "gift.fill", green: false, text: "Parrainez un ami, gagnez 2 000 F", time: "dim.", unread: false))
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            BottomNav(current: .accueil)
        }
    }
    func header(_ t: String) -> some View { Text(t.uppercased()).font(AkFont.bold(12)).foregroundColor(Ak.faint).frame(maxWidth: .infinity, alignment: .leading).padding(.bottom, 11) }
    private func item(_ n: NotifItem) -> some View {
        HStack(spacing: 12) {
            Image(systemName: n.icon).font(.system(size: 20)).foregroundColor(n.green ? Ak.green : Ak.orange)
                .frame(width: 42, height: 42).background(n.green ? Ak.greenSoft : Ak.orangeSoft).clipShape(RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 2) {
                Text(n.text).font(AkFont.semibold(13.5)).foregroundColor(Ak.ink)
                Text(n.time).font(AkFont.regular(11.5)).foregroundColor(Ak.faint)
            }
            Spacer()
            if n.unread { Circle().fill(Ak.orange).frame(width: 8, height: 8) }
        }.akCard(radius: 16).padding(.bottom, 10)
        .contentShape(Rectangle()).onTapGesture { router.go(.messaging) }
    }
}

// MARK: - Écran 18 — Mon compte
struct AccountScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        let isTeacher = router.role == 2
        return AkScreen(ignoresBottom: true) {
            Text("Mon compte").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink)
                .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 22).padding(.vertical, 8)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 14) {
                        InitialsAvatar(initials: isTeacher ? "KN" : "AK", size: 56, bg: Ak.orangeLight, fg: Ak.green, radius: 16, fontSize: 20)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(isTeacher ? "Koffi N'Guessan" : "Aya Koné").font(AkFont.bold(16)).foregroundColor(.white)
                            Text(isTeacher ? "+225 07 07 00 12 34" : "+225 07 58 42 19 03").font(AkFont.regular(12.5)).foregroundColor(Ak.onGreenSoft)
                        }
                        Spacer()
                        Text("Modifier").font(AkFont.bold(12)).foregroundColor(Ak.green)
                            .padding(.horizontal, 13).padding(.vertical, 8).background(.white).clipShape(RoundedRectangle(cornerRadius: 10))
                            .onTapGesture { router.go(.settings) }
                    }.padding(15).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                    if isTeacher {
                        Text("Mon profil").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 20)
                        HStack(spacing: 13) {
                            InitialsAvatar(initials: "KN", size: 44, radius: 13, fontSize: 15, verified: true)
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Voir mon profil public").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                                Text("Maths · Physique-Chimie · 4,9★").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundColor(Ak.faint)
                        }.akCard(radius: 15).padding(.top, 11).onTapGesture { router.go(.teacherProfile) }
                    } else {
                        Text("Mes enfants").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 20)
                        HStack(spacing: 13) {
                            InitialsAvatar(initials: "KO", size: 44, bg: Ak.orangeSoft, fg: Ak.orange, radius: 13, fontSize: 15)
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Kouadio").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                                Text("3ᵉ (BEPC) · Collège Moderne").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundColor(Ak.faint)
                        }.akCard(radius: 15).padding(.top, 11).onTapGesture { router.go(.progress) }
                        HStack(spacing: 0) {
                            Image(systemName: "plus").font(.system(size: 14, weight: .bold)).foregroundColor(Ak.green)
                            Text("  Ajouter un enfant").font(AkFont.bold(13)).foregroundColor(Ak.green)
                        }.frame(maxWidth: .infinity).padding(12)
                        .overlay(RoundedRectangle(cornerRadius: 15).stroke(Color(hex: 0xC9C2B5), style: StrokeStyle(lineWidth: 1.5, dash: [5]))).padding(.top, 9)
                        .contentShape(Rectangle()).onTapGesture { router.go(.settings) }
                    }

                    VStack(spacing: 0) {
                        if isTeacher {
                            accountRow("creditcard.fill", "Mes revenus") { router.go(.earnings) }
                            rowDivider()
                            accountRow("calendar", "Mon agenda") { router.go(.agenda) }
                        } else {
                            accountRow("crown.fill", "Mon abonnement", badge: "Actif", bf: Ak.green, bb: Ak.greenSoft) { router.go(.mySubscription) }
                            rowDivider()
                            accountRow("creditcard.fill", "Moyens de paiement") { router.go(.wallet) }
                        }
                        rowDivider()
                        accountRow("doc.text.fill", "Ressources & supports") { router.go(.resources) }
                        rowDivider()
                        accountRow("gift.fill", "Parrainage", badge: "2 000 F", bf: Ak.orange, bb: Ak.orangeSoft) { router.go(.referral) }
                        rowDivider()
                        accountRow("questionmark.circle.fill", "Aide & support") { router.go(.helpFaq) }
                        rowDivider()
                        accountRow("gearshape.fill", "Paramètres") { router.go(.settings) }
                        if router.isAdmin {
                            rowDivider()
                            accountRow("slider.horizontal.3", "Gérer le catalogue", badge: "Admin", bf: Ak.green, bb: Ak.greenSoft) { router.go(.adminCatalog) }
                            rowDivider()
                            accountRow("doc.text.fill", "Ressources pédagogiques", badge: "Admin", bf: Ak.green, bb: Ak.greenSoft) { router.go(.adminResources) }
                        }
                    }.background(.white).clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 18).stroke(Ak.border, lineWidth: 1)).padding(.top, 20)

                    Text("Se déconnecter").font(AkFont.bold(13.5)).foregroundColor(Ak.danger).frame(maxWidth: .infinity).padding(.top, 14).onTapGesture { router.role = 0; router.authRole = nil; TokenStore.clear(); router.popToRoot() }
                    if !isTeacher {
                        Text("Espace professeur →").font(AkFont.bold(12.5)).foregroundColor(Ak.muted).frame(maxWidth: .infinity).padding(.top, 8).onTapGesture { router.go(.teacherDashboard) }
                    }
                }.padding(.horizontal, 22).padding(.top, 6).padding(.bottom, 16)
            }
            if isTeacher { TeacherBottomNav(current: .profil) } else { BottomNav(current: .profil) }
        }
    }
    func accountRow(_ icon: String, _ label: String, badge: String? = nil, bf: Color = Ak.green, bb: Color = Ak.greenSoft, action: @escaping () -> Void = {}) -> some View {
        HStack(spacing: 13) {
            Image(systemName: icon).font(.system(size: 18)).foregroundColor(Ak.green).frame(width: 22)
            Text(label).font(AkFont.semibold(14)).foregroundColor(Ak.ink)
            Spacer()
            if let b = badge { Text(b).font(AkFont.bold(11.5)).foregroundColor(bf).padding(.horizontal, 9).padding(.vertical, 4).background(bb).clipShape(RoundedRectangle(cornerRadius: 8)) }
            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundColor(Ak.faint)
        }.padding(15).contentShape(Rectangle()).onTapGesture(perform: action)
    }
    func rowDivider() -> some View { Rectangle().fill(Ak.cardField).frame(height: 1).padding(.horizontal, 15) }
}

// MARK: - Écran 19 — Portefeuille & paiements
private struct Tx: Identifiable { let id = UUID(); let title: String; let sub: String; let amount: String; let credit: Bool }

struct WalletScreen: View {
    @EnvironmentObject var router: Router
    private let txs: [Tx] = [
        .init(title: "Cours Maths · Koffi", sub: "22 juin · Orange Money", amount: "- 6 000 F", credit: false),
        .init(title: "Crédit de parrainage", sub: "20 juin", amount: "+ 2 000 F", credit: true),
        .init(title: "Cours Anglais · Mariam", sub: "14 juin · Wave", amount: "- 4 500 F", credit: false),
        .init(title: "Remboursement cours annulé", sub: "10 juin", amount: "+ 3 000 F", credit: true),
    ]
    var body: some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: "Portefeuille", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Comptes Mobile Money").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink)
                    account(Ak.orangeMoney, "iphone", "Orange Money", "07 ** ** ** 42", badge: "Par défaut").padding(.top, 11)
                    account(Ak.wave, "waveform", "Wave", "05 ** ** ** 11").padding(.top, 9)
                    HStack(spacing: 0) {
                        Image(systemName: "plus").font(.system(size: 14, weight: .bold)).foregroundColor(Ak.green)
                        Text("  Ajouter un compte").font(AkFont.bold(13)).foregroundColor(Ak.green)
                    }.frame(maxWidth: .infinity).padding(12)
                    .overlay(RoundedRectangle(cornerRadius: 15).stroke(Color(hex: 0xC9C2B5), style: StrokeStyle(lineWidth: 1.5, dash: [5]))).padding(.top, 9)

                    Text("Transactions").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 20).padding(.bottom, 11)
                    ForEach(txs) { tx in txRow(tx) }
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            BottomNav(current: .profil)
        }
    }
    func account(_ tint: Color, _ icon: String, _ title: String, _ sub: String, badge: String? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 19)).foregroundColor(.white).frame(width: 40, height: 40).background(tint).clipShape(RoundedRectangle(cornerRadius: 11))
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(AkFont.bold(14)).foregroundColor(Ak.ink)
                Text(sub).font(AkFont.regular(12)).foregroundColor(Ak.muted)
            }
            Spacer()
            if let b = badge { Text(b).font(AkFont.bold(11)).foregroundColor(Ak.green).padding(.horizontal, 10).padding(.vertical, 5).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 8)) }
        }.akCard(radius: 15, padding: 14)
    }
    private func txRow(_ tx: Tx) -> some View {
        HStack(spacing: 12) {
            Image(systemName: tx.credit ? "arrow.down.left" : "arrow.up.right").font(.system(size: 16, weight: .bold)).foregroundColor(tx.credit ? Ak.green : Ak.orange)
                .frame(width: 40, height: 40).background(tx.credit ? Ak.greenSoft : Ak.orangeSoft).clipShape(RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 0) {
                Text(tx.title).font(AkFont.semibold(13.5)).foregroundColor(Ak.ink)
                Text(tx.sub).font(AkFont.regular(11.5)).foregroundColor(Ak.faint)
            }
            Spacer()
            Text(tx.amount).font(AkFont.bold(14)).foregroundColor(tx.credit ? Ak.green : Ak.ink)
        }.padding(.bottom, 10)
    }
}
