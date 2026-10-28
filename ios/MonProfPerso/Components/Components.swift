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
    var color: Color = Ak.green
    var trailingSystemIcon: String? = "arrow.right"
    var action: () -> Void = {}
    @Environment(\.isEnabled) private var isEnabled

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text(label).font(AkFont.bold(16)).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                if let icon = trailingSystemIcon { Image(systemName: icon).font(.system(size: 15, weight: .bold)).accessibilityHidden(true) }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity, minHeight: 52)
            .padding(.horizontal, 16).padding(.vertical, 8)
            .background(isEnabled ? color : Ak.muted)
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.6)
    }
}

/// Icône cloche avec pastille du nombre de notifications non lues
/// (compté en live via /notifications/unread ; pas de pastille si 0 ou API absente).
struct NotificationBell: View {
    @EnvironmentObject var router: Router
    @State private var count = 0
    var size: CGFloat = 44

    var body: some View {
        IconSquare(system: "bell", bg: .white, tint: Ak.inkSoft, size: size) { router.go(.notifications) }
            .accessibilityLabel(count > 0 ? "Notifications, \(count) non lues" : "Notifications")
            .overlay(alignment: .topTrailing) {
                if count > 0 {
                    Text(count > 9 ? "9+" : "\(count)")
                        .font(.custom("HankenGrotesk-Bold", fixedSize: 10)).foregroundColor(Ak.ink)
                        .padding(.horizontal, 4).frame(minWidth: 18, minHeight: 18)
                        .background(Ak.orange).clipShape(Capsule())
                        .offset(x: 5, y: -5)
                        .accessibilityHidden(true)
                }
            }
            .task { if let c = try? await ApiClient.shared.unreadCount() { count = c } }
    }
}

/// États réseau réutilisables et cohérents sur les écrans branchés en live.
/// Une panne de réseau ne crée ni données de démonstration ni faux résultat.
struct OfflineBanner: View {
    var onRetry: () -> Void
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash").font(.system(size: 13, weight: .semibold)).foregroundColor(Ak.orange)
            Text("Connexion indisponible. Réessayez dans un instant.").font(AkFont.semibold(13)).foregroundColor(Ak.orangeText)
            Spacer()
            Button("Réessayer", action: onRetry).font(AkFont.bold(13)).foregroundColor(Ak.orangeText).frame(minHeight: 44)
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(Ak.orangeSoft).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .padding(.bottom, 10)
    }
}

struct LoadingRow: View {
    var body: some View {
        HStack(spacing: 10) {
            ProgressView().tint(Ak.green)
            Text("Chargement…").font(AkFont.regular(13)).foregroundColor(Ak.faint)
        }.frame(maxWidth: .infinity).padding(.vertical, 22)
    }
}

/// Petit carré arrondi contenant une icône (retour, fermer…).
struct IconSquare: View {
    let system: String
    var bg: Color = Ak.cardField
    var tint: Color = Ak.ink
    var size: CGFloat = 44
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
        .accessibilityLabel(system == "arrow.left" ? "Retour" : system == "xmark" ? "Fermer" : system == "bell" ? "Notifications" : system == "slider.horizontal.3" ? "Filtres" : system == "bubble.left" ? "Messages" : "Ouvrir")
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
            Text(title).font(AkFont.schibstedBold(17)).foregroundColor(Ak.ink).fixedSize(horizontal: false, vertical: true)
            Spacer()
            if let a = action {
                Button(a, action: onAction).font(AkFont.semibold(13)).foregroundColor(Ak.green).frame(minHeight: 44)
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
            // Repère graphique : le nom complet adjacent conserve Dynamic Type.
            .font(.custom("SchibstedGrotesk-ExtraBold", fixedSize: fontSize)).foregroundColor(fg)
            .lineLimit(1).minimumScaleFactor(0.5)
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
    @Binding var value: String
    init(value: Binding<String>) { _value = value }
    init(value: String = "0758421903") {
        _value = .constant(value)
    }
    /// Le champ affiche déjà +225 : conserver le numéro national lors d'un collage.
    static func normalizedInput(_ raw: String) -> String {
        let digits = raw.filter(\.isNumber)
        let local: String
        if digits.hasPrefix("00225") { local = String(digits.dropFirst(5)) }
        else if digits.hasPrefix("225") { local = String(digits.dropFirst(3)) }
        else { local = digits }
        return String(local.prefix(10))
    }
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
                TextField("Numéro de téléphone", text: $value, prompt: Text("07 00 00 00 00").foregroundColor(Ak.muted))
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                    .accessibilityLabel("Numéro de téléphone, indicatif +225")
                    .accessibilityIdentifier("auth.phone")
                    .toolbar {
                        ToolbarItemGroup(placement: .keyboard) {
                            Spacer()
                            Button("Terminé") {
                                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                            }
                        }
                    }
                    .font(AkFont.medium(14.5))
                    .foregroundColor(Ak.ink)
                    .onChange(of: value) { v in
                        let normalized = Self.normalizedInput(v)
                        if normalized != v { value = normalized }
                    }
            }
            .padding(.horizontal, 14).padding(.vertical, 11)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
        }
    }
}

// MARK: - Modificateurs utilitaires

extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}

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
            let natural = sub.sizeThatFits(.unspecified)
            let size = sub.sizeThatFits(ProposedViewSize(width: min(natural.width, maxWidth), height: nil))
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
            let natural = sub.sizeThatFits(.unspecified)
            let size = sub.sizeThatFits(ProposedViewSize(width: min(natural.width, bounds.width), height: nil))
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
