import SwiftUI

// MARK: - Écran 12, Mes cours (données live via l'API commune)
struct MyCoursesScreen: View {
    @EnvironmentObject var router: Router
    @StateObject private var store = CoursesStore()
    var body: some View {
        let upcoming = store.courses.filter { $0.status == "upcoming" }
        let done = store.courses.first { $0.status == "done" }
        return AkScreen(ignoresBottom: true) {
            Text("Mes cours").font(AkFont.schibstedExtra(23)).foregroundColor(Ak.ink)
                .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 22).padding(.vertical, 8)
            HStack(spacing: 8) { PillTab(label: "À venir", selected: true); PillTab(label: "Terminés", selected: false); Spacer() }
                .padding(.horizontal, 22).padding(.bottom, 4)
            ScrollView {
                VStack(alignment: .leading, spacing: 13) {
                    if let c = upcoming.first {
                        VStack(alignment: .leading, spacing: 0) {
                            HStack(spacing: 13) {
                                dateTile(c.day_label, c.day_num, true)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("\(c.subject) · \(c.level)").font(AkFont.bold(15)).foregroundColor(Ak.ink)
                                    Text("avec \(c.teacher_name)").font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                                }
                                Spacer()
                                if let b = c.badge { Tag(label: b, fg: Ak.orange, bg: Ak.orangeSoft) }
                            }
                            courseMeta(c)
                            HStack(spacing: 9) {
                                Button { router.go(.manageCourse) } label: {
                                    Text("Détails du cours").font(AkFont.bold(13.5)).foregroundColor(.white)
                                        .frame(maxWidth: .infinity).padding(.vertical, 12).background(Ak.green).clipShape(RoundedRectangle(cornerRadius: 12))
                                }.buttonStyle(.plain)
                                Button { router.go(.messaging) } label: {
                                    Image(systemName: "bubble.left").font(.system(size: 18)).foregroundColor(Ak.green)
                                        .frame(width: 46, height: 44).background(.white).clipShape(RoundedRectangle(cornerRadius: 12))
                                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Ak.border, lineWidth: 1))
                                }.buttonStyle(.plain)
                            }.padding(.top, 14)
                        }.padding(16).background(.white).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Ak.green, lineWidth: 1.5))
                    }

                    if upcoming.count > 1 {
                        let c = upcoming[1]
                        VStack(alignment: .leading, spacing: 0) {
                            HStack(spacing: 13) {
                                dateTile(c.day_label, c.day_num, false)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("\(c.subject) · \(c.level)").font(AkFont.bold(15)).foregroundColor(Ak.ink)
                                    Text("avec \(c.teacher_name)").font(AkFont.regular(12.5)).foregroundColor(Ak.muted)
                                }
                                Spacer()
                            }
                            courseMeta(c)
                        }.akCard(radius: 20, padding: 16).onTapGesture { router.go(.onlineCourse) }
                    }

                    Text("Terminé récemment").font(AkFont.schibstedBold(14.5)).foregroundColor(Ak.ink).padding(.top, 7)
                    HStack(spacing: 13) {
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 22)).foregroundColor(Ak.faint)
                            .frame(width: 44, height: 44).background(Ak.cardField).clipShape(RoundedRectangle(cornerRadius: 13))
                        VStack(alignment: .leading, spacing: 0) {
                            Text("\(done?.subject ?? "Maths") · 14 juin").font(AkFont.bold(14)).foregroundColor(Ak.ink)
                            Text("avec \(done?.teacher_name ?? "Koffi N'Guessan")").font(AkFont.regular(12)).foregroundColor(Ak.muted)
                        }
                        Spacer()
                        Text("Noter").font(AkFont.bold(12)).foregroundColor(Ak.orange)
                            .padding(.horizontal, 12).padding(.vertical, 7)
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: 0xF3C9A8), lineWidth: 1))
                            .onTapGesture { router.go(.review) }
                    }.akCard(radius: 18, padding: 14)
                }.padding(.horizontal, 22).padding(.top, 16)
            }
            .task { await store.load() }
            BottomNav(current: .cours)
        }
    }
    func courseMeta(_ c: CourseDTO) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "clock").font(.system(size: 12)).foregroundColor(Ak.green)
            Text("\(c.time) · \(c.duration)").font(AkFont.regular(12.5)).foregroundColor(Ak.textBody)
            Text("·").foregroundColor(Color(hex: 0xD8D2C8))
            Image(systemName: c.format == "online" ? "video.fill" : "house.fill").font(.system(size: 12)).foregroundColor(Ak.green)
            Text(c.format == "online" ? "En ligne" : (c.location ?? "À domicile")).font(AkFont.regular(12.5)).foregroundColor(Ak.textBody)
        }.padding(.top, 12)
    }
    func dateTile(_ d: String, _ n: String, _ green: Bool) -> some View {
        VStack(spacing: 0) {
            Text(d).font(AkFont.semibold(10)).foregroundColor(green ? Ak.green : Ak.orange)
            Text(n).font(AkFont.schibstedExtra(18)).foregroundColor(green ? Ak.green : Ak.orange)
        }.frame(width: 50, height: 50).background(green ? Ak.greenSoft : Ak.orangeSoft).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

// MARK: - Écran 13, Cours en ligne (visio)
struct OnlineCourseScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen(background: Color(hex: 0x141A17)) {
            HStack(spacing: 8) {
                Circle().fill(Ak.orange).frame(width: 7, height: 7)
                Text("Maths · 3ᵉ    ·    12:45").font(AkFont.semibold(12.5)).foregroundColor(.white)
            }.padding(.horizontal, 15).padding(.vertical, 8).background(.white.opacity(0.1)).clipShape(Capsule())
            .frame(maxWidth: .infinity).padding(.top, 6).padding(.bottom, 12)

            ZStack {
                RadialGradient(colors: [Color(hex: 0x1F6B52), Color(hex: 0x0C2C20)], center: .top, startRadius: 10, endRadius: 400)
                Text("KN").font(AkFont.schibstedExtra(38)).foregroundColor(Ak.green)
                    .frame(width: 104, height: 104).background(Ak.orangeLight).clipShape(Circle())
                VStack { Spacer(); HStack {
                    HStack(spacing: 7) {
                        Image(systemName: "mic.fill").font(.system(size: 13)).foregroundColor(.white)
                        Text("Koffi N'Guessan").font(AkFont.semibold(13)).foregroundColor(.white)
                    }.padding(.horizontal, 12).padding(.vertical, 7).background(.black.opacity(0.4)).clipShape(RoundedRectangle(cornerRadius: 10))
                    Spacer() } }.padding(14)
                VStack { HStack { Spacer()
                    VStack(spacing: 9) {
                        Text("AK").font(AkFont.schibstedExtra(16)).foregroundColor(Ak.green).frame(width: 46, height: 46).background(Ak.greenSoft).clipShape(Circle())
                        Text("Vous").font(AkFont.semibold(11)).foregroundColor(.white)
                    }.frame(width: 92, height: 124)
                    .background(LinearGradient(colors: [Color(hex: 0x3A2A1E), Color(hex: 0x1A130D)], startPoint: .top, endPoint: .bottom))
                    .clipShape(RoundedRectangle(cornerRadius: 18)).overlay(RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.15), lineWidth: 1.5))
                }; Spacer() }.padding(14)
                VStack { HStack {
                    HStack(spacing: 6) {
                        Circle().fill(Ak.orange).frame(width: 8, height: 8)
                        Text("Enregistré").font(AkFont.semibold(11)).foregroundColor(.white)
                    }.padding(.horizontal, 11).padding(.vertical, 6).background(.black.opacity(0.35)).clipShape(RoundedRectangle(cornerRadius: 9))
                    Spacer() }; Spacer() }.padding(14)
            }
            .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous)).padding(.horizontal, 16)

            HStack {
                callBtn("mic.fill"); callBtn("video.fill"); callBtn("pencil"); callBtn("bubble.left.and.bubble.right.fill")
                callBtn("phone.down.fill", bg: Color(hex: 0xE0392B)) { router.go(.review) }
            }.padding(.horizontal, 26).padding(.top, 24).padding(.bottom, 12)
        }
    }
    func callBtn(_ icon: String, bg: Color = .white.opacity(0.12), action: @escaping () -> Void = {}) -> some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 22)).foregroundColor(.white)
                .frame(width: 54, height: 54).background(bg).clipShape(Circle())
        }.buttonStyle(.plain).frame(maxWidth: .infinity)
    }
}

