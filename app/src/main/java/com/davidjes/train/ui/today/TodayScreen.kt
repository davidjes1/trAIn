package com.davidjes.train.ui.today

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.data.health.HealthConnectManager
import com.davidjes.train.domain.model.Readiness
import com.davidjes.train.domain.model.Sport
import com.davidjes.train.ui.components.DuplicateWorkoutDialog
import com.davidjes.train.ui.components.FilledEmphasisCard
import com.davidjes.train.ui.components.HabitRow
import com.davidjes.train.ui.components.KickerText
import com.davidjes.train.ui.components.OutlinedContentCard
import com.davidjes.train.ui.components.QuickSlider
import com.davidjes.train.ui.components.RingTone
import com.davidjes.train.ui.components.ScoreRing
import com.davidjes.train.ui.components.SportChip
import com.davidjes.train.ui.components.SubFactor
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.health.rememberHealthConnectPermissionLauncher
import com.davidjes.train.ui.navigation.TopDest
import com.davidjes.train.ui.theme.Spacing
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayScreen(
    onNavigate: (TopDest) -> Unit,
    onOpenWorkout: (String) -> Unit,
    onOpenNutrition: () -> Unit,
) {
    val vm: TodayViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()
    var showLog by rememberSaveable { mutableStateOf(false) }
    var showLogWorkout by rememberSaveable { mutableStateOf(false) }
    var showAddHabit by rememberSaveable { mutableStateOf(false) }
    val permLauncher = rememberHealthConnectPermissionLauncher { vm.onPermissionsResult(it) }
    val dateLabel = remember { LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMM d")) }

    TrainScreenScaffold(
        current = TopDest.TODAY,
        onNavigate = onNavigate,
        topBar = {
            CenterAlignedTopAppBar(title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Today", style = MaterialTheme.typography.titleLarge)
                    Text(dateLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            })
        },
        floatingActionButton = {
            if (!state.needsConnect) {
                ExtendedFloatingActionButton(
                    onClick = { showLog = true },
                    icon = { Icon(TrainIcons.plus, contentDescription = null) },
                    text = { Text("Log") },
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.syncing,
            onRefresh = vm::refresh,
            modifier = Modifier.padding(padding).fillMaxSize(),
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = Spacing.screen, end = Spacing.screen, top = Spacing.sm, bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(Spacing.cardGap),
            ) {
                if (state.needsConnect) {
                    item { ConnectCard(state.hcAvailability) { permLauncher.launch(vm.healthConnectManager.permissions) } }
                    return@LazyColumn
                }

                item {
                    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                        TodayMode.entries.forEachIndexed { i, mode ->
                            SegmentedButton(
                                selected = state.mode == mode,
                                onClick = { vm.setMode(mode) },
                                shape = SegmentedButtonDefaults.itemShape(i, TodayMode.entries.size),
                            ) { Text(if (mode == TodayMode.NARRATIVE) "Narrative" else "Metrics") }
                        }
                    }
                }

                item {
                    AnimatedContent(
                        targetState = state.mode,
                        transitionSpec = { fadeIn() togetherWith fadeOut() },
                        label = "todayHero",
                    ) { mode ->
                        when (mode) {
                            TodayMode.NARRATIVE -> NarrativeHero(state)
                            TodayMode.METRICS -> MetricsHero(state)
                        }
                    }
                }

                item { RecoverySnapshot(state) }

                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        KickerText("Habits")
                        FilledTonalButton(onClick = { showAddHabit = true }, contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 4.dp)) {
                            Icon(TrainIcons.plus, contentDescription = null, modifier = Modifier.size(16.dp))
                            Text("Add", modifier = Modifier.padding(start = 4.dp))
                        }
                    }
                }
                items(state.habits, key = { it.id }) { habit ->
                    Box {
                        var menuOpen by remember { mutableStateOf(false) }
                        HabitRow(
                            label = habit.label,
                            done = habit.doneToday,
                            icon = TrainIcons.byKey(habit.iconKey),
                            streak = habit.streak,
                            onLongPress = { menuOpen = true },
                            onToggle = { vm.toggleHabit(habit.id, !habit.doneToday) },
                        )
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(
                                text = { Text("Delete habit") },
                                onClick = { menuOpen = false; vm.deleteHabit(habit.id) },
                                leadingIcon = { Icon(TrainIcons.close, contentDescription = null) },
                            )
                        }
                    }
                }

                item { CheckInCard(state, onChange = vm::updateCheckIn, onSave = vm::saveCheckIn) }
                item { NutritionRow(state, onOpenNutrition) }
            }
        }
    }

    if (showLog) {
        QuickLogSheet(
            onDismiss = { showLog = false },
            onMeal = { showLog = false; onOpenNutrition() },
            onWorkout = { showLog = false; showLogWorkout = true },
        )
    }
    if (showLogWorkout) {
        LogWorkoutSheet(
            onDismiss = { showLogWorkout = false },
            onSave = { sport, minutes, title -> vm.logWorkout(sport, minutes, title); showLogWorkout = false },
        )
    }

    state.conflicts.firstOrNull()?.let { conflict ->
        DuplicateWorkoutDialog(
            conflict = conflict,
            onUseDevice = { vm.resolveConflict(conflict.ourId, deleteOurs = true) },
            onKeepBoth = { vm.resolveConflict(conflict.ourId, deleteOurs = false) },
        )
    }

    if (showAddHabit) {
        AddHabitDialog(
            onDismiss = { showAddHabit = false },
            onAdd = { label, icon -> vm.addHabit(label, icon); showAddHabit = false },
        )
    }
}

