// Enhanced types for integrated workout tracking (planned vs actual)
import { ActivityMetrics, LapMetrics, TrainingPlan } from './training-metrics.types';

// Workout completion status
export type WorkoutStatus = 'planned' | 'completed' | 'missed' | 'unplanned';

// Enhanced training plan with actual workout data
export interface TrackedWorkout extends TrainingPlan {
  // Actual workout data (when completed)
  actualWorkout?: ActivityMetrics;
  actualLaps?: LapMetrics[];
  
  // Workout status and metadata
  status: WorkoutStatus;
  completedAt?: string; // ISO timestamp when workout was completed
  uploadedAt?: string; // When FIT file was uploaded
  
  // Comparison metrics
  comparison?: WorkoutComparison;
  
  // User feedback
  userNotes?: string;
  userRating?: number; // 1-5 rating of how the workout felt
}

// Detailed comparison between planned and actual workout
export interface WorkoutComparison {
  // Duration comparison
  durationVariance: {
    planned: number; // minutes
    actual: number; // minutes
    difference: number; // actual - planned
    percentageChange: number; // (actual - planned) / planned * 100
  };
  
  // Intensity comparison
  intensityVariance: {
    plannedFatigue: number; // 0-100
    actualFatigue: number; // calculated from actual workout
    difference: number;
    zoneCompliance: ZoneCompliance;
  };
  
  // Performance metrics
  performance: {
    trainingLoadVariance: number; // actual - planned TRIMP
    hrDrift?: number; // actual HR drift percentage
    paceConsistency?: number; // coefficient of variation for pace
    powerConsistency?: number; // for cycling workouts
  };
  
  // Overall assessment
  adherence: {
    score: number; // 0-100 overall adherence score
    category: 'excellent' | 'good' | 'fair' | 'poor';
    feedback: string[]; // Generated feedback messages
  };
}

// HR Zone compliance analysis
export interface ZoneCompliance {
  plannedZones: {
    zone1: number; // planned minutes
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
  actualZones: {
    zone1: number; // actual minutes
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
  compliance: {
    zone1Variance: number; // actual - planned
    zone2Variance: number;
    zone3Variance: number;
    zone4Variance: number;
    zone5Variance: number;
    overallCompliance: number; // 0-100 percentage
  };
}

// Weekly/monthly training summary with planned vs actual
export interface TrainingPeriodSummary {
  startDate: string;
  endDate: string;
  
  // Planned metrics
  planned: {
    totalWorkouts: number;
    totalDuration: number; // minutes
    totalTrainingLoad: number;
    workoutsByType: Record<string, number>;
  };
  
  // Actual metrics
  actual: {
    completedWorkouts: number;
    totalDuration: number; // minutes
    totalTrainingLoad: number;
    workoutsByType: Record<string, number>;
  };
  
  // Comparison and adherence
  adherence: {
    completionRate: number; // completed / planned * 100
    durationAdherence: number; // actual / planned duration * 100
    loadAdherence: number; // actual / planned load * 100
    overallScore: number; // weighted adherence score
  };
  
  // Trends and insights
  insights: {
    consistencyScore: number; // how consistently workouts were completed
    intensityTrend: 'increasing' | 'decreasing' | 'stable';
    recommendations: string[];
    warnings: string[];
  };
}

// Workout matching configuration and results
export interface WorkoutMatchingConfig {
  dateToleranceDays: number; // how many days before/after to search
  typeMatchWeight: number; // importance of workout type matching
  durationMatchWeight: number; // importance of duration matching
  autoMatchEnabled: boolean; // whether to auto-match on upload
}

export interface WorkoutMatchResult {
  fitFile: {
    fileName: string;
    activityData: ActivityMetrics;
    lapData: LapMetrics[];
  };
  
  matches: {
    plannedWorkout: TrainingPlan;
    confidence: number; // 0-100 confidence score
    matchReasons: string[]; // why this match was suggested
  }[];
  
  recommendation: {
    bestMatch?: TrainingPlan;
    confidence: number;
    shouldAutoMatch: boolean;
    alternatives: TrainingPlan[];
  };
}

// Plan adherence analytics
export interface PlanAdherenceAnalytics {
  timeframe: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  
  // Overall metrics
  overview: {
    totalPlannedWorkouts: number;
    totalCompletedWorkouts: number;
    totalMissedWorkouts: number;
    totalUnplannedWorkouts: number;
    completionRate: number; // completed / planned * 100
  };
  
  // Detailed breakdowns
  byWorkoutType: Record<string, {
    planned: number;
    completed: number;
    completionRate: number;
  }>;
  
  byWeekday: Record<string, {
    planned: number;
    completed: number;
    completionRate: number;
  }>;
  
  // Performance trends
  trends: {
    weeklyCompletionRates: number[]; // completion rate by week
    loadAdherence: number[]; // load adherence by week
    consistencyTrend: 'improving' | 'stable' | 'declining';
  };
  
  // Insights and recommendations
  insights: {
    bestCompletionDay: string; // day of week with highest completion rate
    worstCompletionDay: string; // day of week with lowest completion rate
    averageLoadVariance: number; // average difference between planned and actual load
    recommendations: string[];
    concerns: string[];
  };
}

// Calendar view configuration
export interface CalendarViewConfig {
  viewType: 'week' | 'month' | 'day';
  startDate: string;
  showPlannedOnly: boolean;
  showActualOnly: boolean;
  showComparison: boolean; // show planned vs actual side by side
  highlightAdherence: boolean; // color code based on adherence
}

// Training hub state management
export interface TrainingHubState {
  // Current view settings
  calendar: CalendarViewConfig;
  selectedWorkout?: TrackedWorkout;
  selectedDate?: string;
  
  // Data
  trackedWorkouts: TrackedWorkout[];
  periodSummary?: TrainingPeriodSummary;
  adherenceAnalytics?: PlanAdherenceAnalytics;
  
  // UI state
  isLoading: boolean;
  lastUpdated?: string;
  errors: string[];
  notifications: string[];
}

// Export interfaces for backward compatibility
export type { ActivityMetrics, LapMetrics, TrainingPlan } from './training-metrics.types';