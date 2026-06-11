package com.davidjes.train.data.ai

import android.content.Context
import com.davidjes.train.domain.ai.AiContext
import com.davidjes.train.domain.ai.GeminiService
import com.google.ai.edge.aicore.GenerativeModel
import com.google.ai.edge.aicore.generationConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.roundToInt

/**
 * On-device Gemini Nano via the Google AI Edge **AICore** SDK. Requires a supported
 * device (e.g. Pixel 8/9, some Galaxy S24+) with AICore + the Gemini Nano feature
 * downloaded. Every method degrades to [RuleBasedGeminiService] if the model is
 * unavailable or a call fails — so behavior is always defined.
 *
 * NOTE (experimental API — verify these on-device, they move between aicore versions):
 *   1. `generationConfig { context = ...; temperature; topK; maxOutputTokens }`
 *   2. `model.prepareInferenceEngine()`  — suspend; throws if unsupported
 *   3. `model.generateContent(prompt).text` — suspend; nullable text
 * If a symbol differs, adjust here only; the rest of the app is decoupled via [GeminiService].
 */
@Singleton
class AiCoreGeminiService @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val fallback: RuleBasedGeminiService,
) : GeminiService {

    private val model: GenerativeModel by lazy {
        val ctx = appContext
        GenerativeModel(
            generationConfig = generationConfig {
                context = ctx
                temperature = 0.2f
                topK = 16
                maxOutputTokens = 256
            },
        )
    }

    private val prepareLock = Mutex()
    @Volatile private var available: Boolean? = null

    override suspend fun isOnDevice(): Boolean {
        available?.let { return it }
        return prepareLock.withLock {
            available ?: runCatching {
                model.prepareInferenceEngine()
                true
            }.getOrDefault(false).also { available = it }
        }
    }

    override suspend fun reply(question: String, context: AiContext): String {
        if (!isOnDevice()) return fallback.reply(question, context)
        return runCatching {
            val text = model.generateContent(buildPrompt(question, context)).text
            text?.trim()?.takeIf { it.isNotEmpty() } ?: fallback.reply(question, context)
        }.getOrElse { fallback.reply(question, context) }
    }

    /**
     * Streams the cumulative answer. `generateContentStream` emits incremental
     * chunks (deltas); we accumulate and emit the running text. Falls back to a
     * single emission on unavailability/error.
     *
     * VERIFY on-device: `model.generateContentStream(prompt)` returns a Flow of
     * GenerateContentResponse whose `.text` is the delta.
     */
    override fun replyStream(question: String, context: AiContext): Flow<String> = flow {
        if (!isOnDevice()) {
            emit(fallback.reply(question, context))
            return@flow
        }
        val accumulated = StringBuilder()
        val ok = runCatching {
            model.generateContentStream(buildPrompt(question, context)).collect { response ->
                response.text?.let { delta ->
                    accumulated.append(delta)
                    emit(accumulated.toString())
                }
            }
        }.isSuccess
        if (!ok || accumulated.isBlank()) {
            emit(fallback.reply(question, context))
        }
    }

    /** Grounds the model in the athlete's current numbers and pins the clinical voice. */
    private fun buildPrompt(question: String, c: AiContext): String = buildString {
        appendLine("You are trAIn's training assistant. Answer in a clinical, terse, quantitative voice.")
        appendLine("No hype, no emoji. 2–4 sentences. Cite the athlete's numbers when relevant.")
        appendLine()
        appendLine("Athlete data (today):")
        c.readiness?.let { appendLine("- Readiness ${it.score}/100 (${it.level}); drivers: ${it.drivers.joinToString("; ")}") }
        c.load?.let { appendLine("- Load: CTL ${it.ctl.roundToInt()}, ATL ${it.atl.roundToInt()}, TSB ${it.tsb.roundToInt()} (${it.form})") }
        if (c.hrvToday != null && c.hrvBaseline != null) appendLine("- HRV ${c.hrvToday.roundToInt()}ms vs baseline ${c.hrvBaseline.roundToInt()}ms")
        if (c.restingHr != null) appendLine("- Resting HR ${c.restingHr} bpm" + (c.restingHrBaseline?.let { " (baseline ${it.roundToInt()})" } ?: ""))
        c.sleepHours?.let { appendLine("- Sleep last night ${"%.1f".format(it)}h") }
        c.daysUntilRace?.let { appendLine("- Days until next race: $it") }
        appendLine("- Hard sessions in last 7 days: ${c.recentHardDays}")
        appendLine()
        append("Question: ")
        appendLine(question)
    }
}
