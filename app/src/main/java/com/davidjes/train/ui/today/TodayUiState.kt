package com.davidjes.train.ui.today

import com.davidjes.train.data.health.HealthConnectManager
import com.davidjes.train.domain.model.Habit
import com.davidjes.train.domain.model.NutritionDay
import com.davidjes.train.domain.model.Readiness
import com.davidjes.train.domain.model.TrainingLoadState
import com.davidjes.train.domain.model.WorkoutRecommendation
import com.davidjes.train.ui.components.DeltaTone

enum class TodayMode { NARRATIVE, METRICS }

data class RecoveryFactor(
    val label: String,
    val iconKey: String,
    val value: String,
    val unit: String?,
    val spark: List<Float>,
    val delta: String?,
    val deltaTone: DeltaTone,
)

data class TodayUiState(
    val loading: Boolean = true,
    val syncing: Boolean = false,
    val hcAvailability: HealthConnectManager.Availability = HealthConnectManager.Availability.INSTALLED,
    val hasPermissions: Boolean = false,
    val mode: TodayMode = TodayMode.NARRATIVE,
    val readiness: Readiness? = null,
    val load: TrainingLoadState? = null,
    val recommendation: WorkoutRecommendation? = null,
    val narrative: String = "",
    val recoveryFactors: List<RecoveryFactor> = emptyList(),
    val habits: List<Habit> = emptyList(),
    val nutrition: NutritionDay? = null,
    val checkIn: CheckIn = CheckIn(),
    val conflicts: List<WorkoutConflict> = emptyList(),
) {
    val needsConnect: Boolean
        get() = hcAvailability != HealthConnectManager.Availability.INSTALLED || !hasPermissions
}

data class CheckIn(val mood: Int = 5, val energy: Int = 5, val stress: Int = 3)

/** A trAIn-logged workout that overlaps a device recording — surfaced to the user to resolve. */
data class WorkoutConflict(
    val ourId: String,
    val ourTitle: String,
    val deviceTitle: String,
    val deviceSource: String,
    val dateLabel: String,
)
