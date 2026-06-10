package com.davidjes.train.ui.nutrition

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import com.davidjes.train.ui.components.ComingSoon
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NutritionScreen(onBack: () -> Unit) {
    TrainScreenScaffold(
        current = null,
        topBar = {
            TopAppBar(
                title = { Text("Nutrition") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(TrainIcons.chevLeft, contentDescription = "Back")
                    }
                },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { /* add-meal sheet — wired in Nutrition build step */ },
                icon = { Icon(TrainIcons.plus, contentDescription = null) },
                text = { Text("Meal") },
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        },
    ) { padding -> ComingSoon("Nutrition", kicker = "FUEL", padding = padding) }
}
