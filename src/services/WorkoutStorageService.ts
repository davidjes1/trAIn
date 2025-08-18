// Workout Storage Service - Handles persistence of training plans and workout data using Firebase
import { TrainingPlan, PlanGenerationResult } from '../types/training-metrics.types';
import { TrackedWorkout } from '../types/workout-tracking.types';
import { FirestoreService } from '../firebase/firestore';
import { AuthService } from '../firebase/auth';
import { 
  FirebaseGeneratedPlan, 
  FirebaseTrainingPlan, 
  FirebaseTrackedWorkout,
  FirebaseTrainingCalendar 
} from '../types/firebase.types';

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

export interface StoredWorkout {
  id: string;
  date: string;
  workoutType: string;
  description: string;
  status: 'planned' | 'completed' | 'missed' | 'skipped';
  planId?: string; // Reference to the training plan
  createdAt: string;
  updatedAt: string;
  
  // Planned workout data
  expectedFatigue: number;
  durationMin: number;
  workoutId?: string;
  
  // Actual workout data (when completed)
  actualDuration?: number;
  actualFatigue?: number;
  actualDistance?: number;
  avgHR?: number;
  maxHR?: number;
  trainingLoad?: number;
  calories?: number;
  notes?: string;
}

export class WorkoutStorageService {
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
   * Save workouts from a training plan
   */
  private static saveWorkoutsFromPlan(plan: StoredTrainingPlan): void {
    const existingWorkouts = this.getStoredWorkouts();
    const now = new Date().toISOString();
    
    // Remove existing workouts for this plan
    const filteredWorkouts = existingWorkouts.filter(w => w.planId !== plan.id);
    
    // Create new workout entries
    const newWorkouts: StoredWorkout[] = plan.plan.map(plannedWorkout => ({
      id: this.generateId('workout'),
      date: plannedWorkout.date,
      workoutType: plannedWorkout.workoutType,
      description: plannedWorkout.description,
      status: 'planned',
      planId: plan.id,
      createdAt: now,
      updatedAt: now,
      expectedFatigue: plannedWorkout.expectedFatigue,
      durationMin: plannedWorkout.durationMin,
      workoutId: plannedWorkout.workoutId
    }));

    // Merge with existing workouts (excluding this plan's workouts)
    const allWorkouts = [...filteredWorkouts, ...newWorkouts];
    
    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEYS.WORKOUTS, JSON.stringify(allWorkouts));
    
