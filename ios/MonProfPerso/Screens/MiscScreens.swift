import SwiftUI

// MARK: - Écran 34 — Centre d'aide & FAQ
struct HelpFaqScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen {
            TopBar(title: "Centre d'aide", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass").font(.system(size: 18)).foregroundColor(Ak.faint)
                        Text("Une question ? Cherchez ici…").font(AkFont.regular(14.5)).foregroundColor(Ak.faint)
                        Spacer()
                    }.padding(.horizontal, 16).padding(.vertical, 14).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 15).stroke(Ak.border, lineWidth: 1))
                    HStack(spacing: 11) {
                        VStack(alignment: .leading, spacing: 0) {
                            Image(systemName: "bubble.left.and.text.bubble.right.fill").font(.system(size: 21)).foregroundColor(.white)
                            Text("Chat support").font(AkFont.bold(13.5)).foregroundColor(.white).padding(.top, 8)
                            Text("Réponse en ~5 min").font(AkFont.regular(11)).foregroundColor(Ak.onGreenSoft).padding(.top, 1)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 13).padding(.vertical, 15).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        VStack(alignment: .leading, spacing: 0) {
                            Image(systemName: "message.fill").font(.system(size: 21)).foregroundColor(Ak.online)
                            Text("WhatsApp").font(AkFont.bold(13.5)).foregroundColor(Ak.ink).padding(.top, 8)
                            Text("07 07 00 12 34").font(AkFont.regular(11)).foregroundColor(Ak.faint).padding(.top, 1)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 13).padding(.vertical, 15).background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
                    }.padding(.top, 14)
                    Text("Questions fréquentes").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 20).padding(.bottom, 12)
                    VStack(spacing: 0) {
                        VStack(alignment: .leading, spacing: 0) {
                            HStack { Text("Comment fonctionne le paiement ?").font(AkFont.bold(13.5)).foregroundColor(Ak.ink); Spacer(); Image(systemName: "minus").font(.system(size: 14)).foregroundColor(Ak.green) }
                            Text("Vous payez via Orange Money, Wave ou MTN. L'argent n'est versé au professeur qu'après le cours.")
                                .font(AkFont.regular(12.5)).foregroundColor(Ak.muted).lineSpacing(3).padding(.top, 9)
                        }.padding(15)
                        faqDivider(); faqQuestion("Puis-je annuler un cours ?")
                        faqDivider(); faqQuestion("Les professeurs sont-ils vérifiés ?")
                        faqDivider(); faqQuestion("Comment résilier mon abonnement ?")
                    }.background(.white).clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous)).overlay(RoundedRectangle(cornerRadius: 18).stroke(Ak.border, lineWidth: 1))
                    HStack(spacing: 11) {
                        Image(systemName: "flag.fill").font(.system(size: 18)).foregroundColor(Ak.green)
                        VStack(alignment: .leading, spacing: 0) { Text("Signaler un problème").font(AkFont.bold(13)).foregroundColor(Ak.ink); Text("Litige, comportement, paiement…").font(AkFont.regular(11.5)).foregroundColor(Color(hex: 0x3F6B59)) }
                        Spacer()
                        Image(systemName: "chevron.right").font(.system(size: 13)).foregroundColor(Ak.green)
                    }.padding(14).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous)).padding(.top, 14)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
        }
    }
    func faqQuestion(_ q: String) -> some View {
        HStack { Text(q).font(AkFont.semibold(13.5)).foregroundColor(Ak.ink); Spacer(); Image(systemName: "plus").font(.system(size: 14)).foregroundColor(Ak.faint) }.padding(15)
    }
    func faqDivider() -> some View { Rectangle().fill(Ak.cardField).frame(height: 1).padding(.horizontal, 15) }
}

