// Dynamic training plan generator with adaptive workout selection
import { 
  PlanOptions, 
  TrainingPlan, 
  ReadinessMetrics, 
  PlanGenerationResult,
  WorkoutType,
  TrainingPhase,
  ActivityMetrics
} from '../types/training-metrics.types';
import { WorkoutLibrary, WORKOUT_LIBRARY } from '../config/workouts';
import { TrackedWorkout } from '../types/workout-tracking.types';

// Enhanced plan options with actual workout data
export interface EnhancedPlanOptions extends PlanOptions {
  historicalActivities?: ActivityMetrics[];
  completedWorkouts?: TrackedWorkout[];
  excludedExercises?: string[]; // Exercises to exclude from plan generation
}

// Activity pattern analysis
interface ActivityPattern {
  preferredSports: string[];
  averageWeeklyDistance: number;
  averageWeeklyDuration: number;
  averageTrainingLoad: number;
  consistencyScore: number;
  strongDays: string[]; // Days of week with better performance
  preferredIntensityDistribution: {
    easy: number;
    moderate: number;
    hard: number;
  };
}

export class PlanGenerator {
  private static readonly MAX_HARD_WORKOUTS_PER_WEEK = 2;

  /**
   * Generate an enhanced training plan using actual workout data for better recommendations
   */
  static generateEnhancedPlan(options: EnhancedPlanOptions): PlanGenerationResult {
    // Analyze historical data if available
    const activityPattern = this.analyzeActivityPattern(options);
    const enhancedReadiness = this.calculateEnhancedReadinessMetrics(options, activityPattern);
    
    const recommendations: string[] = [];
    const warnings: string[] = [];
    const plan: TrainingPlan[] = [];

    // Add insights from historical data analysis
    this.addActivityPatternInsights(activityPattern, recommendations);

    // Generate plan for each day with enhanced logic
    const startDate = new Date();
    for (let dayOffset = 0; dayOffset < options.planDuration; dayOffset++) {
      const targetDate = new Date(startDate);
      targetDate.setDate(startDate.getDate() + dayOffset);
      
      const dayWorkout = this.selectEnhancedWorkoutForDay(
        options, 
        enhancedReadiness, 
        activityPattern,
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

    // Add enhanced recommendations
    this.addEnhancedRecommendations(enhancedReadiness, activityPattern, recommendations, warnings);

    return {
      plan,
      readinessMetrics: enhancedReadiness,
      recommendations,
      warnings,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate a dynamic training plan based on user state and recovery metrics
   * (Legacy method - maintained for backward compatibility)
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
   * Analyze historical activity patterns to inform plan generation
   */
  private static analyzeActivityPattern(options: EnhancedPlanOptions): ActivityPattern {
    const activities = options.historicalActivities || [];
    // Note: completedWorkouts could be used for workout-specific analysis in future enhancements

    if (activities.length === 0) {
      // Return default pattern if no historical data
      return {
        preferredSports: ['running'],
        averageWeeklyDistance: 0,
        averageWeeklyDuration: 0,
        averageTrainingLoad: 0,
        consistencyScore: 0,
        strongDays: [],
        preferredIntensityDistribution: {
          easy: 0.7,
          moderate: 0.2,
          hard: 0.1
        }
      };
    }

    // Analyze sport preferences
    const sportCounts = activities.reduce((acc, activity) => {
      acc[activity.sport] = (acc[activity.sport] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const preferredSports = Object.entries(sportCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([sport]) => sport);

    // Calculate weekly averages (last 8 weeks)
    const recentActivities = activities
      .filter(a => {
        const activityDate = new Date(a.date);
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        return activityDate >= eightWeeksAgo;
      });

    const weeklyGroups = this.groupActivitiesByWeek(recentActivities);
    const weeklyDistances = weeklyGroups.map(week => 
      week.reduce((sum, a) => sum + a.distance, 0)
    );
    const weeklyDurations = weeklyGroups.map(week => 
      week.reduce((sum, a) => sum + a.duration, 0)
    );
    const weeklyLoads = weeklyGroups.map(week => 
      week.reduce((sum, a) => sum + a.trainingLoad, 0)
    );

    // Analyze consistency (how many weeks had activities)
    const weeksWithActivity = weeklyGroups.filter(week => week.length > 0).length;
    const consistencyScore = weeklyGroups.length > 0 ? 
      (weeksWithActivity / weeklyGroups.length) * 100 : 0;

    // Analyze strong days of the week
    const dayOfWeekPerformance = activities.reduce((acc, activity) => {
      const dayOfWeek = new Date(activity.date).getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      
      if (!acc[dayName]) {
        acc[dayName] = { count: 0, totalLoad: 0 };
      }
      acc[dayName].count++;
      acc[dayName].totalLoad += activity.trainingLoad;
      return acc;
    }, {} as Record<string, { count: number; totalLoad: number }>);

    const strongDays = Object.entries(dayOfWeekPerformance)
      .filter(([, data]) => data.count >= 3) // At least 3 activities on this day
      .sort(([,a], [,b]) => (b.totalLoad / b.count) - (a.totalLoad / a.count))
      .slice(0, 3)
      .map(([day]) => day);

    // Analyze intensity distribution based on training load
    const intensityDistribution = this.analyzeIntensityDistribution(activities);

    return {
      preferredSports,
      averageWeeklyDistance: this.average(weeklyDistances),
      averageWeeklyDuration: this.average(weeklyDurations),
      averageTrainingLoad: this.average(weeklyLoads),
      consistencyScore,
      strongDays,
      preferredIntensityDistribution: intensityDistribution
    };
  }

  /**
   * Calculate enhanced readiness metrics using historical data
   */
  private static calculateEnhancedReadinessMetrics(
    options: EnhancedPlanOptions, 
    pattern: ActivityPattern
  ): ReadinessMetrics {
    // Start with base readiness calculation
    const baseReadiness = this.calculateReadinessMetrics(options);

    // Enhance with historical analysis
    let enhancedScore = baseReadiness.score;

    // Adjust based on consistency
    if (pattern.consistencyScore > 80) {
      enhancedScore += 5; // Reward consistency
    } else if (pattern.consistencyScore < 40) {
      enhancedScore -= 10; // Penalize inconsistency
    }

    // Adjust based on recent training progression
    const recentProgression = this.analyzeRecentProgression(options.historicalActivities || []);
    if (recentProgression > 0.1) {
      enhancedScore += 5; // Positive progression
    } else if (recentProgression < -0.2) {
      enhancedScore -= 15; // Significant decline
    }

    return {
      ...baseReadiness,
      score: Math.max(0, Math.min(100, enhancedScore))
    };
  }

  /**
   * Enhanced workout selection using activity patterns
   */
  private static selectEnhancedWorkoutForDay(
    options: EnhancedPlanOptions,
    readiness: ReadinessMetrics,
    pattern: ActivityPattern,
    existingPlan: TrainingPlan[],
    dayOffset: number,
    recommendations: string[],
    warnings: string[]
  ): WorkoutType | null {
    // Check day of week preferences
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][targetDate.getDay()];
    
    const isStrongDay = pattern.strongDays.includes(dayName);
    
    // Use base logic first
    const baseWorkout = this.selectWorkoutForDay(
      options, readiness, existingPlan, dayOffset, recommendations, warnings
    );

    if (!baseWorkout) return null;

    // Filter out excluded exercises
    if (options.excludedExercises && options.excludedExercises.length > 0) {
      if (this.isWorkoutExcluded(baseWorkout, options.excludedExercises)) {
        // Find an alternative workout that's not excluded
        const alternativeWorkout = this.findAlternativeWorkout(
          baseWorkout, options.excludedExercises, readiness, targetDate
        );
        if (alternativeWorkout) {
          recommendations.push(`Swapped ${baseWorkout.type} for ${alternativeWorkout.type} due to exercise restrictions`);
          return alternativeWorkout;
        } else {
          // If no alternative found, suggest rest day
          recommendations.push(`No suitable alternative found for ${baseWorkout.type}, suggesting rest day`);
          return WorkoutLibrary.getWorkoutByTypeAndTag('rest', 'zone1') || null;
        }
      }
    }

    // Enhance workout selection based on patterns
    const enhancedWorkout = this.enhanceWorkoutWithPattern(baseWorkout, pattern, isStrongDay);

    // Prefer user's favorite sports
    if (pattern.preferredSports.length > 0 && Math.random() < 0.7) {
      const preferredSport = this.randomChoice(pattern.preferredSports);
      const preferredWorkouts = WORKOUT_LIBRARY.filter(w => 
        w.type.toLowerCase().includes(preferredSport.toLowerCase()) ||
        w.description.toLowerCase().includes(preferredSport.toLowerCase())
      );
      
      if (preferredWorkouts.length > 0) {
        const matchingWorkout = preferredWorkouts.find(w => 
          Math.abs(w.fatigueScore - enhancedWorkout.fatigueScore) <= 10
        );
        if (matchingWorkout) {
          return matchingWorkout;
        }
      }
    }

    return enhancedWorkout;
  }

  /**
   * Add insights from activity pattern analysis
   */
  private static addActivityPatternInsights(
    pattern: ActivityPattern, 
    recommendations: string[]
  ): void {
    if (pattern.consistencyScore > 80) {
      recommendations.push(`Excellent consistency (${pattern.consistencyScore.toFixed(0)}%) - maintaining current training frequency`);
    } else if (pattern.consistencyScore < 40) {
      recommendations.push(`Low consistency detected (${pattern.consistencyScore.toFixed(0)}%) - focusing on sustainable routine`);
    }

    if (pattern.strongDays.length > 0) {
      recommendations.push(`Your strongest days: ${pattern.strongDays.join(', ')} - scheduling key workouts accordingly`);
    }

    if (pattern.averageWeeklyDistance > 0) {
      recommendations.push(`Based on your average ${pattern.averageWeeklyDistance.toFixed(1)}km/week - adjusting distances appropriately`);
    }

    if (pattern.preferredSports.length > 0) {
      recommendations.push(`Incorporating your preferred activities: ${pattern.preferredSports.join(', ')}`);
    }
  }

  /**
   * Add enhanced recommendations based on historical analysis
   */
  private static addEnhancedRecommendations(
    readiness: ReadinessMetrics,
    pattern: ActivityPattern,
    recommendations: string[],
    warnings: string[]
  ): void {
    // Base recommendations
    this.addGeneralRecommendations(readiness, recommendations, warnings);

    // Pattern-based recommendations
    if (pattern.averageTrainingLoad > 0) {
      const currentLoad = readiness.trainingLoad7Day;
      const historical = pattern.averageTrainingLoad;
      
      if (currentLoad > historical * 1.3) {
        warnings.push('Current training load is 30% above your historical average - consider reducing intensity');
      } else if (currentLoad < historical * 0.7) {
        recommendations.push('Training load is below your historical average - opportunity to increase volume');
      }
    }

    // Intensity distribution recommendations
    const easyPct = pattern.preferredIntensityDistribution.easy;
    if (easyPct < 0.6) {
      warnings.push('Historical data shows high intensity focus - adding more easy/recovery sessions');
    } else if (easyPct > 0.85) {
      recommendations.push('Good easy training base - can handle more intensity for progression');
    }
  }

  /**
   * Helper methods for enhanced analysis
   */
  private static groupActivitiesByWeek(activities: ActivityMetrics[]): ActivityMetrics[][] {
    const weeks: ActivityMetrics[][] = [];
    const sorted = [...activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (sorted.length === 0) return [];

    let currentWeek: ActivityMetrics[] = [];
    let currentWeekStart = this.getWeekStart(new Date(sorted[0].date));

    for (const activity of sorted) {
      const activityDate = new Date(activity.date);
      const weekStart = this.getWeekStart(activityDate);
      
      if (weekStart.getTime() !== currentWeekStart.getTime()) {
        if (currentWeek.length > 0) {
          weeks.push(currentWeek);
        }
        currentWeek = [];
        currentWeekStart = weekStart;
      }
      
      currentWeek.push(activity);
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }

  private static getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private static analyzeIntensityDistribution(activities: ActivityMetrics[]): {
    easy: number;
    moderate: number;
    hard: number;
  } {
    if (activities.length === 0) {
      return { easy: 0.7, moderate: 0.2, hard: 0.1 };
    }

    const total = activities.length;
    const easy = activities.filter(a => a.trainingLoad < 150).length;
    const hard = activities.filter(a => a.trainingLoad > 300).length;
    const moderate = total - easy - hard;

    return {
      easy: easy / total,
      moderate: moderate / total,
      hard: hard / total
    };
  }

  private static analyzeRecentProgression(activities: ActivityMetrics[]): number {
    if (activities.length < 6) return 0;

    const sorted = [...activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstAvgLoad = this.average(firstHalf.map(a => a.trainingLoad));
    const secondAvgLoad = this.average(secondHalf.map(a => a.trainingLoad));

    return firstAvgLoad > 0 ? (secondAvgLoad - firstAvgLoad) / firstAvgLoad : 0;
  }

  private static enhanceWorkoutWithPattern(
    workout: WorkoutType, 
    pattern: ActivityPattern, 
    isStrongDay: boolean
  ): WorkoutType {
    // Adjust duration based on historical averages
    let adjustedDuration = workout.durationMin;
    
    if (pattern.averageWeeklyDuration > 0) {
      const avgSessionDuration = pattern.averageWeeklyDuration / 4; // Assume 4 sessions per week
      if (avgSessionDuration > 45) {
        adjustedDuration = Math.min(workout.durationMin * 1.2, workout.durationMin + 15);
      } else if (avgSessionDuration < 30) {
        adjustedDuration = Math.max(workout.durationMin * 0.8, workout.durationMin - 10);
      }
    }

    // Boost intensity on strong days
    let adjustedFatigue = workout.fatigueScore;
    if (isStrongDay && workout.fatigueScore < 80) {
      adjustedFatigue = Math.min(100, workout.fatigueScore + 5);
    }

    return {
      ...workout,
      durationMin: Math.round(adjustedDuration),
      fatigueScore: adjustedFatigue,
      description: isStrongDay ? 
        `${workout.description} (scheduled on your strong day)` : 
        workout.description
    };
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

  /**
   * Check if a workout type is in the excluded list
   */
  private static isWorkoutExcluded(workout: WorkoutType, excludedExercises: string[]): boolean {
    if (!workout || !excludedExercises || excludedExercises.length === 0) {
      return false;
    }

    // Map workout types to their corresponding exercise categories
    const exerciseMapping: Record<string, string[]> = {
      'swimming': ['swim', 'easy_swim', 'tempo_swim', 'interval_swim'],
      'running': ['run', 'easy_run', 'tempo_run', 'interval_run', 'long_run', 'recovery_run', 'fartlek', 'hill_repeats', 'track_workout'],
      'cycling': ['bike', 'easy_bike', 'tempo_bike', 'interval_bike', 'endurance_bike', 'recovery_bike'],
      'strength': ['strength', 'strength_training', 'resistance'],
      'yoga': ['yoga', 'mobility', 'flexibility'],
      'hiit': ['hiit', 'interval', 'crosstraining']
    };

    // Check if the workout type matches any excluded exercise category
    for (const excludedExercise of excludedExercises) {
      const workoutTypes = exerciseMapping[excludedExercise] || [];
      if (workoutTypes.includes(workout.type)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find an alternative workout that is not excluded
   */
  private static findAlternativeWorkout(
    originalWorkout: WorkoutType,
    excludedExercises: string[],
    readiness: ReadinessMetrics,
    targetDate: Date
  ): WorkoutType | null {
    // Get all available workouts from the library
    const allWorkouts = WORKOUT_LIBRARY;
    
    // Filter out excluded workouts and find alternatives with similar characteristics
    const suitableAlternatives = allWorkouts.filter(workout => {
      // Skip excluded exercises
      if (this.isWorkoutExcluded(workout, excludedExercises)) {
        return false;
      }
      
      // Try to match intensity and duration roughly
      const intensityMatch = Math.abs(workout.fatigueScore - originalWorkout.fatigueScore) <= 20;
      const durationMatch = Math.abs(workout.durationMin - originalWorkout.durationMin) <= 30;
      
      return intensityMatch && durationMatch;
    });

    if (suitableAlternatives.length === 0) {
      // If no suitable alternatives, look for any non-excluded workout
      const anyAlternatives = allWorkouts.filter(workout => 
        !this.isWorkoutExcluded(workout, excludedExercises)
      );
      
      // Pick a moderate intensity workout if available
      const moderateWorkouts = anyAlternatives.filter(w => w.fatigueScore >= 30 && w.fatigueScore <= 50);
      if (moderateWorkouts.length > 0) {
        return moderateWorkouts[0];
      }
      
      return anyAlternatives.length > 0 ? anyAlternatives[0] : null;
    }

    // Return the first suitable alternative
    return suitableAlternatives[0];
  }
}