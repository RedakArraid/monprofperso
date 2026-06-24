package ci.monprofperso.app.data

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/* ----------------------------------------------------------------------------
 * Accueil : matières + professeurs recommandés
 * ------------------------------------------------------------------------- */
data class HomeData(val subjects: List<SubjectDto>, val teachers: List<TeacherDto>)

class HomeViewModel : ViewModel() {
    private val _state = MutableStateFlow<UiState<HomeData>>(UiState.Loading)
    val state: StateFlow<UiState<HomeData>> = _state.asStateFlow()
    init { load() }
    fun load() {
        _state.value = UiState.Loading
        viewModelScope.launch {
            _state.value = try {
                UiState.Success(HomeData(Api.service.subjects(), Api.service.teachers()), true)
            } catch (e: Exception) {
                UiState.Success(HomeData(FallbackData.subjects, FallbackData.teachers), false)
            }
        }
    }
}

/* ----------------------------------------------------------------------------
 * Mes cours
 * ------------------------------------------------------------------------- */
class CoursesViewModel : ViewModel() {
    private val _state = MutableStateFlow<UiState<List<CourseDto>>>(UiState.Loading)
    val state: StateFlow<UiState<List<CourseDto>>> = _state.asStateFlow()
    init { load() }
    fun load() {
        _state.value = UiState.Loading
        viewModelScope.launch {
            _state.value = try {
                UiState.Success(Api.service.courses(), true)
            } catch (e: Exception) {
                UiState.Success(FallbackData.courses, false)
            }
        }
    }
}

/* ----------------------------------------------------------------------------
 * Suivi des progrès
 * ------------------------------------------------------------------------- */
class ProgressViewModel : ViewModel() {
    private val _state = MutableStateFlow<UiState<ProgressDto>>(UiState.Loading)
    val state: StateFlow<UiState<ProgressDto>> = _state.asStateFlow()
    init { load() }
    fun load() {
        _state.value = UiState.Loading
        viewModelScope.launch {
            _state.value = try {
                UiState.Success(Api.service.progress(), true)
            } catch (e: Exception) {
                UiState.Success(FallbackData.progress, false)
            }
        }
    }
}

/* ----------------------------------------------------------------------------
 * Profil du professeur (id 1 par défaut, comme la maquette)
 * ------------------------------------------------------------------------- */
class TeacherProfileViewModel : ViewModel() {
    private val _state = MutableStateFlow<UiState<TeacherDto>>(UiState.Loading)
    val state: StateFlow<UiState<TeacherDto>> = _state.asStateFlow()
    init { load(1) }
    fun load(id: Int) {
        _state.value = UiState.Loading
        viewModelScope.launch {
            _state.value = try {
                UiState.Success(Api.service.teacher(id), true)
            } catch (e: Exception) {
                UiState.Success(FallbackData.teacherDetail, false)
            }
        }
    }
}
