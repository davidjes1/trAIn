package com.davidjes.train.ui.workout

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import com.davidjes.train.ui.components.ComingSoon
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutScreen(workoutId: String, onBack: () -> Unit) {
    TrainScreenScaffold(
        current = null,
        topBar = {
            TopAppBar(
                title = { Text("Workout") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(TrainIcons.chevLeft, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding -> ComingSoon("Workout detail", kicker = workoutId.ifBlank { "WORKOUT" }, padding = padding) }
}
