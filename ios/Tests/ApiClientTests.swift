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
        func course(accepted: Bool?, payment: String, status: String = "upcoming") throws -> CourseDTO {
            var json: [String: Any] = ["id": 42, "teacher_name": "Prof", "subject": "Maths", "level": "3eme",
                "day_label": "LUN", "day_num": "26 oct.", "time": "16:00", "duration": "1h30",
                "format": "home", "price": 7500, "status": status, "payment_status": payment,
                "starts_at": "2030-10-26T16:00:00.000Z", "duration_minutes": 90]
            if let accepted { json["accepted"] = accepted }
            return try JSONDecoder().decode(CourseDTO.self, from: JSONSerialization.data(withJSONObject: json))
        }
        XCTAssertFalse(try course(accepted: nil, payment: "pending").canPay)
        XCTAssertFalse(try course(accepted: false, payment: "pending").canPay)
        XCTAssertTrue(try course(accepted: true, payment: "pending").canPay)
        XCTAssertFalse(try course(accepted: true, payment: "paid").canPay)
        XCTAssertFalse(try course(accepted: true, payment: "pending", status: "cancelled").canPay)
        XCTAssertEqual(try course(accepted: true, payment: "pending").duration_minutes, 90)
    }
}
