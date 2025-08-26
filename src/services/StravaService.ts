// Strava API Service
// Handles API calls with rate limiting, error handling, and data fetching

import { 
  StravaActivity, 
  StravaConnection, 
  StravaRateLimitStatus, 
  StravaAPIError,
  StravaSyncError,
  StravaServiceConfig,
  StravaToFirebaseMapping
} from '../types/strava.types';
import { StravaAuthManager } from './StravaAuthManager';
import { StravaDataMapper } from './StravaDataMapper';
import WorkoutService from './WorkoutService';

export class StravaService {
  private static instance: StravaService;
  private authManager: StravaAuthManager;
  private dataMapper: StravaDataMapper;
  private config: StravaServiceConfig;
  private rateLimitStatus: StravaRateLimitStatus | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;

  private constructor() {
    this.authManager = StravaAuthManager.getInstance();
    this.dataMapper = StravaDataMapper.getInstance();
    this.config = {
      baseUrl: 'https://www.strava.com/api/v3',
      authUrl: 'https://www.strava.com/oauth',
      tokenUrl: 'https://www.strava.com/oauth/token',
      apiVersion: 'v3',
      maxRetries: 3,
      retryDelayMs: 1000,
      rateLimitBuffer: 10 // 10% buffer on rate limits
    };
  }

  public static getInstance(): StravaService {
    if (!StravaService.instance) {
      StravaService.instance = new StravaService();
    }
    return StravaService.instance;
  }

