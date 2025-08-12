// Unified Workout Management Types for trAIn

export type SportType = 'run' | 'bike' | 'swim' | 'strength' | 'yoga' | 'other';

export type WorkoutStatus = 'planned' | 'completed' | 'missed' | 'unplanned';

export interface HRZone {
  zone: number; // 1-5
  minutes: number;
  percentage?: number;
}

export interface WorkoutSegment {
  id: string;
  name: string;
  durationMin?: number;
  distanceKm?: number;
  targetPace?: string; // MM:SS per km/mile
  targetHR?: number;
  targetPower?: number;
  description?: string;
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
    segments?: WorkoutSegment[];
    tags?: string[];
    expectedFatigue?: number; // 1-100 scale
    notes?: string;
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