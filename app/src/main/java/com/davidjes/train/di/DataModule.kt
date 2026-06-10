package com.davidjes.train.di

import android.content.Context
import androidx.room.Room
import com.davidjes.train.data.local.ChatDao
import com.davidjes.train.data.local.HabitDao
import com.davidjes.train.data.local.InsightDao
import com.davidjes.train.data.local.MealDao
import com.davidjes.train.data.local.PlanDao
import com.davidjes.train.data.local.SubjectiveDao
import com.davidjes.train.data.local.TrainDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): TrainDatabase =
        Room.databaseBuilder(context, TrainDatabase::class.java, "train.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun subjectiveDao(db: TrainDatabase): SubjectiveDao = db.subjectiveDao()
    @Provides fun habitDao(db: TrainDatabase): HabitDao = db.habitDao()
    @Provides fun mealDao(db: TrainDatabase): MealDao = db.mealDao()
    @Provides fun planDao(db: TrainDatabase): PlanDao = db.planDao()
    @Provides fun insightDao(db: TrainDatabase): InsightDao = db.insightDao()
    @Provides fun chatDao(db: TrainDatabase): ChatDao = db.chatDao()
}
