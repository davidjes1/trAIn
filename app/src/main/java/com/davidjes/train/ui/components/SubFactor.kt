package com.davidjes.train.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.davidjes.train.ui.theme.displayNumber
import com.davidjes.train.ui.theme.trainColors

enum class DeltaTone { NEUTRAL, GOOD, BAD }

/**
 * Recovery sub-factor tile: icon + label, big mono value + unit, sparkline, sub + delta.
 */
@Composable
fun SubFactor(
    label: String,
    value: String,
    spark: List<Float>,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    unit: String? = null,
    sub: String? = null,
    delta: String? = null,
    deltaTone: DeltaTone = DeltaTone.NEUTRAL,
    sparkTone: SparkTone = SparkTone.DEFAULT,
    large: Boolean = false,
) {
    val tc = MaterialTheme.trainColors
    val onVar = MaterialTheme.colorScheme.onSurfaceVariant
    val deltaColor = when (deltaTone) {
        DeltaTone.GOOD -> tc.green.base
        DeltaTone.BAD -> tc.red.base
        DeltaTone.NEUTRAL -> onVar
    }

    Column(modifier = modifier) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            if (icon != null) Icon(icon, contentDescription = null, tint = onVar, modifier = Modifier.size(14.dp))
            Text(label, style = MaterialTheme.typography.labelMedium, color = onVar)
        }
        Row(
            modifier = Modifier.padding(top = 6.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(value, style = displayNumber(if (large) 28 else 22), color = MaterialTheme.colorScheme.onSurface)
            if (unit != null) {
                Text(unit, style = MaterialTheme.typography.bodySmall, color = onVar)
            }
        }
        Sparkline(
            data = spark,
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
            height = if (large) 36.dp else 28.dp,
            tone = sparkTone,
            showDot = false,
        )
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(sub ?: "", style = MaterialTheme.typography.bodySmall, color = onVar)
            if (delta != null) {
                Text(
                    delta,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = deltaColor,
                )
            }
        }
    }
}
