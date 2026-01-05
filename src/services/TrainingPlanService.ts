// Training Plan Service - Handles persistence of training plans using Firebase with localStorage fallback
// and integration between TrainingPlan system and unified WorkoutService
import {
  TrainingPlan,
  PlanGenerationResult,
  TrackedWorkout,
  FirebaseGeneratedPlan,
  FirebaseTrainingPlan,
  FirebaseTrackedWorkout,
  FirebaseTrainingCalendar,
  Workout,
  CreatePlannedWorkoutInput,
  SportType,
  WorkoutSegment,
  SegmentGroup,
  TargetMetrics
} from '@/core/models';
import { FirestoreService } from '../firebase/firestore';
import { AuthService } from '../firebase/auth';
import WorkoutService from './WorkoutService';
import { SegmentBuilder } from './SegmentBuilder';
import { UIHelpers } from '../utils/ui-helpers';

export interface StoredTrainingPlan {
  id: string;
  name: string;
  generatedAt: string;
  startDate: string;
  endDate: string;
  plan: TrainingPlan[];
  readinessMetrics: any;
  recommendations: string[];
  warnings: string[];
  isActive: boolean; // Whether this is the currently active plan
}

/**
 * Training Plan Service
 *
 * Manages training plan persistence and retrieval using Firebase Firestore
 * with localStorage fallback for offline support.
 *
 * Core responsibilities:
 * - Save and retrieve training plans
 * - Manage active plan state
 * - Convert between Firebase and application data formats
 * - Provide plan statistics and export functionality
 */
export class TrainingPlanService {
  private static readonly MAX_STORED_PLANS = 10; // Keep only last 10 plans
  private static readonly FALLBACK_TO_LOCAL = true; // Fallback to localStorage if Firebase fails

