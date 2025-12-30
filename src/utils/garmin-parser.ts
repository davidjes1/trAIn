// Garmin FIT File Parser Utilities for trAIn
import { ParsedFitData, SportType, HRZone } from '@/core/models';

/**
 * Parse Garmin FIT file data into standardized format
 */
export class GarminParser {
  
  /**
   * Convert raw FIT file data to ParsedFitData format
   */
  static parseFitFile(rawFitData: any): ParsedFitData {
    try {
      console.log('🔄 Parsing Garmin FIT file data');

      // Extract basic activity info
      const activity = rawFitData.activity?.[0] || {};
      const session = rawFitData.sessions?.[0] || {};
      const records = rawFitData.records || [];

      // Generate activity ID if not present
      const activityId = activity.timestamp 
        ? `garmin_${new Date(activity.timestamp).getTime()}`
        : `activity_${Date.now()}`;

      // Determine sport type
      const sport = this.mapGarminSport(session.sport || activity.sport || 'running');

      // Extract date and time
      const startTime = new Date(session.start_time || activity.timestamp || Date.now());
      const date = startTime.toISOString().split('T')[0];

      // Calculate duration (prefer session data)
      const durationSeconds = session.total_timer_time || activity.total_timer_time || 0;
      const durationMin = Math.round(durationSeconds / 60);

      // Distance in kilometers
      const distanceMeters = session.total_distance || activity.total_distance || 0;
      const distanceKm = distanceMeters / 1000;

      // Heart rate data
      const avgHR = session.avg_heart_rate || this.calculateAverageHR(records);
      const maxHR = session.max_heart_rate || this.calculateMaxHR(records);

      // Pace calculation (mm:ss per km)
      const avgPace = durationMin > 0 && distanceKm > 0 
        ? this.calculatePace(durationMin, distanceKm)
        : undefined;

      // Power data (for cycling)
      const avgPower = session.avg_power;
      const maxPower = session.max_power;

      // Elevation data
      const ascentM = session.total_ascent;
      const descentM = session.total_descent;

      // Additional metrics
      const calories = session.total_calories;
      const avgCadence = session.avg_cadence;
      const avgSpeed = distanceKm > 0 && durationMin > 0 
        ? (distanceKm / (durationMin / 60)) // km/h
        : undefined;

      // Calculate heart rate zones
      const zones = this.calculateHRZones(records, avgHR, maxHR);

      // Training load estimation
      const trainingLoad = this.estimateTrainingLoad(durationMin, avgHR, zones);

      const parsedData: ParsedFitData = {
        activityId,
        sport,
        date,
        startTime,
        durationMin,
        distanceKm,
        avgHR,
        maxHR,
        avgPace,
        avgPower,
        maxPower,
        ascentM,
        descentM,
        calories,
        avgCadence,
        avgSpeed,
        zones,
        trainingLoad,
        rawData: rawFitData
      };

      console.log('✅ Successfully parsed FIT file data');
      console.log(`📊 Activity: ${sport} • ${durationMin}min • ${distanceKm.toFixed(1)}km`);
      
      return parsedData;

    } catch (error) {
      console.error('❌ Error parsing FIT file:', error);
      throw new Error(`Failed to parse FIT file: ${error}`);
    }
  }

  /**
   * Map Garmin sport types to our standardized sports
   */
  private static mapGarminSport(garminSport: string): SportType {
    const sportMap: Record<string, SportType> = {
      'running': 'run',
      'cycling': 'bike',
      'swimming': 'swim',
      'strength_training': 'strength',
      'yoga': 'yoga',
      'walking': 'run', // Map walking to run
      'hiking': 'run',
      'treadmill': 'run',
      'indoor_cycling': 'bike',
      'road_biking': 'bike',
      'mountain_biking': 'bike',
      'pool_swim': 'swim',
      'open_water': 'swim'
    };

    const normalizedSport = garminSport.toLowerCase().replace(/[_-]/g, '_');
    return sportMap[normalizedSport] || 'other';
  }

  /**
   * Calculate average heart rate from records
   */
  private static calculateAverageHR(records: any[]): number | undefined {
    if (!records || records.length === 0) return undefined;

    const hrRecords = records.filter(r => r.heart_rate && r.heart_rate > 0);
    if (hrRecords.length === 0) return undefined;

    const totalHR = hrRecords.reduce((sum, r) => sum + r.heart_rate, 0);
    return Math.round(totalHR / hrRecords.length);
  }

  /**
   * Calculate maximum heart rate from records
   */
  private static calculateMaxHR(records: any[]): number | undefined {
    if (!records || records.length === 0) return undefined;

    const hrValues = records
      .map(r => r.heart_rate)
      .filter(hr => hr && hr > 0);
      
    return hrValues.length > 0 ? Math.max(...hrValues) : undefined;
  }

