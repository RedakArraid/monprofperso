import SwiftUI

// MARK: - Écran 31, Gérer le cours (annuler / reprogrammer)
struct ManageCourseScreen: View {
    @EnvironmentObject var router: Router
    @State private var slot = 1
    var body: some View {
        AkScreen {
            TopBar(title: "Détail du cours", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Text("Maths · 3ᵉ").font(AkFont.schibstedExtra(16)).foregroundColor(Ak.ink)
                            Spacer()
                            HStack(spacing: 5) { Circle().fill(Ak.online).frame(width: 6, height: 6); Text("Confirmé").font(AkFont.bold(11)).foregroundColor(Ak.green) }
                                .padding(.horizontal, 10).padding(.vertical, 5).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        HStack(spacing: 11) {
                            InitialsAvatar(initials: "KN", size: 42, radius: 12, fontSize: 15)
                            VStack(alignment: .leading, spacing: 0) { Text("Koffi N'Guessan").font(AkFont.bold(14)).foregroundColor(Ak.ink); Text("Professeur de Maths").font(AkFont.regular(12)).foregroundColor(Ak.muted) }
                            Spacer()
                            IconSquare(system: "bubble.left", bg: Ak.cardField, tint: Ak.green, size: 38) { router.go(.messaging) }
                        }.padding(.top, 13)
                        Rectangle().fill(Ak.cardField).frame(height: 1).padding(.vertical, 13)
                        iconLine("calendar", "Samedi 22 juin · 16h00 · 1h30")
                        iconLine("house.fill", "À domicile · Cocody, Riviera 3")
                        iconLine("creditcard.fill", "6 000 F · payé via Orange Money")
                    }.akCard(radius: 18, padding: 16)

                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "info.circle.fill").font(.system(size: 17)).foregroundColor(Ak.orange)
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Conditions d'annulation").font(AkFont.bold(13)).foregroundColor(Ak.ink)
                            Text("Gratuit jusqu'à 24h avant le cours. Au-delà, 50% du montant est facturé au professeur pour son déplacement.")
                                .font(AkFont.regular(12)).foregroundColor(Color(hex: 0x7A5733)).lineSpacing(3)
                        }
                    }.padding(14).background(Color(hex: 0xFBF1E6)).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous)).padding(.top, 14)

                    Text("Reprogrammer, nouveaux créneaux").font(AkFont.schibstedBold(14)).foregroundColor(Ak.ink).padding(.top, 14)
                    HStack(spacing: 8) { rChip("Dim 23 · 14h", 0); rChip("Lun 24 · 17h", 1); rChip("Mar 25 · 16h", 2); Spacer() }.padding(.top, 11)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            HStack(spacing: 10) {
                Text("Annuler").font(AkFont.bold(14)).foregroundColor(Ak.danger).frame(maxWidth: .infinity).padding(.vertical, 15)
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.danger, lineWidth: 1))
                    .contentShape(Rectangle()).onTapGesture { router.go(.myCourses) }
                Text("Confirmer le report").font(AkFont.bold(14)).foregroundColor(.white).frame(maxWidth: .infinity).padding(.vertical, 15)
                    .background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 14))
                    .contentShape(Rectangle()).onTapGesture { router.go(.myCourses) }
            }.padding(.horizontal, 22).padding(.vertical, 14).background(.white)
        }
    }
    func iconLine(_ icon: String, _ text: String) -> some View {
        HStack(spacing: 9) { Image(systemName: icon).font(.system(size: 14)).foregroundColor(Ak.green); Text(text).font(AkFont.regular(13)).foregroundColor(Ak.textBody) }.padding(.bottom, 8)
    }
    func rChip(_ t: String, _ idx: Int) -> some View {
        let sel = slot == idx
        return Text(t).font(sel ? AkFont.bold(12.5) : AkFont.semibold(12.5)).foregroundColor(sel ? .white : Ak.inkSoft)
            .padding(.horizontal, 14).padding(.vertical, 9).background(sel ? Ak.green : .white).clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(Ak.border, lineWidth: sel ? 0 : 1)).onTapGesture { slot = idx }
    }
}

