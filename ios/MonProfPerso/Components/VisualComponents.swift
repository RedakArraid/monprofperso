import SwiftUI

/// Illustration décorative commune au site et aux applications, sans texte incrusté.
struct LearningArtwork: View {
    var body: some View {
        Image("LearningIllustration")
            .resizable().scaledToFit()
            .aspectRatio(4.0 / 3.0, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .accessibilityHidden(true)
    }
}

struct ScreenState: View {
    let icon: String
    let title: String
    let message: String
    var retry: (() -> Void)? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: icon).font(.system(size: 24, weight: .semibold)).foregroundColor(Ak.green)
                .frame(width: 52, height: 52).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 16))
                .accessibilityHidden(true)
            Text(title).font(AkFont.schibstedBold(19)).foregroundColor(Ak.ink)
            Text(message).font(AkFont.regular(15)).foregroundColor(Ak.muted).fixedSize(horizontal: false, vertical: true)
            if let retry {
                Button("Réessayer", action: retry).font(AkFont.bold(15)).foregroundColor(Ak.green).frame(minHeight: 44)
            }
        }.akCard(radius: 20, padding: 20)
    }
}

struct AccountNavigationRow: View {
    let title: String
    let icon: String
    var identifier: String = ""
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 13) {
                Image(systemName: icon).font(.system(size: 18, weight: .medium)).foregroundColor(Ak.green)
                    .frame(width: 40, height: 40).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 12))
                    .accessibilityHidden(true)
                Text(title).font(AkFont.semibold(15)).foregroundColor(Ak.ink).multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundColor(Ak.muted)
                    .accessibilityHidden(true)
            }.frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                .padding(13).background(.white).clipShape(RoundedRectangle(cornerRadius: 17))
                .overlay(RoundedRectangle(cornerRadius: 17).stroke(Ak.border, lineWidth: 1))
                .contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityIdentifier(identifier)
    }
}

struct TeacherPreviewCard: View {
    let teacher: TeacherDTO
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 13) {
                    InitialsAvatar(initials: teacher.initials, size: 56, radius: 17, fontSize: 20, verified: teacher.verified)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(teacher.name).font(AkFont.schibstedBold(18)).foregroundColor(Ak.ink)
                        Text(teacher.subjects).font(AkFont.regular(14)).foregroundColor(Ak.muted)
                    }.fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    Image(systemName: "arrow.up.right").font(.system(size: 15, weight: .semibold)).foregroundColor(Ak.green).accessibilityHidden(true)
                }
                Label(teacher.location, systemImage: "mappin.and.ellipse").font(AkFont.regular(14)).foregroundColor(Ak.muted)
                Text(teacher.ratingLabel + (teacher.reviews_count > 0 ? " · \(teacher.reviews_count) avis" : ""))
                    .font(AkFont.semibold(13)).foregroundColor(Ak.inkSoft)
                FlowLayout(spacing: 8) {
                    if teacher.verified { Tag(label: "Profil vérifié") }
                    if teacher.formats?.contains("home") == true { Tag(label: "À domicile", fg: Ak.inkSoft, bg: Ak.cardField) }
                }
                Divider()
                Text("\(teacher.price_per_hour.formattedFCFA) F CFA / heure")
                    .font(AkFont.bold(16)).foregroundColor(Ak.green).fixedSize(horizontal: false, vertical: true)
            }.multilineTextAlignment(.leading).akCard(radius: 21, padding: 18)
                .contentShape(RoundedRectangle(cornerRadius: 21))
        }.buttonStyle(.plain).accessibilityIdentifier("teacher.card.\(teacher.id)")
    }
}

struct FinancialMetric: View {
    let title: String
    let amount: Int
    var emphasized = false
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(AkFont.semibold(13)).foregroundColor(emphasized ? Ak.onGreenSoft : Ak.muted)
            Text(amount.formattedFCFA).font(AkFont.schibstedExtra(emphasized ? 30 : 23))
                .foregroundColor(emphasized ? .white : Ak.ink).fixedSize(horizontal: false, vertical: true)
            Text("F CFA").font(AkFont.semibold(12)).foregroundColor(emphasized ? Ak.onGreenSoft : Ak.muted)
        }.frame(maxWidth: .infinity, alignment: .leading).padding(18)
            .background(emphasized ? Ak.green : .white)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(emphasized ? Ak.green : Ak.border, lineWidth: 1))
    }
}
