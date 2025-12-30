// AI utility functions and shared calculations for training analysis

import { ActivityMetrics, FirebaseRecoveryMetrics } from '@/core/models';
import { 
  TrainingStressBalance, 
  TSBInterpretation, 
  LoadTrend,
  CalculationResult,
  FatigueIndicator,
  AIDecisionContext
} from './aiTypes';
// import { HRZoneCalculator, DEFAULT_TRAINING_CONFIG } from '../config/training';

export class AIUtils {
  
  /**
   * Calculate Training Stress Balance (TSB) using TRIMP-based approach
   */
  static calculateTSB(
    activities: ActivityMetrics[], 
    targetDate: Date = new Date()
  ): CalculationResult<TrainingStressBalance> {
    // const startTime = Date.now(); // Unused for now
    
    // Sort activities by date
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Filter activities within relevant timeframes
    const targetTime = targetDate.getTime();
    const sevenDaysAgo = targetTime - (7 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = targetTime - (28 * 24 * 60 * 60 * 1000);
    
    const last7Days = sortedActivities.filter(a => {
      const activityTime = new Date(a.date).getTime();
      return activityTime >= sevenDaysAgo && activityTime <= targetTime;
    });
    
    const last28Days = sortedActivities.filter(a => {
      const activityTime = new Date(a.date).getTime();
      return activityTime >= twentyEightDaysAgo && activityTime <= targetTime;
    });
    
    // Calculate Acute Training Load (ATL) - 7 day exponentially weighted average
    const acuteLoad = this.calculateExponentialAverage(last7Days, 7);
    
    // Calculate Chronic Training Load (CTL) - 28 day exponentially weighted average  
    const chronicLoad = this.calculateExponentialAverage(last28Days, 28);
    
    // Training Stress Balance
    const tsb = chronicLoad - acuteLoad;
    
    // Fitness and Fatigue scores (normalized 0-100)
    const fitness = Math.min(100, chronicLoad / 5); // Normalize CTL to 0-100
    const fatigue = Math.min(100, acuteLoad / 3);   // Normalize ATL to 0-100
    const form = Math.max(0, Math.min(100, 50 + (tsb / 2))); // Normalize TSB to 0-100
    
    // Interpret TSB
    const interpretation = this.interpretTSB(tsb, acuteLoad, chronicLoad);
    
    // Analyze trends
    const trend = this.analyzeTSBTrends(sortedActivities, targetDate);
    
    const factors = [
      `${last7Days.length} activities in last 7 days`,
      `${last28Days.length} activities in last 28 days`,
      `ATL: ${acuteLoad.toFixed(1)}, CTL: ${chronicLoad.toFixed(1)}`
    ];
    
    // Data quality assessment
    let dataQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (last28Days.length >= 20) dataQuality = 'excellent';
    else if (last28Days.length >= 12) dataQuality = 'good';
    else if (last28Days.length >= 6) dataQuality = 'fair';
    
    const confidence = Math.min(100, (last28Days.length / 20) * 100);
    
    return {
      value: {
        acuteLoad,
        chronicLoad, 
        tsb,
        fitness,
        fatigue,
        form,
        interpretation,
        trend
      },
      confidence,
      factors,
      timestamp: new Date().toISOString(),
      dataQuality
    };
  }
  
  /**
   * Calculate exponentially weighted average for training load
   */
  private static calculateExponentialAverage(
    activities: ActivityMetrics[], 
    days: number
  ): number {
    if (activities.length === 0) return 0;
    
    const timeConstant = days / Math.log(2); // Half-life decay
    const now = new Date().getTime();
    
    let weightedSum = 0;
    let weightSum = 0;
    
    activities.forEach(activity => {
      const activityTime = new Date(activity.date).getTime();
      const daysAgo = (now - activityTime) / (24 * 60 * 60 * 1000);
      const weight = Math.exp(-daysAgo / timeConstant);
      
      weightedSum += activity.trainingLoad * weight;
      weightSum += weight;
    });
    
    return weightSum > 0 ? weightedSum / weightSum : 0;
  }
  
  /**
   * Interpret Training Stress Balance values
   */
  private static interpretTSB(
    tsb: number, 
    acuteLoad: number, 
    chronicLoad: number
  ): TSBInterpretation {
    let status: TSBInterpretation['status'];
    let description: string;
    let recommendation: string;
    let optimalTrainingWindow: boolean;
    
    if (tsb > 25) {
      status = 'peak-form';
      description = 'Excellent form - low fatigue, high fitness';
      recommendation = 'Great time for key workouts or competition';
      optimalTrainingWindow = true;
    } else if (tsb > 5) {
      status = 'good-form';
      description = 'Good form - ready for quality training';
      recommendation = 'Ideal for moderate to high intensity sessions';
      optimalTrainingWindow = true;
    } else if (tsb > -10) {
      status = 'neutral';
      description = 'Balanced training stress';
      recommendation = 'Continue current training approach';
      optimalTrainingWindow = false;
    } else if (tsb > -30) {
      status = 'building';
      description = 'Building fitness - some accumulated fatigue';
      recommendation = 'Focus on aerobic base, limit high intensity';
      optimalTrainingWindow = false;
    } else if (tsb > -50) {
      status = 'overreaching';
      description = 'High training stress - approaching overtraining';
      recommendation = 'Prioritize recovery, reduce training load';
      optimalTrainingWindow = false;
    } else {
      status = 'overtrained';
      description = 'Critical fatigue levels detected';
      recommendation = 'Immediate rest and recovery required';
      optimalTrainingWindow = false;
    }
    
    return {
      status,
      description,
      recommendation,
      optimalTrainingWindow
    };
  }
  
  /**
   * Analyze TSB trends over time
   */
  private static analyzeTSBTrends(
    activities: ActivityMetrics[], 
    targetDate: Date
  ): LoadTrend {
    // Calculate TSB for previous weeks to identify trends
    const tsbHistory: number[] = [];
    
    for (let weeksBack = 3; weeksBack >= 0; weeksBack--) {
      const weekDate = new Date(targetDate);
      weekDate.setDate(weekDate.getDate() - (weeksBack * 7));
      
      const weekTSB = this.calculateTSB(activities, weekDate);
      tsbHistory.push(weekTSB.value.tsb);
    }
    
    // Analyze direction of change
    const recentTrend = this.analyzeTrend(tsbHistory.slice(-3));
    const acuteDirection = recentTrend > 0.1 ? 'increasing' : 
                         recentTrend < -0.1 ? 'decreasing' : 'stable';
    
    // For chronic load, look at longer trend
    const chronicTrend = this.analyzeTrend(tsbHistory);
    const chronicDirection = chronicTrend > 0.05 ? 'increasing' : 
                           chronicTrend < -0.05 ? 'decreasing' : 'stable';
    
    // Balance direction (TSB improvement/deterioration)
    const balanceDirection = recentTrend > 0 ? 'improving' : 
                           recentTrend < 0 ? 'worsening' : 'stable';
    
    // Predict weeks to optimal TSB range (-5 to +15)
    const currentTSB = tsbHistory[tsbHistory.length - 1];
    let weeksToOptimal: number | undefined;
    
    if (currentTSB < -5) {
      // Need to reduce load to improve TSB
      const recoveryRate = Math.abs(recentTrend) || 2; // Default 2 TSB points per week
      weeksToOptimal = Math.ceil((Math.abs(currentTSB) - 5) / recoveryRate);
    } else if (currentTSB > 15) {
      // Need to increase load to reach optimal training range
      const buildRate = Math.abs(recentTrend) || 3; // Default 3 TSB points per week
      weeksToOptimal = Math.ceil((currentTSB - 15) / buildRate);
    }
    
    return {
      acuteDirection,
      chronicDirection,
      balanceDirection,
      weeksToOptimal
    };
  }
  
  /**
   * Simple linear trend analysis
   */
  private static analyzeTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const xSum = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, index) => sum + val * index, 0);
    const xSquareSum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares
    
    // Linear regression slope
    const slope = (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);
    return slope;
  }
  
  /**
   * Analyze recovery metrics for fatigue indicators
   */
  static analyzeRecoveryMetrics(
    recoveryMetrics: FirebaseRecoveryMetrics[],
    timeframeDays: number = 28
  ): FatigueIndicator[] {
    const indicators: FatigueIndicator[] = [];
    
    if (recoveryMetrics.length === 0) return indicators;
    
    // Sort by date
    const sortedMetrics = [...recoveryMetrics].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const recent = sortedMetrics.slice(-timeframeDays);
    const latest = recent[recent.length - 1];
    
    // HRV Analysis
    if (latest.hrv && recent.filter(m => m.hrv).length >= 7) {
      const hrvValues = recent.filter(m => m.hrv).map(m => m.hrv!);
      const baselineHRV = this.calculateBaseline(hrvValues);
      const currentHRV = latest.hrv;
      const percentChange = ((currentHRV - baselineHRV) / baselineHRV) * 100;
      
      let status: FatigueIndicator['status'] = 'normal';
      if (percentChange < -15) status = 'critical';
      else if (percentChange < -10) status = 'concerning';
      else if (percentChange < -5) status = 'elevated';
      
      indicators.push({
        metric: 'hrv',
        currentValue: currentHRV,
        baselineValue: baselineHRV,
        percentChange,
        status,
        description: this.getHRVDescription(status, percentChange)
      });
    }
    
    // Resting HR Analysis
    if (latest.restingHR && recent.filter(m => m.restingHR).length >= 7) {
      const rhrValues = recent.filter(m => m.restingHR).map(m => m.restingHR!);
      const baselineRHR = this.calculateBaseline(rhrValues);
      const currentRHR = latest.restingHR;
      const percentChange = ((currentRHR - baselineRHR) / baselineRHR) * 100;
      
      let status: FatigueIndicator['status'] = 'normal';
      if (percentChange > 8) status = 'critical';
      else if (percentChange > 5) status = 'concerning';
      else if (percentChange > 3) status = 'elevated';
      
      indicators.push({
        metric: 'restingHR',
        currentValue: currentRHR,
        baselineValue: baselineRHR,
        percentChange,
        status,
        description: this.getRHRDescription(status, percentChange)
      });
    }
    
    // Body Battery Analysis
    if (latest.bodyBattery && recent.filter(m => m.bodyBattery).length >= 5) {
      const bbValues = recent.filter(m => m.bodyBattery).map(m => m.bodyBattery!);
      const baselineBB = this.calculateBaseline(bbValues);
      const currentBB = latest.bodyBattery;
      const percentChange = ((currentBB - baselineBB) / baselineBB) * 100;
      
      let status: FatigueIndicator['status'] = 'normal';
      if (currentBB < 20) status = 'critical';
      else if (currentBB < 30) status = 'concerning';
      else if (currentBB < 50 || percentChange < -20) status = 'elevated';
      
      indicators.push({
        metric: 'bodyBattery',
        currentValue: currentBB,
        baselineValue: baselineBB,
        percentChange,
        status,
        description: this.getBodyBatteryDescription(status, currentBB)
      });
    }
    
    // Sleep Score Analysis
    if (latest.sleepScore && recent.filter(m => m.sleepScore).length >= 5) {
      const sleepValues = recent.filter(m => m.sleepScore).map(m => m.sleepScore!);
      const baselineSleep = this.calculateBaseline(sleepValues);
      const currentSleep = latest.sleepScore;
      const percentChange = ((currentSleep - baselineSleep) / baselineSleep) * 100;
      
      let status: FatigueIndicator['status'] = 'normal';
      if (currentSleep < 60) status = 'critical';
      else if (currentSleep < 70) status = 'concerning';
      else if (currentSleep < 80 || percentChange < -15) status = 'elevated';
      
      indicators.push({
        metric: 'sleepScore',
        currentValue: currentSleep,
        baselineValue: baselineSleep,
        percentChange,
        status,
        description: this.getSleepDescription(status, currentSleep)
      });
    }
    
    // Subjective Fatigue Analysis
    const fatigueValues = recent.map(m => m.subjectiveFatigue);
    const avgFatigue = fatigueValues.reduce((sum, val) => sum + val, 0) / fatigueValues.length;
    const currentFatigue = latest.subjectiveFatigue;
    const percentChange = ((currentFatigue - avgFatigue) / avgFatigue) * 100;
    
    let status: FatigueIndicator['status'] = 'normal';
    if (currentFatigue >= 8) status = 'critical';
    else if (currentFatigue >= 7) status = 'concerning';
    else if (currentFatigue >= 6) status = 'elevated';
    
    indicators.push({
      metric: 'subjective',
      currentValue: currentFatigue,
      baselineValue: avgFatigue,
      percentChange,
      status,
      description: this.getSubjectiveFatigueDescription(status, currentFatigue)
    });
    
    return indicators;
  }
  
  /**
   * Calculate baseline value (trimmed mean to reduce outlier influence)
   */
  private static calculateBaseline(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const trimPercent = 0.2; // Remove top and bottom 20%
    const trimCount = Math.floor(sorted.length * trimPercent);
    
    if (trimCount > 0) {
      const trimmed = sorted.slice(trimCount, -trimCount);
      return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
    }
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  /**
   * Generate AI decision context for tracking and debugging
   */
  static createDecisionContext(
    userId: string,
    operation: string,
    inputData: Record<string, any>,
    algorithms: string[] = [],
    parameters: Record<string, any> = {}
  ): AIDecisionContext {
    return {
      userId,
      timestamp: new Date().toISOString(),
      inputData,
      algorithms,
      parameters,
      version: '1.0.0' // AI system version
    };
  }
  
  /**
   * Helper methods for generating human-readable descriptions
   */
  private static getHRVDescription(status: string, percentChange: number): string {
    switch (status) {
      case 'critical': return `HRV significantly below baseline (${percentChange.toFixed(1)}%) - high stress/fatigue`;
      case 'concerning': return `HRV moderately below baseline (${percentChange.toFixed(1)}%) - increased fatigue`;
      case 'elevated': return `HRV slightly below baseline (${percentChange.toFixed(1)}%) - monitor closely`;
      default: return `HRV within normal range (${percentChange.toFixed(1)}% from baseline)`;
    }
  }
  
  private static getRHRDescription(status: string, percentChange: number): string {
    switch (status) {
      case 'critical': return `Resting HR significantly elevated (${percentChange.toFixed(1)}%) - possible overtraining`;
      case 'concerning': return `Resting HR moderately elevated (${percentChange.toFixed(1)}%) - increased fatigue`;
      case 'elevated': return `Resting HR slightly elevated (${percentChange.toFixed(1)}%) - monitor closely`;
      default: return `Resting HR within normal range (${percentChange.toFixed(1)}% from baseline)`;
    }
  }
  
  private static getBodyBatteryDescription(status: string, currentValue: number): string {
    switch (status) {
      case 'critical': return `Body battery critically low (${currentValue}) - immediate rest required`;
      case 'concerning': return `Body battery low (${currentValue}) - prioritize recovery`;
      case 'elevated': return `Body battery below optimal (${currentValue}) - light training only`;
      default: return `Body battery adequate (${currentValue}) - normal training possible`;
    }
  }
  
  private static getSleepDescription(status: string, currentValue: number): string {
    switch (status) {
      case 'critical': return `Sleep quality poor (${currentValue}) - recovery severely impacted`;
      case 'concerning': return `Sleep quality below average (${currentValue}) - recovery compromised`;
      case 'elevated': return `Sleep quality suboptimal (${currentValue}) - monitor sleep hygiene`;
      default: return `Sleep quality good (${currentValue}) - adequate recovery support`;
    }
  }
  
  private static getSubjectiveFatigueDescription(status: string, currentValue: number): string {
    switch (status) {
      case 'critical': return `Very high subjective fatigue (${currentValue}/10) - rest day recommended`;
      case 'concerning': return `High subjective fatigue (${currentValue}/10) - easy training only`;
      case 'elevated': return `Moderate subjective fatigue (${currentValue}/10) - reduce intensity`;
      default: return `Low subjective fatigue (${currentValue}/10) - normal training capacity`;
    }
  }
  
  /**
   * Statistical utility functions
   */
  static calculateStatistics(values: number[]): {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, std: 0, min: 0, max: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    
    return {
      mean,
      median,
      std,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }
}