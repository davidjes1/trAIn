// Plan Adjustment Service - handles dynamic training plan modifications
import { 
  TrainingPlan,
  WorkoutModification,
  WorkoutModificationType,
  PlanAdjustmentOptions,
  PlanAdjustmentResult,
  WorkoutType
} from '../types/training-metrics.types';
import { WorkoutLibrary } from '../config/workouts';

export class PlanAdjustmentService {
  private static readonly DEFAULT_ADJUSTMENT_OPTIONS: PlanAdjustmentOptions = {
    redistributeLoad: true,
    maintainWeeklyVolume: true,
    preserveHardDays: true,
    maxDailyFatigueIncrease: 15
  };

  /**
   * Modify a specific day in the training plan
   */
  static modifyWorkout(
    plan: TrainingPlan[],
    date: string,
    modificationType: WorkoutModificationType,
    newWorkoutData?: Partial<TrainingPlan>,
    reason?: string,
    options: Partial<PlanAdjustmentOptions> = {}
  ): PlanAdjustmentResult {
    const adjustmentOptions = { ...this.DEFAULT_ADJUSTMENT_OPTIONS, ...options };
    const workoutIndex = plan.findIndex(w => w.date === date);
    
    if (workoutIndex === -1) {
      return this.createFailureResult('Workout not found for the specified date');
    }

    const originalWorkout = plan[workoutIndex];
    const modifications: WorkoutModification[] = [];
    
    // Create modified plan
    const adjustedPlan = [...plan];
    let newWorkout: TrainingPlan;

    switch (modificationType) {
      case 'change-to-rest':
        newWorkout = this.createRestDay(originalWorkout);
        break;
      
      case 'change-workout-type':
        if (!newWorkoutData?.workoutType) {
          return this.createFailureResult('New workout type must be specified');
        }
        newWorkout = this.changeWorkoutType(originalWorkout, newWorkoutData.workoutType);
        break;
      
      case 'adjust-duration':
        if (!newWorkoutData?.durationMin) {
          return this.createFailureResult('New duration must be specified');
        }
        newWorkout = this.adjustDuration(originalWorkout, newWorkoutData.durationMin);
        break;
      
      case 'adjust-intensity':
        if (!newWorkoutData?.expectedFatigue) {
          return this.createFailureResult('New intensity level must be specified');
        }
        newWorkout = this.adjustIntensity(originalWorkout, newWorkoutData.expectedFatigue);
        break;
      
      default:
        return this.createFailureResult('Invalid modification type');
    }

    // Apply the modification
    adjustedPlan[workoutIndex] = newWorkout;
    
    // Record the modification
    modifications.push({
      date,
      type: modificationType,
      reason,
      originalWorkout,
      newWorkout: newWorkout,
      timestamp: new Date().toISOString()
    });

    // Calculate impact before rebalancing
    const originalLoad = this.calculateTotalLoad([originalWorkout]);
    const newLoad = this.calculateTotalLoad([newWorkout]);
    const loadDifference = newLoad - originalLoad;

    // Apply rebalancing if needed and requested
    if (adjustmentOptions.redistributeLoad && Math.abs(loadDifference) > 5) {
      const rebalanceResult = this.rebalancePlan(
        adjustedPlan, 
        workoutIndex, 
        loadDifference, 
        adjustmentOptions
      );
      
      if (rebalanceResult.success) {
        adjustedPlan.splice(0, adjustedPlan.length, ...rebalanceResult.adjustedPlan);
        modifications.push(...rebalanceResult.modifications);
      }
    }

    // Calculate final impact
    const impactSummary = this.calculateImpactSummary(plan, adjustedPlan, modifications);
    
    // Generate warnings and recommendations
    const warnings = this.generateWarnings(modifications, impactSummary, adjustmentOptions);
    const recommendations = this.generateRecommendations(modifications, impactSummary);

    return {
      success: true,
      adjustedPlan,
      modifications,
      impactSummary,
      warnings,
      recommendations
    };
  }

  /**
   * Create a rest day workout
   */
  private static createRestDay(originalWorkout: TrainingPlan): TrainingPlan {
    return {
      ...originalWorkout,
      workoutType: 'rest',
      description: 'Rest day - recovery and relaxation',
      expectedFatigue: 0,
      durationMin: 0,
      workoutId: 'rest-zone1'
    };
  }

