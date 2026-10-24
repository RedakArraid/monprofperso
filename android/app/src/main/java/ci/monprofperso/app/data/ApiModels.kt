package ci.monprofperso.app.data

import com.google.gson.annotations.SerializedName

/**
 * DTOs renvoyés par l'API MonProfPerso commune (mêmes champs que côté iOS).
 */

data class SubjectDto(
    val slug: String,
    val name: String,
    val icon: String,
    val accent: String,
)

data class LevelDto(
    val slug: String,
    val name: String,
)

data class ProgramDto(
    val slug: String,
    val name: String,
)

data class ResourceDto(
    val id: Int,
    val type: String,
    @SerializedName("subject_slug") val subjectSlug: String?,
    val level: String?,
    val program: String? = null,
    val title: String,
    val description: String?,
    @SerializedName("file_name") val fileName: String?,
    @SerializedName("mime_type") val mimeType: String?,
    @SerializedName("size_bytes") val sizeBytes: Int?,
    @SerializedName("created_at") val createdAt: String?,
)

data class TeacherDto(
    val id: Int,
    val initials: String,
    val name: String,
    val subjects: String,
    val rating: Double,
    @SerializedName("reviews_count") val reviewsCount: Int,
    val location: String,
    @SerializedName("price_per_hour") val pricePerHour: Int,
    @SerializedName("distance_km") val distanceKm: Double?,
    val accent: String,
    val verified: Boolean,
    @SerializedName("special_bepc") val specialBepc: Boolean,
    val formats: List<String>? = null,
    val experience: String? = null,
    val students: String? = null,
    @SerializedName("bac_success") val bacSuccess: String? = null,
    val bio: String? = null,
    val levels: List<String>? = null,
    val programs: List<String>? = null,
    val negotiable: Boolean = false,
    val reviews: List<ReviewDto>? = null,
) {
    val priceLabel: String get() = "%,d F".format(pricePerHour).replace(',', ' ')
    val ratingLabel: String get() = if (reviewsCount > 0) rating.toString().replace('.', ',') else "Pas encore noté"
}

data class ReviewDto(
    @SerializedName("author_initials") val authorInitials: String,
    @SerializedName("author_name") val authorName: String,
    val rating: Int,
    @SerializedName("time_ago") val timeAgo: String,
    val text: String,
)

data class CourseDto(
    val id: Int,
    @SerializedName("teacher_name") val teacherName: String,
    val subject: String,
    val level: String,
    @SerializedName("day_label") val dayLabel: String,
    @SerializedName("day_num") val dayNum: String,
    val time: String,
    val duration: String,
    val format: String,
    val location: String?,
    val price: Int,
    val status: String,
    val badge: String?,
    val negotiable: Boolean = false,
    @SerializedName("proposed_price") val proposedPrice: Int? = null,
    @SerializedName("proposed_frequency") val proposedFrequency: String? = null,
    @SerializedName("counter_price") val counterPrice: Int? = null,
    @SerializedName("counter_frequency") val counterFrequency: String? = null,
    @SerializedName("negotiation_status") val negotiationStatus: String = "none",
    @SerializedName("payment_status") val paymentStatus: String? = null,
    val accepted: Boolean = false,
    @SerializedName("starts_at") val startAt: String? = null,
    @SerializedName("lifecycle_status") val lifecycleStatus: String? = null,
    @SerializedName("private_address") val privateAddress: String? = null,
    @SerializedName("meeting_url") val meetingUrl: String? = null,
    @SerializedName("access_notes") val accessNotes: String? = null,
    @SerializedName("parent_name") val parentName: String? = null,
    @SerializedName("duration_minutes") val durationMinutes: Int? = null,
    @SerializedName("participant_role") val participantRole: String? = null,
)

data class BookingResponse(
    val reference: String,
    val course: CourseDto,
)

data class ChargeMobileResponse(
    val paymentId: Int,
    val status: String,
    val message: String? = null,
    val reference: String? = null,
)

data class PaymentStatusResponse(
    val paymentId: Int,
    val status: String,
    val amount: Int? = null,
    val provider: String? = null,
    @SerializedName("coursePaymentStatus") val coursePaymentStatus: String? = null,
    val paid: Boolean,
)

data class UnreadDto(val count: Int)

