// Dynamic training plan generator with adaptive workout selection
import { 
  PlanOptions, 
  TrainingPlan, 
  ReadinessMetrics, 
  PlanGenerationResult,
  WorkoutType,
  TrainingPhase
} from '../types/training-metrics.types';
import { WorkoutLibrary, WORKOUT_LIBRARY } from '../config/workouts';

export class PlanGenerator {
  private static readonly MAX_HARD_WORKOUTS_PER_WEEK = 2;

  /**
   * Generate a dynamic training plan based on user state and recovery metrics
   */
  static generatePlan(options: PlanOptions): PlanGenerationResult {
    const readinessMetrics = this.calculateReadinessMetrics(options);
    const recommendations: string[] = [];
    const warnings: string[] = [];
    const plan: TrainingPlan[] = [];

    // Generate plan for each day
    const startDate = new Date();
    for (let dayOffset = 0; dayOffset < options.planDuration; dayOffset++) {
      const targetDate = new Date(startDate);
      targetDate.setDate(startDate.getDate() + dayOffset);
      
      const dayWorkout = this.selectWorkoutForDay(
        options, 
        readinessMetrics, 
        plan, 
        dayOffset,
        recommendations,
        warnings
      );

      if (dayWorkout) {
        plan.push({
          date: this.formatDate(targetDate),
          workoutType: dayWorkout.type,
          description: dayWorkout.description,
          expectedFatigue: dayWorkout.fatigueScore,
          durationMin: dayWorkout.durationMin,
          workoutId: `${dayWorkout.type}-${dayWorkout.tag}`,
          completed: false
        });
      }
    }

    // Add overall recommendations
    this.addGeneralRecommendations(readinessMetrics, recommendations, warnings);

    return {
      plan,
      readinessMetrics,
      recommendations,
      warnings,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate overall readiness and training metrics
   */
  private static calculateReadinessMetrics(options: PlanOptions): ReadinessMetrics {
    const fatigue7DayAvg = this.average(options.recentFatigueScores);
    const trainingLoad7Day = options.recentWorkouts.reduce((sum, w) => sum + (w.trainingLoad || 0), 0);
    const recentHardDays = options.recentWorkouts.filter(w => w.fatigue > 60).length;
    
    // Calculate recovery score from available metrics
    let recoveryScore = 70; // Default good recovery when no data provided
    let totalRecoveryPoints = 0;
    let recoveryComponents = 0;
    
    if (options.recoveryMetrics.bodyBattery) {
      totalRecoveryPoints += options.recoveryMetrics.bodyBattery;
      recoveryComponents++;
    }
    if (options.recoveryMetrics.sleepScore) {
      totalRecoveryPoints += options.recoveryMetrics.sleepScore;
      recoveryComponents++;
    }
    if (options.recoveryMetrics.hrv) {
      // Normalize HRV to 0-100 scale (rough approximation)
      const normalizedHRV = Math.min(100, options.recoveryMetrics.hrv * 2);
      totalRecoveryPoints += normalizedHRV;
      recoveryComponents++;
    }
    
    if (recoveryComponents > 0) {
      recoveryScore = totalRecoveryPoints / recoveryComponents;
    }

    // Calculate overall readiness score
    let readinessScore = 100;
    
    // Penalize high recent fatigue
    if (fatigue7DayAvg > 60) readinessScore -= 20;
    if (fatigue7DayAvg > 75) readinessScore -= 10;
    
    // Penalize too many recent hard days
    if (recentHardDays >= 3) readinessScore -= 15;
    if (recentHardDays >= 4) readinessScore -= 15;
    
    // Boost for good recovery metrics
    if (recoveryScore > 80) readinessScore += 10;
    if (recoveryScore < 40) readinessScore -= 20;

    // Days until race (if specified)
    let daysUntilRace: number | undefined;
    if (options.user.eventDate) {
      const eventDate = new Date(options.user.eventDate);
      const today = new Date();
      daysUntilRace = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      score: Math.max(0, Math.min(100, readinessScore)),
      fatigue7DayAvg,
      recoveryScore,
      trainingLoad7Day,
      daysUntilRace,
      recentHardDays
    };
  }

  /**
   * Select appropriate workout for a specific day
   */
  private static selectWorkoutForDay(
    options: PlanOptions,
    readiness: ReadinessMetrics,
    existingPlan: TrainingPlan[],
    dayOffset: number,
    recommendations: string[],
    warnings: string[]
  ): WorkoutType | null {
    // Check if today is available
    if (dayOffset === 0 && options.availabilityToday === false) {
      return WorkoutLibrary.getWorkoutByTypeAndTag('rest', 'zone1') || null;
    }

    // Count hard workouts in current plan
    const hardWorkoutsInPlan = existingPlan.filter(w => w.expectedFatigue > 60).length;
    const lastWorkout = existingPlan[existingPlan.length - 1];
    const lastWorkoutWasHard = lastWorkout && lastWorkout.expectedFatigue > 60;

    // Determine current phase
    const currentPhase = this.determinePhase(options, readiness);

    // Recovery decision logic
    if (readiness.score < 40) {
      warnings.push('Low readiness detected - recommending recovery');
      return this.selectRecoveryWorkout();
    }

    // Prevent back-to-back hard days
    if (lastWorkoutWasHard) {
      return this.selectEasyWorkout(currentPhase, options.user.fitnessLevel);
    }

    // Limit hard workouts per week
    if (hardWorkoutsInPlan >= this.MAX_HARD_WORKOUTS_PER_WEEK) {
      return this.selectEasyWorkout(currentPhase, options.user.fitnessLevel);
    }

    // Force recovery if too many recent hard days
    if (readiness.recentHardDays >= 3) {
      recommendations.push('Taking extra recovery due to recent high training load');
      return this.selectRecoveryWorkout();
    }

    // High readiness = opportunity for hard workout
    if (readiness.score > 70 && hardWorkoutsInPlan < this.MAX_HARD_WORKOUTS_PER_WEEK) {
      return this.selectHardWorkout(currentPhase, options.user.fitnessLevel);
    }

    // Good readiness = moderate workout
    if (readiness.score > 50) {
      return this.selectModerateWorkout(currentPhase, options.user.fitnessLevel);
    }

    // Default to easy workout
    return this.selectEasyWorkout(currentPhase, options.user.fitnessLevel);
  }

  /**
   * Determine current training phase based on days until race
   */
  private static determinePhase(options: PlanOptions, readiness: ReadinessMetrics): TrainingPhase {
    if (options.currentPhase) {
      return options.currentPhase;
    }

    if (!readiness.daysUntilRace) {
      return 'base'; // Default to base building
    }

    const daysUntilRace = readiness.daysUntilRace;
    
    if (daysUntilRace <= 14) return 'taper';
    if (daysUntilRace <= 28) return 'peak';
    if (daysUntilRace <= 84) return 'build'; // 12 weeks
    return 'base';
  }

  /**
   * Select recovery workout
   */
  private static selectRecoveryWorkout(): WorkoutType {
    const recoveryWorkouts = WorkoutLibrary.getRecoveryWorkouts();
    
    // Ensure we always have a recovery workout
    if (recoveryWorkouts.length === 0) {
      console.warn('No recovery workouts found, using fallback rest day');
      return {
        type: 'rest',
        tag: 'zone1',
        description: 'Complete rest day',
        durationMin: 0,
        fatigueScore: 0,
        recoveryImpact: 'restorative'
      } as WorkoutType;
    }
    
    return this.randomChoice(recoveryWorkouts);
  }

  /**
   * Select easy workout
   */
  private static selectEasyWorkout(
    phase: TrainingPhase, 
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): WorkoutType {
    const easyWorkouts = WorkoutLibrary.getEasyWorkouts()
      .filter(w => !w.phase || w.phase === phase);
    
    // Fallback to all easy workouts if phase filtering returns empty
    const workoutPool = easyWorkouts.length > 0 ? easyWorkouts : WorkoutLibrary.getEasyWorkouts();
    
    // Fallback to recovery workout if still empty
    const finalPool = workoutPool.length > 0 ? workoutPool : WorkoutLibrary.getRecoveryWorkouts();
    
    const workout = this.randomChoice(finalPool);
    return WorkoutLibrary.adjustWorkoutForFitnessLevel(workout, fitnessLevel);
  }

  /**
   * Select moderate intensity workout
   */
  private static selectModerateWorkout(
    phase: TrainingPhase,
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): WorkoutType {
    const moderateWorkouts = WORKOUT_LIBRARY.filter(w => 
      w.fatigueScore >= 45 && w.fatigueScore <= 65 &&
      (!w.phase || w.phase === phase)
    );
    
    // Fallback to all moderate workouts if phase filtering returns empty
    const workoutPool = moderateWorkouts.length > 0 ? moderateWorkouts : 
      WORKOUT_LIBRARY.filter(w => w.fatigueScore >= 45 && w.fatigueScore <= 65);
    
    // Fallback to easy workouts if moderate workouts not available
    const finalPool = workoutPool.length > 0 ? workoutPool : WorkoutLibrary.getEasyWorkouts();
    
    const workout = this.randomChoice(finalPool);
    return WorkoutLibrary.adjustWorkoutForFitnessLevel(workout, fitnessLevel);
  }

  /**
   * Select high intensity workout
   */
  private static selectHardWorkout(
    phase: TrainingPhase,
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): WorkoutType {
    const hardWorkouts = WorkoutLibrary.getHardWorkouts()
      .filter(w => !w.phase || w.phase === phase);
    
    // Fallback to all hard workouts if phase filtering returns empty
    const workoutPool = hardWorkouts.length > 0 ? hardWorkouts : WorkoutLibrary.getHardWorkouts();
    
    // Prefer brick workouts in build/peak phases
    let preferredWorkouts = workoutPool;
    if (phase === 'build' || phase === 'peak') {
      const brickWorkouts = workoutPool.filter(w => w.type === 'brick');
      if (brickWorkouts.length > 0 && Math.random() < 0.4) {
        preferredWorkouts = brickWorkouts;
      }
    }
    
    // Final fallback to moderate workouts if no hard workouts available
    const finalPool = preferredWorkouts.length > 0 ? preferredWorkouts : 
      WORKOUT_LIBRARY.filter(w => w.fatigueScore >= 45 && w.fatigueScore <= 65);
    
    const workout = this.randomChoice(finalPool);
    return WorkoutLibrary.adjustWorkoutForFitnessLevel(workout, fitnessLevel);
  }

  /**
   * Add general recommendations based on readiness metrics
   */
  private static addGeneralRecommendations(
    readiness: ReadinessMetrics,
    recommendations: string[],
    warnings: string[]
  ): void {
    if (readiness.score > 85) {
      recommendations.push('Excellent readiness - good opportunity for quality training');
    }
    
    if (readiness.fatigue7DayAvg > 70) {
      warnings.push('High average fatigue - consider reducing training intensity');
    }
    
    if (readiness.recentHardDays >= 3) {
      warnings.push('High recent training load - prioritizing recovery');
    }
    
    if (readiness.daysUntilRace && readiness.daysUntilRace <= 7) {
      recommendations.push('Race week detected - focusing on taper and preparation');
    }
    
    if (readiness.recoveryScore < 30) {
      warnings.push('Poor recovery metrics - ensure adequate sleep and nutrition');
    }
  }

  /**
   * Utility functions
   */
  private static average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private static randomChoice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot select from empty array');
    }
    return array[Math.floor(Math.random() * array.length)];
  }

  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Export plan to CSV format
   */
  static exportPlanToCSV(plan: TrainingPlan[]): string {
    const headers = ['Date', 'Workout Type', 'Description', 'Duration (min)', 'Expected Fatigue'];
    const rows = plan.map(p => [
      p.date,
      p.workoutType,
      p.description,
      p.durationMin.toString(),
      p.expectedFatigue.toString()
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  }
}