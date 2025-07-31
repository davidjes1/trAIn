// TypeScript interfaces for training metrics and analysis

export interface ActivityMetrics {
  // Basic activity info
  date: string; // ISO date string
  activityId?: string;
  sport: string;
  subSport?: string;
  
  // Duration and distance
  duration: number; // minutes
  distance: number; // km
  
  // Heart rate metrics
  avgHR?: number;
  maxHR?: number;
  hrDrift?: number; // % change from first to last third
  
  // HR Zone distribution (minutes in each zone)
  zone1Minutes: number;
  zone2Minutes: number;
  zone3Minutes: number;
  zone4Minutes: number;
  zone5Minutes: number;
  
  // Training load
  trainingLoad: number; // TRIMP score
  
  // Additional metrics
  calories?: number;
  totalAscent?: number; // meters
  totalDescent?: number; // meters
  avgSpeed?: number; // km/h
  maxSpeed?: number; // km/h
  avgPace?: number; // min/km (for running)
  
  // Metadata
  notes?: string;
  fileName?: string; // Source JSON file
}

export interface LapMetrics {
  // Activity reference
  date: string; // Parent activity date
  activityId?: string;
  
  // Lap info
  lapNumber: number;
  lapDuration: number; // minutes
  lapDistance: number; // km
  
  // Performance metrics
  avgHR?: number;
  maxHR?: number;
  avgSpeed?: number; // km/h
  maxSpeed?: number; // km/h
  avgPace?: number; // min/km (for running)
  
  // Elevation
  elevationGain?: number; // meters
  elevationLoss?: number; // meters
  
  // Power (for cycling)
  avgPower?: number;
  maxPower?: number;
  normalizedPower?: number;
  
  // Timestamps
  startTime?: Date;
  endTime?: Date;
  
  // Split type
  splitType?: 'manual' | 'auto' | 'distance' | 'time';
}

export interface HRZoneDistribution {
  zone1: number; // minutes
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
  totalTime: number;
}

export interface PaceAnalysis {
  avgPace: number; // min/km
  bestPace: number; // min/km
  paceVariability: number; // coefficient of variation
  negativeSplit: boolean; // faster in second half
}

export interface PowerAnalysis {
  avgPower: number;
  maxPower: number;
  normalizedPower: number;
  intensityFactor: number;
  trainingStressScore: number;
}

export interface ProcessingResult {
  activitiesProcessed: number;
  activitiesSkipped: number;
  totalActivities: ActivityMetrics[];
  totalLaps: LapMetrics[];
  errors: string[];
  processingTimeMs: number;
}

// Note: Google Sheets integration removed - these types have been deprecated

export interface BatchProcessingOptions {
  inputDirectory?: string;
  filePattern?: string;
  maxFiles?: number;
  skipExisting?: boolean;
  validateData?: boolean;
}

// Note: GoogleSheetsConfig removed - Firebase configuration will replace this

// Chart configuration for Google Sheets
export interface ChartConfig {
  title: string;
  chartType: 'LINE' | 'COLUMN' | 'PIE' | 'SCATTER';
  dataRange: string;
  position: {
    sheetId: number;
    row: number;
    column: number;
  };
}

export interface WeeklyTrainingLoadChart extends ChartConfig {
  chartType: 'LINE';
  title: 'Weekly Training Load';
}

export interface HRZoneDistributionChart extends ChartConfig {
  chartType: 'PIE';
  title: 'HR Zone Distribution';
}

export interface LapHRPaceChart extends ChartConfig {
  chartType: 'SCATTER';
  title: 'Lap HR vs Pace Analysis';
}

// Training Plan Types
export type TrainingPhase = 'base' | 'build' | 'peak' | 'taper' | 'recovery';
export type WorkoutTypeTag = 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5' | 'strength' | 'mobility' | 'brick' | 'strides' | 'threshold' | 'intervals';
export type RecoveryImpact = 'restorative' | 'low' | 'medium' | 'high';

export interface WorkoutType {
  type: 'run' | 'bike' | 'strength' | 'brick' | 'mobility' | 'rest' | 'swim';
  tag: WorkoutTypeTag;
  description: string;
  durationMin: number;
  fatigueScore: number; // 0-100
  recoveryImpact: RecoveryImpact;
  phase?: TrainingPhase; // Optional phase restriction
}

export interface TrainingPlan {
  date: string; // YYYY-MM-DD
  workoutType: string;
  description: string;
  expectedFatigue: number; // 0-100
  durationMin: number;
  workoutId?: string; // Reference to WorkoutType
  completed?: boolean;
  actualFatigue?: number; // Post-workout fatigue
}

export interface PlanOptions {
  user: {
    age: number;
    sex: 'male' | 'female' | 'other';
    eventDate: string; // ISO format
    trainingDays: number; // 3-7 typically
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  recoveryMetrics: {
    bodyBattery?: number; // 0-100
    sleepScore?: number; // 0-100  
    hrv?: number; // optional
    restingHR?: number;
  };
  recentFatigueScores: number[]; // last 7 days
  recentWorkouts: WorkoutSummary[];
  planDuration: number; // days (7-10 typically)
  currentPhase?: TrainingPhase;
  availabilityToday?: boolean;
}

export interface WorkoutSummary {
  date: string;
  type: string;
  duration: number; // minutes
  fatigue: number; // 0-100
  trainingLoad?: number;
}

export interface Mesocycle {
  name: string;
  phase: TrainingPhase;
  weeks: number;
  goal: string;
  template: string[]; // day-by-day workout types (7 days)
  volumeMultiplier?: number; // Adjust base volume
  intensityMultiplier?: number; // Adjust intensity
}

export interface MacroPlan {
  startDate: string; // ISO format
  eventDate: string; // Target race/event date
  mesocycles: Mesocycle[];
  athlete: {
    name?: string;
    age: number;
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface ReadinessMetrics {
  score: number; // 0-100 overall readiness
  fatigue7DayAvg: number;
  recoveryScore: number;
  trainingLoad7Day: number;
  daysUntilRace?: number;
  recentHardDays: number; // Count of high-fatigue workouts in last 7 days
}

export interface PlanGenerationResult {
  plan: TrainingPlan[];
  readinessMetrics: ReadinessMetrics;
  recommendations: string[];
  warnings: string[];
  generatedAt: string; // ISO timestamp
}

// Dynamic Plan Adjustment Types
export type WorkoutModificationType = 'change-to-rest' | 'change-workout-type' | 'adjust-duration' | 'adjust-intensity';

export interface WorkoutModification {
  date: string; // YYYY-MM-DD
  type: WorkoutModificationType;
  reason?: string;
  originalWorkout: TrainingPlan;
  newWorkout: Partial<TrainingPlan>;
  timestamp: string; // When modification was made
}

export interface PlanAdjustmentOptions {
  redistributeLoad: boolean; // Whether to redistribute training load to other days
  maintainWeeklyVolume: boolean; // Try to keep weekly training volume similar
  preserveHardDays: boolean; // Don't move high-intensity workouts
  maxDailyFatigueIncrease: number; // Maximum fatigue increase per day (0-20)
}

export interface PlanAdjustmentResult {
  success: boolean;
  adjustedPlan: TrainingPlan[];
  modifications: WorkoutModification[];
  impactSummary: {
    daysAffected: number;
    totalLoadChange: number;
    weeklyVolumeChange: number;
  };
  warnings: string[];
  recommendations: string[];
}