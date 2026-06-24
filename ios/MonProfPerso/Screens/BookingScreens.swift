import SwiftUI

// MARK: - Écran 9 — Réservation du cours
struct BookingScreen: View {
    @EnvironmentObject var router: Router
    @State private var day = 1
    @State private var time = 2
    @State private var duration = 1

    var body: some View {
        AkScreen {
            TopBar(title: "Réserver un cours", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 11) {
                        InitialsAvatar(initials: "KN", size: 42, radius: 12, fontSize: 15)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Koffi N'Guessan").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                            Text("Maths · Physique-Chimie").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                        }
                        Spacer()
                        Image(systemName: "checkmark.seal.fill").font(.system(size: 20)).foregroundColor(Ak.green)
                    }.akCard(radius: 15, padding: 11)

                    subLabel("Format du cours")
                    HStack(spacing: 10) {
                        formatCard("house.fill", "À domicile", "Cocody · chez vous", true)
                        formatCard("video.fill", "En ligne", "visio Mon Prof Perso", false)
                    }
                    subLabel("Matière & niveau")
                    HStack(spacing: 8) { Chip(label: "Mathématiques", selected: true); Chip(label: "3ᵉ (BEPC)"); Spacer() }
                    subLabel("Choisir un créneau")
                    HStack(spacing: 8) {
                        dayCell("VEN", "21", 0); dayCell("SAM", "22", 1); dayCell("DIM", "23", 2); dayCell("LUN", "24", 3); dayCell("MAR", "25", 4)
                    }
                    HStack(spacing: 8) {
                        timeChip("10:00", -1); timeChip("14:00", 0); timeChip("16:00", 1); timeChip("17:30", 2); Spacer()
                    }.padding(.top, 10)
                    subLabel("Durée")
                    HStack(spacing: 8) { durChip("1h", 0); durChip("1h30", 1); durChip("2h", 2) }
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            VStack(spacing: 11) {
                HStack {
                    Text("Sam. 22 juin · 16h00 · 1h30").font(AkFont.regular(13.5)).foregroundColor(Ak.muted)
                    Spacer()
                    Text("6 000 F").font(AkFont.schibstedExtra(18)).foregroundColor(Ak.ink)
                }
                PrimaryButton(label: "Continuer vers le paiement") { router.go(.payment) }
            }.padding(.horizontal, 22).padding(.top, 14).padding(.bottom, 12).background(.white)
        }
    }

    func subLabel(_ t: String) -> some View {
        Text(t).font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18).padding(.bottom, 10)
    }
    func formatCard(_ icon: String, _ title: String, _ sub: String, _ sel: Bool) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Image(systemName: icon).font(.system(size: 20)).foregroundColor(sel ? Ak.green : Ak.faint)
            Text(title).font(AkFont.bold(13.5)).foregroundColor(sel ? Ak.ink : Ak.inkSoft)
            Text(sub).font(AkFont.regular(11)).foregroundColor(sel ? Ak.muted : Ak.faint)
        }.padding(13).frame(maxWidth: .infinity, alignment: .leading)
        .background(sel ? Ak.greenSoft : .white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(sel ? Ak.green : Ak.border, lineWidth: sel ? 2 : 1.5))
    }
    func dayCell(_ d: String, _ n: String, _ idx: Int) -> some View {
        let sel = day == idx
        return VStack(spacing: 0) {
            Text(d).font(AkFont.regular(11)).foregroundColor(sel ? Ak.onGreenSoft : Ak.faint)
            Text(n).font(AkFont.schibstedExtra(17)).foregroundColor(sel ? .white : Ak.ink)
        }.frame(maxWidth: .infinity).padding(.vertical, 10)
        .background(sel ? Ak.green : .white).clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 13).stroke(sel ? Ak.green : Ak.border, lineWidth: sel ? 2 : 1.5))
        .onTapGesture { day = idx }
    }
    func timeChip(_ t: String, _ idx: Int) -> some View {
        let disabled = idx == -1
        let sel = time == idx
        return Text(t).font(sel ? AkFont.bold(12.5) : AkFont.semibold(12.5))
            .foregroundColor(disabled ? Ak.faint : (sel ? .white : Ak.inkSoft))
            .strikethrough(disabled)
            .padding(.horizontal, 14).padding(.vertical, 9)
            .background(disabled ? Ak.cardField : (sel ? Ak.orange : .white))
            .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(Ak.border, lineWidth: (!disabled && !sel) ? 1.5 : 0))
            .onTapGesture { if !disabled { time = idx } }
    }
    func durChip(_ t: String, _ idx: Int) -> some View {
        let sel = duration == idx
        return Text(t).font(sel ? AkFont.bold(12.5) : AkFont.semibold(12.5)).foregroundColor(sel ? .white : Ak.inkSoft)
            .frame(maxWidth: .infinity).padding(.vertical, 10)
            .background(sel ? Ak.green : .white).clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(Ak.border, lineWidth: sel ? 0 : 1.5))
            .onTapGesture { duration = idx }
    }
}

