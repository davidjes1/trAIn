// Integration service between existing TrainingPlan system and new unified WorkoutService
import WorkoutService from './WorkoutService';
import { 
  TrainingPlan, 
  PlanGenerationResult 
} from '../types/training-metrics.types';
import { 
  Workout, 
  CreatePlannedWorkoutInput, 
  SportType, 
  WorkoutSegment,
  TargetMetrics 
} from '../types/workout.types';
import { UIHelpers } from '../utils/ui-helpers';
import { AuthService } from '../firebase/auth';

export class WorkoutPlanIntegration {
  
  /**
   * Convert a TrainingPlan to Workout format
   */
  static convertTrainingPlanToWorkout(
    trainingPlan: TrainingPlan, 
    userId: string
  ): CreatePlannedWorkoutInput {
    
    // Map sport types
    const sport = this.mapSportType(trainingPlan.sport || trainingPlan.workoutType);
    
    // Extract target metrics
    const targetMetrics: TargetMetrics = {
      durationMin: trainingPlan.durationMin,
      expectedFatigue: trainingPlan.expectedFatigue,
      targetHR: this.extractTargetHR(trainingPlan.hrTargetZone),
      targetPace: this.extractTargetPace(trainingPlan.customParameters),
      targetPower: this.extractTargetPower(trainingPlan.customParameters)
    };

    // Create segments if structured workout
    const segments = this.createWorkoutSegments(trainingPlan);

    // Generate descriptive name
    const name = this.generateWorkoutName(trainingPlan);
    
    const workout: CreatePlannedWorkoutInput = {
      userId,
      date: trainingPlan.date,
      sport,
      name,
      description: trainingPlan.description,
      durationMin: trainingPlan.durationMin,
      distanceKm: this.extractDistance(trainingPlan.customParameters),
      targetMetrics,
      segments: segments.length > 0 ? segments : undefined,
      tags: trainingPlan.workoutTags || [],
      expectedFatigue: trainingPlan.expectedFatigue,
      notes: this.generateWorkoutNotes(trainingPlan)
    };

    return workout;
  }

