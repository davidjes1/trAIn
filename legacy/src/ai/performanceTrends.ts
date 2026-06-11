// AI-powered performance analysis and trend detection system

import { ActivityMetrics } from '../types/training-metrics.types';
import { FirebaseRecoveryMetrics } from '../types/firebase.types';
import {
  PerformanceAnalysis,
  PerformanceMetric,
  PerformanceInsight,
  PerformancePrediction,
  TrainingFocus,
  PerformanceResponse,
  UserTrainingProfile
} from './aiTypes';
import { AIUtils } from './aiUtils';

export class PerformanceTrends {
  private static readonly MIN_ACTIVITIES_FOR_TRENDS = 10;
  private static readonly ANALYSIS_WINDOW_DAYS = 90; // 3 months
  private static readonly PREDICTION_WINDOW_DAYS = 30; // 1 month ahead
  
  /**
   * Comprehensive performance analysis with trends and insights
   */
  static async analyzePerformance(
    userId: string,
    activities: ActivityMetrics[],
    recoveryMetrics: FirebaseRecoveryMetrics[],
    userProfile: UserTrainingProfile
  ): Promise<PerformanceResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      if (activities.length < this.MIN_ACTIVITIES_FOR_TRENDS) {
        return {
          success: false,
          error: `Insufficient data for performance analysis. Need at least ${this.MIN_ACTIVITIES_FOR_TRENDS} activities`,
          warnings,
          context: AIUtils.createDecisionContext(userId, 'performance-analysis', { activitiesCount: activities.length }),
          processingTime: Date.now() - startTime
        };
      }
      
      // Filter activities to analysis window
      const analysisStartDate = new Date();
      analysisStartDate.setDate(analysisStartDate.getDate() - this.ANALYSIS_WINDOW_DAYS);
      
      const recentActivities = activities
        .filter(a => new Date(a.date) >= analysisStartDate)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate key performance metrics
      const keyMetrics = this.calculateKeyMetrics(recentActivities, userProfile);
      
      // Generate insights
      const insights = this.generateInsights(keyMetrics, recentActivities, recoveryMetrics);
      
      // Make predictions
      const predictions = this.generatePredictions(keyMetrics, recentActivities);
      
      // Recommend training focus areas
      const recommendedFocus = this.recommendTrainingFocus(keyMetrics, insights, userProfile);
      
      // Determine overall trend
      const overallTrend = this.determineOverallTrend(keyMetrics);
      
      if (recentActivities.length < activities.length * 0.7) {
        warnings.push('Limited recent activity data - analysis may not reflect current form');
      }
      
