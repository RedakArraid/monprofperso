package ci.monprofperso.app.data

import java.net.URI
import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/** Un professeur peut également acheter un cours : le rôle du cours prime sur celui du compte. */
fun CourseDto.isTeacherParticipant(accountRole: String?): Boolean =
    participantRole == "teacher" || (participantRole == null && accountRole == "teacher")

/** Les rendez-vous sont saisis en Côte d’Ivoire ; le contrat transporte une date ISO UTC. */
fun parseCourseLocalDate(value: String): String {
    require(Regex("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}").matches(value)) { "Utilisez le format AAAA-MM-JJ HH:mm." }
    val input = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.ROOT).apply { isLenient = false; timeZone = TimeZone.getTimeZone("Africa/Abidjan") }
    val position = ParsePosition(0)
    val date = input.parse(value, position)
    require(date != null && position.index == value.length && date.time > System.currentTimeMillis()) { "Choisissez une date valide dans le futur." }
    return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(date)
}

fun isSafeMeetingUrl(value: String): Boolean = runCatching {
    val uri = URI(value)
    uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.userInfo == null
}.getOrDefault(false)

fun courseStartsInFuture(value: String?): Boolean {
    if (value == null) return false
    // Le serveur PostgreSQL sérialise UTC avec ou sans millisecondes.
    return listOf("yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX").any { pattern ->
        val format = SimpleDateFormat(pattern, Locale.ROOT).apply { isLenient = false; timeZone = TimeZone.getTimeZone("UTC") }
        val position = ParsePosition(0)
        val date = format.parse(value, position)
        date != null && position.index == value.length && date.time > System.currentTimeMillis()
    }
}
