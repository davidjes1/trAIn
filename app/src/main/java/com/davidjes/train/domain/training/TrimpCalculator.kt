package com.davidjes.train.domain.training

import com.davidjes.train.domain.model.Sex
import kotlin.math.exp

/**
 * Banister TRIMP (Training Impulse).
 *
 *   HRratio = (HR - restingHR) / (maxHR - restingHR)
 *   Male:   TRIMP = minutes × HRratio × e^(1.92 × HRratio)
 *   Female: TRIMP = minutes × HRratio × e^(1.67 × HRratio)
 *
 * Reference: Banister (1991). When no HR is available, falls back to a
 * duration-only estimate at a moderate intensity (0.65 HRratio).
 */
object TrimpCalculator {

    fun trimp(
        durationMinutes: Double,
        avgHr: Int?,
        sex: Sex,
        restingHr: Int,
        maxHr: Int,
    ): Double {
        if (durationMinutes <= 0) return 0.0
        val hrRatio = when {
            avgHr != null && maxHr > restingHr ->
                ((avgHr - restingHr).toDouble() / (maxHr - restingHr)).coerceIn(0.0, 1.0)
            else -> 0.65 // moderate fallback
        }
        val k = if (sex == Sex.FEMALE) 1.67 else 1.92
        return durationMinutes * hrRatio * exp(k * hrRatio)
    }
}
