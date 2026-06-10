# Handoff: trAIn — Mobile (Kotlin + Jetpack Compose, Material 3)

## Overview

A **mobile-first rework** of trAIn for **native Android** using **Kotlin + Jetpack Compose + Material 3**. Same product (daily training/recovery/readiness dashboard, Gemini insights, calendar, workouts) — re-expressed for a phone-first experience with Material 3 (Material You) components, motion, and dynamic color.

**Aesthetic:** the calm/technical Whoop-Linear feel, expressed *through* Material 3 — not stock Material defaults, not glass-morphism. Dark default, light supported. Mono numerics (JetBrains Mono), Inter for text.

---

## About the design files

The files in `mobile/` are **HTML/React design references** — a clickable prototype showing intended look, layout, motion, and Material 3 expression. They are **not code to ship**. Your task is to **build these screens as a Jetpack Compose app** using Material 3 (`androidx.compose.material3`), Compose's own theming, navigation, and component APIs.

**Open `mobile/trAIn Mobile.html` in a browser** — it's a pan/zoom canvas with all 8 surfaces. The Tweaks panel (toolbar) flips theme (dark/light) and simulates Material You dynamic color.

---

## Fidelity

**High-fidelity.** Exact colors, type scale, shapes, spacing, component anatomy. Recreate faithfully with Compose Material 3.

---

## Target stack

- **Kotlin** + **Jetpack Compose** (BOM latest stable)
- **Material 3** — `androidx.compose.material3` (+ `material3-window-size-class` for adaptive)
- **Navigation** — `androidx.navigation:navigation-compose`
- **Dynamic color** — `dynamicDarkColorScheme()/dynamicLightColorScheme()` on Android 12+ with the brand scheme as fallback
- **Charts** — Vico (`com.patrykandpatrick.vico`) or hand-drawn `Canvas`/`drawWithCache` for sparklines, rings, zone stacks
- **Data** — the existing trAIn Firebase backend (Firestore). Reuse the documented collections; this is the same data, new client. (If the team prefers, wrap Firestore behind a repository layer + `ViewModel`s with `StateFlow`.)
- **Edge-to-edge** — `enableEdgeToEdge()`, consume `WindowInsets` (status + nav bars), gesture nav + predictive back
- **Async/state** — `ViewModel` + `StateFlow` + `collectAsStateWithLifecycle()`

---

## File map

```
design_handoff_train_mobile_compose/mobile/
├── trAIn Mobile.html      ← open in a browser to see everything
├── m3-tokens.css          ← SOURCE OF TRUTH for color roles, type, shape, spacing
├── m3-primitives.jsx      ← component anatomy (NavBar, ScoreRing, Sparkline, chips, FAB…)
├── m3-today.jsx           ← Today (Narrative + Metrics, FAB quick-log sheet)
├── m3-insights.jsx        ← Insights (Gemini chat + insight cards)
├── m3-calendar.jsx        ← Calendar (Day/Week/Month/Form tabs)
├── m3-workout.jsx         ← Workout detail (endurance + strength)
├── m3-extras.jsx          ← Body trends · Nutrition · Profile · Onboarding
└── m3-app.jsx             ← canvas composition + theme/dynamic-color tweak logic
```

---

## Material 3 ColorScheme

Build a `ColorScheme` from the tokens in `m3-tokens.css`. Brand scheme = the fallback when dynamic color is unavailable/disabled.

### Dark (brand fallback)

```kotlin
private val TrainDarkColors = darkColorScheme(
    primary            = Color(0xFF7FB0FF),
    onPrimary          = Color(0xFF062F5F),
    primaryContainer   = Color(0xFF214574),
    onPrimaryContainer = Color(0xFFD6E3FF),
    secondary          = Color(0xFFBCC7DC),
    onSecondary        = Color(0xFF263141),
    secondaryContainer = Color(0xFF3A4456),
    onSecondaryContainer = Color(0xFFD8E3F8),
    tertiary           = Color(0xFFC3B3FF),
    tertiaryContainer  = Color(0xFF433670),
    onTertiaryContainer= Color(0xFFE7DEFF),
    error              = Color(0xFFFFB4AB),
    errorContainer     = Color(0xFF93000A),
    background         = Color(0xFF101216),
    surface            = Color(0xFF101216),
    onSurface          = Color(0xFFE3E2E6),
    onSurfaceVariant   = Color(0xFFC2C6D0),
    surfaceVariant     = Color(0xFF42474E),
    outline            = Color(0xFF8B909A),
    outlineVariant     = Color(0xFF3A3E45),
    surfaceContainerLowest  = Color(0xFF07080A),
    surfaceContainerLow     = Color(0xFF16181D),
    surfaceContainer        = Color(0xFF1A1C21),
    surfaceContainerHigh    = Color(0xFF24272D),
    surfaceContainerHighest = Color(0xFF2F3238),
    inverseSurface     = Color(0xFFE3E2E6),
    inverseOnSurface   = Color(0xFF2F3036),
    inversePrimary     = Color(0xFF2B5CA0),
)
```

