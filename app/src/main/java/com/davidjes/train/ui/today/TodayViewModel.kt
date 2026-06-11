package com.davidjes.train.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.davidjes.train.data.health.HealthConnectManager
import com.davidjes.train.data.repository.HabitRepository
import com.davidjes.train.data.repository.NutritionRepository
import com.davidjes.train.data.repository.PlanRepository
import com.davidjes.train.data.repository.RecoveryRepository
import com.davidjes.train.data.repository.WorkoutRepository
import com.davidjes.train.data.prefs.ProfileRepository
import com.davidjes.train.domain.ai.NarrativeGenerator
import com.davidjes.train.domain.model.RecoveryMetrics
import com.davidjes.train.domain.model.Sport
import com.davidjes.train.domain.training.ReadinessCalculator
import com.davidjes.train.domain.training.TrainingLoadCalculator
import com.davidjes.train.domain.training.WorkoutRecommender
import com.davidjes.train.ui.components.DeltaTone
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import javax.inject.Inject
import kotlin.math.roundToInt

@HiltViewModel
class TodayViewModel @Inject constructor(
    private val healthConnect: HealthConnectManager,
    private val profileRepository: ProfileRepository,
    private val recoveryRepository: RecoveryRepository,
    private val workoutRepository: WorkoutRepository,
    private val planRepository: PlanRepository,
    private val habitRepository: HabitRepository,
    private val nutritionRepository: NutritionRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(TodayUiState())
    val state = _state.asStateFlow()

    val healthConnectManager: HealthConnectManager get() = healthConnect

    init { refresh() }

    fun setMode(mode: TodayMode) = _state.update { it.copy(mode = mode) }

    fun onPermissionsResult(granted: Set<String>) {
        val ok = granted.containsAll(healthConnect.permissions)
        _state.update { it.copy(hasPermissions = ok) }
        if (ok) refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            val availability = healthConnect.availability()
            val hasPerms = healthConnect.hasAllPermissions()
            _state.update {
                it.copy(loading = it.readiness == null, syncing = true, hcAvailability = availability, hasPermissions = hasPerms)
            }
            if (availability != HealthConnectManager.Availability.INSTALLED || !hasPerms) {
                _state.update { it.copy(loading = false, syncing = false) }
                return@launch
            }
            loadData()
        }
    }

    fun toggleHabit(habitId: String, done: Boolean) {
        viewModelScope.launch {
            habitRepository.toggle(habitId, LocalDate.now(), done)
            val habits = habitRepository.habitsForDay(LocalDate.now()).first()
            _state.update { it.copy(habits = habits) }
        }
    }

    fun updateCheckIn(checkIn: CheckIn) = _state.update { it.copy(checkIn = checkIn) }

    /**
     * Complete-plan-first logging: only write a new Health Connect session if a
     * device hasn't already recorded a matching one in the window.
     */
    fun logWorkout(sport: Sport, durationMin: Int, title: String?) {
        viewModelScope.launch {
            val end = java.time.Instant.now()
            val start = end.minusSeconds(durationMin.coerceAtLeast(1) * 60L)
            val deviceMatch = workoutRepository.findDeviceMatch(start, end, sport)
            if (deviceMatch == null) {
                workoutRepository.logCompletedWorkout(sport, durationMin, title?.takeIf { it.isNotBlank() })
            }
            // else: device already has it — skip the write to avoid a duplicate.
            loadData()
        }
    }

    fun resolveConflict(ourWorkoutId: String, deleteOurs: Boolean) {
        viewModelScope.launch {
            if (deleteOurs) workoutRepository.deleteWorkout(ourWorkoutId)
            _state.update { it.copy(conflicts = it.conflicts.filterNot { c -> c.ourId == ourWorkoutId }) }
            if (deleteOurs) loadData()
        }
    }

    fun saveCheckIn() {
        viewModelScope.launch {
            val c = _state.value.checkIn
            recoveryRepository.saveCheckIn(LocalDate.now(), mood = c.mood, energy = c.energy, stress = c.stress)
            loadData()
        }
    }

    private suspend fun loadData() {
        val today = LocalDate.now()
        val profile = profileRepository.profile.first()

        // Recovery: 28-day window for sparklines + baselines + today's snapshot.
        val series = recoveryRepository.seriesBetween(today.minusDays(27), today)
        val todayMetrics = series.lastOrNull() ?: RecoveryMetrics(date = today)
        val baselines = recoveryRepository.baselines(today)

        // Training load over ~16 weeks for a stable CTL/ATL.
        val loadStart = Instant.now().minusSeconds(112L * 86_400)
        val dailyLoad = workoutRepository.dailyLoad(loadStart, Instant.now())
        val load = TrainingLoadCalculator.current(dailyLoad, today)

        val summaries = workoutRepository.recentSummaries(14)

        val readiness = ReadinessCalculator.compute(
            today = todayMetrics,
            hrvBaseline = baselines.hrv,
            restingHrBaseline = baselines.restingHr,
            tsb = load?.tsb,
        )

        val eventDay = planRepository.activePlan().first()?.eventEpochDay
        val daysUntilRace = eventDay?.let { (it - today.toEpochDay()).toInt() }

        val recommendation = WorkoutRecommender.suggest(
            readiness = readiness,
            tsb = load?.tsb,
            recentWorkouts = summaries,
            phase = null,
            daysUntilRace = daysUntilRace,
        )

        val narrative = NarrativeGenerator.todayNarrative(readiness, load, recommendation)

        // Recovery 2x2 factors.
        val factors = buildRecoveryFactors(series, todayMetrics, baselines)

        // Habits (seed defaults on first run) + nutrition snapshot.
        var habits = habitRepository.habitsForDay(today).first()
        if (habits.isEmpty()) {
            habitRepository.seedDefaultsIfEmpty(habits)
            habits = habitRepository.habitsForDay(today).first()
        }
        val nutrition = nutritionRepository.day(today).first()

        val conflicts = workoutRepository.findConflicts().map { c ->
            WorkoutConflict(
                ourId = c.ours.id,
                ourTitle = c.ours.title,
                deviceTitle = c.device.title,
                deviceSource = c.device.dataOrigin?.substringAfterLast('.')?.replaceFirstChar { it.uppercase() } ?: "Device",
                dateLabel = c.device.start.atZone(java.time.ZoneId.systemDefault())
                    .format(java.time.format.DateTimeFormatter.ofPattern("MMM d")),
            )
        }

        _state.update {
            it.copy(
                loading = false, syncing = false,
                readiness = readiness, load = load, recommendation = recommendation,
                narrative = narrative, recoveryFactors = factors,
                habits = habits, nutrition = nutrition, conflicts = conflicts,
            )
        }
    }

    private fun buildRecoveryFactors(
        series: List<RecoveryMetrics>,
        today: RecoveryMetrics,
        baselines: RecoveryRepository.Baselines,
    ): List<RecoveryFactor> {
        fun spark(sel: (RecoveryMetrics) -> Double?): List<Float> =
            series.mapNotNull { sel(it)?.toFloat() }

        val hrvSpark = spark { it.hrvMs }
        val rhrSpark = spark { it.restingHr?.toDouble() }
        val sleepSpark = spark { it.sleepHours }
        val batterySpark = spark { it.bodyBattery?.toDouble() }

        val hrvDelta = today.hrvMs?.let { v -> baselines.hrv?.let { b -> ((v - b) / b * 100).roundToInt() } }
        val rhrDelta = today.restingHr?.let { v -> baselines.restingHr?.let { b -> (v - b).roundToInt() } }

        return listOf(
            RecoveryFactor(
                label = "HRV", iconKey = "pulse",
                value = today.hrvMs?.roundToInt()?.toString() ?: "—", unit = "ms",
                spark = hrvSpark.ifEmpty { listOf(0f, 0f) },
                delta = hrvDelta?.let { (if (it >= 0) "+$it%" else "$it%") },
                deltaTone = when { hrvDelta == null -> DeltaTone.NEUTRAL; hrvDelta >= 0 -> DeltaTone.GOOD; else -> DeltaTone.BAD },
            ),
            RecoveryFactor(
                label = "Resting HR", iconKey = "heart",
                value = today.restingHr?.toString() ?: "—", unit = "bpm",
                spark = rhrSpark.ifEmpty { listOf(0f, 0f) },
                delta = rhrDelta?.let { (if (it > 0) "+$it" else "$it") },
                deltaTone = when { rhrDelta == null -> DeltaTone.NEUTRAL; rhrDelta <= 0 -> DeltaTone.GOOD; else -> DeltaTone.BAD },
            ),
            RecoveryFactor(
                label = "Sleep", iconKey = "bed",
                value = today.sleepHours?.let { "%.1f".format(it) } ?: "—", unit = "h",
                spark = sleepSpark.ifEmpty { listOf(0f, 0f) },
                delta = null, deltaTone = DeltaTone.NEUTRAL,
            ),
            RecoveryFactor(
                label = "Body Battery", iconKey = "battery",
                value = today.bodyBattery?.toString() ?: "—", unit = null,
                spark = batterySpark.ifEmpty { listOf(0f, 0f) },
                delta = null, deltaTone = DeltaTone.NEUTRAL,
            ),
        )
    }
}
