import XCTest
@testable import MonProfPerso

final class ApiClientTests: XCTestCase {
    func testPhoneQueryPreservesInternationalPrefix() throws {
        let url = try ApiClient.makeURL(base: URL(string: "https://api.example.test")!,
            path: "api/teacher-applications/status", query: [URLQueryItem(name: "phone", value: "+2250701234567")])
        XCTAssertEqual(url.path, "/api/teacher-applications/status")
        XCTAssertTrue(url.absoluteString.contains("phone=%2B2250701234567"))
        XCTAssertEqual(URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first?.value, "+2250701234567")
    }

    func testResourceFiltersAreEncodedAsQueryItems() throws {
        let subject = "Français & littérature + oral"
        let url = try ApiClient.makeURL(base: URL(string: "https://api.example.test")!, path: "api/resources",
            query: [URLQueryItem(name: "subject", value: subject), URLQueryItem(name: "level", value: "3ème")])
        let items = try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems)
        XCTAssertEqual(items.count, 2)
        XCTAssertEqual(items[0].value, subject)
        XCTAssertEqual(url.path, "/api/resources")
    }

    func testCoteDIvoirePhoneKeepsItsLeadingZero() {
        XCTAssertEqual(ApiClient.normalizePhone("07 01 23 45 67"), "+2250701234567")
        XCTAssertEqual(ApiClient.normalizePhone("+2250701234567"), "+2250701234567")
        XCTAssertEqual(ApiClient.normalizePhone("2250701234567"), "+2250701234567")
        XCTAssertEqual(ApiClient.normalizePhone("+33612345678"), "+33612345678")
    }

    func testPaymentRequiresAcceptedUpcomingUnpaidCourse() throws {
        func course(accepted: Bool?, payment: String, status: String = "upcoming", lifecycle: String = "scheduled", startAt: String = "2099-10-26T16:00:00.000Z") throws -> CourseDTO {
            var json: [String: Any] = ["id": 42, "teacher_name": "Prof", "subject": "Maths", "level": "3eme",
                "day_label": "LUN", "day_num": "26 oct.", "time": "16:00", "duration": "1h30",
                "format": "home", "price": 7500, "status": status, "payment_status": payment,
                "starts_at": startAt, "duration_minutes": 90, "lifecycle_status": lifecycle]
            if let accepted { json["accepted"] = accepted }
            return try JSONDecoder().decode(CourseDTO.self, from: JSONSerialization.data(withJSONObject: json))
        }
        XCTAssertFalse(try course(accepted: nil, payment: "pending").canPay)
        XCTAssertFalse(try course(accepted: false, payment: "pending").canPay)
        XCTAssertTrue(try course(accepted: true, payment: "pending").canPay)
        XCTAssertFalse(try course(accepted: true, payment: "paid").canPay)
        XCTAssertFalse(try course(accepted: true, payment: "pending", status: "cancelled").canPay)
        XCTAssertEqual(try course(accepted: true, payment: "pending").duration_minutes, 90)
        XCTAssertFalse(try course(accepted: true, payment: "pending", lifecycle: "awaiting_schedule").canPay)
        XCTAssertFalse(try course(accepted: true, payment: "pending", startAt: "2020-10-26T16:00:00Z").canPay)
        XCTAssertFalse(try course(accepted: true, payment: "refunded").canPay)
        XCTAssertFalse(try course(accepted: true, payment: "partially_refunded").canPay)
    }

    func testCourseLinksRejectNonHttpsAndEmbeddedCredentials() {
        XCTAssertNotNil(CourseOperations.safeMeetingURL("https://meet.example.com/lesson?id=42"))
        for url in ["http://meet.example.com", "javascript:alert(1)", "file:///etc/passwd", "https://user:secret@meet.example.com", "https:missing-host"] {
            XCTAssertNil(CourseOperations.safeMeetingURL(url))
        }
    }

    func testDeletionPendingKeepsBlockersAndDoesNotClaimCompletion() throws {
        let data = Data(#"{"request":{"id":7,"status":"pending","requestedAt":"2026-10-24T12:00:00Z","completedAt":null,"cancelledAt":null},"blockers":[{"code":"open_courses","message":"Un cours reste à clôturer.","count":1}]}"#.utf8)
        let value = try JSONDecoder().decode(AccountDeletionDTO.self, from: data)
        XCTAssertEqual(value.request?.status, "pending")
        XCTAssertNil(value.request?.completedAt)
        XCTAssertEqual(value.blockers.first?.count, 1)
    }

    func testRealEarningsKeepPendingAndPaidSeparate() throws {
        let data = Data(#"{"total":8500,"trend":"","weeks":[],"stats":[],"payouts":[],"summary":{"expected":8500,"due":8500,"releasable":3000,"reserved":2000,"paid":3500},"payoutRequests":[{"id":9,"amount":2000,"status":"approved","provider":"wave","providerReference":null,"reason":"","createdAt":"2026-10-24T12:00:00Z"}]}"#.utf8)
        let value = try JSONDecoder().decode(TeacherEarningsDTO.self, from: data)
        XCTAssertEqual(value.summary?.releasable, 3000)
        XCTAssertEqual(value.summary?.paid, 3500)
        XCTAssertEqual(value.payoutRequests?.first?.status, "approved")
        XCTAssertNil(value.payoutRequests?.first?.providerReference)
    }

    func testHistoricalCourseWithoutAgreedCommissionDoesNotInventAmounts() throws {
        let data = Data(#"{"grossAmount":10000,"commissionPct":null,"commissionAmount":null,"teacherNetAmount":null,"capturedAmount":10000,"refundAmount":0,"refundPendingAmount":0,"teacherDue":null,"teacherReleasable":0,"teacherReserved":0,"teacherPaid":0,"reviewRequired":true}"#.utf8)
        let value = try JSONDecoder().decode(CourseFinanceDTO.self, from: data)
        XCTAssertNil(value.commissionPct)
        XCTAssertNil(value.teacherNetAmount)
        XCTAssertNil(value.teacherDue)
        XCTAssertEqual(value.teacherReleasable, 0)
        XCTAssertTrue(value.reviewRequired)
    }

    func testCourseParticipantRoleOverridesTheAccountRole() throws {
        let data = Data(#"{"id":42,"teacher_name":"Prof","subject":"Maths","level":"3e","day_label":"LUN","day_num":"26 oct.","time":"16:00","duration":"1h30","format":"home","price":10000,"status":"upcoming","lifecycle_status":"scheduled","accepted":true,"starts_at":"2099-10-26T16:00:00Z","payment_status":"pending","participant_role":"parent"}"#.utf8)
        var course = try JSONDecoder().decode(CourseDTO.self, from: data)
        XCTAssertFalse(course.isTeacherParticipant(accountRole: "teacher"))
        XCTAssertTrue(course.canPay)
        course.participant_role = "teacher"
        XCTAssertTrue(course.isTeacherParticipant(accountRole: "parent"))
        XCTAssertFalse(course.canPay)
        course.participant_role = nil
        XCTAssertTrue(course.isTeacherParticipant(accountRole: "teacher"))
        course.participant_role = "unknown"
        XCTAssertFalse(course.canPay)
    }

    func testConsentUsesPublishedVersionsWithoutInventingAcceptance() throws {
        let channels = try JSONDecoder().decode(OtpChannelsDTO.self, from: Data(#"{"demo":false,"whatsapp":true,"email":false,"defaultChannel":"whatsapp","codeLength":6,"ttlMinutes":10,"consentVersion":"published-documents-v42"}"#.utf8))
        XCTAssertEqual(channels.consentVersion, "published-documents-v42")
        let legacy = try JSONDecoder().decode(OtpChannelsDTO.self, from: Data(#"{"demo":false,"whatsapp":true,"email":false,"defaultChannel":"whatsapp","codeLength":6,"ttlMinutes":10}"#.utf8))
        XCTAssertNil(legacy.consentVersion)
        let state = try JSONDecoder().decode(AccountConsentDTO.self, from: Data(#"{"version":"published-documents-v43","accepted":false,"documents":[{"slug":"cgu","title":"Conditions","version":"2026-10-v2"}]}"#.utf8))
        XCTAssertFalse(state.accepted)
        XCTAssertNotEqual(state.version, channels.consentVersion)
        XCTAssertEqual(state.documents.first?.version, "2026-10-v2")
    }
}
