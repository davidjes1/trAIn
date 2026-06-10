package com.davidjes.train.domain.training

import com.davidjes.train.domain.model.Readiness
import com.davidjes.train.domain.model.TrainingPhase
import com.davidjes.train.domain.model.WorkoutRecommendation
import com.davidjes.train.domain.model.WorkoutSummary
import com.davidjes.train.domain.model.WorkoutType

/**
 * Dynamic daily workout suggestion. Ports the decision engine from the project
 * plan docs (readiness + recent fatigue + race proximity + weekly hard-day cap),
 * with phase awareness layered on top.
 */
object WorkoutRecommender {

    private const val HARD_FATIGUE = 60.0
    private const val MAX_HARD_PER_WEEK = 2

    fun suggest(
        readiness: Readiness,
        tsb: Double?,
        recentWorkouts: List<WorkoutSummary>, // chronological, most recent last
        phase: TrainingPhase?,
        daysUntilRace: Int?,
        availableToday: Boolean = true,
    ): WorkoutRecommendation {
        if (!availableToday) return rec(WorkoutType.REST, "No training time today — rest and recover.", 1.0)

        val last7 = recentWorkouts.takeLast(7)
        val fatigueAvg = last7.map { it.fatigue }.ifEmpty { listOf(0.0) }.average()
        val hardDays = last7.count { it.fatigue >= HARD_FATIGUE }
        val lastWasHard = recentWorkouts.lastOrNull()?.let { it.fatigue >= HARD_FATIGUE } == true

        // Taper window overrides everything when close to race.
        if (daysUntilRace != null && daysUntilRace in 0..10) {
            return when {
                daysUntilRace <= 2 -> rec(WorkoutType.MOBILITY, "Race in $daysUntilRace days — stay loose, rest legs.", 0.9)
                else -> rec(WorkoutType.RUN_STRIDES, "Taper: short and sharp to stay fresh for race day.", 0.85)
            }
        }

        // Recovery-first guards.
        if (readiness.level == Readiness.Level.RECOVER || fatigueAvg > 55) {
            return rec(WorkoutType.MOBILITY, recoverWhy(readiness), 0.8)
        }
        if (lastWasHard) {
            return rec(WorkoutType.STRENGTH, "Yesterday was hard — keep today low-impact with strength + core.", 0.75)
        }
        if (hardDays >= MAX_HARD_PER_WEEK) {
            return rec(WorkoutType.RIDE_Z2, "Two hard sessions already this week — hold aerobic with Z2.", 0.75)
        }

        // Phase-aware quality day when fresh.
        if (readiness.level == Readiness.Level.VERY_READY && fatigueAvg < 50) {
            return when (phase) {
                TrainingPhase.BUILD -> rec(WorkoutType.RUN_THRESHOLD, "Readiness high and form fresh — threshold work fits the build phase.", 0.85)
                TrainingPhase.PEAK -> rec(WorkoutType.BRICK, "Peaking with good readiness — race-simulation brick.", 0.85)
                else -> rec(WorkoutType.RUN_STRIDES, "Good readiness — aerobic with strides to sharpen.", 0.8)
            }
        }

        // Default aerobic maintenance.
        return when (phase) {
            TrainingPhase.RECOVERY -> rec(WorkoutType.MOBILITY, "Recovery block — keep it gentle.", 0.8)
            else -> rec(WorkoutType.RUN_EASY, easyWhy(tsb), 0.7)
        }
    }

    private fun recoverWhy(r: Readiness): String {
        val driver = r.drivers.firstOrNull()
        return if (driver != null) "$driver — prioritize recovery with mobility today." else "Readiness is low — recover today."
    }

    private fun easyWhy(tsb: Double?): String = when {
        tsb != null && tsb < -10 -> "Carrying fatigue (TSB ${tsb.toInt()}) — easy aerobic to absorb load."
        else -> "Maintain aerobic base with an easy run."
    }

    private fun rec(type: WorkoutType, why: String, confidence: Double): WorkoutRecommendation {
        val p = WorkoutLibrary.preset(type)
        return WorkoutRecommendation(
            type = type,
            sport = type.sport,
            title = p.description,
            rationale = why,
            durationMin = p.durationMin,
            confidence = confidence,
        )
    }
}