  /**
   * Fetch activities from Strava API with pagination
   */
  public async getActivities(
    connection: StravaConnection,
    options: {
      before?: number; // Unix timestamp
      after?: number; // Unix timestamp
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<StravaActivity[]> {
    const accessToken = await this.authManager.getValidAccessToken(connection);
    
    const params = new URLSearchParams({
      page: (options.page || 1).toString(),
      per_page: (options.per_page || 30).toString()
    });

    if (options.before) params.append('before', options.before.toString());
    if (options.after) params.append('after', options.after.toString());

    const response = await this.makeAuthenticatedRequest(
      `${this.config.baseUrl}/athlete/activities?${params.toString()}`,
      accessToken
    );

    return response as StravaActivity[];
  }

  /**
   * Fetch detailed activity data
   */
  public async getActivity(
    connection: StravaConnection,
    activityId: number
  ): Promise<StravaActivity> {
    const accessToken = await this.authManager.getValidAccessToken(connection);
    
    const response = await this.makeAuthenticatedRequest(
      `${this.config.baseUrl}/activities/${activityId}`,
      accessToken
    );

    return response as StravaActivity;
  }

  /**
   * Get athlete profile information
   */
  public async getAthleteProfile(connection: StravaConnection) {
    const accessToken = await this.authManager.getValidAccessToken(connection);
    
    const response = await this.makeAuthenticatedRequest(
      `${this.config.baseUrl}/athlete`,
      accessToken
    );

    return response;
  }

  /**
   * Sync recent activities based on connection preferences and save to Firebase
   */
  public async syncRecentActivities(
    connection: StravaConnection,
    userId: string,
    onProgress?: (progress: { current: number; total: number; activity?: StravaActivity }) => void
  ): Promise<{
    activities: StravaActivity[];
    savedWorkouts: number;
    errors: StravaSyncError[];
    newActivities: number;
    totalFetched: number;
  }> {
    const syncPrefs = connection.syncPreferences;
    const activities: StravaActivity[] = [];
    const errors: StravaSyncError[] = [];
    let page = 1;
    let hasMore = true;
    let newActivitiesCount = 0;

    // Calculate 'after' timestamp based on sync history days
    const afterTimestamp = connection.lastSyncAt 
      ? Math.floor(connection.lastSyncAt.getTime() / 1000)
      : Math.floor((Date.now() - (syncPrefs.syncHistoryDays * 24 * 60 * 60 * 1000)) / 1000);

    try {
      while (hasMore && page <= 10) { // Limit to 10 pages max
        const batch = await this.getActivities(connection, {
          after: afterTimestamp,
          page,
          per_page: 50
        });

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        // Filter activities based on preferences
        const filteredBatch = batch.filter(activity => {
          // Check activity type
          if (syncPrefs.activityTypes.length > 0 && 
              !syncPrefs.activityTypes.includes(activity.type)) {
            return false;
          }

          // Check privacy settings
          if (!syncPrefs.includePrivateActivities && activity.private) {
            return false;
          }

          return true;
        });

        activities.push(...filteredBatch);
        newActivitiesCount += filteredBatch.length;

        // Report progress
        if (onProgress) {
          onProgress({
            current: activities.length,
            total: activities.length + (batch.length === 50 ? 50 : 0), // Estimate
            activity: filteredBatch[0]
          });
        }

        page++;
        
        // If we got less than requested, we've reached the end
        if (batch.length < 50) {
          hasMore = false;
        }

        // Rate limiting delay
        await this.waitForRateLimit();
      }
    } catch (error) {
      errors.push({
        activityId: 0,
        error: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        retryCount: 0
      });
    }

    // Now save the activities to Firebase as workouts
    let savedWorkouts = 0;
    
    if (activities.length > 0) {
      console.log(`📊 Saving ${activities.length} Strava activities to Firebase...`);
      
      // Get existing workouts to check for duplicates
      const existingWorkouts = await WorkoutService.getUserWorkouts(userId, 200);
      
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        
        try {
          // Check if this Strava activity already exists
          const exists = existingWorkouts.some(w => 
            w.id === `strava-${activity.id}`
          );
          
          if (!exists) {
            // Map Strava activity to Workout format using the newer structure
            const workout = {
              id: `strava-${activity.id}`,
              userId: userId,
              name: activity.name,
              sport: this.mapStravaTypeToSport(activity.type),
              date: new Date(activity.start_date_local).toISOString().split('T')[0],
              status: 'completed' as const,
              source: 'strava',
              createdAt: new Date(),
              updatedAt: new Date(),
              
              // Map actual workout data
              actual: {
                durationMin: activity.moving_time ? Math.round(activity.moving_time / 60) : undefined,
                distanceKm: activity.distance ? Number((activity.distance / 1000).toFixed(2)) : undefined,
                avgHR: activity.average_heartrate || undefined,
                maxHR: activity.max_heartrate || undefined,
                avgSpeed: activity.average_speed ? Number((activity.average_speed * 3.6).toFixed(1)) : undefined,
                avgPower: activity.average_watts || undefined,
                maxPower: activity.max_watts || undefined,
                avgCadence: activity.average_cadence || undefined,
                ascentM: activity.total_elevation_gain || undefined,
                calories: activity.calories || undefined,
                trainingLoad: this.calculateSimpleTrainingLoad(activity),
                dataSource: 'Strava',
                processedAt: new Date(),
                avgPace: this.calculatePace(activity)
              },
              
              // Metadata
              metadata: {
                stravaActivityId: activity.id,
                stravaActivityType: activity.type,
                stravaURL: `https://www.strava.com/activities/${activity.id}`,
                importedAt: new Date(),
                originalStartDate: activity.start_date,
                visibility: activity.private ? 'private' : 'public'
              }
            };
            
            // Save the workout - need to use handleUnplannedWorkout for completed workouts
            await WorkoutService.handleUnplannedWorkout({
              date: workout.date,
              sport: workout.sport,
              name: workout.name,
              source: workout.source,
              userId: workout.userId,
              actualWorkout: workout.actual!
            }, workout.metadata);
            savedWorkouts++;
            
            console.log(`✅ Saved: ${activity.name} (${new Date(activity.start_date_local).toLocaleDateString()})`);
          } else {
            console.log(`⏭️ Skipped: ${activity.name} (already exists)`);
          }
        } catch (error) {
          console.error(`❌ Error saving activity ${activity.id}:`, error);
          errors.push({
            activityId: activity.id,
            error: `Save failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            retryCount: 0
          });
        }
      }
    }
    
    console.log(`✅ Strava sync complete: ${savedWorkouts} workouts saved, ${activities.length} fetched, ${errors.length} errors`);

    return {
      activities,
      savedWorkouts,
      errors,
      newActivities: newActivitiesCount,
      totalFetched: activities.length
    };
  }

  /**
   * Make authenticated request with rate limiting and error handling
   */
  private async makeAuthenticatedRequest(
    url: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = async () => {
        try {
          // Check rate limits before making request
          if (!this.canMakeRequest()) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
          }

          const response = await fetch(url, {
            ...options,
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              ...options.headers
            }
          });

          // Update rate limit status from response headers
          this.updateRateLimitStatus(response);

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Rate limit exceeded');
            } else if (response.status === 401) {
              throw new Error('Unauthorized - token may be expired or invalid');
            } else if (response.status === 403) {
              throw new Error('Forbidden - insufficient permissions');
            } else {
              const errorData = await response.json().catch(() => ({}));
              const stravaError = errorData as StravaAPIError;
              throw new Error(stravaError.message || `HTTP ${response.status}: ${response.statusText}`);
            }
          }

          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      this.requestQueue.push(request);
      this.processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Request failed:', error);
        }

        // Wait between requests to respect rate limits
        await this.waitForRateLimit();
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Check if we can make a request based on rate limits
   */
  private canMakeRequest(): boolean {
    if (!this.rateLimitStatus) {
      return true; // No rate limit data yet, assume we can make request
    }

    const now = Math.floor(Date.now() / 1000);
    const buffer = this.config.rateLimitBuffer / 100;

    // Check 15-minute limit
    const fifteenMinLimit = this.rateLimitStatus.fifteenMinute;
    if (fifteenMinLimit.usage >= (fifteenMinLimit.limit * (1 - buffer))) {
      if (now < fifteenMinLimit.resetTime) {
        return false;
      }
    }

    // Check daily limit
    const dailyLimit = this.rateLimitStatus.daily;
    if (dailyLimit.usage >= (dailyLimit.limit * (1 - buffer))) {
      return false;
    }

    return true;
  }

  /**
   * Wait for rate limit if necessary
   */
  private async waitForRateLimit(): Promise<void> {
    if (!this.rateLimitStatus) {
      // Default wait between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const fifteenMinLimit = this.rateLimitStatus.fifteenMinute;

    // If we're close to the 15-minute limit, wait for reset
    if (fifteenMinLimit.usage >= fifteenMinLimit.limit - 5) {
      const waitTime = Math.max(0, (fifteenMinLimit.resetTime - now) * 1000);
      if (waitTime > 0) {
        console.log(`Waiting ${waitTime}ms for Strava rate limit reset`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } else {
      // Standard delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * Update rate limit status from API response headers
   */
  private updateRateLimitStatus(response: Response): void {
    const fifteenMinuteLimit = response.headers.get('X-RateLimit-Limit');
    const fifteenMinuteUsage = response.headers.get('X-RateLimit-Usage');
    const dailyLimit = response.headers.get('X-ReadRateLimit-Limit');
    const dailyUsage = response.headers.get('X-ReadRateLimit-Usage');

    if (fifteenMinuteLimit && fifteenMinuteUsage) {
      const [usage15, limit15] = fifteenMinuteUsage.split(',').map(Number);
      const [limitTotal15] = fifteenMinuteLimit.split(',').map(Number);
      
      const [usageDaily, limitDaily] = dailyUsage?.split(',').map(Number) || [0, 2000];
      const [limitTotalDaily] = dailyLimit?.split(',').map(Number) || [2000];

      // Calculate reset times (15-minute intervals)
      const now = new Date();
      const minutes = now.getMinutes();
      const nextQuarterHour = Math.ceil((minutes + 1) / 15) * 15;
      const resetTime = new Date(now);
      resetTime.setMinutes(nextQuarterHour % 60);
      resetTime.setSeconds(0);
      resetTime.setMilliseconds(0);
      if (nextQuarterHour >= 60) {
        resetTime.setHours(resetTime.getHours() + 1);
      }

      this.rateLimitStatus = {
        fifteenMinute: {
          limit: limitTotal15,
          usage: usage15,
          resetTime: Math.floor(resetTime.getTime() / 1000)
        },
        daily: {
          limit: limitTotalDaily,
          usage: usageDaily,
          resetTime: Math.floor(new Date().setHours(24, 0, 0, 0) / 1000) // Next midnight
        },
        lastUpdated: Math.floor(Date.now() / 1000)
      };
    }
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(): StravaRateLimitStatus | null {
    return this.rateLimitStatus;
  }

  /**
   * Test connection by making a simple API call
   */
  public async testConnection(connection: StravaConnection): Promise<boolean> {
    try {
      await this.getAthleteProfile(connection);
      return true;
    } catch (error) {
      console.error('Strava connection test failed:', error);
      return false;
    }
  }

  /**
   * Update service configuration
   */
  public updateConfig(config: Partial<StravaServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Map Strava activity type to internal sport type
   */
  private mapStravaTypeToSport(type: string): string {
    const sportMap: Record<string, string> = {
      'Run': 'run',
      'Ride': 'bike',
      'Swim': 'swim',
      'Walk': 'run',
      'Hike': 'run',
      'VirtualRun': 'run',
      'VirtualRide': 'bike',
      'Workout': 'strength',
      'WeightTraining': 'strength',
      'Crossfit': 'strength',
      'Yoga': 'yoga'
    };
    
    return sportMap[type] || 'other';
  }

  /**
   * Calculate simple training load (TRIMP-style)
   */
  private calculateSimpleTrainingLoad(activity: StravaActivity): number | undefined {
    if (!activity.average_heartrate || !activity.moving_time) {
      return undefined;
    }

    const avgHR = activity.average_heartrate;
    const duration = activity.moving_time / 60; // minutes
    const restingHR = 60; // Default
    const maxHR = 190; // Default
    
    const hrRatio = (avgHR - restingHR) / (maxHR - restingHR);
    if (hrRatio <= 0) return undefined;
    
    const trimp = duration * hrRatio * Math.exp(1.92 * hrRatio);
    return Math.round(trimp);
  }

  /**
   * Calculate pace for running activities
   */
  private calculatePace(activity: StravaActivity): string | undefined {
    if (!activity.average_speed || !this.isRunningActivity(activity.type)) {
      return undefined;
    }

    const speedKmh = activity.average_speed * 3.6;
    if (speedKmh <= 0) return undefined;
    
    const paceMinPerKm = 60 / speedKmh;
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.round((paceMinPerKm - minutes) * 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if activity is running-based
   */
  private isRunningActivity(type: string): boolean {
    return ['Run', 'VirtualRun', 'Walk', 'Hike'].includes(type);
  }
}