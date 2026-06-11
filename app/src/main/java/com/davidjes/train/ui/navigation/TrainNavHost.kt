package com.davidjes.train.ui.navigation

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.davidjes.train.ui.body.BodyScreen
import com.davidjes.train.ui.insights.InsightsScreen
import com.davidjes.train.ui.nutrition.NutritionScreen
import com.davidjes.train.ui.onboarding.OnboardingScreen
import com.davidjes.train.ui.plan.PlanScreen
import com.davidjes.train.ui.profile.ProfileScreen
import com.davidjes.train.ui.today.TodayScreen
import com.davidjes.train.ui.workout.WorkoutScreen

@Composable
fun TrainNavHost(
    navController: NavHostController,
    startDestination: String,
    onNavigate: (TopDest) -> Unit,
    modifier: Modifier = Modifier,
) {
    val openWorkout: (String) -> Unit = { navController.navigate(Routes.workout(it)) }
    val openNutrition: () -> Unit = { navController.navigate(Routes.NUTRITION) }
    val back: () -> Unit = { navController.popBackStack() }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
        enterTransition = { fadeIn(tween(180)) + scaleIn(tween(180), initialScale = 0.98f) },
        exitTransition = { fadeOut(tween(120)) },
    ) {
        topLevel(onNavigate, openWorkout, openNutrition)

        composable(Routes.ONBOARDING) {
            OnboardingScreen(onFinished = {
                navController.navigate(TopDest.TODAY.route) {
                    popUpTo(Routes.ONBOARDING) { inclusive = true }
                }
            })
        }
        composable(Routes.NUTRITION) {
            NutritionScreen(onBack = back)
        }
        composable(
            route = Routes.WORKOUT,
            arguments = listOf(navArgument(Routes.WORKOUT_ARG_ID) { type = NavType.StringType }),
        ) { entry ->
            val id = entry.arguments?.getString(Routes.WORKOUT_ARG_ID).orEmpty()
            WorkoutScreen(workoutId = id, onBack = back)
        }
    }
}

private fun NavGraphBuilder.topLevel(
    onNavigate: (TopDest) -> Unit,
    openWorkout: (String) -> Unit,
    openNutrition: () -> Unit,
) {
    composable(TopDest.TODAY.route) {
        TodayScreen(onNavigate = onNavigate, onOpenWorkout = openWorkout, onOpenNutrition = openNutrition)
    }
    composable(TopDest.INSIGHTS.route) {
        InsightsScreen(onNavigate = onNavigate)
    }
    composable(TopDest.PLAN.route) {
        PlanScreen(onNavigate = onNavigate, onOpenWorkout = openWorkout)
    }
    composable(TopDest.BODY.route) {
        BodyScreen(onNavigate = onNavigate)
    }
    composable(TopDest.YOU.route) {
        ProfileScreen(onNavigate = onNavigate, onOpenNutrition = openNutrition)
    }
}
