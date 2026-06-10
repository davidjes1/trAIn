package com.davidjes.train.data.repository

import com.davidjes.train.data.local.MealDao
import com.davidjes.train.data.local.MealEntity
import com.davidjes.train.domain.model.Meal
import com.davidjes.train.domain.model.NutritionDay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NutritionRepository @Inject constructor(
    private val mealDao: MealDao,
) {
    // TODO: make targets user-configurable (Profile / Goals). Defaults for now.
    data class Targets(val kcal: Int = 2400, val proteinG: Int = 160, val carbsG: Int = 260, val fatG: Int = 75)

    fun day(date: LocalDate, targets: Targets = Targets()): Flow<NutritionDay> =
        mealDao.observeDay(date.toEpochDay()).map { meals ->
            NutritionDay(
                date = date,
                targetKcal = targets.kcal,
                targetProteinG = targets.proteinG,
                targetCarbsG = targets.carbsG,
                targetFatG = targets.fatG,
                meals = meals.map { it.toDomain() },
            )
        }

    suspend fun addMeal(date: LocalDate, name: String, kcal: Int, protein: Int, carbs: Int, fat: Int) {
        mealDao.upsert(
            MealEntity(
                id = UUID.randomUUID().toString(),
                epochDay = date.toEpochDay(),
                name = name,
                kcal = kcal, proteinG = protein, carbsG = carbs, fatG = fat,
                loggedAtMillis = Instant.now().toEpochMilli(),
            ),
        )
    }

    private fun MealEntity.toDomain() = Meal(
        id = id, name = name, kcal = kcal, proteinG = proteinG, carbsG = carbsG, fatG = fatG,
        loggedAt = Instant.ofEpochMilli(loggedAtMillis),
    )
}
