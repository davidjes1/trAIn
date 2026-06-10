# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**trAIn** is a native **Android** app (Kotlin + Jetpack Compose + Material 3) — a daily
training / recovery / readiness companion. It is a from-scratch rebuild of a former web app
(now archived in `legacy/`).

- **Source of truth for health data:** Google **Health Connect** (HR, HRV, resting HR, sleep,
  workouts/exercise sessions, weight, distance, calories, nutrition). Never duplicate health
  data into Room.
- **App-specific data:** local **Room** DB (training plans, habits, nutrition meals, insights,
  Gemini chat) + **DataStore** (profile/prefs). Repositories abstract both so a Firebase
  cloud-sync backend can be added later without changing screens.
- **AI:** on-device **Gemini Nano** (ML Kit GenAI / AICore) for narrative + chat, with a
  deterministic clinical-voice fallback (`domain/ai/NarrativeGenerator`) on unsupported devices.
- **Design:** follow `design_handoff_train_mobile_compose/` exactly (M3, dark-default, dynamic
  color with the brand scheme as fallback; Inter + JetBrains Mono tabular numerics; flat
  outlined cards for content, filled `surfaceContainerHigh` for emphasis; brand-semantic colors
  via `LocalTrainColors`, never mapped onto `primary`/`error`).

## Build / test

JDK 17 + Android SDK 35 required (compileSdk/targetSdk 35, minSdk 28). Open in Android Studio;
first sync generates the wrapper jar. Then:

```bash
./gradlew assembleDebug
./gradlew testDebugUnitTest   # pure-Kotlin training-math tests, no device
```

Versions are centralized in `gradle/libs.versions.toml`. No build has been run in this
environment — there is no JDK/SDK here, so write build-ready code rather than compiling.

## Conventions

- `ViewModel` + `StateFlow` + `collectAsStateWithLifecycle()`; one Compose `Scaffold` per screen
  via `ui/components/TrainScreenScaffold` (handles insets + shared bottom nav).
- Pure, testable training logic in `domain/training/` (TRIMP/Banister, CTL 42d / ATL 7d EWMA →
  TSB, HR-reserve zones, weighted readiness, phase-aware recommender, periodized plan generator).
- Icons map to Material Symbols via `ui/components/TrainIcons` (swap there to rebrand). Data-viz
  is hand-drawn on `Canvas`.
- Edge-to-edge everywhere; consume `WindowInsets` (never hardcode). 48dp min touch targets.
- No emoji in UI; no glass-morphism; one filled `Button` (primary action) per view.

## Layout

See `README.md` for the full module map and current build status. Screens currently built:
**Today** (fully wired). Insights/Plan/Body/Profile/Nutrition/Workout/Onboarding are navigable
stubs to be built out next, in the handoff's suggested order.
