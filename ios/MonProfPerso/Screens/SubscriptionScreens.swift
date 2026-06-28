import SwiftUI

// MARK: - Écran 23, Formules d'abonnement
struct SubscriptionPlansScreen: View {
    @EnvironmentObject var router: Router
    @State private var plan = 1
    var body: some View {
        AkScreen {
            TopBar(title: "Abonnement", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Un suivi régulier,\nle même professeur").font(AkFont.schibstedExtra(22)).foregroundColor(Ak.ink).lineSpacing(3)
                    Text("Des cours chaque semaine pour de vrais progrès, sans avoir à réserver à chaque fois.")
                        .font(AkFont.regular(13)).foregroundColor(Ak.muted).padding(.top, 7)
                    HStack(spacing: 0) {
                        Text("Mensuel").font(AkFont.bold(13)).foregroundColor(Ak.ink).frame(maxWidth: .infinity).padding(.vertical, 9).background(.white).clipShape(RoundedRectangle(cornerRadius: 10))
                        HStack(spacing: 0) {
                            Text("Trimestriel ").font(AkFont.semibold(13)).foregroundColor(Ak.muted)
                            Text("−10%").font(AkFont.bold(13)).foregroundColor(Ak.orange)
                        }.frame(maxWidth: .infinity).padding(.vertical, 9)
                    }.padding(4).background(Ak.cardField).clipShape(RoundedRectangle(cornerRadius: 13)).padding(.top, 16)

                    planOption("Découverte", "1 cours / sem · 4 / mois", "14 000 F", 0, badge: nil).padding(.top, 14)
                    planOption("Régulier", "2 cours / sem · 8 / mois", "26 000 F", 1, badge: "LE PLUS CHOISI").padding(.top, 10)
                    planOption("Intensif", "3 cours / sem · 12 / mois", "36 000 F", 2, badge: nil, suffix: "· prépa examen").padding(.top, 10)

                    VStack(alignment: .leading, spacing: 0) {
                        Text("INCLUS DANS LA FORMULE RÉGULIER").font(AkFont.bold(12)).foregroundColor(Ak.green)
                        included("Même professeur attitré").padding(.top, 10)
                        included("8 cours par mois (2 / semaine)")
                        included("Bilan de progression mensuel")
                        included("Support WhatsApp prioritaire")
                    }.padding(.horizontal, 15).padding(.vertical, 14).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)).padding(.top, 14)
                }.padding(.horizontal, 22).padding(.top, 14)
            }
            VStack(spacing: 11) {
                HStack {
                    Text("Sans engagement · résiliable à tout moment").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                    Spacer()
                    HStack(spacing: 0) { Text("26 000 F").font(AkFont.schibstedExtra(18)).foregroundColor(Ak.ink); Text("/mois").font(AkFont.semibold(12)).foregroundColor(Ak.faint) }
                }
                PrimaryButton(label: "S'abonner", color: Ak.green) { router.go(.subscriptionActivation) }
            }.padding(.horizontal, 22).padding(.top, 13).padding(.bottom, 12).background(.white)
        }
    }
    func planOption(_ title: String, _ detail: String, _ price: String, _ idx: Int, badge: String?, suffix: String? = nil) -> some View {
        let sel = plan == idx
        return ZStack(alignment: .topLeading) {
            HStack(spacing: 12) {
                ZStack {
                    Circle().stroke(sel ? Ak.green : Color(hex: 0xD8D2C8), lineWidth: 2).frame(width: 22, height: 22)
                    if sel { Circle().fill(Ak.green).frame(width: 11, height: 11) }
                }
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 4) {
                        Text(title).font(AkFont.bold(14.5)).foregroundColor(Ak.ink)
                        if let s = suffix { Text(s).font(AkFont.bold(11)).foregroundColor(Ak.orange) }
                    }
                    Text(detail).font(AkFont.regular(12)).foregroundColor(Ak.muted)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 0) {
                    Text(price).font(AkFont.schibstedExtra(15)).foregroundColor(sel ? Ak.green : Ak.ink)
                    Text("/ mois").font(AkFont.regular(10.5)).foregroundColor(Ak.faint)
                }
            }.padding(.horizontal, 14).padding(.vertical, 13)
            .background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(sel ? Ak.green : Ak.border, lineWidth: sel ? 2 : 1.5))
            if let b = badge {
                Text(b).font(AkFont.bold(10)).foregroundColor(.white).padding(.horizontal, 9).padding(.vertical, 3).background(Ak.orange).clipShape(RoundedRectangle(cornerRadius: 7)).offset(x: 16, y: -9)
            }
        }.contentShape(Rectangle()).onTapGesture { plan = idx }
    }
    func included(_ t: String) -> some View {
        HStack(spacing: 9) { Image(systemName: "checkmark").font(.system(size: 12, weight: .bold)).foregroundColor(Ak.green); Text(t).font(AkFont.regular(13)).foregroundColor(Ak.ink) }.padding(.bottom, 8)
    }
}