  /**
   * Save a generated training plan to Firebase
   */
  static async saveTrainingPlan(planResult: PlanGenerationResult, name?: string): Promise<string> {
    try {
      const startDate = planResult.plan[0]?.date || new Date().toISOString().split('T')[0];
      const endDate = planResult.plan[planResult.plan.length - 1]?.date || startDate;
      
      // Convert to Firebase format
      const firebasePlan: Omit<FirebaseGeneratedPlan, 'id' | 'userId' | 'generatedAt' | 'lastModified'> = {
        planName: name || `Training Plan ${new Date().toLocaleDateString()}`,
        planType: 'custom', // Could be determined from plan analysis
        startDate,
        endDate,
        totalWeeks: Math.ceil(planResult.plan.length / 7),
        config: {
          sport: 'multi', // Could be inferred from plan
          weeklyHours: this.calculateWeeklyHours(planResult.plan),
          fitnessLevel: 'intermediate', // Should come from user preferences
          goals: planResult.recommendations.slice(0, 3), // Use first 3 recommendations as goals
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        workouts: [], // Will be populated after saving individual workouts
        generatedBy: 'ai',
        version: '1.0',
        isActive: false
      };

      // Convert individual workouts to Firebase format
      const firebaseWorkouts: Omit<FirebaseTrainingPlan, 'id' | 'userId'>[] = planResult.plan.map(workout => ({
        date: workout.date,
        workoutType: workout.workoutType,
        description: workout.description,
        expectedFatigue: workout.expectedFatigue,
        durationMin: workout.durationMin,
        sport: workout.sport || this.inferSportFromWorkoutType(workout.workoutType),
        completed: false,
        actualFatigue: workout.actualFatigue,
        adherenceScore: 100, // Default score
        workoutZones: workout.workoutZones,
        workoutTags: workout.workoutTags,
        hrTargetZone: workout.hrTargetZone || 'Zone 2', // Default to Zone 2 if undefined
        customParameters: workout.customParameters,
        generatedAt: new Date(),
        generatedBy: 'algorithm',
        createdAt: new Date(),
        metadata: {
          basedOnMetrics: true,
          adjustmentReason: planResult.warnings.length > 0 ? planResult.warnings[0] : undefined
        }
      }));

      // Save the plan with workouts using Firebase
      const planId = await FirestoreService.saveGeneratedPlanWithWorkouts(firebasePlan, firebaseWorkouts);
      
      console.log(`Saved training plan to Firebase: ${firebasePlan.planName} (${planResult.plan.length} workouts)`);
      return planId;
      
    } catch (error) {
      console.error('Firebase save failed:', error);
      
      // Fallback to localStorage if Firebase fails
      if (this.FALLBACK_TO_LOCAL) {
        console.log('Falling back to localStorage...');
        return this.saveTrainingPlanLocal(planResult, name);
      }
      
      throw error;
    }
  }

  /**
   * Get all stored training plans from Firebase
   */
  static async getStoredTrainingPlans(): Promise<StoredTrainingPlan[]> {
    try {
      const firebasePlans = await FirestoreService.getGeneratedPlans();
      
      return firebasePlans.map(this.convertFromFirebasePlan);
      
    } catch (error) {
      console.error('Firebase load failed:', error);
      
      // Fallback to localStorage if Firebase fails
      if (this.FALLBACK_TO_LOCAL) {
        console.log('Falling back to localStorage...');
        return this.getStoredTrainingPlansLocal();
      }
      
      return [];
    }
  }

  /**
   * Get a specific training plan by ID
   */
  static async getTrainingPlan(planId: string): Promise<StoredTrainingPlan | null> {
    try {
      const firebasePlans = await FirestoreService.getGeneratedPlans();
      const firebasePlan = firebasePlans.find(p => p.id === planId);
      
      return firebasePlan ? this.convertFromFirebasePlan(firebasePlan) : null;
      
    } catch (error) {
      console.error('Firebase load failed:', error);
      
      // Fallback to localStorage if Firebase fails
      if (this.FALLBACK_TO_LOCAL) {
        console.log('Falling back to localStorage...');
        return this.getTrainingPlanLocal(planId);
      }
      
      return null;
    }
  }

  /**
   * Set a training plan as active
   */
  static async setActivePlan(planId: string): Promise<boolean> {
    try {
      await FirestoreService.setActivePlan(planId);
      console.log(`Set active plan: ${planId}`);
      return true;
      
    } catch (error) {
      console.error('Firebase update failed:', error);
      
      // Fallback to localStorage if Firebase fails
      if (this.FALLBACK_TO_LOCAL) {
        console.log('Falling back to localStorage...');
        return this.setActivePlanLocal(planId);
      }
      
      return false;
    }
  }

  /**
   * Get the currently active training plan
   */
  static async getActivePlan(): Promise<StoredTrainingPlan | null> {
    try {
      const firebasePlan = await FirestoreService.getActivePlan();
      return firebasePlan ? this.convertFromFirebasePlan(firebasePlan) : null;
      
    } catch (error) {
      console.error('Firebase load failed:', error);
      
      // Fallback to localStorage if Firebase fails
      if (this.FALLBACK_TO_LOCAL) {
        console.log('Falling back to localStorage...');
        return this.getActivePlanLocal();
      }
      
      return null;
    }
  }

  /**
   * Delete a training plan
   */
  static async deleteTrainingPlan(planId: string): Promise<boolean> {
    try {
      await FirestoreService.deleteGeneratedPlan(planId);
      console.log(`Deleted training plan: ${planId}`);
      return true;
      
    } catch (error) {
      console.error('Firebase delete failed:', error);
      
      // Fallback to localStorage if Firebase fails
      if (this.FALLBACK_TO_LOCAL) {
        console.log('Falling back to localStorage...');
        return this.deleteTrainingPlanLocal(planId);
      }
      
      return false;
    }
  }

  /**
   * Convert training plan workouts to TrackedWorkout format for calendar display
   *
   * @param planWorkouts - Array of workouts from a training plan
   * @returns Array of TrackedWorkout objects for calendar rendering
   */
  static convertToTrackedWorkouts(planWorkouts: TrainingPlan[]): TrackedWorkout[] {
    return planWorkouts.map(workout => {
      const trackedWorkout: TrackedWorkout = {
        workoutId: workout.workoutId || this.generateId('workout'),
        date: workout.date,
        workoutType: workout.workoutType,
        description: workout.description,
        expectedFatigue: workout.expectedFatigue,
        durationMin: workout.durationMin,
        status: workout.completed ? 'completed' : 'planned',
        sport: workout.sport,
        completed: workout.completed,
        actualFatigue: workout.actualFatigue,
        workoutZones: workout.workoutZones,
        workoutTags: workout.workoutTags,
        hrTargetZone: workout.hrTargetZone,
        customParameters: workout.customParameters
      };

      // Add actual workout data if completed
      if (workout.completed && workout.actualFatigue !== undefined) {
        trackedWorkout.actualWorkout = {
          date: workout.date,
          sport: workout.sport || workout.workoutType,
          duration: workout.durationMin,
          distance: 0, // Would be populated from actual workout data
          trainingLoad: 0,
          avgHR: undefined,
          maxHR: undefined,
          calories: undefined,
          zone1Minutes: 0,
          zone2Minutes: 0,
          zone3Minutes: 0,
          zone4Minutes: 0,
          zone5Minutes: 0,
          notes: undefined
        };
      }

      return trackedWorkout;
    });
  }

  /**
   * Get training plan statistics based on workout completion status
   *
   * @param planId - The ID of the training plan
   * @returns Statistics object or null if plan not found
   */
  static async getPlanStatistics(planId: string): Promise<{
    totalWorkouts: number;
    completedWorkouts: number;
    missedWorkouts: number;
    plannedWorkouts: number;
    adherenceRate: number;
    totalPlannedDuration: number;
    totalActualDuration: number;
  } | null> {
    const plan = await this.getTrainingPlan(planId);
    if (!plan) return null;

    const workouts = plan.plan;

    const completed = workouts.filter(w => w.completed);
    const planned = workouts.filter(w => !w.completed);

    const totalPlannedDuration = workouts.reduce((sum, w) => sum + w.durationMin, 0);
    const totalActualDuration = completed.reduce((sum, w) => sum + w.durationMin, 0);

    return {
      totalWorkouts: workouts.length,
      completedWorkouts: completed.length,
      missedWorkouts: 0, // Not tracked in current Firebase model
      plannedWorkouts: planned.length,
      adherenceRate: workouts.length > 0 ? (completed.length / workouts.length) * 100 : 0,
      totalPlannedDuration,
      totalActualDuration
    };
  }

  /**
   * Export training plan and workouts to JSON
   *
   * @param planId - The ID of the training plan to export
   * @returns JSON string representation of the plan
   */
  static async exportPlan(planId: string): Promise<string> {
    const plan = await this.getTrainingPlan(planId);
    if (!plan) throw new Error(`Training plan ${planId} not found`);

    const statistics = await this.getPlanStatistics(planId);

    const exportData = {
      plan,
      statistics,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear all stored data (for debugging or reset)
   */
  static clearAllData(): void {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('Cleared all workout storage data');
  }

  /**
   * Get storage usage information for training plans
   *
   * @returns Object containing plan counts and estimated storage size
   */
  static async getStorageInfo(): Promise<{
    trainingPlansCount: number;
    activePlanId: string | null;
    estimatedSizeKB: number;
  }> {
    const plans = await this.getStoredTrainingPlans();
    const activePlan = await this.getActivePlan();

    // Rough estimation of storage size
    const plansSize = JSON.stringify(plans).length;
    const estimatedSizeKB = Math.round(plansSize / 1024);

    return {
      trainingPlansCount: plans.length,
      activePlanId: activePlan?.id || null,
      estimatedSizeKB
    };
  }

  /**
   * HELPER METHODS FOR FIREBASE CONVERSION
   */

  /**
   * Convert Firebase plan to StoredTrainingPlan format
   */
  private static convertFromFirebasePlan(firebasePlan: FirebaseGeneratedPlan): StoredTrainingPlan {
    return {
      id: firebasePlan.id,
      name: firebasePlan.planName,
      generatedAt: firebasePlan.generatedAt.toISOString(),
      startDate: firebasePlan.startDate,
      endDate: firebasePlan.endDate,
      plan: firebasePlan.workouts.map(workout => ({
        date: workout.date,
        workoutType: workout.workoutType,
        description: workout.description,
        expectedFatigue: workout.expectedFatigue,
        durationMin: workout.durationMin,
        sport: workout.sport,
        workoutId: workout.id,
        completed: workout.completed,
        actualFatigue: workout.actualFatigue,
        workoutZones: workout.workoutZones,
        workoutTags: workout.workoutTags,
        hrTargetZone: workout.hrTargetZone || 'Zone 2', // Default to Zone 2 if undefined
        customParameters: workout.customParameters
      })),
      readinessMetrics: {
        score: 75, // Default - would need to be stored separately
        fatigue7DayAvg: 45,
        recoveryScore: 70,
        trainingLoad7Day: 250,
        recentHardDays: 1
      },
      recommendations: firebasePlan.config.goals,
      warnings: [],
      isActive: firebasePlan.isActive
    };
  }

  /**
   * Calculate weekly hours from training plan
   */
  private static calculateWeeklyHours(plan: TrainingPlan[]): number {
    const totalMinutes = plan.reduce((sum, workout) => sum + workout.durationMin, 0);
    const weeks = Math.ceil(plan.length / 7);
    return Math.round((totalMinutes / 60) / weeks);
  }

  /**
   * FALLBACK METHODS FOR LOCALSTORAGE
   */

  private static readonly STORAGE_KEYS = {
    TRAINING_PLANS: 'train_training_plans',
    ACTIVE_PLAN: 'train_active_plan_id',
    USER_PREFERENCES: 'train_user_preferences'
  };

  /**
   * LocalStorage fallback for saving training plan
   */
  private static saveTrainingPlanLocal(planResult: PlanGenerationResult, name?: string): string {
    const planId = this.generateId('plan');
    const startDate = planResult.plan[0]?.date || new Date().toISOString().split('T')[0];
    const endDate = planResult.plan[planResult.plan.length - 1]?.date || startDate;
    
    const storedPlan: StoredTrainingPlan = {
      id: planId,
      name: name || `Training Plan ${new Date().toLocaleDateString()}`,
      generatedAt: planResult.generatedAt,
      startDate,
      endDate,
      plan: planResult.plan,
      readinessMetrics: planResult.readinessMetrics,
      recommendations: planResult.recommendations,
      warnings: planResult.warnings,
      isActive: false
    };

    // Get existing plans
    const existingPlans = this.getStoredTrainingPlansLocal();
    
    // Add new plan
    existingPlans.push(storedPlan);
    
    // Keep only the most recent plans
    const sortedPlans = existingPlans
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, this.MAX_STORED_PLANS);
    
    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEYS.TRAINING_PLANS, JSON.stringify(sortedPlans));
    
    console.log(`Saved training plan to localStorage: ${storedPlan.name} (${planResult.plan.length} workouts)`);
    return planId;
  }

  /**
   * LocalStorage fallback for getting training plans
   */
  private static getStoredTrainingPlansLocal(): StoredTrainingPlan[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.TRAINING_PLANS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading training plans from localStorage:', error);
      return [];
    }
  }

