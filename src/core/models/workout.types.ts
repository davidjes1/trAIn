// Unified Workout Management Types for trAIn
// Consolidates types from workout.types.ts and workout-tracking.types.ts

// ============================================================================
// CORE TYPES
// ============================================================================

export type SportType = 'run' | 'bike' | 'swim' | 'strength' | 'yoga' | 'other';

// Single source of truth for workout status
export type WorkoutStatus = 'planned' | 'completed' | 'missed' | 'unplanned';

export interface HRZone {
  zone: number; // 1-5
  minutes: number;
  percentage?: number;
}

// ============================================================================
// WORKOUT SEGMENTS
// ============================================================================

export type SegmentType =
  | 'warmup'
  | 'cooldown'
  | 'interval'
  | 'tempo'
  | 'recovery'
  | 'strength_set'
  | 'stretch'
  | 'rest'
  | 'custom';

export type SegmentMeasurement =
  | 'time'      // Duration-based (minutes/seconds)
  | 'distance'  // Distance-based (km/miles)
  | 'reps'      // Repetition-based (strength training)
  | 'rounds'    // Round-based (circuits)
  | 'calories'  // Calorie-based targets
  | 'custom';   // Custom measurement

// Base segment interface - all segments inherit from this
export interface BaseWorkoutSegment {
  id: string;
  name: string;
  type: SegmentType;
  measurement: SegmentMeasurement;
  description?: string;
  notes?: string;
  order: number; // Sequence in workout
}

// Time-based segments (running intervals, bike tempo, etc.)
export interface TimeBasedSegment extends BaseWorkoutSegment {
  measurement: 'time';
  durationMin: number;
  durationSec?: number; // For precise timing
  targetHR?: number;
  targetHRZone?: number; // 1-5
  targetPace?: string; // MM:SS per km
  targetPower?: number;
  targetRPE?: number; // Rate of Perceived Exertion 1-10
  restAfterMin?: number; // Rest period after this segment
}

// Distance-based segments
export interface DistanceBasedSegment extends BaseWorkoutSegment {
  measurement: 'distance';
  distanceKm: number;
  targetPace?: string;
  targetHR?: number;
  targetHRZone?: number;
  targetPower?: number;
  targetRPE?: number;
  restAfterMin?: number;
}

// Repetition-based segments (strength training)
export interface RepBasedSegment extends BaseWorkoutSegment {
  measurement: 'reps';
  reps: number;
  sets?: number; // How many sets of these reps
  weight?: number; // In kg or lbs
  weightUnit?: 'kg' | 'lbs';
  targetRPE?: number;
  restBetweenSetsMin?: number;
  restAfterMin?: number;
  equipment?: string; // "barbell", "dumbbells", "bodyweight", etc.
  exercise?: string; // "squat", "deadlift", "curl", etc.
  muscleGroups?: string[]; // ["legs", "glutes", "core"]
}

// Round-based segments (circuits, boxing, etc.)
export interface RoundBasedSegment extends BaseWorkoutSegment {
  measurement: 'rounds';
  rounds: number;
  workTimeMin: number;
  restTimeMin: number;
  exercises?: string[]; // List of exercises in the round
  targetHR?: number;
  targetRPE?: number;
  restAfterMin?: number;
}

// Custom segments for flexibility
export interface CustomSegment extends BaseWorkoutSegment {
  measurement: 'custom';
  customMeasurement: string; // "laps", "calories", "points", etc.
  customValue: number;
  customInstructions: string;
  targetMetrics?: Record<string, any>;
  restAfterMin?: number;
}

// Union type for all segment types
export type WorkoutSegment =
  | TimeBasedSegment
  | DistanceBasedSegment
  | RepBasedSegment
  | RoundBasedSegment
  | CustomSegment;

// Segment group for organizing complex workouts
export interface SegmentGroup {
  id: string;
  name: string;
  description?: string;
  segments: WorkoutSegment[];
  repeatCount?: number; // How many times to repeat this group
  restBetweenRepeatsMin?: number;
}

// ============================================================================
// TARGET AND ACTUAL METRICS
// ============================================================================

export interface TargetMetrics {
  durationMin?: number;
  distanceKm?: number;
  targetHR?: number;
  targetPace?: string;
  targetPower?: number;
  expectedAvgHR?: number;
  expectedMaxHR?: number;
  expectedFatigue?: number; // 1-100 scale
}

export interface ActualWorkout {
  // Core metrics
  durationMin: number;
  distanceKm: number;
  avgHR?: number;
  maxHR?: number;
  avgPace?: string; // MM:SS format
  avgPower?: number;
  maxPower?: number;
  trainingLoad?: number;

  // Elevation
  ascentM?: number;
  descentM?: number;

  // Heart rate zones
  zones: HRZone[];

  // Additional metrics
  calories?: number;
  avgCadence?: number;
  maxCadence?: number;
  avgSpeed?: number; // km/h
  maxSpeed?: number;

  // Environmental
  temperature?: number;
  humidity?: number;

  // Raw FIT file data (parsed JSON)
  rawData: Record<string, any>;

