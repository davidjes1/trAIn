package com.davidjes.train.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.davidjes.train.R

// Downloadable fonts via the Google Fonts provider.
// NOTE: if Inter / JetBrains Mono ever fail to download (e.g. cert mismatch),
// Compose falls back to the system sans/mono — no crash. Regenerate
// res/values/font_certs.xml via Android Studio's Downloadable Font dialog if needed.
private val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs,
)

private val Inter = FontFamily(
    Font(GoogleFont("Inter"), provider, FontWeight.Normal),
    Font(GoogleFont("Inter"), provider, FontWeight.Medium),
    Font(GoogleFont("Inter"), provider, FontWeight.SemiBold),
    Font(GoogleFont("Inter"), provider, FontWeight.Bold),
)

val JetBrainsMono = FontFamily(
    Font(GoogleFont("JetBrains Mono"), provider, FontWeight.Normal),
    Font(GoogleFont("JetBrains Mono"), provider, FontWeight.Medium),
    Font(GoogleFont("JetBrains Mono"), provider, FontWeight.SemiBold),
)

/** tabular figures for every earned number. */
const val TabularFigures = "tnum"

/**
 * M3 type scale mapped to Inter (UI) + JetBrains Mono (numerics).
 * displaySmall uses mono for screen/score numbers per the handoff.
 */
val TrainTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = JetBrainsMono, fontWeight = FontWeight.SemiBold,
        fontSize = 44.sp, lineHeight = 50.sp, letterSpacing = (-0.02).em,
        fontFeatureSettings = TabularFigures,
    ),
    displaySmall = TextStyle(
        fontFamily = JetBrainsMono, fontWeight = FontWeight.SemiBold,
        fontSize = 32.sp, lineHeight = 38.sp, letterSpacing = (-0.015).em,
        fontFeatureSettings = TabularFigures,
    ),
    headlineSmall = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp, lineHeight = 30.sp, letterSpacing = (-0.01).em,
    ),
    titleLarge = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp, lineHeight = 26.sp, letterSpacing = (-0.005).em,
    ),
    titleMedium = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp, lineHeight = 22.sp,
    ),
    titleSmall = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp, lineHeight = 20.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Normal,
        fontSize = 16.sp, lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Normal,
        fontSize = 14.sp, lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Normal,
        fontSize = 12.sp, lineHeight = 16.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Medium,
        fontSize = 14.sp, lineHeight = 20.sp, letterSpacing = 0.01.em,
    ),
    labelMedium = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Medium,
        fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 0.04.em,
    ),
    labelSmall = TextStyle(
        fontFamily = Inter, fontWeight = FontWeight.Medium,
        fontSize = 11.sp, lineHeight = 16.sp, letterSpacing = 0.05.em,
    ),
)

// ─── Custom styles not in the M3 scale ───────────────────────────────────────

/** Small mono section label: 11sp, +0.1em tracking, uppercase, onSurfaceVariant. */
val Kicker = TextStyle(
    fontFamily = JetBrainsMono, fontWeight = FontWeight.Medium,
    fontSize = 11.sp, lineHeight = 16.sp, letterSpacing = 0.1.em,
)

/** Big tabular display number; pass [size] (sp) per usage (20–44). */
fun displayNumber(sizeSp: Int) = TextStyle(
    fontFamily = JetBrainsMono, fontWeight = FontWeight.SemiBold,
    fontSize = sizeSp.sp, letterSpacing = (-0.03).em,
    fontFeatureSettings = TabularFigures,
)

/** Inline mono numeric run (tabular), tight tracking. */
val MonoNumber = TextStyle(
    fontFamily = JetBrainsMono, letterSpacing = (-0.01).em,
    fontFeatureSettings = TabularFigures,
)
