package com.davidjes.train.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        SubjectiveEntity::class,
        HabitEntity::class,
        HabitLogEntity::class,
        MealEntity::class,
        PlanEntity::class,
        PlannedWorkoutEntity::class,
        InsightEntity::class,
        ChatMessageEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class TrainDatabase : RoomDatabase() {
    abstract fun subjectiveDao(): SubjectiveDao
    abstract fun habitDao(): HabitDao
    abstract fun mealDao(): MealDao
    abstract fun planDao(): PlanDao
    abstract fun insightDao(): InsightDao
    abstract fun chatDao(): ChatDao
}
