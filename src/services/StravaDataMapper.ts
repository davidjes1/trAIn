// Strava Data Mapper
// Converts Strava API data to Firebase activity format with HR zone calculation

import { 
  StravaActivity, 
  StravaLap,
  STRAVA_SPORT_MAPPINGS
} from '../types/strava.types';
import { 
  FirebaseActivity, 
  FirebaseLapData,
  HRZoneConfig 
} from '../types/firebase.types';

export class StravaDataMapper {
  private static instance: StravaDataMapper;

  private constructor() {}

  public static getInstance(): StravaDataMapper {
    if (!StravaDataMapper.instance) {
      StravaDataMapper.instance = new StravaDataMapper();
    }
    return StravaDataMapper.instance;
  }

  /**
   * Convert Strava activity to Firebase activity format
   */
  public mapStravaActivityToFirebase(
    stravaActivity: StravaActivity,
    userId: string,
    hrZones: HRZoneConfig,
    restingHR: number = 60
  ): FirebaseActivity {
    const date = this.formatDateString(stravaActivity.start_date_local);
    const sport = this.mapStravaTypeToSport(stravaActivity.type, stravaActivity.sport_type);
    const duration = Math.round(stravaActivity.moving_time / 60); // Convert to minutes
    const distance = Math.round(stravaActivity.distance / 1000 * 100) / 100; // Convert to km with 2 decimals

    // Calculate HR zones if heart rate data is available
    const hrData = stravaActivity.has_heartrate ? 
      this.calculateHRZones(stravaActivity, hrZones, duration) : 
      this.getEmptyHRZones();

    // Calculate training load (TRIMP) if HR data available
    const trainingLoad = stravaActivity.has_heartrate ?
      this.calculateTrainingLoad(
        duration,
        stravaActivity.average_heartrate || 0,
        restingHR,
        200 // Estimate max HR if not provided
      ) : 0;

    // Map speeds and paces
    const avgSpeed = stravaActivity.average_speed ? 
      Math.round(stravaActivity.average_speed * 3.6 * 100) / 100 : undefined; // m/s to km/h
    const maxSpeed = stravaActivity.max_speed ? 
      Math.round(stravaActivity.max_speed * 3.6 * 100) / 100 : undefined;
    
    // Calculate pace for running activities (min/km)
    const avgPace = this.isRunningActivity(sport) && avgSpeed ? 
      Math.round(60 / avgSpeed * 100) / 100 : undefined;

    return {
      id: `strava-${stravaActivity.id}`, // Prefix to avoid conflicts
      userId,
      date,
      sport,
      subSport: stravaActivity.sport_type !== stravaActivity.type ? stravaActivity.sport_type : undefined,
      duration,
      distance,
      avgHR: stravaActivity.average_heartrate || undefined,
      maxHR: stravaActivity.max_heartrate || undefined,
      hrDrift: this.calculateHRDrift(stravaActivity),
      zone1Minutes: hrData.zone1Minutes,
      zone2Minutes: hrData.zone2Minutes,
      zone3Minutes: hrData.zone3Minutes,
      zone4Minutes: hrData.zone4Minutes,
      zone5Minutes: hrData.zone5Minutes,
      trainingLoad,
      calories: stravaActivity.calories || undefined,
      totalAscent: stravaActivity.total_elevation_gain || undefined,
      totalDescent: undefined, // Strava doesn't provide total descent
      avgSpeed,
      maxSpeed,
      avgPace,
      notes: stravaActivity.description || undefined,
      fitFileUrl: undefined, // No FIT file from Strava
      stravaActivityId: stravaActivity.id,
      dataSource: 'strava',
      uploadedAt: new Date(),
      processed: true // Strava data comes pre-processed
    };
  }

  /**
   * Convert Strava laps to Firebase lap format
   */
  public mapStravaLapsToFirebase(
    stravaLaps: StravaLap[],
    userId: string,
    activityId: string
  ): FirebaseLapData[] {
    return stravaLaps.map((lap, index) => ({
      id: `${activityId}-lap-${lap.lap_index || index + 1}`,
      userId,
      activityId,
      lapNumber: lap.lap_index || index + 1,
      lapDuration: Math.round(lap.moving_time / 60), // Convert to minutes
      lapDistance: Math.round(lap.distance / 1000 * 100) / 100, // Convert to km
      avgHR: lap.average_heartrate || undefined,
      maxHR: lap.max_heartrate || undefined,
      avgSpeed: lap.average_speed ? Math.round(lap.average_speed * 3.6 * 100) / 100 : undefined,
      maxSpeed: lap.max_speed ? Math.round(lap.max_speed * 3.6 * 100) / 100 : undefined,
      avgPace: lap.average_speed ? Math.round(60 / (lap.average_speed * 3.6) * 100) / 100 : undefined,
      elevationGain: lap.total_elevation_gain || undefined,
      elevationLoss: undefined, // Strava doesn't provide lap elevation loss
      avgPower: lap.average_watts || undefined,
      maxPower: undefined, // Not available in lap data
      normalizedPower: undefined, // Would need calculation
      startTime: new Date(lap.start_date),
      endTime: new Date(new Date(lap.start_date).getTime() + (lap.elapsed_time * 1000)),
      splitType: 'auto' // Assume auto splits from Strava
    }));
  }

  /**
   * Map Strava activity type to internal sport classification
   */
  private mapStravaTypeToSport(type: string, sportType?: string): string {
    // Use sport_type if available, otherwise fall back to type
    const stravaType = sportType || type;
    return STRAVA_SPORT_MAPPINGS[stravaType] || type.toLowerCase();
  }