### Light (brand fallback)

```kotlin
private val TrainLightColors = lightColorScheme(
    primary            = Color(0xFF2563EB),
    onPrimary          = Color(0xFFFFFFFF),
    primaryContainer   = Color(0xFFD8E2FF),
    onPrimaryContainer = Color(0xFF001A40),
    secondaryContainer = Color(0xFFDAE2F9),
    onSecondaryContainer = Color(0xFF131C2B),
    tertiaryContainer  = Color(0xFFE9DDFF),
    error              = Color(0xFFBA1A1A),
    background         = Color(0xFFFAF9FD),
    surface            = Color(0xFFFAF9FD),
    onSurface          = Color(0xFF1A1C1F),
    onSurfaceVariant   = Color(0xFF44474E),
    outline            = Color(0xFF74777F),
    outlineVariant     = Color(0xFFC4C6CF),
    surfaceContainerLowest  = Color(0xFFFFFFFF),
    surfaceContainerLow     = Color(0xFFF4F3F7),
    surfaceContainer        = Color(0xFFEEEDF2),
    surfaceContainerHigh    = Color(0xFFE8E7EC),
    surfaceContainerHighest = Color(0xFFE2E2E6),
)
```

### Theme + dynamic color

```kotlin
@Composable
fun TrainTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val ctx = LocalContext.current
    val colors = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        darkTheme -> TrainDarkColors
        else      -> TrainLightColors
    }
    MaterialTheme(colorScheme = colors, typography = TrainTypography, shapes = TrainShapes, content = content)
}
```

The prototype's "Material You" tweak (brand / olive / coral / lavender / sand swatches) **simulates** what `dynamicDarkColorScheme()` does at runtime from the wallpaper — primary + the container roles shift, the rest of the surface system holds. You don't build the swatch picker; you wire real dynamic color and keep the brand scheme as fallback.

### Brand-semantic colors (NOT in ColorScheme)

These encode meaning and must stay stable regardless of dynamic color. Put them in a custom theme extension (a `CompositionLocal` holding a `data class TrainColors`) — do **not** map them to `primary`/`error`, because dynamic color would override them.

| Token  | Dark      | Light     | Meaning            |
|--------|-----------|-----------|--------------------|
| green  | `#62D39A` | `#16A067` | high / positive    |
| amber  | `#ECB464` | `#B9760E` | moderate / caution |
| red    | `#EF6F6C` | `#D83F3C` | flag / negative    |
| blue   | `#6FA8FF` | `#2563EB` | informational      |

Sport identities (theme-independent): run `#ECB464` · ride `#6FA8FF` · strength `#B6A0FF` · swim `#5CD0D4` · rest `#6C7079`.
HR zones (theme-independent): Z1 `#3A8D6E` · Z2 `#62D39A` · Z3 `#ECB464` · Z4 `#E89058` · Z5 `#EF6F6C`.

```kotlin
data class TrainColors(
    val green: Color, val amber: Color, val red: Color, val blue: Color,
    val sport: Map<Sport, Color>, val zones: List<Color>,
)
val LocalTrainColors = staticCompositionLocalOf { /* dark defaults */ }
```

---

## Typography

Brand fonts: **Inter** (UI), **JetBrains Mono** (numerics, labels). Map to the M3 type scale; add a `numberLarge` style for display numbers.

| M3 role         | Font            | Size / line  | Weight | Use                          |
|-----------------|-----------------|--------------|--------|------------------------------|
| displaySmall    | JetBrains Mono  | 32 / 38      | 600    | screen/score numbers         |
| headlineSmall   | Inter           | 24 / 30      | 600    | screen titles                |
| titleLarge      | Inter           | 20 / 26      | 600    | hero card titles             |
| titleMedium     | Inter           | 16 / 22      | 600    | card titles                  |
| titleSmall      | Inter           | 14 / 20      | 600    | list/section titles          |
| bodyLarge       | Inter           | 16 / 24      | 400    | narratives                   |
| bodyMedium      | Inter           | 14 / 20      | 400    | secondary text               |
| bodySmall       | Inter           | 12 / 16      | 400    | meta                         |
| labelLarge      | Inter           | 14 / 20      | 500    | buttons                      |
| labelMedium     | Inter           | 12 / 16      | 500    | chips / nav labels           |

