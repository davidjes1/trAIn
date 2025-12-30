import { ParsedFitData } from '../types/fit-parser.types';
import {
  ActivityMetrics,
  LapMetrics,
  ProcessingResult,
  HRZoneDistribution,
  BatchProcessingOptions
} from '@/core/models';
import { HRZoneCalculator, DEFAULT_TRAINING_CONFIG } from '../config/training';
import { DashboardService } from './DashboardService';

export class AnalysisService {
  private hrCalculator: HRZoneCalculator;
  private dashboardService: DashboardService;

  constructor() {
    this.hrCalculator = new HRZoneCalculator(DEFAULT_TRAINING_CONFIG);
    this.dashboardService = new DashboardService();
  }

  /**
   * Process multiple JSON files containing parsed FIT data
   */
  public async processBatchFiles(
    files: File[] | string[], 
    _options: BatchProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      activitiesProcessed: 0,
      activitiesSkipped: 0,
      totalActivities: [],
      totalLaps: [],
      errors: [],
      processingTimeMs: 0
    };

    try {
      for (const file of files) {
        try {
          let fitData: ParsedFitData;
          
          if (typeof file === 'string') {
            // File path - for CLI usage
            fitData = await this.loadJsonFile(file);
          } else {
            // File object - for browser usage
            fitData = await this.parseFileContent(file);
          }

          const activityMetrics = this.extractActivityMetrics(fitData, typeof file === 'string' ? file : file.name);
          const lapMetrics = this.extractLapMetrics(fitData, activityMetrics.date, activityMetrics.activityId);

          // Save to Firebase/localStorage through DashboardService
          try {
            const savedActivityId = await this.dashboardService.addActivity(activityMetrics);
            
            // Update lap metrics with the actual saved activity ID
            const lapsWithActivityId = lapMetrics.map(lap => ({
              ...lap,
              activityId: savedActivityId
            }));
            
            await this.dashboardService.addLapData(lapsWithActivityId);
            
            // Update activity metrics with saved ID for result
            activityMetrics.activityId = savedActivityId;
          } catch (saveError) {
            console.warn('Failed to save activity to Firebase, data will only be in result:', saveError);
          }

          result.totalActivities.push(activityMetrics);
          result.totalLaps.push(...lapMetrics);
          result.activitiesProcessed++;

        } catch (error) {
          result.activitiesSkipped++;
          result.errors.push(`Error processing ${typeof file === 'string' ? file : file.name}: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      result.errors.push(`Batch processing error: ${(error as Error).message}`);
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Extract comprehensive activity metrics from parsed FIT data
   */
  public extractActivityMetrics(fitData: ParsedFitData, fileName?: string): ActivityMetrics {
    const session = this.getPrimarySession(fitData);
    const records = fitData.records || [];
    const activity = Array.isArray(fitData.activity) ? fitData.activity[0] : fitData.activity;

    // Basic activity info
    const startTime = session?.start_time || activity?.timestamp || new Date();
    const date = new Date(startTime).toISOString().split('T')[0];
    
    // Duration and distance
    const duration = this.convertToMinutes(session?.total_elapsed_time || session?.total_timer_time || 0);
    const distance = this.extractDistance(fitData, session);

    // Heart rate analysis
    const hrMetrics = this.analyzeHeartRate(records);
    const hrZones = this.calculateHRZoneDistribution(records, duration);

    // Training load
    const trainingLoad = hrMetrics.avgHR ? 
      this.hrCalculator.calculateTRIMP(hrMetrics.avgHR, duration) : 0;

    // Sport classification
    const sport = this.normalizeSport(session?.sport || activity?.event || 'unknown');

    const metrics: ActivityMetrics = {
      date,
      activityId: this.generateActivityId(date, sport),
      sport,
      subSport: session?.sub_sport || undefined,
      duration,
      distance,
      avgHR: hrMetrics.avgHR || undefined,
      maxHR: hrMetrics.maxHR || undefined,
      hrDrift: hrMetrics.hrDrift || undefined,
      zone1Minutes: hrZones.zone1,
      zone2Minutes: hrZones.zone2,
      zone3Minutes: hrZones.zone3,
      zone4Minutes: hrZones.zone4,
      zone5Minutes: hrZones.zone5,
      trainingLoad,
      calories: session?.total_calories || undefined,
      totalAscent: session?.total_ascent || undefined,
      totalDescent: session?.total_descent || undefined,
      avgSpeed: this.convertToKmh(session?.avg_speed),
      maxSpeed: this.convertToKmh(session?.max_speed),
      fileName
    };

    // Calculate pace for running sports
    if (this.hrCalculator.isPaceSport(sport) && distance > 0) {
      metrics.avgPace = duration / distance; // min/km
    }

    return metrics;
  }

  /**
   * Extract lap metrics from parsed FIT data
   */
  public extractLapMetrics(fitData: ParsedFitData, activityDate: string, activityId?: string): LapMetrics[] {
    const laps = fitData.laps || [];
    const lapMetrics: LapMetrics[] = [];

    laps.forEach((lap, index) => {
      const lapDuration = this.convertToMinutes(lap.total_elapsed_time || lap.total_timer_time || 0);
      const lapDistance = this.extractLapDistance(lap);

      const metrics: LapMetrics = {
        date: activityDate,
        activityId,
        lapNumber: index + 1,
        lapDuration,
        lapDistance,
        avgHR: lap.avg_heart_rate,
        maxHR: lap.max_heart_rate,
        avgSpeed: this.convertToKmh(lap.avg_speed),
        maxSpeed: this.convertToKmh(lap.max_speed),
        elevationGain: lap.total_ascent,
        elevationLoss: lap.total_descent,
        avgPower: lap.avg_power,
        maxPower: lap.max_power,
        normalizedPower: lap.normalized_power,
        startTime: lap.start_time ? new Date(lap.start_time) : undefined,
        endTime: lap.timestamp ? new Date(lap.timestamp) : undefined
      };

      // Calculate pace for running sports
      if (lapDistance > 0) {
        const sport = this.extractSportFromActivity(fitData);
        if (this.hrCalculator.isPaceSport(sport)) {
          metrics.avgPace = lapDuration / lapDistance; // min/km
        }
      }

      lapMetrics.push(metrics);
    });

    return lapMetrics;
  }

  /**
   * Analyze heart rate data from records
   */
  private analyzeHeartRate(records: any[]): { avgHR?: number; maxHR?: number; hrDrift?: number } {
    const hrRecords = records.filter(r => r.heart_rate && r.heart_rate > 0);
    
    if (hrRecords.length === 0) {
      return {};
    }

    // Basic HR metrics
    const heartRates = hrRecords.map(r => r.heart_rate);
    const avgHR = Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length);
    const maxHR = Math.max(...heartRates);

    // HR Drift calculation (first third vs last third)
    let hrDrift: number | undefined;
    if (hrRecords.length >= 6) { // Need at least 6 records for meaningful thirds
      const thirdSize = Math.floor(hrRecords.length / 3);
      const firstThird = hrRecords.slice(0, thirdSize).map(r => r.heart_rate);
      const lastThird = hrRecords.slice(-thirdSize).map(r => r.heart_rate);
      
      const avgFirstThird = firstThird.reduce((sum, hr) => sum + hr, 0) / firstThird.length;
      const avgLastThird = lastThird.reduce((sum, hr) => sum + hr, 0) / lastThird.length;
      
      hrDrift = Math.round(((avgLastThird - avgFirstThird) / avgFirstThird) * 100 * 10) / 10;
    }

    return { avgHR, maxHR, hrDrift };
  }

  /**
   * Calculate time spent in each HR zone
   */
  private calculateHRZoneDistribution(records: any[], totalDurationMinutes: number): HRZoneDistribution {
    const hrRecords = records.filter(r => r.heart_rate && r.heart_rate > 0);
    
    if (hrRecords.length === 0) {
      return { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0, totalTime: totalDurationMinutes };
    }

    // Assume records are evenly spaced in time
    const timePerRecord = totalDurationMinutes / hrRecords.length;
    
    const zoneTime = { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };
    
    hrRecords.forEach(record => {
      const zone = this.hrCalculator.getHRZone(record.heart_rate);
      const zoneKey = `zone${zone}` as keyof typeof zoneTime;
      zoneTime[zoneKey] += timePerRecord;
    });

    // Round to 1 decimal place
    Object.keys(zoneTime).forEach(key => {
      const zoneKey = key as keyof typeof zoneTime;
      zoneTime[zoneKey] = Math.round(zoneTime[zoneKey] * 10) / 10;
    });

    return {
      ...zoneTime,
      totalTime: totalDurationMinutes
    };
  }

  /**
   * Utility methods
   */
  private async loadJsonFile(filePath: string): Promise<ParsedFitData> {
    // For Node.js environment (CLI usage)
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private async parseFileContent(file: File): Promise<ParsedFitData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          resolve(data);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${(error as Error).message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private getPrimarySession(fitData: ParsedFitData): any {
    if (fitData.sessions && fitData.sessions.length > 0) {
      return fitData.sessions[0];
    }
    
    if (fitData.activity && !Array.isArray(fitData.activity) && fitData.activity.sessions) {
      return fitData.activity.sessions[0];
    }
    
    return null;
  }

  private extractSportFromActivity(fitData: ParsedFitData): string {
    const session = this.getPrimarySession(fitData);
    const activity = Array.isArray(fitData.activity) ? fitData.activity[0] : fitData.activity;
    
    return this.normalizeSport(session?.sport || activity?.event || 'unknown');
  }

  private normalizeSport(sport: string): string {
    const sportMap: { [key: string]: string } = {
      'cycling': 'Bike',
      'bike': 'Bike',
      'road_cycling': 'Bike',
      'mountain_biking': 'Bike',
      'running': 'Run',
      'run': 'Run',
      'trail_running': 'Run',
      'track_running': 'Run',
      'swimming': 'Swim',
      'swim': 'Swim',
      'walking': 'Walk',
      'walk': 'Walk',
      'hiking': 'Hike'
    };

    const normalized = sport.toLowerCase().replace(/[^a-z_]/g, '');
    return sportMap[normalized] || sport;
  }

  private generateActivityId(date: string, sport: string): string {
    return `${date}_${sport.toLowerCase()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private convertToMinutes(seconds?: number): number {
    return seconds ? Math.round((seconds / 60) * 10) / 10 : 0;
  }

  private convertToKm(meters?: number): number {
    return meters ? Math.round((meters / 1000) * 100) / 100 : 0;
  }

  private convertToKmh(metersPerSecond?: number): number {
    return metersPerSecond ? Math.round((metersPerSecond * 3.6) * 10) / 10 : 0;
  }

  /**
   * Extract distance using multiple fallback methods
   */
  private extractDistance(fitData: ParsedFitData, session: any): number {
    console.log('Extracting distance - session data:', {
      total_distance: session?.total_distance,
      avg_speed: session?.avg_speed,
      enhanced_avg_speed: session?.enhanced_avg_speed,
      total_timer_time: session?.total_timer_time,
      total_elapsed_time: session?.total_elapsed_time
    });

    // Method 1: Try session total_distance
    if (session?.total_distance && session.total_distance > 0) {
      console.log('Using session total_distance:', session.total_distance);
      const converted = this.convertToKm(session.total_distance);
      console.log('Converted distance (assuming meters):', converted, 'km');
      
      // The FitParser is configured with lengthUnit: 'km', so distance is already in km
      // No need to convert from meters - just round to 2 decimal places
      console.log('Distance already in km from parser, using as-is:', session.total_distance);
      return Math.round(session.total_distance * 100) / 100;
    }

    // Method 2: Try activity total_distance
    const activity = Array.isArray(fitData.activity) ? fitData.activity[0] : fitData.activity;
    if (activity?.total_distance && activity.total_distance > 0) {
      console.log('Using activity total_distance:', activity.total_distance);
      return Math.round(activity.total_distance * 100) / 100; // Already in km
    }

    // Method 3: Try session enhanced_avg_speed * duration (if available)
    if (session?.enhanced_avg_speed && session?.total_timer_time) {
      // enhanced_avg_speed is in km/h, total_timer_time is in seconds
      // Distance = speed (km/h) * time (h) = speed * (time_seconds / 3600)
      const distanceFromSpeed = session.enhanced_avg_speed * (session.total_timer_time / 3600);
      if (distanceFromSpeed > 0) {
        console.log('Calculated distance from enhanced_avg_speed:', distanceFromSpeed, 'km');
        return Math.round(distanceFromSpeed * 100) / 100;
      }
    }

    // Method 4: Try regular avg_speed * duration
    if (session?.avg_speed && session?.total_timer_time) {
      // avg_speed is in km/h, total_timer_time is in seconds
      const distanceFromSpeed = session.avg_speed * (session.total_timer_time / 3600);
      if (distanceFromSpeed > 0) {
        console.log('Calculated distance from avg_speed:', distanceFromSpeed, 'km');
        return Math.round(distanceFromSpeed * 100) / 100;
      }
    }

    // Method 5: Calculate from GPS records (last resort)
    const records = fitData.records || [];
    if (records.length > 0) {
      const distanceFromGPS = this.calculateDistanceFromRecords(records);
      if (distanceFromGPS > 0) {
        console.log('Calculated distance from GPS records:', distanceFromGPS);
        return distanceFromGPS;
      }
    }

    // Method 6: Check if there's a distance field in the last record
    if (records.length > 0) {
      const lastRecord = records[records.length - 1];
      if (lastRecord.distance && lastRecord.distance > 0) {
        console.log('Using distance from last record:', lastRecord.distance);
        return Math.round(lastRecord.distance * 100) / 100; // Already in km
      }
    }

    console.log('No distance data found in any source');
    return 0;
  }

  /**
   * Calculate distance from GPS coordinate records
   */
  private calculateDistanceFromRecords(records: any[]): number {
    let totalDistance = 0;
    let lastLat: number | null = null;
    let lastLon: number | null = null;

    for (const record of records) {
      // Check for position coordinates
      const lat = record.position_lat || record.lat;
      const lon = record.position_long || record.lng || record.lon;

      if (lat && lon && lastLat !== null && lastLon !== null) {
        // Calculate distance between two GPS points using Haversine formula
        const distance = this.haversineDistance(lastLat, lastLon, lat, lon);
        totalDistance += distance;
      }

      if (lat && lon) {
        lastLat = lat;
        lastLon = lon;
      }
    }

    return totalDistance; // Already in km from haversineDistance
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Extract lap distance using multiple fallback methods
   */
  private extractLapDistance(lap: any): number {
    // Method 1: Try lap total_distance (already in km from parser)
    if (lap?.total_distance && lap.total_distance > 0) {
      return Math.round(lap.total_distance * 100) / 100;
    }

    // Method 2: Calculate from avg_speed * duration
    if (lap?.avg_speed && lap?.total_timer_time) {
      // avg_speed is in km/h, total_timer_time is in seconds
      const distanceFromSpeed = lap.avg_speed * (lap.total_timer_time / 3600);
      if (distanceFromSpeed > 0) {
        return Math.round(distanceFromSpeed * 100) / 100;
      }
    }

    // Method 3: Try enhanced_avg_speed * duration
    if (lap?.enhanced_avg_speed && lap?.total_timer_time) {
      // enhanced_avg_speed is in km/h, total_timer_time is in seconds
      const distanceFromSpeed = lap.enhanced_avg_speed * (lap.total_timer_time / 3600);
      if (distanceFromSpeed > 0) {
        return Math.round(distanceFromSpeed * 100) / 100;
      }
    }

    return 0;
  }
}