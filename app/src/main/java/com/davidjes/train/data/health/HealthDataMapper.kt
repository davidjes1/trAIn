package com.davidjes.train.data.health

import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import com.davidjes.train.domain.model.Sport

/** Maps Health Connect record types to trAIn domain concepts. */
object HealthDataMapper {

    fun sportFor(exerciseType: Int): Sport = when (exerciseType) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL,
        -> Sport.RUN

        ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY,
        -> Sport.RIDE

        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL,
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER,
        -> Sport.SWIM

        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
        ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING,
        -> Sport.STRENGTH

        ExerciseSessionRecord.EXERCISE_TYPE_YOGA,
        ExerciseSessionRecord.EXERCISE_TYPE_STRETCHING,
        ExerciseSessionRecord.EXERCISE_TYPE_PILATES,
        -> Sport.MOBILITY

        else -> Sport.OTHER
    }

    /** Reverse of [sportFor] — pick a Health Connect exercise type for manual logging. */
    fun exerciseTypeFor(sport: Sport): Int = when (sport) {
        Sport.RUN -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
        Sport.RIDE, Sport.BRICK -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING
        Sport.SWIM -> ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL
        Sport.STRENGTH -> ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING
        Sport.MOBILITY -> ExerciseSessionRecord.EXERCISE_TYPE_YOGA
        else -> ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT
    }

    fun defaultTitle(sport: Sport): String = when (sport) {
        Sport.RUN -> "Run"
        Sport.RIDE -> "Ride"
        Sport.SWIM -> "Swim"
        Sport.STRENGTH -> "Strength"
        Sport.MOBILITY -> "Mobility"
        Sport.BRICK -> "Brick"
        Sport.REST -> "Rest"
        Sport.OTHER -> "Workout"
    }

    /** Flatten HR records into (epochSecond, bpm) samples within [startSec, endSec]. */
    fun hrSamplesInWindow(
        records: List<HeartRateRecord>,
        startSec: Long,
        endSec: Long,
    ): List<Pair<Long, Int>> = records
        .flatMap { it.samples }
        .map { it.time.epochSecond to it.beatsPerMinute.toInt() }
        .filter { it.first in startSec..endSec }
        .sortedBy { it.first }
}
