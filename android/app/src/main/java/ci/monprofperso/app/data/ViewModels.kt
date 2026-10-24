package ci.monprofperso.app.data

import ci.monprofperso.app.BuildConfig
import kotlinx.coroutines.CancellationException

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
                if (e is CancellationException) throw e
                if (BuildConfig.DEBUG && BuildConfig.DEMO_DATA_ENABLED) UiState.Success(HomeData(FallbackData.subjects, FallbackData.teachers), false) else UiState.Error(Auth.errorMessage(e))
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
                if (e is CancellationException) throw e
                if (BuildConfig.DEBUG && BuildConfig.DEMO_DATA_ENABLED) UiState.Success(FallbackData.courses, false) else UiState.Error(Auth.errorMessage(e))
            }
        }
    }
}

/* ----------------------------------------------------------------------------
 * Cours en groupe (dont stages de vacances)
 * ------------------------------------------------------------------------- */
class GroupsViewModel : ViewModel() {
    private val _state = MutableStateFlow<UiState<List<GroupDto>>>(UiState.Loading)
    val state: StateFlow<UiState<List<GroupDto>>> = _state.asStateFlow()
    init { load() }
    fun load() {
        _state.value = UiState.Loading
        viewModelScope.launch {
            _state.value = try {
                UiState.Success(Api.service.groups(), true)
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                if (BuildConfig.DEBUG && BuildConfig.DEMO_DATA_ENABLED) UiState.Success(FallbackData.groups, false) else UiState.Error(Auth.errorMessage(e))
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
                if (e is CancellationException) throw e
                if (BuildConfig.DEBUG && BuildConfig.DEMO_DATA_ENABLED) UiState.Success(FallbackData.progress, false) else UiState.Error(Auth.errorMessage(e))
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
    fun load(id: Int) {
        _state.value = UiState.Loading
        viewModelScope.launch {
            _state.value = try {
                UiState.Success(Api.service.teacher(id), true)
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                if (BuildConfig.DEBUG && BuildConfig.DEMO_DATA_ENABLED) UiState.Success(FallbackData.teacherDetail, false) else UiState.Error(Auth.errorMessage(e))
            }
        }
    }
}
