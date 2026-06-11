package com.davidjes.train.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import com.davidjes.train.domain.model.Sport

// ─────────────────────────────────────────────────────────────────────────────
// Material 3 ColorScheme — brand fallback (used when dynamic color is off/unavailable)
// Source of truth: design_handoff_train_mobile_compose/mobile/m3-tokens.css
// ─────────────────────────────────────────────────────────────────────────────

val TrainDarkColors = darkColorScheme(
    primary = Color(0xFF7FB0FF),
    onPrimary = Color(0xFF062F5F),
    primaryContainer = Color(0xFF214574),
    onPrimaryContainer = Color(0xFFD6E3FF),
    secondary = Color(0xFFBCC7DC),
    onSecondary = Color(0xFF263141),
    secondaryContainer = Color(0xFF3A4456),
    onSecondaryContainer = Color(0xFFD8E3F8),
    tertiary = Color(0xFFC3B3FF),
    onTertiary = Color(0xFF2C1D56),
    tertiaryContainer = Color(0xFF433670),
    onTertiaryContainer = Color(0xFFE7DEFF),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    background = Color(0xFF101216),
    onBackground = Color(0xFFE3E2E6),
    surface = Color(0xFF101216),
    onSurface = Color(0xFFE3E2E6),
    onSurfaceVariant = Color(0xFFC2C6D0),
    surfaceVariant = Color(0xFF42474E),
    outline = Color(0xFF8B909A),
    outlineVariant = Color(0xFF3A3E45),
    surfaceDim = Color(0xFF0C0E12),
    surfaceBright = Color(0xFF32353B),
    surfaceContainerLowest = Color(0xFF07080A),
    surfaceContainerLow = Color(0xFF16181D),
    surfaceContainer = Color(0xFF1A1C21),
    surfaceContainerHigh = Color(0xFF24272D),
    surfaceContainerHighest = Color(0xFF2F3238),
    inverseSurface = Color(0xFFE3E2E6),
    inverseOnSurface = Color(0xFF2F3036),
    inversePrimary = Color(0xFF2B5CA0),
    scrim = Color(0xFF000000),
)

val TrainLightColors = lightColorScheme(
    primary = Color(0xFF2563EB),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFD8E2FF),
    onPrimaryContainer = Color(0xFF001A40),
    secondary = Color(0xFF565E71),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFDAE2F9),
    onSecondaryContainer = Color(0xFF131C2B),
    tertiary = Color(0xFF6B48C8),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFFE9DDFF),
    onTertiaryContainer = Color(0xFF23005C),
    error = Color(0xFFBA1A1A),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    background = Color(0xFFFAF9FD),
    onBackground = Color(0xFF1A1C1F),
    surface = Color(0xFFFAF9FD),
    onSurface = Color(0xFF1A1C1F),
    onSurfaceVariant = Color(0xFF44474E),
    surfaceVariant = Color(0xFFE1E2EC),
    outline = Color(0xFF74777F),
    outlineVariant = Color(0xFFC4C6CF),
    surfaceDim = Color(0xFFDAD9DD),
    surfaceBright = Color(0xFFFAF9FD),
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFF4F3F7),
    surfaceContainer = Color(0xFFEEEDF2),
    surfaceContainerHigh = Color(0xFFE8E7EC),
    surfaceContainerHighest = Color(0xFFE2E2E6),
    inverseSurface = Color(0xFF2F3036),
    inverseOnSurface = Color(0xFFF1F0F4),
    inversePrimary = Color(0xFFADC6FF),
)

// ─────────────────────────────────────────────────────────────────────────────
// Brand-semantic colors — NOT mapped to ColorScheme roles, so dynamic color
// never overrides their meaning. Surfaced via LocalTrainColors (see Theme.kt).
// ─────────────────────────────────────────────────────────────────────────────

/** Status / semantic colors plus a container + on-container variant for chips & insets. */
data class StatusColor(val base: Color, val container: Color, val on: Color)

data class TrainColors(
    val green: StatusColor,
    val amber: StatusColor,
    val red: StatusColor,
    val blue: StatusColor,
    val sport: Map<Sport, Color>,
    /** HR zone ramp Z1..Z5. */
    val zones: List<Color>,
)

private val DarkSportColors = mapOf(
    Sport.RUN to Color(0xFFECB464),
    Sport.RIDE to Color(0xFF6FA8FF),
    Sport.STRENGTH to Color(0xFFB6A0FF),
    Sport.SWIM to Color(0xFF5CD0D4),
    Sport.REST to Color(0xFF6C7079),
    Sport.BRICK to Color(0xFF6FA8FF),
    Sport.MOBILITY to Color(0xFF5CD0D4),
    Sport.OTHER to Color(0xFF8B909A),
)

private val LightSportColors = DarkSportColors.toMutableMap().apply {
    this[Sport.REST] = Color(0xFF8C9099)
}

private val ZoneRamp = listOf(
    Color(0xFF3A8D6E), // Z1
    Color(0xFF62D39A), // Z2
    Color(0xFFECB464), // Z3
    Color(0xFFE89058), // Z4
    Color(0xFFEF6F6C), // Z5
)

val TrainDarkSemantic = TrainColors(
    green = StatusColor(Color(0xFF62D39A), Color(0xFF103E2A), Color(0xFFB6F0D2)),
    amber = StatusColor(Color(0xFFECB464), Color(0xFF4A3414), Color(0xFFF6DCB0)),
    red = StatusColor(Color(0xFFEF6F6C), Color(0xFF4D1715), Color(0xFFFFD6D3)),
    blue = StatusColor(Color(0xFF6FA8FF), Color(0xFF173255), Color(0xFFCFE0FF)),
    sport = DarkSportColors,
    zones = ZoneRamp,
)

val TrainLightSemantic = TrainColors(
    green = StatusColor(Color(0xFF16A067), Color(0xFFC4F0D7), Color(0xFF00391F)),
    amber = StatusColor(Color(0xFFB9760E), Color(0xFFFFDDB0), Color(0xFF2E1500)),
    red = StatusColor(Color(0xFFD83F3C), Color(0xFFFFDAD6), Color(0xFF410002)),
    blue = StatusColor(Color(0xFF2563EB), Color(0xFFD8E2FF), Color(0xFF001A40)),
    sport = LightSportColors,
    zones = ZoneRamp,
)
