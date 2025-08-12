// Firebase-specific type definitions for the training app
import { WorkoutStatus, WorkoutComparison } from './workout-tracking.types';

// User Profile and Authentication
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface UserPreferences {
  timezone: string;
  units: 'metric' | 'imperial';
  hrZones: HRZoneConfig;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  restingHR: number;
  maxHR: number;
  age: number;
  sex?: 'male' | 'female' | 'other';
  sports: string[];
  goals: string[];
  availableDays?: string[];
  weeklyHours?: number;
}

export interface HRZoneConfig {
  zone1: { min: number; max: number };
  zone2: { min: number; max: number };
  zone3: { min: number; max: number };
  zone4: { min: number; max: number };
  zone5: { min: number; max: number };
}

export interface UserStats {
  totalActivities: number;
  totalTrainingTime: number; // minutes
  lastActivityDate: string | null;
}

// Activity Data (Firebase version with ID and user reference)
export interface FirebaseActivity {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  sport: string;
  subSport?: string;
  duration: number; // minutes
  distance: number; // km
  avgHR?: number;
  maxHR?: number;
  hrDrift?: number;
  zone1Minutes: number;
  zone2Minutes: number;
  zone3Minutes: number;
  zone4Minutes: number;
  zone5Minutes: number;
  trainingLoad: number;
  calories?: number;
  totalAscent?: number;
  totalDescent?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgPace?: number;
  notes?: string;
  fitFileUrl?: string; // Firebase Storage path
  uploadedAt: Date;
  processed: boolean;
}

// Lap Data (Firebase version)
export interface FirebaseLapData {
  id: string;
  userId: string;
  activityId: string;
  lapNumber: number;
  lapDuration: number; // minutes
  lapDistance: number; // km
  avgHR?: number;
  maxHR?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgPace?: number;
  elevationGain?: number;
  elevationLoss?: number;
  avgPower?: number;
  maxPower?: number;
  normalizedPower?: number;
  startTime?: Date;
  endTime?: Date;
  splitType?: 'manual' | 'auto' | 'distance' | 'time';
}

// Training Plan (Firebase version)
export interface FirebaseTrainingPlan {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  workoutType: string;
  description: string;
  expectedFatigue: number; // 0-100
  durationMin: number;
  completed: boolean;
  actualFatigue?: number;
  adherenceScore?: number;
  generatedAt: Date;
  generatedBy: 'user' | 'algorithm';
  metadata?: {
    basedOnMetrics: boolean;
    adjustmentReason?: string;
  };
}

// Tracked Workout (Firebase version)
export interface FirebaseTrackedWorkout {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: WorkoutStatus;
  plannedWorkoutRef?: string; // Reference to FirebaseTrainingPlan ID
  actualActivityRef?: string; // Reference to FirebaseActivity ID
  comparison?: WorkoutComparison;
  userNotes?: string;
  userRating?: number; // 1-5
  lastUpdated: Date;
}

// Recovery Metrics (Firebase version)
export interface FirebaseRecoveryMetrics {
  date: string; // YYYY-MM-DD (also used as document ID)
  userId: string;
  sleepScore?: number; // 0-100
  bodyBattery?: number; // 0-100
  hrv?: number;
  restingHR?: number;
  subjectiveFatigue: number; // 1-10
  stressLevel?: number; // 0-100
  notes?: string;
  recordedAt: Date;
}

// Analytics (Firebase version)
export interface FirebaseAnalytics {
  period: string; // 'week-YYYY-WW' | 'month-YYYY-MM' (also used as document ID)
  userId: string;
  adherence: {
    completionRate: number; // percentage
    durationAdherence: number; // percentage
    loadAdherence: number; // percentage
  };
  performance: {
    totalActivities: number;
    totalDuration: number; // minutes
    totalLoad: number; // TRIMP
    averageLoadVariance: number;
  };
  trends: {
    consistencyScore: number; // 0-100
    intensityTrend: 'increasing' | 'stable' | 'decreasing';
  };
  generatedAt: Date;
}

// File Upload Types
export interface FirebaseFileUpload {
  file: File;
  userId: string;
  activityId?: string;
  path: string;
  metadata?: {
    originalName: string;
    size: number;
    type: string;
    uploadedAt: Date;
  };
}

export interface FileUploadResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  path?: string;
}

// Cloud Functions Types
export interface PlanGenerationRequest {
  userId: string;
  options: {
    startDate: string;
    duration: number; // days
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
    targetEvent?: {
      date: string;
      type: string;
    };
    recoveryMetrics?: {
      bodyBattery?: number;
      sleepScore?: number;
      hrv?: number;
    };
    recentActivities: FirebaseActivity[];
  };
}

export interface PlanGenerationResponse {
  success: boolean;
  plans: FirebaseTrainingPlan[];
  recommendations: string[];
  warnings: string[];
  generatedAt: string;
}

// Real-time Data Types
export interface RealtimeUpdate<T> {
  type: 'added' | 'modified' | 'removed';
  data: T;
  id: string;
}

export interface SubscriptionOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// Batch Operations
export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  id?: string;
  data: T;
}

export interface BatchResult {
  success: boolean;
  processedCount: number;
  errors: Array<{
    operation: BatchOperation<any>;
    error: string;
  }>;
}

// Firebase Configuration
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Error Types
export interface FirebaseError {
  code: string;
  message: string;
  details?: any;
}

// Security Rules Types
export interface SecurityRuleContext {
  userId: string;
  isOwner: boolean;
  isAuthenticated: boolean;
  timestamp: Date;
}

// Export for backward compatibility with existing types
export type {
  ActivityMetrics,
  LapMetrics,
  TrainingPlan
} from './training-metrics.types';

export type {
  TrackedWorkout,
  WorkoutComparison,
  WorkoutStatus
} from './workout-tracking.types';