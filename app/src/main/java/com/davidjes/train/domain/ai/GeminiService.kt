package com.davidjes.train.domain.ai

import com.davidjes.train.domain.model.Readiness
import com.davidjes.train.domain.model.TrainingLoadState

/**
 * Grounding context handed to the assistant for every reply. Kept small and
 * quantitative so both the rule-based fallback and a future on-device Gemini Nano
 * prompt speak in the same clinical voice.
 */
data class AiContext(
    val readiness: Readiness?,
    val load: TrainingLoadState?,
    val hrvToday: Double?,
    val hrvBaseline: Double?,
    val restingHr: Int?,
    val restingHrBaseline: Double?,
    val sleepHours: Double?,
    val daysUntilRace: Int?,
    val recentHardDays: Int,
)

/**
 * On-device AI surface. The default binding is [com.davidjes.train.data.ai.RuleBasedGeminiService]
 * (deterministic, always available). A real Gemini Nano backend (Google AI Edge /
 * AICore `GenerativeModel`, or ML Kit GenAI) can replace it by implementing this
 * interface and swapping the Hilt binding — no screen changes required.
 */
interface GeminiService {
    /** True when a genuine on-device generative model is available (vs. the fallback). */
    suspend fun isOnDevice(): Boolean

    /** Answer a free-form question, grounded in [context]. */
    suspend fun reply(question: String, context: AiContext): String
}
