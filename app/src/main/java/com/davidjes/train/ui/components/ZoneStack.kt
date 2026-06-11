package com.davidjes.train.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.davidjes.train.ui.theme.MonoNumber
import com.davidjes.train.ui.theme.trainColors

/**
 * HR zone distribution as a single segmented bar (Z1..Z5), with optional labels
 * and per-zone duration captions. [values] are weights (any scale; normalized).
 */
@Composable
fun ZoneStack(
    values: List<Float>,
    modifier: Modifier = Modifier,
    barHeight: Dp = 18.dp,
    labels: Boolean = true,
    durations: List<String>? = null,
) {
    val zones = MaterialTheme.trainColors.zones
    val total = values.sum().takeIf { it > 0f } ?: 1f
    val track = MaterialTheme.colorScheme.surfaceContainerHighest

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(barHeight)
                .clip(RoundedCornerShape(6.dp))
                .background(track),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            values.forEachIndexed { i, v ->
                if (v / total >= 0.001f) {
                    Box(
                        modifier = Modifier
                            .weight((v / total).coerceAtLeast(0.0001f))
                            .fillMaxHeight()
                            .background(zones.getOrElse(i) { zones.last() }),
                    )
                }
            }
        }
        if (labels) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                listOf("Z1", "Z2", "Z3", "Z4", "Z5").forEachIndexed { i, z ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            Modifier
                                .padding(bottom = 2.dp)
                                .size(6.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(zones[i]),
                        )
                        Text(z, style = MonoNumber.copy(fontSize = 10.sp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (durations != null) {
                            Text(
                                durations.getOrElse(i) { "" },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}