// MARK: - Écran 14, Messagerie
struct MessagingScreen: View {
    @EnvironmentObject var router: Router
    var body: some View {
        AkScreen {
            HStack(spacing: 11) {
                Image(systemName: "arrow.left").font(.system(size: 20)).foregroundColor(Ak.ink).onTapGesture { router.back() }
                InitialsAvatar(initials: "KN", size: 42, radius: 12, fontSize: 15)
                    .overlay(alignment: .bottomTrailing) { Circle().fill(Ak.online).frame(width: 11, height: 11).overlay(Circle().stroke(.white, lineWidth: 2)) }
                VStack(alignment: .leading, spacing: 0) {
                    Text("Koffi N'Guessan").font(AkFont.bold(14.5)).foregroundColor(Ak.ink)
                    Text("En ligne").font(AkFont.semibold(11.5)).foregroundColor(Ak.online)
                }
                Spacer()
                Image(systemName: "phone").font(.system(size: 19)).foregroundColor(Ak.green)
                Image(systemName: "video").font(.system(size: 19)).foregroundColor(Ak.green)
            }.padding(.horizontal, 18).padding(.top, 6).padding(.bottom, 12).background(.white)
            ScrollView {
                VStack(spacing: 10) {
                    Text("Aujourd'hui").font(AkFont.regular(11.5)).foregroundColor(Ak.faint)
                        .padding(.horizontal, 12).padding(.vertical, 4).background(Color(hex: 0xEAE5DC)).clipShape(Capsule())
                    bubble("Bonjour Madame Koné ! Pour samedi, votre fils peut réviser les fonctions affines avant le cours ?", false)
                    bubble("Bonjour Koffi, oui bien sûr. Il a un peu de mal avec les graphiques.", true)
                    HStack {
                        HStack(spacing: 11) {
                            Image(systemName: "doc.fill").font(.system(size: 20)).foregroundColor(Ak.orange)
                                .frame(width: 38, height: 38).background(Ak.orangeSoft).clipShape(RoundedRectangle(cornerRadius: 10))
                            VStack(alignment: .leading, spacing: 0) {
                                Text("Exercices_fonctions.pdf").font(AkFont.bold(13)).foregroundColor(Ak.ink)
                                Text("PDF · 240 Ko").font(AkFont.regular(11)).foregroundColor(Ak.faint)
                            }
                        }.padding(11).background(.white).clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1))
                        Spacer()
                    }
                    bubble("Parfait, on travaillera ça ensemble. À samedi !", false)
                    bubble("Merci beaucoup, à samedi.", true)
                }.padding(.horizontal, 18).padding(.top, 16)
            }
            HStack(spacing: 10) {
                Image(systemName: "plus.circle").font(.system(size: 26)).foregroundColor(Ak.faint)
                Text("Votre message…").font(AkFont.regular(13.5)).foregroundColor(Ak.faint)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 16).padding(.vertical, 11)
                    .background(Ak.cardField).clipShape(Capsule())
                Image(systemName: "paperplane.fill").font(.system(size: 18)).foregroundColor(.white)
                    .frame(width: 44, height: 44).background(Ak.orange).clipShape(Circle())
            }.padding(.horizontal, 16).padding(.vertical, 12).background(.white)
        }
    }
    func bubble(_ text: String, _ sent: Bool) -> some View {
        HStack {
            if sent { Spacer(minLength: 40) }
            Text(text).font(AkFont.regular(13.5)).foregroundColor(sent ? .white : Ak.ink).lineSpacing(3)
                .padding(.horizontal, 14).padding(.vertical, 11)
                .background(sent ? Ak.green : .white)
                .clipShape(.rect(topLeadingRadius: 16, bottomLeadingRadius: sent ? 16 : 4, bottomTrailingRadius: sent ? 4 : 16, topTrailingRadius: 16))
                .overlay(sent ? nil : RoundedRectangle(cornerRadius: 14).stroke(Ak.border, lineWidth: 1))
            if !sent { Spacer(minLength: 40) }
        }
    }
}

