package com.davidjes.train.ui.plan

import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.davidjes.train.ui.components.ComingSoon
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.navigation.TopDest

@Composable
fun PlanScreen(
    onNavigate: (TopDest) -> Unit,
    onOpenWorkout: (String) -> Unit,
) {
    TrainScreenScaffold(
        current = TopDest.PLAN,
        onNavigate = onNavigate,
        topBar = { CenterAlignedTopAppBar(title = { Text("Plan") }) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { /* add workout — wired in Calendar build step */ },
                icon = { Icon(TrainIcons.plus, contentDescription = null) },
                text = { Text("Add") },
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        },
    ) { padding -> ComingSoon("Plan", kicker = "CALENDAR", padding = padding) }
}
