// Training configuration for HR zones and metrics

export interface TrainingConfig {
  restingHR: number;
  maxHR: number;
  hrZones: HRZoneConfig[];
  paceSports: string[];
  speedSports: string[];
}

export interface HRZoneConfig {
  zone: number;
  name: string;
  minPercent: number;
  maxPercent: number;
  color: string;
  description: string;
}

// Default training configuration
export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  restingHR: 59, // Baseline resting HR for TRIMP calculations
  maxHR: 190,    // Default max HR (should be personalized)
  
  // HR Zones based on % of max HR
  hrZones: [
    {
      zone: 1,
      name: 'Recovery',
      minPercent: 50,
      maxPercent: 60,
      color: '#4CAF50', // Green
      description: 'Active recovery and warm-up'
    },
    {
      zone: 2,
      name: 'Aerobic Base',
      minPercent: 60,
      maxPercent: 70,
      color: '#8BC34A', // Light Green
      description: 'Aerobic base building'
    },
    {
      zone: 3,
      name: 'Aerobic',
      minPercent: 70,
      maxPercent: 80,
      color: '#FFC107', // Amber
      description: 'Aerobic development'
    },
    {
      zone: 4,
      name: 'Threshold',
      minPercent: 80,
      maxPercent: 90,
      color: '#FF9800', // Orange
      description: 'Lactate threshold'
    },
    {
      zone: 5,
      name: 'Neuromuscular',
      minPercent: 90,
      maxPercent: 100,
      color: '#F44336', // Red
      description: 'Neuromuscular power'
    }
  ],
  
  // Sports that use pace (min/km) vs speed (km/h)
  paceSports: ['running', 'run', 'trail_running', 'track_running'],
  speedSports: ['cycling', 'bike', 'road_cycling', 'mountain_biking', 'swimming']
};

// Utility functions for HR zone calculations
export class HRZoneCalculator {
  private config: TrainingConfig;

  constructor(config: TrainingConfig = DEFAULT_TRAINING_CONFIG) {
    this.config = config;
  }

  public getHRZone(heartRate: number): number {
    const hrPercent = (heartRate / this.config.maxHR) * 100;
    
    for (const zone of this.config.hrZones) {
      if (hrPercent >= zone.minPercent && hrPercent <= zone.maxPercent) {
        return zone.zone;
      }
    }
    
    // Return zone 1 for very low HR, zone 5 for very high HR
    return hrPercent < this.config.hrZones[0].minPercent ? 1 : 5;
  }

  public getZoneThresholds(): { [zone: number]: { min: number; max: number } } {
    const thresholds: { [zone: number]: { min: number; max: number } } = {};
    
    this.config.hrZones.forEach(zone => {
      thresholds[zone.zone] = {
        min: Math.round((zone.minPercent / 100) * this.config.maxHR),
        max: Math.round((zone.maxPercent / 100) * this.config.maxHR)
      };
    });
    
    return thresholds;
  }

  public calculateTRIMP(avgHR: number, durationMinutes: number): number {
    // TRIMP (Training Impulse) = Duration × HR Ratio × Exponential Factor
    // HR Ratio = (avg HR - resting HR) / (max HR - resting HR)
    const hrRatio = (avgHR - this.config.restingHR) / (this.config.maxHR - this.config.restingHR);
    
    // Exponential factor varies by gender - using male factor (1.92)
    const exponentialFactor = 1.92;
    const trimp = durationMinutes * hrRatio * Math.exp(exponentialFactor * hrRatio);
    
    return Math.round(trimp * 10) / 10; // Round to 1 decimal place
  }

  public isPaceSport(sport: string): boolean {
    return this.config.paceSports.some(s => 
      sport.toLowerCase().includes(s.toLowerCase())
    );
  }

  public isSpeedSport(sport: string): boolean {
    return this.config.speedSports.some(s => 
      sport.toLowerCase().includes(s.toLowerCase())
    );
  }
}