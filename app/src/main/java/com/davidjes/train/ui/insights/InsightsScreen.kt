package com.davidjes.train.ui.insights

import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.davidjes.train.ui.components.ComingSoon
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.navigation.TopDest

@Composable
fun InsightsScreen(onNavigate: (TopDest) -> Unit) {
    TrainScreenScaffold(
        current = TopDest.INSIGHTS,
        onNavigate = onNavigate,
        topBar = { CenterAlignedTopAppBar(title = { Text("Insights") }) },
    ) { padding -> ComingSoon("Insights", kicker = "GEMINI", padding = padding) }
}
