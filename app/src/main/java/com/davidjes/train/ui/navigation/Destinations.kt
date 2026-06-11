package com.davidjes.train.ui.navigation

import androidx.compose.ui.graphics.vector.ImageVector
import com.davidjes.train.ui.components.TrainIcons

/** Top-level bottom-nav destinations: Today · Insights · Plan · Body · You. */
enum class TopDest(val route: String, val label: String, val icon: ImageVector) {
    TODAY("today", "Today", TrainIcons.today),
    INSIGHTS("insights", "Insights", TrainIcons.insights),
    PLAN("plan", "Plan", TrainIcons.plan),
    BODY("body", "Body", TrainIcons.body),
    YOU("you", "You", TrainIcons.you);

    companion object {
        fun fromRoute(route: String?): TopDest? = entries.firstOrNull { it.route == route }
        val routes: Set<String> = entries.map { it.route }.toSet()
    }
}

/** Pushed (detail) routes — no bottom bar. */
object Routes {
    const val ONBOARDING = "onboarding"
    const val NUTRITION = "nutrition"

    const val WORKOUT_ARG_ID = "workoutId"
    const val WORKOUT = "workout/{$WORKOUT_ARG_ID}"
    fun workout(id: String) = "workout/$id"
}