      const analysis: PerformanceAnalysis = {
        overallTrend,
        keyMetrics,
        insights,
        predictions,
        recommendedFocus
      };
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: analysis,
        warnings,
        context: AIUtils.createDecisionContext(
          userId,
          'performance-analysis',
          {
            activitiesAnalyzed: recentActivities.length,
            analysisWindowDays: this.ANALYSIS_WINDOW_DAYS,
            overallTrend
          },
          ['trend-analysis', 'regression-analysis', 'insight-generation'],
          { metricsCount: keyMetrics.length }
        ),
        processingTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Performance analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings,
        context: AIUtils.createDecisionContext(userId, 'performance-analysis', {}),
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Calculate key performance metrics with trend analysis
   */
  private static calculateKeyMetrics(
    activities: ActivityMetrics[],
    userProfile: UserTrainingProfile
  ): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];
    
    if (activities.length === 0) return metrics;
    
    // Split activities into first half and second half for trend analysis
    const midpoint = Math.floor(activities.length / 2);
    const firstHalf = activities.slice(0, midpoint);
    const secondHalf = activities.slice(midpoint);
    
    // Aerobic Efficiency (HR drift analysis)
    const activitiesWithHR = activities.filter(a => a.hrDrift !== undefined);
    if (activitiesWithHR.length >= 5) {
      const currentHRDrift = this.calculateAverage(secondHalf.filter(a => a.hrDrift !== undefined).map(a => a.hrDrift!));
      const baselineHRDrift = this.calculateAverage(firstHalf.filter(a => a.hrDrift !== undefined).map(a => a.hrDrift!));
      
      const percentChange = baselineHRDrift !== 0 ? ((currentHRDrift - baselineHRDrift) / Math.abs(baselineHRDrift)) * 100 : 0;
      const trend = percentChange < -5 ? 'improving' : percentChange > 5 ? 'declining' : 'stable';
      
      metrics.push({
        name: 'Aerobic Efficiency',
        category: 'aerobic',
        currentValue: currentHRDrift,
        baselineValue: baselineHRDrift,
        percentChange: -percentChange, // Negative HR drift is good, so we flip the sign
        trend,
        confidenceLevel: Math.min(90, activitiesWithHR.length * 5),
        lastImprovement: this.findLastImprovement(activitiesWithHR, 'hrDrift'),
        timeframe: activities.length
      });
    }
    
    // Training Load Consistency
    const trainingLoads = activities.map(a => a.trainingLoad);
    const currentAvgLoad = this.calculateAverage(secondHalf.map(a => a.trainingLoad));
    const baselineAvgLoad = this.calculateAverage(firstHalf.map(a => a.trainingLoad));
    
    const loadPercentChange = baselineAvgLoad !== 0 ? ((currentAvgLoad - baselineAvgLoad) / baselineAvgLoad) * 100 : 0;
    const loadTrend = loadPercentChange > 10 ? 'improving' : loadPercentChange < -10 ? 'declining' : 'stable';
    
    metrics.push({
      name: 'Training Load Progression',
      category: 'aerobic',
      currentValue: currentAvgLoad,
      baselineValue: baselineAvgLoad,
      percentChange: loadPercentChange,
      trend: loadTrend,
      confidenceLevel: Math.min(95, activities.length * 3),
      lastImprovement: this.findLastImprovement(activities, 'trainingLoad'),
      timeframe: activities.length
    });
    
    // Speed/Pace Analysis (sport-specific)
    const runningActivities = activities.filter(a => 
      a.sport.toLowerCase().includes('run') && a.avgPace !== undefined
    );
    
    if (runningActivities.length >= 5) {
      const currentPace = this.calculateAverage(
        secondHalf.filter(a => a.sport.toLowerCase().includes('run') && a.avgPace !== undefined).map(a => a.avgPace!)
      );
      const baselinePace = this.calculateAverage(
        firstHalf.filter(a => a.sport.toLowerCase().includes('run') && a.avgPace !== undefined).map(a => a.avgPace!)
      );
      
      const pacePercentChange = baselinePace !== 0 ? ((currentPace - baselinePace) / baselinePace) * 100 : 0;
      const paceTrend = pacePercentChange < -3 ? 'improving' : pacePercentChange > 3 ? 'declining' : 'stable';
      
      metrics.push({
        name: 'Running Pace',
        category: 'aerobic',
        currentValue: currentPace,
        baselineValue: baselinePace,
        percentChange: -pacePercentChange, // Lower pace is better, so flip sign
        trend: paceTrend,
        confidenceLevel: Math.min(90, runningActivities.length * 4),
        lastImprovement: this.findLastImprovement(runningActivities, 'avgPace'),
        timeframe: runningActivities.length
      });
    }
    
    // Cycling Speed Analysis
    const cyclingActivities = activities.filter(a => 
      a.sport.toLowerCase().includes('bike') && a.avgSpeed !== undefined
    );
    
    if (cyclingActivities.length >= 5) {
      const currentSpeed = this.calculateAverage(
        secondHalf.filter(a => a.sport.toLowerCase().includes('bike') && a.avgSpeed !== undefined).map(a => a.avgSpeed!)
      );
      const baselineSpeed = this.calculateAverage(
        firstHalf.filter(a => a.sport.toLowerCase().includes('bike') && a.avgSpeed !== undefined).map(a => a.avgSpeed!)
      );
      
      const speedPercentChange = baselineSpeed !== 0 ? ((currentSpeed - baselineSpeed) / baselineSpeed) * 100 : 0;
      const speedTrend = speedPercentChange > 3 ? 'improving' : speedPercentChange < -3 ? 'declining' : 'stable';
      
      metrics.push({
        name: 'Cycling Speed',
        category: 'aerobic',
        currentValue: currentSpeed,
        baselineValue: baselineSpeed,
        percentChange: speedPercentChange,
        trend: speedTrend,
        confidenceLevel: Math.min(90, cyclingActivities.length * 4),
        lastImprovement: this.findLastImprovement(cyclingActivities, 'avgSpeed'),
        timeframe: cyclingActivities.length
      });
    }
    
    // Recovery Efficiency (if recovery data available)
    const recoveryMetric = this.analyzeRecoveryEfficiency(activities);
    if (recoveryMetric) {
      metrics.push(recoveryMetric);
    }
    
    // Zone Distribution Analysis
    const zoneMetric = this.analyzeZoneDistribution(activities);
    if (zoneMetric) {
      metrics.push(zoneMetric);
    }
    
    return metrics;
  }
  
  /**
   * Generate insights from performance metrics
   */
  private static generateInsights(
    metrics: PerformanceMetric[],
    activities: ActivityMetrics[],
    recoveryMetrics: FirebaseRecoveryMetrics[]
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];
    
    // Achievement insights
    const improvingMetrics = metrics.filter(m => m.trend === 'improving' && m.percentChange > 5);
    improvingMetrics.forEach(metric => {
      insights.push({
        type: 'achievement',
        title: `${metric.name} Improvement`,
        description: `Your ${metric.name.toLowerCase()} has improved by ${Math.abs(metric.percentChange).toFixed(1)}% over the analysis period`,
        metrics: [metric.name],
        actionable: false,
        priority: 'medium'
      });
    });
    
    // Plateau insights
    const stableMetrics = metrics.filter(m => m.trend === 'stable');
    if (stableMetrics.length >= metrics.length * 0.6) {
      insights.push({
        type: 'plateau',
        title: 'Performance Plateau Detected',
        description: 'Multiple metrics show stable trends. Consider varying training intensity or adding new challenges',
        metrics: stableMetrics.map(m => m.name),
        actionable: true,
        priority: 'medium'
      });
    }
    
    // Regression insights
    const decliningMetrics = metrics.filter(m => m.trend === 'declining' && m.percentChange < -5);
    if (decliningMetrics.length > 0) {
      insights.push({
        type: 'regression',
        title: 'Performance Decline',
        description: `${decliningMetrics.length} metric(s) showing decline. Review training load and recovery`,
        metrics: decliningMetrics.map(m => m.name),
        actionable: true,
        priority: 'high'
      });
    }
    
    // Training volume insights
    const recentVolume = activities.slice(-14).reduce((sum, a) => sum + a.duration, 0);
    const olderVolume = activities.slice(-28, -14).reduce((sum, a) => sum + a.duration, 0);
    
    if (recentVolume > olderVolume * 1.3) {
      insights.push({
        type: 'opportunity',
        title: 'Training Volume Increase',
        description: 'Recent training volume has increased significantly. Monitor recovery closely',
        metrics: ['Training Load Progression'],
        actionable: true,
        priority: 'medium'
      });
    }
    
    // Recovery insights
    if (recoveryMetrics.length >= 7) {
      const recentRecovery = recoveryMetrics.slice(-7);
      const avgBodyBattery = recentRecovery
        .filter(m => m.bodyBattery !== undefined)
        .reduce((sum, m) => sum + m.bodyBattery!, 0) / recentRecovery.length;
      
      if (avgBodyBattery < 60 && improvingMetrics.length === 0) {
        insights.push({
          type: 'opportunity',
          title: 'Recovery Optimization Needed',
          description: 'Poor recovery metrics may be limiting performance gains',
          metrics: ['Recovery Efficiency'],
          actionable: true,
          priority: 'high'
        });
      }
    }
    
    // Consistency insights
    const trainingDays = new Set(activities.map(a => a.date)).size;
    const totalDays = Math.ceil((new Date(activities[activities.length - 1].date).getTime() - 
                                 new Date(activities[0].date).getTime()) / (1000 * 60 * 60 * 24));
    const consistency = trainingDays / totalDays;
    
    if (consistency > 0.6) {
      insights.push({
        type: 'achievement',
        title: 'Excellent Training Consistency',
        description: `Training ${(consistency * 100).toFixed(0)}% of days shows great commitment`,
        metrics: [],
        actionable: false,
        priority: 'low'
      });
    } else if (consistency < 0.3) {
      insights.push({
        type: 'opportunity',
        title: 'Consistency Opportunity',
        description: 'More consistent training could accelerate progress',
        metrics: [],
        actionable: true,
        priority: 'medium'
      });
    }
    
    return insights;
  }
  
  /**
   * Generate performance predictions
   */
  private static generatePredictions(
    metrics: PerformanceMetric[],
    activities: ActivityMetrics[]
  ): PerformancePrediction[] {
    const predictions: PerformancePrediction[] = [];
    
    metrics.forEach(metric => {
      if (metric.trend === 'stable' || metric.confidenceLevel < 50) return;
      
      // Simple linear projection
      const rateOfChange = metric.percentChange / this.ANALYSIS_WINDOW_DAYS;
      const projectedChange = rateOfChange * this.PREDICTION_WINDOW_DAYS;
      const predictedValue = metric.currentValue * (1 + projectedChange / 100);
      
      // Calculate confidence interval (±20% of predicted change)
      const uncertainty = Math.abs(predictedValue - metric.currentValue) * 0.2;
      const confidenceInterval: [number, number] = [
        predictedValue - uncertainty,
        predictedValue + uncertainty
      ];
      
      // Identify influencing factors
      const factors: string[] = [];
      if (activities.slice(-7).length >= 5) factors.push('Recent training consistency');
      if (metric.trend === 'improving') factors.push('Positive trend momentum');
      if (metric.confidenceLevel > 80) factors.push('High data confidence');
      
      predictions.push({
        metric: metric.name,
        timeframe: this.PREDICTION_WINDOW_DAYS,
        predictedValue,
        confidenceInterval,
        factors
      });
    });
    
    return predictions;
  }
  
  /**
   * Recommend training focus areas
   */
  private static recommendTrainingFocus(
    metrics: PerformanceMetric[],
    insights: PerformanceInsight[],
    userProfile: UserTrainingProfile
  ): TrainingFocus[] {
    const focuses: TrainingFocus[] = [];
    
    // Base aerobic focus (always relevant)
    const aerobicMetrics = metrics.filter(m => m.category === 'aerobic');
    const aerobicTrend = aerobicMetrics.length > 0 ? 
      aerobicMetrics.reduce((sum, m) => sum + (m.trend === 'improving' ? 1 : m.trend === 'declining' ? -1 : 0), 0) : 0;
    
    if (aerobicTrend <= 0) {
      focuses.push({
        area: 'base-aerobic',
        priority: 4,
        currentLevel: aerobicTrend < -1 ? 'weak' : 'developing',
        recommendedSessions: 3,
        duration: 4
      });
    }
    
    // Recovery focus if needed
    const recoveryInsights = insights.filter(i => i.description.toLowerCase().includes('recovery'));
    if (recoveryInsights.length > 0) {
      focuses.push({
        area: 'recovery',
        priority: 5,
        currentLevel: 'weak',
        recommendedSessions: 2,
        duration: 2
      });
    }
    
    // Threshold focus for intermediate/advanced athletes
    if (userProfile.fitnessLevel !== 'beginner') {
      const hasThresholdWeakness = metrics.some(m => 
        m.name.includes('Load') && m.trend === 'declining'
      );
      
      focuses.push({
        area: 'threshold',
        priority: hasThresholdWeakness ? 4 : 3,
        currentLevel: hasThresholdWeakness ? 'weak' : 'developing',
        recommendedSessions: 1,
        duration: 3
      });
    }
    
    // VO2max focus for advanced athletes
    if (userProfile.fitnessLevel === 'advanced') {
      focuses.push({
        area: 'vo2max',
        priority: 3,
        currentLevel: 'developing',
        recommendedSessions: 1,
        duration: 2
      });
    }
    
    // Sort by priority
    return focuses.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Determine overall performance trend
   */
  private static determineOverallTrend(metrics: PerformanceMetric[]): 'improving' | 'stable' | 'declining' {
    if (metrics.length === 0) return 'stable';
    
    const trendScores: number[] = metrics.map(m => {
      switch (m.trend) {
        case 'improving': return 1;
        case 'declining': return -1;
        default: return 0;
      }
    });
    
    const avgScore = trendScores.reduce((sum: number, score: number) => sum + score, 0) / trendScores.length;
    
    if (avgScore > 0.2) return 'improving';
    if (avgScore < -0.2) return 'declining';
    return 'stable';
  }
  
  /**
   * Helper methods
   */
  private static calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  private static findLastImprovement(activities: ActivityMetrics[], metric: keyof ActivityMetrics): string {
    // Simplified - in a full implementation, you'd track improvements over time
    const recentActivity = activities[activities.length - 1];
    return recentActivity ? recentActivity.date : new Date().toISOString().split('T')[0];
  }
  
  private static analyzeRecoveryEfficiency(activities: ActivityMetrics[]): PerformanceMetric | null {
    // Calculate training stress balance as a proxy for recovery efficiency
    if (activities.length < 14) return null;
    
    const tsbResult = AIUtils.calculateTSB(activities);
    const currentTSB = tsbResult.value.tsb;
    
    // Compare recent TSB trend
    const olderActivities = activities.slice(0, -7);
    const olderTSBResult = AIUtils.calculateTSB(olderActivities);
    const baselineTSB = olderTSBResult.value.tsb;
    
    const percentChange = baselineTSB !== 0 ? ((currentTSB - baselineTSB) / Math.abs(baselineTSB)) * 100 : 0;
    const trend = percentChange > 10 ? 'improving' : percentChange < -10 ? 'declining' : 'stable';
    
    return {
      name: 'Recovery Efficiency',
      category: 'recovery',
      currentValue: currentTSB,
      baselineValue: baselineTSB,
      percentChange,
      trend,
      confidenceLevel: tsbResult.confidence,
      lastImprovement: activities[activities.length - 1]?.date || new Date().toISOString().split('T')[0],
      timeframe: activities.length
    };
  }
  
  private static analyzeZoneDistribution(activities: ActivityMetrics[]): PerformanceMetric | null {
    if (activities.length < 10) return null;
    
    // Calculate current zone distribution efficiency
    const recentActivities = activities.slice(-Math.floor(activities.length / 2));
    const olderActivities = activities.slice(0, Math.floor(activities.length / 2));
    
    const currentEasyPct = this.calculateEasyPercentage(recentActivities);
    const baselineEasyPct = this.calculateEasyPercentage(olderActivities);
    
    const percentChange = baselineEasyPct !== 0 ? ((currentEasyPct - baselineEasyPct) / baselineEasyPct) * 100 : 0;
    const trend = Math.abs(percentChange) < 5 ? 'stable' : 
                 (currentEasyPct > 0.7 && percentChange > 0) ? 'improving' : 'declining';
    
    return {
      name: 'Training Intensity Distribution',
      category: 'efficiency',
      currentValue: currentEasyPct * 100,
      baselineValue: baselineEasyPct * 100,
      percentChange,
      trend,
      confidenceLevel: Math.min(90, activities.length * 3),
      lastImprovement: activities[activities.length - 1]?.date || new Date().toISOString().split('T')[0],
      timeframe: activities.length
    };
  }
  
  private static calculateEasyPercentage(activities: ActivityMetrics[]): number {
    if (activities.length === 0) return 0;
    
    const easyTime = activities.reduce((sum, a) => sum + a.zone1Minutes + a.zone2Minutes, 0);
    const totalTime = activities.reduce((sum, a) => sum + a.duration, 0);
    
    return totalTime > 0 ? easyTime / totalTime : 0;
  }
}