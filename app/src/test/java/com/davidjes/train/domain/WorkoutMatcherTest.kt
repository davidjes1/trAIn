package com.davidjes.train.domain

import com.davidjes.train.domain.model.Sport
import com.davidjes.train.domain.model.Workout
import com.davidjes.train.domain.training.WorkoutMatcher
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class WorkoutMatcherTest {

    private val own = "com.davidjes.train"
    private val garmin = "com.garmin.android.apps.connectmobile"
    private val base = Instant.parse("2026-06-11T07:00:00Z")

    private fun w(
        id: String, sport: Sport, startOffsetMin: Long, durationMin: Long, origin: String,
    ) = Workout(
        id = id, sport = sport, title = id,
        start = base.plusSeconds(startOffsetMin * 60),
        end = base.plusSeconds((startOffsetMin + durationMin) * 60),
        durationSeconds = durationMin * 60,
        dataOrigin = origin,
    )

    @Test
    fun overlappingSameSport_isSameSession() {
        val mine = w("mine", Sport.RIDE, 0, 60, own)
        val device = w("garmin", Sport.RIDE, 3, 58, garmin)
        assertTrue(WorkoutMatcher.isSameSession(mine, device))
    }

    @Test
    fun differentSport_isNotSameSession() {
        val ride = w("ride", Sport.RIDE, 0, 60, own)
        val run = w("run", Sport.RUN, 0, 60, garmin)
        assertFalse(WorkoutMatcher.isSameSession(ride, run))
    }

    @Test
    fun farApart_isNotSameSession() {
        val morning = w("am", Sport.RUN, 0, 40, own)
        val evening = w("pm", Sport.RUN, 600, 40, garmin) // 10h later
        assertFalse(WorkoutMatcher.isSameSession(morning, evening))
    }

    @Test
    fun brickMatchesRideFamily() {
        val brick = w("brick", Sport.BRICK, 0, 60, own)
        val ride = w("ride", Sport.RIDE, 5, 55, garmin)
        assertTrue(WorkoutMatcher.isSameSession(brick, ride))
    }

    @Test
    fun findConflicts_pairsManualWithDevice() {
        val workouts = listOf(
            w("mine", Sport.RIDE, 0, 60, own),
            w("garmin", Sport.RIDE, 2, 59, garmin),
            w("unrelated", Sport.RUN, 600, 40, garmin),
        )
        val conflicts = WorkoutMatcher.findConflicts(workouts, own)
        assertEquals(1, conflicts.size)
        assertEquals("mine", conflicts.first().ours.id)
        assertEquals("garmin", conflicts.first().device.id)
    }

    @Test
    fun findDeviceMatch_returnsDeviceSessionInWindow() {
        val candidates = listOf(w("garmin", Sport.RUN, 1, 45, garmin))
        val match = WorkoutMatcher.findDeviceMatch(
            start = base.plusSeconds(0),
            end = base.plusSeconds(45 * 60),
            sport = Sport.RUN,
            candidates = candidates,
            ownPackage = own,
        )
        assertNotNull(match)
        assertEquals("garmin", match!!.id)
    }

    @Test
    fun findDeviceMatch_ignoresOwnRecords() {
        val candidates = listOf(w("mine", Sport.RUN, 0, 45, own))
        val match = WorkoutMatcher.findDeviceMatch(
            start = base, end = base.plusSeconds(45 * 60), sport = Sport.RUN,
            candidates = candidates, ownPackage = own,
        )
        assertNull(match)
    }
}
