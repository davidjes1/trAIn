package com.davidjes.train.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface SubjectiveDao {
    @Upsert suspend fun upsert(entity: SubjectiveEntity)

    @Query("SELECT * FROM subjective WHERE epochDay = :epochDay")
    fun observe(epochDay: Long): Flow<SubjectiveEntity?>

    @Query("SELECT * FROM subjective WHERE epochDay BETWEEN :from AND :to ORDER BY epochDay")
    suspend fun between(from: Long, to: Long): List<SubjectiveEntity>
}

@Dao
interface HabitDao {
    @Query("SELECT * FROM habits ORDER BY orderIndex")
    fun observeHabits(): Flow<List<HabitEntity>>

    @Upsert suspend fun upsertHabit(habit: HabitEntity)

    @Query("DELETE FROM habits WHERE id = :id")
    suspend fun deleteHabit(id: String)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun log(log: HabitLogEntity)

    @Query("DELETE FROM habit_logs WHERE habitId = :habitId AND epochDay = :epochDay")
    suspend fun unlog(habitId: String, epochDay: Long)

    @Query("SELECT habitId FROM habit_logs WHERE epochDay = :epochDay")
    fun observeLogsForDay(epochDay: Long): Flow<List<String>>

    @Query("SELECT epochDay FROM habit_logs WHERE habitId = :habitId ORDER BY epochDay DESC")
    suspend fun logDays(habitId: String): List<Long>
}

@Dao
interface MealDao {
    @Query("SELECT * FROM meals WHERE epochDay = :epochDay ORDER BY loggedAtMillis")
    fun observeDay(epochDay: Long): Flow<List<MealEntity>>

    @Upsert suspend fun upsert(meal: MealEntity)

    @Delete suspend fun delete(meal: MealEntity)
}

@Dao
interface PlanDao {
    @Query("SELECT * FROM plans WHERE active = 1 LIMIT 1")
    fun observeActivePlan(): Flow<PlanEntity?>

    @Upsert suspend fun upsertPlan(plan: PlanEntity)

    @Query("UPDATE plans SET active = 0")
    suspend fun deactivateAll()

    @Upsert suspend fun upsertWorkouts(workouts: List<PlannedWorkoutEntity>)

    @Query("DELETE FROM planned_workouts WHERE planId = :planId")
    suspend fun deleteWorkouts(planId: String)

    @Query("SELECT * FROM planned_workouts WHERE epochDay BETWEEN :from AND :to ORDER BY epochDay")
    fun observeBetween(from: Long, to: Long): Flow<List<PlannedWorkoutEntity>>

    @Query("SELECT * FROM planned_workouts WHERE epochDay = :epochDay ORDER BY durationMin DESC")
    fun observeDay(epochDay: Long): Flow<List<PlannedWorkoutEntity>>

    @Query("UPDATE planned_workouts SET completed = :completed, completedWorkoutId = :workoutId WHERE id = :id")
    suspend fun setCompleted(id: String, completed: Boolean, workoutId: String?)
}

@Dao
interface InsightDao {
    @Query("SELECT * FROM insights ORDER BY createdAtMillis DESC LIMIT :limit")
    fun observeRecent(limit: Int = 20): Flow<List<InsightEntity>>

    @Upsert suspend fun upsert(insight: InsightEntity)

    @Query("DELETE FROM insights WHERE createdAtMillis < :beforeMillis")
    suspend fun prune(beforeMillis: Long)
}

@Dao
interface ChatDao {
    @Query("SELECT * FROM chat_messages ORDER BY createdAtMillis")
    fun observeAll(): Flow<List<ChatMessageEntity>>

    @Insert suspend fun insert(message: ChatMessageEntity)

    @Query("DELETE FROM chat_messages")
    suspend fun clear()
}
