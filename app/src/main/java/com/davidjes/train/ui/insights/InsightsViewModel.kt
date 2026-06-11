package com.davidjes.train.ui.insights

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.davidjes.train.data.local.ChatDao
import com.davidjes.train.data.local.ChatMessageEntity
import com.davidjes.train.data.prefs.ProfileRepository
import com.davidjes.train.data.repository.PlanRepository
import com.davidjes.train.data.repository.RecoveryRepository
import com.davidjes.train.data.repository.WorkoutRepository
import com.davidjes.train.domain.ai.AiContext
import com.davidjes.train.domain.ai.GeminiService
import com.davidjes.train.domain.ai.InsightsEngine
import com.davidjes.train.domain.model.ChatMessage
import com.davidjes.train.domain.model.ChatRole
import com.davidjes.train.domain.model.Insight
import com.davidjes.train.domain.training.ReadinessCalculator
import com.davidjes.train.domain.training.TrainingLoadCalculator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject

data class InsightsUiState(
    val loading: Boolean = true,
    val onDevice: Boolean = false,
    val preparing: Boolean = false,
    val insights: List<Insight> = emptyList(),
    val messages: List<ChatMessage> = emptyList(),
    val sending: Boolean = false,
    /** Live cumulative text of the in-flight Gemini reply (null when idle). */
    val streamingText: String? = null,
    val suggestedPrompts: List<String> = listOf(
        "Should I race Saturday?",
        "Why is my HRV down this week?",
        "Plan the next 2 weeks toward my goal",
        "What if I skip Friday?",
    ),
)

@HiltViewModel
class InsightsViewModel @Inject constructor(
    private val workoutRepository: WorkoutRepository,
    private val recoveryRepository: RecoveryRepository,
    private val planRepository: PlanRepository,
    private val profileRepository: ProfileRepository,
    private val gemini: GeminiService,
    private val chatDao: ChatDao,
) : ViewModel() {

    private val _state = MutableStateFlow(InsightsUiState())
    val state = _state.asStateFlow()

    private var sendJob: Job? = null

    init {
        chatDao.observeAll()
            .map { list -> list.map { ChatMessage(it.id, ChatRole.valueOf(it.role), it.text, Instant.ofEpochMilli(it.createdAtMillis)) } }
            .onEach { msgs -> _state.update { it.copy(messages = msgs) } }
            .launchIn(viewModelScope)

        viewModelScope.launch {
            // First access prepares the on-device model (may download) — show it.
            _state.update { it.copy(preparing = true) }
            val onDevice = gemini.isOnDevice()
            _state.update { it.copy(onDevice = onDevice, preparing = false) }
            refreshInsights()
        }
    }

    private suspend fun refreshInsights() {
        val now = Instant.now()
        val today = LocalDate.now()
        val workouts = workoutRepository.workoutsBetween(now.minusSeconds(28L * 86_400), now)
        val recovery = recoveryRepository.seriesBetween(today.minusDays(27), today)
        val dailyLoad = workoutRepository.dailyLoad(now.minusSeconds(112L * 86_400), now)
        val loadSeries = TrainingLoadCalculator.series(dailyLoad, from = today.minusDays(41), to = today)
        val insights = InsightsEngine.generate(now, workouts, recovery, loadSeries)
        _state.update { it.copy(loading = false, insights = insights) }
    }

    fun send(text: String) {
        val prompt = text.trim()
        if (prompt.isEmpty() || _state.value.sending) return
        sendJob = viewModelScope.launch {
            chatDao.insert(ChatMessageEntity(UUID.randomUUID().toString(), ChatRole.USER.name, prompt, Instant.now().toEpochMilli()))
            _state.update { it.copy(sending = true, streamingText = "") }
            var finalText = ""
            try {
                val context = buildContext()
                gemini.replyStream(prompt, context).collect { cumulative ->
                    finalText = cumulative
                    _state.update { it.copy(streamingText = cumulative) }
                }
                if (finalText.isBlank()) finalText = "I couldn't generate a response. Try rephrasing."
            } finally {
                // Persist whatever we have (incl. partial text if the user hit Stop).
                if (finalText.isNotBlank()) {
                    withContext(NonCancellable) {
                        chatDao.insert(ChatMessageEntity(UUID.randomUUID().toString(), ChatRole.GEMINI.name, finalText, Instant.now().toEpochMilli()))
                    }
                }
                _state.update { it.copy(sending = false, streamingText = null) }
            }
        }
    }

    /** Cancel an in-flight generation; any text streamed so far is kept. */
    fun stop() {
        sendJob?.cancel()
    }

    private suspend fun buildContext(): AiContext {
        val today = LocalDate.now()
        val now = Instant.now()
        val metrics = recoveryRepository.metricsForDay(today)
        val baselines = recoveryRepository.baselines(today)
        val dailyLoad = workoutRepository.dailyLoad(now.minusSeconds(112L * 86_400), now)
        val load = TrainingLoadCalculator.current(dailyLoad, today)
        val readiness = ReadinessCalculator.compute(metrics, baselines.hrv, baselines.restingHr, load?.tsb)
        val summaries = workoutRepository.recentSummaries(7)
        val eventDay = planRepository.activePlan().first()?.eventEpochDay
        return AiContext(
            readiness = readiness,
            load = load,
            hrvToday = metrics.hrvMs,
            hrvBaseline = baselines.hrv,
            restingHr = metrics.restingHr,
            restingHrBaseline = baselines.restingHr,
            sleepHours = metrics.sleepHours,
            daysUntilRace = eventDay?.let { (it - today.toEpochDay()).toInt() },
            recentHardDays = summaries.count { it.fatigue >= 60 },
        )
    }
}
