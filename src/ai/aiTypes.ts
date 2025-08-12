// AI system type definitions for training insights and recommendations

import { 
  ActivityMetrics, 
  TrainingPlan, 
  WorkoutType
} from '../types/training-metrics.types';
import { FirebaseRecoveryMetrics } from '../types/firebase.types';

// Core AI Input/Output Types
export interface AIRecommendationInput {
  userId: string;
  currentDate: string; // YYYY-MM-DD
  recentActivities: ActivityMetrics[]; // Last 28 days
  recoveryMetrics: FirebaseRecoveryMetrics[];
  currentTrainingPlan?: TrainingPlan[];
  userProfile: UserTrainingProfile;
  weatherData?: WeatherCondition;
}

export interface UserTrainingProfile {
  age: number;
  sex: 'male' | 'female' | 'other';
  weight?: number; // kg
  height?: number; // cm
  restingHR: number;
  maxHR: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredSports: string[];
  trainingGoals: string[];
  availableDays: string[]; // ['Monday', 'Tuesday', ...]
  preferredWorkoutTimes: TimePreference[];
}

export interface TimePreference {
  dayOfWeek: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  duration: number; // preferred session duration in minutes
}

export interface WeatherCondition {
  temperature: number; // celsius
  conditions: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  windSpeed?: number; // km/h
  humidity?: number; // percentage
  isOutdoorFriendly: boolean;
}

// Plan Advisor Types
export interface WorkoutRecommendation {
  recommendedWorkout: WorkoutType;
  confidence: number; // 0-100
  reasoning: string[];
  alternatives: WorkoutType[];
  modifications: WorkoutModification[];
  weatherConsideration?: string;
  recoveryAdjustment?: string;
}

export interface WorkoutModification {
  type: 'duration' | 'intensity' | 'sport' | 'location';
  originalValue: string | number;
  modifiedValue: string | number;
  reason: string;
}

// Fatigue Monitor Types
export interface FatigueAssessment {
  overallStatus: 'fresh' | 'normal' | 'fatigued' | 'overtrained';
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  recommendation: 'full-training' | 'active-recovery' | 'rest' | 'medical-attention';
  indicators: FatigueIndicator[];
  trendAnalysis: FatigueTrend;
  nextReassessment: string; // ISO date
}

export interface FatigueIndicator {
  metric: 'hrv' | 'restingHR' | 'bodyBattery' | 'sleepScore' | 'trainingLoad' | 'subjective';
  currentValue: number;
  baselineValue: number;
  percentChange: number;
  status: 'normal' | 'elevated' | 'concerning' | 'critical';
  description: string;
}

export interface FatigueTrend {
  direction: 'improving' | 'stable' | 'declining' | 'rapidly-declining';
  durationDays: number;
  projectedRecovery: number; // days until normal
  confidenceLevel: number; // 0-100
}

// Training Stress Balance (TSB) Types
export interface TrainingStressBalance {
  acuteLoad: number; // 7-day average (ATL)
  chronicLoad: number; // 28-day average (CTL)
  tsb: number; // CTL - ATL
  fitness: number; // CTL-based fitness score
  fatigue: number; // ATL-based fatigue score
  form: number; // TSB-based form score
  interpretation: TSBInterpretation;
  trend: LoadTrend;
}

export interface TSBInterpretation {
  status: 'peak-form' | 'good-form' | 'neutral' | 'building' | 'overreaching' | 'overtrained';
  description: string;
  recommendation: string;
  optimalTrainingWindow: boolean;
}

export interface LoadTrend {
  acuteDirection: 'increasing' | 'stable' | 'decreasing';
  chronicDirection: 'increasing' | 'stable' | 'decreasing';
  balanceDirection: 'improving' | 'stable' | 'worsening';
  weeksToOptimal?: number; // weeks until TSB in optimal range
}

// Performance Trends Types
export interface PerformanceAnalysis {
  overallTrend: 'improving' | 'stable' | 'declining';
  keyMetrics: PerformanceMetric[];
  insights: PerformanceInsight[];
  predictions: PerformancePrediction[];
  recommendedFocus: TrainingFocus[];
}