Custom (not in M3): **`kicker`** — JetBrains Mono, 11sp, 500, +0.1em tracking, uppercase, `onSurfaceVariant`. Used as the small mono section label everywhere. **`displayNumber`** — JetBrains Mono, 600, tabular figures, tight tracking; scaled 20–44sp for scores/big stats. Always set `TextStyle(fontFeatureSettings = "tnum")` on numbers.

---

## Shape scale

```kotlin
val TrainShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small      = RoundedCornerShape(8.dp),
    medium     = RoundedCornerShape(12.dp),
    large      = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(28.dp),
)
```

Cards = `large` (16dp). Bottom sheets = `extraLarge` top corners (28dp). Buttons/FAB extended = `full`/pill. FAB = `large` (16dp). Chips = `small` (8dp).

## Spacing

4dp grid: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40. Screen padding 16dp. Card padding 16–20dp. Gaps between cards 12dp.

## Elevation

Mixed (intentional):
- **Content cards** → flat: `Card` with `border = BorderStroke(1.dp, outlineVariant)`, `colors = surface`, **0 elevation**. (This is the calm/flat look.)
- **Emphasis cards** (hero, inline data) → filled: `surfaceContainerHigh`, no border, 0 elevation.
- **Sheets, dialogs, nav bar, FAB** → tonal elevation (M3 surface tint) + the small shadow tokens. FAB uses `primaryContainer`.

---

## Surfaces (8)

Navigation: **bottom `NavigationBar`** with 5 destinations — **Today · Insights · Plan · Body · You**. Active destination shows the M3 pill indicator (`secondaryContainer`). Detail screens (Workout, Onboarding) are pushed routes with a back arrow and **no** bottom bar. A floating quick-log **FAB** appears on Today, Calendar, Nutrition.

### 0. Onboarding — connect watch (`m3-extras.jsx` → `Onboarding`)
Full-screen, no nav bar. 4-step progress bar, centered watch icon in a `primaryContainer` rounded square, headline + body, three provider cards (Garmin connected, Strava, Apple Health) as `Card`s with leading icon + trailing check/chevron, filled "Continue" + text "Skip" at the bottom. Pre-auth flow.

### 1. Today (`m3-today.jsx` → `Today`)
**THE screen.** `SegmentedButton` row toggles **Narrative** (default) ⇄ **Metrics**.
- **Narrative:** filled hero card (Gemini label + narrative bodyLarge + divider + suggested-workout row with sport chip + filled "Schedule" / tonal "Why?" / tonal-icon "swap"). Then a compact readiness card (ScoreRing 78dp + number + chevron). Recovery snapshot (2×2 `SubFactor`). Habits. Check-in (3 sliders). Nutrition + Weight row.
- **Metrics:** big ScoreRing 116dp hero, recovery 2×2 with `7d/14d/28d` segmented, AI workout card, compact narrative, then habits/check-in/nutrition.
- **FAB** "Log" → opens **`ModalBottomSheet`** (Quick log: weight / meal / mood / workout / note).
- Shown in the **device frame** on the canvas (the hero presentation). A separate **light-theme** board shows light support.

### 2. Insights (`m3-insights.jsx` → `Insights`)
Gemini chat. A **collapsible insight group** card (header row toggles `expanded`; collapsed shows 3 status dots) containing Weekly review / HRV anomaly (red inset) / efficiency trend (green inset) cards with sparklines. Below: an example conversation — user bubble (`primary` fill, asymmetric corner) + Gemini response (no bubble) with an **inline data card** (ScoreRing + sparkline). Suggested-prompt cards. A **docked composer** (rounded `surfaceContainerHigh` bar with leading spark icon + "Ask Gemini…" + filled send FAB) pinned above the nav bar.

### 3. Calendar (`m3-calendar.jsx` → `Calendar`)
M3 **`TabRow`** (scrollable): **Day** (default) / Week / Month / Form.
- **Day:** AI focus card (sport icon + title + zone-block structure bar + Start/Move/Swap) + timed plan list.
- **Week:** week-summary card (load bars) + 7 day rows (today highlighted, Start FAB-button on incomplete).
- **Month:** 5×7 grid, sport dot per day, today pill; sport legend.
- **Form:** CTL/ATL/TSB curve + race-readiness projection (ScoreRing).
- **FAB** = add workout.

