* 🗓️ **Year-long periodized plans** for building toward a key race
* 📦 **Focused blocks** like 4–8 week base, build, taper, or recovery phases

But to make it **truly scalable and structured** across different time horizons, you'll need to introduce a layer of **training periodization** and macro/microcycle control on top of the day-by-day suggestion logic.

---

## 🧱 Architecture for Supporting All Training Durations

### 🔁 1. **Layered Planning System**

| Level         | Scope         | Purpose                                             |
| ------------- | ------------- | --------------------------------------------------- |
| 🧭 Macrocycle | \~6–12 months | Overall goal: base → build → taper → peak → recover |
| 🔁 Mesocycle  | 3–6 weeks     | Focused blocks like aerobic base, threshold, VO2max |
| 🔂 Microcycle | 7–10 days     | Week-to-week planning, day-to-day adjustments       |
| 🧍 Daily Plan | Single day    | Workout choice, adjusted for fatigue/readiness      |

---

### 📘 2. Define Training Phases (Macro → Micro)

For example, a **12-month macrocycle** might look like this:

| Block       | Duration  | Focus              | Typical Workouts                 |
| ----------- | --------- | ------------------ | -------------------------------- |
| Prep/Base I | 8 weeks   | Zone 2 aerobic     | Long rides/runs, low intensity   |
| Base II     | 8 weeks   | Aerobic + strength | Longer bricks, hills             |
| Build I     | 6 weeks   | Threshold focus    | Strides, intervals, tempo runs   |
| Build II    | 6 weeks   | Power + endurance  | Long bricks, tempo + ride        |
| Peak        | 2–4 weeks | Race simulation    | Race pace efforts, taper start   |
| Taper       | 2 weeks   | Freshening up      | Short, race-specific, light load |
| Race        | 1 week    | Race + recover     | Travel, light spin, race         |
| Recovery    | 1–2 weeks | Full rest / Z1     | Walks, yoga, sleep, no load      |

---

### ⚙️ 3. Modify `PlanGenerator` with Phase Awareness

Update `PlanOptions` to include a **phase** field or a target `periodizationTemplate`:

```ts
interface PlanOptions {
  // ...
  phase: 'base' | 'build' | 'peak' | 'taper' | 'recovery';
  startDate: string;
  endDate: string;
  blockLengthDays: number;
}
```

Then inject **phase-specific logic** into your workout suggestion function:

```ts
function getSuggestedWorkoutForPhase(phase: string, readiness: number): WorkoutType {
  if (phase === 'base') return getWorkout('bike', 'zone2');
  if (phase === 'build' && readiness > 70) return getWorkout('run', 'threshold');
  if (phase === 'taper') return getWorkout('run', 'strides');
  if (phase === 'recovery') return getWorkout('mobility');
  return getWorkout('rest');
}
```

---

### 🧠 4. Use a Simple Scheduling Heuristic

For each 7-day microcycle, use a **basic template** appropriate to the phase:

```ts
const baseWeek = ['run', 'bike', 'rest', 'run', 'strength', 'bike', 'mobility'];
const buildWeek = ['run', 'strength', 'bike', 'brick', 'rest', 'run', 'yoga'];
const taperWeek = ['rest', 'run', 'bike', 'rest', 'brick', 'mobility', 'rest'];
```

The plan generator then matches this against:

* Day-of-week preference
* Fatigue & readiness
* Recent intensity

---

### ✅ How to Support:

| Duration             | Strategy                                                         |
| -------------------- | ---------------------------------------------------------------- |
| **4-week focus**     | Use one mesocycle phase with defined goals                       |
| **8-week block**     | Combine two focused mesocycles (e.g., base + build)              |
| **12-month plan**    | Stitch together 6–8 mesocycles, each with its own goal and logic |
| **Race-timed taper** | Auto-switch phase logic when within `X` days of race             |

---

## 🚀 Next Steps (Your App Roadmap)

1. ✅ **Add periodization options** to `PlanOptions`
2. ✅ Predefine common **mesocycle templates** (4–8 weeks)
3. ✅ Let the user select “duration” (e.g. 4 weeks, full year)
4. 🔁 Automate the rotation of training phases across that duration
5. 🎯 Integrate with calendar export, spreadsheet sync, or dashboard view
