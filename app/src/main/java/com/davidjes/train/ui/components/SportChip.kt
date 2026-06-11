package com.davidjes.train.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.davidjes.train.domain.model.Sport
import com.davidjes.train.ui.theme.trainColors

private fun Sport.icon(): ImageVector = when (this) {
    Sport.RUN -> TrainIcons.run
    Sport.RIDE, Sport.BRICK -> TrainIcons.bike
    Sport.STRENGTH -> TrainIcons.barbell
    Sport.SWIM -> TrainIcons.swim
    Sport.MOBILITY -> TrainIcons.moon
    Sport.REST -> TrainIcons.moon
    Sport.OTHER -> TrainIcons.bolt
}

/** Tinted sport chip with theme-independent sport color (18% container). */
@Composable
fun SportChip(
    sport: Sport,
    modifier: Modifier = Modifier,
    showLabel: Boolean = true,
) {
    val color = MaterialTheme.trainColors.sport[sport] ?: MaterialTheme.colorScheme.onSurfaceVariant
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(color.copy(alpha = 0.18f))
            .padding(horizontal = if (showLabel) 10.dp else 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(sport.icon(), contentDescription = null, tint = color, modifier = Modifier.size(13.dp))
        if (showLabel) {
            Text(
                text = sport.label,
                style = MaterialTheme.typography.labelMedium,
                color = color,
                modifier = Modifier.padding(start = 5.dp),
            )
        }
    }
}