  /**
   * Change workout type while maintaining appropriate duration and intensity
   */
  private static changeWorkoutType(originalWorkout: TrainingPlan, newType: string): TrainingPlan {
    const similarWorkouts = WorkoutLibrary.getWorkoutsByType(newType);
    
    if (similarWorkouts.length === 0) {
      // Fallback to a basic workout of the requested type
      return {
        ...originalWorkout,
        workoutType: newType,
        description: `${newType} workout`,
        expectedFatigue: Math.min(originalWorkout.expectedFatigue, 60), // Cap intensity for unknown types
        workoutId: `${newType}-basic`
      };
    }

    // Find workout with similar intensity to original
    const targetFatigue = originalWorkout.expectedFatigue;
    const bestMatch = similarWorkouts.reduce((best, current) => {
      const bestDiff = Math.abs(best.fatigueScore - targetFatigue);
      const currentDiff = Math.abs(current.fatigueScore - targetFatigue);
      return currentDiff < bestDiff ? current : best;
    });

    return {
      ...originalWorkout,
      workoutType: bestMatch.type,
      description: bestMatch.description,
      expectedFatigue: bestMatch.fatigueScore,
      durationMin: bestMatch.durationMin,
      workoutId: `${bestMatch.type}-${bestMatch.tag}`
    };
  }

  /**
   * Adjust workout duration
   */
  private static adjustDuration(originalWorkout: TrainingPlan, newDuration: number): TrainingPlan {
    // Adjust fatigue proportionally to duration change
    const durationRatio = newDuration / Math.max(originalWorkout.durationMin, 1);
    const adjustedFatigue = Math.round(originalWorkout.expectedFatigue * Math.sqrt(durationRatio));
    
    return {
      ...originalWorkout,
      durationMin: newDuration,
      expectedFatigue: Math.max(0, Math.min(100, adjustedFatigue)),
      description: `${originalWorkout.description} (${newDuration} min)`
    };
  }

  /**
   * Adjust workout intensity
   */
  private static adjustIntensity(originalWorkout: TrainingPlan, newIntensity: number): TrainingPlan {
    const intensityLabel = newIntensity <= 40 ? 'Easy' : 
                          newIntensity <= 65 ? 'Moderate' : 
                          newIntensity <= 85 ? 'Hard' : 'Extreme';
    
    return {
      ...originalWorkout,
      expectedFatigue: Math.max(0, Math.min(100, newIntensity)),
      description: `${intensityLabel} ${originalWorkout.workoutType} (intensity adjusted)`
    };
  }

