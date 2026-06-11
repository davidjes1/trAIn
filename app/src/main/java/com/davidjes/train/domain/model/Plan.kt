package com.davidjes.train.domain.model

import java.time.LocalDate

enum class TrainingPhase { BASE, BUILD, PEAK, TAPER, RECOVERY }

enum class WorkoutType(val sport: Sport) {
    RUN_EASY(Sport.RUN),
    RUN_STRIDES(Sport.RUN),
    RUN_THRESHOLD(Sport.RUN),
    RUN_INTERVALS(Sport.RUN),
    RIDE_Z2(Sport.RIDE),
    RIDE_ENDURANCE(Sport.RIDE),
    RIDE_THRESHOLD(Sport.RIDE),
    BRICK(Sport.BRICK),
    STRENGTH(Sport.STRENGTH),
    MOBILITY(Sport.MOBILITY),
    SWIM(Sport.SWIM),
    REST(Sport.REST);
}

/** Library preset: base duration + expected fatigue (0..100). */
data class WorkoutPreset(
    val type: WorkoutType,
    val description: String,
    val durationMin: Int,
    val expectedFatigue: Double,
)

data class PlannedWorkout(
    val id: String = "",
    val date: LocalDate,
    val type: WorkoutType,
    val sport: Sport,
    val description: String,
    val durationMin: Int,
    val expectedFatigue: Double,
    val completed: Boolean = false,
    val completedWorkoutId: String? = null,
)

data class Mesocycle(
    val name: String,
    val phase: TrainingPhase,
    val weeks: Int,
    val goal: String,
    /** 7-day template of workout types (index 0 = Monday). */
    val template: List<WorkoutType>,
)

data class MacroPlan(
    val id: String,
    val name: String,
    val startDate: LocalDate,
    val eventDate: LocalDate?,
    val mesocycles: List<Mesocycle>,
)

/** Output of the dynamic engine for "today". */
data class WorkoutRecommendation(
    val type: WorkoutType,
    val sport: Sport,
    val title: String,
    val rationale: String,
    val durationMin: Int,
    val confidence: Double, // 0..1
)
