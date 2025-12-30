// AI-powered dynamic training plan adjustment system

import { TrainingPlan, WorkoutType } from '@/core/models';
import {
  PlanAdjustmentRequest,
  PlanAdjustmentResult,
  PlanModification,
  AdjustmentImpact,
  AlternativePlan,
  PlanConstraints,
  PreservationPriority,
  AdjustmentResponse,
  UserTrainingProfile
} from './aiTypes';
import { AIUtils } from './aiUtils';
import { WORKOUT_LIBRARY, WorkoutLibrary } from '../config/workouts';
import { PlanGenerator } from '../services/PlanGenerator';

export class PlanAdjuster {
  private static readonly MAX_ALTERNATIVES = 3;
  private static readonly MIN_CONFIDENCE_THRESHOLD = 60;
  
  /**
   * Adjust training plan based on missed workouts, illness, or schedule changes
   */
  static async adjustPlan(
    userId: string,
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): Promise<AdjustmentResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      // Validate the adjustment request
      const validation = this.validateAdjustmentRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          warnings,
          context: AIUtils.createDecisionContext(userId, 'plan-adjustment', request),
          processingTime: Date.now() - startTime
        };
      }
      
      // Analyze the impact of the requested changes
      const impactAnalysis = this.analyzeImpact(request);
      
      // Generate the primary adjusted plan
      const primaryAdjustment = this.generatePrimaryAdjustment(request, userProfile);
      
      // Generate alternative approaches
      const alternatives = this.generateAlternativePlans(request, userProfile, primaryAdjustment);
      
      // Calculate confidence in the adjustment
      const confidence = this.calculateAdjustmentConfidence(request, primaryAdjustment);
      
      // Add warnings based on the adjustment
      this.addAdjustmentWarnings(request, primaryAdjustment, impactAnalysis, warnings);
      
      const result: PlanAdjustmentResult = {
        success: true,
        adjustedPlan: primaryAdjustment.plan,
        modifications: primaryAdjustment.modifications,
        impactAssessment: impactAnalysis,
        alternatives,
        warnings: primaryAdjustment.warnings,
        confidence
      };
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result,
        warnings,
        context: AIUtils.createDecisionContext(
          userId,
          'plan-adjustment',
          request,
          ['impact-analysis', 'plan-generation', 'alternative-generation'],
          {
            adjustmentReason: request.adjustmentReason,
            affectedDatesCount: request.affectedDates.length,
            confidence
          }
        ),
        processingTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Plan adjustment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings,
        context: AIUtils.createDecisionContext(userId, 'plan-adjustment', request),
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Validate the adjustment request
   */
  private static validateAdjustmentRequest(request: PlanAdjustmentRequest): { valid: boolean; error?: string } {
    if (!request.originalPlan || request.originalPlan.length === 0) {
      return { valid: false, error: 'Original plan is required and cannot be empty' };
    }
    
    if (!request.affectedDates || request.affectedDates.length === 0) {
      return { valid: false, error: 'Affected dates must be specified' };
    }
    
    if (!request.adjustmentReason) {
      return { valid: false, error: 'Adjustment reason is required' };
    }
    
    // Validate that affected dates exist in the original plan
    const planDates = new Set(request.originalPlan.map(p => p.date));
    const invalidDates = request.affectedDates.filter(date => !planDates.has(date));
    
    if (invalidDates.length > 0) {
      return { valid: false, error: `Affected dates not found in plan: ${invalidDates.join(', ')}` };
    }
    
    return { valid: true };
  }
  
  /**
   * Analyze the impact of the requested changes
   */
  private static analyzeImpact(request: PlanAdjustmentRequest): AdjustmentImpact {
    const originalPlan = request.originalPlan;
    const affectedWorkouts = originalPlan.filter(w => request.affectedDates.includes(w.date));
    
    // Calculate volume and intensity changes
    const affectedVolume = affectedWorkouts.reduce((sum, w) => sum + w.durationMin, 0);
    const totalVolume = originalPlan.reduce((sum, w) => sum + w.durationMin, 0);
    const volumeChange = totalVolume > 0 ? -(affectedVolume / totalVolume) * 100 : 0;
    
    const affectedIntensity = affectedWorkouts.reduce((sum, w) => sum + w.expectedFatigue, 0) / affectedWorkouts.length;
    const avgIntensity = originalPlan.reduce((sum, w) => sum + w.expectedFatigue, 0) / originalPlan.length;
    const intensityChange = avgIntensity > 0 ? ((affectedIntensity - avgIntensity) / avgIntensity) * 100 : 0;
    
    // Count rest day changes
    const affectedRestDays = affectedWorkouts.filter(w => w.expectedFatigue <= 10).length;
    
    // Analyze sport balance changes
    const sportBalance: { [sport: string]: number } = {};
    affectedWorkouts.forEach(workout => {
      const sport = workout.workoutType;
      sportBalance[sport] = (sportBalance[sport] || 0) + 1;
    });
    
    // Determine periodization impact
    let periodizationImpact: AdjustmentImpact['periodizationImpact'] = 'maintained';
    
    if (affectedWorkouts.length > originalPlan.length * 0.3) {
      periodizationImpact = 'significantly-altered';
    } else if (affectedWorkouts.some(w => w.expectedFatigue > 70)) {
      periodizationImpact = 'slightly-altered';
    }
    
    return {
      volumeChange,
      intensityChange: -Math.abs(intensityChange), // Negative because we're losing workouts
      restDaysChange: -affectedRestDays,
      sportBalanceChange: Object.fromEntries(
        Object.entries(sportBalance).map(([sport, count]) => [sport, -count])
      ),
      periodizationImpact
    };
  }
  
  /**
   * Generate the primary adjusted plan
   */
  private static generatePrimaryAdjustment(
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): {
    plan: TrainingPlan[];
    modifications: PlanModification[];
    warnings: string[];
  } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    let adjustedPlan = [...request.originalPlan];
    
    // Remove or modify affected workouts
    const affectedWorkouts = adjustedPlan.filter(w => request.affectedDates.includes(w.date));
    
    // Strategy based on adjustment reason
    switch (request.adjustmentReason) {
      case 'missed-workout':
        return this.handleMissedWorkouts(adjustedPlan, affectedWorkouts, request, userProfile);
        
      case 'illness':
      case 'injury':
        return this.handleIllnessInjury(adjustedPlan, affectedWorkouts, request, userProfile);
        
      case 'schedule-change':
        return this.handleScheduleChange(adjustedPlan, affectedWorkouts, request, userProfile);
        
      case 'performance-plateau':
        return this.handlePerformancePlateau(adjustedPlan, affectedWorkouts, request, userProfile);
        
      case 'overreaching':
        return this.handleOverreaching(adjustedPlan, affectedWorkouts, request, userProfile);
        
      default:
        return this.handleGenericAdjustment(adjustedPlan, affectedWorkouts, request, userProfile);
    }
  }
  
  /**
   * Handle missed workout adjustments
   */
  private static handleMissedWorkouts(
    plan: TrainingPlan[],
    affectedWorkouts: TrainingPlan[],
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): { plan: TrainingPlan[]; modifications: PlanModification[]; warnings: string[] } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    const adjustedPlan = [...plan];
    
    // Mark missed workouts as cancelled
    affectedWorkouts.forEach(workout => {
      modifications.push({
        date: workout.date,
        action: 'cancelled',
        originalWorkout: workout,
        reason: 'Workout was missed'
      });
    });
    
    // Try to reschedule important workouts
    const highIntensityMissed = affectedWorkouts.filter(w => w.expectedFatigue > 70);
    
    if (highIntensityMissed.length > 0) {
      const rescheduleResult = this.rescheduleWorkouts(
        adjustedPlan,
        highIntensityMissed,
        request.constraints
      );
      
      modifications.push(...rescheduleResult.modifications);
      warnings.push(...rescheduleResult.warnings);
      rescheduleResult.modifiedPlan.forEach((workout, index) => {
        adjustedPlan[index] = workout;
      });
    }
    
    // If too many workouts missed, compress remaining plan
    if (affectedWorkouts.length > 2) {
      warnings.push('Multiple workouts missed - consider extending plan duration or reducing weekly volume');
      
      const compressionResult = this.compressPlan(adjustedPlan, request.constraints);
      modifications.push(...compressionResult.modifications);
      warnings.push(...compressionResult.warnings);
    }
    
    return { plan: adjustedPlan, modifications, warnings };
  }
  
  /**
   * Handle illness/injury adjustments
   */
  private static handleIllnessInjury(
    plan: TrainingPlan[],
    affectedWorkouts: TrainingPlan[],
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): { plan: TrainingPlan[]; modifications: PlanModification[]; warnings: string[] } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    const adjustedPlan = [...plan];
    
    // Replace all affected workouts with rest or very light activity
    affectedWorkouts.forEach(workout => {
      const restWorkout: TrainingPlan = {
        date: workout.date,
        workoutType: 'rest',
        description: request.adjustmentReason === 'illness' ? 
          'Rest day due to illness' : 
          'Rest day due to injury',
        expectedFatigue: 0,
        durationMin: 0,
        completed: false
      };
      
      const workoutIndex = adjustedPlan.findIndex(w => w.date === workout.date);
      if (workoutIndex >= 0) {
        adjustedPlan[workoutIndex] = restWorkout;
        
        modifications.push({
          date: workout.date,
          action: 'modified',
          originalWorkout: workout,
          newWorkout: restWorkout,
          reason: `Changed to rest due to ${request.adjustmentReason}`
        });
      }
    });
    
    // Add gradual return to training
    const returnToTrainingResult = this.planGradualReturn(
      adjustedPlan,
      request.affectedDates,
      request.constraints
    );
    
    modifications.push(...returnToTrainingResult.modifications);
    warnings.push(...returnToTrainingResult.warnings);
    warnings.push('Gradual return to training planned - listen to your body and progress conservatively');
    
    return { plan: adjustedPlan, modifications, warnings };
  }
  
  /**
   * Handle schedule change adjustments
   */
  private static handleScheduleChange(
    plan: TrainingPlan[],
    affectedWorkouts: TrainingPlan[],
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): { plan: TrainingPlan[]; modifications: PlanModification[]; warnings: string[] } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    const adjustedPlan = [...plan];
    
    // Try to move workouts to available days
    const rescheduleResult = this.rescheduleWorkouts(
      adjustedPlan,
      affectedWorkouts,
      request.constraints
    );
    
    modifications.push(...rescheduleResult.modifications);
    warnings.push(...rescheduleResult.warnings);
    
    return { plan: adjustedPlan, modifications, warnings };
  }
  
  /**
   * Handle performance plateau adjustments
   */
  private static handlePerformancePlateau(
    plan: TrainingPlan[],
    affectedWorkouts: TrainingPlan[],
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): { plan: TrainingPlan[]; modifications: PlanModification[]; warnings: string[] } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    const adjustedPlan = [...plan];
    
    // Replace plateau workouts with varied intensity
    affectedWorkouts.forEach(workout => {
      // Find alternative workout with different stimulus
      const alternatives = WORKOUT_LIBRARY.filter(w => 
        w.type !== workout.workoutType && 
        Math.abs(w.fatigueScore - workout.expectedFatigue) <= 15
      );
      
      if (alternatives.length > 0) {
        const newWorkoutTemplate = alternatives[Math.floor(Math.random() * alternatives.length)];
        const adjustedWorkout = WorkoutLibrary.adjustWorkoutForFitnessLevel(
          newWorkoutTemplate,
          userProfile.fitnessLevel
        );
        
        const newWorkout: TrainingPlan = {
          date: workout.date,
          workoutType: adjustedWorkout.type,
          description: `${adjustedWorkout.description} (varied for progression)`,
          expectedFatigue: adjustedWorkout.fatigueScore,
          durationMin: adjustedWorkout.durationMin,
          completed: false
        };
        
        const workoutIndex = adjustedPlan.findIndex(w => w.date === workout.date);
        if (workoutIndex >= 0) {
          adjustedPlan[workoutIndex] = newWorkout;
          
          modifications.push({
            date: workout.date,
            action: 'modified',
            originalWorkout: workout,
            newWorkout: newWorkout,
            reason: 'Varied workout type to overcome plateau'
          });
        }
      }
    });
    
    warnings.push('Training variety increased to stimulate adaptation and overcome plateau');
    
    return { plan: adjustedPlan, modifications, warnings };
  }
  
  /**
   * Handle overreaching adjustments
   */
  private static handleOverreaching(
    plan: TrainingPlan[],
    affectedWorkouts: TrainingPlan[],
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): { plan: TrainingPlan[]; modifications: PlanModification[]; warnings: string[] } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    const adjustedPlan = [...plan];
    
    // Reduce intensity of all affected workouts
    affectedWorkouts.forEach(workout => {
      if (workout.expectedFatigue > 30) {
        // Replace high-intensity with recovery
        const recoveryWorkouts = WorkoutLibrary.getRecoveryWorkouts();
        const recoveryWorkout = recoveryWorkouts[0] || {
          type: 'rest',
          tag: 'zone1',
          description: 'Recovery day',
          durationMin: 0,
          fatigueScore: 0,
          recoveryImpact: 'restorative'
        };
        
        const newWorkout: TrainingPlan = {
          date: workout.date,
          workoutType: recoveryWorkout.type,
          description: `${recoveryWorkout.description} (overreaching recovery)`,
          expectedFatigue: recoveryWorkout.fatigueScore,
          durationMin: recoveryWorkout.durationMin,
          completed: false
        };
        
        const workoutIndex = adjustedPlan.findIndex(w => w.date === workout.date);
        if (workoutIndex >= 0) {
          adjustedPlan[workoutIndex] = newWorkout;
          
          modifications.push({
            date: workout.date,
            action: 'modified',
            originalWorkout: workout,
            newWorkout: newWorkout,
            reason: 'Reduced to recovery due to overreaching'
          });
        }
      }
    });
    
    warnings.push('Training load significantly reduced to address overreaching - prioritize recovery');
    warnings.push('Monitor recovery metrics closely and gradually return to normal training');
    
    return { plan: adjustedPlan, modifications, warnings };
  }
  
  /**
   * Handle generic adjustments
   */
  private static handleGenericAdjustment(
    plan: TrainingPlan[],
    affectedWorkouts: TrainingPlan[],
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): { plan: TrainingPlan[]; modifications: PlanModification[]; warnings: string[] } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    const adjustedPlan = [...plan];
    
    // Simply remove affected workouts
    affectedWorkouts.forEach(workout => {
      modifications.push({
        date: workout.date,
        action: 'cancelled',
        originalWorkout: workout,
        reason: 'Generic adjustment request'
      });
    });
    
    warnings.push('Workouts removed as requested - consider redistributing training load');
    
    return { plan: adjustedPlan, modifications, warnings };
  }
  
  /**
   * Attempt to reschedule workouts to available days
   */
  private static rescheduleWorkouts(
    plan: TrainingPlan[],
    workoutsToReschedule: TrainingPlan[],
    constraints: PlanConstraints
  ): {
    modifiedPlan: TrainingPlan[];
    modifications: PlanModification[];
    warnings: string[];
  } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    const modifiedPlan = [...plan];
    
    // Find available days within the plan period
    const planDates = new Set(plan.map(p => p.date));
    const availableDays = constraints.availableDays || [];
    
    workoutsToReschedule.forEach(workout => {
      // Try to find a suitable day to move the workout
      const potentialDates = availableDays.filter(day => {
        // Check if day is within plan period and not already scheduled
        return planDates.has(day) && !plan.some(p => p.date === day && p.expectedFatigue > 10);
      });
      
      if (potentialDates.length > 0) {
        const newDate = potentialDates[0]; // Take first available
        const newWorkout: TrainingPlan = {
          ...workout,
          date: newDate,
          description: `${workout.description} (rescheduled)`
        };
        
        // Add to plan
        const existingIndex = modifiedPlan.findIndex(p => p.date === newDate);
        if (existingIndex >= 0) {
          modifiedPlan[existingIndex] = newWorkout;
        } else {
          modifiedPlan.push(newWorkout);
        }
        
        modifications.push({
          date: workout.date,
          action: 'moved',
          originalWorkout: workout,
          newWorkout: newWorkout,
          reason: `Rescheduled from ${workout.date} to ${newDate}`
        });
      } else {
        warnings.push(`Could not reschedule ${workout.workoutType} workout from ${workout.date}`);
      }
    });
    
    return { modifiedPlan, modifications, warnings };
  }
  
  /**
   * Compress plan by combining or intensifying remaining workouts
   */
  private static compressPlan(
    plan: TrainingPlan[],
    constraints: PlanConstraints
  ): {
    modifications: PlanModification[];
    warnings: string[];
  } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    
    // This is a simplified compression - in practice you'd implement more sophisticated logic
    warnings.push('Plan compression not fully implemented - manual review recommended');
    
    return { modifications, warnings };
  }
  
  /**
   * Plan gradual return to training after illness/injury
   */
  private static planGradualReturn(
    plan: TrainingPlan[],
    affectedDates: string[],
    constraints: PlanConstraints
  ): {
    modifications: PlanModification[];
    warnings: string[];
  } {
    const modifications: PlanModification[] = [];
    const warnings: string[] = [];
    
    // Find dates after the affected period for gradual return
    const lastAffectedDate = new Date(Math.max(...affectedDates.map(d => new Date(d).getTime())));
    const returnDates = plan
      .filter(p => new Date(p.date) > lastAffectedDate)
      .slice(0, 3) // First 3 workouts after return
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    returnDates.forEach((workout, index) => {
      const intensityMultiplier = 0.5 + (index * 0.2); // 50%, 70%, 90% intensity
      const originalFatigue = workout.expectedFatigue;
      const reducedFatigue = Math.max(10, originalFatigue * intensityMultiplier);
      const reducedDuration = Math.max(15, workout.durationMin * intensityMultiplier);
      
      const modifiedWorkout: TrainingPlan = {
        ...workout,
        description: `${workout.description} (gradual return - ${Math.round(intensityMultiplier * 100)}%)`,
        expectedFatigue: reducedFatigue,
        durationMin: reducedDuration
      };
      
      modifications.push({
        date: workout.date,
        action: 'modified',
        originalWorkout: workout,
        newWorkout: modifiedWorkout,
        reason: `Reduced intensity for gradual return (${Math.round(intensityMultiplier * 100)}%)`
      });
    });
    
    if (returnDates.length > 0) {
      warnings.push('First 3 workouts after return have reduced intensity for gradual progression');
    }
    
    return { modifications, warnings };
  }
  
  /**
   * Generate alternative plan approaches
   */
  private static generateAlternativePlans(
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile,
    primaryAdjustment: any
  ): AlternativePlan[] {
    const alternatives: AlternativePlan[] = [];
    
    // Alternative 1: Conservative approach
    alternatives.push({
      name: 'Conservative Adjustment',
      description: 'Minimal changes with focus on maintaining consistency',
      plan: this.generateConservativeAlternative(request, userProfile),
      tradeoffs: ['Lower training stress', 'May slow progress slightly'],
      score: 75
    });
    
    // Alternative 2: Aggressive compensation
    alternatives.push({
      name: 'Aggressive Compensation',
      description: 'Redistribute training load to maintain weekly volume',
      plan: this.generateAggressiveAlternative(request, userProfile),
      tradeoffs: ['Higher training stress on remaining days', 'Risk of overreaching'],
      score: 60
    });
    
    return alternatives.slice(0, this.MAX_ALTERNATIVES);
  }
  
  /**
   * Generate conservative alternative plan
   */
  private static generateConservativeAlternative(
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): TrainingPlan[] {
    const plan = [...request.originalPlan];
    
    // Simply remove affected workouts without replacement
    return plan.filter(workout => !request.affectedDates.includes(workout.date));
  }
  
  /**
   * Generate aggressive alternative plan
   */
  private static generateAggressiveAlternative(
    request: PlanAdjustmentRequest,
    userProfile: UserTrainingProfile
  ): TrainingPlan[] {
    const plan = [...request.originalPlan];
    const affectedWorkouts = plan.filter(w => request.affectedDates.includes(w.date));
    
    // Calculate lost training load
    const lostLoad = affectedWorkouts.reduce((sum, w) => sum + w.expectedFatigue, 0);
    const remainingWorkouts = plan.filter(w => !request.affectedDates.includes(w.date));
    
    // Distribute extra load across remaining workouts
    const extraLoadPerWorkout = lostLoad / remainingWorkouts.length;
    
    return remainingWorkouts.map(workout => ({
      ...workout,
      expectedFatigue: Math.min(100, workout.expectedFatigue + extraLoadPerWorkout),
      description: `${workout.description} (compensated load)`
    }));
  }
  
  /**
   * Calculate confidence in the adjustment
   */
  private static calculateAdjustmentConfidence(
    request: PlanAdjustmentRequest,
    adjustment: any
  ): number {
    let confidence = 80; // Start with high confidence
    
    // Reduce confidence for complex adjustments
    if (request.affectedDates.length > 3) confidence -= 15;
    if (request.adjustmentReason === 'performance-plateau') confidence -= 10;
    
    // Reduce confidence if constraints are restrictive
    if (request.constraints.maxDailyDuration && request.constraints.maxDailyDuration < 60) {
      confidence -= 10;
    }
    
    // Boost confidence for simple adjustments
    if (request.adjustmentReason === 'schedule-change') confidence += 5;
    if (request.affectedDates.length === 1) confidence += 5;
    
    return Math.max(30, Math.min(95, confidence));
  }
  
  /**
   * Add warnings based on the adjustment
   */
  private static addAdjustmentWarnings(
    request: PlanAdjustmentRequest,
    adjustment: any,
    impact: AdjustmentImpact,
    warnings: string[]
  ): void {
    if (Math.abs(impact.volumeChange) > 20) {
      warnings.push(`Significant volume change (${impact.volumeChange.toFixed(1)}%) - monitor training response`);
    }
    
    if (impact.periodizationImpact === 'significantly-altered') {
      warnings.push('Periodization structure significantly altered - consider plan revision');
    }
    
    if (request.affectedDates.length > request.originalPlan.length * 0.4) {
      warnings.push('Large portion of plan affected - consider regenerating entire plan');
    }
  }
  
  /**
   * Quick plan adjustment for single workout changes
   */
  static async quickAdjustWorkout(
    originalWorkout: TrainingPlan,
    reason: 'missed' | 'illness' | 'schedule',
    newDate?: string
  ): Promise<{
    success: boolean;
    adjustedWorkout?: TrainingPlan;
    action: 'cancelled' | 'moved' | 'modified';
    reason: string;
  }> {
    try {
      switch (reason) {
        case 'missed':
          return {
            success: true,
            action: 'cancelled',
            reason: 'Workout was missed and marked as cancelled'
          };
          
        case 'illness':
          const restWorkout: TrainingPlan = {
            ...originalWorkout,
            workoutType: 'rest',
            description: 'Rest day due to illness',
            expectedFatigue: 0,
            durationMin: 0
          };
          
          return {
            success: true,
            adjustedWorkout: restWorkout,
            action: 'modified',
            reason: 'Replaced with rest day due to illness'
          };
          
        case 'schedule':
          if (newDate) {
            const movedWorkout: TrainingPlan = {
              ...originalWorkout,
              date: newDate,
              description: `${originalWorkout.description} (rescheduled)`
            };
            
            return {
              success: true,
              adjustedWorkout: movedWorkout,
              action: 'moved',
              reason: `Rescheduled from ${originalWorkout.date} to ${newDate}`
            };
          } else {
            return {
              success: false,
              action: 'cancelled',
              reason: 'New date required for schedule change'
            };
          }
          
        default:
          return {
            success: false,
            action: 'cancelled',
            reason: 'Unknown adjustment reason'
          };
      }
    } catch (error) {
      return {
        success: false,
        action: 'cancelled',
        reason: `Adjustment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}