import SwiftUI

// MARK: - Conteneur d'écran

/// Fond + insets système ; remplace l'AkScreen d'Android.
struct AkScreen<Content: View>: View {
    var background: Color = Ak.canvas
    var ignoresBottom: Bool = false
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(spacing: 0) { content() }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(background.ignoresSafeArea(edges: ignoresBottom ? .bottom : []))
    }
}

// MARK: - Boutons

struct PrimaryButton: View {
    let label: String
    var color: Color = Ak.orange
    var trailingSystemIcon: String? = "arrow.right"
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text(label).font(AkFont.bold(15.5))
                if let icon = trailingSystemIcon { Image(systemName: icon).font(.system(size: 15, weight: .bold)) }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(color)
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

/// Petit carré arrondi contenant une icône (retour, fermer…).
struct IconSquare: View {
    let system: String
    var bg: Color = Ak.cardField
    var tint: Color = Ak.ink
    var size: CGFloat = 40
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            Image(systemName: system)
                .font(.system(size: size * 0.45, weight: .semibold))
                .foregroundColor(tint)
                .frame(width: size, height: size)
                .background(bg)
                .clipShape(RoundedRectangle(cornerRadius: size * 0.3, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct TopBar: View {
    let title: String
    var subtitle: String? = nil
    var closeIcon: Bool = false
    var onBack: () -> Void
    var trailing: AnyView? = nil

    var body: some View {
        HStack(spacing: 13) {
            IconSquare(system: closeIcon ? "xmark" : "arrow.left", action: onBack)
            VStack(alignment: .leading, spacing: 1) {
                if !title.isEmpty {
                    Text(title).font(AkFont.schibstedExtra(18)).foregroundColor(Ak.ink)
                }
                if let s = subtitle { Text(s).font(AkFont.regular(12.5)).foregroundColor(Ak.muted) }
            }
            Spacer()
            if let trailing { trailing }
        }
        .padding(.horizontal, 22).padding(.vertical, 6)
    }
}

// MARK: - En-tête de section

struct SectionHeader: View {
    let title: String
    var action: String? = "Tout voir"
    var onAction: () -> Void = {}

    var body: some View {
        HStack {
            Text(title).font(AkFont.schibstedBold(16.5)).foregroundColor(Ak.ink)
            Spacer()
            if let a = action {
                Text(a).font(AkFont.semibold(13)).foregroundColor(Ak.green).onTapGesture(perform: onAction)
            }
        }
    }
}

// MARK: - Chips & tags

struct Chip: View {
    let label: String
    var selected: Bool = false
    var systemIcon: String? = nil

    var body: some View {
        HStack(spacing: 5) {
            if let icon = systemIcon { Image(systemName: icon).font(.system(size: 12)) }
            Text(label).font(selected ? AkFont.bold(12.5) : AkFont.semibold(12.5))
        }
        .foregroundColor(selected ? .white : Ak.inkSoft)
        .padding(.horizontal, 14).padding(.vertical, 9)
        .background(selected ? Ak.green : .white)
        .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Ak.border, lineWidth: selected ? 0 : 1))
    }
}

struct Tag: View {
    let label: String
    var fg: Color = Ak.green
    var bg: Color = Ak.greenSoft

    var body: some View {
        Text(label).font(AkFont.semibold(11.5)).foregroundColor(fg)
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(bg).clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct Pill: View {
    let text: String
    var fg: Color
    var bg: Color
    var body: some View {
        Text(text).font(AkFont.bold(12)).foregroundColor(fg)
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(bg).clipShape(Capsule())
    }
}

struct PillTab: View {
    let label: String
    var selected: Bool
    var body: some View {
        Text(label).font(selected ? AkFont.bold(13) : AkFont.semibold(13))
            .foregroundColor(selected ? .white : Ak.muted)
            .padding(.horizontal, 18).padding(.vertical, 9)
            .background(selected ? Ak.green : .white)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Ak.border, lineWidth: selected ? 0 : 1))
    }
}

// MARK: - Avatar à initiales + sceau vérifié

struct InitialsAvatar: View {
    let initials: String
    var size: CGFloat = 54
    var bg: Color = Ak.greenSoft
    var fg: Color = Ak.green
    var radius: CGFloat = 15
    var fontSize: CGFloat = 19
    var verified: Bool = false