// MARK: - Écran 32, Bilan de progression détaillé
struct ProgressReportScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen {
            TopBar(title: "Bilan de juin", subtitle: "Kouadio · 3ᵉ", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(alignment: .bottom) {
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Moyenne générale").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                                HStack(alignment: .bottom, spacing: 0) { Text("13,2").font(AkFont.schibstedBlack(30)).foregroundColor(Ak.ink); Text(" /20").font(AkFont.regular(13)).foregroundColor(Ak.faint).padding(.bottom, 3) }
                            }
                            Spacer()
                            HStack(spacing: 3) { Image(systemName: "arrow.up.right").font(.system(size: 11, weight: .bold)); Text("+1,4").font(AkFont.bold(13)) }.foregroundColor(Ak.green)
                                .padding(.horizontal, 11).padding(.vertical, 6).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 9))
                        }
                        HStack(alignment: .bottom, spacing: 9) { bar(0.56, "Mars", false); bar(0.59, "Avr", false); bar(0.64, "Mai", false); bar(0.84, "Juin", true) }.frame(height: 78).padding(.top, 16)
                    }.akCard(radius: 18, padding: 16)

                    HStack(spacing: 10) {
                        strength("Points forts", Ak.green, ["Calcul littéral", "Géométrie"], warn: false)
                        strength("À travailler", Ak.orange, ["Fonctions affines", "Probabilités"], warn: true)
                    }.padding(.top, 13)

                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 9) {
                            Text("KN").font(AkFont.schibstedExtra(11)).foregroundColor(.white).frame(width: 30, height: 30).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 9))
                            Text("Mot du professeur").font(AkFont.bold(12.5)).foregroundColor(Ak.ink)
                        }
                        Text("« Kouadio progresse bien et gagne en confiance. On vise 14/20 au prochain bilan en consolidant les fonctions. »")
                            .font(AkFont.regular(12.5)).foregroundColor(Color(hex: 0x3F6B59)).lineSpacing(3).padding(.top, 8)
                    }.padding(14).frame(maxWidth: .infinity, alignment: .leading).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)).padding(.top, 13)
                }.padding(.horizontal, 22).padding(.top, 14)
            }
            HStack(spacing: 0) {
                Image(systemName: "arrow.down.to.line").font(.system(size: 16)).foregroundColor(Ak.green)
                Text("  Télécharger le bilan (PDF)").font(AkFont.bold(14.5)).foregroundColor(Ak.green)
            }.frame(maxWidth: .infinity).padding(.vertical, 15).overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.green, lineWidth: 1))
            .padding(.horizontal, 22).padding(.vertical, 14).background(.white)
        }
    }
    func bar(_ f: CGFloat, _ l: String, _ active: Bool) -> some View {
        VStack(spacing: 6) {
            GeometryReader { geo in VStack { Spacer(minLength: 0); RoundedRectangle(cornerRadius: 6).fill(active ? Ak.green : Ak.greenSoft).frame(height: geo.size.height * f) } }
            Text(l).font(active ? AkFont.bold(9.5) : AkFont.regular(9.5)).foregroundColor(active ? Ak.green : Ak.faint)
        }.frame(maxWidth: .infinity)
    }
    func strength(_ title: String, _ color: Color, _ items: [String], warn: Bool) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title).font(AkFont.bold(11.5)).foregroundColor(color).padding(.bottom, 7)
            ForEach(items, id: \.self) { i in
                HStack(spacing: 5) {
                    Image(systemName: warn ? "exclamationmark.circle.fill" : "checkmark.circle.fill").font(.system(size: 11)).foregroundColor(warn ? Ak.orange : Ak.online)
                    Text(i).font(AkFont.regular(12)).foregroundColor(Ak.ink)
                }.padding(.bottom, 4)
            }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(12).background(.white).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
    }
}

