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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.data.health.HealthConnectManager
import com.davidjes.train.domain.model.Sex
import com.davidjes.train.ui.components.KickerText
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

    var step by rememberSaveable { mutableStateOf(0) }
    var name by rememberSaveable { mutableStateOf("") }
    var sex by rememberSaveable { mutableStateOf(Sex.MALE) }
    var age by rememberSaveable { mutableStateOf("30") }
    var rest by rememberSaveable { mutableStateOf("55") }
    var max by rememberSaveable { mutableStateOf("190") }

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
            .imePadding()
            .padding(horizontal = 24.dp, vertical = 16.dp),
    ) {
        // Two-step progress
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            (0..1).forEach { i ->
                Box(
                    Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp))
                        .background(if (i <= step) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerHighest),
                )
            }
        }

        if (step == 0) {
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
                Button(onClick = { step = 1 }, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text("Continue") }
                TextButton(onClick = { vm.complete(onFinished) }, modifier = Modifier.fillMaxWidth()) { Text("Skip for now") }
            }
        } else {
            Column(
                Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(top = Spacing.xl),
                verticalArrangement = Arrangement.spacedBy(Spacing.lg),
            ) {
                KickerText("About you")
                Text("Your profile", style = displayNumber(28))
                Text(
                    "Resting and max HR set your zones and training load. You can change these any time in Profile.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    Sex.entries.forEachIndexed { i, option ->
                        SegmentedButton(
                            selected = sex == option,
                            onClick = { sex = option },
                            shape = SegmentedButtonDefaults.itemShape(i, Sex.entries.size),
                        ) { Text(option.name.lowercase().replaceFirstChar { it.uppercase() }) }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    NumField("Age", age, { age = it }, Modifier.weight(1f))
                    NumField("Resting HR", rest, { rest = it }, Modifier.weight(1f))
                    NumField("Max HR", max, { max = it }, Modifier.weight(1f))
                }
            }
            Column(Modifier.padding(top = Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Button(
                    onClick = {
                        vm.completeWithProfile(name, age.toIntOrNull() ?: 30, sex, rest.toIntOrNull() ?: 55, max.toIntOrNull() ?: 190, onFinished)
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) { Text("Finish") }
                TextButton(onClick = { step = 0 }, modifier = Modifier.fillMaxWidth()) { Text("Back") }
            }
        }
    }
}

@Composable
private fun NumField(label: String, value: String, onChange: (String) -> Unit, modifier: Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = { onChange(it.filter(Char::isDigit)) },
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = modifier,
    )
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
