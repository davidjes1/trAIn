package com.davidjes.train.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.davidjes.train.ui.navigation.TopDest
import com.davidjes.train.ui.navigation.TrainNavHost

/**
 * App root. Owns the NavController and the single navigation action used by every
 * bottom-nav destination (save/restore state, single-top). Each screen renders its
 * own chrome via [com.davidjes.train.ui.components.TrainScreenScaffold].
 */
@Composable
fun TrainRoot(startDestination: String = TopDest.TODAY.route) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()

    val onNavigate: (TopDest) -> Unit = { dest ->
        val currentRoute = backStack?.destination?.route
        if (currentRoute != dest.route) {
            navController.navigate(dest.route) {
                popUpTo(navController.graph.startDestinationId) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        }
    }

    TrainNavHost(
        navController = navController,
        startDestination = startDestination,
        onNavigate = onNavigate,
    )
}
