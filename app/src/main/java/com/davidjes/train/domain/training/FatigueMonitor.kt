package com.davidjes.train.domain.training

import com.davidjes.train.domain.model.RecoveryMetrics
import kotlin.math.roundToInt

/**
 * Overtraining / fatigue detection. Flags the multi-metric warnings described in
 * the handoff (TSB very negative, HRV in bottom 20%, resting HR elevated, low body
 * battery streak, high subjective fatigue).
 */
object FatigueMonitor {

    enum class Severity { INFO, CAUTION, FLAG }

    data class Warning(val severity: Severity, val message: String)

    fun assess(
        today: RecoveryMetrics,
        recentHrv: List<Double>,        // last ~14 days, ascending by date
        restingHrBaseline: Double?,
        recentBodyBattery: List<Int>,   // last few days
        tsb: Double?,
    ): List<Warning> {
        val out = ArrayList<Warning>()

        tsb?.let {
            when {
                it <= -30 -> out += Warning(Severity.FLAG, "Extreme fatigue (TSB ${it.roundToInt()}). High injury/illness risk — prioritize recovery.")
                it <= -20 -> out += Warning(Severity.CAUTION, "Accumulated fatigue (TSB ${it.roundToInt()}). Consider an easier day.")
            }
        }

        if (today.hrvMs != null && recentHrv.size >= 5) {
            val sorted = recentHrv.sorted()
            val p20 = sorted[(sorted.size * 0.2).toInt().coerceIn(0, sorted.lastIndex)]
            if (today.hrvMs <= p20) {
                out += Warning(Severity.CAUTION, "HRV in the lowest 20% of recent values — autonomic recovery is suppressed.")
            }
        }

        if (today.restingHr != null && restingHrBaseline != null && today.restingHr - restingHrBaseline >= 5) {
            out += Warning(Severity.CAUTION, "Resting HR is ${(today.restingHr - restingHrBaseline).roundToInt()} bpm above baseline — a common early fatigue/illness sign.")
        }

        if (recentBodyBattery.size >= 2 && recentBodyBattery.takeLast(2).all { it < 30 }) {
            out += Warning(Severity.CAUTION, "Body battery has stayed below 30 for multiple days.")
        }

        if ((today.stress ?: 0) >= 8 || (today.energy != null && today.energy <= 2)) {
            out += Warning(Severity.INFO, "Subjective markers report high fatigue today.")
        }

        return out
    }
}