    console.log(`Saved ${newWorkouts.length} workouts from plan ${plan.name}`);
  }

  /**
   * Get all stored workouts
   */
  static getStoredWorkouts(): StoredWorkout[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.WORKOUTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading workouts:', error);
      return [];
    }
  }

  /**
   * Get workouts for a specific date range
   */
  static getWorkoutsForDateRange(startDate: string, endDate: string): StoredWorkout[] {
    const workouts = this.getStoredWorkouts();
    return workouts.filter(workout => {
      return workout.date >= startDate && workout.date <= endDate;
    });
  }

  /**
   * Get workouts for a specific date
   */
  static getWorkoutsForDate(date: string): StoredWorkout[] {
    return this.getStoredWorkouts().filter(workout => workout.date === date);
  }

  /**
   * Update a workout
   */
  static updateWorkout(workoutId: string, updates: Partial<StoredWorkout>): boolean {
    const workouts = this.getStoredWorkouts();
    const workoutIndex = workouts.findIndex(w => w.id === workoutId);
    
    if (workoutIndex === -1) {
      console.error(`Workout ${workoutId} not found`);
      return false;
    }

    // Update the workout
    workouts[workoutIndex] = {
      ...workouts[workoutIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    
    console.log(`Updated workout: ${workoutId}`);
    return true;
  }

  /**
   * Mark a workout as completed with actual data
   */
  static completeWorkout(workoutId: string, actualData: {
    actualDuration?: number;
    actualFatigue?: number;
    actualDistance?: number;
    avgHR?: number;
    maxHR?: number;
    trainingLoad?: number;
    calories?: number;
    notes?: string;
  }): boolean {
    return this.updateWorkout(workoutId, {
      status: 'completed',
      ...actualData
    });
  }

  /**
   * Mark a workout as missed
   */
  static markWorkoutMissed(workoutId: string, reason?: string): boolean {
    return this.updateWorkout(workoutId, {
      status: 'missed',
      notes: reason
    });
  }

  /**
   * Mark a workout as skipped
   */
  static skipWorkout(workoutId: string, reason?: string): boolean {
    return this.updateWorkout(workoutId, {
      status: 'skipped',
      notes: reason
    });
  }

  /**
   * Add an unplanned workout
   */
  static addUnplannedWorkout(workout: {
    date: string;
    workoutType: string;
    description: string;
    actualDuration: number;
    actualFatigue?: number;
    actualDistance?: number;
    avgHR?: number;
    maxHR?: number;
    trainingLoad?: number;
    calories?: number;
    notes?: string;
  }): string {
    const workoutId = this.generateId('workout');
    const now = new Date().toISOString();
    
    const newWorkout: StoredWorkout = {
      id: workoutId,
      date: workout.date,
      workoutType: workout.workoutType,
      description: workout.description,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
      expectedFatigue: workout.actualFatigue || 50,
      durationMin: workout.actualDuration,
      actualDuration: workout.actualDuration,
      actualFatigue: workout.actualFatigue,
      actualDistance: workout.actualDistance,
      avgHR: workout.avgHR,
      maxHR: workout.maxHR,
      trainingLoad: workout.trainingLoad,
      calories: workout.calories,
      notes: workout.notes
    };

    const workouts = this.getStoredWorkouts();
    workouts.push(newWorkout);
    
    localStorage.setItem(this.STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    
    console.log(`Added unplanned workout: ${workoutId}`);
    return workoutId;
  }

  /**
   * Delete workouts associated with a plan
   */
  private static deleteWorkoutsByPlan(planId: string): void {
    const workouts = this.getStoredWorkouts();
    const filteredWorkouts = workouts.filter(w => w.planId !== planId);
    
    localStorage.setItem(this.STORAGE_KEYS.WORKOUTS, JSON.stringify(filteredWorkouts));
  }

  /**
   * Convert stored workouts to TrackedWorkout format for calendar display
   */
  static convertToTrackedWorkouts(storedWorkouts: StoredWorkout[]): TrackedWorkout[] {
    return storedWorkouts.map(workout => {
      const trackedWorkout: TrackedWorkout = {
        workoutId: workout.id,
        date: workout.date,
        workoutType: workout.workoutType,
        description: workout.description,
        expectedFatigue: workout.expectedFatigue,
        durationMin: workout.durationMin,
        status: workout.status === 'skipped' ? 'missed' : workout.status,
        lastModified: workout.updatedAt
      };

      // Add actual workout data if completed
      if (workout.status === 'completed' && workout.actualDuration) {
        trackedWorkout.actualWorkout = {
          date: workout.date,
          sport: workout.workoutType,
          duration: workout.actualDuration,
          distance: workout.actualDistance || 0,
          trainingLoad: workout.trainingLoad || 0,
          avgHR: workout.avgHR,
          maxHR: workout.maxHR,
          calories: workout.calories,
          zone1Minutes: 0, // Would need to calculate from actual data
          zone2Minutes: 0,
          zone3Minutes: 0,
          zone4Minutes: 0,
          zone5Minutes: 0,
          notes: workout.notes
        };
      }

      return trackedWorkout;
    });
  }

  /**
   * Get training plan statistics
   */
  static getPlanStatistics(planId: string): {
    totalWorkouts: number;
    completedWorkouts: number;
    missedWorkouts: number;
    plannedWorkouts: number;
    adherenceRate: number;
    totalPlannedDuration: number;
    totalActualDuration: number;
  } | null {
    const plan = this.getTrainingPlan(planId);
    if (!plan) return null;

    const workouts = this.getStoredWorkouts().filter(w => w.planId === planId);
    
    const completed = workouts.filter(w => w.status === 'completed');
    const missed = workouts.filter(w => w.status === 'missed' || w.status === 'skipped');
    const planned = workouts.filter(w => w.status === 'planned');
    
    const totalPlannedDuration = workouts.reduce((sum, w) => sum + w.durationMin, 0);
    const totalActualDuration = completed.reduce((sum, w) => sum + (w.actualDuration || 0), 0);
    
    return {
      totalWorkouts: workouts.length,
      completedWorkouts: completed.length,
      missedWorkouts: missed.length,
      plannedWorkouts: planned.length,
      adherenceRate: workouts.length > 0 ? (completed.length / workouts.length) * 100 : 0,
      totalPlannedDuration,
      totalActualDuration
    };
  }

  /**
   * Export training plan and workouts to JSON
   */
  static exportPlan(planId: string): string {
    const plan = this.getTrainingPlan(planId);
    if (!plan) throw new Error(`Training plan ${planId} not found`);

    const workouts = this.getStoredWorkouts().filter(w => w.planId === planId);
    const statistics = this.getPlanStatistics(planId);
    
    const exportData = {
      plan,
      workouts,
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
   * Get storage usage information
   */
  static getStorageInfo(): {
    trainingPlansCount: number;
    workoutsCount: number;
    activePlanId: string | null;
    estimatedSizeKB: number;
  } {
    const plans = this.getStoredTrainingPlans();
    const workouts = this.getStoredWorkouts();
    const activePlanId = localStorage.getItem(this.STORAGE_KEYS.ACTIVE_PLAN);
    
    // Rough estimation of storage size
    const plansSize = JSON.stringify(plans).length;
    const workoutsSize = JSON.stringify(workouts).length;
    const estimatedSizeKB = Math.round((plansSize + workoutsSize) / 1024);
    
    return {
      trainingPlansCount: plans.length,
      workoutsCount: workouts.length,
      activePlanId,
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
    WORKOUTS: 'train_workouts',
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
}