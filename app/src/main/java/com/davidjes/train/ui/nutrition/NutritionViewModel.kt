package com.davidjes.train.ui.nutrition

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.davidjes.train.data.prefs.ProfileRepository
import com.davidjes.train.data.repository.NutritionRepository
import com.davidjes.train.data.repository.WorkoutRepository
import com.davidjes.train.domain.model.NutritionDay
import com.davidjes.train.domain.model.NutritionTargets
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject
import kotlin.math.roundToInt

data class NutritionUiState(
    val loading: Boolean = true,
    val day: NutritionDay? = null,
    val targets: NutritionTargets = NutritionTargets(),
    val burnedKcal: Int = 0,
)

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class NutritionViewModel @Inject constructor(
    private val nutritionRepository: NutritionRepository,
    private val workoutRepository: WorkoutRepository,
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(NutritionUiState())
    val state = _state.asStateFlow()

    private val today = LocalDate.now()

    init {
        viewModelScope.launch {
            val start = today.atStartOfDay(ZoneId.systemDefault()).toInstant()
            val burned = workoutRepository.workoutsBetween(start, Instant.now()).sumOf { it.activeKcal ?: 0.0 }
            _state.update { it.copy(burnedKcal = burned.roundToInt()) }
        }
        viewModelScope.launch {
            profileRepository.nutritionTargets
                .onEach { targets -> _state.update { it.copy(targets = targets) } }
                .flatMapLatest { targets -> nutritionRepository.day(today, targets) }
                .collect { day -> _state.update { it.copy(loading = false, day = day) } }
        }
    }

    fun addMeal(name: String, kcal: Int, protein: Int, carbs: Int, fat: Int) {
        viewModelScope.launch {
            nutritionRepository.addMeal(today, name.ifBlank { "Meal" }, kcal, protein, carbs, fat)
        }
    }

    fun saveTargets(targets: NutritionTargets) {
        viewModelScope.launch { profileRepository.setNutritionTargets(targets) }
    }
}
