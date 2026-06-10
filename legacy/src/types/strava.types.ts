// Strava API type definitions and integration types
// Based on Strava API v3 documentation

// OAuth and Authentication Types
export interface StravaOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string; // 'read,activity:read'
}

export interface StravaAuthState {
  state: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  expiresIn: number; // Seconds until expiration
  tokenType: 'Bearer';
  scope: string;
}

export interface StravaTokenResponse {
  token_type: 'Bearer';
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: StravaAthlete;
}

// Strava API Response Types
export interface StravaAthlete {
  id: number;
  username: string;
  resource_state: number;
  firstname: string;
  lastname: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  sex: 'M' | 'F';
  premium: boolean;
  summit: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  badge_type_id: number;
  weight: number;
  profile_medium: string; // URL
  profile: string; // URL
  friend: null;
  follower: null;
}

export interface StravaActivity {
  resource_state: number;
  athlete: {
    id: number;
    resource_state: number;
  };
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  type: string; // 'Ride', 'Run', 'Swim', etc.
  sport_type: string; // More specific than type
  id: number;
  start_date: string; // ISO 8601
  start_date_local: string; // ISO 8601
  timezone: string;
  utc_offset: number;
  location_city: string;
  location_state: string;
  location_country: string;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: {
    id: string;
    summary_polyline: string;
    resource_state: number;
  };
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: 'everyone' | 'followers_only' | 'only_me';
  flagged: boolean;
  gear_id: string;
  start_latlng: [number, number];
  end_latlng: [number, number];
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_cadence: number;
  average_temp: number;
  has_heartrate: boolean;
  average_heartrate: number;
  max_heartrate: number;
  heartrate_opt_out: boolean;
  display_hide_heartrate_option: boolean;
  elev_high: number;
  elev_low: number;
  upload_id: number;
  upload_id_str: string;
  external_id: string;
  from_accepted_tag: boolean;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
  workout_type: number;
  suffer_score: number;
  description: string;
  calories: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  has_watts?: boolean;
  segment_efforts: StravaSegmentEffort[];
  splits_metric: StravaSplit[];
  splits_standard: StravaSplit[];
  laps: StravaLap[];
  best_efforts: StravaBestEffort[];
}

export interface StravaSegmentEffort {
  id: number;
  resource_state: number;
  name: string;
  activity: {
    id: number;
    resource_state: number;
  };
  athlete: {
    id: number;
    resource_state: number;
  };
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  distance: number;
  start_index: number;
  end_index: number;
  average_cadence: number;
  device_watts: boolean;
  average_watts: number;
  segment: {
    id: number;
    resource_state: number;
    name: string;
    activity_type: string;
    distance: number;
    average_grade: number;
    maximum_grade: number;
    elevation_high: number;
    elevation_low: number;
    start_latlng: [number, number];
    end_latlng: [number, number];
    climb_category: number;
    city: string;
    state: string;
    country: string;
    private: boolean;
    hazardous: boolean;
    starred: boolean;
  };
  kom_rank: number;
  pr_rank: number;
  achievements: any[];
  hidden: boolean;
}

export interface StravaSplit {
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  moving_time: number;
  split: number;
  average_speed: number;
  pace_zone: number;
  average_grade_adjusted_speed: number;
  average_heartrate: number;
}

export interface StravaLap {
  id: number;
  resource_state: number;
  name: string;
  activity: {
    id: number;
    resource_state: number;
  };
  athlete: {
    id: number;
    resource_state: number;
  };
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  distance: number;
  start_index: number;
  end_index: number;
  lap_index: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_cadence: number;
  device_watts: boolean;
  average_watts: number;
  average_heartrate: number;
  max_heartrate: number;
  split: number;
}

export interface StravaBestEffort {
  id: number;
  resource_state: number;
  name: string;
  activity: {
    id: number;
    resource_state: number;
  };
  athlete: {
    id: number;
    resource_state: number;
  };
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  distance: number;
  start_index: number;
  end_index: number;
  pr_rank: number;
  achievements: any[];
}

// Application Integration Types
export interface StravaConnection {
  isConnected: boolean;
  athleteId?: number;
  username?: string;
  firstname?: string;
  lastname?: string;
  profileImageUrl?: string;
  connectedAt?: Date;
  lastSyncAt?: Date;
  tokens?: StravaTokens; // Encrypted in storage
  syncPreferences: StravaSyncPreferences;
}

export interface StravaSyncPreferences {
  autoSync: boolean;
  syncInterval: 'manual' | 'hourly' | 'daily' | 'weekly';
  syncHistoryDays: number; // How far back to sync initially
  activityTypes: string[]; // Which activity types to sync
  includePrivateActivities: boolean;
  overwriteExisting: boolean; // Whether to overwrite existing activities with same date/time
}

// Data Mapping Types
export interface StravaToFirebaseMapping {
  stravaActivityId: number;
  firebaseActivityId: string;
  lastUpdated: Date;
  syncStatus: 'pending' | 'synced' | 'error';
  errorMessage?: string;
}

// API Rate Limiting Types
export interface StravaRateLimit {
  limit: number;
  usage: number;
  resetTime: number; // Unix timestamp
}

export interface StravaRateLimitStatus {
  fifteenMinute: StravaRateLimit;
  daily: StravaRateLimit;
  lastUpdated: number; // Unix timestamp
}

// Error Types
export interface StravaAPIError {
  message: string;
  errors: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}

export interface StravaSyncError {
  activityId: number;
  error: string;
  timestamp: Date;
  retryCount: number;
}

// Service Configuration
export interface StravaServiceConfig {
  baseUrl: string;
  authUrl: string;
  tokenUrl: string;
  apiVersion: string;
  maxRetries: number;
  retryDelayMs: number;
  rateLimitBuffer: number; // Buffer percentage for rate limits
}

// Webhook Types (for future implementation)
export interface StravaWebhook {
  id: number;
  resource_state: number;
  application_id: number;
  callback_url: string;
  created_at: string;
  updated_at: string;
}

export interface StravaWebhookEvent {
  aspect_type: 'create' | 'update' | 'delete';
  event_time: number;
  object_id: number;
  object_type: 'activity' | 'athlete';
  owner_id: number;
  subscription_id: number;
  updates: Record<string, any>;
}

// Sport Type Mappings
export const STRAVA_SPORT_MAPPINGS: Record<string, string> = {
  'Ride': 'cycling',
  'VirtualRide': 'cycling',
  'EBikeRide': 'cycling',
  'Run': 'running',
  'TrailRun': 'running',
  'VirtualRun': 'running',
  'Walk': 'walking',
  'Hike': 'hiking',
  'Swim': 'swimming',
  'Workout': 'strength_training',
  'WeightTraining': 'strength_training',
  'Yoga': 'yoga',
  'Crossfit': 'crossfit',
  'Elliptical': 'elliptical',
  'StairStepper': 'stair_stepper',
  'Rowing': 'rowing',
  'Kayaking': 'kayaking',
  'Canoeing': 'canoeing',
  'Surfing': 'surfing',
  'Kitesurf': 'kitesurfing',
  'Windsurf': 'windsurfing',
  'Ski': 'alpine_skiing',
  'Snowboard': 'snowboarding',
  'NordicSki': 'cross_country_skiing',
  'IceSkate': 'ice_skating',
  'InlineSkate': 'inline_skating',
  'RockClimbing': 'rock_climbing',
  'Soccer': 'soccer',
  'Tennis': 'tennis',
  'Golf': 'golf',
  'Badminton': 'badminton'
};