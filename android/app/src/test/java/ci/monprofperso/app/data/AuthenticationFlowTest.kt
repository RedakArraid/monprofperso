package ci.monprofperso.app.data

import org.junit.Assert.*
import org.junit.Test

class AuthenticationFlowTest {
    private val user = UserDto(42, "Parent test", "+2250700000042", "parent", "PT")
    private val challenge = AuthResponse(otpRequired = true, challengeId = "5b0c7325-a47b-4f73-b7b2-a7b0c1fa9957",
        channel = "whatsapp", destination = user.phone, expiresInMinutes = 10, sent = true)

    @Test fun loginChallengeDoesNotCreateSession() {
        val result = interpretLogin(challenge, allowDemo = false)
        assertTrue(result is LoginResult.AwaitingOtp)
        assertEquals(challenge.challengeId, (result as LoginResult.AwaitingOtp).challengeId)
    }

    @Test fun tokenWithoutExplicitDemoIsRejected() {
        assertThrows(IllegalArgumentException::class.java) {
            interpretLogin(AuthResponse(token = "unexpected-token", user = user), allowDemo = true)
        }
    }

    @Test fun releaseDoesNotAcceptDemoSessions() {
        assertThrows(IllegalArgumentException::class.java) {
            interpretLogin(AuthResponse(token = "demo-token", user = user, demo = true), allowDemo = false)
        }
    }

    @Test fun explicitLocalDemoAllowsExactlyReturnedAccount() {
        val result = interpretLogin(AuthResponse(token = "demo-token", user = user, demo = true), allowDemo = true)
        assertEquals(user, (result as LoginResult.Authenticated).user)
    }

    @Test fun missingOrUndeliveredChallengeDoesNotCountAsLogin() {
        listOf(AuthResponse(), challenge.copy(sent = false), challenge.copy(challengeId = null),
            challenge.copy(token = "mixed-token", user = user)).forEach { response ->
            assertThrows(IllegalArgumentException::class.java) { interpretLogin(response, allowDemo = false) }
        }
    }

    private fun course(accepted: Boolean = false, status: String = "upcoming", payment: String = "pending") =
        CourseDto(17, "Professeur test", "Maths", "3e", "LUN", "26 oct.", "14:00", "1h30", "home",
            "Abidjan", 6000, status, null, paymentStatus = payment, accepted = accepted)

    @Test fun onlyAcceptedUpcomingUnpaidCoursesOfferPayment() {
        assertFalse(course().isPayable())
        assertTrue(course(accepted = true).isPayable())
        assertFalse(course(accepted = true, status = "done").isPayable())
        assertFalse(course(accepted = true, status = "cancelled").isPayable())
        assertFalse(course(accepted = true, payment = "paid").isPayable())
        assertFalse(course(accepted = true).copy(price = 0).isPayable())
    }
}
