package com.davidjes.train.data.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.PowerRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.SpeedRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Thin wrapper over the Health Connect SDK — the app's source of truth for health
 * data. Exposes availability, the permission set, and typed reads. Higher-level
 * mapping/analysis lives in the repositories.
 */
@Singleton
class HealthConnectManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    val providerPackage = "com.google.android.apps.healthdata"

    /** This app's package — used to tell our own (manual) records from device ones. */
    val ownPackage: String get() = context.packageName

    enum class Availability { INSTALLED, UPDATE_REQUIRED, NOT_SUPPORTED }

    fun availability(): Availability = when (HealthConnectClient.getSdkStatus(context, providerPackage)) {
        HealthConnectClient.SDK_AVAILABLE -> Availability.INSTALLED
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> Availability.UPDATE_REQUIRED
        else -> Availability.NOT_SUPPORTED
    }

    private val clientOrNull: HealthConnectClient?
        get() = runCatching { HealthConnectClient.getOrCreate(context) }.getOrNull()

    /** Permissions trAIn requests. Mirrors the manifest declarations. */
    val permissions: Set<String> = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(SpeedRecord::class),
        HealthPermission.getReadPermission(PowerRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getReadPermission(NutritionRecord::class),
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getWritePermission(WeightRecord::class),
        HealthPermission.getWritePermission(NutritionRecord::class),
    )

    suspend fun hasAllPermissions(): Boolean {
        val client = clientOrNull ?: return false
        return client.permissionController.getGrantedPermissions().containsAll(permissions)
    }

    suspend fun hasWritePermission(permission: String): Boolean {
        val client = clientOrNull ?: return false
        return client.permissionController.getGrantedPermissions().contains(permission)
    }

    // ─── Writes ─────────────────────────────────────────────────────────────

    /** Insert records into Health Connect. Returns true on success. */
    suspend fun insert(records: List<androidx.health.connect.client.records.Record>): Boolean {
        val client = clientOrNull ?: return false
        return runCatching { client.insertRecords(records) }.isSuccess
    }

    /**
     * Delete an exercise session we wrote, by record id. Health Connect only allows
     * deleting records owned by this app — deleting another app's record fails (caught).
     */
    suspend fun deleteExerciseSession(recordId: String): Boolean {
        val client = clientOrNull ?: return false
        return runCatching {
            client.deleteRecords(
                androidx.health.connect.client.records.ExerciseSessionRecord::class,
                recordIdsList = listOf(recordId),
                clientRecordIdsList = emptyList(),
            )
        }.isSuccess
    }

    // ─── Reads ────────────────────────────────────────────────────────────────

    suspend fun readExerciseSessions(start: Instant, end: Instant): List<ExerciseSessionRecord> =
        read(ExerciseSessionRecord::class, start, end)

    suspend fun readHeartRate(start: Instant, end: Instant): List<HeartRateRecord> =
        read(HeartRateRecord::class, start, end)

    suspend fun readHrv(start: Instant, end: Instant): List<HeartRateVariabilityRmssdRecord> =
        read(HeartRateVariabilityRmssdRecord::class, start, end)

    suspend fun readRestingHeartRate(start: Instant, end: Instant): List<RestingHeartRateRecord> =
        read(RestingHeartRateRecord::class, start, end)

    suspend fun readSleep(start: Instant, end: Instant): List<SleepSessionRecord> =
        read(SleepSessionRecord::class, start, end)

    suspend fun readWeight(start: Instant, end: Instant): List<WeightRecord> =
        read(WeightRecord::class, start, end)

    suspend fun readSteps(start: Instant, end: Instant): List<StepsRecord> =
        read(StepsRecord::class, start, end)

    suspend fun readActiveCalories(start: Instant, end: Instant): List<ActiveCaloriesBurnedRecord> =
        read(ActiveCaloriesBurnedRecord::class, start, end)

    suspend fun readTotalCalories(start: Instant, end: Instant): List<TotalCaloriesBurnedRecord> =
        read(TotalCaloriesBurnedRecord::class, start, end)

    suspend fun readDistance(start: Instant, end: Instant): List<DistanceRecord> =
        read(DistanceRecord::class, start, end)

    suspend fun readNutrition(start: Instant, end: Instant): List<NutritionRecord> =
        read(NutritionRecord::class, start, end)

    private suspend fun <T : androidx.health.connect.client.records.Record> read(
        type: kotlin.reflect.KClass<T>,
        start: Instant,
        end: Instant,
    ): List<T> {
        val client = clientOrNull ?: return emptyList()
        return runCatching {
            client.readRecords(
                ReadRecordsRequest(
                    recordType = type,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                ),
            ).records
        }.getOrDefault(emptyList())
    }
}
