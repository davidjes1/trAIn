package com.davidjes.train.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.davidjes.train.ui.theme.Kicker
import com.davidjes.train.ui.theme.displayNumber
import com.davidjes.train.ui.theme.trainColors

/**
 * Concentric macro rings: outer = kcal/target (primary), middle = protein (blue),
 * inner = carbs (amber). Fractions are 0..1.
 */
@Composable
fun MacroRing(
    kcal: Int,
    target: Int,
    proteinFrac: Float,
    carbsFrac: Float,
    modifier: Modifier = Modifier,
    size: Dp = 120.dp,
    thickness: Dp = 7.dp,
) {
    val tc = MaterialTheme.trainColors
    val track = MaterialTheme.colorScheme.surfaceContainerHighest
    val primary = MaterialTheme.colorScheme.primary

    val kcalFrac = if (target > 0) (kcal.toFloat() / target).coerceIn(0f, 1f) else 0f
    val a1 by animateFloatAsState(kcalFrac, tween(900), label = "ring1")
    val a2 by animateFloatAsState(proteinFrac.coerceIn(0f, 1f), tween(900), label = "ring2")
    val a3 by animateFloatAsState(carbsFrac.coerceIn(0f, 1f), tween(900), label = "ring3")

    Box(modifier = modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(size)) {
            val tpx = thickness.toPx()
            val gap = 2.dp.toPx()
            fun ring(index: Int, frac: Float, color: androidx.compose.ui.graphics.Color) {
                val inset = tpx / 2f + index * (tpx + gap)
                val s = Size(this.size.width - inset * 2, this.size.height - inset * 2)
                val tl = Offset(inset, inset)
                val stroke = Stroke(width = tpx, cap = StrokeCap.Round)
                drawArc(track, -90f, 360f, false, tl, s, style = stroke)
                drawArc(color, -90f, 360f * frac, false, tl, s, style = stroke)
            }
            ring(0, a1, primary)
            ring(1, a2, tc.blue.base)
            ring(2, a3, tc.amber.base)
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                kcal.toString(),
                style = displayNumber((size.value * 0.18f).toInt().coerceAtLeast(12)),
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                "/ $target",
                style = Kicker.copy(fontSize = 9.sp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
