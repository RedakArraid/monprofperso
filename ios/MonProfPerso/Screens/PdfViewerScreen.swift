import SwiftUI
import PDFKit

/* ====================================================================== *
 * VISUALISEUR PDF IN-APP (PDFKit natif)
 * Affiche un PDF depuis une URL (endpoint public /legal/:slug/file).
 * ====================================================================== */
struct PdfViewerScreen: View {
    @EnvironmentObject var router: Router
    let urlString: String
    let title: String

    var body: some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: title, subtitle: "Aperçu du document", onBack: { router.back() })
            if let url = URL(string: urlString) {
                PdfKitView(url: url).background(Ak.cream)
            } else {
                Spacer()
                Text("Document indisponible.").font(AkFont.regular(14)).foregroundColor(Ak.muted)
                Spacer()
            }
        }
    }
}

/// Pont SwiftUI ⇄ PDFKit. Charge le document hors du thread principal.
private struct PdfKitView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        view.backgroundColor = .clear
        DispatchQueue.global(qos: .userInitiated).async {
            let doc = PDFDocument(url: url)
            DispatchQueue.main.async { view.document = doc }
        }
        return view
    }

    func updateUIView(_ uiView: PDFView, context: Context) {}
}
