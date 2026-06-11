package com.davidjes.train.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.davidjes.train.domain.training.WorkoutMatcher
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** A trAIn-logged workout that overlaps a device recording — surfaced to resolve. */
data class WorkoutConflict(
    val ourId: String,
    val ourTitle: String,
    val deviceTitle: String,
    val deviceSource: String,
    val dateLabel: String,
)

private val conflictDateFmt = DateTimeFormatter.ofPattern("MMM d")

/** Map a domain conflict to its display form (device source name + date). */
fun WorkoutMatcher.Conflict.toUi(): WorkoutConflict = WorkoutConflict(
    ourId = ours.id,
    ourTitle = ours.title,
    deviceTitle = device.title,
    deviceSource = device.dataOrigin?.substringAfterLast('.')?.replaceFirstChar { it.uppercase() } ?: "Device",
    dateLabel = device.start.atZone(ZoneId.systemDefault()).format(conflictDateFmt),
)

/**
 * "Always ask" duplicate resolution. We can only delete our own manual record
 * (Health Connect permission model), so the choice is Use <device> vs Keep both.
 */
@Composable
fun DuplicateWorkoutDialog(
    conflict: WorkoutConflict,
    onUseDevice: () -> Unit,
    onKeepBoth: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onKeepBoth,
        icon = { Icon(TrainIcons.refresh, contentDescription = null) },
        title = { Text("Duplicate workout") },
        text = {
            Text(
                "On ${conflict.dateLabel} you logged “${conflict.ourTitle}”, " +
                    "and ${conflict.deviceSource} recorded “${conflict.deviceTitle}” for the same session.\n\n" +
                    "Replace your manual entry with the ${conflict.deviceSource} recording (richer data), or keep both?",
            )
        },
        confirmButton = { Button(onClick = onUseDevice) { Text("Use ${conflict.deviceSource}") } },
        dismissButton = { FilledTonalButton(onClick = onKeepBoth) { Text("Keep both") } },
    )
}