### 4. Workout detail (`m3-workout.jsx` → `WorkoutEndurance`, `WorkoutStrength`)
Pushed route, top app bar with back. **No bottom nav.**
- **Endurance:** 3 metric tiles + activity chart (HR/Pwr/Both segmented, zone bands) + HR `ZoneStack` + route map card + laps table + segments (PR chips).
- **Strength:** PR spotlight (green filled hero + sparkline) + 3 metric tiles + per-exercise cards with set tables (PR row tinted green) + notes.
- **Open transition:** shared-element / container transform from the calendar/workout list item (see Motion).

### 5. Body trends (`m3-extras.jsx` → `Body`)
Metric selector chips (weight/HRV/RHR/sleep, scrollable `FilterChip` row) → big chart card with the selected metric + `SegmentedButton` timeframe (1M/3M/6M/1Y) → anomaly card (amber inset) → all-metrics 2×2 grid.

### 6. Nutrition (`m3-extras.jsx` → `Nutrition`)
Day-target hero (MacroRing + 3 macro progress bars) + eaten/remaining/burned tiles + today's meals list. **FAB** "Meal" → **`ModalBottomSheet`** add-meal form (name / calories / P/F/C fields).

### 7. Profile & Goals (`m3-extras.jsx` → `Profile`)
Identity card + next-race hero (progress bar) + race calendar list (A/B priority chips) + HR zones (`ZoneStack` + edit) + connections list (Garmin/Strava/Gemini with M3 `Switch`).

---

## Components → Compose mapping

Build these as composables (suggested `ui/components/`). Anatomy is in `m3-primitives.jsx`.

| Prototype          | Compose                                                                 |
|--------------------|-------------------------------------------------------------------------|
| `NavBar`           | `NavigationBar` + `NavigationBarItem` (5 dests, pill indicator)          |
| `Screen` shell     | `Scaffold(bottomBar, floatingActionButton)` + edge-to-edge insets       |
| `Device`           | (presentation only — not needed in app)                                 |
| `AppBarSmall`      | `TopAppBar` / `CenterAlignedTopAppBar`                                   |
| `Segmented`        | `SingleChoiceSegmentedButtonRow` + `SegmentedButton`                     |
| `Tabs`             | `ScrollableTabRow` + `Tab`                                               |
| `Switch`           | `Switch`                                                                 |
| `.btn.filled`      | `Button`                                                                 |
| `.btn.tonal`       | `FilledTonalButton`                                                      |
| `.btn.outlined`    | `OutlinedButton`                                                         |
| `.btn.text`        | `TextButton`                                                             |
| `.btn.icon`        | `IconButton` / `FilledTonalIconButton`                                   |
| `.fab`             | `ExtendedFloatingActionButton` / `FloatingActionButton`                 |
| `.chip` variants   | `AssistChip` / `FilterChip` (+ custom colored containers for good/warn/flag) |
| `.card`            | `Card` (outlined: border + `surface`, 0 elev)                            |
| `.card-filled`     | `Card(colors = surfaceContainerHigh)`                                    |
| `.sheet`           | `ModalBottomSheet`                                                       |
| `.snackbar`        | `Snackbar` / `SnackbarHost`                                              |
| `HabitRow`         | custom `Row` w/ animated checkbox container                             |
| `QuickSlider`      | `Slider` (steps = max) styled, or custom discrete dots                   |
| `ScoreRing`        | `Canvas` arc (animate sweep with `animateFloatAsState`)                  |
| `Sparkline`        | `Canvas` path + gradient fill, or Vico line                              |
| `MacroRing`        | `Canvas` concentric arcs                                                 |
| `ZoneStack`        | `Row` of weighted `Box`es                                                |
| `FormCurve`        | Vico multi-line / `Canvas` paths                                         |
| `SubFactor`        | custom column (label + number + sparkline + delta)                      |
| `SportChip`        | `AssistChip` with tinted container (theme-independent sport color)       |

---

## Motion (spec for Compose)

- **Workout open** → **container transform** (shared bounds) from list item to detail. Use `androidx.compose.animation` shared-element (`SharedTransitionLayout`) or `material-motion` container transform; ~400ms `MotionScheme` emphasized.
- **Today toggle** (Narrative⇄Metrics) → `AnimatedContent` with fade-through (fade + small scale), ~200ms.
- **Bottom sheets** (quick-log, add-meal) → standard `ModalBottomSheet` slide + scrim.
- **FAB** → on scroll down, shrink `ExtendedFloatingActionButton` to icon-only (`expanded = !scrolled`).
- **Insight group collapse** → `animateContentSize()`.
- **List items / cards entrance** → `animateItem()` in `LazyColumn` (placement + fade).
- **Score rings / progress** → animate sweep on first composition (`animateFloatAsState`).
- Respect `MotionScheme` durations; honor reduced-motion (`LocalAccessibilityManager` / system setting).

