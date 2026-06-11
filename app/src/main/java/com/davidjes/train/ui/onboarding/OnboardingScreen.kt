package com.davidjes.train.ui.onboarding

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.data.health.HealthConnectManager
import com.davidjes.train.ui.components.OutlinedContentCard
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.health.rememberHealthConnectPermissionLauncher
import com.davidjes.train.ui.theme.Spacing
import com.davidjes.train.ui.theme.displayNumber
import com.davidjes.train.ui.theme.trainColors

@Composable
fun OnboardingScreen(onFinished: () -> Unit) {
    val vm: OnboardingViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val launcher = rememberHealthConnectPermissionLauncher { vm.onPermissionsResult(it) }

    fun connect() {
        when (state.hcAvailable) {
            HealthConnectManager.Availability.INSTALLED -> launcher.launch(vm.healthConnectManager.permissions)
            else -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata")))
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(horizontal = 24.dp, vertical = 16.dp),
    ) {
        // Progress (step 1 of 2 highlighted)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            listOf(true, state.hcConnected, false, false).forEach { on ->
                Box(
                    Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp))
                        .background(if (on) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerHighest),
                )
            }
        }

        Column(
            Modifier.weight(1f).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                Modifier.size(96.dp).clip(RoundedCornerShape(28.dp)).background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) { Icon(TrainIcons.watch, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(48.dp)) }
            Text("Connect your data", style = displayNumber(28), modifier = Modifier.padding(top = Spacing.lg))
            Text(
                "trAIn reads HRV, sleep, resting HR and workouts from Health Connect to build your daily readiness. Nothing is shared off your device.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = Spacing.sm),
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            ProviderCard(TrainIcons.watch, "Health Connect", if (state.hcConnected) "Connected" else "Tap to connect", state.hcConnected, ::connect)
            ProviderCard(TrainIcons.link, "Garmin / Strava", "Sync into Health Connect", false) {}
            ProviderCard(TrainIcons.heart, "Apple Health", "Not available on Android", false) {}
        }

        Column(Modifier.padding(top = Spacing.xl), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Button(onClick = { vm.complete(onFinished) }, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text("Continue") }
            TextButton(onClick = { vm.complete(onFinished) }, modifier = Modifier.fillMaxWidth()) { Text("Skip for now") }
        }
    }
}

@Composable
private fun ProviderCard(icon: ImageVector, name: String, meta: String, connected: Boolean, onClick: () -> Unit) {
    OutlinedContentCard(
        modifier = Modifier.fillMaxWidth().clickableCard(onClick),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Box(
                Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh),
                contentAlignment = Alignment.Center,
            ) { Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(22.dp)) }
            Column(Modifier.weight(1f)) {
                Text(name, style = MaterialTheme.typography.titleMedium)
                Text(meta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (connected) {
                Box(
                    Modifier.size(26.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center,
                ) { Icon(TrainIcons.check, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(16.dp)) }
            } else {
                Icon(TrainIcons.chevRight, contentDescription = null, tint = MaterialTheme.colorScheme.outline)
            }
        }
    }
}

private fun Modifier.clickableCard(onClick: () -> Unit): Modifier =
    this.clickable(onClick = onClick)
