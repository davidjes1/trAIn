package com.davidjes.train.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.davidjes.train.ui.theme.trainColors

/**
 * CTL/ATL/TSB form curve. CTL (onSurfaceVariant) and ATL (amber, dashed) share a
 * positive scale; TSB (green) is drawn around a centered zero baseline.
 */
@Composable
fun FormCurve(
    ctl: List<Float>,
    atl: List<Float>,
    tsb: List<Float>,
    modifier: Modifier = Modifier,
    height: Dp = 140.dp,
) {
    val ctlColor = MaterialTheme.colorScheme.onSurfaceVariant
    val amber = MaterialTheme.trainColors.amber.base
    val green = MaterialTheme.trainColors.green.base
    val baselineColor = MaterialTheme.colorScheme.outlineVariant

    Canvas(modifier = modifier.fillMaxWidth().height(height)) {
        val w = size.width
        val h = size.height
        if (ctl.size < 2) return@Canvas

        // Shared positive scale for CTL + ATL.
        val posMax = (ctl + atl).maxOrNull()?.takeIf { it > 0 } ?: 1f
        fun pathFor(data: List<Float>, yOf: (Float) -> Float): Path = Path().apply {
            val stepX = w / (data.size - 1)
            data.forEachIndexed { i, v -> if (i == 0) moveTo(0f, yOf(v)) else lineTo(i * stepX, yOf(v)) }
        }
        val posY = { v: Float -> h - (v / posMax) * (h * 0.9f) - h * 0.05f }

        // TSB around center; symmetric scale.
        val tsbAbs = (tsb.maxOfOrNull { kotlin.math.abs(it) } ?: 1f).coerceAtLeast(1f)
        val mid = h / 2f
        val tsbY = { v: Float -> mid - (v / tsbAbs) * (h * 0.4f) }

        // zero baseline
        drawLine(
            color = baselineColor, start = Offset(0f, mid), end = Offset(w, mid),
            strokeWidth = 1f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(3f, 6f)),
        )

        drawPath(pathFor(ctl, posY), color = ctlColor, style = Stroke(width = 1.5f * density, cap = StrokeCap.Round))
        drawPath(
            pathFor(atl, posY), color = amber,
            style = Stroke(width = 1.5f * density, cap = StrokeCap.Round, pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 6f))),
        )
        drawPath(pathFor(tsb, tsbY), color = green, style = Stroke(width = 2.5f * density, cap = StrokeCap.Round))
    }
}
