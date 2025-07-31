Creating **dynamic workout suggestions**—especially for endurance and triathlon training—requires blending structured logic with adaptive rules based on the user’s recent training and recovery status. Here's a breakdown of the **core logic flow** you’d implement in code to generate personalized, daily workouts.

---

## 🧠 Step-by-Step Logic for Dynamic Workout Suggestion

### 1. ✅ **Collect Input Data**

Pull all the necessary variables:

```ts
type UserState = {
  eventDate: string;
  trainingDaysPerWeek: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  fatigueHistory: number[]; // last 7 days
  recentWorkouts: WorkoutSummary[];
  recovery: {
    bodyBattery: number;
    sleepScore: number;
    hrv: number;
  };
  availabilityToday: boolean;
};
```

---

### 2. 📈 **Determine Current Training Load + Readiness**

#### a. Calculate rolling fatigue average:

```ts
const fatigue7DayAvg = average(fatigueHistory);
```

#### b. Calculate readiness score (example):

```ts
const readinessScore =
  (recovery.bodyBattery + recovery.sleepScore + recovery.hrv) / 3;
```

Use that to assign one of the following levels:

| Readiness Score | Level        |
| --------------- | ------------ |
| 80–100          | Very Ready   |
| 60–79           | Ready        |
| 40–59           | Caution      |
| < 40            | Recover Only |

---

### 3. 🎯 **Define Workout Pool**

Predefine modular workout types categorized by:

* Workout type (`bike`, `run`, `brick`, `strength`, `mobility`, `rest`)
* Base duration
* Fatigue estimate
* Recovery needs
* Tags (aerobic, anaerobic, mobility, intensity)

Example:

```ts
const workoutLibrary: WorkoutType[] = [
  {
    type: 'bike',
    tag: 'zone2',
    description: 'Easy ride, build aerobic base',
    durationMin: 40,
    fatigueScore: 45,
    recoveryImpact: 'low',
  },
  {
    type: 'run',
    tag: 'strides',
    description: '30 min easy with 4x20s strides',
    durationMin: 35,
    fatigueScore: 50,
    recoveryImpact: 'medium',
  },
  {
    type: 'brick',
    tag: 'combo',
    description: '25 min ride + 10 min run (race sim)',
    durationMin: 40,
    fatigueScore: 65,
    recoveryImpact: 'high',
  },
  {
    type: 'rest',
    tag: 'recovery',
    description: 'Rest or gentle walk',
    durationMin: 0,
    fatigueScore: 0,
    recoveryImpact: 'restorative',
  }
];
```

---

### 4. 🧠 **Decision Engine**

Using your computed `readinessScore` and weekly training load, follow decision rules:

```ts
function suggestWorkout(user: UserState): WorkoutType {
  const fatigueAvg = average(user.fatigueHistory);
  const readiness = (user.recovery.bodyBattery + user.recovery.sleepScore + user.recovery.hrv) / 3;
  const daysUntilRace = getDaysUntil(user.eventDate);
  const recentHardDay = user.recentWorkouts.slice(-1)[0]?.fatigue > 60;

  if (!user.availabilityToday) return getWorkout('rest');

  if (readiness < 40 || fatigueAvg > 55) {
    return getWorkout('mobility') ?? getWorkout('rest');
  }

  if (recentHardDay) {
    return getWorkout('strength') ?? getWorkout('run', 'zone2');
  }

  if (readiness > 80 && fatigueAvg < 50) {
    return getWorkout('brick') ?? getWorkout('run', 'strides');
  }

  return getWorkout('run', 'zone2') ?? getWorkout('bike', 'zone2');
}
```

---

### 5. 🧪 **Customize Based on Weekly Distribution**

Make sure this week hasn’t already exceeded planned hard efforts or training days:

```ts
// limit to 2 high-fatigue sessions per week
const numHardDays = user.recentWorkouts.filter(w => w.fatigue > 60).length;
if (numHardDays >= 2) {
  return getWorkout('strength') ?? getWorkout('run', 'zone2');
}
```

---

### 6. 📅 **Plan Generation Loop**

When building a 7–10 day plan:

```ts
for (let day = 0; day < 10; day++) {
  const simulatedUserState = updateUserStateBasedOnPreviousDay();
  const suggested = suggestWorkout(simulatedUserState);
  addToPlan(suggested, targetDate);
}
```

---

## ✅ Summary of Logical Components

| Component          | Purpose                                    |
| ------------------ | ------------------------------------------ |
| Fatigue history    | Controls volume progression                |
| Recovery metrics   | Adjusts intensity suggestions              |
| Readiness scoring  | Determines if it’s safe to train hard      |
| Recent hard days   | Prevents overtraining                      |
| Workout tags       | Enable goal-based targeting (e.g. aerobic) |
| Training day count | Ensures user doesn’t exceed allowed days   |
| Time-to-race       | Enables tapering logic                     |

---

Would you like me to:

* Generate the actual TypeScript `suggestWorkout()` logic?
* Turn this into a full `PlanGenerator.ts` scaffold?
* Output sample JSON-based plan from this engine?

Let me know how deep you'd like to go.
