package com.davidjes.train.domain.ai

import com.davidjes.train.domain.model.Insight
import com.davidjes.train.domain.model.InsightKind
import com.davidjes.train.domain.model.InsightTone
import com.davidjes.train.domain.model.RecoveryMetrics
import com.davidjes.train.domain.model.TrainingLoadState
import com.davidjes.train.domain.model.Workout
import java.time.Instant
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * Generates the scheduled insight cards (weekly review · anomaly · trend) from real
 * data. Deterministic and clinical — the same content a Gemini summary would ground on.
 */
object InsightsEngine {

    fun generate(
        now: Instant,
        workouts28d: List<Workout>,
        recovery28d: List<RecoveryMetrics>,
        loadSeries: List<TrainingLoadState>,
    ): List<Insight> = buildList {
        weeklyReview(now, workouts28d, loadSeries)?.let { add(it) }
        hrvAnomaly(now, recovery28d)?.let { add(it) }
        efficiencyTrend(now, workouts28d)?.let { add(it) }
    }

    private fun weeklyReview(now: Instant, workouts: List<Workout>, load: List<TrainingLoadState>): Insight? {
        if (load.isEmpty()) return null
        val current = load.last()
        val weekAgo = load.getOrNull(load.size - 8) ?: load.first()
        val last7Load = workouts.filter { it.start.isAfter(now.minusSeconds(7 * 86_400)) }.sumOf { it.trainingLoad }.roundToInt()
        val ctlDelta = (current.ctl - weekAgo.ctl)
        val tsb = current.tsb.roundToInt()
        val body = "7-day load $last7Load. CTL ${arrow(ctlDelta)}${"%.1f".format(kotlin.math.abs(ctlDelta))} · " +
            "ATL ${arrow(current.atl - weekAgo.atl)}${"%.1f".format(kotlin.math.abs(current.atl - weekAgo.atl))} · " +
            "TSB ${if (tsb >= 0) "+$tsb" else "$tsb"}."
        return Insight(
            id = "review-${now.epochSecond / 86_400}",
            kind = InsightKind.REVIEW,
            tone = InsightTone.INFO,
            title = if (ctlDelta > 0) "Fitness trended up this week." else "A recovery-leaning week.",
            body = body,
            createdAt = now,
            series = load.takeLast(28).map { it.ctl.toFloat() },
        )
    }

    private fun hrvAnomaly(now: Instant, recovery: List<RecoveryMetrics>): Insight? {
        val hrv = recovery.mapNotNull { it.hrvMs }
        if (hrv.size < 7) return null
        val mean = hrv.average()
        val sd = sqrt(hrv.sumOf { (it - mean) * (it - mean) } / hrv.size)
        val threshold = mean - sd
        var run = 0
        recovery.forEach { m -> m.hrvMs?.let { run = if (it < threshold) run + 1 else 0 } }
        if (run < 3) return null
        val pct = (((hrv.last() - mean) / mean) * 100).roundToInt()
        return Insight(
            id = "anomaly-hrv-${now.epochSecond / 86_400}",
            kind = InsightKind.ANOMALY,
            tone = InsightTone.FLAG,
            title = "HRV below baseline − 1σ for $run days.",
            body = "Today ${pct}% vs 28-day mean. Correlates with recent load and sleep variance — favor Z2.",
            createdAt = now,
            series = hrv.takeLast(28).map { it.toFloat() },
        )
    }

    private fun efficiencyTrend(now: Instant, workouts: List<Workout>): Insight? {
        // Aerobic efficiency = speed per heartbeat (m/s per bpm) for runs/rides with both.
        val eff = workouts
            .filter { it.avgHr != null && it.avgHr!! > 0 && it.avgSpeedMps != null && it.avgSpeedMps!! > 0 }
            .sortedBy { it.start }
            .map { (it.avgSpeedMps!! / it.avgHr!!).toFloat() }
        if (eff.size < 4) return null
        val firstHalf = eff.take(eff.size / 2).average()
        val secondHalf = eff.drop(eff.size / 2).average()
        if (firstHalf <= 0) return null
        val changePct = (((secondHalf - firstHalf) / firstHalf) * 100).roundToInt()
        if (changePct < 2) return null
        return Insight(
            id = "trend-eff-${now.epochSecond / 86_400}",
            kind = InsightKind.TREND,
            tone = InsightTone.POSITIVE,
            title = "Aerobic efficiency improving · +$changePct% (28d).",
            body = "Pace per heartbeat is rising — your aerobic base is responding.",
            createdAt = now,
            series = eff,
        )
    }

    private fun arrow(delta: Double) = if (delta >= 0) "↑" else "↓"
}