data class LegalDocDto(
    val slug: String,
    val title: String,
    val version: String?,
    @SerializedName("file_name") val fileName: String?,
    @SerializedName("size_bytes") val sizeBytes: Int?,
    @SerializedName("updated_at") val updatedAt: String?,
    val hasFile: Boolean,
)

data class NotificationDto(
    val icon: String,
    val accent: String,
    val text: String,
    @SerializedName("time_ago") val timeAgo: String,
    val unread: Boolean,
    val section: String,
)

data class ProgressDto(
    val student: String,
    val average: String,
    val trend: String,
    val goal: String,
    val subjects: List<ProgressSubjectDto>,
    val entries: List<ProgressEntryDto>? = null,
)
data class ProgressEntryDto(val courseId: Int, val subject: String, val teacherName: String, val studentName: String?, val completedAt: String?, val summary: String)

data class ProgressSubjectDto(
    val subject: String,
    val grade: String,
    val fraction: Double,
    val warn: Boolean,
)

data class GroupDto(
    val id: Int,
    val tag: String,
    @SerializedName("tag_accent") val tagAccent: String,
    val price: Int,
    val title: String,
    val detail: String,
    @SerializedName("teacher_initials") val teacherInitials: String?,
    @SerializedName("teacher_name") val teacherName: String?,
    @SerializedName("teacher_accent") val teacherAccent: String?,
    val enrolled: Int?,
    val capacity: Int?,
    @SerializedName("places_left") val placesLeft: Int?,
    val kind: String = "regular",
    @SerializedName("start_date") val startDate: String? = null,
    @SerializedName("end_date") val endDate: String? = null,
)

data class PlanDto(val name: String, val detail: String, val price: Int, val popular: Boolean, val suffix: String?)

// --- Espace professeur (live) ---
data class StatDto(val value: String, val label: String)

data class TeacherDashboardDto(
    val name: String,
    val revenue: Int,
    val trend: String,
    val stats: List<StatDto>,
    val pendingRequests: Int,
    val negotiable: Boolean = false,
    val needsConfirmed: Boolean = true,
    val profileCompletion: ProfileCompletionDto? = null,
)

data class ProfileCompletionDto(
    val percent: Int,
    val complete: Boolean,
    val missing: List<String>,
)

data class TeacherProfileDto(
    val name: String,
    val subjects: String,
    val email: String?,
    val location: String,
    val pricePerHour: Int?,
    val experience: String?,
    val bio: String?,
    val levels: List<String>,
    val formats: List<String>,
    val programs: List<String>,
    val negotiable: Boolean,
    val hasIdCard: Boolean,
    val hasDiploma: Boolean,
    val hasPhoto: Boolean,
    val completion: ProfileCompletionDto,
)

data class TeacherRequestDto(
    @SerializedName("courseId") val courseId: Int?,
    @SerializedName("needId") val needId: Int? = null,
    val initials: String,
    val accent: String,
    val name: String,
    val ago: String,
    val price: Int,
    val student: String?,
    val subject: String?,
    val slot: String?,
    val format: String?,
    @SerializedName("netHourly") val netHourly: Int? = null,
    val frequency: String? = null,
    val duration: String? = null,
    @SerializedName("startDate") val startDate: String? = null,
    @SerializedName("isOpportunity") val isOpportunity: Boolean = false,
    @SerializedName("availabilityWeek") val availabilityWeek: Boolean = true,
    @SerializedName("availabilityWeekend") val availabilityWeekend: Boolean = false,
    @SerializedName("availabilityHolidays") val availabilityHolidays: Boolean = false,
    @SerializedName("hasCat") val hasCat: Boolean = false,
    @SerializedName("hasDog") val hasDog: Boolean = false,
    val lat: Double? = null,
    val lng: Double? = null,
)

data class ChildDto(
    val id: Int,
    val name: String,
    val level: String,
    val gender: String? = null,
    val school: String? = null,
    val program: String = "standard",
)

data class NeedDto(
    val id: Int,
    val courseId: Int? = null,
    val reference: String,
    @SerializedName("childId") val childId: Int? = null,
    val child: ChildDto? = null,
    val subject: String,
    val level: String,
    val format: String,
    val location: String? = null,
    val frequency: String? = null,
    val duration: String? = null,
    val description: String? = null,
    @SerializedName("parentPrice") val parentPrice: Int? = null,
    @SerializedName("netTeacherAmount") val netTeacherAmount: Int? = null,
    @SerializedName("netTeacherHourly") val netTeacherHourly: Int? = null,
    val status: String,
    @SerializedName("startDate") val startDate: String? = null,
)