@Composable
private fun AddHabitDialog(onDismiss: () -> Unit, onAdd: (String, String) -> Unit) {
    var label by rememberSaveable { mutableStateOf("") }
    var icon by rememberSaveable { mutableStateOf("drop") }
    val iconChoices = listOf("drop", "barbell", "moon", "food", "run", "bike", "heart", "bolt")

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New habit") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                OutlinedTextField(value = label, onValueChange = { label = it }, label = { Text("Habit") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    iconChoices.forEach { key ->
                        FilterChip(
                            selected = icon == key,
                            onClick = { icon = key },
                            label = { Icon(TrainIcons.byKey(key), contentDescription = key, modifier = Modifier.size(18.dp)) },
                        )
                    }
                }
            }
        },
        confirmButton = { Button(onClick = { onAdd(label, icon) }, enabled = label.isNotBlank()) { Text("Add") } },
        dismissButton = { FilledTonalButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun ConnectCard(availability: HealthConnectManager.Availability, onConnect: () -> Unit) {
    val context = LocalContext.current
    OutlinedContentCard {
        KickerText("Connect")
        Text("Connect Health Connect", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 4.dp))
        Text(
            when (availability) {
                HealthConnectManager.Availability.INSTALLED ->
                    "Grant trAIn access to your heart rate, HRV, sleep, recovery, and workouts. Your data stays on your device."
                HealthConnectManager.Availability.UPDATE_REQUIRED ->
                    "Health Connect needs an update before trAIn can read your data."
                HealthConnectManager.Availability.NOT_SUPPORTED ->
                    "Health Connect isn't available on this device. Install it from the Play Store to use trAIn."
            },
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(vertical = Spacing.md),
        )
        Button(onClick = {
            when (availability) {
                HealthConnectManager.Availability.INSTALLED -> onConnect()
                else -> context.startActivity(
                    Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata")),
                )
            }
        }) {
            Text(if (availability == HealthConnectManager.Availability.INSTALLED) "Grant access" else "Get Health Connect")
        }
    }
}

@Composable
private fun NarrativeHero(state: TodayUiState) {
    val rec = state.recommendation
    FilledEmphasisCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(TrainIcons.spark, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
            KickerText("Gemini")
        }
        Text(
            state.narrative.ifBlank { "Gathering today's signals…" },
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(vertical = Spacing.md),
        )
        if (rec != null) {
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = Spacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
            ) {
                SportChip(rec.sport)
                Text(
                    "${rec.durationMin} min",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                )
                Button(onClick = { /* schedule into plan */ }) { Text("Schedule") }
                FilledTonalIconButton(onClick = { /* swap suggestion */ }) {
                    Icon(TrainIcons.refresh, contentDescription = "Swap")
                }
            }
        }
    }
}

@Composable
private fun MetricsHero(state: TodayUiState) {
    val readiness = state.readiness
    FilledEmphasisCard {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            ScoreRing(
                value = readiness?.score ?: 0,
                size = 132.dp,
                label = "READINESS",
                tone = RingTone.AUTO,
            )
        }
        if (state.load != null) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = Spacing.md),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                LoadStat("CTL", state.load.ctl)
                LoadStat("ATL", state.load.atl)
                LoadStat("TSB", state.load.tsb)
            }
        }
    }
}

