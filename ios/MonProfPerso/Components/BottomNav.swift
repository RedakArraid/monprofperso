import SwiftUI

struct BottomNav: View {
    let current: ParentTab
    @EnvironmentObject var router: Router

    private func item(_ tab: ParentTab) -> (String, String) {
        switch tab {
        case .accueil:   return ("house.fill", "Accueil")
        case .recherche: return ("magnifyingglass", "Recherche")
        case .cours:     return ("calendar", "Cours")
        case .progres:   return ("chart.line.uptrend.xyaxis", "Progrès")
        case .profil:    return ("person", "Profil")
        }
    }

    var body: some View {
        HStack {
            ForEach(ParentTab.allCases, id: \.self) { tab in
                let (icon, label) = item(tab)
                let active = tab == current
                VStack(spacing: 4) {
                    Image(systemName: icon).font(.system(size: 21))
                    Text(label).font(active ? AkFont.bold(10) : AkFont.semibold(10))
                }
                .foregroundColor(active ? Ak.green : Ak.faint)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .onTapGesture { router.selectTab(tab) }
            }
        }
        .padding(.horizontal, 16).padding(.top, 12).padding(.bottom, 6)
        .background(.white)
    }
}

struct TeacherBottomNav: View {
    let current: TeacherTab
    @EnvironmentObject var router: Router

    private func item(_ tab: TeacherTab) -> (String, String) {
        switch tab {
        case .tableau:  return ("square.grid.2x2.fill", "Tableau")
        case .demandes: return ("tray.fill", "Demandes")
        case .agenda:   return ("calendar", "Agenda")
        case .revenus:  return ("creditcard.fill", "Revenus")
        case .profil:   return ("person", "Profil")
        }
    }

    var body: some View {
        HStack {
            ForEach(TeacherTab.allCases, id: \.self) { tab in
                let (icon, label) = item(tab)
                let active = tab == current
                VStack(spacing: 4) {
                    Image(systemName: icon).font(.system(size: 21))
                    Text(label).font(active ? AkFont.bold(10) : AkFont.semibold(10))
                }
                .foregroundColor(active ? Ak.green : Ak.faint)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .onTapGesture { router.selectTeacherTab(tab) }
            }
        }
        .padding(.horizontal, 14).padding(.top, 12).padding(.bottom, 6)
        .background(.white)
    }
}
