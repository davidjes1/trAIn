package com.davidjes.train.ui.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.davidjes.train.ui.navigation.TopDest
import com.davidjes.train.ui.navigation.TrainNavigationBar

/**
 * Single source of chrome for a screen: top app bar + FAB + snackbar + (optional)
 * shared bottom navigation. One Scaffold per screen keeps WindowInsets correct
 * (edge-to-edge handled in MainActivity).
 *
 * @param current the bottom-nav destination for this screen, or null for pushed
 *                detail screens that should hide the bottom bar.
 */
@Composable
fun TrainScreenScaffold(
    current: TopDest?,
    modifier: Modifier = Modifier,
    onNavigate: (TopDest) -> Unit = {},
    snackbarHostState: SnackbarHostState = remember { SnackbarHostState() },
    topBar: @Composable () -> Unit = {},
    floatingActionButton: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        modifier = modifier,
        topBar = topBar,
        floatingActionButton = floatingActionButton,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (current != null) {
                TrainNavigationBar(current = current, onSelect = onNavigate)
            }
        },
        content = content,
    )
}
