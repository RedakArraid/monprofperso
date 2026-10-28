import SwiftUI

private struct NavigationItem: View {
    let icon: String
    let label: String
    let identifier: String
    let active: Bool
    let action: () -> Void
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        Button(action: action) {
            VStack(spacing: 5) {
                Image(systemName: icon).font(.system(size: 20, weight: .semibold)).accessibilityHidden(true)
                Text(label).font(active ? AkFont.bold(11.5) : AkFont.semibold(11.5))
                    .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            }
            .foregroundColor(active ? Ak.green : Ak.muted)
            .frame(minWidth: typeSize.isAccessibilitySize ? 120 : 0,
                   maxWidth: typeSize.isAccessibilitySize ? nil : .infinity, minHeight: 52)
            .padding(.horizontal, 4).padding(.vertical, 4)
            .background(active ? Ak.greenSoft : .clear)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(identifier)
        .accessibilityAddTraits(active ? .isSelected : [])
    }
}

/// Les grands caractères gardent leurs libellés complets dans une barre défilable.
private struct NavigationBarContent<Content: View>: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @ViewBuilder let content: () -> Content
    var body: some View {
        Group {
            if typeSize.isAccessibilitySize {
                ScrollView(.horizontal, showsIndicators: false) { HStack(spacing: 4, content: content) }
            } else {
                HStack(alignment: .top, spacing: 4, content: content)
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(Color.white.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) { Rectangle().fill(Ak.border).frame(height: 1) }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Navigation principale")
    }
}

struct BottomNav: View {
    let current: ParentTab
    @EnvironmentObject var router: Router

    private func item(_ tab: ParentTab) -> (String, String) {
        switch tab {
        case .accueil:   return ("house.fill", "Accueil")
        case .recherche: return ("magnifyingglass", "Recherche")
        case .cours:     return ("calendar", "Cours")
        case .progres:   return ("chart.line.uptrend.xyaxis", "Bilans")
        case .profil:    return ("person.crop.circle", "Compte")
        }
    }

    var body: some View {
        NavigationBarContent {
            ForEach(ParentTab.allCases.filter { $0 != .progres || router.featureEnabled("progress") }, id: \.self) { tab in
                let (icon, label) = item(tab)
                NavigationItem(icon: icon, label: label, identifier: "nav.\(tab)", active: tab == current) {
                    router.selectTab(tab)
                }
            }
        }
    }
}

struct TeacherBottomNav: View {
    let current: TeacherTab
    @EnvironmentObject var router: Router

    private func item(_ tab: TeacherTab) -> (String, String) {
        switch tab {
        case .tableau:  return ("square.grid.2x2.fill", "Accueil")
        case .demandes: return ("tray.fill", "Demandes")
        case .agenda:   return ("calendar", "Agenda")
        case .revenus:  return ("creditcard.fill", "Revenus")
        case .profil:   return ("person.crop.circle", "Compte")
        }
    }

    var body: some View {
        NavigationBarContent {
            ForEach(TeacherTab.allCases, id: \.self) { tab in
                let (icon, label) = item(tab)
                NavigationItem(icon: icon, label: label, identifier: "teacher.nav.\(tab)", active: tab == current) {
                    router.selectTeacherTab(tab)
                }
            }
        }
    }
}