// MARK: - Écran 33, Reçu / facture
struct ReceiptScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen {
            TopBar(title: "Reçu de paiement", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            HStack(spacing: 9) {
                                Image(systemName: "graduationcap.fill").font(.system(size: 18)).foregroundColor(.white).frame(width: 34, height: 34).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 10))
                                HStack(spacing: 0) { Text("Mon Prof Perso").font(AkFont.schibstedExtra(17)).foregroundColor(Ak.ink); Text(".").font(AkFont.schibstedExtra(17)).foregroundColor(Ak.orange) }
                            }
                            Spacer()
                            HStack(spacing: 5) { Image(systemName: "checkmark.circle.fill").font(.system(size: 12)); Text("Payé").font(AkFont.bold(11)) }.foregroundColor(Ak.green)
                                .padding(.horizontal, 10).padding(.vertical, 5).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        Rectangle().fill(Ak.cardField).frame(height: 1).padding(.vertical, 16)
                        Text("REÇU N° AKW-2058").font(AkFont.bold(11.5)).foregroundColor(Ak.faint)
                        Text("Émis le 20 juin 2026").font(AkFont.regular(12.5)).foregroundColor(Ak.muted).padding(.top, 3)
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Cours de Maths · 3ᵉ").font(AkFont.semibold(13.5)).foregroundColor(Ak.ink)
                                Text("Koffi N'Guessan · 1h30").font(AkFont.regular(12)).foregroundColor(Ak.faint)
                            }
                            Spacer()
                            Text("6 000 F").font(AkFont.bold(13.5)).foregroundColor(Ak.ink)
                        }.padding(.top, 16)
                        HStack { Text("Frais de service").font(AkFont.regular(13)).foregroundColor(Ak.muted); Spacer(); Text("Offert").font(AkFont.semibold(13)).foregroundColor(Ak.green) }.padding(.top, 11)
                        Rectangle().fill(Ak.cardField).frame(height: 1).padding(.vertical, 14)
                        HStack { Text("Total payé").font(AkFont.bold(14)).foregroundColor(Ak.ink); Spacer(); Text("6 000 F").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.green) }
                        HStack(spacing: 10) {
                            Image(systemName: "iphone").font(.system(size: 16)).foregroundColor(.white).frame(width: 32, height: 32).background(Ak.orangeMoney).clipShape(RoundedRectangle(cornerRadius: 9))
                            VStack(alignment: .leading, spacing: 0) { Text("Orange Money").font(AkFont.bold(12.5)).foregroundColor(Ak.ink); Text("Transaction OM240620.1432.A58").font(AkFont.regular(11)).foregroundColor(Ak.faint) }
                            Spacer()
                        }.padding(12).background(Ak.canvas).clipShape(RoundedRectangle(cornerRadius: 12)).padding(.top, 16)
                        HStack { Spacer()
                            Image(systemName: "qrcode").font(.system(size: 72)).foregroundColor(.white).frame(width: 96, height: 96).background(Ak.ink).clipShape(RoundedRectangle(cornerRadius: 12))
                            Spacer() }.padding(.top, 16)
                    }.akCard(radius: 20, padding: 20)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            HStack(spacing: 10) {
                ShareLink(item: "Reçu Mon Prof Perso N° AKW-2058, Cours de Maths · 3ᵉ avec Koffi N'Guessan, Total payé 6 000 F (Orange Money).") {
                    HStack(spacing: 0) { Image(systemName: "square.and.arrow.up").font(.system(size: 15)).foregroundColor(Ak.inkSoft); Text("  Partager").font(AkFont.bold(14)).foregroundColor(Ak.inkSoft) }
                        .frame(maxWidth: .infinity).padding(.vertical, 15).background(.white).clipShape(RoundedRectangle(cornerRadius: 14)).overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
                }
                HStack(spacing: 0) { Image(systemName: "arrow.down.to.line").font(.system(size: 15)).foregroundColor(.white); Text("  Télécharger (PDF)").font(AkFont.bold(14)).foregroundColor(.white) }
                    .frame(maxWidth: .infinity).padding(.vertical, 15).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 14))
                    .contentShape(Rectangle()).onTapGesture { router.back() }
            }.padding(.horizontal, 22).padding(.vertical, 14).background(.white)
        }
    }
}
