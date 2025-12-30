// Service for intelligently matching uploaded FIT files with planned workouts
import {
  TrackedWorkout,
  WorkoutMatchResult,
  WorkoutMatchingConfig,
  WorkoutComparison,
  ZoneCompliance,
  ActivityMetrics,
  LapMetrics,
  TrainingPlan
} from '@/core/models';

export class WorkoutMatchingService {
  private static readonly DEFAULT_CONFIG: WorkoutMatchingConfig = {
    dateToleranceDays: 1,
    typeMatchWeight: 0.4,
    durationMatchWeight: 0.3,
    autoMatchEnabled: true
  };

  /**
   * Match a FIT file activity with planned workouts
   */
  static matchWorkout(
    activityData: ActivityMetrics,
    lapData: LapMetrics[],
    plannedWorkouts: TrainingPlan[],
    config: Partial<WorkoutMatchingConfig> = {}
  ): WorkoutMatchResult {
    const matchConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Find potential matches within date tolerance
    const candidateWorkouts = this.findCandidateWorkouts(
      activityData,
      plannedWorkouts,
      matchConfig.dateToleranceDays
    );

    // Score each candidate
    const matches = candidateWorkouts.map(workout => ({
      plannedWorkout: workout,
      confidence: this.calculateMatchConfidence(activityData, workout, matchConfig),
      matchReasons: this.generateMatchReasons(activityData, workout)
    })).sort((a, b) => b.confidence - a.confidence);

    // Determine best recommendation
    const bestMatch = matches.length > 0 ? matches[0] : undefined;
    const shouldAutoMatch = bestMatch ? bestMatch.confidence >= 75 : false;

    return {
      fitFile: {
        fileName: activityData.fileName || 'unknown.fit',
        activityData,
        lapData
      },
      matches,
      recommendation: {
        bestMatch: bestMatch?.plannedWorkout,
        confidence: bestMatch?.confidence || 0,
        shouldAutoMatch,
        alternatives: matches.slice(1, 4).map(m => m.plannedWorkout)
      }
    };
  }

  /**
   * Create a tracked workout by combining planned and actual data
   */
  static createTrackedWorkout(
    plannedWorkout: TrainingPlan,
    actualWorkout?: ActivityMetrics,
    actualLaps?: LapMetrics[]
  ): TrackedWorkout {
    const trackedWorkout: TrackedWorkout = {
      ...plannedWorkout,
      status: actualWorkout ? 'completed' : 'planned',
      actualWorkout,
      actualLaps,
      completedAt: actualWorkout ? actualWorkout.date + 'T12:00:00Z' : undefined,
      uploadedAt: actualWorkout ? new Date().toISOString() : undefined
    };

    // Generate comparison if both planned and actual exist
    if (actualWorkout) {
      trackedWorkout.comparison = this.generateWorkoutComparison(plannedWorkout, actualWorkout);
    }

    return trackedWorkout;
  }

  /**
   * Generate detailed comparison between planned and actual workout
   */
  static generateWorkoutComparison(
    planned: TrainingPlan,
    actual: ActivityMetrics
  ): WorkoutComparison {
    // Duration variance
    const plannedDuration = planned.durationMin;
    const actualDuration = actual.duration;
    const durationDifference = actualDuration - plannedDuration;
    const durationPercentage = plannedDuration > 0 ? (durationDifference / plannedDuration) * 100 : 0;

    // Intensity variance (estimate planned zones based on workout type)
    const plannedZones = this.estimatePlannedZones(planned);
    const actualZones = {
      zone1: actual.zone1Minutes,
      zone2: actual.zone2Minutes,
      zone3: actual.zone3Minutes,
      zone4: actual.zone4Minutes,
      zone5: actual.zone5Minutes
    };

    const zoneCompliance = this.calculateZoneCompliance(plannedZones, actualZones);
    
    // Calculate actual fatigue based on training load
    const actualFatigue = Math.min(100, Math.max(0, actual.trainingLoad / 5)); // Rough conversion
    const intensityDifference = actualFatigue - planned.expectedFatigue;

    // Performance metrics
    const trainingLoadVariance = actual.trainingLoad - (planned.expectedFatigue * 5); // Rough planned load

    // Generate adherence score
    const adherenceScore = this.calculateAdherenceScore(
      durationPercentage,
      intensityDifference,
      zoneCompliance.compliance.overallCompliance
    );

    return {
      durationVariance: {
        planned: plannedDuration,
        actual: actualDuration,
        difference: durationDifference,
        percentageChange: durationPercentage
      },
      intensityVariance: {
        plannedFatigue: planned.expectedFatigue,
        actualFatigue,
        difference: intensityDifference,
        zoneCompliance
      },
      performance: {
        trainingLoadVariance,
        hrDrift: actual.hrDrift,
        paceConsistency: this.calculatePaceConsistency(actual),
        powerConsistency: undefined // Could be added for cycling
      },
      adherence: {
        score: adherenceScore,
        category: this.getAdherenceCategory(adherenceScore),
        feedback: this.generateAdherenceFeedback(
          durationPercentage,
          intensityDifference,
          zoneCompliance
        )
      }
    };
  }

