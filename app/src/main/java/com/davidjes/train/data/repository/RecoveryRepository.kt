package com.davidjes.train.data.repository

import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Mass
import com.davidjes.train.data.health.HealthConnectManager
import com.davidjes.train.data.local.SubjectiveDao
import com.davidjes.train.data.local.SubjectiveEntity
import com.davidjes.train.domain.model.RecoveryMetrics
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Recovery metrics = Health Connect markers (HRV, resting HR, sleep, weight)
 * merged with the app's subjective check-in + body battery (Room). Also exposes
 * the rolling baselines the readiness/fatigue engines need.
 */
@Singleton
class RecoveryRepository @Inject constructor(
    private val hc: HealthConnectManager,
    private val subjectiveDao: SubjectiveDao,
) {
    private val zone: ZoneId get() = ZoneId.systemDefault()
    private fun Instant.day(): LocalDate = atZone(zone).toLocalDate()
    private fun LocalDate.startInstant(): Instant = atStartOfDay(zone).toInstant()
    private fun LocalDate.endInstant(): Instant = plusDays(1).atStartOfDay(zone).toInstant()

    suspend fun metricsForDay(date: LocalDate): RecoveryMetrics =
        seriesBetween(date, date).firstOrNull() ?: RecoveryMetrics(date = date)

    suspend fun seriesBetween(from: LocalDate, to: LocalDate): List<RecoveryMetrics> {
        val start = from.startInstant()
        val end = to.endInstant()

        val hrvByDay = hc.readHrv(start, end)
            .groupBy { it.time.day() }
            .mapValues { (_, v) -> v.map { it.heartRateVariabilityMillis }.average() }

        val rhrByDay = hc.readRestingHeartRate(start, end)
            .groupBy { it.time.day() }
            .mapValues { (_, v) -> v.map { it.beatsPerMinute }.average().toInt() }

        val sleepByDay = hc.readSleep(start, end)
            .groupBy { it.endTime.day() } // attribute to wake day
            .mapValues { (_, v) -> v.sumOf { Duration.between(it.startTime, it.endTime).toMinutes() } / 60.0 }

        val weightByDay = hc.readWeight(start, end)
            .groupBy { it.time.day() }
            .mapValues { (_, v) -> v.last().weight.inKilograms }

        val subjective = subjectiveDao.between(from.toEpochDay(), to.toEpochDay())
            .associateBy { LocalDate.ofEpochDay(it.epochDay) }

        val days = generateSequence(from) { d -> d.plusDays(1).takeIf { !it.isAfter(to) } }.toList()
        return days.map { d ->
            val subj = subjective[d]
            RecoveryMetrics(
                date = d,
                hrvMs = hrvByDay[d],
                restingHr = rhrByDay[d],
                bodyBattery = subj?.bodyBattery,
                sleepHours = sleepByDay[d],
                sleepScore = subj?.sleepScore,
                mood = subj?.mood,
                energy = subj?.energy,
                stress = subj?.stress,
                weightKg = weightByDay[d],
            )
        }
    }

    data class Baselines(val hrv: Double?, val restingHr: Double?)

    /** 28-day rolling means (excluding [today] itself) used as readiness baselines. */
    suspend fun baselines(today: LocalDate, windowDays: Long = 28): Baselines {
        val series = seriesBetween(today.minusDays(windowDays), today.minusDays(1))
        val hrv = series.mapNotNull { it.hrvMs }.takeIf { it.isNotEmpty() }?.average()
        val rhr = series.mapNotNull { it.restingHr }.takeIf { it.isNotEmpty() }?.map { it.toDouble() }?.average()
        return Baselines(hrv, rhr)
    }

    /** Write a body-weight measurement to Health Connect (source of truth). */
    suspend fun logWeight(kg: Double): Boolean {
        val now = Instant.now()
        val record = WeightRecord(
            time = now,
            zoneOffset = zone.rules.getOffset(now),
            weight = Mass.kilograms(kg),
            metadata = Metadata(),
        )
        return hc.insert(listOf(record))
    }

    suspend fun saveCheckIn(
        date: LocalDate,
        mood: Int? = null,
        energy: Int? = null,
        stress: Int? = null,
        bodyBattery: Int? = null,
        sleepScore: Int? = null,
    ) {
        subjectiveDao.upsert(
            SubjectiveEntity(
                epochDay = date.toEpochDay(),
                mood = mood, energy = energy, stress = stress,
                bodyBattery = bodyBattery, sleepScore = sleepScore,
            ),
        )
    }
}
