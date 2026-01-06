// Barrel export for all core models
// Provides clean imports: import { Workout, TrainingPlan, UserProfile } from '@/core/models'

// ============================================================================
// WORKOUT TYPES
// ============================================================================

export type {
  // Core types
  SportType,
  WorkoutStatus,
  HRZone,

  // Segment types
  SegmentType,
  SegmentMeasurement,
  BaseWorkoutSegment,
  TimeBasedSegment,
  DistanceBasedSegment,
  RepBasedSegment,
  RoundBasedSegment,
  CustomSegment,
  WorkoutSegment,
  SegmentGroup,

  // Target and actual metrics
  TargetMetrics,
  ActualWorkout,

  // Core workout interface
  Workout,

  // Workout comparison and tracking
  WorkoutComparison,
  ZoneCompliance,

  // Workout matching
  WorkoutMatchResult,
  WorkoutMatchingConfig,

  // Parsed FIT data
  ParsedFitData,

  // Input and result types
  CreatePlannedWorkoutInput,
  WorkoutBatchResult,

  // Period summaries
  TrainingPeriodSummary,
  PlanAdherenceAnalytics,

  // UI state types
  CalendarConfig,
  CalendarViewConfig, // Backward compatibility alias
  TrainingHubState,
} from './workout.types';

// ============================================================================
// TRAINING TYPES
// ============================================================================

export type {
  // Activity metrics
  ActivityMetrics,
  LapMetrics,

  // HR zone distribution
  HRZoneDistribution,

  // Pace and power analysis
  PaceAnalysis,
  PowerAnalysis,

  // Processing results
  ProcessingResult,
  BatchProcessingOptions,

  // Chart configuration
  ChartConfig,
  WeeklyTrainingLoadChart,
  HRZoneDistributionChart,
  LapHRPaceChart,

  // Training plan types
  TrainingPhase,
  WorkoutTypeTag,
  RecoveryImpact,
  WorkoutType,
  TrainingPlan,
  TrackedWorkout,

  // Plan options and configuration
  PlanOptions,
  WorkoutSummary,

  // Periodization
  Mesocycle,
  MacroPlan,

  // Readiness and plan generation
  ReadinessMetrics,
  PlanGenerationResult,

  // Dynamic plan adjustment
  WorkoutModificationType,
  WorkoutModification,
  PlanAdjustmentOptions,
  PlanAdjustmentResult,
} from './training.types';

// ============================================================================
// USER TYPES
// ============================================================================

export type {
  // User profile
  UserProfile,
  UserPreferences,
  HRZoneConfig,
  UserStats,

  // Recovery metrics
  RecoveryMetrics,

  // Analytics
  UserAnalytics,
} from './user.types';

// ============================================================================
// STRAVA TYPES
// ============================================================================

export type {
  StravaConnection,
  StravaActivity,
  StravaAthlete,
  StravaStream,
  StravaStreamSet,
  StravaDataMapper,
  StravaAuthTokens,
  StravaAuthConfig,
  StravaSyncConfig,
  StravaSyncResult,
  StravaError,
} from './strava.types';

// Export Strava constants
export { STRAVA_SPORT_MAPPINGS } from './strava.types';

// ============================================================================
// FIREBASE TYPES
// ============================================================================

export type {
  // Firebase document types
  FirebaseActivity,
  FirebaseLapData,
  FirebaseTrainingPlan,
  FirebaseTrackedWorkout,
  FirebaseGeneratedPlan,
  FirebaseTrainingCalendar,
  FirebaseRecoveryMetrics,
  FirebaseAnalytics,

  // File upload types
  FirebaseFileUpload,
  FileUploadResult,

  // Cloud functions types
  PlanGenerationRequest,
  PlanGenerationResponse,

  // Real-time data types
  RealtimeUpdate,
  SubscriptionOptions,

  // Batch operations
  BatchOperation,
  BatchResult,

  // Firebase configuration
  FirebaseConfig,

  // Error types
  FirebaseError,

  // Security rules types
  SecurityRuleContext,
} from './firebase.types';
