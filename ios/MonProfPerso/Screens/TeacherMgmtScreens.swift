import SwiftUI

// MARK: - Écran 29 — Devenir professeur
struct BecomeTeacherScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen {
            TopBar(title: "Devenir professeur", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 8) {
                        Capsule().fill(Ak.green).frame(height: 5)
                        Capsule().fill(Ak.green).frame(height: 5)
                        Capsule().fill(Color(hex: 0xEAE5DC)).frame(height: 5)
                    }
                    Text("Étape 2 / 3 · Vos documents").font(AkFont.regular(12)).foregroundColor(Ak.muted).padding(.top, 7)
                    Text("Vérifions votre profil").font(AkFont.schibstedExtra(20)).foregroundColor(Ak.ink).padding(.top, 14)
                    Text("Pour rassurer les parents, chaque professeur est vérifié avant d'apparaître sur Mon Prof Perso.")
                        .font(AkFont.regular(13)).foregroundColor(Ak.muted).padding(.top, 6)
                    docRow("person.text.rectangle.fill", "Pièce d'identité (CNI)", "Téléversée", done: true).padding(.top, 16)
                    docRow("rosette", "Diplôme / attestation", "Téléversé", done: true).padding(.top, 10)
                    docRow("camera.fill", "Photo de profil", "Obligatoire", done: false).padding(.top, 10)
                    HStack(alignment: .top, spacing: 9) {
                        Image(systemName: "checkmark.shield.fill").font(.system(size: 16)).foregroundColor(Ak.green)
                        Text("Vos documents sont confidentiels et vérifiés sous 24 à 48h.").font(AkFont.regular(12.5)).foregroundColor(Color(hex: 0x3F6B59)).lineSpacing(3)
                    }.padding(.horizontal, 14).padding(.vertical, 13).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)).padding(.top, 14)
                }.padding(.horizontal, 22).padding(.top, 14)
            }
            PrimaryButton(label: "Envoyer ma candidature", trailingSystemIcon: nil) { router.back() }.padding(.horizontal, 22).padding(.vertical, 14).background(.white)
        }
    }
    func docRow(_ icon: String, _ title: String, _ status: String, done: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 19)).foregroundColor(done ? Ak.green : Ak.faint)
                .frame(width: 40, height: 40).background(done ? Ak.greenSoft : Ak.cardField).clipShape(RoundedRectangle(cornerRadius: 11))
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(AkFont.bold(13.5)).foregroundColor(Ak.ink)
                Text(status).font(AkFont.semibold(11.5)).foregroundColor(done ? Ak.online : Ak.faint)
            }
            Spacer()
            if done { Image(systemName: "checkmark.circle.fill").font(.system(size: 21)).foregroundColor(Ak.online) }
            else { Text("Ajouter").font(AkFont.bold(12)).foregroundColor(Ak.green).padding(.horizontal, 12).padding(.vertical, 7).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 10)) }
        }.padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(done ? Ak.border : Color(hex: 0xC9C2B5), style: StrokeStyle(lineWidth: done ? 1 : 1.5, dash: done ? [] : [5])))
    }
}

// MARK: - Écran 30 — Retrait des gains
struct WithdrawScreen: View {
    @EnvironmentObject var router: Router
    @State private var amount = 1
    var body: some View {
        AkScreen {
            TopBar(title: "Retirer mes gains", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Solde disponible").font(AkFont.regular(12.5)).foregroundColor(Ak.onGreenSoft)
                        Text("184 000 F").font(AkFont.schibstedBlack(34)).foregroundColor(.white).padding(.top, 3)
                    }.padding(18).frame(maxWidth: .infinity, alignment: .leading).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                    Text("Montant à retirer").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18)
                    HStack(alignment: .bottom, spacing: 0) {
                        Text("100 000").font(AkFont.schibstedExtra(30)).foregroundColor(Ak.ink)
                        Text(" F").font(AkFont.semibold(15)).foregroundColor(Ak.faint).padding(.bottom, 4)
                    }.frame(maxWidth: .infinity).padding(16).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 15).stroke(Ak.border, lineWidth: 1)).padding(.top, 11)
                    HStack(spacing: 8) { quick("50 000", 0); quick("100 000", 1); quick("Tout", 2) }.padding(.top, 11)

                    Text("Verser sur").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 18)
                    HStack(spacing: 12) {
                        Image(systemName: "waveform").font(.system(size: 19)).foregroundColor(.white).frame(width: 38, height: 38).background(Ak.wave).clipShape(RoundedRectangle(cornerRadius: 10))
                        VStack(alignment: .leading, spacing: 0) { Text("Wave").font(AkFont.bold(14)).foregroundColor(Ak.ink); Text("05 ** ** ** 11").font(AkFont.regular(12)).foregroundColor(Ak.muted) }
                        Spacer()
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 21)).foregroundColor(Ak.green)
                    }.padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 15).stroke(Ak.green, lineWidth: 2)).padding(.top, 11)
                    HStack(spacing: 8) {
                        Image(systemName: "lock.fill").font(.system(size: 12)).foregroundColor(Ak.green)
                        Text("Sans frais · versé sous 24h").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                    }.frame(maxWidth: .infinity).padding(.top, 13)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            PrimaryButton(label: "Retirer 100 000 F", color: Ak.green, trailingSystemIcon: nil) { router.back() }.padding(.horizontal, 22).padding(.vertical, 14).background(.white)
        }
    }
    func quick(_ label: String, _ idx: Int) -> some View {
        let sel = amount == idx
        return Text(label).font(sel ? AkFont.bold(12.5) : AkFont.semibold(12.5)).foregroundColor(sel ? .white : Ak.inkSoft)
            .frame(maxWidth: .infinity).padding(.vertical, 9).background(sel ? Ak.green : .white).clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(Ak.border, lineWidth: sel ? 0 : 1)).onTapGesture { amount = idx }
    }
}