// MARK: - Écran 24, Activation & paiement
struct SubscriptionActivationScreen: View {
    @EnvironmentObject var router: Router
    @State private var method = 0
    var body: some View {
        AkScreen {
            TopBar(title: "Activer l'abonnement", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Text("Formule Régulier").font(AkFont.schibstedExtra(16)).foregroundColor(Ak.ink)
                            Spacer()
                            Text("2 cours / sem").font(AkFont.bold(11)).foregroundColor(Ak.green).padding(.horizontal, 10).padding(.vertical, 5).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        HStack(spacing: 11) {
                            InitialsAvatar(initials: "KN", size: 42, radius: 12, fontSize: 15)
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Koffi N'Guessan").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                                Text("Professeur attitré · Maths").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                            }
                            Spacer()
                            Image(systemName: "checkmark.seal.fill").font(.system(size: 20)).foregroundColor(Ak.green)
                        }.padding(.top, 13)
                        Rectangle().fill(Ak.cardField).frame(height: 1).padding(.vertical, 13)
                        subRow("Abonnement mensuel", "26 000 F", bold: true)
                        subRow("1ᵉʳ prélèvement", "Aujourd'hui")
                    }.akCard(radius: 18, padding: 16)

                    HStack(alignment: .top, spacing: 9) {
                        Image(systemName: "arrow.triangle.2.circlepath").font(.system(size: 16)).foregroundColor(Ak.orange)
                        Text("Renouvelé automatiquement le 1ᵉʳ de chaque mois. Vous pouvez mettre en pause ou résilier quand vous voulez.")
                            .font(AkFont.regular(12.5)).foregroundColor(Color(hex: 0x7A5733)).lineSpacing(3)
                    }.padding(.horizontal, 14).padding(.vertical, 13).background(Color(hex: 0xFBF1E6)).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)).padding(.top, 14)

                    Text("Moyen de paiement").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18).padding(.bottom, 11)
                    payMethod(Ak.orangeMoney, "iphone", "Orange Money", "07 ** ** ** 42", 0)
                    payMethod(Ak.wave, "waveform", "Wave", "Sans frais", 1).padding(.top, 10)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            VStack(spacing: 11) {
                HStack {
                    Text("Total aujourd'hui").font(AkFont.regular(13)).foregroundColor(Ak.muted)
                    Spacer()
                    HStack(spacing: 0) { Text("26 000 F").font(AkFont.schibstedExtra(18)).foregroundColor(Ak.ink); Text("/mois").font(AkFont.semibold(12)).foregroundColor(Ak.faint) }
                }
                PrimaryButton(label: "Activer mon abonnement", color: Ak.green, trailingSystemIcon: "lock.fill") { router.go(.mySubscription) }
            }.padding(.horizontal, 22).padding(.top, 14).padding(.bottom, 12).background(.white)
        }
    }
    func subRow(_ l: String, _ v: String, bold: Bool = false) -> some View {
        HStack { Text(l).font(AkFont.regular(13)).foregroundColor(Ak.textBody); Spacer(); Text(v).font(bold ? AkFont.bold(13) : AkFont.semibold(13)).foregroundColor(Ak.ink) }.padding(.bottom, 7)
    }
    func payMethod(_ tint: Color, _ icon: String, _ title: String, _ sub: String, _ idx: Int) -> some View {
        let sel = method == idx
        return HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 19)).foregroundColor(.white).frame(width: 38, height: 38).background(tint).clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 0) { Text(title).font(AkFont.bold(14)).foregroundColor(Ak.ink); Text(sub).font(AkFont.regular(12)).foregroundColor(Ak.muted) }
            Spacer()
            if sel { Image(systemName: "checkmark.circle.fill").font(.system(size: 21)).foregroundColor(Ak.green) }
            else { Circle().stroke(Color(hex: 0xD8D2C8), lineWidth: 2).frame(width: 21, height: 21) }
        }.padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(sel ? Ak.green : Ak.border, lineWidth: sel ? 2 : 1.5)).onTapGesture { method = idx }
    }
}