  /**
   * Find candidate workouts within date tolerance
   */
  private static findCandidateWorkouts(
    activity: ActivityMetrics,
    plannedWorkouts: TrainingPlan[],
    dateToleranceDays: number
  ): TrainingPlan[] {
    const activityDate = new Date(activity.date);
    
    return plannedWorkouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      const daysDiff = Math.abs((activityDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= dateToleranceDays;
    });
  }

  /**
   * Calculate match confidence score (0-100)
   */
  private static calculateMatchConfidence(
    activity: ActivityMetrics,
    planned: TrainingPlan,
    config: WorkoutMatchingConfig
  ): number {
    let score = 0;

    // Date proximity (0-30 points)
    const activityDate = new Date(activity.date);
    const plannedDate = new Date(planned.date);
    const daysDiff = Math.abs((activityDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));
    const dateScore = Math.max(0, 30 - (daysDiff * 15)); // 30 for same day, 15 for 1 day off, 0 for 2+ days
    score += dateScore;

    // Workout type match (0-40 points)
    const typeScore = this.calculateTypeMatchScore(activity.sport, planned.workoutType);
    score += typeScore * config.typeMatchWeight * 100;

    // Duration similarity (0-30 points)
    const durationDiff = Math.abs(activity.duration - planned.durationMin);
    const durationScore = Math.max(0, 30 - (durationDiff / planned.durationMin) * 30);
    score += durationScore * config.durationMatchWeight * 100;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate type match score (0-1)
   */
  private static calculateTypeMatchScore(activitySport: string, plannedType: string): number {
    const sport = activitySport.toLowerCase();
    const planned = plannedType.toLowerCase();

    // Direct matches
    if (sport === planned) return 1.0;
    
    // Close matches
    if ((sport === 'running' || sport === 'run') && planned === 'run') return 1.0;
    if ((sport === 'cycling' || sport === 'bike') && planned === 'bike') return 1.0;
    if (sport === 'strength' && planned === 'strength') return 1.0;
    
    // Partial matches
    if (sport.includes('run') && planned === 'run') return 0.8;
    if (sport.includes('bike') && planned === 'bike') return 0.8;
    if (sport.includes('swim') && planned === 'swim') return 0.8;
    
    // Brick workouts (combination activities)
    if (planned === 'brick' && (sport.includes('run') || sport.includes('bike'))) return 0.6;
    
    return 0.1; // Minimal score for any activity
  }

  /**
   * Generate reasons why this workout matches
   */
  private static generateMatchReasons(activity: ActivityMetrics, planned: TrainingPlan): string[] {
    const reasons: string[] = [];
    
    const activityDate = new Date(activity.date);
    const plannedDate = new Date(planned.date);
    const daysDiff = Math.abs((activityDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      reasons.push('Same date');
    } else if (daysDiff === 1) {
      reasons.push('Adjacent date (1 day difference)');
    }
    
    const typeScore = this.calculateTypeMatchScore(activity.sport, planned.workoutType);
    if (typeScore >= 0.8) {
      reasons.push('Matching workout type');
    } else if (typeScore >= 0.5) {
      reasons.push('Similar workout type');
    }
    
    const durationDiff = Math.abs(activity.duration - planned.durationMin);
    const durationPercent = (durationDiff / planned.durationMin) * 100;
    if (durationPercent <= 10) {
      reasons.push('Very similar duration');
    } else if (durationPercent <= 25) {
      reasons.push('Similar duration');
    }
    
    return reasons;
  }

  /**
   * Estimate planned zones based on workout type and expected fatigue
   */
  private static estimatePlannedZones(planned: TrainingPlan) {
    const totalMinutes = planned.durationMin;
    const fatigue = planned.expectedFatigue;
    
    // Rough zone distribution based on workout intensity
    if (fatigue <= 40) { // Easy workout
      return {
        zone1: totalMinutes * 0.3,
        zone2: totalMinutes * 0.7,
        zone3: 0,
        zone4: 0,
        zone5: 0
      };
    } else if (fatigue <= 65) { // Moderate workout
      return {
        zone1: totalMinutes * 0.2,
        zone2: totalMinutes * 0.6,
        zone3: totalMinutes * 0.2,
        zone4: 0,
        zone5: 0
      };
    } else if (fatigue <= 85) { // Hard workout
      return {
        zone1: totalMinutes * 0.1,
        zone2: totalMinutes * 0.4,
        zone3: totalMinutes * 0.3,
        zone4: totalMinutes * 0.2,
        zone5: 0
      };
    } else { // Extreme workout
      return {
        zone1: totalMinutes * 0.05,
        zone2: totalMinutes * 0.25,
        zone3: totalMinutes * 0.3,
        zone4: totalMinutes * 0.3,
        zone5: totalMinutes * 0.1
      };
    }
  }

  /**
   * Calculate zone compliance between planned and actual
   */
  private static calculateZoneCompliance(
    planned: any,
    actual: any
  ): ZoneCompliance {
    const compliance = {
      zone1Variance: actual.zone1 - planned.zone1,
      zone2Variance: actual.zone2 - planned.zone2,
      zone3Variance: actual.zone3 - planned.zone3,
      zone4Variance: actual.zone4 - planned.zone4,
      zone5Variance: actual.zone5 - planned.zone5,
      overallCompliance: 0
    };

    // Calculate overall compliance (lower variance = higher compliance)
    const totalPlanned = (Object.values(planned) as number[]).reduce((sum, val) => sum + val, 0);
    const totalVariance = (Object.values(compliance) as number[])
      .slice(0, 5) // Only zone variances, not overallCompliance
      .reduce((sum, val) => sum + Math.abs(val), 0);
    
    compliance.overallCompliance = totalPlanned > 0 
      ? Math.max(0, 100 - (totalVariance / totalPlanned) * 100) 
      : 100;

    return { 
      plannedZones: planned, 
      actualZones: actual, 
      compliance 
    };
  }

  /**
   * Calculate overall adherence score
   */
  private static calculateAdherenceScore(
    durationPercent: number,
    intensityDifference: number,
    zoneCompliance: number
  ): number {
    // Duration score (30% weight)
    const durationScore = Math.max(0, 100 - Math.abs(durationPercent));
    
    // Intensity score (40% weight)
    const intensityScore = Math.max(0, 100 - Math.abs(intensityDifference) * 2);
    
    // Zone compliance (30% weight)
    const zoneScore = zoneCompliance;
    
    return Math.round(durationScore * 0.3 + intensityScore * 0.4 + zoneScore * 0.3);
  }

  /**
   * Get adherence category from score
   */
  private static getAdherenceCategory(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Generate adherence feedback messages
   */
  private static generateAdherenceFeedback(
    durationPercent: number,
    intensityDifference: number,
    zoneCompliance: ZoneCompliance
  ): string[] {
    const feedback: string[] = [];
    
    // Duration feedback
    if (Math.abs(durationPercent) <= 5) {
      feedback.push('Duration matched plan perfectly');
    } else if (durationPercent > 5) {
      feedback.push(`Workout was ${Math.round(durationPercent)}% longer than planned`);
    } else {
      feedback.push(`Workout was ${Math.round(Math.abs(durationPercent))}% shorter than planned`);
    }
    
    // Intensity feedback
    if (Math.abs(intensityDifference) <= 5) {
      feedback.push('Intensity matched plan well');
    } else if (intensityDifference > 5) {
      feedback.push('Workout was more intense than planned');
    } else {
      feedback.push('Workout was less intense than planned');
    }
    
    // Zone compliance feedback
    if (zoneCompliance.compliance.overallCompliance >= 80) {
      feedback.push('Excellent heart rate zone distribution');
    } else if (zoneCompliance.compliance.overallCompliance >= 60) {
      feedback.push('Good heart rate zone distribution');
    } else {
      feedback.push('Heart rate zones deviated from plan');
    }
    
    return feedback;
  }

  /**
   * Calculate pace consistency coefficient of variation
   */
  private static calculatePaceConsistency(activity: ActivityMetrics): number | undefined {
    // This would need lap data to calculate properly
    // For now, return undefined - can be enhanced with lap analysis
    return activity.avgPace ? 0.05 : undefined; // Placeholder
  }
}