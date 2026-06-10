package com.davidjes.train.domain.model

import java.time.Instant
import java.time.LocalDate

enum class WorkoutSource { HEALTH_CONNECT, MANUAL, PLANNED }

/** Time-in-zone seconds, Z1..Z5. */
data class ZoneDistribution(
    val z1: Long = 0,
    val z2: Long = 0,
    val z3: Long = 0,
    val z4: Long = 0,
    val z5: Long = 0,
) {
    val totalSeconds: Long get() = z1 + z2 + z3 + z4 + z5
    fun asList(): List<Long> = listOf(z1, z2, z3, z4, z5)
    fun asWeights(): List<Float> = asList().map { it.toFloat() }
}

/**
 * A completed activity. Mirrors a Health Connect ExerciseSessionRecord plus
 * computed analysis. [healthConnectId] links back to the source of truth.
 */
data class Workout(
    val id: String,
    val healthConnectId: String? = null,
    val sport: Sport,
    val title: String,
    val start: Instant,
    val end: Instant,
    val durationSeconds: Long,
    val distanceMeters: Double? = null,
    val avgHr: Int? = null,
    val maxHr: Int? = null,
    val activeKcal: Double? = null,
    val totalKcal: Double? = null,
    val avgSpeedMps: Double? = null,
    val avgPowerWatts: Double? = null,
    val zones: ZoneDistribution = ZoneDistribution(),
    /** TRIMP-based training load. */
    val trainingLoad: Double = 0.0,
    val source: WorkoutSource = WorkoutSource.HEALTH_CONNECT,
    val notes: String? = null,
) {
    val date: LocalDate get() = start.atZone(java.time.ZoneId.systemDefault()).toLocalDate()
}

/** Summary used by the recommendation/plan engines. */
data class WorkoutSummary(
    val date: LocalDate,
    val sport: Sport,
    val durationMinutes: Int,
    val fatigue: Double, // 0..100 (proportional to training load)
)
