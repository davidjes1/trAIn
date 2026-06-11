package com.davidjes.train.data.repository

import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.metadata.Metadata
import com.davidjes.train.data.health.HealthConnectManager
import com.davidjes.train.data.health.HealthDataMapper
import com.davidjes.train.data.prefs.ProfileRepository
import com.davidjes.train.domain.model.Sport
import com.davidjes.train.domain.model.UserProfile
import com.davidjes.train.domain.model.Workout
import com.davidjes.train.domain.model.WorkoutSource
import com.davidjes.train.domain.model.WorkoutSummary
import com.davidjes.train.domain.training.TrimpCalculator
import com.davidjes.train.domain.training.WorkoutMatcher
import com.davidjes.train.domain.training.ZoneCalculator
import kotlinx.coroutines.flow.first
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Workouts come from Health Connect (source of truth). This repo reads exercise
 * sessions plus the overlapping HR/distance/calorie streams and produces analyzed
 * [Workout]s (avg/max HR, zone distribution, TRIMP training load).
 */
@Singleton
class WorkoutRepository @Inject constructor(
    private val hc: HealthConnectManager,
    private val profileRepository: ProfileRepository,
) {
    suspend fun workoutsBetween(start: Instant, end: Instant): List<Workout> {
        val profile = profileRepository.profile.first()
        val sessions = hc.readExerciseSessions(start, end)
        if (sessions.isEmpty()) return emptyList()

        val hrRecords = hc.readHeartRate(start, end)
        val distRecords = hc.readDistance(start, end)
        val calRecords = hc.readActiveCalories(start, end)

        return sessions.map { s -> mapSession(s, hrRecords, distRecords, calRecords, profile) }
            .sortedByDescending { it.start }
    }

    private fun mapSession(
        s: androidx.health.connect.client.records.ExerciseSessionRecord,
        hrRecords: List<androidx.health.connect.client.records.HeartRateRecord>,
        distRecords: List<androidx.health.connect.client.records.DistanceRecord>,
        calRecords: List<androidx.health.connect.client.records.ActiveCaloriesBurnedRecord>,
        profile: UserProfile,
    ): Workout {
        val sport = HealthDataMapper.sportFor(s.exerciseType)
        val startSec = s.startTime.epochSecond
        val endSec = s.endTime.epochSecond
        val durationSec = (endSec - startSec).coerceAtLeast(0)

        val samples = HealthDataMapper.hrSamplesInWindow(hrRecords, startSec, endSec)
        val avgHr = samples.takeIf { it.isNotEmpty() }?.map { it.second }?.average()?.toInt()
        val maxHr = samples.maxOfOrNull { it.second }
        val zones = ZoneCalculator.distribution(samples, profile)

        val distance = distRecords
            .filter { it.startTime.epochSecond in startSec..endSec }
            .sumOf { it.distance.inMeters }
            .takeIf { it > 0 }

        val activeKcal = calRecords
            .filter { it.startTime.epochSecond in startSec..endSec }
            .sumOf { it.energy.inKilocalories }
            .takeIf { it > 0 }

        val trimp = TrimpCalculator.trimp(
            durationMinutes = durationSec / 60.0,
            avgHr = avgHr,
            sex = profile.sex,
            restingHr = profile.restingHr,
            maxHr = profile.maxHr,
        )

        val id = s.metadata.id
        return Workout(
            id = id,
            healthConnectId = id,
            sport = sport,
            title = s.title ?: HealthDataMapper.defaultTitle(sport),
            start = s.startTime,
            end = s.endTime,
            durationSeconds = durationSec,
            distanceMeters = distance,
            avgHr = avgHr,
            maxHr = maxHr,
            activeKcal = activeKcal,
            avgSpeedMps = distance?.let { if (durationSec > 0) it / durationSec else null },
            zones = zones,
            trainingLoad = trimp,
            source = WorkoutSource.HEALTH_CONNECT,
            dataOrigin = s.metadata.dataOrigin.packageName,
            notes = s.notes,
        )
    }

    /** This app's package name — distinguishes our manual records from device ones. */
    val ownPackage: String get() = hc.ownPackage

    /** Sum of TRIMP per calendar day — feeds [com.davidjes.train.domain.training.TrainingLoadCalculator]. */
    suspend fun dailyLoad(start: Instant, end: Instant): Map<LocalDate, Double> {
        val zone = ZoneId.systemDefault()
        return workoutsBetween(start, end)
            .groupBy { it.start.atZone(zone).toLocalDate() }
            .mapValues { (_, list) -> list.sumOf { it.trainingLoad } }
    }

    suspend fun workout(id: String, lookbackDays: Long = 120): Workout? {
        val end = Instant.now()
        val start = end.minusSeconds(lookbackDays * 86_400)
        return workoutsBetween(start, end).firstOrNull { it.id == id }
    }

    /**
     * Log a completed manual workout by writing an [ExerciseSessionRecord] to Health
     * Connect (the source of truth). Returns true on success.
     *
     * Note: Metadata construction varies by connect-client version. On 1.1.0-alpha10
     * the `Metadata()` constructor is used; newer versions replace it with factories
     * like `Metadata.manualEntry()`. Adjust here if the dependency is bumped.
     */
    suspend fun logCompletedWorkout(
        sport: Sport,
        durationMin: Int,
        title: String? = null,
        notes: String? = null,
        end: Instant = Instant.now(),
    ): Boolean {
        val zone = ZoneId.systemDefault()
        val start = end.minusSeconds(durationMin.coerceAtLeast(1) * 60L)
        val offset = zone.rules.getOffset(start)
        val record = ExerciseSessionRecord(
            startTime = start,
            startZoneOffset = offset,
            endTime = end,
            endZoneOffset = offset,
            exerciseType = HealthDataMapper.exerciseTypeFor(sport),
            title = title ?: HealthDataMapper.defaultTitle(sport),
            notes = notes,
            metadata = Metadata(),
        )
        return hc.insert(listOf(record))
    }

    /** Delete a trAIn-written workout from Health Connect (no-op for device records). */
    suspend fun deleteWorkout(id: String): Boolean = hc.deleteExerciseSession(id)

    /**
     * Complete-plan-first logging: if a device already recorded a matching session
     * in the window, return it (caller links the plan, no write). Otherwise null.
     */
    suspend fun findDeviceMatch(start: Instant, end: Instant, sport: Sport, lookbackDays: Long = 2): Workout? {
        val from = start.minusSeconds(lookbackDays * 86_400)
        val to = end.plusSeconds(lookbackDays * 86_400)
        return WorkoutMatcher.findDeviceMatch(start, end, sport, workoutsBetween(from, to), hc.ownPackage)
    }

    /** Manual (trAIn-written) records that overlap a device recording, over [days]. */
    suspend fun findConflicts(days: Long = 30): List<WorkoutMatcher.Conflict> {
        val end = Instant.now()
        val start = end.minusSeconds(days * 86_400)
        return WorkoutMatcher.findConflicts(workoutsBetween(start, end), hc.ownPackage)
    }

    /** Downsampled HR-over-time series for a workout's activity chart (~[buckets] points). */
    suspend fun hrSeries(start: Instant, end: Instant, buckets: Int = 60): List<Float> {
        val samples = hc.readHeartRate(start, end)
            .flatMap { it.samples }
            .map { it.time.epochSecond to it.beatsPerMinute.toInt() }
            .sortedBy { it.first }
        if (samples.size < 2) return emptyList()
        val startSec = samples.first().first
        val span = (samples.last().first - startSec).coerceAtLeast(1)
        val bins = Array(buckets) { mutableListOf<Int>() }
        samples.forEach { (t, hr) ->
            val idx = (((t - startSec).toDouble() / span) * (buckets - 1)).toInt().coerceIn(0, buckets - 1)
            bins[idx].add(hr)
        }
        val out = ArrayList<Float>(buckets)
        var last = samples.first().second.toFloat()
        bins.forEach { b -> if (b.isNotEmpty()) last = b.average().toFloat(); out.add(last) }
        return out
    }

    /** Summaries used by the recommender / fatigue engine. */
    suspend fun recentSummaries(days: Long = 14): List<WorkoutSummary> {
        val end = Instant.now()
        val start = end.minusSeconds(days * 86_400)
        return workoutsBetween(start, end)
            .sortedBy { it.start }
            .map {
                WorkoutSummary(
                    date = it.date,
                    sport = it.sport,
                    durationMinutes = (it.durationSeconds / 60).toInt(),
                    // Map TRIMP onto a rough 0..100 fatigue scale (TRIMP ~150 ≈ very hard).
                    fatigue = (it.trainingLoad / 1.5).coerceIn(0.0, 100.0),
                )
            }
    }
}