  /**
   * Convert and save an entire training plan to the unified system
   */
  static async saveGeneratedPlanAsWorkouts(
    planResult: PlanGenerationResult,
    userId?: string
  ): Promise<{ workouts: Workout[]; failures: any[] }> {
    try {
      // Get user ID from auth if not provided
      const currentUserId = userId || AuthService.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`💾 Converting and saving ${planResult.plan.length} planned workouts...`);

      const savedWorkouts: Workout[] = [];
      const failures: any[] = [];

      // Convert and save each training plan item as a workout
      for (const trainingPlan of planResult.plan) {
        try {
          // Convert to workout format
          const workoutInput = this.convertTrainingPlanToWorkout(trainingPlan, currentUserId);
          
          // Save using WorkoutService
          const savedWorkout = await WorkoutService.createPlannedWorkout(workoutInput);
          savedWorkouts.push(savedWorkout);
          
          console.log(`✅ Saved: ${savedWorkout.name} (${savedWorkout.date})`);
          
        } catch (error) {
          console.error(`❌ Failed to save workout for ${trainingPlan.date}:`, error);
          failures.push({
            trainingPlan,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`✅ Plan conversion complete: ${savedWorkouts.length} workouts saved, ${failures.length} failures`);

      return {
        workouts: savedWorkouts,
        failures
      };

    } catch (error) {
      console.error('❌ Failed to save generated plan as workouts:', error);
      throw error;
    }
  }

  /**
   * Map sport types from training plan to unified system
   */
  private static mapSportType(sportOrWorkoutType?: string): SportType {
    if (!sportOrWorkoutType) return 'other';

    const sportMap: Record<string, SportType> = {
      // Direct sport mappings
      'run': 'run',
      'running': 'run',
      'bike': 'bike', 
      'biking': 'bike',
      'cycling': 'bike',
      'swim': 'swim',
      'swimming': 'swim',
      'strength': 'strength',
      'yoga': 'yoga',
      
      // Workout type mappings
      'easy_run': 'run',
      'tempo_run': 'run',
      'interval_run': 'run',
      'long_run': 'run',
      'recovery_run': 'run',
      'fartlek': 'run',
      'hill_repeats': 'run',
      'track_workout': 'run',
      
      'easy_bike': 'bike',
      'tempo_bike': 'bike',
      'interval_bike': 'bike',
      'endurance_bike': 'bike',
      'recovery_bike': 'bike',
      'hill_bike': 'bike',
      
      'technique_swim': 'swim',
      'endurance_swim': 'swim',
      'interval_swim': 'swim',
      'recovery_swim': 'swim',
      
      'strength_training': 'strength',
      'weight_training': 'strength',
      'bodyweight': 'strength',
      'resistance': 'strength',
      'core': 'strength',
      
      'yoga_flow': 'yoga',
      'restorative_yoga': 'yoga',
      'power_yoga': 'yoga'
    };

    const normalized = sportOrWorkoutType.toLowerCase().replace(/[\s-]/g, '_');
    return sportMap[normalized] || 'other';
  }

  /**
   * Extract target heart rate from zone string
   */
  private static extractTargetHR(hrTargetZone?: string): number | undefined {
    if (!hrTargetZone) return undefined;

    // Parse zone strings like "Zone 2", "150-160 bpm", "Zone 3 (150 bpm)"
    const bpmMatch = hrTargetZone.match(/(\d+)\s*bpm/i);
    if (bpmMatch) {
      return parseInt(bpmMatch[1]);
    }

    const rangeMatch = hrTargetZone.match(/(\d+)-(\d+)/);
    if (rangeMatch) {
      const lower = parseInt(rangeMatch[1]);
      const upper = parseInt(rangeMatch[2]);
      return Math.round((lower + upper) / 2); // Return middle of range
    }

    // Zone-based estimation (rough approximation)
    const zoneMatch = hrTargetZone.match(/zone\s*(\d)/i);
    if (zoneMatch) {
      const zone = parseInt(zoneMatch[1]);
      const zoneHRMap = {
        1: 130, // Recovery
        2: 145, // Aerobic base
        3: 160, // Aerobic
        4: 175, // Lactate threshold
        5: 185  // Neuromuscular
      };
      return zoneHRMap[zone as keyof typeof zoneHRMap];
    }

    return undefined;
  }

  /**
   * Extract target pace from custom parameters
   */
  private static extractTargetPace(customParams?: Record<string, any>): string | undefined {
    if (!customParams) return undefined;

    if (customParams.targetPace) return customParams.targetPace;
    if (customParams.pace) return customParams.pace;
    if (customParams.target_pace) return customParams.target_pace;

    return undefined;
  }

  /**
   * Extract target power from custom parameters
   */
  private static extractTargetPower(customParams?: Record<string, any>): number | undefined {
    if (!customParams) return undefined;

    if (customParams.targetPower) return customParams.targetPower;
    if (customParams.power) return customParams.power;
    if (customParams.target_power) return customParams.target_power;
    if (customParams.ftp && customParams.intensity) {
      return Math.round(customParams.ftp * customParams.intensity);
    }

    return undefined;
  }

  /**
   * Extract distance from custom parameters
   */
  private static extractDistance(customParams?: Record<string, any>): number | undefined {
    if (!customParams) return undefined;

    if (customParams.distance) return customParams.distance;
    if (customParams.targetDistance) return customParams.targetDistance;
    if (customParams.target_distance) return customParams.target_distance;

    return undefined;
  }

  /**
   * Create workout segments for structured workouts
   */
  private static createWorkoutSegments(trainingPlan: TrainingPlan): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];

    // Check if this is a structured workout (intervals, tempo, etc.)
    const workoutType = trainingPlan.workoutType?.toLowerCase();
    
    if (workoutType?.includes('interval')) {
      // Create interval structure
      segments.push(
        {
          id: 'warmup',
          name: 'Warmup',
          durationMin: Math.round(trainingPlan.durationMin * 0.2), // 20% warmup
          targetHR: this.extractTargetHR(trainingPlan.hrTargetZone) ? 
            Math.round(this.extractTargetHR(trainingPlan.hrTargetZone)! * 0.7) : undefined,
          description: 'Easy pace warmup'
        },
        {
          id: 'main',
          name: 'Intervals',
          durationMin: Math.round(trainingPlan.durationMin * 0.6), // 60% main set
          targetHR: this.extractTargetHR(trainingPlan.hrTargetZone),
          description: 'Main interval set'
        },
        {
          id: 'cooldown', 
          name: 'Cooldown',
          durationMin: Math.round(trainingPlan.durationMin * 0.2), // 20% cooldown
          targetHR: this.extractTargetHR(trainingPlan.hrTargetZone) ?
            Math.round(this.extractTargetHR(trainingPlan.hrTargetZone)! * 0.6) : undefined,
          description: 'Easy pace cooldown'
        }
      );
    } else if (workoutType?.includes('tempo')) {
      // Create tempo structure
      segments.push(
        {
          id: 'warmup',
          name: 'Warmup',
          durationMin: Math.round(trainingPlan.durationMin * 0.25),
          description: 'Gradual warmup to tempo pace'
        },
        {
          id: 'tempo',
          name: 'Tempo',
          durationMin: Math.round(trainingPlan.durationMin * 0.5),
          targetHR: this.extractTargetHR(trainingPlan.hrTargetZone),
          description: 'Comfortably hard tempo pace'
        },
        {
          id: 'cooldown',
          name: 'Cooldown', 
          durationMin: Math.round(trainingPlan.durationMin * 0.25),
          description: 'Easy pace cooldown'
        }
      );
    }

    return segments;
  }

