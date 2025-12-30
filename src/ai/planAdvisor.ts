// AI-powered workout recommendation system with adaptive training suggestions

import {
  WorkoutType,
  ActivityMetrics,
  FirebaseRecoveryMetrics
} from '@/core/models';
import { 
  AIRecommendationInput,
  WorkoutRecommendation,
  WorkoutModification,
  RecommendationResponse
} from './aiTypes';
import { AIUtils } from './aiUtils';
import { WORKOUT_LIBRARY, WorkoutLibrary } from '../config/workouts';
// import { HRZoneCalculator, DEFAULT_TRAINING_CONFIG } from '../config/training';

export class PlanAdvisor {
  private static readonly CONFIDENCE_THRESHOLD = 60;
  private static readonly MAX_ALTERNATIVES = 3;
  
  /**
   * Generate AI-powered workout recommendation for tomorrow
   */
  static async recommendTomorrowWorkout(input: AIRecommendationInput): Promise<RecommendationResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      // Validate input data
      const validation = this.validateInput(input);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          warnings,
          context: AIUtils.createDecisionContext(
            input.userId,
            'workout-recommendation',
            input
          ),
          processingTime: Date.now() - startTime
        };
      }
      
      // Calculate current training stress balance
      const tsbResult = AIUtils.calculateTSB(input.recentActivities);
      if (tsbResult.dataQuality === 'poor') {
        warnings.push('Limited training history - recommendations based on available data');
      }
      
      // Analyze recovery status
      const recoveryAnalysis = this.analyzeRecoveryStatus(input.recoveryMetrics);
      
      // Determine base workout recommendation
      const baseRecommendation = this.selectBaseWorkout(
        input, 
        tsbResult.value, 
        recoveryAnalysis
      );
      
      // Apply contextual modifications
      const modifiedRecommendation = this.applyContextualModifications(
        baseRecommendation,
        input,
        tsbResult.value,
        recoveryAnalysis
      );
      
      // Generate alternatives
      const alternatives = this.generateAlternatives(
        modifiedRecommendation.recommendedWorkout,
        input,
        tsbResult.value
      );
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(
        input,
        tsbResult,
        recoveryAnalysis
      );
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          ...modifiedRecommendation,
          alternatives,
          confidence
        },
        warnings,
        context: AIUtils.createDecisionContext(
          input.userId,
          'workout-recommendation',
          input,
          ['TSB-analysis', 'recovery-assessment', 'workout-selection'],
          {
            tsb: tsbResult.value.tsb,
            recoveryStatus: recoveryAnalysis.overallStatus,
            confidence
          }
        ),
        processingTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: `AI recommendation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings,
        context: AIUtils.createDecisionContext(input.userId, 'workout-recommendation', input),
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Validate input data quality and completeness
   */
  private static validateInput(input: AIRecommendationInput): { valid: boolean; error?: string } {
    if (!input.userId) {
      return { valid: false, error: 'User ID required' };
    }
    
    if (!input.currentDate) {
      return { valid: false, error: 'Current date required' };
    }
    
    if (!input.userProfile) {
      return { valid: false, error: 'User profile required' };
    }
    
    if (input.recentActivities.length === 0) {
      // Allow empty activities but warn
      return { valid: true };
    }
    
    // Check if activities are within reasonable timeframe
    const currentDate = new Date(input.currentDate);
    const oldestActivity = new Date(
      Math.min(...input.recentActivities.map(a => new Date(a.date).getTime()))
    );
    const daysDifference = (currentDate.getTime() - oldestActivity.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDifference > 60) {
      return { valid: false, error: 'Activity data too old for reliable recommendations' };
    }
    
    return { valid: true };
  }
  
  /**
   * Analyze overall recovery status from recent metrics
   */
  private static analyzeRecoveryStatus(recoveryMetrics: FirebaseRecoveryMetrics[]): {
    overallStatus: 'excellent' | 'good' | 'fair' | 'poor';
    keyFactors: string[];
    recommendation: 'full-training' | 'moderate-training' | 'easy-training' | 'rest';
  } {
    if (recoveryMetrics.length === 0) {
      return {
        overallStatus: 'fair',
        keyFactors: ['No recovery data available'],
        recommendation: 'moderate-training'
      };
    }
    
    const recent = recoveryMetrics.slice(-3); // Last 3 days
    const latest = recent[recent.length - 1];
    const keyFactors: string[] = [];
    
    let recoveryScore = 70; // Start with neutral
    
    // Body Battery Analysis
    if (latest.bodyBattery !== undefined) {
      if (latest.bodyBattery < 20) {
        recoveryScore -= 30;
        keyFactors.push('Very low body battery');
      } else if (latest.bodyBattery < 40) {
        recoveryScore -= 15;
        keyFactors.push('Low body battery');
      } else if (latest.bodyBattery > 80) {
        recoveryScore += 10;
        keyFactors.push('High body battery');
      }
    }
    
    // Sleep Score Analysis
    if (latest.sleepScore !== undefined) {
      if (latest.sleepScore < 60) {
        recoveryScore -= 20;
        keyFactors.push('Poor sleep quality');
      } else if (latest.sleepScore < 75) {
        recoveryScore -= 10;
        keyFactors.push('Below average sleep');
      } else if (latest.sleepScore > 85) {
        recoveryScore += 10;
        keyFactors.push('Excellent sleep quality');
      }
    }
    
    // HRV Analysis (if available)
    if (latest.hrv !== undefined && recent.length > 1) {
      const avgHRV = recent.slice(0, -1)
        .filter(m => m.hrv !== undefined)
        .reduce((sum, m) => sum + m.hrv!, 0) / (recent.length - 1);
      
      if (avgHRV > 0) {
        const hrvChange = (latest.hrv - avgHRV) / avgHRV;
        if (hrvChange < -0.15) {
          recoveryScore -= 20;
          keyFactors.push('HRV significantly below baseline');
        } else if (hrvChange < -0.05) {
          recoveryScore -= 10;
          keyFactors.push('HRV below baseline');
        } else if (hrvChange > 0.05) {
          recoveryScore += 5;
          keyFactors.push('HRV above baseline');
        }
      }
    }
    
    // Subjective Fatigue
    const avgSubjectiveFatigue = recent.reduce((sum, m) => sum + m.subjectiveFatigue, 0) / recent.length;
    if (avgSubjectiveFatigue >= 7) {
      recoveryScore -= 25;
      keyFactors.push('High subjective fatigue');
    } else if (avgSubjectiveFatigue >= 5) {
      recoveryScore -= 10;
      keyFactors.push('Moderate subjective fatigue');
    } else if (avgSubjectiveFatigue <= 3) {
      recoveryScore += 10;
      keyFactors.push('Low subjective fatigue');
    }
    
    // Determine overall status and recommendation
    let overallStatus: 'excellent' | 'good' | 'fair' | 'poor';
    let recommendation: 'full-training' | 'moderate-training' | 'easy-training' | 'rest';
    
    if (recoveryScore >= 85) {
      overallStatus = 'excellent';
      recommendation = 'full-training';
    } else if (recoveryScore >= 70) {
      overallStatus = 'good';
      recommendation = 'full-training';
    } else if (recoveryScore >= 50) {
      overallStatus = 'fair';
      recommendation = 'moderate-training';
    } else if (recoveryScore >= 30) {
      overallStatus = 'poor';
      recommendation = 'easy-training';
    } else {
      overallStatus = 'poor';
      recommendation = 'rest';
    }
    
    return {
      overallStatus,
      keyFactors,
      recommendation
    };
  }
  
  /**
   * Select base workout based on TSB and recovery analysis
   */
  private static selectBaseWorkout(
    input: AIRecommendationInput,
    tsb: any,
    recovery: any
  ): WorkoutRecommendation {
    const reasoning: string[] = [];
    const modifications: WorkoutModification[] = [];
    
    // Start with recovery-based filtering
    let availableWorkouts = [...WORKOUT_LIBRARY];
    
    if (recovery.recommendation === 'rest') {
      availableWorkouts = WorkoutLibrary.getRecoveryWorkouts();
      reasoning.push('Recovery metrics indicate need for rest');
    } else if (recovery.recommendation === 'easy-training') {
      availableWorkouts = WorkoutLibrary.getEasyWorkouts();
      reasoning.push('Recovery metrics suggest easy training only');
    } else if (recovery.recommendation === 'moderate-training') {
      availableWorkouts = WORKOUT_LIBRARY.filter(w => w.fatigueScore <= 70);
      reasoning.push('Recovery allows moderate intensity training');
    }
    
    // Apply TSB-based filtering
    if (tsb.tsb < -30) {
      // High fatigue - force recovery
      availableWorkouts = WorkoutLibrary.getRecoveryWorkouts();
      reasoning.push(`TSB of ${tsb.tsb.toFixed(1)} indicates high fatigue - recovery required`);
    } else if (tsb.tsb < -10) {
      // Building phase - limit high intensity
      availableWorkouts = availableWorkouts.filter(w => w.fatigueScore <= 70);
      reasoning.push(`TSB of ${tsb.tsb.toFixed(1)} suggests limiting high intensity`);
    } else if (tsb.tsb > 5) {
      // Good form - can handle quality training
      reasoning.push(`TSB of ${tsb.tsb.toFixed(1)} indicates good form for quality training`);
    }
    
    // Filter by user preferences
    if (input.userProfile.preferredSports.length > 0) {
      const preferredWorkouts = availableWorkouts.filter(w =>
        input.userProfile.preferredSports.some(sport =>
          w.type.toLowerCase().includes(sport.toLowerCase()) ||
          w.description.toLowerCase().includes(sport.toLowerCase())
        )
      );
      
      if (preferredWorkouts.length > 0) {
        availableWorkouts = preferredWorkouts;
        reasoning.push(`Filtered to preferred sports: ${input.userProfile.preferredSports.join(', ')}`);
      }
    }
    
    // Apply fitness level adjustments
    let selectedWorkout: WorkoutType;
    
    if (availableWorkouts.length === 0) {
      // Fallback to rest if no suitable workouts
      selectedWorkout = {
        type: 'rest',
        tag: 'zone1',
        description: 'Complete rest day',
        durationMin: 0,
        fatigueScore: 0,
        recoveryImpact: 'restorative'
      };
      reasoning.push('No suitable workouts found - defaulting to rest');
    } else {
      // Select random workout from filtered options
      selectedWorkout = availableWorkouts[Math.floor(Math.random() * availableWorkouts.length)];
      
      // Adjust for fitness level
      const fitnessAdjusted = WorkoutLibrary.adjustWorkoutForFitnessLevel(
        selectedWorkout,
        input.userProfile.fitnessLevel
      );
      
      if (fitnessAdjusted.durationMin !== selectedWorkout.durationMin) {
        modifications.push({
          type: 'duration',
          originalValue: selectedWorkout.durationMin,
          modifiedValue: fitnessAdjusted.durationMin,
          reason: `Adjusted for ${input.userProfile.fitnessLevel} fitness level`
        });
      }
      
      selectedWorkout = fitnessAdjusted;
      reasoning.push(`Selected ${selectedWorkout.type} workout based on current training status`);
    }
    
    return {
      recommendedWorkout: selectedWorkout,
      confidence: 0, // Will be calculated later
      reasoning,
      alternatives: [],
      modifications
    };
  }
  
  /**
   * Apply contextual modifications based on weather, schedule, etc.
   */
  private static applyContextualModifications(
    baseRecommendation: WorkoutRecommendation,
    input: AIRecommendationInput,
    tsb: any,
    recovery: any
  ): WorkoutRecommendation {
    const modified = { ...baseRecommendation };
    let workout = { ...baseRecommendation.recommendedWorkout };
    
    // Weather-based modifications
    if (input.weatherData && !input.weatherData.isOutdoorFriendly) {
      if (workout.type === 'run' || workout.type === 'bike') {
        // Suggest indoor alternatives
        modified.weatherConsideration = `Weather conditions (${input.weatherData.conditions}) suggest indoor training`;
        
        // Potentially reduce duration for indoor training
        if (workout.durationMin > 45) {
          const originalDuration = workout.durationMin;
          workout.durationMin = Math.max(30, workout.durationMin * 0.8);
          
          modified.modifications.push({
            type: 'duration',
            originalValue: originalDuration,
            modifiedValue: workout.durationMin,
            reason: 'Reduced duration for indoor training'
          });
        }
        
        // Modify description for indoor
        workout.description = workout.description.replace(/outdoor|outside/gi, 'indoor');
        if (!workout.description.includes('indoor')) {
          workout.description = `Indoor ${workout.description.toLowerCase()}`;
        }
      }
    }
    
    // Time-based modifications (if user has time preferences)
    const tomorrow = new Date(input.currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tomorrow.getDay()];
    
    const timePreference = input.userProfile.preferredWorkoutTimes?.find(p => p.dayOfWeek === dayOfWeek);
    if (timePreference && timePreference.duration !== workout.durationMin) {
      const timeDifference = Math.abs(timePreference.duration - workout.durationMin);
      
      if (timeDifference > 15) {
        // Adjust duration to better fit time preference
        const originalDuration = workout.durationMin;
        workout.durationMin = Math.min(
          timePreference.duration,
          originalDuration * 1.2 // Don't exceed 120% of original
        );
        
        modified.modifications.push({
          type: 'duration',
          originalValue: originalDuration,
          modifiedValue: workout.durationMin,
          reason: `Adjusted to fit ${dayOfWeek} time preference (${timePreference.duration} min)`
        });
      }
    }
    
    // Recovery-based intensity modifications
    if (recovery.overallStatus === 'poor' && workout.fatigueScore > 30) {
      // Reduce intensity for poor recovery
      const originalFatigue = workout.fatigueScore;
      workout.fatigueScore = Math.max(10, workout.fatigueScore * 0.6);
      
      // Update description to reflect easier effort
      if (workout.description.includes('hard') || workout.description.includes('intense')) {
        workout.description = workout.description
          .replace(/hard|intense/gi, 'easy')
          .replace(/threshold|intervals/gi, 'conversational pace');
      }
      
      modified.modifications.push({
        type: 'intensity',
        originalValue: originalFatigue,
        modifiedValue: workout.fatigueScore,
        reason: 'Reduced intensity due to poor recovery status'
      });
      
      modified.recoveryAdjustment = 'Intensity reduced to support recovery';
    }
    
    modified.recommendedWorkout = workout;
    return modified;
  }
  
  /**
   * Generate alternative workout suggestions
   */
  private static generateAlternatives(
    primaryWorkout: WorkoutType,
    input: AIRecommendationInput,
    tsb: any
  ): WorkoutType[] {
    const alternatives: WorkoutType[] = [];
    
    // Alternative 1: Different sport, similar intensity
    const sameIntensityWorkouts = WORKOUT_LIBRARY.filter(w =>
      w.type !== primaryWorkout.type &&
      Math.abs(w.fatigueScore - primaryWorkout.fatigueScore) <= 10
    );
    
    if (sameIntensityWorkouts.length > 0) {
      const alternative = WorkoutLibrary.adjustWorkoutForFitnessLevel(
        sameIntensityWorkouts[Math.floor(Math.random() * sameIntensityWorkouts.length)],
        input.userProfile.fitnessLevel
      );
      alternatives.push(alternative);
    }
    
    // Alternative 2: Same sport, different intensity
    const sameSportWorkouts = WORKOUT_LIBRARY.filter(w =>
      w.type === primaryWorkout.type &&
      w.tag !== primaryWorkout.tag
    );
    
    if (sameSportWorkouts.length > 0) {
      const alternative = WorkoutLibrary.adjustWorkoutForFitnessLevel(
        sameSportWorkouts[Math.floor(Math.random() * sameSportWorkouts.length)],
        input.userProfile.fitnessLevel
      );
      alternatives.push(alternative);
    }
    
    // Alternative 3: Recovery/mobility option (always provide)
    const recoveryOptions = WorkoutLibrary.getRecoveryWorkouts();
    if (recoveryOptions.length > 0 && !alternatives.some(a => a.recoveryImpact === 'restorative')) {
      alternatives.push(recoveryOptions[0]);
    }
    
    return alternatives.slice(0, this.MAX_ALTERNATIVES);
  }
  
  /**
   * Calculate confidence score for the recommendation
   */
  private static calculateConfidence(
    input: AIRecommendationInput,
    tsbResult: any,
    recovery: any
  ): number {
    let confidence = 100;
    
    // Reduce confidence for poor data quality
    if (tsbResult.dataQuality === 'poor') confidence -= 30;
    else if (tsbResult.dataQuality === 'fair') confidence -= 15;
    
    // Reduce confidence if no recent recovery data
    if (input.recoveryMetrics.length === 0) confidence -= 20;
    else if (input.recoveryMetrics.length < 3) confidence -= 10;
    
    // Reduce confidence for conflicting signals
    if (tsbResult.value.tsb > 0 && recovery.recommendation === 'rest') {
      confidence -= 15; // TSB suggests ready but recovery says rest
    }
    
    // Reduce confidence if very limited training history
    if (input.recentActivities.length < 5) confidence -= 20;
    else if (input.recentActivities.length < 10) confidence -= 10;
    
    // Boost confidence for consistent signals
    if (tsbResult.value.interpretation.optimalTrainingWindow && 
        recovery.recommendation === 'full-training') {
      confidence += 10;
    }
    
    return Math.max(30, Math.min(100, confidence));
  }
  
  /**
   * Get workout recommendation for specific date (batch processing)
   */
  static async getWorkoutForDate(
    input: AIRecommendationInput,
    targetDate: string
  ): Promise<RecommendationResponse> {
    const modifiedInput = { ...input, currentDate: targetDate };
    return this.recommendTomorrowWorkout(modifiedInput);
  }
  
  /**
   * Get multiple workout recommendations for a date range
   */
  static async getWorkoutPlan(
    input: AIRecommendationInput,
    startDate: string,
    days: number
  ): Promise<Array<{
    date: string;
    recommendation: RecommendationResponse;
  }>> {
    const results: Array<{ date: string; recommendation: RecommendationResponse }> = [];
    
    for (let i = 0; i < days; i++) {
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const recommendation = await this.getWorkoutForDate(input, dateStr);
      results.push({
        date: dateStr,
        recommendation
      });
      
      // If recommendation succeeded, add it to the recent activities for subsequent days
      if (recommendation.success && recommendation.data) {
        const simulatedActivity: ActivityMetrics = {
          date: dateStr,
          sport: recommendation.data.recommendedWorkout.type,
          duration: recommendation.data.recommendedWorkout.durationMin,
          distance: 0,
          trainingLoad: recommendation.data.recommendedWorkout.fatigueScore * 2, // Rough estimation
          zone1Minutes: 0,
          zone2Minutes: 0,
          zone3Minutes: 0,
          zone4Minutes: 0,
          zone5Minutes: 0
        };
        
        input.recentActivities.push(simulatedActivity);
      }
    }
    
    return results;
  }
}