// MARK: - Écran 10 — Paiement Mobile Money
struct PaymentScreen: View {
    @EnvironmentObject var router: Router
    @State private var method = 0
    var body: some View {
        AkScreen {
            TopBar(title: "Paiement", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("RÉCAPITULATIF").font(AkFont.bold(12)).foregroundColor(Ak.faint)
                        HStack(spacing: 11) {
                            InitialsAvatar(initials: "KN", size: 42, radius: 12, fontSize: 15)
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Cours de Maths · 3ᵉ").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                                Text("avec Koffi N'Guessan").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                            }
                            Spacer()
                        }.padding(.top, 11)
                        divider()
                        recapRow("Date", "Sam. 22 juin · 16h00")
                        recapRow("Durée", "1h30")
                        recapRow("Lieu", "À domicile · Cocody")
                    }.akCard(radius: 18, padding: 16)

                    subLabel("Moyen de paiement")
                    method0(Ak.orangeMoney, "iphone", "Orange Money", "07 ** ** ** 42", 0)
                    method0(Ak.wave, "waveform", "Wave", "Sans frais", 1).padding(.top, 10)
                    method0(Ak.mtn, "iphone", "MTN MoMo", "05 ** ** ** 11", 2, tint: Ak.ink).padding(.top, 10)
                    HStack(spacing: 8) {
                        Image(systemName: "lock.fill").font(.system(size: 12)).foregroundColor(Ak.green)
                        Text("Paiement 100% sécurisé · argent libéré après le cours").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                    }.frame(maxWidth: .infinity).padding(.top, 14)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            VStack(spacing: 0) {
                recapRow("Cours (1h30)", "6 000 F", valueColor: Ak.ink)
                HStack { Text("Frais de service").font(AkFont.regular(13)).foregroundColor(Ak.muted); Spacer(); Text("Offert").font(AkFont.bold(13)).foregroundColor(Ak.green) }.padding(.bottom, 11)
                PrimaryButton(label: "Payer 6 000 FCFA", color: Ak.green, trailingSystemIcon: "lock.fill") { router.go(.confirmed) }
            }.padding(.horizontal, 22).padding(.top, 14).padding(.bottom, 12).background(.white)
        }
    }
    func subLabel(_ t: String) -> some View { Text(t).font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18).padding(.bottom, 11) }
    func divider() -> some View { Rectangle().fill(Ak.cardField).frame(height: 1).padding(.vertical, 13) }
    func recapRow(_ l: String, _ v: String, valueColor: Color = Ak.ink) -> some View {
        HStack { Text(l).font(AkFont.regular(13)).foregroundColor(Ak.textBody); Spacer(); Text(v).font(AkFont.semibold(13)).foregroundColor(valueColor) }.padding(.bottom, 6)
    }
    func method0(_ badge: Color, _ icon: String, _ title: String, _ sub: String, _ idx: Int, tint: Color = .white) -> some View {
        let sel = method == idx
        return HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 18)).foregroundColor(tint)
                .frame(width: 38, height: 38).background(badge).clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(AkFont.bold(14)).foregroundColor(Ak.ink)
                Text(sub).font(AkFont.regular(12)).foregroundColor(Ak.muted)
            }
            Spacer()
            if sel { Image(systemName: "checkmark.circle.fill").font(.system(size: 21)).foregroundColor(Ak.orange) }
            else { Circle().stroke(Color(hex: 0xD8D2C8), lineWidth: 2).frame(width: 21, height: 21) }
        }.padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(sel ? Ak.orange : Ak.border, lineWidth: sel ? 2 : 1.5))
        .onTapGesture { method = idx }
    }
}

// MARK: - Écran 11 — Cours confirmé
struct ConfirmedScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen {
            HStack { Spacer(); IconSquare(system: "xmark") { router.popToRoot() } }.padding(.horizontal, 22).padding(.vertical, 6)
            ScrollView {
                VStack(spacing: 0) {
                    ZStack {
                        Circle().fill(Ak.greenSoft).frame(width: 96, height: 96)
                        Circle().fill(Ak.green).frame(width: 66, height: 66)
                        Image(systemName: "checkmark").font(.system(size: 34, weight: .bold)).foregroundColor(.white)
                    }.padding(.top, 16)
                    Text("C'est confirmé !").font(AkFont.schibstedExtra(26)).foregroundColor(Ak.ink).padding(.top, 22)
                    Text("Votre cours avec Koffi N'Guessan est réservé. Il vient d'être prévenu.")
                        .font(AkFont.regular(14)).foregroundColor(Ak.muted).multilineTextAlignment(.center).lineSpacing(3).frame(maxWidth: 280).padding(.top, 8)
                    VStack(alignment: .leading, spacing: 0) {
                        Text("RÉF. #AKW-2058").font(AkFont.bold(11.5)).foregroundColor(Ak.faint)
                        Rectangle().fill(Ak.cardField).frame(height: 1).padding(.vertical, 11)
                        row("Matière", "Maths · 3ᵉ"); row("Date", "Sam. 22 juin · 16h00"); row("Lieu", "À domicile · Cocody")
                        HStack { Text("Montant payé").font(AkFont.regular(13)).foregroundColor(Ak.textBody); Spacer(); Text("6 000 F").font(AkFont.schibstedExtra(14)).foregroundColor(Ak.green) }
                    }.akCard(radius: 18, padding: 16).padding(.top, 24)
                    HStack(spacing: 8) {
                        Image(systemName: "calendar.badge.plus").font(.system(size: 15)).foregroundColor(Ak.green)
                        Text("Ajouter à mon agenda").font(AkFont.bold(13.5)).foregroundColor(Ak.green)
                    }.padding(.top, 16).onTapGesture { router.go(.myCourses) }
                }.padding(.horizontal, 26)
            }
            VStack(spacing: 8) {
                PrimaryButton(label: "Voir mon cours", trailingSystemIcon: nil) { router.go(.myCourses) }
                Text("Retour à l'accueil").font(AkFont.bold(14)).foregroundColor(Ak.muted).padding(6).onTapGesture { router.popToRoot() }
            }.padding(.horizontal, 26).padding(.bottom, 12)
        }
    }
    func row(_ l: String, _ v: String) -> some View {
        HStack { Text(l).font(AkFont.regular(13)).foregroundColor(Ak.textBody); Spacer(); Text(v).font(AkFont.semibold(13)).foregroundColor(Ak.ink) }.padding(.bottom, 9)
    }
}
