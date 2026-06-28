package ci.monprofperso.app.data

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** État réseau générique. */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T, val fromApi: Boolean) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

/**
 * Charge la liste des professeurs depuis l'API commune.
 * En cas d'échec réseau, repli sur les données locales de la maquette
 * pour que l'écran reste utilisable hors-ligne.
 */
class TeachersViewModel : ViewModel() {

    private val _state = MutableStateFlow<UiState<List<TeacherDto>>>(UiState.Loading)
    val state: StateFlow<UiState<List<TeacherDto>>> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = UiState.Loading
        viewModelScope.launch {
            _state.value = try {
                UiState.Success(Api.service.teachers(), fromApi = true)
            } catch (e: Exception) {
                UiState.Success(FallbackData.teachers, fromApi = false)
            }
        }
    }
}

/** Données de repli (identiques à la maquette) si l'API n'est pas joignable. */
object FallbackData {
    val teachers = listOf(
        TeacherDto(1, "KN", "Koffi N'Guessan", "Maths · Physique-Chimie · 8 ans d'exp.", 4.9, 128, "Cocody", 4000, 2.4, "green", true, true),
        TeacherDto(2, "ID", "Ibrahim Diallo", "Maths · Statistiques · 5 ans d'exp.", 4.7, 210, "Yopougon", 3000, 5.1, "orange", true, false),
        TeacherDto(3, "AY", "Adjoua Yao", "Maths · SVT · 6 ans d'exp.", 4.9, 88, "Cocody", 4000, 1.8, "green", true, false),
    )

    val subjects = listOf(
        SubjectDto("maths", "Maths", "function", "green"),
        SubjectDto("physique", "Physique", "atom", "orange"),
        SubjectDto("francais", "Français", "book", "green"),
        SubjectDto("anglais", "Anglais", "translate", "orange"),
        SubjectDto("svt", "SVT", "leaf", "orange"),
        SubjectDto("philo", "Philo", "brain", "green"),
        SubjectDto("histgeo", "Hist-Géo", "globe", "green"),
        SubjectDto("plus", "Plus", "more", "orange"),
    )

    val courses = listOf(
        CourseDto(1, "Koffi N'Guessan", "Maths", "3ᵉ", "SAM", "22", "16h00", "1h30", "home", "À domicile, Cocody", 6000, "upcoming", "Dans 2 jours"),
        CourseDto(2, "Mariam Touré", "Anglais", "3ᵉ", "LUN", "24", "17h00", "1h", "online", null, 4500, "upcoming", null),
        CourseDto(3, "Koffi N'Guessan", "Maths", "3ᵉ", "VEN", "14", "15h00", "1h30", "home", "À domicile, Cocody", 6000, "done", null),
    )

    val progress = ProgressDto(
        student = "Kouadio, 3ᵉ", average = "13,2", trend = "+1,4",
        goal = "Objectif BEPC : 14/20, vous y êtes presque !",
        subjects = listOf(
            ProgressSubjectDto("Mathématiques", "14/20", 0.70, false),
            ProgressSubjectDto("Physique-Chimie", "12/20", 0.60, false),
            ProgressSubjectDto("Français", "15/20", 0.75, false),
            ProgressSubjectDto("Anglais", "11/20", 0.55, true),
        ),
    )

    val teacherDetail = TeacherDto(
        1, "KN", "Koffi N'Guessan", "Maths · Physique-Chimie", 4.9, 128, "Cocody", 4000, 2.4, "green", true, true,
        formats = listOf("home", "online"), experience = "8 ans", students = "340+", bacSuccess = "94%",
        bio = "Professeur certifié, ancien du Lycée Classique d'Abidjan. J'accompagne les élèves de la 3ᵉ à la Terminale avec une méthode claire, des fiches et beaucoup d'exercices types examen. Patient et à l'écoute.",
        levels = listOf("Collège", "Lycée", "Prépa BEPC", "Prépa BAC"),
        reviews = listOf(ReviewDto("FB", "Fatou B.", 5, "il y a 2 semaines", "Ma fille est passée de 9 à 14 en maths en un trimestre. Très pédagogue et toujours ponctuel. Je recommande vivement !")),
    )
}