  /**
   * Calculate pace in mm:ss format per kilometer
   */
  private static calculatePace(durationMin: number, distanceKm: number): string {
    if (distanceKm === 0) return '00:00';
    
    const paceMinutesPerKm = durationMin / distanceKm;
    const minutes = Math.floor(paceMinutesPerKm);
    const seconds = Math.round((paceMinutesPerKm - minutes) * 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate heart rate zones based on records
   */
  private static calculateHRZones(
    records: any[], 
    avgHR?: number, 
    maxHR?: number
  ): HRZone[] {
    // Default HR zones based on percentages of max HR
    const defaultMaxHR = maxHR || 190; // Default if not available
    
    const zoneThresholds = [
      { zone: 1, min: 0, max: 0.68 * defaultMaxHR },      // Recovery
      { zone: 2, min: 0.68 * defaultMaxHR, max: 0.78 * defaultMaxHR }, // Aerobic base
      { zone: 3, min: 0.78 * defaultMaxHR, max: 0.87 * defaultMaxHR }, // Aerobic
      { zone: 4, min: 0.87 * defaultMaxHR, max: 0.93 * defaultMaxHR }, // Lactate threshold
      { zone: 5, min: 0.93 * defaultMaxHR, max: 220 }     // Neuromuscular
    ];

    // Initialize zone counters
    const zoneCounts = [0, 0, 0, 0, 0];
    let totalRecords = 0;

    // Count records in each zone
    if (records && records.length > 0) {
      const hrRecords = records.filter(r => r.heart_rate && r.heart_rate > 0);
      totalRecords = hrRecords.length;

      hrRecords.forEach(record => {
        const hr = record.heart_rate;
        for (let i = 0; i < zoneThresholds.length; i++) {
          if (hr >= zoneThresholds[i].min && hr < zoneThresholds[i].max) {
            zoneCounts[i]++;
            break;
          }
        }
      });
    }

    // Convert to minutes (assuming 1 record per second)
    const zones: HRZone[] = zoneThresholds.map((threshold, index) => {
      const minutes = Math.round(zoneCounts[index] / 60); // Convert seconds to minutes
      const percentage = totalRecords > 0 ? (zoneCounts[index] / totalRecords) * 100 : 0;
      
      return {
        zone: threshold.zone,
        minutes,
        percentage: Math.round(percentage)
      };
    });

    return zones;
  }

  /**
   * Estimate training load based on duration, HR, and zones
   */
  private static estimateTrainingLoad(
    durationMin: number, 
    avgHR?: number, 
    zones?: HRZone[]
  ): number {
    if (!avgHR || !zones || durationMin === 0) {
      // Fallback estimation based on duration
      return Math.round(durationMin * 1.5);
    }

    // TRIMP-based estimation
    let load = 0;
    const restingHR = 60; // Assumed resting HR
    const maxHR = 190; // Assumed max HR

    zones.forEach(zone => {
      if (zone.minutes > 0) {
        // Zone-specific multipliers
        const zoneMultipliers = [1.0, 1.2, 1.8, 2.5, 3.5];
        const multiplier = zoneMultipliers[zone.zone - 1] || 1.0;
        load += zone.minutes * multiplier;
      }
    });

    // Alternative calculation if zone data is insufficient
    if (load === 0) {
      const hrRatio = (avgHR - restingHR) / (maxHR - restingHR);
      load = durationMin * hrRatio * Math.exp(1.92 * hrRatio);
    }

    return Math.round(load);
  }

  /**
   * Validate parsed FIT data
   */
  static validateParsedData(data: ParsedFitData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.activityId) {
      errors.push('Missing activity ID');
    }

    if (!data.date || !data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push('Invalid or missing date format (YYYY-MM-DD)');
    }

    if (data.durationMin <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (data.distanceKm < 0) {
      errors.push('Distance cannot be negative');
    }

    if (!['run', 'bike', 'swim', 'strength', 'yoga', 'other'].includes(data.sport)) {
      errors.push('Invalid sport type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create sample test data for development
   */
  static createSampleParsedData(overrides: Partial<ParsedFitData> = {}): ParsedFitData {
    const baseData: ParsedFitData = {
      activityId: 'sample_123456789',
      sport: 'run',
      date: '2024-01-15',
      startTime: new Date('2024-01-15T07:00:00Z'),
      durationMin: 45,
      distanceKm: 8.5,
      avgHR: 155,
      maxHR: 172,
      avgPace: '05:18',
      avgPower: undefined,
      maxPower: undefined,
      ascentM: 125,
      descentM: 118,
      calories: 485,
      avgCadence: 165,
      avgSpeed: 11.3,
      zones: [
        { zone: 1, minutes: 2, percentage: 4 },
        { zone: 2, minutes: 18, percentage: 40 },
        { zone: 3, minutes: 20, percentage: 44 },
        { zone: 4, minutes: 5, percentage: 11 },
        { zone: 5, minutes: 0, percentage: 0 }
      ],
      trainingLoad: 68,
      rawData: {
        activity: [{ timestamp: '2024-01-15T07:00:00Z' }],
        sessions: [{ sport: 'running', total_timer_time: 2700 }],
        records: []
      }
    };

    return { ...baseData, ...overrides };
  }
}

export default GarminParser;