  /**
   * LocalStorage fallback for getting specific training plan
   */
  private static getTrainingPlanLocal(planId: string): StoredTrainingPlan | null {
    const plans = this.getStoredTrainingPlansLocal();
    return plans.find(p => p.id === planId) || null;
  }

  /**
   * LocalStorage fallback for setting active plan
   */
  private static setActivePlanLocal(planId: string): boolean {
    const plans = this.getStoredTrainingPlansLocal();
    const planExists = plans.some(p => p.id === planId);
    
    if (!planExists) {
      console.error(`Training plan ${planId} not found`);
      return false;
    }

    // Update active status
    plans.forEach(plan => {
      plan.isActive = plan.id === planId;
    });

    // Save updated plans
    localStorage.setItem(this.STORAGE_KEYS.TRAINING_PLANS, JSON.stringify(plans));
    localStorage.setItem(this.STORAGE_KEYS.ACTIVE_PLAN, planId);
    
    console.log(`Set active plan in localStorage: ${planId}`);
    return true;
  }

  /**
   * LocalStorage fallback for getting active plan
   */
  private static getActivePlanLocal(): StoredTrainingPlan | null {
    const activePlanId = localStorage.getItem(this.STORAGE_KEYS.ACTIVE_PLAN);
    if (!activePlanId) return null;
    
    return this.getTrainingPlanLocal(activePlanId);
  }

