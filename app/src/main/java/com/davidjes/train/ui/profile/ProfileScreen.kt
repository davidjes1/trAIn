package com.davidjes.train.ui.profile

import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.davidjes.train.ui.components.ComingSoon
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.navigation.TopDest

@Composable
fun ProfileScreen(
    onNavigate: (TopDest) -> Unit,
    onOpenNutrition: () -> Unit,
) {
    TrainScreenScaffold(
        current = TopDest.YOU,
        onNavigate = onNavigate,
        topBar = { CenterAlignedTopAppBar(title = { Text("You") }) },
    ) { padding -> ComingSoon("Profile & Goals", kicker = "YOU", padding = padding) }
}
