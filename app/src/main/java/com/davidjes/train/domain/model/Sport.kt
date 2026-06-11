package com.davidjes.train.domain.model

/**
 * Sport identity. Colors are theme-independent (see [com.davidjes.train.ui.theme.TrainColors]).
 */
enum class Sport(val label: String) {
    RUN("Run"),
    RIDE("Ride"),
    STRENGTH("Strength"),
    SWIM("Swim"),
    REST("Rest"),
    BRICK("Brick"),
    MOBILITY("Mobility"),
    OTHER("Other");

    companion object {
        /** Map a Health Connect ExerciseSessionRecord type or free text to a [Sport]. */
        fun fromKey(key: String?): Sport = when (key?.lowercase()?.trim()) {
            "run", "running", "trail_running", "treadmill" -> RUN
            "ride", "bike", "biking", "cycling", "biking_stationary" -> RIDE
            "strength", "strength_training", "weightlifting", "gym" -> STRENGTH
            "swim", "swimming", "swimming_pool", "swimming_open_water" -> SWIM
            "brick" -> BRICK
            "mobility", "yoga", "stretching", "pilates" -> MOBILITY
            "rest" -> REST
            else -> OTHER
        }
    }
}