  /**
   * LocalStorage fallback for deleting training plan
   */
  private static deleteTrainingPlanLocal(planId: string): boolean {
    const plans = this.getStoredTrainingPlansLocal();
    const initialLength = plans.length;
    
    const updatedPlans = plans.filter(p => p.id !== planId);
    
    if (updatedPlans.length === initialLength) {
      console.warn(`Training plan ${planId} not found for deletion`);
      return false;
    }

    // Save updated plans
    localStorage.setItem(this.STORAGE_KEYS.TRAINING_PLANS, JSON.stringify(updatedPlans));
    
    // Clear active plan if it was deleted
    const activePlanId = localStorage.getItem(this.STORAGE_KEYS.ACTIVE_PLAN);
    if (activePlanId === planId) {
      localStorage.removeItem(this.STORAGE_KEYS.ACTIVE_PLAN);
    }
    
    console.log(`Deleted training plan from localStorage: ${planId}`);
    return true;
  }

  /**
   * Generate a unique ID
   */
  private static generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if user is authenticated (required for Firebase operations)
   */
  static isAuthenticated(): boolean {
    return AuthService.getCurrentUser() !== null;
  }

  /**
   * Get current user ID
   */
  static getCurrentUserId(): string | null {
    const user = AuthService.getCurrentUser();
    return user ? user.uid : null;
  }

