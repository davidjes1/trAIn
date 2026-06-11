package com.davidjes.train.domain.training

import com.davidjes.train.domain.model.Sport
import com.davidjes.train.domain.model.Workout
import java.time.Duration
import java.time.Instant
import kotlin.math.abs

/**
 * Reconciles overlapping workouts. The same session can land in Health Connect
 * twice — once from a device app (Garmin) and once from trAIn's manual log — and
 * Health Connect does not de-duplicate across apps. This decides what counts as
 * "the same workout".
 */
object WorkoutMatcher {

    /** A trAIn-written record that overlaps a device-written one. */
    data class Conflict(val ours: Workout, val device: Workout)

    private const val START_TOLERANCE_MIN = 20L

    private fun family(sport: Sport): Sport = when (sport) {
        Sport.BRICK, Sport.RIDE -> Sport.RIDE
        Sport.MOBILITY -> Sport.MOBILITY
        else -> sport
    }

    fun sportFamilyMatches(a: Sport, b: Sport): Boolean =
        a == Sport.OTHER || b == Sport.OTHER || family(a) == family(b)

    /** True if two sessions are plausibly the same: time overlap or near-coincident start. */
    fun isSameSession(a: Workout, b: Workout): Boolean {
        if (!sportFamilyMatches(a.sport, b.sport)) return false
        val intervalsOverlap = a.start.isBefore(b.end) && b.start.isBefore(a.end)
        val startsClose = abs(Duration.between(a.start, b.start).toMinutes()) <= START_TOLERANCE_MIN
        return intervalsOverlap || startsClose
    }

    /**
     * Find an existing **device** session (not written by [ownPackage]) that matches
     * the given window+sport — used at log time to avoid writing a duplicate.
     * Returns the richest, closest-starting match if several qualify.
     */
    fun findDeviceMatch(
        start: Instant,
        end: Instant,
        sport: Sport,
        candidates: List<Workout>,
        ownPackage: String,
    ): Workout? {
        val probe = Workout(
            id = "", sport = sport, title = "", start = start, end = end,
            durationSeconds = Duration.between(start, end).seconds,
        )
        return candidates
            .filter { !it.isOwn(ownPackage) && isSameSession(it, probe) }
            .minByOrNull { abs(Duration.between(it.start, start).seconds) }
    }

    /**
     * Pair each trAIn-written record with an overlapping device record. Each device
     * record is consumed once so we don't report it against multiple manual entries.
     */
    fun findConflicts(workouts: List<Workout>, ownPackage: String): List<Conflict> {
        val ours = workouts.filter { it.isOwn(ownPackage) }
        val device = workouts.filter { !it.isOwn(ownPackage) }.toMutableList()
        val conflicts = ArrayList<Conflict>()
        for (mine in ours) {
            val match = device.firstOrNull { isSameSession(mine, it) } ?: continue
            conflicts += Conflict(ours = mine, device = match)
            device.remove(match)
        }
        return conflicts
    }
}
