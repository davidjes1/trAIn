// AI-powered fatigue monitoring and overtraining detection system

import { ActivityMetrics } from '../types/training-metrics.types';
import { FirebaseRecoveryMetrics } from '../types/firebase.types';
import {
  FatigueAssessment,
  FatigueIndicator,
  FatigueTrend,
  FatigueResponse,
  UserTrainingProfile,
  TrainingStressBalance
} from './aiTypes';
import { AIUtils } from './aiUtils';

export class FatigueMonitor {
  private static readonly OVERTRAINING_THRESHOLD = -40; // TSB threshold
  private static readonly CRITICAL_FATIGUE_THRESHOLD = 85; // Overall fatigue score
  private static readonly MIN_DATA_POINTS = 7; // Minimum days of data for reliable assessment
  
  /**
   * Comprehensive fatigue assessment combining multiple metrics
   */
  static async assessFatigue(
    userId: string,
    recentActivities: ActivityMetrics[],
    recoveryMetrics: FirebaseRecoveryMetrics[],
    userProfile: UserTrainingProfile
  ): Promise<FatigueResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      // Calculate Training Stress Balance
      const tsbResult = AIUtils.calculateTSB(recentActivities);
      
      // Analyze recovery metrics
      const recoveryIndicators = AIUtils.analyzeRecoveryMetrics(recoveryMetrics);
      
      // Analyze training load trends
      const loadIndicators = this.analyzeTrainingLoadTrends(recentActivities);
      
      // Combine all indicators
      const allIndicators = [...recoveryIndicators, ...loadIndicators];
      
      // Calculate overall fatigue assessment
      const assessment = this.calculateOverallAssessment(
        tsbResult.value,
        allIndicators,
        userProfile
      );
      
      // Analyze trends
      const trendAnalysis = this.analyzeFatigueTrends(
        recentActivities,
        recoveryMetrics,
        assessment
      );
      
      // Determine next reassessment date
      const nextReassessment = this.calculateNextReassessment(assessment, trendAnalysis);
      
      // Generate warnings based on data quality
      if (tsbResult.dataQuality === 'poor') {
        warnings.push('Limited training history - fatigue assessment may be less accurate');
      }
      
      if (recoveryMetrics.length < 7) {
        warnings.push('Insufficient recovery data - consider tracking more metrics');
      }
      
      // Add specific warnings for concerning indicators
      const criticalIndicators = allIndicators.filter(i => i.status === 'critical');
      if (criticalIndicators.length > 0) {
        warnings.push(`Critical indicators detected: ${criticalIndicators.map(i => i.metric).join(', ')}`);
      }
      