@Composable
private fun LoadStat(label: String, value: Double) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("%.0f".format(value), style = MaterialTheme.typography.titleMedium)
        KickerText(label)
    }
}

@Composable
private fun RecoverySnapshot(state: TodayUiState) {
    OutlinedContentCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            KickerText("Recovery")
            state.readiness?.let {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ScoreRing(value = it.score, size = 56.dp, label = null, thickness = 6.dp)
                }
            }
        }
        val factors = state.recoveryFactors
        Column(Modifier.padding(top = Spacing.md), verticalArrangement = Arrangement.spacedBy(Spacing.lg)) {
            factors.chunked(2).forEach { rowItems ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.lg)) {
                    rowItems.forEach { f ->
                        SubFactor(
                            label = f.label,
                            value = f.value,
                            unit = f.unit,
                            spark = f.spark,
                            delta = f.delta,
                            deltaTone = f.deltaTone,
                            icon = TrainIcons.byKey(f.iconKey),
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (rowItems.size == 1) Box(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun CheckInCard(state: TodayUiState, onChange: (CheckIn) -> Unit, onSave: () -> Unit) {
    val c = state.checkIn
    OutlinedContentCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            KickerText("Check-in")
            FilledTonalButton(onClick = onSave) { Text("Save") }
        }
        Column(Modifier.padding(top = Spacing.sm), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            QuickSlider("Mood", c.mood, { onChange(c.copy(mood = it)) }, icon = TrainIcons.heart)
            QuickSlider("Energy", c.energy, { onChange(c.copy(energy = it)) }, icon = TrainIcons.bolt)
            QuickSlider("Stress", c.stress, { onChange(c.copy(stress = it)) }, icon = TrainIcons.pulse)
        }
    }
}

@Composable
private fun NutritionRow(state: TodayUiState, onOpenNutrition: () -> Unit) {
    val n = state.nutrition
    OutlinedContentCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                KickerText("Nutrition")
                Text(
                    if (n != null) "${n.eatenKcal} / ${n.targetKcal} kcal" else "—",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            FilledTonalButton(onClick = onOpenNutrition) { Text("Open") }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QuickLogSheet(onDismiss: () -> Unit, onMeal: () -> Unit, onWorkout: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = Spacing.xl, vertical = Spacing.md)) {
            KickerText("Quick log")
            Text("What do you want to log?", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(vertical = Spacing.sm))
            val options = listOf(
                "Workout" to TrainIcons.barbell,
                "Meal" to TrainIcons.food,
                "Weight" to TrainIcons.weight,
                "Mood" to TrainIcons.heart,
                "Note" to TrainIcons.edit,
            )
            options.forEach { (label, icon) ->
                Row(
                    Modifier.fillMaxWidth()
                        .clickableLog {
                            when (label) {
                                "Workout" -> onWorkout()
                                "Meal" -> onMeal()
                                else -> onDismiss()
                            }
                        }
                        .padding(vertical = Spacing.md),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Spacing.lg),
                ) {
                    Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(label, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Icon(TrainIcons.chevRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LogWorkoutSheet(onDismiss: () -> Unit, onSave: (Sport, Int, String?) -> Unit) {
    val sports = listOf(Sport.RUN, Sport.RIDE, Sport.STRENGTH, Sport.SWIM, Sport.MOBILITY)
    var sport by rememberSaveable { mutableStateOf(Sport.RUN) }
    var minutes by rememberSaveable { mutableStateOf("45") }
    var title by rememberSaveable { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = Spacing.xl, vertical = Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            KickerText("Log workout")
            androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                sports.forEach { s ->
                    FilterChip(selected = sport == s, onClick = { sport = s }, label = { Text(s.label) })
                }
            }
            OutlinedTextField(
                value = minutes,
                onValueChange = { minutes = it.filter(Char::isDigit) },
                label = { Text("Duration") },
                suffix = { Text("min") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Title (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                "Saved to Health Connect — feeds load, zones, and readiness.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(Modifier.fillMaxWidth().padding(top = Spacing.xs), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                FilledTonalButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { onSave(sport, minutes.toIntOrNull() ?: 45, title) },
                    modifier = Modifier.weight(1f),
                ) { Text("Log") }
            }
        }
    }
}

private fun Modifier.clickableLog(onClick: () -> Unit): Modifier =
    this.clickable(onClick = onClick)