  /**
   * Infer sport type from workout type
   */
  private static inferSportFromWorkoutType(workoutType: string): string {
    const workoutTypeMap: Record<string, string> = {
      // Running workouts
      'run': 'run',
      'easy_run': 'run',
      'tempo_run': 'run',
      'interval_run': 'run',
      'long_run': 'run',
      'recovery_run': 'run',
      'fartlek': 'run',
      'hill_repeats': 'run',
      'track_workout': 'run',

      // Cycling workouts
      'bike': 'bike',
      'easy_bike': 'bike',
      'tempo_bike': 'bike',
      'interval_bike': 'bike',
      'endurance_bike': 'bike',
      'recovery_bike': 'bike',

      // Strength workouts
      'strength': 'strength',
      'strength_training': 'strength',
      'resistance': 'strength',

      // Other sports
      'swim': 'swim',
      'swimming': 'swim',
      'yoga': 'yoga',
      'mobility': 'other',
      'rest': 'other',
      'brick': 'other'
    };

    return workoutTypeMap[workoutType] || 'other';
  }

  /**
   * ===================================================================================
   * WORKOUT PLAN INTEGRATION METHODS
   *
   * Integration methods between existing TrainingPlan system and new unified WorkoutService.
   * These methods handle conversion, saving, and management of training plans as workouts.
   * ===================================================================================
   */