// MARK: - Écran 35 — Paramètres
struct SettingsScreen: View {
    @EnvironmentObject var router: Router
    @State private var rappels = true
    @State private var messages = true
    @State private var promos = false
    @State private var ecoData = true
    @State private var dark = false
    var body: some View {
        AkScreen {
            TopBar(title: "Paramètres", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    groupLabel("Notifications")
                    card {
                        toggleRow("bell", "Rappels de cours", $rappels)
                        divider(); toggleRow("bubble.left.and.bubble.right.fill", "Messages", $messages)
                        divider(); toggleRow("megaphone.fill", "Promotions", $promos, muted: true)
                    }
                    groupLabel("Préférences", top: 18)
                    card {
                        valueRow("character.bubble.fill", "Langue", "Français")
                        divider(); toggleRow("antenna.radiowaves.left.and.right", "Mode éco-data", $ecoData, subtitle: "Réduit la consommation de données")
                        divider(); toggleRow("moon.fill", "Thème sombre", $dark, muted: true)
                    }
                    groupLabel("Compte", top: 18)
                    card {
                        navRow("lock.shield.fill", "Confidentialité & sécurité")
                        divider(); navRow("doc.text.fill", "Conditions & mentions légales")
                    }
                }.padding(.horizontal, 22).padding(.top, 16)
            }
        }
    }
    func groupLabel(_ t: String, top: CGFloat = 0) -> some View { Text(t.uppercased()).font(AkFont.bold(12)).foregroundColor(Ak.faint).frame(maxWidth: .infinity, alignment: .leading).padding(.top, top).padding(.bottom, 11) }
    func card<C: View>(@ViewBuilder _ c: () -> C) -> some View { VStack(spacing: 0) { c() }.background(.white).clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous)).overlay(RoundedRectangle(cornerRadius: 18).stroke(Ak.border, lineWidth: 1)) }
    func divider() -> some View { Rectangle().fill(Ak.cardField).frame(height: 1).padding(.horizontal, 15) }
    func toggleRow(_ icon: String, _ label: String, _ on: Binding<Bool>, subtitle: String? = nil, muted: Bool = false) -> some View {
        HStack(spacing: 13) {
            Image(systemName: icon).font(.system(size: 17)).foregroundColor(muted ? Ak.faint : Ak.green).frame(width: 22)
            VStack(alignment: .leading, spacing: 0) {
                Text(label).font(AkFont.semibold(14)).foregroundColor(Ak.ink)
                if let s = subtitle { Text(s).font(AkFont.regular(11.5)).foregroundColor(Ak.muted) }
            }
            Spacer()
            Toggle("", isOn: on).labelsHidden().tint(Ak.green)
        }.padding(15)
    }
    func valueRow(_ icon: String, _ label: String, _ value: String) -> some View {
        HStack(spacing: 13) {
            Image(systemName: icon).font(.system(size: 17)).foregroundColor(Ak.green).frame(width: 22)
            Text(label).font(AkFont.semibold(14)).foregroundColor(Ak.ink)
            Spacer()
            Text(value).font(AkFont.semibold(13)).foregroundColor(Ak.muted)
            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundColor(Ak.faint)
        }.padding(15)
    }
    func navRow(_ icon: String, _ label: String) -> some View {
        HStack(spacing: 13) {
            Image(systemName: icon).font(.system(size: 17)).foregroundColor(Ak.green).frame(width: 22)
            Text(label).font(AkFont.semibold(14)).foregroundColor(Ak.ink)
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundColor(Ak.faint)
        }.padding(15)
    }
}

