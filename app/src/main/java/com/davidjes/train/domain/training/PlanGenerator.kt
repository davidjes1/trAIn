package com.davidjes.train.domain.training

import com.davidjes.train.domain.model.MacroPlan
import com.davidjes.train.domain.model.Mesocycle
import com.davidjes.train.domain.model.PlannedWorkout
import com.davidjes.train.domain.model.TrainingPhase
import com.davidjes.train.domain.model.WorkoutType
import java.time.LocalDate

/**
 * Periodized plan generator (macro → meso → micro → day). Ports
 * `generateStructuredPlan` from the project plan docs: walks each mesocycle week
 * by week, day by day, expanding the 7-day template into dated [PlannedWorkout]s.
 */
object PlanGenerator {

    fun generate(plan: MacroPlan): List<PlannedWorkout> {
        val out = ArrayList<PlannedWorkout>()
        var cursor = plan.startDate
        for (block in plan.mesocycles) {
            repeat(block.weeks) {
                for (dayIdx in 0 until 7) {
                    val type = block.template.getOrElse(dayIdx) { WorkoutType.REST }
                    val preset = WorkoutLibrary.preset(type)
                    out += PlannedWorkout(
                        date = cursor,
                        type = type,
                        sport = type.sport,
                        description = preset.description,
                        durationMin = adjustDuration(preset.durationMin, block.phase),
                        expectedFatigue = preset.expectedFatigue,
                    )
                    cursor = cursor.plusDays(1)
                }
            }
        }
        return out
    }

    /** Phase volume modifier: taper/recovery trims duration, peak/build holds. */
    private fun adjustDuration(base: Int, phase: TrainingPhase): Int = when (phase) {
        TrainingPhase.TAPER -> (base * 0.6).toInt()
        TrainingPhase.RECOVERY -> (base * 0.5).toInt()
        TrainingPhase.PEAK -> (base * 1.05).toInt()
        else -> base
    }

    /** Default periodization templates per phase (Mon..Sun). */
    fun templateFor(phase: TrainingPhase): List<WorkoutType> = when (phase) {
        TrainingPhase.BASE -> listOf(
            WorkoutType.RUN_EASY, WorkoutType.RIDE_Z2, WorkoutType.REST,
            WorkoutType.RUN_EASY, WorkoutType.STRENGTH, WorkoutType.RIDE_ENDURANCE, WorkoutType.MOBILITY,
        )
        TrainingPhase.BUILD -> listOf(
            WorkoutType.RUN_THRESHOLD, WorkoutType.STRENGTH, WorkoutType.RIDE_THRESHOLD,
            WorkoutType.BRICK, WorkoutType.REST, WorkoutType.RUN_EASY, WorkoutType.MOBILITY,
        )
        TrainingPhase.PEAK -> listOf(
            WorkoutType.BRICK, WorkoutType.RUN_INTERVALS, WorkoutType.REST,
            WorkoutType.RIDE_THRESHOLD, WorkoutType.MOBILITY, WorkoutType.RUN_STRIDES, WorkoutType.REST,
        )
        TrainingPhase.TAPER -> listOf(
            WorkoutType.REST, WorkoutType.RUN_STRIDES, WorkoutType.RIDE_Z2,
            WorkoutType.REST, WorkoutType.BRICK, WorkoutType.MOBILITY, WorkoutType.REST,
        )
        TrainingPhase.RECOVERY -> listOf(
            WorkoutType.REST, WorkoutType.MOBILITY, WorkoutType.RUN_EASY,
            WorkoutType.REST, WorkoutType.MOBILITY, WorkoutType.RIDE_Z2, WorkoutType.REST,
        )
    }

    /** Build a simple single-phase mesocycle of [weeks] weeks. */
    fun singlePhase(name: String, phase: TrainingPhase, weeks: Int, goal: String): Mesocycle =
        Mesocycle(name = name, phase = phase, weeks = weeks, goal = goal, template = templateFor(phase))

    /** A reasonable 12-week build toward a race date, ending in taper. */
    fun defaultRacePlan(id: String, name: String, start: LocalDate, race: LocalDate): MacroPlan {
        val mesos = listOf(
            singlePhase("Base I", TrainingPhase.BASE, 4, "Build aerobic endurance"),
            singlePhase("Build I", TrainingPhase.BUILD, 4, "Threshold development"),
            singlePhase("Peak", TrainingPhase.PEAK, 2, "Race simulation"),
            singlePhase("Taper", TrainingPhase.TAPER, 2, "Freshen legs"),
        )
        return MacroPlan(id = id, name = name, startDate = start, eventDate = race, mesocycles = mesos)
    }
}
