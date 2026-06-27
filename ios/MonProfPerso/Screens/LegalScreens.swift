import SwiftUI
import UniformTypeIdentifiers

/* ====================================================================== *
 * DOCUMENTS LÉGAUX (CGU, confidentialité, mentions légales)
 * - LegalScreen : vue utilisateur (lecture), ouvre le PDF via /legal/:slug/file.
 * - AdminLegalScreen : l'admin téléverse/remplace le PDF (PUT /admin/legal/:slug).
 * Conformité Loi CI N°2013-450 (cf. docs/COMPLIANCE.md).
 * ====================================================================== */

struct LegalScreen: View {
    @EnvironmentObject var router: Router
    @Environment(\.openURL) private var openURL
    @State private var docs: [LegalDocDTO] = []
    @State private var loading = true

    var body: some View {
        AkScreen {
            TopBar(title: "Documents légaux", subtitle: "CGU, confidentialité & mentions", onBack: { router.back() })
            ScrollView {
                VStack(spacing: 10) {
                    if loading { LoadingRow() }
                    ForEach(docs) { d in row(d) }
                }.padding(.horizontal, 22).padding(.top, 12)
            }
        }
        .task { docs = (try? await ApiClient.shared.legalDocs()) ?? []; loading = false }
    }

    private func row(_ d: LegalDocDTO) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "doc.text.fill").font(.system(size: 18)).foregroundColor(Ak.green)
                .frame(width: 40, height: 40).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 2) {
                Text(d.title).font(AkFont.schibstedBold(14)).foregroundColor(Ak.ink)
                Text(d.hasFile ? "Disponible" + (d.version.map { " · v\($0)" } ?? "") : "Bientôt disponible")
                    .font(AkFont.regular(11.5)).foregroundColor(d.hasFile ? Ak.muted : Ak.faint)
            }
            Spacer()
            if d.hasFile { Image(systemName: "chevron.right").font(.system(size: 14)).foregroundColor(Ak.faint) }
        }
        .padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
        .contentShape(Rectangle())
        .onTapGesture {
            if d.hasFile { openURL(ApiConfig.baseURL.appendingPathComponent("api/legal/\(d.slug)/file")) }
        }
    }
}

struct AdminLegalScreen: View {
    @EnvironmentObject var router: Router
    @State private var docs: [LegalDocDTO] = []
    @State private var loading = true
    @State private var message: String? = nil
    @State private var showImporter = false
    @State private var targetSlug: String? = nil

    var body: some View {
        AkScreen {
            TopBar(title: "Documents légaux", subtitle: "Espace administrateur", onBack: { router.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Téléversez le PDF de chaque document pour le mettre à jour. Les utilisateurs y accèdent depuis « Mon compte ».")
                        .font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                    if loading { LoadingRow() }
                    VStack(spacing: 11) { ForEach(docs) { d in row(d) } }.padding(.top, 16)
                    if let message { Text(message).font(AkFont.semibold(12.5)).foregroundColor(Ak.green).padding(.top, 14) }
                }.padding(.horizontal, 22).padding(.top, 8)
            }
        }
        .task { await reload() }
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.pdf], allowsMultipleSelection: false) { result in
            guard case .success(let urls) = result, let url = urls.first, let slug = targetSlug else { return }
            let access = url.startAccessingSecurityScopedResource()
            defer { if access { url.stopAccessingSecurityScopedResource() } }
            guard let data = try? Data(contentsOf: url) else { return }
            let b64 = data.base64EncodedString()
            let name = url.lastPathComponent
            let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/pdf"
            Task { @MainActor in
                do {
                    _ = try await ApiClient.shared.uploadLegalDoc(slug: slug, fileName: name, mimeType: mime, contentBase64: b64)
                    message = "Document mis à jour"; await reload()
                } catch { message = "Échec de l'envoi" }
            }
        }
    }

    private func reload() async { docs = (try? await ApiClient.shared.legalDocs()) ?? []; loading = false }

    private func row(_ d: LegalDocDTO) -> some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(spacing: 12) {
                Image(systemName: "doc.text.fill").font(.system(size: 18)).foregroundColor(Ak.green)
                    .frame(width: 40, height: 40).background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 12))
                VStack(alignment: .leading, spacing: 2) {
                    Text(d.title).font(AkFont.schibstedBold(14)).foregroundColor(Ak.ink)
                    Text(legalSubtitle(d)).font(AkFont.regular(11.5)).foregroundColor(d.hasFile ? Ak.muted : Ak.orange)
                }
                Spacer()
                if d.hasFile { Image(systemName: "checkmark.circle.fill").font(.system(size: 18)).foregroundColor(Ak.green) }
            }
            HStack(spacing: 6) {
                Image(systemName: "paperclip").font(.system(size: 13, weight: .bold))
                Text(d.hasFile ? "Remplacer le PDF" : "Téléverser un PDF").font(AkFont.bold(12.5))
            }
            .foregroundColor(Ak.green).padding(.horizontal, 14).padding(.vertical, 10)
            .background(Ak.greenSoft).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .contentShape(Rectangle()).onTapGesture { targetSlug = d.slug; showImporter = true }
        }
        .padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
    }

    private func legalSubtitle(_ d: LegalDocDTO) -> String {
        var parts: [String] = []
        if let v = d.version { parts.append("v\(v)") }
        parts.append(d.hasFile ? (d.file_name ?? "PDF en ligne") : "aucun PDF")
        return parts.joined(separator: " · ")
    }
}