data class EarningWeekDto(val label: String, val f: Double)

data class PayoutDto(val provider: String, val date: String, val amount: Int, val color: String)

data class TeacherEarningsDto(
    val total: Int,
    val trend: String,
    val weeks: List<EarningWeekDto>,
    val stats: List<StatDto>,
    val payouts: List<PayoutDto>,
    val summary: EarningsSummaryDto? = null,
    val payoutRequests: List<FinanceRequestDto>? = null,
)

data class EarningsSummaryDto(val expected: Int, val due: Int, val releasable: Int, val reserved: Int, val paid: Int)
data class FinanceRequestDto(
    val id: Int, val amount: Int, val status: String, val provider: String?,
    val providerReference: String?, val createdAt: String?, val reason: String?,
    val beneficiaryPhone: String? = null,
)
data class CourseContactsDto(val parentPhone: String?, val teacherPhone: String?)
data class ScheduleRequestDto(val id: Int, val startAt: String, val status: String, val proposedBy: Int, val reason: String?, val createdAt: String?)
data class CourseReportDto(val id: Int, val actorRole: String, val outcome: String, val note: String?, val progressSummary: String?, val createdAt: String?)
data class CourseEventDto(val id: Int, val type: String, val actorRole: String?, val createdAt: String?)
data class CourseFinanceDto(
    val grossAmount: Int, val commissionPct: Double?, val commissionAmount: Int?,
    val teacherNetAmount: Int?, val capturedAmount: Int, val refundAmount: Int,
    val refundPendingAmount: Int, val teacherDue: Int?, val teacherReleasable: Int,
    val teacherReserved: Int, val teacherPaid: Int, val reviewRequired: Boolean,
)
data class CourseDetailsDto(
    val course: CourseDto, val contacts: CourseContactsDto,
    val scheduleRequests: List<ScheduleRequestDto>, val reports: List<CourseReportDto>,
    val events: List<CourseEventDto>, val finance: CourseFinanceDto, val permissions: List<String>,
)
data class AccountDeletionRequestDto(val id: Int, val status: String, val requestedAt: String, val completedAt: String?, val cancelledAt: String?)
data class AccountBlockerDto(val code: String, val message: String, val count: Int?)
data class AccountDeletionDto(val request: AccountDeletionRequestDto?, val blockers: List<AccountBlockerDto>)
data class NotificationPreferencesDto(val notificationsWhatsapp: Boolean, val notificationsEmail: Boolean, val whatsappAvailable: Boolean, val emailAvailable: Boolean)
data class ConsentDocumentDto(val slug: String, val title: String, val version: String)
data class AccountConsentDto(val version: String, val accepted: Boolean, val documents: List<ConsentDocumentDto>)
data class ApiFailureDto(val error: String?, val message: String?)

data class UserDto(
    val id: Int,
    @SerializedName("full_name") val fullName: String,
    val phone: String,
    val role: String,
    val initials: String,
    @SerializedName("teacher_id") val teacherId: Int? = null,
)

data class AuthResponse(
    val token: String? = null,
    val user: UserDto? = null,
    val otpRequired: Boolean = false,
    val challengeId: String? = null,
    val channel: String? = null,
    val destination: String? = null,
    val expiresInMinutes: Int? = null,
    val sent: Boolean = false,
    val demo: Boolean = false,
)

data class VerifyResponse(val token: String, val verified: Boolean, val user: UserDto? = null)

data class OtpChannelsDto(
    val demo: Boolean,
    val whatsapp: Boolean,
    val email: Boolean,
    val defaultChannel: String,
    val codeLength: Int,
    val ttlMinutes: Int,
    val consentVersion: String? = null,
)

data class RequestOtpResponse(
    val sent: Boolean,
    val demo: Boolean,
    val expiresInMinutes: Int,
    val channel: String? = null,
    val destination: String? = null,
    val challengeId: String? = null,
    val otpRequired: Boolean = false,
)

data class TeacherApplicationResultDto(
    val id: Int,
    @SerializedName("full_name") val fullName: String,
    val phone: String,
    val status: String,
    @SerializedName("created_at") val createdAt: String?,
)

data class TeacherApplicationStatusDto(
    val status: String,
    @SerializedName("rejectionReason") val rejectionReason: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null,
)
