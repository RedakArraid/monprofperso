import XCTest

/// Vraie application sur simulateur, API de fixtures locale extérieure au binaire.
/// Les captures restent attachées aux résultats même lorsque les tests réussissent.
final class VisualJourneyTests: XCTestCase {
    private let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    override func tearDownWithError() throws {
        // hasSucceeded n'est définitif qu'après la clôture du test.
        if let run = testRun, run.totalFailureCount > 0 { capture("failure-\(name)") }
        app.terminate()
    }

    private func launch(accessibilitySize: Bool = false) {
        app.launchArguments = ["--visual-test-reset-session", "-AppleLanguages", "(fr)", "-AppleLocale", "fr_CI"]
        if accessibilitySize {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL", "-AppleInterfaceStyle", "Dark"]
        }
        app.launch()
        XCTAssertTrue(app.buttons["welcome.login"].waitForExistence(timeout: 15))
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func visible(_ element: XCUIElement, scroll: XCUIElement? = nil) {
        let container = scroll ?? app.scrollViews.firstMatch
        for _ in 0..<12 {
            if element.exists && element.isHittable { break }
            container.swipeUp()
        }
        XCTAssertTrue(element.exists, "Élément absent : \(element)")
        XCTAssertTrue(element.isHittable, "Élément inaccessible après défilement : \(element)")
    }

    private func dismissKeyboard() {
        let done = app.buttons["Terminé"].firstMatch
        if done.exists && done.isHittable { done.tap() }
    }

    @discardableResult
    private func revealNavigationItem(_ item: XCUIElement, swipingLeft: Bool) -> Int {
        let navigation = app.scrollViews["navigation.scroll"]
        XCTAssertTrue(navigation.waitForExistence(timeout: 10))
        var swipes = 0
        func fullyVisible() -> Bool {
            item.exists && item.isHittable && navigation.frame.contains(item.frame)
        }
        while swipes < 8 && !fullyVisible() {
            if swipingLeft { navigation.swipeLeft() } else { navigation.swipeRight() }
            swipes += 1
        }
        XCTAssertTrue(fullyVisible(), "L’onglet doit être entièrement visible après les gestes de défilement, avant le tap XCTest.")
        return swipes
    }

    private func assertOTPInputVisible(_ field: XCUIElement) {
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(keyboard.waitForExistence(timeout: 10))
        let viewport = app.scrollViews["otp.scroll"]
        let visible = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            guard field.exists, field.isHittable, viewport.exists, keyboard.exists else { return false }
            let frame = field.frame
            return !frame.isEmpty && frame.minY >= viewport.frame.minY
                && frame.maxY <= min(viewport.frame.maxY, keyboard.frame.minY)
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [visible], timeout: 10), .completed,
                       "Le champ OTP doit être entièrement visible au-dessus du clavier, avant tout tap ou défilement du test.")
    }

    private func login(_ phone: String, capturePrefix: String? = nil, assertVisibleOtp: Bool = false) {
        app.buttons["welcome.login"].tap()
        let field = app.textFields["auth.phone"]
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        if let capturePrefix { capture(capturePrefix + "-login") }
        field.tap(); field.typeText(phone)
        dismissKeyboard()
        let request = app.buttons["auth.submit"]
        visible(request)
        request.tap()
        let code = app.textFields["otp.code"]
        XCTAssertTrue(code.waitForExistence(timeout: 10))
        if assertVisibleOtp { assertOTPInputVisible(code) }
        if let capturePrefix { capture(capturePrefix + "-otp-keyboard") }
        code.tap(); code.typeText("123456")
        dismissKeyboard()
        let verify = app.buttons["otp.verify"]
        XCTAssertTrue(verify.isHittable)
        verify.tap()
    }

    private func openResourcesFromAccount() {
        app.buttons["nav.profil"].tap()
        let resources = app.buttons["Ressources pédagogiques"].firstMatch
        XCTAssertTrue(resources.waitForExistence(timeout: 10))
        visible(resources, scroll: app.scrollViews["account.scroll"])
        resources.tap()
        XCTAssertTrue(app.staticTexts["Ressources & supports"].waitForExistence(timeout: 10))
    }

    private func assertNoSampleResources() {
        for title in ["Fiche, Théorème de Thalès", "Série d'exercices, Optique", "Devoir, Commentaire de texte"] {
            XCTAssertFalse(app.staticTexts[title].exists, "Une réponse vide ou en erreur ne doit pas afficher une ressource de démonstration.")
        }
    }

    func testParentScreensAndNavigation() {
        launch()
        capture("01-welcome-top")
        visible(app.buttons["welcome.role.2"], scroll: app.scrollViews["welcome.scroll"])
        XCTAssertTrue(app.buttons["welcome.continue"].isHittable)
        capture("02-welcome-roles")
        login("0700000101", capturePrefix: "03-parent")
        XCTAssertTrue(app.buttons["home.search"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.staticTexts["À chaque matière, son prof"].waitForExistence(timeout: 10))
        capture("04-parent-home")
        app.buttons["nav.recherche"].tap()
        let teacher = app.buttons["teacher.card.101"]
        XCTAssertTrue(teacher.waitForExistence(timeout: 10))
        capture("05-search")
        visible(teacher, scroll: app.scrollViews["search.scroll"]); teacher.tap()
        XCTAssertTrue(app.buttons["teacher.book"].waitForExistence(timeout: 10))
        capture("06-teacher-profile")
        app.buttons["teacher.book"].tap()
        XCTAssertTrue(app.staticTexts["Réserver un cours"].waitForExistence(timeout: 10))
        capture("07-booking-form")
        app.buttons["Retour"].firstMatch.tap()
        app.buttons["Retour"].firstMatch.tap()
        app.buttons["nav.cours"].tap()
        let details = app.buttons["course.details.501"]
        XCTAssertTrue(details.waitForExistence(timeout: 10))
        capture("08-parent-courses")
        visible(details); details.tap()
        XCTAssertTrue(app.staticTexts["Détail du cours"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Cours planifié"].waitForExistence(timeout: 10))
        capture("09-course-detail")
        // Le formulaire vient après le récapitulatif dans une LazyVStack.
        visible(app.buttons["Enregistrer"].firstMatch)
        XCTAssertTrue(app.staticTexts["Informations du rendez-vous"].exists)
        capture("09-course-appointment")
        app.buttons["Retour"].firstMatch.tap()
        app.buttons["nav.profil"].tap()
        XCTAssertTrue(app.buttons["account.privacy"].waitForExistence(timeout: 10))
        capture("10-parent-account")
        let privacy = app.buttons["account.privacy"]
        visible(privacy, scroll: app.scrollViews["account.scroll"]); privacy.tap()
        XCTAssertTrue(app.staticTexts["Conditions et confidentialité"].waitForExistence(timeout: 10))
        capture("11-account-privacy")
    }

    func testTeacherScreens() {
        launch()
        login("0700000102")
        XCTAssertTrue(app.buttons["teacher.nav.revenus"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["teacher.earnings"].waitForExistence(timeout: 10))
        capture("12-teacher-home")
        app.buttons["teacher.nav.revenus"].tap()
        XCTAssertTrue(app.staticTexts["Disponible pour versement"].waitForExistence(timeout: 10))
        capture("13-teacher-finances")
        app.buttons["teacher.nav.demandes"].tap()
        XCTAssertTrue(app.staticTexts["Réservation directe"].waitForExistence(timeout: 10))
        capture("14-teacher-requests")
    }

    func testLargeTypeAndReachableAuthentication() {
        launch(accessibilitySize: true)
        capture("15-accessibility-welcome-top")
        visible(app.buttons["welcome.role.2"], scroll: app.scrollViews["welcome.scroll"])
        XCTAssertTrue(app.buttons["welcome.continue"].isHittable)
        let bounds = app.windows.firstMatch.frame
        let continueFrame = app.buttons["welcome.continue"].frame
        XCTAssertGreaterThanOrEqual(continueFrame.height, 44)
        XCTAssertGreaterThanOrEqual(continueFrame.minX, bounds.minX)
        XCTAssertLessThanOrEqual(continueFrame.maxX, bounds.maxX)
        capture("16-accessibility-welcome-roles")
        login("0700000101", capturePrefix: "17-accessibility", assertVisibleOtp: true)
        XCTAssertTrue(app.buttons["home.search"].waitForExistence(timeout: 15))
        capture("18-accessibility-home")
        let account = app.buttons["nav.profil"]
        XCTAssertGreaterThan(revealNavigationItem(account, swipingLeft: true), 0)
        capture("18-accessibility-navigation-end")
        account.tap()
        XCTAssertTrue(app.staticTexts["Mon compte"].waitForExistence(timeout: 10))
        capture("18-accessibility-account")
        let home = app.buttons["nav.accueil"]
        revealNavigationItem(home, swipingLeft: false)
        home.tap()
        XCTAssertTrue(app.buttons["home.search"].waitForExistence(timeout: 10))
    }

    func testEmptyAndUnavailableStatesAreDistinct() {
        launch()
        login("0700000198")
        XCTAssertTrue(app.buttons["nav.cours"].waitForExistence(timeout: 15))
        app.buttons["nav.cours"].tap()
        XCTAssertTrue(app.staticTexts["Aucun cours pour le moment"].waitForExistence(timeout: 10))
        capture("19-empty-courses")
        openResourcesFromAccount()
        XCTAssertTrue(app.staticTexts["Aucune ressource disponible"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["Ressources indisponibles"].exists)
        XCTAssertFalse(app.buttons["Réessayer"].exists)
        assertNoSampleResources()
        let coursesFilter = app.buttons["resources.type.course"]
        XCTAssertGreaterThanOrEqual(coursesFilter.frame.height, 44)
        coursesFilter.tap()
        XCTAssertTrue(coursesFilter.isSelected)
        XCTAssertTrue(app.staticTexts["Aucune ressource disponible"].waitForExistence(timeout: 10))
        assertNoSampleResources()
        capture("21-empty-resources")
        app.terminate()
        launch()
        login("0700000199")
        XCTAssertTrue(app.buttons["nav.cours"].waitForExistence(timeout: 15))
        app.buttons["nav.cours"].tap()
        XCTAssertTrue(app.staticTexts["Vos cours sont indisponibles"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["Aucun cours pour le moment"].exists)
        capture("20-unavailable-courses")
        openResourcesFromAccount()
        XCTAssertTrue(app.staticTexts["Ressources indisponibles"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["Aucune ressource disponible"].exists)
        assertNoSampleResources()
        let retry = app.buttons["Réessayer"].firstMatch
        visible(retry, scroll: app.scrollViews["resources.scroll"])
        capture("22-unavailable-resources")
        retry.tap()
        XCTAssertTrue(app.staticTexts["Ressources indisponibles"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts["Aucune ressource disponible"].exists)
        XCTAssertTrue(retry.isHittable)
        assertNoSampleResources()
        capture("23-retry-resources")
    }
}
