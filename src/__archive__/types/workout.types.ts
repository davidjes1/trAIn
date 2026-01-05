// Unified Workout Management Types for trAIn

export type SportType = 'run' | 'bike' | 'swim' | 'strength' | 'yoga' | 'other';

export type WorkoutStatus = 'planned' | 'completed' | 'missed' | 'unplanned';

export interface HRZone {
  zone: number; // 1-5
  minutes: number;
  percentage?: number;
}

// Flexible segment type system for different workout activities
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
  dataSource: 'garmin_fit' | 'manual' | 'import';
}

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
}

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

// For workout matching results
export interface WorkoutMatchResult {
  workout: Workout;
  confidence: number; // 0-1 scale
  matchReasons: string[];
  differences: {
    durationDiff?: number; // minutes
    distanceDiff?: number; // km
    sportMatch: boolean;
    dateMatch: boolean;
  };
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

export default Workout;