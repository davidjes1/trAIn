package com.davidjes.train.domain.training

import com.davidjes.train.domain.model.UserProfile
import com.davidjes.train.domain.model.ZoneDistribution

/**
 * Bins per-sample HR into the 5 training zones using HR-reserve (Karvonen):
 *   reserveFrac = (hr - restingHr) / (maxHr - restingHr)
 */
object ZoneCalculator {

    /** Which zone (0..4) does a single HR sample fall in for this profile? */
    fun zoneIndexForHr(hr: Int, profile: UserProfile): Int {
        val denom = (profile.maxHr - profile.restingHr).coerceAtLeast(1)
        val frac = ((hr - profile.restingHr).toDouble() / denom).coerceIn(0.0, 1.0)
        val idx = profile.zones.indexOfLast { frac >= it.minFrac }
        return idx.coerceIn(0, profile.zones.lastIndex)
    }

    /**
     * Accumulate seconds-in-zone from a list of (epochSecond, hr) samples.
     * Each sample is credited the gap until the next sample (last sample: [tailSeconds]).
     */
    fun distribution(
        samples: List<Pair<Long, Int>>,
        profile: UserProfile,
        tailSeconds: Long = 1,
    ): ZoneDistribution {
        if (samples.isEmpty()) return ZoneDistribution()
        val acc = LongArray(5)
        val sorted = samples.sortedBy { it.first }
        for (i in sorted.indices) {
            val (t, hr) = sorted[i]
            val dt = if (i < sorted.lastIndex) (sorted[i + 1].first - t).coerceAtLeast(0) else tailSeconds
            acc[zoneIndexForHr(hr, profile)] += dt
        }
        return ZoneDistribution(acc[0], acc[1], acc[2], acc[3], acc[4])
    }
}
