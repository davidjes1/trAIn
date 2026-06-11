package com.davidjes.train.ui.plan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.davidjes.train.data.repository.PlanRepository
import com.davidjes.train.data.repository.RecoveryRepository
import com.davidjes.train.data.repository.WorkoutRepository
import com.davidjes.train.domain.model.PlannedWorkout
import com.davidjes.train.domain.model.Sport
import com.davidjes.train.domain.model.Workout
import com.davidjes.train.domain.training.ReadinessCalculator
import com.davidjes.train.domain.training.TrainingLoadCalculator
import com.davidjes.train.domain.training.WorkoutRecommender
import com.davidjes.train.ui.components.toUi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale
import javax.inject.Inject
import kotlin.math.roundToInt

@HiltViewModel
class PlanViewModel @Inject constructor(
    private val workoutRepository: WorkoutRepository,
    private val planRepository: PlanRepository,
    private val recoveryRepository: RecoveryRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(PlanUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun setTab(tab: PlanTab) = _state.update { it.copy(tab = tab) }

    fun addPlanned(type: com.davidjes.train.domain.model.WorkoutType, date: LocalDate, durationMin: Int) {
        viewModelScope.launch {
            planRepository.addPlannedWorkout(date, type, durationMin)
            load()
        }
    }

    /**
     * Mark a planned workout done. Complete-plan-first: link it to a device session
     * already recorded that day if one matches; otherwise just mark it complete.
     */
    fun completePlanned(item: DayItem) {
        val plannedId = item.plannedId ?: return
        val date = item.date ?: return
        viewModelScope.launch {
            val zone = ZoneId.systemDefault()
            val dayStart = date.atStartOfDay(zone).toInstant()
            val dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant()
            val match = workoutRepository.findDeviceMatch(dayStart, dayEnd, item.sport)
            planRepository.markCompleted(plannedId, completed = true, workoutId = match?.id)
            load()
        }
    }

    fun resolveConflict(ourWorkoutId: String, deleteOurs: Boolean) {
        viewModelScope.launch {
            if (deleteOurs) {
                workoutRepository.deleteWorkout(ourWorkoutId)
                load()
            } else {
                _state.update { it.copy(conflicts = it.conflicts.filterNot { c -> c.ourId == ourWorkoutId }) }
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            val today = LocalDate.now()
            val zone = ZoneId.systemDefault()
            val weekStart = today.with(DayOfWeek.MONDAY)
            val weekEnd = weekStart.plusDays(6)
            val monthFirst = today.withDayOfMonth(1)
            val gridStart = monthFirst.with(DayOfWeek.MONDAY)
            val gridEnd = gridStart.plusDays(41)

            // One workout read covering form window + grid.
            val rangeStart = minOf(gridStart, today.minusDays(42))
            val startInstant = rangeStart.atStartOfDay(zone).toInstant()
            val endInstant = gridEnd.plusDays(1).atStartOfDay(zone).toInstant()
            val completed = workoutRepository.workoutsBetween(startInstant, endInstant)
            val planned = planRepository.plannedBetween(rangeStart, gridEnd).first()
            val activePlan = planRepository.activePlan().first()

            val dailyLoad = completed.groupBy { it.date }.mapValues { (_, l) -> l.sumOf { it.trainingLoad } }
            val loadSeries = TrainingLoadCalculator.series(dailyLoad, from = today.minusDays(41), to = today.plusDays(7))
            val focus = buildTodayFocus(today, planned, completed)
            val conflicts = workoutRepository.findConflicts().map { it.toUi() }

            _state.update {
                it.copy(
                    loading = false,
                    blockLabel = activePlan?.name ?: "No active plan",
                    conflicts = conflicts,
                    todayFocus = focus,
                    todayItems = itemsForDay(today, planned, completed, dailyLoad.values.maxOrNull() ?: 1.0),
                    week = buildWeek(weekStart, weekEnd, planned, completed),
                    month = buildMonth(monthFirst, gridStart, today, planned, completed),
                    form = buildForm(loadSeries),
                )
            }
        }
    }

    private fun itemsForDay(
        date: LocalDate,
        planned: List<PlannedWorkout>,
        completed: List<Workout>,
        maxLoad: Double,
    ): List<DayItem> {
        val done = completed.filter { it.date == date }.map { w ->
            DayItem(
                sport = w.sport, title = w.title,
                minutes = (w.durationSeconds / 60).toInt(),
                load = w.trainingLoad.roundToInt(),
                loadFraction = (w.trainingLoad / maxLoad).coerceIn(0.0, 1.0).toFloat(),
                done = true, isAi = false, workoutId = w.id, date = date,
            )
        }
        val plan = planned.filter { it.date == date && !it.completed }.map { p ->
            DayItem(
                sport = p.sport, title = p.description,
                minutes = p.durationMin.takeIf { it > 0 },
                load = p.expectedFatigue.roundToInt(),
                loadFraction = (p.expectedFatigue / 100.0).toFloat(),
                done = false, isAi = false, workoutId = null, plannedId = p.id, date = date,
            )
        }
        return done + plan
    }

    private suspend fun buildTodayFocus(
        today: LocalDate,
        planned: List<PlannedWorkout>,
        completed: List<Workout>,
    ): TodayFocus {
        planned.firstOrNull { it.date == today && !it.completed }?.let { p ->
            return TodayFocus(
                sport = p.sport, title = p.description, minutes = p.durationMin,
                detail = "Planned · load ${p.expectedFatigue.roundToInt()}",
                isAi = false, zoneStructure = defaultStructure(p.sport), workoutId = null,
            )
        }
        // No plan today → AI recommendation from readiness + load.
        val metrics = recoveryRepository.metricsForDay(today)
        val baselines = recoveryRepository.baselines(today)
        val dailyLoad = completed.groupBy { it.date }.mapValues { (_, l) -> l.sumOf { it.trainingLoad } }
        val load = TrainingLoadCalculator.current(dailyLoad, today)
        val readiness = ReadinessCalculator.compute(metrics, baselines.hrv, baselines.restingHr, load?.tsb)
        val rec = WorkoutRecommender.suggest(readiness, load?.tsb, workoutRepository.recentSummaries(14), null, null)
        return TodayFocus(
            sport = rec.sport, title = rec.title, minutes = rec.durationMin,
            detail = rec.rationale, isAi = true, zoneStructure = defaultStructure(rec.sport), workoutId = null,
        )
    }

    private fun defaultStructure(sport: Sport): List<Float> = when (sport) {
        Sport.RUN, Sport.RIDE -> listOf(10f, 25f, 1.5f, 3f, 1.5f, 3f, 5f)
        else -> listOf(8f, 6f, 4f, 2f, 1f)
    }

    private fun buildWeek(
        weekStart: LocalDate,
        weekEnd: LocalDate,
        planned: List<PlannedWorkout>,
        completed: List<Workout>,
    ): WeekData {
        val today = LocalDate.now()
        val maxLoad = ((completed.filter { it.date in weekStart..weekEnd }.maxOfOrNull { it.trainingLoad }) ?: 100.0)
        val days = (0..6).map { offset ->
            val d = weekStart.plusDays(offset.toLong())
            DayPlan(
                date = d,
                weekdayLabel = d.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()),
                dayNum = d.dayOfMonth,
                isToday = d == today,
                items = itemsForDay(d, planned, completed, maxLoad),
            )
        }
        val totalLoad = days.sumOf { day -> day.items.sumOf { it.load ?: 0 } }
        val totalMinutes = days.sumOf { day -> day.items.sumOf { it.minutes ?: 0 } }
        return WeekData(days, totalLoad, totalMinutes)
    }

    private fun buildMonth(
        monthFirst: LocalDate,
        gridStart: LocalDate,
        today: LocalDate,
        planned: List<PlannedWorkout>,
        completed: List<Workout>,
    ): MonthData {
        val cells = (0..41).map { i ->
            val d = gridStart.plusDays(i.toLong())
            val sport = completed.firstOrNull { it.date == d }?.sport
                ?: planned.firstOrNull { it.date == d && it.sport != Sport.REST }?.sport
            MonthCell(
                dayNum = d.dayOfMonth,
                inMonth = d.month == monthFirst.month,
                sport = sport?.takeIf { it != Sport.REST },
                isToday = d == today,
            )
        }
        val title = monthFirst.month.getDisplayName(TextStyle.FULL, Locale.getDefault()) + " " + monthFirst.year
        return MonthData(title, cells)
    }

    private fun buildForm(series: List<com.davidjes.train.domain.model.TrainingLoadState>): FormData {
        val ctl = series.map { it.ctl.toFloat() }
        val atl = series.map { it.atl.toFloat() }
        val tsb = series.map { it.tsb.toFloat() }
        val current = series.lastOrNull()
        // Naive projection: hold current CTL, decay ATL a week → TSB up.
        val projTsb = current?.let { it.ctl - it.atl * 0.6 } ?: 0.0
        val projScore = (50 + projTsb).coerceIn(0.0, 100.0).roundToInt()
        return FormData(
            ctl = ctl.ifEmpty { listOf(0f, 0f) },
            atl = atl.ifEmpty { listOf(0f, 0f) },
            tsb = tsb.ifEmpty { listOf(0f, 0f) },
            currentCtl = current?.ctl?.roundToInt() ?: 0,
            currentAtl = current?.atl?.roundToInt() ?: 0,
            currentTsb = current?.tsb?.roundToInt() ?: 0,
            projectionScore = projScore,
        )
    }
}
