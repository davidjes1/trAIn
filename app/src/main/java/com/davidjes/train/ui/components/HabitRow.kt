package com.davidjes.train.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.davidjes.train.ui.theme.MonoNumber

/** Habit list item with an animated leading checkbox container and streak flame. */
@Composable
fun HabitRow(
    label: String,
    done: Boolean,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    streak: Int = 0,
    onToggle: () -> Unit,
) {
    val primary = MaterialTheme.colorScheme.primary
    val onVar = MaterialTheme.colorScheme.onSurfaceVariant
    val bg by animateColorAsState(
        if (done) primary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceContainerHigh,
        label = "habitBg",
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(bg)
            .clickable(onClick = onToggle)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier = Modifier
                .size(26.dp)
                .clip(RoundedCornerShape(8.dp))
                .then(
                    if (done) Modifier.background(primary)
                    else Modifier.border(2.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp)),
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (done) {
                Icon(TrainIcons.check, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(16.dp))
            }
        }
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = if (done) primary else onVar, modifier = Modifier.size(18.dp))
        }
        Text(
            text = label,
            style = MaterialTheme.typography.titleSmall,
            color = if (done) MaterialTheme.colorScheme.onSurface else onVar,
            modifier = Modifier.weight(1f),
        )
        if (streak > 0) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Icon(TrainIcons.flame, contentDescription = null, tint = onVar, modifier = Modifier.size(14.dp))
                Text("$streak", style = MonoNumber, color = onVar)
            }
        }
    }
}
