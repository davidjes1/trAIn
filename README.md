# trAIn — Android (Kotlin + Jetpack Compose)

A mobile-first, native Android rebuild of trAIn: a daily training / recovery / readiness
companion. **Health Connect is the source of truth** for health & workout data; app-specific
data (plans, habits, nutrition, insights, chat) lives in a local **Room** database. On-device
**Gemini Nano** powers AI narrative/insights, with a deterministic clinical-voice fallback on
unsupported devices.

Built to the spec in [`design_handoff_train_mobile_compose/`](design_handoff_train_mobile_compose/README.md)
(Material 3, dark-default, Inter + JetBrains Mono, the calm Whoop/Linear feel).

---

## Toolchain

There is **no committed Gradle wrapper jar** and the project has not been compiled here. To build:

1. Install **Android Studio** (Ladybug or newer) and a **JDK 17**.
2. Install the **Android SDK** (compileSdk/targetSdk **35**, minSdk **28**).
3. Open the repo root in Android Studio. On first sync it generates `gradle/wrapper/gradle-wrapper.jar`
   (or run `gradle wrapper` if you have a system Gradle).
4. Let Gradle sync, then **Run** on a device/emulator (API 28+). For Health Connect data, use a
   device with the **Health Connect** app and some recorded data; for **Gemini Nano**, a supported
   device (Pixel 8/9, some Galaxy S24+) — otherwise the rule-based fallback is used.

```bash
./gradlew assembleDebug      # build
./gradlew testDebugUnitTest  # run domain unit tests (no device needed)
./gradlew installDebug       # install on a connected device
```

### Fonts caveat
Inter & JetBrains Mono load via **Downloadable Google Fonts**. `app/src/main/res/values/font_certs.xml`
ships a placeholder cert array — if the fonts don't render, regenerate it via Android Studio's
*New → Downloadable Font* dialog (it inserts the canonical certs). Until then Compose falls back to
the system sans/mono (no crash).

---

## Architecture

```
app/src/main/java/com/davidjes/train/
├── MainActivity.kt            edge-to-edge host
├── TrainApp.kt                @HiltAndroidApp
├── ui/
│   ├── theme/                 Color (M3 + TrainColors), Type, Shape, Dimens, Theme (dynamic color)
│   ├── components/            Canvas primitives (ScoreRing, Sparkline, MacroRing, ZoneStack…),
│   │                          cards, SportChip, SubFactor, HabitRow, QuickSlider, TrainIcons
│   ├── navigation/            5 bottom destinations + detail routes, NavHost, NavigationBar
│   ├── today/ insights/ plan/ body/ profile/ nutrition/ workout/ onboarding/   screens
│   └── health/                Health Connect permission launcher
├── domain/
│   ├── model/                 pure data (Profile, Workout, Recovery, Plan, Insight, Nutrition…)
│   ├── training/              TRIMP, CTL/ATL/TSB, ZoneCalculator, Readiness, Recommender,
│   │                          PlanGenerator, FatigueMonitor   (pure Kotlin, unit-tested)
│   └── ai/                    NarrativeGenerator (clinical-voice fallback / Gemini grounding)
├── data/
│   ├── health/                HealthConnectManager (+ mapper) — the source of truth
│   ├── local/                 Room entities, DAOs, TrainDatabase
│   ├── prefs/                 ProfileRepository (DataStore)
│   └── repository/            Workout / Recovery / Plan / Habit / Nutrition / Insight repos
└── di/                        Hilt modules
```

**State:** `ViewModel` + `StateFlow` + `collectAsStateWithLifecycle()`. Repositories abstract the
data sources, so a Firebase cloud-sync backend can be added later without touching the screens.

**Training science:** TRIMP (Banister), CTL (42-day) / ATL (7-day) EWMA → TSB, HR-reserve zones,
a weighted multi-factor readiness score, a phase-aware dynamic workout recommender, and a
periodized macro→meso→micro plan generator. See `domain/training/`.

---

## Status

| Area | State |
|------|-------|
| Project scaffold, Gradle, manifest, Hilt | ✅ |
| Theme / design tokens / typography / shapes / dynamic color | ✅ |
| Canvas primitives + cards + icon set | ✅ |
| Navigation (5 destinations + detail routes) | ✅ |
| Domain models + training-science engine | ✅ (with unit tests) |
| Data layer: Health Connect + Room + repositories | ✅ |
| **Today** (Narrative/Metrics, recovery, habits, check-in, nutrition, quick-log, HC permission gate) | ✅ wired |
| **Plan/Calendar** (Day/Week/Month/Form) + **Workout detail** (endurance) | ✅ wired |
| **Body** (metric chips, chart, anomaly, grid) · **Nutrition** (macros, meals, add-meal) | ✅ wired |
| **Profile** (identity, race, HR zones, connections) · **Onboarding** (HC permission flow) | ✅ wired |
| **Insights** (collapsible insight cards, Gemini chat, suggested prompts, composer) | ✅ wired |
| AI: deterministic `InsightsEngine` + grounded rule-based `GeminiService` | ✅ |
| On-device **Gemini Nano** model binding (Google AI Edge / AICore) | 🟡 documented extension point (`AiModule` / `GeminiService`) — needs a supported device |

The old web/TypeScript app is archived under [`legacy/`](legacy/).
