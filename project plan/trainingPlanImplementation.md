
 ## 🎯 Goal

 Build a `PlanGenerator` module that creates a future 7–10 day training plan dynamically, customized per user state and fatigue.

 ## ✍️ Module Design

 **File:** `src/services/PlanGenerator.ts`

 ### Function: `generatePlan(options: PlanOptions): TrainingPlan[]`

 #### `PlanOptions` includes:

 ```ts
 interface PlanOptions {
   user: {
     age: number;
     sex: 'male' | 'female' | 'other';
     eventDate: string; // ISO format
     trainingDays: number; // 3–5 typically
   };
   recoveryMetrics: {
     bodyBattery: number; // 0–100
     sleepScore: number; // 0–100
     hrv: number; // optional
   };
   recentFatigueScores: number[]; // last 7 days
   recentWorkouts: WorkoutSummary[]; // type, duration, fatigue
 }
 ```

 ### `TrainingPlan[]` output:

 ```ts
 interface TrainingPlan {
   date: string; // YYYY-MM-DD
   workoutType: 'run' | 'bike' | 'strength' | 'brick' | 'mobility' | 'rest';
   description: string;
   expectedFatigue: number; // 0–100
   durationMin: number;
 }
 ```

 ## 📊 Logic Rules

 * Estimate current load trend via `rollingAverage(recentFatigueScores)`
 * Schedule no more than **2 hard workouts** (fatigue  60) in 7 days
 * Don’t schedule hard days back-to-back
 * Insert at least **1 full recovery day**
 * If recovery markers (sleep/body battery) are high, allow a harder session
 * Favor Zone 2 workouts during fatigue recovery
 * Use proximity to race (`eventDate`) to taper volume over time

 ### Suggested Workouts (use as presets):

 * Easy Run: 30–40 min, fatigue 45
 * Brick: Bike 25 + Run 10, fatigue 65
 * Strength + Core: 30 min, fatigue 30
 * Endurance Ride: 45 min, fatigue 55
 * Recovery Yoga: 20 min, fatigue 10
 * Rest Day: fatigue 0

 ## 🧪 Testing

 Create test cases with sample inputs for:

 * User with high fatigue and low recovery
 * User with low fatigue and high body battery
 * Upcoming race in < 6 weeks vs  12 weeks

 ## ✅ Output

 * The function returns an array of 7–10 scheduled workout days
 * Each plan item includes date, type, description, and expected fatigue
 * Ensure total weekly fatigue stays within 10–15% of recent average unless recovering

 ## 🛠️ Extras

 (Optional) Add an export function to dump the plan as CSV or JSON for spreadsheet import

 ```ts
 exportPlanToCSV(plan: TrainingPlan[]): string
 ```
