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

    val isAdmin: Boolean get() = authRole == "admin"

    /** Cible du visualiseur PDF in-app (URL + titre), posée avant la navigation. */
    var pdfUrl by mutableStateOf("")
    var pdfTitle by mutableStateOf("Document")

    // --- Brouillon de réservation (rempli depuis la fiche prof, lu par Réservation → Paiement → Confirmé) ---
    var bkTeacherId by mutableIntStateOf(1)
    var bkTeacherName by mutableStateOf("Koffi N'Guessan")
    var bkTeacherInitials by mutableStateOf("KN")
    var bkSubjectsLine by mutableStateOf("Maths · Physique-Chimie")
    var bkSubject by mutableStateOf("Maths")
    var bkLevel by mutableStateOf("3ᵉ")
    var bkPricePerHour by mutableIntStateOf(4000)
    var bkLocation by mutableStateOf("Cocody")
    var bkNegotiable by mutableStateOf(false)

    // Détails confirmés au fil des écrans
    var bkFormat by mutableStateOf("home")
    var bkDayLabel by mutableStateOf("SAM")
    var bkDayNum by mutableStateOf("22")
    var bkDayFull by mutableStateOf("Sam. 22 juin")
    var bkTime by mutableStateOf("16:00")
    var bkDuration by mutableStateOf("1h30")
    var bkPrice by mutableIntStateOf(6000)
    var bkProposedPrice by mutableStateOf<Int?>(null)
    var bkProposedFrequency by mutableStateOf<String?>(null)
    var bkHasProposal by mutableStateOf(false)
    var bkReference by mutableStateOf("AKW-2058")

    /** Renseigne le brouillon depuis un professeur sélectionné. */
    fun startBooking(t: TeacherDto) {
        bkTeacherId = t.id
        bkTeacherName = t.name
        bkTeacherInitials = t.initials
        bkSubjectsLine = t.subjects
        bkSubject = t.subjects.split("·").firstOrNull()?.trim()?.ifBlank { "Cours" } ?: "Cours"
        bkPricePerHour = t.pricePerHour
        bkLocation = t.location
        bkNegotiable = t.negotiable
        bkProposedPrice = null
        bkProposedFrequency = null
        bkHasProposal = false
    }
}

val roleLabels = listOf("Parent", "Élève", "Professeur")
