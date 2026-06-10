package com.davidjes.train.ui.body

import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.davidjes.train.ui.components.ComingSoon
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.navigation.TopDest

@Composable
fun BodyScreen(onNavigate: (TopDest) -> Unit) {
    TrainScreenScaffold(
        current = TopDest.BODY,
        onNavigate = onNavigate,
        topBar = { CenterAlignedTopAppBar(title = { Text("Body") }) },
    ) { padding -> ComingSoon("Body", kicker = "TRENDS", padding = padding) }
}