export interface PerformanceMetric {
  name: string;
  category: 'aerobic' | 'anaerobic' | 'strength' | 'efficiency' | 'recovery';
  currentValue: number;
  baselineValue: number;
  percentChange: number;
  trend: 'improving' | 'stable' | 'declining';
  confidenceLevel: number;
  lastImprovement: string; // ISO date
  timeframe: number; // days of analysis
}

export interface PerformanceInsight {
  type: 'achievement' | 'plateau' | 'regression' | 'opportunity';
  title: string;
  description: string;
  metrics: string[]; // related metric names
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface PerformancePrediction {
  metric: string;
  timeframe: number; // days into future
  predictedValue: number;
  confidenceInterval: [number, number]; // [min, max]
  factors: string[]; // influencing factors
}

export interface TrainingFocus {
  area: 'base-aerobic' | 'threshold' | 'vo2max' | 'recovery' | 'strength' | 'technique';
  priority: number; // 1-5, 5 being highest
  currentLevel: 'weak' | 'developing' | 'strong';
  recommendedSessions: number; // per week
  duration: number; // recommended focus period in weeks
}

// Plan Adjuster Types
export interface PlanAdjustmentRequest {
  originalPlan: TrainingPlan[];
  adjustmentReason: 'missed-workout' | 'illness' | 'injury' | 'schedule-change' | 'performance-plateau' | 'overreaching';
  affectedDates: string[]; // YYYY-MM-DD
  constraints: PlanConstraints;
  preservationPriorities: PreservationPriority[];
}

export interface PlanConstraints {
  availableDays: string[]; // remaining days in plan period
  maxDailyDuration?: number; // minutes
  maxWeeklyVolume?: number; // hours
  avoidHighIntensity?: boolean;
  maintainSportBalance?: boolean;
  eventDate?: string; // important race/event date
}

export interface PreservationPriority {
  aspect: 'weekly-volume' | 'peak-sessions' | 'rest-days' | 'sport-distribution' | 'periodization';
  importance: 'critical' | 'high' | 'medium' | 'low';
}

export interface PlanAdjustmentResult {
  success: boolean;
  adjustedPlan: TrainingPlan[];
  modifications: PlanModification[];
  impactAssessment: AdjustmentImpact;
  alternatives: AlternativePlan[];
  warnings: string[];
  confidence: number; // 0-100
}

export interface PlanModification {
  date: string;
  action: 'moved' | 'modified' | 'cancelled' | 'added';
  originalWorkout?: TrainingPlan;
  newWorkout?: TrainingPlan;
  reason: string;
}

export interface AdjustmentImpact {
  volumeChange: number; // percentage
  intensityChange: number; // percentage
  restDaysChange: number;
  sportBalanceChange: { [sport: string]: number };
  periodizationImpact: 'maintained' | 'slightly-altered' | 'significantly-altered';
}

export interface AlternativePlan {
  name: string;
  description: string;
  plan: TrainingPlan[];
  tradeoffs: string[];
  score: number; // 0-100 suitability score
}

// AI Configuration Types
export interface AIConfiguration {
  conservativeMode: boolean; // more cautious recommendations
  adaptationRate: 'slow' | 'moderate' | 'aggressive'; // how quickly to adapt plans
  recoveryPriority: 'low' | 'medium' | 'high'; // emphasis on recovery
  performanceGoal: 'maintenance' | 'improvement' | 'peak-performance';
  dataRequirements: {
    minActivitiesForTrends: number;
    minRecoveryDataPoints: number;
    confidenceThreshold: number; // minimum confidence for recommendations
  };
}

// Utility Types
export interface CalculationResult<T> {
  value: T;
  confidence: number;
  factors: string[];
  timestamp: string;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface AIDecisionContext {
  userId: string;
  timestamp: string;
  inputData: Record<string, any>;
  algorithms: string[];
  parameters: Record<string, any>;
  version: string; // AI system version
}

// Response wrapper for all AI operations
export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings: string[];
  context: AIDecisionContext;
  processingTime: number; // milliseconds
}

// Export utility types for easier imports
export type RecommendationResponse = AIResponse<WorkoutRecommendation>;
export type FatigueResponse = AIResponse<FatigueAssessment>;
export type PerformanceResponse = AIResponse<PerformanceAnalysis>;
export type AdjustmentResponse = AIResponse<PlanAdjustmentResult>;