// MARK: - Écran 25, Mon abonnement
struct MySubscriptionScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen {
            TopBar(title: "Mon abonnement", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Text("Formule Régulier").font(AkFont.schibstedExtra(19)).foregroundColor(.white)
                            Spacer()
                            HStack(spacing: 5) { Circle().fill(Ak.online).frame(width: 6, height: 6); Text("Actif").font(AkFont.bold(11)).foregroundColor(Ak.green) }
                                .padding(.horizontal, 10).padding(.vertical, 5).background(.white).clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        Text("2 cours par semaine · Prof attitré Koffi").font(AkFont.regular(13)).foregroundColor(Ak.onGreenSoft).padding(.top, 4)
                        Rectangle().fill(.white.opacity(0.15)).frame(height: 1).padding(.vertical, 14)
                        HStack { Text("Prochain prélèvement").font(AkFont.regular(12.5)).foregroundColor(Ak.onGreenSoft); Spacer(); Text("1 juil. · 26 000 F").font(AkFont.bold(13.5)).foregroundColor(.white) }
                    }.padding(18).frame(maxWidth: .infinity, alignment: .leading).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                    VStack(alignment: .leading, spacing: 0) {
                        HStack { Text("Cours utilisés en juin").font(AkFont.semibold(13)).foregroundColor(Ak.inkSoft); Spacer(); Text("5 / 8").font(AkFont.schibstedExtra(14)).foregroundColor(Ak.ink) }.padding(.bottom, 9)
                        ProgressBarLine(fraction: 0.62)
                        Text("Il vous reste 3 cours ce mois-ci.").font(AkFont.regular(11.5)).foregroundColor(Ak.muted).padding(.top, 8)
                    }.akCard(radius: 16, padding: 15).padding(.top, 14)

                    HStack(spacing: 13) {
                        Image(systemName: "arrow.up.right").font(.system(size: 18, weight: .bold)).foregroundColor(.white).frame(width: 42, height: 42).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 12))
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Bilan de juin disponible").font(AkFont.bold(13.5)).foregroundColor(Ak.ink)
                            Text("Moyenne en hausse : +1,4 ce mois").font(AkFont.regular(12)).foregroundColor(Color(hex: 0x3F6B59))
                        }
                        Spacer()
                        Text("Voir").font(AkFont.bold(12)).foregroundColor(Ak.green)
                    }.padding(13).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)).padding(.top, 13).onTapGesture { router.go(.progressReport) }

                    VStack(spacing: 0) {
                        menuRow("arrow.left.arrow.right", "Changer de formule") { router.go(.subscriptionPlans) }
                        divider()
                        menuRow("pause.circle.fill", "Mettre en pause") {}
                        divider()
                        menuRow("creditcard.fill", "Gérer le paiement") { router.go(.wallet) }
                    }.background(.white).clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous)).overlay(RoundedRectangle(cornerRadius: 18).stroke(Ak.border, lineWidth: 1)).padding(.top, 18)

                    Text("Résilier mon abonnement").font(AkFont.bold(13.5)).foregroundColor(Ak.danger).frame(maxWidth: .infinity).padding(.top, 14)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
        }
    }
    func menuRow(_ icon: String, _ label: String, action: @escaping () -> Void) -> some View {
        HStack(spacing: 13) {
            Image(systemName: icon).font(.system(size: 18)).foregroundColor(Ak.green).frame(width: 22)
            Text(label).font(AkFont.semibold(14)).foregroundColor(Ak.ink)
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundColor(Ak.faint)
        }.padding(15).contentShape(Rectangle()).onTapGesture(perform: action)
    }
    func divider() -> some View { Rectangle().fill(Ak.cardField).frame(height: 1).padding(.horizontal, 15) }
}
