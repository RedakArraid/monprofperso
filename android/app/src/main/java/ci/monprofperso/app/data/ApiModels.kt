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

data class ResourceDto(
    val id: Int,
    val type: String,
    @SerializedName("subject_slug") val subjectSlug: String?,
    val level: String?,
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
    val reviews: List<ReviewDto>? = null,
) {
    val priceLabel: String get() = "%,d F".format(pricePerHour).replace(',', ' ')
    val ratingLabel: String get() = rating.toString().replace('.', ',')
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
)

data class UnreadDto(val count: Int)

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
)

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
)

data class TeacherRequestDto(
    @SerializedName("courseId") val courseId: Int?,
    val initials: String,
    val accent: String,
    val name: String,
    val ago: String,
    val price: Int,
    val student: String?,
    val subject: String?,
    val slot: String?,
    val format: String?,
)

data class EarningWeekDto(val label: String, val f: Double)

data class PayoutDto(val provider: String, val date: String, val amount: Int, val color: String)

data class TeacherEarningsDto(
    val total: Int,
    val trend: String,
    val weeks: List<EarningWeekDto>,
    val stats: List<StatDto>,
    val payouts: List<PayoutDto>,
)

data class UserDto(
    val id: Int,
    @SerializedName("full_name") val fullName: String,
    val phone: String,
    val role: String,
    val initials: String,
)

data class AuthResponse(val token: String, val user: UserDto)

data class VerifyResponse(val token: String, val verified: Boolean)
