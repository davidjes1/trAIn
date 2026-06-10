package com.davidjes.train.data.ai

import com.davidjes.train.domain.ai.AiContext
import com.davidjes.train.domain.ai.GeminiService
import com.davidjes.train.domain.model.Readiness
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.roundToInt

/**
 * Deterministic, clinical-voice assistant used when on-device Gemini Nano is
 * unavailable. Intent-matches the question and answers from the grounding
 * [AiContext]. No data leaves the device; replies are reproducible.
 */
@Singleton
class RuleBasedGeminiService @Inject constructor() : GeminiService {

    override suspend fun isOnDevice(): Boolean = false

    override suspend fun reply(question: String, context: AiContext): String {
        val q = question.lowercase()
        return when {
            q.containsAny("race", "should i race", "ready") -> raceAnswer(context)
            q.containsAny("hrv", "heart rate variability") -> hrvAnswer(context)
            q.containsAny("skip", "rest", "day off") -> skipAnswer(context)
            q.containsAny("plan", "next week", "next 2 weeks", "build") -> planAnswer(context)
            q.containsAny("why", "tired", "fatigue", "sore") -> fatigueAnswer(context)
            q.containsAny("sleep") -> sleepAnswer(context)
            else -> generalAnswer(context)
        }
    }

    private fun raceAnswer(c: AiContext): String {
        val tsb = c.load?.tsb?.roundToInt()
        val verdict = when {
            tsb == null -> "Insufficient load history to project form."
            tsb >= 5 -> "Probable yes — form is fresh"
            tsb >= -5 -> "Likely fine — form is balanced"
            else -> "Hold off if avoidable — you're carrying fatigue"
        }
        val tsbText = tsb?.let { " (TSB ${if (it >= 0) "+$it" else "$it"})." } ?: "."
        val caveats = buildList {
            if (c.sleepHours != null && c.sleepHours < 7) add("sleep is short (${"%.1f".format(c.sleepHours)}h)")
            hrvDeltaPct(c)?.let { if (it <= -8) add("HRV is ${-it}% below baseline") }
            c.restingHr?.let { rhr -> c.restingHrBaseline?.let { b -> if (rhr - b >= 3) add("resting HR is up ${(rhr - b).roundToInt()} bpm") } }
        }
        return buildString {
            append("$verdict$tsbText")
            if (caveats.isNotEmpty()) append(" Caveats: ${caveats.joinToString("; ")}.")
        }
    }

    private fun hvrNote(c: AiContext): String? = hrvDeltaPct(c)?.let { pct ->
        when {
            pct <= -8 -> "HRV is $pct% below your baseline."
            pct >= 8 -> "HRV is +$pct% above baseline — well recovered."
            else -> "HRV is within normal range."
        }
    }

    private fun hrvAnswer(c: AiContext): String {
        val note = hvrNote(c) ?: "No HRV reading available yet today."
        val advice = if ((hrvDeltaPct(c) ?: 0) <= -8) " Favor Z2 and protect sleep until it recovers." else " Training as planned is reasonable."
        return note + advice
    }

    private fun skipAnswer(c: AiContext): String {
        val tsb = c.load?.tsb?.roundToInt()
        return when {
            c.readiness?.level == Readiness.Level.RECOVER -> "Skipping is sensible — readiness is low${c.readiness.drivers.firstOrNull()?.let { " ($it)" } ?: ""}. A rest or mobility day will help you absorb recent load."
            tsb != null && tsb < -20 -> "A rest day is justified — TSB is $tsb. You'll likely return stronger within 24–48h."
            else -> "You have headroom to train, but one easy/rest day this week won't hurt fitness and may sharpen form."
        }
    }

    private fun planAnswer(c: AiContext): String {
        val ctl = c.load?.ctl?.roundToInt()
        return buildString {
            append("Hold aerobic volume and add one quality session every 3–4 days. ")
            if (ctl != null) append("CTL is ~$ctl; aim to raise it 3–5/week, no more. ")
            append("Keep hard days ≤2/week and insert a recovery day after each. Taper volume ~40% in the final week before a key race.")
        }
    }

    private fun fatigueAnswer(c: AiContext): String {
        val reasons = buildList {
            c.load?.let { if (it.tsb < -10) add("TSB is ${it.tsb.roundToInt()} (acute load above chronic)") }
            hrvDeltaPct(c)?.let { if (it <= -8) add("HRV down $it%") }
            c.restingHr?.let { rhr -> c.restingHrBaseline?.let { b -> if (rhr - b >= 3) add("resting HR up ${(rhr - b).roundToInt()} bpm") } }
            if (c.sleepHours != null && c.sleepHours < 7) add("short sleep")
            if (c.recentHardDays >= 2) add("${c.recentHardDays} hard sessions recently")
        }
        return if (reasons.isEmpty()) "Markers look normal — fatigue may be situational. Keep today aerobic and reassess tomorrow."
        else "Likely drivers: ${reasons.joinToString("; ")}. Prioritize an easy day and sleep."
    }

    private fun sleepAnswer(c: AiContext): String =
        c.sleepHours?.let { "Last night: ${"%.1f".format(it)}h. ${if (it < 7) "Below target — aim for 7.5–9h to support HRV and adaptation." else "On target."}" }
            ?: "No sleep data recorded for last night."

    private fun generalAnswer(c: AiContext): String {
        val r = c.readiness
        return if (r != null) "Readiness ${r.score}/100${r.drivers.firstOrNull()?.let { " — $it" } ?: ""}. Ask about your race, HRV, sleep, or the week ahead."
        else "I don't have enough data yet. Connect Health Connect and log a check-in, then ask about readiness, HRV, or your plan."
    }

    private fun hrvDeltaPct(c: AiContext): Int? =
        if (c.hrvToday != null && c.hrvBaseline != null && c.hrvBaseline > 0)
            (((c.hrvToday - c.hrvBaseline) / c.hrvBaseline) * 100).roundToInt() else null

    private fun String.containsAny(vararg terms: String) = terms.any { this.contains(it) }
}
