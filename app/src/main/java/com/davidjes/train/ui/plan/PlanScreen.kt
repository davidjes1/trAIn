package com.davidjes.train.ui.plan

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.domain.model.Sport
import com.davidjes.train.domain.model.WorkoutType
import com.davidjes.train.domain.training.WorkoutLibrary
import java.time.LocalDate
import com.davidjes.train.ui.components.DuplicateWorkoutDialog
import com.davidjes.train.ui.components.FormCurve
import com.davidjes.train.ui.components.KickerText
import com.davidjes.train.ui.components.OutlinedContentCard
import com.davidjes.train.ui.components.FilledEmphasisCard
import com.davidjes.train.ui.components.RingTone
import com.davidjes.train.ui.components.ScoreRing
import com.davidjes.train.ui.components.SportChip
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.navigation.TopDest
import com.davidjes.train.ui.theme.MonoNumber
import com.davidjes.train.ui.theme.Spacing
import com.davidjes.train.ui.theme.displayNumber
import com.davidjes.train.ui.theme.trainColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanScreen(
    onNavigate: (TopDest) -> Unit,
    onOpenWorkout: (String) -> Unit,
) {
    val vm: PlanViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()
    var showAdd by rememberSaveable { mutableStateOf(false) }

    TrainScreenScaffold(
        current = TopDest.PLAN,
        onNavigate = onNavigate,
        topBar = {
            CenterAlignedTopAppBar(title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Training", style = MaterialTheme.typography.titleLarge)
                    Text(state.blockLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            })
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAdd = true },
                icon = { Icon(TrainIcons.plus, contentDescription = null) },
                text = { Text("Add") },
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding)) {
            ScrollableTabRow(
                selectedTabIndex = state.tab.ordinal,
                edgePadding = Spacing.screen,
                containerColor = Color.Transparent,
            ) {
                PlanTab.entries.forEach { tab ->
                    Tab(
                        selected = state.tab == tab,
                        onClick = { vm.setTab(tab) },
                        text = { Text(tab.name.lowercase().replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(start = Spacing.screen, end = Spacing.screen, top = Spacing.lg, bottom = 110.dp),
                verticalArrangement = Arrangement.spacedBy(Spacing.cardGap),
            ) {
                when (state.tab) {
                    PlanTab.DAY -> DayTab(state, onOpenWorkout, vm::completePlanned)
                    PlanTab.WEEK -> WeekTab(state, onOpenWorkout, vm::completePlanned)
                    PlanTab.MONTH -> MonthTab(state)
                    PlanTab.FORM -> FormTab(state)
                }
            }
        }
    }

    if (showAdd) {
        AddWorkoutSheet(
            onDismiss = { showAdd = false },
            onSave = { type, date, minutes -> vm.addPlanned(type, date, minutes); showAdd = false },
        )
    }

    state.conflicts.firstOrNull()?.let { conflict ->
        DuplicateWorkoutDialog(
            conflict = conflict,
            onUseDevice = { vm.resolveConflict(conflict.ourId, deleteOurs = true) },
            onKeepBoth = { vm.resolveConflict(conflict.ourId, deleteOurs = false) },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddWorkoutSheet(
    onDismiss: () -> Unit,
    onSave: (WorkoutType, LocalDate, Int) -> Unit,
) {
    val choices = listOf(
        WorkoutType.RUN_EASY, WorkoutType.RUN_THRESHOLD, WorkoutType.RIDE_Z2,
        WorkoutType.RIDE_THRESHOLD, WorkoutType.BRICK, WorkoutType.STRENGTH,
        WorkoutType.SWIM, WorkoutType.MOBILITY, WorkoutType.REST,
    )
    var type by remember { mutableStateOf(WorkoutType.RUN_EASY) }
    var minutes by remember { mutableStateOf(WorkoutLibrary.preset(type).durationMin.toString()) }
    var dayOffset by remember { mutableStateOf(0L) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = Spacing.xl, vertical = Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            KickerText("Add workout")

            // Day selector
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                listOf("Today" to 0L, "Tomorrow" to 1L, "+2 days" to 2L).forEach { (label, off) ->
                    FilterChip(selected = dayOffset == off, onClick = { dayOffset = off }, label = { Text(label) })
                }
            }

            // Type chips (wrap)
            androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                choices.forEach { t ->
                    FilterChip(
                        selected = type == t,
                        onClick = { type = t; minutes = WorkoutLibrary.preset(t).durationMin.toString() },
                        label = { Text(WorkoutLibrary.preset(t).description.substringBefore(",").substringBefore(" at ")) },
                    )
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

            Row(Modifier.fillMaxWidth().padding(top = Spacing.xs), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                FilledTonalButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { onSave(type, LocalDate.now().plusDays(dayOffset), minutes.toIntOrNull() ?: WorkoutLibrary.preset(type).durationMin) },
                    modifier = Modifier.weight(1f),
                ) { Text("Add") }
            }
        }
    }
}

@Composable
private fun DayTab(state: PlanUiState, onOpenWorkout: (String) -> Unit, onComplete: (DayItem) -> Unit) {
    val focus = state.todayFocus
    if (focus != null) {
        FilledEmphasisCard {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                KickerText(if (focus.isAi) "Today · AI" else "Today · planned")
                if (focus.isAi) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(TrainIcons.spark, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(12.dp))
                        Text("AI", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
            Row(
                Modifier.fillMaxWidth().padding(top = Spacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.md),
            ) {
                SportChip(focus.sport)
                Column(Modifier.weight(1f)) {
                    Text("${focus.title} · ${focus.minutes} min", style = MaterialTheme.typography.titleMedium)
                    Text(focus.detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            // Zone structure bar
            Row(
                Modifier.fillMaxWidth().padding(top = Spacing.md).height(26.dp).clip(RoundedCornerShape(6.dp)),
                horizontalArrangement = Arrangement.spacedBy(1.dp),
            ) {
                val zones = MaterialTheme.trainColors.zones
                val structure = focus.zoneStructure
                val total = structure.sum().coerceAtLeast(1f)
                structure.forEachIndexed { i, w ->
                    Box(Modifier.weight((w / total)).fillMaxHeight().background(zones[i % zones.size]))
                }
            }
            Row(Modifier.fillMaxWidth().padding(top = Spacing.md), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                FilledTonalButton(onClick = { focus.workoutId?.let(onOpenWorkout) }, modifier = Modifier.weight(1f)) {
                    Icon(TrainIcons.play, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text("Start", modifier = Modifier.padding(start = 6.dp))
                }
                OutlinedButton(onClick = { }) { Text("Move") }
                OutlinedButton(onClick = { }) { Text("Swap") }
            }
        }
    }

    OutlinedContentCard {
        KickerText("Today's plan")
        if (state.todayItems.isEmpty()) {
            Text("Nothing scheduled.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = Spacing.sm))
        }
        Column(Modifier.padding(top = Spacing.sm), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            state.todayItems.forEach { item -> DayItemRow(item, onOpenWorkout, onComplete) }
        }
    }
}

@Composable
private fun DayItemRow(item: DayItem, onOpenWorkout: (String) -> Unit, onComplete: (DayItem) -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        SportChip(item.sport, showLabel = false)
        Column(Modifier.weight(1f)) {
            Text(item.title, style = MaterialTheme.typography.titleSmall, color = if (item.sport == Sport.REST) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.onSurface)
            val meta = buildString {
                item.minutes?.let { append("${it}m") }
                item.load?.let { if (isNotEmpty()) append(" · "); append("load $it") }
            }
            if (meta.isNotEmpty()) Text(meta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        when {
            item.done -> Icon(TrainIcons.check, contentDescription = "Done", tint = MaterialTheme.trainColors.green.base, modifier = Modifier.size(18.dp))
            // Planned + not done → tap the empty circle to mark complete (links a device session if one matches).
            item.plannedId != null && item.sport != Sport.REST -> Box(
                Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .border(2.dp, MaterialTheme.colorScheme.outline, CircleShape)
                    .clickable { onComplete(item) },
            )
        }
        if (item.workoutId != null) {
            Icon(
                TrainIcons.chevRight, contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp).clickable { onOpenWorkout(item.workoutId) },
            )
        }
    }
}

@Composable
private fun WeekTab(state: PlanUiState, onOpenWorkout: (String) -> Unit, onComplete: (DayItem) -> Unit) {
    val week = state.week ?: return
    OutlinedContentCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("This week", style = MaterialTheme.typography.titleSmall)
            Text("${week.totalLoad} load · ${week.totalMinutes / 60}h${week.totalMinutes % 60}", style = MonoNumber, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Row(
            Modifier.fillMaxWidth().padding(top = Spacing.md).height(32.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            week.days.forEach { d ->
                val frac = (d.items.sumOf { it.load ?: 0 }.toFloat() / (week.totalLoad.coerceAtLeast(1))).coerceIn(0.05f, 1f)
                Box(
                    Modifier.weight(1f).fillMaxHeight(frac).clip(RoundedCornerShape(3.dp))
                        .background(if (d.isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant),
                )
            }
        }
    }
    week.days.forEach { d ->
        OutlinedContentCard(modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                Column(Modifier.size(width = 42.dp, height = 44.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(d.weekdayLabel, style = MaterialTheme.typography.labelSmall, color = if (d.isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${d.dayNum}", style = displayNumber(19), color = if (d.isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (d.items.isEmpty()) {
                        Text("Rest", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.outline)
                    }
                    d.items.forEach { DayItemRow(it, onOpenWorkout, onComplete) }
                }
            }
        }
    }
}

@Composable
private fun MonthTab(state: PlanUiState) {
    val month = state.month ?: return
    OutlinedContentCard {
        Text(month.title, style = MaterialTheme.typography.titleSmall)
        Row(Modifier.fillMaxWidth().padding(top = Spacing.md)) {
            listOf("M", "T", "W", "T", "F", "S", "S").forEach {
                Text(it, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }
        month.cells.chunked(7).forEach { row ->
            Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                row.forEach { c ->
                    Box(
                        Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(12.dp))
                            .background(if (c.isToday) MaterialTheme.colorScheme.primary.copy(alpha = 0.16f) else Color.Transparent),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(
                                "${c.dayNum}",
                                style = MonoNumber.copy(fontWeight = if (c.isToday) FontWeight.Bold else FontWeight.Medium),
                                color = when { c.isToday -> MaterialTheme.colorScheme.primary; !c.inMonth -> MaterialTheme.colorScheme.outline; else -> MaterialTheme.colorScheme.onSurface },
                            )
                            val sportColor = c.sport?.let { MaterialTheme.trainColors.sport[it] }
                            if (sportColor != null) {
                                Box(Modifier.size(6.dp).clip(RoundedCornerShape(3.dp)).background(sportColor))
                            }
                        }
                    }
                }
            }
        }
    }
    OutlinedContentCard {
        KickerText("Sport")
        Row(Modifier.fillMaxWidth().padding(top = Spacing.sm), horizontalArrangement = Arrangement.spacedBy(Spacing.lg)) {
            listOf(Sport.RUN, Sport.RIDE, Sport.STRENGTH, Sport.SWIM).forEach { sport ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(Modifier.size(8.dp).clip(RoundedCornerShape(4.dp)).background(MaterialTheme.trainColors.sport[sport] ?: Color.Gray))
                    Text(sport.label, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
private fun FormTab(state: PlanUiState) {
    val form = state.form ?: return
    OutlinedContentCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Form · 6 weeks", style = MaterialTheme.typography.titleSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Text("${form.currentCtl}", style = MonoNumber.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("${form.currentAtl}", style = MonoNumber.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.trainColors.amber.base)
                Text(if (form.currentTsb >= 0) "+${form.currentTsb}" else "${form.currentTsb}", style = MonoNumber.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.trainColors.green.base)
            }
        }
        FormCurve(form.ctl, form.atl, form.tsb, modifier = Modifier.padding(top = Spacing.md))
        Row(Modifier.padding(top = Spacing.sm), horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
            LegendDot("TSB", MaterialTheme.trainColors.green.base)
            LegendDot("ATL", MaterialTheme.trainColors.amber.base)
            LegendDot("CTL", MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    OutlinedContentCard {
        KickerText("Projection · race readiness")
        Row(Modifier.fillMaxWidth().padding(top = Spacing.md), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
            ScoreRing(value = form.projectionScore, size = 72.dp, thickness = 6.dp, label = null, tone = RingTone.AMBER)
            Column(Modifier.weight(1f)) {
                Text("${form.projectionScore}", style = displayNumber(22), color = MaterialTheme.trainColors.amber.base)
                Text("Projected form if taper holds", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun LegendDot(label: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(Modifier.size(width = 12.dp, height = 2.dp).background(color))
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
