package com.davidjes.train.domain.training

import com.davidjes.train.domain.model.WorkoutPreset
import com.davidjes.train.domain.model.WorkoutType

/** Preset workouts with base duration + expected fatigue (0..100). */
object WorkoutLibrary {

    val presets: Map<WorkoutType, WorkoutPreset> = listOf(
        WorkoutPreset(WorkoutType.RUN_EASY, "Easy run, build aerobic base", 35, 45.0),
        WorkoutPreset(WorkoutType.RUN_STRIDES, "30 min easy with 4×20s strides", 35, 50.0),
        WorkoutPreset(WorkoutType.RUN_THRESHOLD, "Tempo run at threshold", 45, 70.0),
        WorkoutPreset(WorkoutType.RUN_INTERVALS, "VO2 intervals (e.g. 5×3 min)", 50, 80.0),
        WorkoutPreset(WorkoutType.RIDE_Z2, "Zone 2 ride, easy aerobic", 45, 45.0),
        WorkoutPreset(WorkoutType.RIDE_ENDURANCE, "Endurance ride", 75, 55.0),
        WorkoutPreset(WorkoutType.RIDE_THRESHOLD, "Threshold intervals on the bike", 60, 72.0),
        WorkoutPreset(WorkoutType.BRICK, "Bike 25 + Run 10 (race sim)", 40, 65.0),
        WorkoutPreset(WorkoutType.STRENGTH, "Strength + core", 30, 30.0),
        WorkoutPreset(WorkoutType.MOBILITY, "Mobility / yoga for recovery", 20, 10.0),
        WorkoutPreset(WorkoutType.SWIM, "Technique + aerobic swim", 40, 40.0),
        WorkoutPreset(WorkoutType.REST, "Rest or gentle walk", 0, 0.0),
    ).associateBy { it.type }

    fun preset(type: WorkoutType): WorkoutPreset = presets.getValue(type)
}
