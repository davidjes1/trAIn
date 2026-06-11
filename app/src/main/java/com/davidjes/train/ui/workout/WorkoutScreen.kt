package com.davidjes.train.ui.workout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.domain.model.Workout
import com.davidjes.train.ui.components.KickerText
import com.davidjes.train.ui.components.OutlinedContentCard
import com.davidjes.train.ui.components.SparkTone
import com.davidjes.train.ui.components.Sparkline
import com.davidjes.train.ui.components.SportChip
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.components.ZoneStack
import com.davidjes.train.ui.theme.Spacing
import com.davidjes.train.ui.theme.displayNumber
import com.davidjes.train.ui.theme.trainColors
import java.time.format.DateTimeFormatter
import java.time.ZoneId
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutScreen(workoutId: String, onBack: () -> Unit) {
    val vm: WorkoutViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()
    LaunchedEffect(workoutId) { vm.load(workoutId) }

    TrainScreenScaffold(
        current = null,
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(TrainIcons.chevLeft, contentDescription = "Back") }
                },
                actions = {
                    IconButton(onClick = { }) { Icon(TrainIcons.refresh, contentDescription = "Sync") }
                    IconButton(onClick = { }) { Icon(TrainIcons.more, contentDescription = "More") }
                },
            )
        },
    ) { padding ->
        val workout = state.workout
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            workout == null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Workout not found", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            else -> Column(
                Modifier.padding(padding).verticalScroll(rememberScrollState())
                    .padding(start = Spacing.screen, end = Spacing.screen, bottom = Spacing.xxxl),
                verticalArrangement = Arrangement.spacedBy(Spacing.cardGap),
            ) {
                Header(workout)
                MetricTiles(workout)
                ActivityChart(state.hrSeries)
                ZonesCard(workout, state.zoneDurations)
                workout.notes?.takeIf { it.isNotBlank() }?.let { NotesCard(it) }
            }
        }
    }
}

@Composable
private fun Header(w: Workout) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            SportChip(w.sport, showLabel = false)
            val dt = w.start.atZone(ZoneId.systemDefault())
            Text(
                dt.format(DateTimeFormatter.ofPattern("EEE · MMM d · HH:mm")),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(w.title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(top = 6.dp))
        Text(summaryLine(w), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
private fun MetricTiles(w: Workout) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        MetricTile("HEART RATE", w.avgHr?.toString() ?: "—", "avg ${w.maxHr?.let { "· max $it" } ?: ""}", amber = true, modifier = Modifier.weight(1f))
        MetricTile(
            if (w.distanceMeters != null) "DISTANCE" else "LOAD",
            if (w.distanceMeters != null) "%.1f".format(w.distanceMeters / 1000) else w.trainingLoad.roundToInt().toString(),
            if (w.distanceMeters != null) "km" else "TRIMP",
            modifier = Modifier.weight(1f),
        )
        MetricTile("CALORIES", w.activeKcal?.roundToInt()?.toString() ?: "—", "kcal", modifier = Modifier.weight(1f))
    }
}

@Composable
private fun MetricTile(label: String, value: String, unit: String, modifier: Modifier = Modifier, amber: Boolean = false) {
    OutlinedContentCard(modifier = modifier, padding = androidx.compose.foundation.layout.PaddingValues(12.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            value,
            style = displayNumber(22),
            color = if (amber) MaterialTheme.trainColors.amber.base else MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 4.dp),
        )
        Text(unit, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ActivityChart(hr: List<Float>) {
    OutlinedContentCard {
        KickerText("Activity · heart rate")
        if (hr.size < 2) {
            Text("No heart-rate samples for this session.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = Spacing.sm))
        } else {
            Sparkline(data = hr, modifier = Modifier.fillMaxWidth().padding(top = Spacing.md), height = 130.dp, tone = SparkTone.PRIMARY, showDot = false)
        }
    }
}

@Composable
private fun ZonesCard(w: Workout, durations: List<String>) {
    OutlinedContentCard {
        Text("HR zones · time in zone", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = Spacing.md))
        ZoneStack(values = w.zones.asWeights(), durations = durations)
    }
}

@Composable
private fun NotesCard(notes: String) {
    OutlinedContentCard {
        KickerText("Notes")
        Text(notes, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = Spacing.sm))
    }
}

private fun summaryLine(w: Workout): String = buildString {
    val s = w.durationSeconds
    append("%d:%02d:%02d".format(s / 3600, (s % 3600) / 60, s % 60))
    w.distanceMeters?.let { append(" · %.1f km".format(it / 1000)) }
    append(" · load ${w.trainingLoad.roundToInt()}")
}