## Gestures (requested)

- **Pull-to-refresh** (sync watch data) → `PullToRefreshBox` on Today, Calendar, Body. Trigger Garmin/Strava sync; show progress, then snackbar "Synced · 3 new activities".
- **Long-press for quick actions** → on calendar day / workout / habit → `DropdownMenu` (reschedule, swap, mark done, delete).
- **Edge-to-edge + gesture nav insets** → `enableEdgeToEdge()`; pad content with `WindowInsets.safeDrawing`; the bottom nav and FAB respect nav-bar insets; the status bar area uses `statusBars` padding (prototype draws a 36dp status bar — that's the system status bar in the app).
- **Predictive back** → opt in (`android:enableOnBackInvokedCallback="true"`); use `PredictiveBackHandler` so the workout-detail → list back gesture animates the shared transform in reverse.

---

## State management

`ViewModel` per surface, `StateFlow` of a screen UI state, `collectAsStateWithLifecycle()`. Data via repositories over the existing trAIn Firestore backend. Collections (same as the web handoff):

```
users/{uid}                         profile, prefs (todayDefault, calendarView, theme, dynamicColor)
users/{uid}/workouts/{id}           completed (FIT/Strava/manual)
users/{uid}/strengthSessions/{id}   exercises[], sets[]  (NEW)
users/{uid}/recoveryMetrics/{date}  hrv, restingHR, bodyBattery, sleep, mood, energy, stress, weight
users/{uid}/habits/{id} + habitLogs/{date}   (NEW)
users/{uid}/nutrition/{date}        kcal, protein, carbs, fat, meals[]   (NEW)
users/{uid}/trainingPlans/{id}      planned workouts, periodization
users/{uid}/insights/{id}           review | anomaly | trend  (NEW, scheduled)
users/{uid}/chatThreads/{id}/messages   Gemini chat  (NEW)
```

Readiness, TSB/CTL/ATL, TRIMP, workout recommendation, anomaly/trend detection, and the Gemini narrative + chat are server/AI concerns — reuse the existing trAIn services (port the logic to Kotlin, or call them via Cloud Functions). The Gemini voice is **clinical** ("HRV is down 12%; consider Z2.").

---

## Conventions (don't drift)

**Do**
- Use the M3 `ColorScheme` roles for structure; the `TrainColors` extension only for green/amber/red/blue + sport + zones.
- Wire real dynamic color (Android 12+) with the brand scheme as fallback.
- Mono + tabular figures for every earned number.
- One filled `Button` (primary action) per view; everything else tonal/outlined/text.
- 48dp minimum touch targets; honor `safeDrawing` insets everywhere.
- Flat outlined cards for content; tonal surfaces for sheets/dialogs/nav.

**Don't**
- Map brand semantic colors onto `primary`/`error` (dynamic color would eat them).
- Use elevation shadows on content cards (flat + border is the look).
- Use emoji — use the icon set (`MIcon` → Material Symbols / custom vectors).
- Reintroduce glass-morphism.
- Hardcode insets — consume `WindowInsets`.

---

## Suggested build order

1. **Theme** — `ColorScheme` (dark+light+dynamic), `Typography`, `Shapes`, `TrainColors` CompositionLocal. Edge-to-edge `Activity`.
2. **Primitives** — ScoreRing, Sparkline, MacroRing, ZoneStack (Canvas); SportChip, SubFactor, HabitRow, QuickSlider. Build a "gallery" screen to smoke-test.
3. **Scaffold + NavigationBar + NavHost** with the 5 destinations + detail routes.
4. **Today** (both modes + quick-log sheet) — biggest payoff.
5. **Calendar** (4 tabs) and **Workout detail** (+ container-transform open).
6. **Body**, **Nutrition**, **Profile**.
7. **Onboarding** flow.
8. **Insights** (Gemini) last — most net-new backend.

## Assets

No image assets — icons are inline vectors (`MIcon`); map to **Material Symbols** or ship as `ImageVector`s. Fonts: Inter + JetBrains Mono (bundle as resources or use Downloadable Fonts). Route map needs a tile provider (Google Maps Compose / Mapbox); prototype uses a placeholder polyline.
