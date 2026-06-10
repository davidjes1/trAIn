package com.davidjes.train.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext

/** Access the brand-semantic colors: `MaterialTheme.trainColors.green.base`, etc. */
val LocalTrainColors = staticCompositionLocalOf { TrainDarkSemantic }

@Composable
fun TrainTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    /** Wire real Material You dynamic color on Android 12+. */
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val ctx = LocalContext.current
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        darkTheme -> TrainDarkColors
        else -> TrainLightColors
    }
    val trainColors = if (darkTheme) TrainDarkSemantic else TrainLightSemantic

    CompositionLocalProvider(LocalTrainColors provides trainColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = TrainTypography,
            shapes = TrainShapes,
            content = content,
        )
    }
}

/** Convenience accessor mirroring `MaterialTheme.colorScheme`. */
val MaterialTheme.trainColors: TrainColors
    @Composable @ReadOnlyComposable
    get() = LocalTrainColors.current