  /**
   * Generate a descriptive workout name
   */
  private static generateWorkoutName(trainingPlan: TrainingPlan): string {
    const date = new Date(trainingPlan.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Extract workout type for name
    let workoutTypeName = trainingPlan.workoutType;
    
    // Clean up common workout type names
    const typeMap: Record<string, string> = {
      'easy_run': 'Easy Run',
      'tempo_run': 'Tempo Run', 
      'interval_run': 'Interval Run',
      'long_run': 'Long Run',
      'recovery_run': 'Recovery Run',
      'fartlek': 'Fartlek Run',
      'hill_repeats': 'Hill Repeats',
      'track_workout': 'Track Workout',
      'easy_bike': 'Easy Ride',
      'tempo_bike': 'Tempo Ride',
      'interval_bike': 'Bike Intervals',
      'endurance_bike': 'Endurance Ride',
      'technique_swim': 'Swim Technique',
      'endurance_swim': 'Endurance Swim',
      'interval_swim': 'Swim Intervals',
      'strength_training': 'Strength Training',
      'yoga_flow': 'Yoga Flow'
    };

    const cleanedType = typeMap[workoutTypeName] || 
      workoutTypeName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return `${dayName} ${cleanedType}`;
  }

  /**
   * Generate workout notes from training plan
   */
  private static generateWorkoutNotes(trainingPlan: TrainingPlan): string | undefined {
    const notes: string[] = [];

    if (trainingPlan.hrTargetZone) {
      notes.push(`Target HR: ${trainingPlan.hrTargetZone}`);
    }

    if (trainingPlan.workoutZones && trainingPlan.workoutZones.length > 0) {
      notes.push(`Focus zones: ${trainingPlan.workoutZones.join(', ')}`);
    }

    if (trainingPlan.expectedFatigue) {
      const fatigueLevel = trainingPlan.expectedFatigue < 30 ? 'Low' :
                          trainingPlan.expectedFatigue < 60 ? 'Moderate' :
                          trainingPlan.expectedFatigue < 80 ? 'High' : 'Very High';
      notes.push(`Expected effort: ${fatigueLevel} (${trainingPlan.expectedFatigue}/100)`);
    }

    if (trainingPlan.customParameters) {
      const params = trainingPlan.customParameters;
      if (params.intensity) {
        notes.push(`Intensity: ${Math.round(params.intensity * 100)}%`);
      }
      if (params.intervals) {
        notes.push(`Structure: ${params.intervals}`);
      }
      if (params.recoveryTime) {
        notes.push(`Recovery: ${params.recoveryTime}`);
      }
    }

    return notes.length > 0 ? notes.join(' • ') : undefined;
  }

  /**
   * Get user's planned workouts from unified system
   */
  static async getUserPlannedWorkouts(
    userId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<Workout[]> {
    try {
      if (startDate && endDate) {
        return await WorkoutService.getWorkoutsByDateRange(userId, startDate, endDate);
      } else {
        return await WorkoutService.getUserWorkouts(userId, 50);
      }
    } catch (error) {
      console.error('Failed to get user planned workouts:', error);
      return [];
    }
  }

  /**
   * Delete existing planned workouts for date range (to avoid duplicates)
   */
  static async clearExistingPlannedWorkouts(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<void> {
    try {
      console.log(`🗑️ Clearing existing planned workouts from ${startDate} to ${endDate}...`);

      const existingWorkouts = await WorkoutService.getWorkoutsByDateRange(userId, startDate, endDate);
      const plannedWorkouts = existingWorkouts.filter(w => w.status === 'planned');

      if (plannedWorkouts.length === 0) {
        console.log('✅ No existing planned workouts to clear');
        return;
      }

      console.log(`📋 Found ${plannedWorkouts.length} existing planned workouts to remove`);

      for (const workout of plannedWorkouts) {
        try {
          await WorkoutService.deleteWorkout(workout.id);
          console.log(`✅ Deleted: ${workout.name} (${workout.date})`);
        } catch (error) {
          console.error(`❌ Failed to delete workout ${workout.id}:`, error);
        }
      }

      console.log('✅ Existing planned workouts cleared');

    } catch (error) {
      console.error('Failed to clear existing planned workouts:', error);
      throw error;
    }
  }

  /**
   * Complete workflow: Clear existing + Save new plan
   */
  static async replaceGeneratedPlan(
    planResult: PlanGenerationResult,
    userId?: string
  ): Promise<{ workouts: Workout[]; failures: any[] }> {
    try {
      const currentUserId = userId || AuthService.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      if (planResult.plan.length === 0) {
        throw new Error('No workouts in generated plan');
      }

      // Calculate date range
      const dates = planResult.plan.map(p => p.date).sort();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      console.log(`🔄 Replacing planned workouts from ${startDate} to ${endDate}...`);

      // Clear existing planned workouts in date range
      await this.clearExistingPlannedWorkouts(currentUserId, startDate, endDate);

      // Save new generated plan
      const result = await this.saveGeneratedPlanAsWorkouts(planResult, currentUserId);

      // Show user feedback
      if (result.failures.length === 0) {
        UIHelpers.showStatus(
          `✅ Generated ${result.workouts.length} planned workouts`, 
          'success'
        );
      } else {
        UIHelpers.showStatus(
          `⚠️ Generated ${result.workouts.length} workouts, ${result.failures.length} failed`, 
          'warning'
        );
      }

      return result;

    } catch (error) {
      console.error('❌ Failed to replace generated plan:', error);
      UIHelpers.showStatus('Failed to save generated plan', 'error');
      throw error;
    }
  }
}

export default WorkoutPlanIntegration;