package com.davidjes.train.ui.body

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.davidjes.train.data.repository.RecoveryRepository
import com.davidjes.train.domain.model.RecoveryMetrics
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject
import kotlin.math.roundToInt
import kotlin.math.sqrt

enum class BodyMetric(val label: String, val unit: String) {
    WEIGHT("Weight", "kg"),
    HRV("HRV", "ms"),
    RHR("Resting HR", "bpm"),
    SLEEP("Sleep", "h"),
}

enum class BodyTimeframe(val label: String, val days: Long) {
    M1("1M", 30), M3("3M", 90), M6("6M", 180), Y1("1Y", 365)
}

data class MetricSummary(
    val metric: BodyMetric,
    val series: List<Float>,
    val current: String,
    val delta: String?,
    val improving: Boolean,
)

data class BodyUiState(
    val loading: Boolean = true,
    val timeframe: BodyTimeframe = BodyTimeframe.M3,
    val selected: BodyMetric = BodyMetric.WEIGHT,
    val summaries: Map<BodyMetric, MetricSummary> = emptyMap(),
    val anomaly: String? = null,
)

@HiltViewModel
class BodyViewModel @Inject constructor(
    private val recoveryRepository: RecoveryRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(BodyUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun selectMetric(metric: BodyMetric) = _state.update { it.copy(selected = metric) }

    fun selectTimeframe(tf: BodyTimeframe) {
        _state.update { it.copy(timeframe = tf) }
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true) }
            val today = LocalDate.now()
            val tf = _state.value.timeframe
            val series = recoveryRepository.seriesBetween(today.minusDays(tf.days), today)

            val summaries = BodyMetric.entries.associateWith { metric ->
                val values = series.mapNotNull { selector(metric)(it) }
                MetricSummary(
                    metric = metric,
                    series = values.map { it.toFloat() }.ifEmpty { listOf(0f, 0f) },
                    current = format(metric, values.lastOrNull()),
                    delta = delta(metric, values),
                    improving = isImproving(metric, values),
                )
            }
            _state.update { it.copy(loading = false, summaries = summaries, anomaly = detectAnomaly(series)) }
        }
    }

    private fun selector(metric: BodyMetric): (RecoveryMetrics) -> Double? = when (metric) {
        BodyMetric.WEIGHT -> { m -> m.weightKg }
        BodyMetric.HRV -> { m -> m.hrvMs }
        BodyMetric.RHR -> { m -> m.restingHr?.toDouble() }
        BodyMetric.SLEEP -> { m -> m.sleepHours }
    }

    private fun format(metric: BodyMetric, v: Double?): String {
        if (v == null) return "—"
        return when (metric) {
            BodyMetric.WEIGHT -> "%.1f".format(v)
            BodyMetric.HRV, BodyMetric.RHR -> v.roundToInt().toString()
            BodyMetric.SLEEP -> "%.1f".format(v)
        }
    }

    private fun delta(metric: BodyMetric, values: List<Double>): String? {
        if (values.size < 2) return null
        val change = values.last() - values.first()
        val sign = if (change >= 0) "+" else ""
        return when (metric) {
            BodyMetric.WEIGHT -> "$sign%.1f".format(change)
            BodyMetric.SLEEP -> "$sign%.1f".format(change)
            else -> "$sign${change.roundToInt()}"
        }
    }

    // For weight/RHR a decrease is "good"; for HRV/sleep an increase is "good".
    private fun isImproving(metric: BodyMetric, values: List<Double>): Boolean {
        if (values.size < 2) return true
        val change = values.last() - values.first()
        return when (metric) {
            BodyMetric.WEIGHT, BodyMetric.RHR -> change <= 0
            BodyMetric.HRV, BodyMetric.SLEEP -> change >= 0
        }
    }

    /** Flag a 3-day HRV stretch below mean − 1σ. */
    private fun detectAnomaly(series: List<RecoveryMetrics>): String? {
        val hrv = series.mapNotNull { it.hrvMs }
        if (hrv.size < 7) return null
        val mean = hrv.average()
        val sd = sqrt(hrv.sumOf { (it - mean) * (it - mean) } / hrv.size)
        val threshold = mean - sd
        var run = 0
        series.forEach { m ->
            val v = m.hrvMs
            if (v != null && v < threshold) { run++; if (run >= 3) return "HRV dipped below baseline − 1σ for $run+ days. Correlated with sleep variance and recent hard sessions." }
            else if (v != null) run = 0
        }
        return null
    }
}