    var body: some View {
        Text(initials)
            .font(AkFont.schibstedExtra(fontSize)).foregroundColor(fg)
            .frame(width: size, height: size)
            .background(bg)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(alignment: .bottomTrailing) {
                if verified {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 18)).foregroundColor(Ak.green)
                        .background(Circle().fill(.white).frame(width: 16, height: 16))
                        .offset(x: 4, y: 4)
                }
            }
    }
}

// MARK: - Note (étoile)

struct RatingInline: View {
    let value: String
    var reviews: String? = nil
    var place: String? = nil
    var body: some View {
        HStack(spacing: 9) {
            HStack(spacing: 3) {
                Image(systemName: "star.fill").font(.system(size: 11)).foregroundColor(Ak.star)
                Text(value).font(AkFont.bold(12.5)).foregroundColor(Ak.ink)
            }
            if let r = reviews { Text(r).font(AkFont.regular(12)).foregroundColor(Ak.faint) }
            if let p = place { Text("· \(p)").font(AkFont.regular(12)).foregroundColor(Ak.faint) }
        }
    }
}

// MARK: - Champ de formulaire (affichage maquette)

struct FieldDisplay: View {
    let label: String
    let value: String
    var leadingIcon: String? = nil
    var trailingIcon: String? = nil
    var valueColor: Color = Ak.ink

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(AkFont.semibold(12)).foregroundColor(Ak.muted)
            HStack(spacing: 10) {
                if let l = leadingIcon { Image(systemName: l).font(.system(size: 16)).foregroundColor(Ak.faint) }
                Text(value).font(AkFont.medium(14.5)).foregroundColor(valueColor)
                Spacer()
                if let t = trailingIcon { Image(systemName: t).font(.system(size: 16)).foregroundColor(Ak.faint) }
            }
            .padding(.horizontal, 15).padding(.vertical, 14)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
        }
    }
}

/// Champ téléphone avec drapeau ivoirien + indicatif.
struct PhoneField: View {
    var value: String = "07 58 42 19 03"
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Numéro de téléphone").font(AkFont.semibold(12)).foregroundColor(Ak.muted)
            HStack(spacing: 10) {
                HStack(spacing: 6) {
                    HStack(spacing: 0) {
                        Rectangle().fill(Ak.orangeMoney)
                        Rectangle().fill(.white)
                        Rectangle().fill(Color(hex: 0x0E9F6E))
                    }
                    .frame(width: 18, height: 12).clipShape(RoundedRectangle(cornerRadius: 2))
                    Text("+225").font(AkFont.bold(13)).foregroundColor(Ak.ink)
                }
                .padding(.horizontal, 9).padding(.vertical, 6)
                .background(Ak.cardField).clipShape(RoundedRectangle(cornerRadius: 9))
                Text(value).font(AkFont.medium(14.5)).foregroundColor(Ak.ink)
                Spacer()
            }
            .padding(.horizontal, 14).padding(.vertical, 11)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
        }
    }
}

// MARK: - Modificateurs utilitaires

extension View {
    /// Carte blanche avec bord doux.
    func akCard(radius: CGFloat = 18, bg: Color = .white, bordered: Bool = true, padding: CGFloat = 13) -> some View {
        self.padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(bg)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: radius).stroke(Ak.border, lineWidth: bordered ? 1 : 0))
    }
}

// MARK: - Flow layout (retour à la ligne automatique)

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var rowWidth: CGFloat = 0, rowHeight: CGFloat = 0
        var totalHeight: CGFloat = 0, totalWidth: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if rowWidth + size.width > maxWidth, rowWidth > 0 {
                totalHeight += rowHeight + spacing
                totalWidth = max(totalWidth, rowWidth - spacing)
                rowWidth = 0; rowHeight = 0
            }
            rowWidth += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        totalHeight += rowHeight
        totalWidth = max(totalWidth, rowWidth - spacing)
        return CGSize(width: min(totalWidth, maxWidth), height: totalHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX; y += rowHeight + spacing; rowHeight = 0
            }
            sub.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

// MARK: - Barre de progression

struct ProgressBarLine: View {
    let fraction: CGFloat
    var color: Color = Ak.green
    var height: CGFloat = 8
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color(hex: 0xEAE5DC))
                Capsule().fill(color).frame(width: geo.size.width * fraction)
            }
        }
        .frame(height: height)
    }
}
