import SwiftUI
import PDFKit

/* ====================================================================== *
 * VISUALISEUR PDF IN-APP (PDFKit natif) + partage
 * Affiche un PDF depuis une URL (endpoint public) et permet de le partager
 * via la feuille de partage système (UIActivityViewController).
 * ====================================================================== */
struct PdfViewerScreen: View {
    @EnvironmentObject var router: Router
    let urlString: String
    let title: String
    @State private var document: PDFDocument? = nil
    @State private var localFile: URL? = nil
    @State private var showShare = false

    var body: some View {
        AkScreen(ignoresBottom: true) {
            TopBar(title: title, subtitle: "Aperçu du document", onBack: { router.back() },
                   trailing: localFile != nil ? AnyView(
                    Image(systemName: "square.and.arrow.up").font(.system(size: 18)).foregroundColor(Ak.inkSoft)
                        .padding(8).contentShape(Rectangle()).onTapGesture { showShare = true }
                   ) : nil)
            if let document {
                PdfKitView(document: document).background(Ak.cream)
            } else {
                Spacer()
                LoadingRow()
                Spacer()
            }
        }
        .task { await load() }
        .sheet(isPresented: $showShare) {
            if let localFile { ShareSheet(items: [localFile]) }
        }
    }

    private func load() async {
        guard let url = URL(string: urlString) else { return }
        // Télécharge les octets, écrit un fichier temporaire nommé (pour le partage).
        guard let (data, _) = try? await URLSession.shared.data(from: url), let doc = PDFDocument(data: data) else { return }
        let safe = title.components(separatedBy: CharacterSet(charactersIn: "/\\:")).joined().trimmingCharacters(in: .whitespaces)
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("\(safe.isEmpty ? "document" : safe).pdf")
        try? data.write(to: tmp)
        document = doc
        localFile = tmp
    }
}

/// Pont SwiftUI ⇄ PDFKit.
private struct PdfKitView: UIViewRepresentable {
    let document: PDFDocument
    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        view.backgroundColor = .clear
        view.document = document
        return view
    }
    func updateUIView(_ uiView: PDFView, context: Context) { uiView.document = document }
}

/// Feuille de partage système.
private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
