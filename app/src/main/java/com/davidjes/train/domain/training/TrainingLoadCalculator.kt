package com.davidjes.train.domain.training

import com.davidjes.train.domain.model.TrainingLoadState
import java.time.LocalDate
import kotlin.math.exp

/**
 * Computes the CTL/ATL/TSB time series from a daily training-load map using the
 * standard exponentially-weighted moving averages (Coggan):
 *
 *   CTL_today = CTL_yesterday + (load_today - CTL_yesterday) × (1 - e^(-1/τ)),  τ = 42 days
 *   ATL_today = ATL_yesterday + (load_today - ATL_yesterday) × (1 - e^(-1/τ)),  τ = 7  days
 *   TSB_today = CTL_yesterday - ATL_yesterday  (form is "yesterday's" balance)
 *
 * Here CTL uses a 42-day time constant (≈ the common default) and ATL 7 days.
 * Missing days count as zero load.
 */
object TrainingLoadCalculator {

    private const val CTL_TAU = 42.0
    private const val ATL_TAU = 7.0
    private val CTL_ALPHA = 1 - exp(-1.0 / CTL_TAU)
    private val ATL_ALPHA = 1 - exp(-1.0 / ATL_TAU)

    /**
     * @param dailyLoad map of date -> summed training load (TRIMP) for that day.
     * @param from first date to emit (series is seeded from the earliest load).
     * @param to last date to emit (inclusive). Defaults to the latest load date.
     */
    fun series(
        dailyLoad: Map<LocalDate, Double>,
        from: LocalDate? = null,
        to: LocalDate? = null,
    ): List<TrainingLoadState> {
        if (dailyLoad.isEmpty()) return emptyList()
        val first = dailyLoad.keys.min()
        val last = to ?: dailyLoad.keys.max()
        val start = from ?: first
        if (last.isBefore(start)) return emptyList()

        var ctl = 0.0
        var atl = 0.0
        val out = ArrayList<TrainingLoadState>()
        var day = first
        while (!day.isAfter(last)) {
            val load = dailyLoad[day] ?: 0.0
            ctl += (load - ctl) * CTL_ALPHA
            atl += (load - atl) * ATL_ALPHA
            if (!day.isBefore(start)) {
                out += TrainingLoadState(date = day, ctl = ctl, atl = atl)
            }
            day = day.plusDays(1)
        }
        return out
    }

    /** Convenience: today's state (or null if no data). */
    fun current(dailyLoad: Map<LocalDate, Double>, today: LocalDate): TrainingLoadState? =
        series(dailyLoad, to = today).lastOrNull()
}
