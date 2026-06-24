import SwiftUI

/// Palette MonProfPerso — identique à la maquette et à l'app Android.
enum Ak {
    // Verts (marque)
    static let green       = Color(hex: 0x0E5A43)
    static let greenDark   = Color(hex: 0x0B4937)
    static let greenLine   = Color(hex: 0x1C6A52)
    static let greenSoft   = Color(hex: 0xE2EFE9)

    // Oranges (accent)
    static let orange      = Color(hex: 0xE8722A)
    static let orangeLight = Color(hex: 0xF2A04D)
    static let orangeSoft  = Color(hex: 0xFBE9DA)

    // Fonds crème
    static let cream       = Color(hex: 0xECE7DE)
    static let canvas      = Color(hex: 0xF7F4EE)
    static let cardField   = Color(hex: 0xF2EFE8)
    static let border      = Color(hex: 0xECE7DF)
    static let borderSoft  = Color(hex: 0xEFEAE2)

    // Textes
    static let ink         = Color(hex: 0x18241E)
    static let inkSoft     = Color(hex: 0x384640)
    static let muted       = Color(hex: 0x67756D)
    static let faint       = Color(hex: 0x9AA8A0)
    static let onGreenSoft = Color(hex: 0xC6DCD2)
    static let onGreenFaint = Color(hex: 0xA9C7BB)

    static let star        = Color(hex: 0xF2A04D)
    static let danger      = Color(hex: 0xE0392B)
    static let online      = Color(hex: 0x22A55D)

    // Couleurs des opérateurs Mobile Money
    static let orangeMoney = Color(hex: 0xF2761A)
    static let wave        = Color(hex: 0x1D9BD8)
    static let mtn         = Color(hex: 0xF5C518)
    static let textBody    = Color(hex: 0x4A574F)
}

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue:  Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}