  /**
   * Convert a TrainingPlan to Workout format
   *
   * @param trainingPlan - The training plan to convert
   * @param userId - The user ID for the workout
   * @returns CreatePlannedWorkoutInput object ready to be saved
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
   *
   * @param planResult - The generated training plan result
   * @param userId - Optional user ID (defaults to current authenticated user)
   * @returns Object containing saved workouts and any failures
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
   * Replace all future planned workouts with new plan
   *
   * @param planResult - The generated training plan result
   * @param userId - Optional user ID (defaults to current authenticated user)
   * @returns Object containing saved workouts, failures, and count of replaced workouts
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
   *
   * @param planResult - The generated training plan result
   * @param userId - Optional user ID (defaults to current authenticated user)
   * @returns Object containing saved workouts and any failures
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

  /**
   * Smart cleanup: Only delete future planned workouts (preserve past workouts)
   *
   * @param userId - The user ID
   * @param startDate - Start date of range to clear (YYYY-MM-DD)
   * @param endDate - End date of range to clear (YYYY-MM-DD)
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
   * Get user's planned workouts from unified system
   *
   * @param userId - The user ID
   * @param startDate - Optional start date filter (YYYY-MM-DD)
   * @param endDate - Optional end date filter (YYYY-MM-DD)
   * @returns Array of workouts
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
   * ===================================================================================
   * HELPER METHODS FOR WORKOUT CONVERSION
   *
   * Private helper methods for converting training plans to workouts.
   * These methods handle sport mapping, metric extraction, segment creation, and more.
   * ===================================================================================
   */

  /**
   * Map sport types from training plan to unified system
   *
   * @param sportOrWorkoutType - Sport or workout type string
   * @returns Normalized SportType
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
   *
   * @param hrTargetZone - HR zone string (e.g., "Zone 2", "150-160 bpm")
   * @returns Target heart rate in BPM
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
   *
   * @param customParams - Custom workout parameters
   * @returns Target pace string (e.g., "5:30/km")
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
   *
   * @param customParams - Custom workout parameters
   * @returns Target power in watts
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
   *
   * @param customParams - Custom workout parameters
   * @returns Distance in kilometers
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
   *
   * @param trainingPlan - The training plan to create segments from
   * @returns Array of workout segments
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
   *
   * @param trainingPlan - The training plan to generate name from
   * @returns Descriptive workout name
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
   *
   * @param trainingPlan - The training plan to generate notes from
   * @returns Workout notes string
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
   * ===================================================================================
   * WORKOUT PARAMETER EXTRACTION HELPERS
   *
   * Helper methods for extracting workout parameters from descriptions and strings.
   * ===================================================================================
   */

  /**
   * Extract interval count from description
   */
  private static extractIntervalCount(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*(x|times|intervals|rounds)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract interval duration from description
   */
  private static extractIntervalDuration(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*min.*?(work|interval|on)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract recovery duration from description
   */
  private static extractRecoveryDuration(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*min.*?(rest|recovery|off)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract HR zone number from zone string
   */
  private static extractHRZone(hrTargetZone?: string): number | null {
    if (!hrTargetZone) return null;
    const match = hrTargetZone.match(/zone\s*(\d)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract sets count from description
   */
  private static extractSetsCount(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*sets/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract reps count from description
   */
  private static extractRepsCount(description?: string): number | null {
    if (!description) return null;
    const match = description.match(/(\d+)\s*(reps|repetitions)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract strength exercises from description
   */
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

  /**
   * Infer equipment from exercise name
   */
  private static inferEquipment(exercise: string): string {
    const exerciseLower = exercise.toLowerCase();

    if (exerciseLower.includes('push') || exerciseLower.includes('plank')) return 'bodyweight';
    if (exerciseLower.includes('squat') || exerciseLower.includes('deadlift')) return 'barbell';
    if (exerciseLower.includes('curl') || exerciseLower.includes('press')) return 'dumbbells';
    if (exerciseLower.includes('row') || exerciseLower.includes('pull')) return 'cable';

    return 'bodyweight';
  }

  /**
   * Infer muscle groups from exercise name
   */
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
}