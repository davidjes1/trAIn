// Integration service between existing TrainingPlan system and new unified WorkoutService
import WorkoutService from './WorkoutService';
import {
  TrainingPlan,
  PlanGenerationResult,
  Workout,
  CreatePlannedWorkoutInput,
  SportType,
  WorkoutSegment,
  SegmentGroup,
  TargetMetrics
} from '@/core/models';
import { SegmentBuilder } from './SegmentBuilder';
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
   * Create detailed workout segments for structured workouts
   */
  private static createWorkoutSegments(trainingPlan: TrainingPlan): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    const workoutType = trainingPlan.workoutType?.toLowerCase();
    const sport = trainingPlan.sport?.toLowerCase() || 'other';
    
    if (!workoutType) return segments;

    // Extract parameters for segment creation
    const totalDuration = trainingPlan.durationMin;
    const targetHR = this.extractTargetHR(trainingPlan.hrTargetZone);
    const targetPace = this.extractTargetPace(trainingPlan.customParameters);
    const targetPower = this.extractTargetPower(trainingPlan.customParameters);

    if (workoutType.includes('interval')) {
      // Create detailed interval workout
      const warmupDuration = Math.round(totalDuration * 0.15);
      const cooldownDuration = Math.round(totalDuration * 0.15);
      
      // Warmup
      segments.push(...SegmentBuilder.createWarmupSequence(sport, warmupDuration));
      
      // Determine interval pattern from description or use default
      const intervalCount = this.extractIntervalCount(trainingPlan.description) || 6;
      const intervalDuration = this.extractIntervalDuration(trainingPlan.description) || 3;
      const recoveryDuration = this.extractRecoveryDuration(trainingPlan.description) || 2;
      
      // Main intervals
      const intervalSegments = SegmentBuilder.createIntervalPattern({
        workDurationMin: intervalDuration,
        restDurationMin: recoveryDuration,
        intervals: intervalCount,
        targetHRZone: this.extractHRZone(trainingPlan.hrTargetZone) || 4,
        targetPace: targetPace,
        targetPower: targetPower,
        targetRPE: 8,
        description: `${intervalDuration}min at Zone ${this.extractHRZone(trainingPlan.hrTargetZone) || 4}`
      });
      
      segments.push(...intervalSegments);
      
      // Cooldown
      segments.push(...SegmentBuilder.createCooldownSequence(sport, cooldownDuration));
      
    } else if (workoutType.includes('tempo')) {
      // Create tempo workout structure
      const warmupDuration = Math.round(totalDuration * 0.2);
      const cooldownDuration = Math.round(totalDuration * 0.2);
      const tempoDuration = totalDuration - warmupDuration - cooldownDuration;
      
      segments.push(...SegmentBuilder.createWarmupSequence(sport, warmupDuration));
      
      segments.push(SegmentBuilder.createTimeBasedSegment({
        name: 'Tempo Main Set',
        type: 'tempo',
        durationMin: tempoDuration,
        targetHR: targetHR,
        targetHRZone: 3,
        targetPace: targetPace,
        targetPower: targetPower,
        targetRPE: 7,
        description: 'Comfortably hard tempo pace - sustainable but challenging',
        order: 50
      }));
      
      segments.push(...SegmentBuilder.createCooldownSequence(sport, cooldownDuration));
      
    } else if (workoutType.includes('strength')) {
      // Create strength training workout
      const exercises = this.extractStrengthExercises(trainingPlan.description, sport);
      const sets = this.extractSetsCount(trainingPlan.description) || 3;
      const reps = this.extractRepsCount(trainingPlan.description) || 10;
      
      // Warmup
      segments.push(...SegmentBuilder.createWarmupSequence('strength', Math.round(totalDuration * 0.15)));
      
      if (exercises.length > 0) {
        // Create circuit from exercises
        const strengthSegments = SegmentBuilder.createStrengthCircuit({
          exercises: exercises.map((exercise, index) => ({
            name: exercise,
            reps: reps,
            equipment: this.inferEquipment(exercise),
            muscleGroups: this.inferMuscleGroups(exercise)
          })),
          sets: sets,
          restBetweenExercisesMin: 1,
          restBetweenSetsMin: 2,
          targetRPE: 7
        });
        
        segments.push(...strengthSegments);
      } else {
        // Generic strength segment
        segments.push(SegmentBuilder.createTimeBasedSegment({
          name: 'Strength Training',
          type: 'strength_set',
          durationMin: Math.round(totalDuration * 0.7),
          targetRPE: 7,
          description: 'Structured strength training session',
          notes: `${sets} sets of ${reps} reps for main exercises`,
          order: 50
        }));
      }
      
      // Cool down with stretching
      segments.push(...SegmentBuilder.createCooldownSequence('strength', Math.round(totalDuration * 0.15)));
      
    } else if (workoutType.includes('long') || workoutType.includes('endurance')) {
      // Long/endurance workout - mostly steady state
      const warmupDuration = Math.round(totalDuration * 0.1);
      const cooldownDuration = Math.round(totalDuration * 0.1);
      const mainDuration = totalDuration - warmupDuration - cooldownDuration;
      
      segments.push(...SegmentBuilder.createWarmupSequence(sport, warmupDuration));
      
      segments.push(SegmentBuilder.createTimeBasedSegment({
        name: 'Endurance Main Set',
        type: workoutType.includes('long') ? 'tempo' : 'interval',
        durationMin: mainDuration,
        targetHRZone: 2,
        targetPace: targetPace,
        targetPower: targetPower,
        targetRPE: 5,
        description: 'Steady endurance pace - conversational effort',
        order: 50
      }));
      
      segments.push(...SegmentBuilder.createCooldownSequence(sport, cooldownDuration));
      
    } else if (workoutType.includes('recovery') || workoutType.includes('easy')) {
      // Easy/recovery workout
      segments.push(SegmentBuilder.createTimeBasedSegment({
        name: 'Easy Recovery',
        type: 'recovery',
        durationMin: totalDuration,
        targetHRZone: 1,
        targetRPE: 3,
        description: 'Easy, comfortable pace for active recovery',
        order: 0
      }));
    }

    return SegmentBuilder.sortSegmentsByOrder(segments);
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
   * Helper methods for extracting workout parameters from descriptions
   */
  
  private static extractIntervalCount(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*(x|times|intervals|rounds)/i);
    return match ? parseInt(match[1]) : null;
  }

  private static extractIntervalDuration(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*min.*?(work|interval|on)/i);
    return match ? parseInt(match[1]) : null;
  }

  private static extractRecoveryDuration(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*min.*?(rest|recovery|off)/i);
    return match ? parseInt(match[1]) : null;
  }

  private static extractHRZone(hrTargetZone?: string): number | null {
    if (!hrTargetZone) return null;
    const match = hrTargetZone.match(/zone\s*(\d)/i);
    return match ? parseInt(match[1]) : null;
  }

  private static extractSetsCount(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*sets/i);
    return match ? parseInt(match[1]) : null;
  }

  private static extractRepsCount(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*(reps|repetitions)/i);
    return match ? parseInt(match[1]) : null;
  }

  private static extractStrengthExercises(description?: string, sport?: string): string[] {
    if (!description) {
      // Default exercises based on sport
      switch (sport?.toLowerCase()) {
        case 'run':
          return ['Squats', 'Lunges', 'Calf Raises', 'Glute Bridges'];
        case 'bike':
          return ['Leg Press', 'Hamstring Curls', 'Core Planks', 'Hip Flexors'];
        default:
          return ['Push-ups', 'Squats', 'Planks', 'Lunges'];
      }
    }

    // Extract exercise names from description
    const exerciseKeywords = [
      'squat', 'lunge', 'deadlift', 'press', 'curl', 'row', 'pull',
      'push', 'plank', 'bridge', 'raise', 'extension', 'flex'
    ];

    const foundExercises: string[] = [];
    const words = description.toLowerCase().split(/\s+/);
    
    words.forEach((word, index) => {
      exerciseKeywords.forEach(keyword => {
        if (word.includes(keyword)) {
          // Capitalize and add to list
          const exerciseName = words[index - 1] 
            ? `${words[index - 1]} ${word}` 
            : word;
          foundExercises.push(
            exerciseName.split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
          );
        }
      });
    });

    return [...new Set(foundExercises)]; // Remove duplicates
  }

  private static inferEquipment(exercise: string): string {
    const exerciseLower = exercise.toLowerCase();
    
    if (exerciseLower.includes('push') || exerciseLower.includes('plank')) return 'bodyweight';
    if (exerciseLower.includes('squat') || exerciseLower.includes('deadlift')) return 'barbell';
    if (exerciseLower.includes('curl') || exerciseLower.includes('press')) return 'dumbbells';
    if (exerciseLower.includes('row') || exerciseLower.includes('pull')) return 'cable';
    
    return 'bodyweight';
  }

  private static inferMuscleGroups(exercise: string): string[] {
    const exerciseLower = exercise.toLowerCase();
    
    if (exerciseLower.includes('squat') || exerciseLower.includes('lunge')) {
      return ['legs', 'glutes', 'core'];
    }
    if (exerciseLower.includes('deadlift')) {
      return ['legs', 'glutes', 'back', 'core'];
    }
    if (exerciseLower.includes('push') || exerciseLower.includes('press')) {
      return ['chest', 'shoulders', 'triceps'];
    }
    if (exerciseLower.includes('curl')) {
      return ['biceps'];
    }
    if (exerciseLower.includes('row') || exerciseLower.includes('pull')) {
      return ['back', 'biceps'];
    }
    if (exerciseLower.includes('plank')) {
      return ['core', 'shoulders'];
    }
    
    return ['full-body'];
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
   * Smart cleanup: Only delete future planned workouts (preserve past workouts)
   */
  static async clearFuturePlannedWorkouts(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log(`🗑️ Clearing future planned workouts from ${startDate} to ${endDate} (today: ${today})...`);

      const existingWorkouts = await WorkoutService.getWorkoutsByDateRange(userId, startDate, endDate);
      
      // Only target planned workouts that are today or in the future
      const futurePlannedWorkouts = existingWorkouts.filter(w => 
        w.status === 'planned' && w.date >= today
      );

      if (futurePlannedWorkouts.length === 0) {
        console.log('✅ No future planned workouts to clear');
        return;
      }

      console.log(`📋 Found ${futurePlannedWorkouts.length} future planned workouts to replace`);
      console.log(`🛡️ Preserving ${existingWorkouts.length - futurePlannedWorkouts.length} past/completed workouts`);

      for (const workout of futurePlannedWorkouts) {
        try {
          await WorkoutService.deleteWorkout(workout.id);
          console.log(`✅ Deleted future planned: ${workout.name} (${workout.date})`);
        } catch (error) {
          console.error(`❌ Failed to delete workout ${workout.id}:`, error);
        }
      }

      console.log('✅ Future planned workouts cleared, past workouts preserved');

    } catch (error) {
      console.error('Failed to clear future planned workouts:', error);
      throw error;
    }
  }

  /**
   * Delete existing planned workouts for date range (to avoid duplicates)
   * @deprecated Use clearFuturePlannedWorkouts instead for smarter cleanup
   */
  static async clearExistingPlannedWorkouts(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<void> {
    console.warn('⚠️ clearExistingPlannedWorkouts is deprecated, use clearFuturePlannedWorkouts instead');
    return this.clearFuturePlannedWorkouts(userId, startDate, endDate);
  }

  /**
   * Replace all future planned workouts with new plan
   */
  static async replaceAllFutureWorkouts(
    planResult: PlanGenerationResult,
    userId?: string
  ): Promise<{ workouts: Workout[]; failures: any[], replacedCount: number }> {
    try {
      const currentUserId = userId || AuthService.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      if (planResult.plan.length === 0) {
        throw new Error('No workouts in generated plan');
      }

      const today = new Date().toISOString().split('T')[0];
      
      console.log(`🔄 Replacing ALL future planned workouts starting from ${today}...`);

      // Get all existing workouts from today forward
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 365); // Look ahead 1 year
      const endDate = futureDate.toISOString().split('T')[0];
      
      const existingWorkouts = await WorkoutService.getWorkoutsByDateRange(currentUserId, today, endDate);
      const futurePlannedWorkouts = existingWorkouts.filter(w => 
        w.status === 'planned' && w.date >= today
      );

      console.log(`🛡️ Found ${futurePlannedWorkouts.length} future planned workouts to replace`);
      console.log(`📅 Preserving ${existingWorkouts.length - futurePlannedWorkouts.length} past/completed workouts`);

      // Delete all future planned workouts
      const deletionPromises = futurePlannedWorkouts.map(workout => 
        WorkoutService.deleteWorkout(workout.id).catch(error => 
          console.error(`Failed to delete workout ${workout.id}:`, error)
        )
      );
      await Promise.allSettled(deletionPromises);

      // Save new generated plan
      const result = await this.saveGeneratedPlanAsWorkouts(planResult, currentUserId);

      // Show user feedback
      if (result.failures.length === 0) {
        UIHelpers.showStatus(
          `✅ Replaced ${futurePlannedWorkouts.length} old workouts with ${result.workouts.length} new planned workouts`, 
          'success'
        );
      } else {
        UIHelpers.showStatus(
          `⚠️ Replaced ${futurePlannedWorkouts.length} old workouts, generated ${result.workouts.length} new workouts (${result.failures.length} failed)`, 
          'warning'
        );
      }

      return {
        ...result,
        replacedCount: futurePlannedWorkouts.length
      };

    } catch (error) {
      console.error('❌ Failed to replace all future workouts:', error);
      UIHelpers.showStatus('Failed to replace future workouts', 'error');
      throw error;
    }
  }

  /**
   * Complete workflow: Smart replace future planned workouts + Save new plan
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

      console.log(`🔄 Smart replacing: future planned workouts from ${startDate} to ${endDate}...`);

      // Smart cleanup: only clear future planned workouts (preserve past workouts)
      await this.clearFuturePlannedWorkouts(currentUserId, startDate, endDate);

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