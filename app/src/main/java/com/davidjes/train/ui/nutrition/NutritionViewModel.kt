package com.davidjes.train.ui.nutrition

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.davidjes.train.data.repository.NutritionRepository
import com.davidjes.train.data.repository.WorkoutRepository
import com.davidjes.train.domain.model.NutritionDay
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
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
    val burnedKcal: Int = 0,
)

@HiltViewModel
class NutritionViewModel @Inject constructor(
    private val nutritionRepository: NutritionRepository,
    private val workoutRepository: WorkoutRepository,
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
            nutritionRepository.day(today).collect { day ->
                _state.update { it.copy(loading = false, day = day) }
            }
        }
    }

    fun addMeal(name: String, kcal: Int, protein: Int, carbs: Int, fat: Int) {
        viewModelScope.launch {
            nutritionRepository.addMeal(today, name.ifBlank { "Meal" }, kcal, protein, carbs, fat)
        }
    }
}
