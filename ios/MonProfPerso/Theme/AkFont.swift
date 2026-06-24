import SwiftUI

/// Helpers de typographie : Schibsted Grotesk (titres) + Hanken Grotesk (corps).
/// Les fichiers TTF sont bundlés dans Resources/Fonts et déclarés via UIAppFonts.
enum AkFont {
    // Titres / display
    static func schibstedBlack(_ size: CGFloat) -> Font { .custom("SchibstedGrotesk-Black", size: size) }
    static func schibstedExtra(_ size: CGFloat) -> Font { .custom("SchibstedGrotesk-ExtraBold", size: size) }
    static func schibstedBold(_ size: CGFloat) -> Font { .custom("SchibstedGrotesk-Bold", size: size) }

    // Corps / UI
    static func regular(_ size: CGFloat) -> Font  { .custom("HankenGrotesk-Regular", size: size) }
    static func medium(_ size: CGFloat) -> Font   { .custom("HankenGrotesk-Medium", size: size) }
    static func semibold(_ size: CGFloat) -> Font { .custom("HankenGrotesk-SemiBold", size: size) }
    static func bold(_ size: CGFloat) -> Font     { .custom("HankenGrotesk-Bold", size: size) }
    static func extrabold(_ size: CGFloat) -> Font { .custom("HankenGrotesk-ExtraBold", size: size) }
}