  // Processing metadata
  processedAt: Date;
  dataSource: 'garmin_fit' | 'manual' | 'import' | 'strava';
}

// ============================================================================
// CORE WORKOUT INTERFACE
// ============================================================================

export interface Workout {
  // Metadata
  id: string; // UUID
  userId: string;
  date: string; // YYYY-MM-DD
  sport: SportType;
  name: string;
  description?: string;

  // Status and matching
  status: WorkoutStatus;
  matchedActivityId?: string; // Links to the activity ID from parsed JSON

  // Planned workout data
  planned?: {
    durationMin?: number;
    distanceKm?: number;
    targetMetrics?: TargetMetrics;
    segments?: WorkoutSegment[]; // Individual segments
    segmentGroups?: SegmentGroup[]; // Grouped segments for complex workouts
    tags?: string[];
    expectedFatigue?: number; // 1-100 scale
    notes?: string;
    // Workout-level instructions
    warmupInstructions?: string;
    mainSetInstructions?: string;
    cooldownInstructions?: string;
  };

  // Actual workout results (populated when completed)
  actual?: ActualWorkout;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Optional fields for enhanced functionality
  isPublic?: boolean;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  weather?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    conditions?: string;
  };

  // User feedback (from workout-tracking.types)
  userNotes?: string;
  userRating?: number; // 1-5 rating of how the workout felt
  completedAt?: string; // ISO timestamp when workout was completed
  uploadedAt?: string; // When FIT file was uploaded
}

// ============================================================================
// WORKOUT COMPARISON AND TRACKING
// ============================================================================

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

// ============================================================================
// WORKOUT MATCHING
// ============================================================================

// Unified workout matching result (combines both previous versions)
export interface WorkoutMatchResult {
  // Primary match info
  workout: Workout;
  confidence: number; // 0-100 confidence score
  matchReasons: string[];

  // Match differences
  differences: {
    durationDiff?: number; // minutes
    distanceDiff?: number; // km
    sportMatch: boolean;
    dateMatch: boolean;
  };

  // Additional alternatives (for multi-match scenarios)
  alternatives?: Workout[];
}

// Workout matching configuration
export interface WorkoutMatchingConfig {
  dateToleranceDays: number; // how many days before/after to search
  typeMatchWeight: number; // importance of workout type matching
  durationMatchWeight: number; // importance of duration matching
  autoMatchEnabled: boolean; // whether to auto-match on upload
}

// ============================================================================
// PARSED FIT DATA
// ============================================================================

// For parsed Garmin FIT file data
export interface ParsedFitData {
  // Core identifiers
  activityId: string; // From FIT file or generated
  sport: SportType;
  date: string; // YYYY-MM-DD
  startTime: Date;

  // Core metrics
  durationMin: number;
  distanceKm: number;
  avgHR?: number;
  maxHR?: number;
  avgPace?: string;
  avgPower?: number;
  maxPower?: number;

  // Additional data
  ascentM?: number;
  descentM?: number;
  calories?: number;
  avgCadence?: number;
  avgSpeed?: number;

  // Heart rate zones
  zones: HRZone[];

  // Training load calculation
  trainingLoad?: number;

  // Raw parsed data from FIT file
  rawData: Record<string, any>;
}

// ============================================================================
// INPUT AND RESULT TYPES
// ============================================================================

// For creating new planned workouts
export interface CreatePlannedWorkoutInput {
  userId: string;
  date: string;
  sport: SportType;
  name: string;
  description?: string;
  durationMin?: number;
  distanceKm?: number;
  targetMetrics?: TargetMetrics;
  segments?: WorkoutSegment[];
  tags?: string[];
  expectedFatigue?: number;
  notes?: string;
  location?: Workout['location'];
}

// For batch operations
export interface WorkoutBatchResult {
  successful: Workout[];
  failed: Array<{
    input: any;
    error: string;
  }>;
  matched: number;
  unplanned: number;
}

// ============================================================================
// PERIOD SUMMARIES
// ============================================================================

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

// ============================================================================
// UI STATE TYPES
// ============================================================================

// Calendar view configuration (unified from CalendarViewConfig and CalendarConfig)
export interface CalendarConfig {
  viewType: 'week' | 'month' | 'day';
  startDate: string; // YYYY-MM-DD
  showStatusFilter?: WorkoutStatus[];
  showSportFilter?: SportType[];
  showPlannedOnly?: boolean;
  showActualOnly?: boolean;
  showComparison?: boolean; // show planned vs actual side by side
  highlightAdherence?: boolean; // color code based on adherence
  highlightToday?: boolean;
}

// Backward compatibility alias
export type CalendarViewConfig = CalendarConfig;

// Training hub state management
export interface TrainingHubState {
  // Current view settings
  calendar: CalendarConfig;
  selectedWorkout?: Workout;
  selectedDate?: string;

  // Data
  trackedWorkouts: Workout[];
  periodSummary?: TrainingPeriodSummary;
  adherenceAnalytics?: PlanAdherenceAnalytics;

  // UI state
  isLoading: boolean;
  lastUpdated?: string;
  errors: string[];
  notifications: string[];
}

export default Workout;
