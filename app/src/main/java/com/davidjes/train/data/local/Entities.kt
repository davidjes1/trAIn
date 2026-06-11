package com.davidjes.train.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * App-specific data that Health Connect does not model. Health data (HR, HRV,
 * sleep, weight, workouts) is NOT duplicated here — it stays in Health Connect.
 * Dates are stored as epochDay (LocalDate.toEpochDay()); instants as epoch millis.
 */

/** Subjective daily check-in + body battery (no Health Connect equivalent). */
@Entity(tableName = "subjective")
data class SubjectiveEntity(
    @PrimaryKey val epochDay: Long,
    val mood: Int? = null,
    val energy: Int? = null,
    val stress: Int? = null,
    val bodyBattery: Int? = null,
    val sleepScore: Int? = null,
)

@Entity(tableName = "habits")
data class HabitEntity(
    @PrimaryKey val id: String,
    val label: String,
    val iconKey: String,
    val orderIndex: Int,
)

@Entity(tableName = "habit_logs", primaryKeys = ["habitId", "epochDay"])
data class HabitLogEntity(
    val habitId: String,
    val epochDay: Long,
)

@Entity(tableName = "meals", indices = [Index("epochDay")])
data class MealEntity(
    @PrimaryKey val id: String,
    val epochDay: Long,
    val name: String,
    val kcal: Int,
    val proteinG: Int,
    val carbsG: Int,
    val fatG: Int,
    val loggedAtMillis: Long,
)

@Entity(tableName = "plans")
data class PlanEntity(
    @PrimaryKey val id: String,
    val name: String,
    val startEpochDay: Long,
    val eventEpochDay: Long?,
    val active: Boolean,
)

@Entity(tableName = "planned_workouts", indices = [Index("planId"), Index("epochDay")])
data class PlannedWorkoutEntity(
    @PrimaryKey val id: String,
    val planId: String,
    val epochDay: Long,
    val type: String,         // WorkoutType.name
    val description: String,
    val durationMin: Int,
    val expectedFatigue: Double,
    val completed: Boolean,
    val completedWorkoutId: String?,
)

@Entity(tableName = "insights", indices = [Index("createdAtMillis")])
data class InsightEntity(
    @PrimaryKey val id: String,
    val kind: String,   // InsightKind.name
    val tone: String,   // InsightTone.name
    val title: String,
    val body: String,
    val createdAtMillis: Long,
    val seriesCsv: String, // comma-separated floats
)

@Entity(tableName = "chat_messages", indices = [Index("createdAtMillis")])
data class ChatMessageEntity(
    @PrimaryKey val id: String,
    val role: String,   // ChatRole.name
    val text: String,
    val createdAtMillis: Long,
)