  /**
   * Rebalance the plan by redistributing training load
   */
  private static rebalancePlan(
    plan: TrainingPlan[],
    modifiedIndex: number,
    loadDifference: number,
    options: PlanAdjustmentOptions
  ): PlanAdjustmentResult {
    const adjustedPlan = [...plan];
    const modifications: WorkoutModification[] = [];
    const remainingDays = plan.length - modifiedIndex - 1;
    
    if (remainingDays <= 0) {
      return {
        success: true,
        adjustedPlan,
        modifications: [],
        impactSummary: { daysAffected: 0, totalLoadChange: 0, weeklyVolumeChange: 0 },
        warnings: ['No remaining days to redistribute load'],
        recommendations: []
      };
    }

    // Only redistribute if we lost training load (negative difference)
    if (loadDifference >= 0) {
      return {
        success: true,
        adjustedPlan,
        modifications: [],
        impactSummary: { daysAffected: 0, totalLoadChange: 0, weeklyVolumeChange: 0 },
        warnings: [],
        recommendations: []
      };
    }

    const loadToRedistribute = Math.abs(loadDifference);
    const loadPerDay = loadToRedistribute / remainingDays;
    
    // Find days that can absorb additional load
    for (let i = modifiedIndex + 1; i < adjustedPlan.length; i++) {
      const workout = adjustedPlan[i];
      
      // Skip rest days and preserve hard days if requested
      if (workout.workoutType === 'rest') continue;
      if (options.preserveHardDays && workout.expectedFatigue > 70) continue;
      
      // Calculate how much load we can add to this day
      const currentFatigue = workout.expectedFatigue;
      const maxNewFatigue = Math.min(
        currentFatigue + options.maxDailyFatigueIncrease,
        85 // Cap at 85 to avoid extreme workouts
      );
      
      if (maxNewFatigue > currentFatigue) {
        const fatigueIncrease = Math.min(loadPerDay, maxNewFatigue - currentFatigue);
        const durationIncrease = Math.round(fatigueIncrease * 0.5); // Rough conversion
        
        const originalWorkout = { ...workout };
        const adjustedWorkout = {
          ...workout,
          expectedFatigue: currentFatigue + fatigueIncrease,
          durationMin: workout.durationMin + durationIncrease,
          description: `${workout.description} (adjusted for load redistribution)`
        };
        
        adjustedPlan[i] = adjustedWorkout;
        
        modifications.push({
          date: workout.date,
          type: 'adjust-intensity',
          reason: 'Load redistribution due to plan modification',
          originalWorkout,
          newWorkout: adjustedWorkout,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      success: true,
      adjustedPlan,
      modifications,
      impactSummary: { daysAffected: modifications.length, totalLoadChange: 0, weeklyVolumeChange: 0 },
      warnings: [],
      recommendations: []
    };
  }

  /**
   * Calculate total training load for workouts
   */
  private static calculateTotalLoad(workouts: TrainingPlan[]): number {
    return workouts.reduce((total, workout) => total + workout.expectedFatigue, 0);
  }

  /**
   * Calculate impact summary of modifications
   */
  private static calculateImpactSummary(
    originalPlan: TrainingPlan[],
    adjustedPlan: TrainingPlan[],
    modifications: WorkoutModification[]
  ) {
    const originalLoad = this.calculateTotalLoad(originalPlan);
    const adjustedLoad = this.calculateTotalLoad(adjustedPlan);
    const originalVolume = originalPlan.reduce((total, w) => total + w.durationMin, 0);
    const adjustedVolume = adjustedPlan.reduce((total, w) => total + w.durationMin, 0);
    
    return {
      daysAffected: modifications.length,
      totalLoadChange: adjustedLoad - originalLoad,
      weeklyVolumeChange: adjustedVolume - originalVolume
    };
  }

  /**
   * Generate warnings based on modifications
   */
  private static generateWarnings(
    _modifications: WorkoutModification[],
    impactSummary: any,
    _options: PlanAdjustmentOptions
  ): string[] {
    const warnings: string[] = [];
    
    if (Math.abs(impactSummary.totalLoadChange) > 50) {
      warnings.push(`Significant training load change: ${impactSummary.totalLoadChange > 0 ? '+' : ''}${impactSummary.totalLoadChange}`);
    }
    
    if (Math.abs(impactSummary.weeklyVolumeChange) > 60) {
      warnings.push(`Weekly volume changed by ${impactSummary.weeklyVolumeChange} minutes`);
    }
    
    if (impactSummary.daysAffected > 3) {
      warnings.push(`Multiple days affected (${impactSummary.daysAffected}) - may impact training progression`);
    }
    
    return warnings;
  }

  /**
   * Generate recommendations based on modifications
   */
  private static generateRecommendations(
    modifications: WorkoutModification[],
    impactSummary: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (impactSummary.totalLoadChange < -30) {
      recommendations.push('Consider adding an extra easy workout this week to maintain training volume');
    }
    
    if (modifications.some(m => m.type === 'change-to-rest')) {
      recommendations.push('Ensure adequate nutrition and hydration on rest days for optimal recovery');
    }
    
    if (impactSummary.daysAffected > 2) {
      recommendations.push('Monitor your response to the adjusted training load over the next few days');
    }
    
    return recommendations;
  }

  /**
   * Create a failure result
   */
  private static createFailureResult(errorMessage: string): PlanAdjustmentResult {
    return {
      success: false,
      adjustedPlan: [],
      modifications: [],
      impactSummary: { daysAffected: 0, totalLoadChange: 0, weeklyVolumeChange: 0 },
      warnings: [errorMessage],
      recommendations: []
    };
  }

  /**
   * Get workout substitution suggestions
   */
  static getWorkoutSubstitutions(originalWorkout: TrainingPlan): WorkoutType[] {
    const originalType = originalWorkout.workoutType;
    const originalFatigue = originalWorkout.expectedFatigue;
    
    // Get workouts of different types with similar intensity
    const allWorkouts = [...WorkoutLibrary.getWorkoutsByType('run'),
                        ...WorkoutLibrary.getWorkoutsByType('bike'),
                        ...WorkoutLibrary.getWorkoutsByType('strength'),
                        ...WorkoutLibrary.getWorkoutsByType('mobility')];
    
    return allWorkouts
      .filter(w => w.type !== originalType) // Different type
      .filter(w => Math.abs(w.fatigueScore - originalFatigue) <= 20) // Similar intensity
      .sort((a, b) => Math.abs(a.fatigueScore - originalFatigue) - Math.abs(b.fatigueScore - originalFatigue))
      .slice(0, 5); // Top 5 suggestions
  }
}