  /**
   * Check if activity is a running-based sport for pace calculations
   */
  private isRunningActivity(sport: string): boolean {
    const runningSports = ['running', 'trail_running', 'walking', 'hiking'];
    return runningSports.includes(sport);
  }

  /**
   * Format date string to YYYY-MM-DD format
   */
  private formatDateString(isoDate: string): string {
    const date = new Date(isoDate);
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  }

  /**
   * Calculate HR zone distribution (simplified estimation)
   * Note: Strava doesn't provide detailed HR zone breakdown in activity summary
   */
  private calculateHRZones(
    activity: StravaActivity,
    hrZones: HRZoneConfig,
    durationMinutes: number
  ): {
    zone1Minutes: number;
    zone2Minutes: number;
    zone3Minutes: number;
    zone4Minutes: number;
    zone5Minutes: number;
  } {
    if (!activity.has_heartrate || !activity.average_heartrate) {
      return this.getEmptyHRZones();
    }

    const avgHR = activity.average_heartrate;
    
    // Simple estimation: assume HR was primarily in the zone of the average HR
    // In reality, we'd need detailed HR stream data for accurate zone calculation
    const primaryZone = this.getHRZoneForBPM(avgHR, hrZones);
    
    const zones = this.getEmptyHRZones();
    
    // Distribute time across zones with primary zone getting most time
    switch (primaryZone) {
      case 1:
        zones.zone1Minutes = Math.round(durationMinutes * 0.8);
        zones.zone2Minutes = Math.round(durationMinutes * 0.2);
        break;
      case 2:
        zones.zone1Minutes = Math.round(durationMinutes * 0.2);
        zones.zone2Minutes = Math.round(durationMinutes * 0.6);
        zones.zone3Minutes = Math.round(durationMinutes * 0.2);
        break;
      case 3:
        zones.zone2Minutes = Math.round(durationMinutes * 0.2);
        zones.zone3Minutes = Math.round(durationMinutes * 0.6);
        zones.zone4Minutes = Math.round(durationMinutes * 0.2);
        break;
      case 4:
        zones.zone3Minutes = Math.round(durationMinutes * 0.2);
        zones.zone4Minutes = Math.round(durationMinutes * 0.6);
        zones.zone5Minutes = Math.round(durationMinutes * 0.2);
        break;
      case 5:
        zones.zone4Minutes = Math.round(durationMinutes * 0.3);
        zones.zone5Minutes = Math.round(durationMinutes * 0.7);
        break;
    }
    
    return zones;
  }

  /**
   * Get empty HR zones object
   */
  private getEmptyHRZones() {
    return {
      zone1Minutes: 0,
      zone2Minutes: 0,
      zone3Minutes: 0,
      zone4Minutes: 0,
      zone5Minutes: 0
    };
  }

  /**
   * Determine which HR zone a given BPM falls into
   */
  private getHRZoneForBPM(bpm: number, hrZones: HRZoneConfig): number {
    if (bpm >= hrZones.zone5.min) return 5;
    if (bpm >= hrZones.zone4.min) return 4;
    if (bpm >= hrZones.zone3.min) return 3;
    if (bpm >= hrZones.zone2.min) return 2;
    return 1;
  }

  /**
   * Calculate HR drift (simplified estimation)
   */
  private calculateHRDrift(activity: StravaActivity): number | undefined {
    if (!activity.has_heartrate || !activity.average_heartrate) {
      return undefined;
    }

    // Without detailed HR stream data, we can't calculate true HR drift
    // This would require the first third vs last third comparison
    // For now, return undefined to indicate no drift calculation available
    return undefined;
  }

  /**
   * Calculate training load using TRIMP method
   */
  private calculateTrainingLoad(
    durationMinutes: number,
    avgHR: number,
    restingHR: number,
    maxHR: number
  ): number {
    if (!avgHR || avgHR <= restingHR) {
      return 0;
    }

    // Heart rate reserve ratio
    const hrRatio = (avgHR - restingHR) / (maxHR - restingHR);
    
    // TRIMP calculation: Duration × HR ratio × e^(1.92 × HR ratio)
    const trimp = durationMinutes * hrRatio * Math.exp(1.92 * hrRatio);
    
    return Math.round(trimp * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Extract activity summary for preview/display
   */
  public extractActivitySummary(activity: StravaActivity): {
    name: string;
    type: string;
    date: string;
    duration: string;
    distance: string;
    hasHeartRate: boolean;
    isPrivate: boolean;
  } {
    const duration = this.formatDuration(activity.moving_time);
    const distance = (activity.distance / 1000).toFixed(2) + ' km';
    
    return {
      name: activity.name,
      type: activity.type,
      date: new Date(activity.start_date_local).toLocaleDateString(),
      duration,
      distance,
      hasHeartRate: activity.has_heartrate,
      isPrivate: activity.private
    };
  }

  /**
   * Format duration from seconds to readable string
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Check if Strava activity already exists in Firebase format
   */
  public createActivityMapping(
    stravaActivity: StravaActivity,
    firebaseActivityId: string
  ): {
    stravaActivityId: number;
    firebaseActivityId: string;
    lastUpdated: Date;
    syncStatus: 'synced';
  } {
    return {
      stravaActivityId: stravaActivity.id,
      firebaseActivityId,
      lastUpdated: new Date(),
      syncStatus: 'synced'
    };
  }
}