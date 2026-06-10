package com.davidjes.train.domain.training

import com.davidjes.train.domain.model.Readiness
import com.davidjes.train.domain.model.RecoveryMetrics
import kotlin.math.roundToInt

/**
 * Composite readiness (0..100) from recovery markers + training-stress balance.
 * Each available factor produces a 0..100 sub-score; the result is their weighted
 * mean over only the factors that have data, so a sparse day still scores sensibly.
 */
object ReadinessCalculator {

    data class Factor(val key: String, val score: Double, val weight: Double, val driver: String?)

    fun compute(
        today: RecoveryMetrics,
        hrvBaseline: Double?,
        restingHrBaseline: Double?,
        tsb: Double?,
    ): Readiness {
        val factors = buildList {
            // HRV vs baseline (higher better). ±20% maps to 0..100 around 50.
            if (today.hrvMs != null && hrvBaseline != null && hrvBaseline > 0) {
                val ratio = today.hrvMs / hrvBaseline
                val score = (50 + (ratio - 1) * 250).coerceIn(0.0, 100.0)
                val pct = ((ratio - 1) * 100).roundToInt()
                val driver = when {
                    pct <= -8 -> "HRV ${-pct}% below baseline"
                    pct >= 8 -> "HRV ${pct}% above baseline"
                    else -> null
                }
                add(Factor("hrv", score, 0.25, driver))
            }
            // Resting HR vs baseline (lower better). Each bpm = 5 points.
            if (today.restingHr != null && restingHrBaseline != null && restingHrBaseline > 0) {
                val delta = restingHrBaseline - today.restingHr
                val score = (70 + delta * 5).coerceIn(0.0, 100.0)
                val driver = when {
                    delta <= -4 -> "Resting HR ${(-delta).roundToInt()} bpm above baseline"
                    delta >= 4 -> "Resting HR low"
                    else -> null
                }
                add(Factor("rhr", score, 0.15, driver))
            }
            // Sleep (target 8h) or explicit sleep score.
            val sleepScore = today.sleepScore?.toDouble()
                ?: today.sleepHours?.let { (it / 8.0 * 100).coerceIn(0.0, 100.0) }
            if (sleepScore != null) {
                val driver = today.sleepHours?.let { h ->
                    if (h < 6.5) "Slept ${"%.1f".format(h)}h" else null
                }
                add(Factor("sleep", sleepScore, 0.20, driver))
            }
            // Body battery (already 0..100).
            today.bodyBattery?.let {
                val driver = if (it < 35) "Body battery low ($it)" else null
                add(Factor("battery", it.toDouble(), 0.15, driver))
            }
            // Subjective energy / stress.
            today.energy?.let { add(Factor("energy", it * 10.0, 0.10, if (it <= 3) "Low energy" else null)) }
            today.stress?.let {
                val s = ((10 - it) * 10.0).coerceIn(0.0, 100.0)
                add(Factor("stress", s, 0.05, if (it >= 7) "High stress" else null))
            }
            // Training-stress balance (form).
            if (tsb != null) {
                val score = (70 + tsb).coerceIn(0.0, 100.0)
                val driver = when {
                    tsb <= -20 -> "High fatigue (TSB ${tsb.roundToInt()})"
                    tsb >= 10 -> "Fresh form (TSB +${tsb.roundToInt()})"
                    else -> null
                }
                add(Factor("tsb", score, 0.10, driver))
            }
        }

        if (factors.isEmpty()) return Readiness(score = 50, drivers = listOf("No recovery data yet"))

        val totalWeight = factors.sumOf { it.weight }
        val weighted = factors.sumOf { it.score * it.weight } / totalWeight
        val score = weighted.roundToInt().coerceIn(0, 100)

        // Surface up to 3 most-impactful drivers (lowest sub-scores first).
        val drivers = factors
            .filter { it.driver != null }
            .sortedBy { it.score }
            .take(3)
            .mapNotNull { it.driver }
            .ifEmpty { listOf("All markers within normal range") }

        return Readiness(score = score, drivers = drivers)
    }
}
