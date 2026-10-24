package ci.monprofperso.app.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * État applicatif léger partagé entre écrans (le rôle choisi à l'accueil
 * est réutilisé à l'inscription, plus besoin de le redemander).
 */
object AppState {
    /** 0 = Parent · 1 = Élève · 2 = Professeur (rôle choisi à l'onboarding) */
    var role by mutableIntStateOf(0)

    /** Rôle réel renvoyé par le serveur à la connexion (`parent|student|teacher|admin`). */
    var authRole by mutableStateOf<String?>(null)
    var authTeacherId by mutableStateOf<Int?>(null)
    var capabilities by mutableStateOf<Map<String, Boolean>>(emptyMap())
    var selectedCourseId by mutableStateOf<Int?>(null)
    fun featureEnabled(name: String): Boolean = capabilities[name] == true

    val isAdmin: Boolean get() = authRole == "admin"

    /** Cible du visualiseur PDF in-app (URL + titre), posée avant la navigation. */
    var pdfUrl by mutableStateOf("")
    var pdfTitle by mutableStateOf("Document")

    // --- Session OTP (inscription / connexion) ---
    var authPhone by mutableStateOf("")
    var authEmail by mutableStateOf("")
    var authFullName by mutableStateOf("")
    var authOtpChannel by mutableStateOf("whatsapp")
    var authChallengeId by mutableStateOf<String?>(null)
    var authDestination by mutableStateOf("")
    var authError by mutableStateOf<String?>(null)
    var authErrorCode by mutableStateOf<String?>(null)
    var otpDemo by mutableStateOf(false)
    var otpCodeLength by mutableIntStateOf(6)
    var otpTtlMinutes by mutableIntStateOf(10)
    var otpWhatsappEnabled by mutableStateOf(false)
    var otpEmailEnabled by mutableStateOf(false)

    // --- Brouillon de réservation (rempli depuis la fiche prof, lu par Réservation → Paiement → Confirmé) ---
    var selectedTeacherId by mutableIntStateOf(0)
    var bkTeacherId by mutableIntStateOf(0)
    var bkTeacherName by mutableStateOf("")
    var bkTeacherInitials by mutableStateOf("")
    var bkSubjectsLine by mutableStateOf("")
    var bkSubject by mutableStateOf("")
    var bkLevel by mutableStateOf("")
    var bkPricePerHour by mutableIntStateOf(0)
    var bkLocation by mutableStateOf("")
    var bkNegotiable by mutableStateOf(false)
    var bkFormats by mutableStateOf(listOf("home", "online"))

    // Détails confirmés au fil des écrans
    var bkFormat by mutableStateOf("home")
    var bkDayLabel by mutableStateOf("")
    var bkDayNum by mutableStateOf("")
    var bkDayFull by mutableStateOf("")
    var bkTime by mutableStateOf("")
    var bkDuration by mutableStateOf("1h30")
    var bkPrice by mutableIntStateOf(0)
    var bkProposedPrice by mutableStateOf<Int?>(null)
    var bkProposedFrequency by mutableStateOf<String?>(null)
    var bkHasProposal by mutableStateOf(false)
    var bkReference by mutableStateOf("")
    var bkCourseId by mutableStateOf<Int?>(null)
    var bkStartAt by mutableStateOf<String?>(null)
    var bkPaymentConfirmed by mutableStateOf(false)

    /** Renseigne le brouillon depuis un professeur sélectionné. */
    fun startBooking(t: TeacherDto) {
        bkTeacherId = t.id
        bkTeacherName = t.name
        bkTeacherInitials = t.initials
        bkSubjectsLine = t.subjects
        bkSubject = t.subjects.split("·").firstOrNull()?.trim()?.ifBlank { "Cours" } ?: "Cours"
        bkPricePerHour = t.pricePerHour
        bkLocation = ""
        bkNegotiable = t.negotiable
        bkFormats = (t.formats ?: listOf("home")).filter { it == "home" || (it == "online" && featureEnabled("onlineCourses")) }
        bkProposedPrice = null
        bkProposedFrequency = null
        bkHasProposal = false
        bkCourseId = null
        bkStartAt = null
        bkPaymentConfirmed = false
        bkReference = ""
    }

    /** Le paiement reprend exclusivement un cours renvoyé par le serveur. */
    fun resumePayment(course: CourseDto) {
        bkCourseId = course.id
        bkTeacherName = course.teacherName
        bkTeacherInitials = course.teacherName.split(" ").filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1) }
        bkSubject = course.subject
        bkLevel = course.level
        bkFormat = course.format
        bkDayLabel = course.dayLabel
        bkDayNum = course.dayNum
        bkDayFull = "${course.dayLabel} ${course.dayNum}"
        bkTime = course.time
        bkDuration = course.duration
        bkLocation = course.location.orEmpty()
        bkPrice = course.price
        bkStartAt = course.startAt
        bkReference = "Cours #${course.id}"
        bkPaymentConfirmed = course.paymentStatus == "paid"
    }
}

val roleLabels = listOf("Parent", "Élève", "Professeur")
