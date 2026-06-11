package com.davidjes.train.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.davidjes.train.ui.navigation.Routes
import com.davidjes.train.ui.navigation.TopDest
import com.davidjes.train.ui.navigation.TrainNavHost

/**
 * App root. Owns the NavController and the single navigation action used by every
 * bottom-nav destination (save/restore state, single-top). Each screen renders its
 * own chrome via [com.davidjes.train.ui.components.TrainScreenScaffold].
 */
@Composable
fun TrainRoot() {
    val rootViewModel: RootViewModel = hiltViewModel()
    val onboarded by rootViewModel.onboarded.collectAsStateWithLifecycle()

    // Wait for the flag so we don't flash the wrong start destination.
    val start = when (onboarded) {
        null -> { Box(Modifier.fillMaxSize()); return }
        true -> TopDest.TODAY.route
        false -> Routes.ONBOARDING
    }

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
        startDestination = start,
        onNavigate = onNavigate,
    )
}
