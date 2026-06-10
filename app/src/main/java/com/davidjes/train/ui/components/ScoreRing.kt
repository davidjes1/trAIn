package com.davidjes.train.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.davidjes.train.ui.theme.Kicker
import com.davidjes.train.ui.theme.displayNumber
import com.davidjes.train.ui.theme.trainColors

enum class RingTone { AUTO, GREEN, AMBER, RED, PRIMARY }

/**
 * Score ring (readiness / projections). Sweep animates on first composition.
 * AUTO tone: >=67 green, >=34 amber, else red.
 */
@Composable
fun ScoreRing(
    value: Int,
    modifier: Modifier = Modifier,
    size: Dp = 132.dp,
    label: String? = "READINESS",
    caption: String? = null,
    thickness: Dp = 10.dp,
    tone: RingTone = RingTone.AUTO,
) {
    val tc = MaterialTheme.trainColors
    val color: Color = when (tone) {
        RingTone.GREEN -> tc.green.base
        RingTone.AMBER -> tc.amber.base
        RingTone.RED -> tc.red.base
        RingTone.PRIMARY -> MaterialTheme.colorScheme.primary
        RingTone.AUTO -> when {
            value >= 67 -> tc.green.base
            value >= 34 -> tc.amber.base
            else -> tc.red.base
        }
    }
    val track = MaterialTheme.colorScheme.surfaceContainerHighest

    val sweep by animateFloatAsState(
        targetValue = (value.coerceIn(0, 100)) / 100f,
        animationSpec = tween(durationMillis = 900),
        label = "ringSweep",
    )

    Box(modifier = modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(size)) {
            val stroke = Stroke(width = thickness.toPx(), cap = StrokeCap.Round)
            val inset = thickness.toPx() / 2f
            val arcSize = androidx.compose.ui.geometry.Size(
                this.size.width - thickness.toPx(),
                this.size.height - thickness.toPx(),
            )
            val topLeft = androidx.compose.ui.geometry.Offset(inset, inset)
            drawArc(
                color = track,
                startAngle = -90f, sweepAngle = 360f, useCenter = false,
                topLeft = topLeft, size = arcSize, style = stroke,
            )
            drawArc(
                color = color,
                startAngle = -90f, sweepAngle = 360f * sweep, useCenter = false,
                topLeft = topLeft, size = arcSize, style = stroke,
            )
        }
        androidx.compose.foundation.layout.Column(
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val numSize = (size.value * 0.34f).toInt().coerceAtLeast(14)
            Text(
                text = value.toString(),
                style = displayNumber(numSize),
                color = color,
            )
            if (label != null) {
                Text(
                    text = label,
                    style = Kicker.copy(fontSize = (size.value * 0.075f).coerceAtLeast(9f).sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (caption != null) {
                Text(
                    text = caption,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}
