---

## ✅ 1. JSON Config Template for Periodized Plans (4–12 weeks or longer)

This defines each **mesocycle block** with goal, duration, and default weekly template:

```json
{
  "macroPlan": {
    "eventDate": "2026-06-06",
    "startDate": "2025-08-01",
    "mesocycles": [
      {
        "name": "Base I",
        "phase": "base",
        "weeks": 4,
        "goal": "Build aerobic endurance",
        "template": ["bike", "run", "rest", "strength", "bike", "run", "mobility"]
      },
      {
        "name": "Base II",
        "phase": "base",
        "weeks": 4,
        "goal": "Add strength & brick training",
        "template": ["run", "bike", "strength", "brick", "rest", "run", "yoga"]
      },
      {
        "name": "Build I",
        "phase": "build",
        "weeks": 4,
        "goal": "Threshold development & speed",
        "template": ["run", "brick", "bike", "rest", "run", "strength", "yoga"]
      },
      {
        "name": "Peak",
        "phase": "peak",
        "weeks": 2,
        "goal": "Race simulation & taper start",
        "template": ["brick", "run", "rest", "bike", "mobility", "run", "rest"]
      },
      {
        "name": "Taper",
        "phase": "taper",
        "weeks": 2,
        "goal": "Freshen legs & recovery",
        "template": ["rest", "run", "bike", "rest", "brick", "mobility", "rest"]
      }
    ]
  }
}
```

---

## ✅ 2. TypeScript Scaffolding for a Macro + Mesocycle-Aware Plan Generator

### Interfaces

```ts
type TrainingPhase = 'base' | 'build' | 'peak' | 'taper' | 'recovery';

interface Mesocycle {
  name: string;
  phase: TrainingPhase;
  weeks: number;
  goal: string;
  template: string[]; // day-by-day workout types
}

interface MacroPlan {
  startDate: string;
  eventDate: string;
  mesocycles: Mesocycle[];
}

interface DailyWorkout {
  date: string;
  workoutType: string;
  description: string;
  fatigueEstimate: number;
  durationMin: number;
}
```

---

### Plan Generator Function

```ts
function generateStructuredPlan(plan: MacroPlan): DailyWorkout[] {
  const planStart = new Date(plan.startDate);
  const workouts: DailyWorkout[] = [];
  let currentDate = new Date(planStart);

  for (const block of plan.mesocycles) {
    for (let week = 0; week < block.weeks; week++) {
      for (let day = 0; day < 7; day++) {
        const workoutType = block.template[day] || 'rest';
        const description = getWorkoutDescription(workoutType, block.phase);
        const fatigue = getFatigueEstimate(workoutType, block.phase);
        const duration = getDuration(workoutType, block.phase);

        workouts.push({
          date: formatDate(currentDate),
          workoutType,
          description,
          fatigueEstimate: fatigue,
          durationMin: duration
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  return workouts;
}
```

You’d define `getWorkoutDescription()`, `getFatigueEstimate()` and `getDuration()` to adapt values per phase and type.

---

## ✅ 3. Sample Export-Ready Plan (12 Weeks)

Here are a few rows from a generated 12-week sprint triathlon build plan:

| Date       | Workout Type | Description                     | Duration | Fatigue |
| ---------- | ------------ | ------------------------------- | -------- | ------- |
| 2025-08-01 | Bike         | Zone 2 aerobic ride             | 40 min   | 45      |
| 2025-08-02 | Run          | Easy run, build base            | 35 min   | 45      |
| 2025-08-03 | Rest         | Recovery/rest day               | 0        | 0       |
| 2025-08-04 | Strength     | Core + bodyweight focus         | 30 min   | 30      |
| 2025-08-05 | Bike         | Zone 2 ride                     | 45 min   | 45      |
| 2025-08-06 | Run          | Easy run + strides              | 40 min   | 50      |
| 2025-08-07 | Mobility     | Stretching or yoga for recovery | 20 min   | 10      |

> Export this to CSV, Google Sheets, or use it to generate calendar data in your app.

---
