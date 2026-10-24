package ci.monprofperso.app.data

import com.google.gson.Gson
import org.junit.Assert.*
import org.junit.Test
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

class CourseOperationsTest {
    @Test fun scheduleUsesAbidjanAndRejectsInvalidOrPastDates() {
        assertEquals("2099-11-12T14:30:00Z", parseCourseLocalDate("2099-11-12 14:30"))
        listOf("2099-02-30 14:30", "2099-11-12 25:00", "2020-11-12 14:30", "2099-11-12 14:30 suffix").forEach {
            assertThrows(IllegalArgumentException::class.java) { parseCourseLocalDate(it) }
        }
    }

    @Test fun courseLinksOnlyOpenHttpsWithoutEmbeddedCredentials() {
        assertTrue(isSafeMeetingUrl("https://meet.example.com/lesson?id=42"))
        listOf("http://meet.example.com", "javascript:alert(1)", "file:///etc/passwd", "https://user:secret@meet.example.com", "https:missing-host").forEach {
            assertFalse(isSafeMeetingUrl(it))
        }
    }

    @Test fun deletionPendingAndBlockersDecodeWithoutInventingCompletion() {
        val value = Gson().fromJson("""{"request":{"id":7,"status":"pending","requestedAt":"2026-10-24T12:00:00Z","completedAt":null,"cancelledAt":null},"blockers":[{"code":"open_courses","message":"Un cours reste à clôturer.","count":1}]}""", AccountDeletionDto::class.java)
        assertEquals("pending", value.request?.status)
        assertNull(value.request?.completedAt)
        assertEquals(1, value.blockers[0].count)
    }

    @Test fun realFinanceSummaryKeepsPendingAndPaidSeparate() {
        val value = Gson().fromJson("""{"total":8500,"trend":"","weeks":[],"stats":[],"payouts":[],"summary":{"expected":8500,"due":8500,"releasable":3000,"reserved":2000,"paid":3500},"payoutRequests":[{"id":9,"amount":2000,"status":"approved","provider":"wave","providerReference":null,"reason":"","createdAt":"2026-10-24T12:00:00Z"}]}""", TeacherEarningsDto::class.java)
        assertEquals(3000, value.summary?.releasable)
        assertEquals(3500, value.summary?.paid)
        assertEquals("approved", value.payoutRequests?.first()?.status)
        assertNull(value.payoutRequests?.first()?.providerReference)
    }

    @Test fun historicalCourseWithoutAgreedCommissionDoesNotInventAmounts() {
        val value = Gson().fromJson("""{"grossAmount":10000,"commissionPct":null,"commissionAmount":null,"teacherNetAmount":null,"capturedAmount":10000,"refundAmount":0,"refundPendingAmount":0,"teacherDue":null,"teacherReleasable":0,"teacherReserved":0,"teacherPaid":0,"reviewRequired":true}""", CourseFinanceDto::class.java)
        assertNull(value.commissionPct)
        assertNull(value.teacherNetAmount)
        assertNull(value.teacherDue)
        assertEquals(0, value.teacherReleasable)
        assertTrue(value.reviewRequired)
    }

    @Test fun participantRoleOverridesAccountRoleWithoutGivingTeacherPaymentAccess() {
        val value = Gson().fromJson("""{"id":42,"teacher_name":"Prof","subject":"Maths","level":"3e","day_label":"LUN","day_num":"26 oct.","time":"16:00","duration":"1h30","format":"home","price":10000,"accepted":true,"status":"upcoming","negotiation_status":"none","lifecycle_status":"scheduled","starts_at":"2099-10-26T16:00:00Z","payment_status":"pending","participant_role":"parent"}""", CourseDto::class.java)
        assertFalse(value.isTeacherParticipant("teacher"))
        assertTrue(value.isPayable())
        assertTrue(value.copy(participantRole = "teacher").isTeacherParticipant("parent"))
        assertFalse(value.copy(participantRole = "teacher").isPayable())
        assertTrue(value.copy(participantRole = null).isTeacherParticipant("teacher"))
        assertFalse(value.copy(participantRole = "unknown").isPayable())
    }

    @Test fun consentUsesServerVersionAndNeverInventsMissingVersionOrAcceptance() {
        val channels = Gson().fromJson("""{"demo":false,"whatsapp":true,"email":false,"defaultChannel":"whatsapp","codeLength":6,"ttlMinutes":10,"consentVersion":"published-documents-v42"}""", OtpChannelsDto::class.java)
        assertEquals("published-documents-v42", channels.consentVersion)
        assertNull(Gson().fromJson("{}", OtpChannelsDto::class.java).consentVersion)
        val state = Gson().fromJson("""{"version":"published-documents-v43","accepted":false,"documents":[{"slug":"cgu","title":"Conditions","version":"2026-10-v2"}]}""", AccountConsentDto::class.java)
        assertFalse(state.accepted)
        assertNotEquals(channels.consentVersion, state.version)
        assertEquals("2026-10-v2", state.documents.first().version)
    }

    @Test fun consentConflictCodeSurvivesMessageReadingForRecoveryNavigation() {
        val error = HttpException(Response.error<Any>(409, """{"error":"consent_version_changed","message":"Documents modifiés"}""".toResponseBody()))
        assertEquals("consent_version_changed", Auth.errorCode(error))
        assertTrue(Auth.errorMessage(error).contains("cochez à nouveau"))
        assertEquals("consent_version_changed", Auth.errorCode(error))
    }

    @Test fun sharedPhoneNormalizerKeepsIvorianZeroForTeacherApplications() {
        assertEquals("+2250701234567", Auth.normalizePhone("07 01 23 45 67"))
    }
}
