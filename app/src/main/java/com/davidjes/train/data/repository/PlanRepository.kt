package com.davidjes.train.data.repository

import com.davidjes.train.data.local.PlanDao
import com.davidjes.train.data.local.PlanEntity
import com.davidjes.train.data.local.PlannedWorkoutEntity
import com.davidjes.train.domain.model.MacroPlan
import com.davidjes.train.domain.model.PlannedWorkout
import com.davidjes.train.domain.model.Sport
import com.davidjes.train.domain.model.WorkoutType
import com.davidjes.train.domain.training.PlanGenerator
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlanRepository @Inject constructor(
    private val planDao: PlanDao,
) {
    fun plannedBetween(from: LocalDate, to: LocalDate): Flow<List<PlannedWorkout>> =
        planDao.observeBetween(from.toEpochDay(), to.toEpochDay()).map { list -> list.map { it.toDomain() } }

    fun plannedForDay(date: LocalDate): Flow<List<PlannedWorkout>> =
        planDao.observeDay(date.toEpochDay()).map { list -> list.map { it.toDomain() } }

    fun activePlan(): Flow<PlanEntity?> = planDao.observeActivePlan()

    /** Generate a plan from a macro definition and make it the active plan. */
    suspend fun generateAndActivate(macro: MacroPlan) {
        planDao.deactivateAll()
        planDao.upsertPlan(
            PlanEntity(
                id = macro.id,
                name = macro.name,
                startEpochDay = macro.startDate.toEpochDay(),
                eventEpochDay = macro.eventDate?.toEpochDay(),
                active = true,
            ),
        )
        planDao.deleteWorkouts(macro.id)
        val workouts = PlanGenerator.generate(macro).map { pw ->
            PlannedWorkoutEntity(
                id = UUID.randomUUID().toString(),
                planId = macro.id,
                epochDay = pw.date.toEpochDay(),
                type = pw.type.name,
                description = pw.description,
                durationMin = pw.durationMin,
                expectedFatigue = pw.expectedFatigue,
                completed = false,
                completedWorkoutId = null,
            )
        }
        planDao.upsertWorkouts(workouts)
    }

    suspend fun markCompleted(plannedId: String, completed: Boolean, workoutId: String?) =
        planDao.setCompleted(plannedId, completed, workoutId)

    private fun PlannedWorkoutEntity.toDomain(): PlannedWorkout {
        val type = runCatching { WorkoutType.valueOf(type) }.getOrDefault(WorkoutType.REST)
        return PlannedWorkout(
            date = LocalDate.ofEpochDay(epochDay),
            type = type,
            sport = type.sport.takeIf { it != Sport.OTHER } ?: type.sport,
            description = description,
            durationMin = durationMin,
            expectedFatigue = expectedFatigue,
            completed = completed,
            completedWorkoutId = completedWorkoutId,
        )
    }
}
