package com.davidjes.train.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.davidjes.train.ui.theme.trainColors

enum class SparkTone { DEFAULT, GREEN, AMBER, RED, PRIMARY }

/**
 * Sparkline over [data] (raw values; normalized internally). Optional gradient
 * area fill, end dot, and a dashed baseline (also a raw value).
 */
@Composable
fun Sparkline(
    data: List<Float>,
    modifier: Modifier = Modifier,
    height: Dp = 40.dp,
    tone: SparkTone = SparkTone.DEFAULT,
    area: Boolean = true,
    showDot: Boolean = true,
    baseline: Float? = null,
) {
    val tc = MaterialTheme.trainColors
    val color: Color = when (tone) {
        SparkTone.GREEN -> tc.green.base
        SparkTone.AMBER -> tc.amber.base
        SparkTone.RED -> tc.red.base
        SparkTone.PRIMARY -> MaterialTheme.colorScheme.primary
        SparkTone.DEFAULT -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val outline = MaterialTheme.colorScheme.outline
    val surface = MaterialTheme.colorScheme.surface

    Canvas(modifier = modifier.height(height)) {
        if (data.size < 2) return@Canvas
        val w = size.width
        val h = size.height
        val pad = 3f
        val min = data.min()
        val max = data.max()
        val range = (max - min).takeIf { it > 0f } ?: 1f
        val stepX = w / (data.size - 1)
        fun yOf(v: Float) = h - ((v - min) / range) * (h - pad * 2) - pad

        val line = Path()
        data.forEachIndexed { i, v ->
            val x = i * stepX
            val y = yOf(v)
            if (i == 0) line.moveTo(x, y) else line.lineTo(x, y)
        }

        if (area) {
            val fill = Path().apply {
                addPath(line)
                lineTo(w, h)
                lineTo(0f, h)
                close()
            }
            drawPath(
                path = fill,
                brush = Brush.verticalGradient(
                    colors = listOf(color.copy(alpha = 0.28f), color.copy(alpha = 0f)),
                ),
            )
        }

        baseline?.let { b ->
            val y = yOf(b)
            drawLine(
                color = outline,
                start = Offset(0f, y),
                end = Offset(w, y),
                strokeWidth = 1f,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f)),
            )
        }

        drawPath(line, color = color, style = Stroke(width = 2f * density, cap = StrokeCap.Round))

        if (showDot) {
            val lastX = (data.size - 1) * stepX
            val lastY = yOf(data.last())
            drawCircle(color = surface, radius = 3.5f * density, center = Offset(lastX, lastY))
            drawCircle(
                color = color, radius = 3.5f * density, center = Offset(lastX, lastY),
                style = Stroke(width = 2f * density),
            )
        }
    }
}