// MARK: - Écran 15, Laisser un avis
struct ReviewScreen: View {
    @EnvironmentObject var router: Router
    @State private var rating = 5
    @State private var qualities: Set<Int> = [0, 1, 3]
    private let labels = ["Excellent !", "Très bien", "Bien", "Moyen", "À améliorer"]
    var body: some View {
        AkScreen {
            TopBar(title: "Votre avis", onBack: { router.back() })
            ScrollView {
                VStack(spacing: 0) {
                    InitialsAvatar(initials: "KN", size: 64, radius: 18, fontSize: 23)
                    Text("Koffi N'Guessan").font(AkFont.schibstedExtra(17)).foregroundColor(Ak.ink).padding(.top, 12)
                    Text("Cours de Maths · 14 juin").font(AkFont.regular(12.5)).foregroundColor(Ak.muted).padding(.top, 2)
                    Text("Comment s'est passé le cours ?").font(AkFont.bold(15)).foregroundColor(Ak.ink).padding(.top, 22)
                    HStack(spacing: 11) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: "star.fill").font(.system(size: 36)).foregroundColor(star <= rating ? Ak.star : Ak.border)
                                .onTapGesture { rating = star }
                        }
                    }.padding(.top, 14)
                    Text(labels[5 - rating]).font(AkFont.bold(13)).foregroundColor(Ak.green).padding(.top, 10)
                    FlowLayout(spacing: 8) {
                        ForEach(Array(["Ponctuel", "Pédagogue", "Patient", "Explications claires"].enumerated()), id: \.offset) { i, label in
                            qual(label, qualities.contains(i)).onTapGesture { if qualities.contains(i) { qualities.remove(i) } else { qualities.insert(i) } }
                        }
                    }.padding(.top, 20)
                    Text("Partagez votre expérience pour aider les autres parents (optionnel)…")
                        .font(AkFont.regular(13)).foregroundColor(Ak.faint).lineSpacing(3)
                        .frame(maxWidth: .infinity, minHeight: 88, alignment: .topLeading).padding(14)
                        .background(.white).clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Ak.border, lineWidth: 1)).padding(.top, 20)
                }.padding(.horizontal, 22).padding(.top, 18)
            }
            PrimaryButton(label: "Envoyer mon avis", trailingSystemIcon: nil) { router.go(.myCourses) }
                .padding(.horizontal, 22).padding(.bottom, 12)
        }
    }
    func qual(_ t: String, _ sel: Bool) -> some View {
        Text(t).font(sel ? AkFont.bold(12.5) : AkFont.semibold(12.5)).foregroundColor(sel ? .white : Ak.inkSoft)
            .padding(.horizontal, 14).padding(.vertical, 8).background(sel ? Ak.green : .white).clipShape(Capsule())
            .overlay(Capsule().stroke(Ak.border, lineWidth: sel ? 0 : 1))
    }
}
