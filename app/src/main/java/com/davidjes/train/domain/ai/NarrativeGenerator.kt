package com.davidjes.train.domain.ai

import com.davidjes.train.domain.model.Readiness
import com.davidjes.train.domain.model.TrainingLoadState
import com.davidjes.train.domain.model.WorkoutRecommendation
import kotlin.math.roundToInt

/**
 * Deterministic, clinical-voice narrative ("HRV is down 12%; consider Z2."). This
 * is the on-device fallback used whenever Gemini Nano is unavailable, and the
 * grounding context handed to Gemini when it is. Voice: terse, quantitative, no
 * hype, no emoji.
 */
object NarrativeGenerator {

    fun todayNarrative(
        readiness: Readiness,
        load: TrainingLoadState?,
        recommendation: WorkoutRecommendation,
    ): String {
        val sb = StringBuilder()

        sb.append(
            when (readiness.level) {
                Readiness.Level.VERY_READY -> "Readiness ${readiness.score}/100 — well recovered. "
                Readiness.Level.READY -> "Readiness ${readiness.score}/100 — cleared to train. "
                Readiness.Level.CAUTION -> "Readiness ${readiness.score}/100 — recovery is incomplete. "
                Readiness.Level.RECOVER -> "Readiness ${readiness.score}/100 — recovery takes priority today. "
            },
        )

        readiness.drivers.firstOrNull()?.let { sb.append("$it. ") }

        load?.let {
            val tsb = it.tsb.roundToInt()
            when (it.form) {
                TrainingLoadState.Form.PEAK -> sb.append("Form is peaked (TSB +$tsb); you can absorb intensity. ")
                TrainingLoadState.Form.FRESH -> sb.append("Form is fresh (TSB +$tsb). ")
                TrainingLoadState.Form.NEUTRAL -> sb.append("Form is balanced (TSB $tsb). ")
                TrainingLoadState.Form.FATIGUED -> sb.append("Carrying fatigue (TSB $tsb); keep intensity controlled. ")
                TrainingLoadState.Form.OVERREACHED -> sb.append("Overreached (TSB $tsb); avoid hard efforts. ")
            }
        }

        sb.append("Suggested: ${recommendation.title.lowercase()}. ${recommendation.rationale}")
        return sb.toString().trim()
    }
}
