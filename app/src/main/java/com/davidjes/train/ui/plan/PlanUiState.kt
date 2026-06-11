package com.davidjes.train.ui.plan

import com.davidjes.train.domain.model.Sport
import java.time.LocalDate

enum class PlanTab { DAY, WEEK, MONTH, FORM }

data class DayItem(
    val sport: Sport,
    val title: String,
    val minutes: Int?,
    val load: Int?,        // TRIMP/expected fatigue, shown as a load number
    val loadFraction: Float, // 0..1 for bars
    val done: Boolean,
    val isAi: Boolean,
    val workoutId: String?,
)

data class DayPlan(
    val date: LocalDate,
    val weekdayLabel: String, // Mon
    val dayNum: Int,
    val isToday: Boolean,
    val items: List<DayItem>,
)

data class WeekData(
    val days: List<DayPlan>,
    val totalLoad: Int,
    val totalMinutes: Int,
)

data class MonthCell(
    val dayNum: Int,
    val inMonth: Boolean,
    val sport: Sport?,
    val isToday: Boolean,
)

data class MonthData(
    val title: String,
    val cells: List<MonthCell>,
)

data class FormData(
    val ctl: List<Float>,
    val atl: List<Float>,
    val tsb: List<Float>,
    val currentCtl: Int,
    val currentAtl: Int,
    val currentTsb: Int,
    val projectionScore: Int,
)

data class TodayFocus(
    val sport: Sport,
    val title: String,
    val minutes: Int,
    val detail: String,
    val isAi: Boolean,
    val zoneStructure: List<Float>,
    val workoutId: String?,
)

data class PlanUiState(
    val loading: Boolean = true,
    val tab: PlanTab = PlanTab.DAY,
    val blockLabel: String = "",
    val todayFocus: TodayFocus? = null,
    val todayItems: List<DayItem> = emptyList(),
    val week: WeekData? = null,
    val month: MonthData? = null,
    val form: FormData? = null,
    val conflicts: List<com.davidjes.train.ui.components.WorkoutConflict> = emptyList(),
)