// MARK: - Écran 36 — Parrainage
struct ReferralScreen: View {
    @EnvironmentObject var router: Router
    @State private var copied = false
    private let code = "AYA2026"
    private var shareText: String { "Rejoins-moi sur Mon Prof Perso ! Utilise mon code \(code) et reçois 2 000 F sur ton 1ᵉʳ cours." }
    var body: some View {
        AkScreen(background: Ak.green) {
            HStack { IconSquare(system: "arrow.left", bg: .white.opacity(0.14), tint: .white) { router.back() }; Spacer() }.padding(.horizontal, 22).padding(.vertical, 6)
            ScrollView {
                VStack(spacing: 0) {
                    Image(systemName: "gift.fill").font(.system(size: 42)).foregroundColor(Ak.green).frame(width: 84, height: 84).background(Ak.orangeLight).clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    Text("Parrainez, gagnez\n2 000 F chacun").font(AkFont.schibstedExtra(25)).foregroundColor(.white).multilineTextAlignment(.center).padding(.top, 18)
                    Text("Votre filleul reçoit 2 000 F sur son 1ᵉʳ cours. Vous gagnez 2 000 F dès qu'il le réserve.")
                        .font(AkFont.regular(13.5)).foregroundColor(Ak.onGreenSoft).multilineTextAlignment(.center).lineSpacing(4).padding(.top, 10)
                    HStack {
                        VStack(alignment: .leading, spacing: 0) {
                            Text(copied ? "CODE COPIÉ ✓" : "VOTRE CODE").font(AkFont.semibold(11)).foregroundColor(Ak.onGreenFaint)
                            Text(code).font(AkFont.schibstedExtra(24)).foregroundColor(.white).padding(.top, 2)
                        }
                        Spacer()
                        Image(systemName: copied ? "checkmark" : "doc.on.doc.fill").font(.system(size: 21)).foregroundColor(Ak.green).frame(width: 44, height: 44).background(.white).clipShape(RoundedRectangle(cornerRadius: 12))
                            .onTapGesture { UIPasteboard.general.string = code; copied = true }
                    }.padding(16).background(.white.opacity(0.1)).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.35), style: StrokeStyle(lineWidth: 1.5, dash: [5]))).padding(.top, 22)
                    VStack(spacing: 0) {
                        HStack { Text("Amis parrainés").font(AkFont.regular(13)).foregroundColor(Ak.onGreenSoft); Spacer(); Text("3").font(AkFont.schibstedExtra(15)).foregroundColor(.white) }
                        Rectangle().fill(.white.opacity(0.12)).frame(height: 1).padding(.vertical, 11)
                        HStack { Text("Total gagné").font(AkFont.regular(13)).foregroundColor(Ak.onGreenSoft); Spacer(); Text("6 000 F").font(AkFont.schibstedExtra(15)).foregroundColor(Ak.orangeLight) }
                    }.padding(16).background(.white.opacity(0.07)).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)).padding(.top, 13)
                }.padding(.horizontal, 26)
            }
            ShareLink(item: shareText) {
                HStack(spacing: 8) {
                    Text("Partager mon code").font(AkFont.bold(15.5))
                    Image(systemName: "square.and.arrow.up").font(.system(size: 15, weight: .bold))
                }.foregroundColor(.white).frame(maxWidth: .infinity).padding(.vertical, 16)
                .background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
            }.padding(.horizontal, 26).padding(.bottom, 12)
        }
    }
}

// MARK: - Écran 37 — État vide & hors-ligne
struct EmptyStateScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen(ignoresBottom: true) {
            HStack(spacing: 9) {
                Image(systemName: "antenna.radiowaves.left.and.right").font(.system(size: 16)).foregroundColor(Ak.orange)
                Text("Mode éco-data actif · images allégées pour économiser vos données").font(AkFont.regular(12.5)).foregroundColor(Color(hex: 0x7A5733))
            }.padding(.horizontal, 14).padding(.vertical, 11).background(Color(hex: 0xFBF1E6)).clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 13).stroke(Color(hex: 0xF3D8BC), lineWidth: 1)).padding(.horizontal, 18).padding(.top, 8)
            Text("Mes cours").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 22).padding(.top, 14)
            HStack(spacing: 8) { PillTab(label: "À venir", selected: true); PillTab(label: "Terminés", selected: false); Spacer() }.padding(.horizontal, 22).padding(.top, 14)
            Spacer()
            VStack(spacing: 0) {
                Image(systemName: "calendar").font(.system(size: 50)).foregroundColor(Ak.green).frame(width: 104, height: 104).background(Ak.greenSoft).clipShape(Circle())
                Text("Aucun cours prévu").font(AkFont.schibstedExtra(19)).foregroundColor(Ak.ink).padding(.top, 22)
                Text("Trouvez un professeur près de chez vous et réservez votre premier cours en quelques minutes.")
                    .font(AkFont.regular(13.5)).foregroundColor(Ak.muted).multilineTextAlignment(.center).lineSpacing(3).padding(.top, 8)
                HStack(spacing: 0) {
                    Image(systemName: "magnifyingglass").font(.system(size: 15)).foregroundColor(.white)
                    Text("  Trouver un professeur").font(AkFont.bold(14.5)).foregroundColor(.white)
                }.padding(.horizontal, 26).padding(.vertical, 15).background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)).padding(.top, 22).onTapGesture { router.go(.searchResults) }
            }.padding(.horizontal, 40)
            Spacer()
            BottomNav(current: .cours)
        }
    }
}
