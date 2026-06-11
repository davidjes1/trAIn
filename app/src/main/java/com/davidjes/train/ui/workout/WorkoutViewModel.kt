package com.davidjes.train.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.davidjes.train.data.repository.WorkoutRepository
import com.davidjes.train.domain.model.Workout
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WorkoutUiState(
    val loading: Boolean = true,
    val workout: Workout? = null,
    val hrSeries: List<Float> = emptyList(),
    val zoneDurations: List<String> = emptyList(),
)

@HiltViewModel
class WorkoutViewModel @Inject constructor(
    private val workoutRepository: WorkoutRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(WorkoutUiState())
    val state = _state.asStateFlow()

    fun load(id: String) {
        if (_state.value.workout?.id == id) return
        viewModelScope.launch {
            _state.update { it.copy(loading = true) }
            val workout = workoutRepository.workout(id)
            val hr = workout?.let { workoutRepository.hrSeries(it.start, it.end) } ?: emptyList()
            _state.update {
                it.copy(
                    loading = false,
                    workout = workout,
                    hrSeries = hr,
                    zoneDurations = workout?.zones?.asList()?.map { sec -> formatDuration(sec) } ?: emptyList(),
                )
            }
        }
    }

    private fun formatDuration(seconds: Long): String {
        val m = seconds / 60
        return if (m >= 60) "${m / 60}h${(m % 60).toString().padStart(2, '0')}" else "${m}m"
    }
}
