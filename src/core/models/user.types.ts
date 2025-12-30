// User Profile and Preferences Types for trAIn

import type { StravaConnection } from './strava.types';

// ============================================================================
// USER PROFILE
// ============================================================================

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  preferences: UserPreferences;
  stats: UserStats;
  stravaConnection?: StravaConnection; // Optional Strava integration
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
  excludedExercises?: string[]; // Exercises/activities to exclude from training plans
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

// ============================================================================
// RECOVERY METRICS
// ============================================================================

export interface RecoveryMetrics {
  date: string; // YYYY-MM-DD
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

// ============================================================================
// ANALYTICS
// ============================================================================

export interface UserAnalytics {
  period: string; // 'week-YYYY-WW' | 'month-YYYY-MM'
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