      const finalAssessment: FatigueAssessment = {
        overallStatus: assessment.status,
        riskLevel: assessment.riskLevel,
        recommendation: assessment.recommendation,
        indicators: allIndicators,
        trendAnalysis,
        nextReassessment
      };
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: finalAssessment,
        warnings,
        context: AIUtils.createDecisionContext(
          userId,
          'fatigue-assessment',
          {
            activitiesCount: recentActivities.length,
            recoveryMetricsCount: recoveryMetrics.length,
            tsbValue: tsbResult.value.tsb
          },
          ['TSB-analysis', 'recovery-analysis', 'trend-analysis'],
          {
            overallStatus: assessment.status,
            riskLevel: assessment.riskLevel
          }
        ),
        processingTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Fatigue assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings,
        context: AIUtils.createDecisionContext(userId, 'fatigue-assessment', {}),
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Analyze training load indicators for fatigue signs
   */
  private static analyzeTrainingLoadTrends(activities: ActivityMetrics[]): FatigueIndicator[] {
    const indicators: FatigueIndicator[] = [];
    
    if (activities.length < this.MIN_DATA_POINTS) {
      return indicators;
    }
    
    // Sort activities by date
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Calculate 7-day and 28-day training loads
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twentyEightDaysAgo = new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000));
    
    const last7Days = sortedActivities.filter(a => 
      new Date(a.date) >= sevenDaysAgo
    );
    const last28Days = sortedActivities.filter(a => 
      new Date(a.date) >= twentyEightDaysAgo
    );
    
    // Acute Training Load (7-day average)
    const weeklyLoad = last7Days.reduce((sum, a) => sum + a.trainingLoad, 0) / 7;
    const monthlyLoad = last28Days.reduce((sum, a) => sum + a.trainingLoad, 0) / 28;
    
    // Training Load indicator
    const percentChange = monthlyLoad > 0 ? ((weeklyLoad - monthlyLoad) / monthlyLoad) * 100 : 0;
    
    let status: FatigueIndicator['status'] = 'normal';
    if (weeklyLoad > monthlyLoad * 1.5) status = 'critical';
    else if (weeklyLoad > monthlyLoad * 1.3) status = 'concerning';
    else if (weeklyLoad > monthlyLoad * 1.1) status = 'elevated';
    
    indicators.push({
      metric: 'trainingLoad',
      currentValue: weeklyLoad,
      baselineValue: monthlyLoad,
      percentChange,
      status,
      description: this.getTrainingLoadDescription(status, percentChange, weeklyLoad)
    });
    
    return indicators;
  }
  
  /**
   * Calculate overall fatigue assessment from all indicators
   */
  private static calculateOverallAssessment(
    tsb: TrainingStressBalance,
    indicators: FatigueIndicator[],
    userProfile: UserTrainingProfile
  ): {
    status: FatigueAssessment['overallStatus'];
    riskLevel: FatigueAssessment['riskLevel'];
    recommendation: FatigueAssessment['recommendation'];
  } {
    let fatigueScore = 50; // Start with neutral
    
    // TSB contribution (30% weight)
    if (tsb.tsb < this.OVERTRAINING_THRESHOLD) {
      fatigueScore += 25; // Critical TSB
    } else if (tsb.tsb < -25) {
      fatigueScore += 15; // High fatigue TSB
    } else if (tsb.tsb < -10) {
      fatigueScore += 10; // Moderate fatigue TSB
    } else if (tsb.tsb > 10) {
      fatigueScore -= 10; // Good form TSB
    }
    
    // Indicators contribution (70% weight)
    const criticalCount = indicators.filter(i => i.status === 'critical').length;
    const concerningCount = indicators.filter(i => i.status === 'concerning').length;
    const elevatedCount = indicators.filter(i => i.status === 'elevated').length;
    
    fatigueScore += criticalCount * 15;
    fatigueScore += concerningCount * 10;
    fatigueScore += elevatedCount * 5;
    
    // Age adjustment (older athletes may need more recovery)
    if (userProfile.age > 50) {
      fatigueScore += 5;
    } else if (userProfile.age > 40) {
      fatigueScore += 3;
    }
    
    // Determine status and risk level
    let status: FatigueAssessment['overallStatus'];
    let riskLevel: FatigueAssessment['riskLevel'];
    let recommendation: FatigueAssessment['recommendation'];
    
    if (fatigueScore >= this.CRITICAL_FATIGUE_THRESHOLD) {
      status = 'overtrained';
      riskLevel = 'critical';
      recommendation = 'medical-attention';
    } else if (fatigueScore >= 70) {
      status = 'fatigued';
      riskLevel = 'high';
      recommendation = 'rest';
    } else if (fatigueScore >= 55) {
      status = 'fatigued';
      riskLevel = 'moderate';
      recommendation = 'active-recovery';
    } else if (fatigueScore >= 40) {
      status = 'normal';
      riskLevel = 'low';
      recommendation = 'full-training';
    } else {
      status = 'fresh';
      riskLevel = 'low';
      recommendation = 'full-training';
    }
    
    return { status, riskLevel, recommendation };
  }
  
  /**
   * Analyze trends in fatigue indicators over time
   */
  private static analyzeFatigueTrends(
    activities: ActivityMetrics[],
    recoveryMetrics: FirebaseRecoveryMetrics[],
    currentAssessment: any
  ): FatigueTrend {
    // Calculate trend direction based on historical assessments
    // Note: In a full implementation, you'd store historical assessments
    // For now, we'll analyze trends in the raw data
    
    const last14Days = recoveryMetrics
      .filter(m => {
        const metricDate = new Date(m.date);
        const twoWeeksAgo = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000));
        return metricDate >= twoWeeksAgo;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let direction: FatigueTrend['direction'] = 'stable';
    let durationDays = 0;
    let projectedRecovery = 0;
    let confidenceLevel = 50;
    
    if (last14Days.length >= 7) {
      // Analyze subjective fatigue trend
      const fatigueValues = last14Days.map(m => m.subjectiveFatigue);
      const firstHalf = fatigueValues.slice(0, Math.floor(fatigueValues.length / 2));
      const secondHalf = fatigueValues.slice(Math.floor(fatigueValues.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      const change = secondAvg - firstAvg;
      
      if (change < -1) {
        direction = 'improving';
        durationDays = Math.ceil(Math.abs(change) * 3); // Rough estimate
      } else if (change > 1.5) {
        direction = change > 2.5 ? 'rapidly-declining' : 'declining';
        durationDays = Math.ceil(change * 2);
      }
      
      confidenceLevel = Math.min(90, last14Days.length * 6);
      
      // Project recovery time based on current status and trend
      if (currentAssessment.status === 'overtrained') {
        projectedRecovery = direction === 'improving' ? 7 : 14;
      } else if (currentAssessment.status === 'fatigued') {
        projectedRecovery = direction === 'improving' ? 3 : 7;
      } else {
        projectedRecovery = 0;
      }
    }
    
    return {
      direction,
      durationDays,
      projectedRecovery,
      confidenceLevel
    };
  }
  
  /**
   * Calculate next reassessment date based on current status
   */
  private static calculateNextReassessment(
    assessment: any,
    trend: FatigueTrend
  ): string {
    let daysUntilNext = 7; // Default weekly
    
    switch (assessment.status) {
      case 'overtrained':
        daysUntilNext = 2; // Every 2 days for critical status
        break;
      case 'fatigued':
        daysUntilNext = trend.direction === 'improving' ? 4 : 3;
        break;
      case 'normal':
        daysUntilNext = 7;
        break;
      case 'fresh':
        daysUntilNext = 10; // Less frequent when fresh
        break;
    }
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysUntilNext);
    return nextDate.toISOString().split('T')[0];
  }
  
  /**
   * Quick fatigue check for daily training decisions
   */
  static async quickFatigueCheck(
    userId: string,
    recentActivities: ActivityMetrics[],
    latestRecovery: FirebaseRecoveryMetrics
  ): Promise<{
    canTrain: boolean;
    recommendation: 'full' | 'easy' | 'rest';
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let canTrain = true;
    let recommendation: 'full' | 'easy' | 'rest' = 'full';
    
    // Quick TSB check
    if (recentActivities.length >= 7) {
      const tsbResult = AIUtils.calculateTSB(recentActivities);
      
      if (tsbResult.value.tsb < -30) {
        canTrain = false;
        recommendation = 'rest';
        reasons.push(`Critical training stress balance (${tsbResult.value.tsb.toFixed(1)})`);
      } else if (tsbResult.value.tsb < -15) {
        recommendation = 'easy';
        reasons.push(`High training load - easy training only`);
      }
    }
    
    // Recovery metrics check
    if (latestRecovery.bodyBattery && latestRecovery.bodyBattery < 20) {
      canTrain = false;
      recommendation = 'rest';
      reasons.push('Body battery critically low');
    } else if (latestRecovery.bodyBattery && latestRecovery.bodyBattery < 40) {
      recommendation = 'easy';
      reasons.push('Low body battery');
    }
    
    if (latestRecovery.sleepScore && latestRecovery.sleepScore < 60) {
      recommendation = recommendation === 'full' ? 'easy' : recommendation;
      reasons.push('Poor sleep quality');
    }
    
    if (latestRecovery.subjectiveFatigue >= 8) {
      canTrain = false;
      recommendation = 'rest';
      reasons.push('Very high subjective fatigue');
    } else if (latestRecovery.subjectiveFatigue >= 7) {
      recommendation = 'easy';
      reasons.push('High subjective fatigue');
    }
    
    return {
      canTrain,
      recommendation,
      reasons
    };
  }
  
  /**
   * Monitor for overtraining syndrome markers
   */
  static async checkOvertrainingMarkers(
    activities: ActivityMetrics[],
    recoveryMetrics: FirebaseRecoveryMetrics[]
  ): Promise<{
    hasMarkers: boolean;
    markers: string[];
    severity: 'mild' | 'moderate' | 'severe';
  }> {
    const markers: string[] = [];
    
    if (activities.length < 14 || recoveryMetrics.length < 7) {
      return {
        hasMarkers: false,
        markers: ['Insufficient data for overtraining analysis'],
        severity: 'mild'
      };
    }
    
    // Performance decline marker
    const recentPerformance = activities.slice(-7);
    const olderPerformance = activities.slice(-21, -14);
    
    if (recentPerformance.length >= 3 && olderPerformance.length >= 3) {
      const recentAvgLoad = recentPerformance.reduce((sum, a) => sum + a.trainingLoad, 0) / recentPerformance.length;
      const olderAvgLoad = olderPerformance.reduce((sum, a) => sum + a.trainingLoad, 0) / olderPerformance.length;
      
      if (recentAvgLoad < olderAvgLoad * 0.8) {
        markers.push('Significant performance decline detected');
      }
    }
    
    // Persistent high subjective fatigue
    const recentFatigue = recoveryMetrics.slice(-7);
    const avgSubjFatigue = recentFatigue.reduce((sum, m) => sum + m.subjectiveFatigue, 0) / recentFatigue.length;
    
    if (avgSubjFatigue >= 7) {
      markers.push('Persistently high subjective fatigue');
    }
    
    // Sleep disruption
    const sleepScores = recentFatigue
      .filter(m => m.sleepScore !== undefined)
      .map(m => m.sleepScore!);
    
    if (sleepScores.length >= 5) {
      const avgSleep = sleepScores.reduce((sum, s) => sum + s, 0) / sleepScores.length;
      if (avgSleep < 65) {
        markers.push('Persistent sleep quality issues');
      }
    }
    
    // HRV suppression
    const hrvValues = recentFatigue
      .filter(m => m.hrv !== undefined)
      .map(m => m.hrv!);
    
    if (hrvValues.length >= 5) {
      const recentHRV = hrvValues.slice(-3);
      const olderHRV = hrvValues.slice(0, -3);
      
      if (recentHRV.length >= 2 && olderHRV.length >= 2) {
        const recentAvg = recentHRV.reduce((sum, h) => sum + h, 0) / recentHRV.length;
        const olderAvg = olderHRV.reduce((sum, h) => sum + h, 0) / olderHRV.length;
        
        if (recentAvg < olderAvg * 0.85) {
          markers.push('HRV significantly suppressed');
        }
      }
    }
    
    // Determine severity
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (markers.length >= 3) severity = 'severe';
    else if (markers.length >= 2) severity = 'moderate';
    
    return {
      hasMarkers: markers.length > 0,
      markers,
      severity
    };
  }
  
  /**
   * Helper method to generate training load description
   */
  private static getTrainingLoadDescription(
    status: string,
    percentChange: number,
    currentLoad: number
  ): string {
    switch (status) {
      case 'critical':
        return `Training load extremely high (${percentChange.toFixed(1)}% above baseline) - overreaching risk`;
      case 'concerning':
        return `Training load significantly elevated (${percentChange.toFixed(1)}% above baseline)`;
      case 'elevated':
        return `Training load moderately high (${percentChange.toFixed(1)}% above baseline)`;
      default:
        return `Training load within normal range (${currentLoad.toFixed(1)} TRIMP/day average)`;
    }
  }
}