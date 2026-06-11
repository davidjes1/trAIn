package com.davidjes.train.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.domain.model.Sex
import com.davidjes.train.ui.components.FilledEmphasisCard
import com.davidjes.train.ui.components.KickerText
import com.davidjes.train.ui.components.OutlinedContentCard
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.components.ZoneStack
import com.davidjes.train.ui.navigation.TopDest
import com.davidjes.train.ui.theme.MonoNumber
import com.davidjes.train.ui.theme.Spacing
import com.davidjes.train.ui.theme.trainColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onNavigate: (TopDest) -> Unit,
    onOpenNutrition: () -> Unit,
) {
    val vm: ProfileViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()
    val profile = state.profile
    var showEdit by rememberSaveable { mutableStateOf(false) }

    TrainScreenScaffold(
        current = TopDest.YOU,
        onNavigate = onNavigate,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("You") },
                actions = { IconButton(onClick = { }) { Icon(TrainIcons.settings, contentDescription = "Settings") } },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).verticalScroll(rememberScrollState())
                .padding(start = Spacing.screen, end = Spacing.screen, top = Spacing.sm, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(Spacing.cardGap),
        ) {
            // Identity
            OutlinedContentCard {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                    Box(
                        Modifier.size(56.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            profile.displayName.trim().firstOrNull()?.uppercase() ?: "A",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                    Column(Modifier.weight(1f)) {
                        Text(profile.displayName.ifBlank { "Athlete" }, style = MaterialTheme.typography.titleLarge)
                        Text("${profile.sex.name.lowercase().replaceFirstChar { it.uppercase() }} · ${profile.age}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = { showEdit = true }) { Icon(TrainIcons.edit, contentDescription = "Edit") }
                }
            }

            // Next race
            state.nextRace?.let { race ->
                FilledEmphasisCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        KickerText("Next race")
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(TrainIcons.flag, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                            Text("${race.daysAway} days", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    Text(race.name, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = Spacing.sm))
                    Text(race.date.toString(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // HR zones
            OutlinedContentCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("HR zones", style = MaterialTheme.typography.titleSmall)
                    Text("max ${profile.maxHr} · rest ${profile.restingHr}", style = MonoNumber, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Box(Modifier.padding(top = Spacing.md)) {
                    ZoneStack(
                        values = List(5) { 1f },
                        durations = state.zones.map { it.label },
                    )
                }
                TextButton(onClick = { showEdit = true }, contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp)) {
                    Text("Edit zones")
                }
            }

            // Connections
            OutlinedContentCard {
                Text("Connections", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = Spacing.sm))
                ConnectionRow(TrainIcons.watch, "Health Connect", if (state.hcConnected) "Connected" else if (state.hcAvailable) "Not authorized" else "Unavailable", state.hcConnected, enabled = false)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                ConnectionRow(TrainIcons.spark, "Gemini (on-device)", "Narrative & insights", true, enabled = false)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                ConnectionRow(TrainIcons.sun, "Dynamic color", "Match wallpaper (Android 12+)", state.dynamicColor, enabled = true, onToggle = vm::setDynamicColor)
            }
        }
    }

    if (showEdit) {
        EditProfileSheet(
            initial = profile,
            onDismiss = { showEdit = false },
            onSave = { name, age, sex, rest, max ->
                vm.saveProfile(name, age, sex, rest, max)
                showEdit = false
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileSheet(
    initial: com.davidjes.train.domain.model.UserProfile,
    onDismiss: () -> Unit,
    onSave: (String, Int, Sex, Int, Int) -> Unit,
) {
    var name by remember { mutableStateOf(initial.displayName) }
    var age by remember { mutableStateOf(initial.age.toString()) }
    var sex by remember { mutableStateOf(initial.sex) }
    var rest by remember { mutableStateOf(initial.restingHr.toString()) }
    var max by remember { mutableStateOf(initial.maxHr.toString()) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = Spacing.xl, vertical = Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            KickerText("Edit profile")
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
            Text(
                "Resting & max HR drive your TRIMP load and zone boundaries.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Row(Modifier.fillMaxWidth().padding(top = Spacing.xs), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                FilledTonalButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = {
                        onSave(
                            name,
                            age.toIntOrNull() ?: initial.age,
                            sex,
                            rest.toIntOrNull() ?: initial.restingHr,
                            max.toIntOrNull() ?: initial.maxHr,
                        )
                    },
                    modifier = Modifier.weight(1f),
                ) { Text("Save") }
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
private fun ConnectionRow(
    icon: ImageVector,
    name: String,
    meta: String,
    on: Boolean,
    enabled: Boolean,
    onToggle: (Boolean) -> Unit = {},
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Box(
            Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp)) }
        Column(Modifier.weight(1f)) {
            Text(name, style = MaterialTheme.typography.titleSmall)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(if (on) MaterialTheme.trainColors.green.base else MaterialTheme.colorScheme.outline))
                Text(meta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Switch(checked = on, onCheckedChange = if (enabled) onToggle else null)
    }
}
