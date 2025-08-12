// Central AI service orchestrating all AI-powered features

import { ActivityMetrics } from '../types/training-metrics.types';
import { FirebaseRecoveryMetrics } from '../types/firebase.types';
import { 
  AIRecommendationInput,
  UserTrainingProfile,
  WeatherCondition,
  RecommendationResponse,
  FatigueResponse,
  PerformanceResponse,
  AdjustmentResponse,
  PlanAdjustmentRequest
} from './aiTypes';
import { PlanAdvisor } from './planAdvisor';
import { FatigueMonitor } from './fatigueMonitor';
import { PerformanceTrends } from './performanceTrends';
import { PlanAdjuster } from './planAdjuster';
import { FirestoreService } from '../firebase/firestore';
import { DataAdapters } from './dataAdapters';
import { UserProfileService } from '../services/UserProfileService';

export class AIService {
  private static cachedRecommendations = new Map<string, any>();
  private static cacheTimeout = 60 * 60 * 1000; // 1 hour
  
  /**
   * Get comprehensive AI insights for the dashboard
   */
  static async getDashboardInsights(userId: string): Promise<{
    workoutRecommendation?: any;
    fatigueAssessment?: any;
    performanceAnalysis?: any;
    quickStats: {
      readinessScore: number;
      trendDirection: 'improving' | 'stable' | 'declining';
      nextRecommendation: string;
      riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    };
    lastUpdated: string;
  }> {
    try {
      // Get user data from Firestore
      const [firebaseActivities, firebaseRecoveryMetrics] = await Promise.all([
        FirestoreService.getActivities(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Last 30 days
        FirestoreService.getRecoveryMetrics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      ]);
      
      // Convert Firebase data to AI-compatible formats
      const activities = DataAdapters.firebaseActivitiesToActivityMetrics(firebaseActivities);
      const recoveryMetrics = firebaseRecoveryMetrics; // Already compatible
      
      // Create user profile from available data
      const userProfile = await this.createUserProfile(userId);
      
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `dashboard_${userId}_${today}`;
      
      // Check cache first
      if (this.cachedRecommendations.has(cacheKey)) {
        const cached = this.cachedRecommendations.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }
      
      // Get AI insights in parallel
      const [workoutRecommendation, fatigueAssessment, performanceAnalysis] = await Promise.all([
        this.getWorkoutRecommendation(userId, activities, recoveryMetrics, userProfile),
        this.getFatigueAssessment(userId, activities, recoveryMetrics, userProfile),
        this.getPerformanceAnalysis(userId, activities, recoveryMetrics, userProfile)
      ]);
      
      // Calculate quick stats
      const quickStats = this.calculateQuickStats(
        workoutRecommendation,
        fatigueAssessment,
        performanceAnalysis
      );
      
      const insights = {
        workoutRecommendation: workoutRecommendation?.success ? workoutRecommendation.data : null,
        fatigueAssessment: fatigueAssessment?.success ? fatigueAssessment.data : null,
        performanceAnalysis: performanceAnalysis?.success ? performanceAnalysis.data : null,
        quickStats,
        lastUpdated: new Date().toISOString()
      };
      
      // Cache the results
      this.cachedRecommendations.set(cacheKey, {
        data: insights,
        timestamp: Date.now()
      });
      
      return insights;
      
    } catch (error) {
      console.error('Error getting dashboard insights:', error);
      return {
        quickStats: {
          readinessScore: 50,
          trendDirection: 'stable',
          nextRecommendation: 'Unable to generate recommendation',
          riskLevel: 'low'
        },
        lastUpdated: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get workout recommendation for tomorrow
   */
  static async getTomorrowWorkoutRecommendation(userId: string): Promise<RecommendationResponse> {
    try {
      const [firebaseActivities, firebaseRecoveryMetrics] = await Promise.all([
        FirestoreService.getActivities(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)), // Last 28 days
        FirestoreService.getRecoveryMetrics(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) // Last 14 days
      ]);
      
      // Convert Firebase data to AI-compatible formats
      const activities = DataAdapters.firebaseActivitiesToActivityMetrics(firebaseActivities);
      const recoveryMetrics = firebaseRecoveryMetrics;
      
      const userProfile = await this.createUserProfile(userId);
      
      return await this.getWorkoutRecommendation(userId, activities, recoveryMetrics, userProfile);
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to get workout recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings: [],
        context: { userId, timestamp: new Date().toISOString(), inputData: {}, algorithms: [], parameters: {}, version: '1.0.0' },
        processingTime: 0
      };
    }
  }
  
  /**
   * Get current fatigue assessment
   */
  static async getCurrentFatigueAssessment(userId: string): Promise<FatigueResponse> {
    try {
      const [firebaseActivities, firebaseRecoveryMetrics] = await Promise.all([
        FirestoreService.getActivities(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)),
        FirestoreService.getRecoveryMetrics(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
      ]);
      
      // Convert Firebase data to AI-compatible formats
      const activities = DataAdapters.firebaseActivitiesToActivityMetrics(firebaseActivities);
      const recoveryMetrics = firebaseRecoveryMetrics;
      
      const userProfile = await this.createUserProfile(userId);
      
      return await FatigueMonitor.assessFatigue(userId, activities, recoveryMetrics, userProfile);
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to assess fatigue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings: [],
        context: { userId, timestamp: new Date().toISOString(), inputData: {}, algorithms: [], parameters: {}, version: '1.0.0' },
        processingTime: 0
      };
    }
  }
  
  /**
   * Get performance analysis
   */
  static async getPerformanceInsights(userId: string): Promise<PerformanceResponse> {
    try {
      const [firebaseActivities, firebaseRecoveryMetrics] = await Promise.all([
        FirestoreService.getActivities(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)), // Last 90 days
        FirestoreService.getRecoveryMetrics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      ]);
      
      // Convert Firebase data to AI-compatible formats
      const activities = DataAdapters.firebaseActivitiesToActivityMetrics(firebaseActivities);
      const recoveryMetrics = firebaseRecoveryMetrics;
      
      const userProfile = await this.createUserProfile(userId);
      
      return await PerformanceTrends.analyzePerformance(userId, activities, recoveryMetrics, userProfile);
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze performance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings: [],
        context: { userId, timestamp: new Date().toISOString(), inputData: {}, algorithms: [], parameters: {}, version: '1.0.0' },
        processingTime: 0
      };
    }
  }
  
  /**
   * Adjust training plan
   */
  static async adjustTrainingPlan(
    userId: string,
    adjustmentRequest: PlanAdjustmentRequest
  ): Promise<AdjustmentResponse> {
    try {
      const userProfile = await this.createUserProfile(userId);
      
      return await PlanAdjuster.adjustPlan(userId, adjustmentRequest, userProfile);
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to adjust plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings: [],
        context: { userId, timestamp: new Date().toISOString(), inputData: {}, algorithms: [], parameters: {}, version: '1.0.0' },
        processingTime: 0
      };
    }
  }
  
  /**
   * Quick fatigue check for immediate training decisions
   */
  static async quickTrainingDecision(userId: string): Promise<{
    canTrain: boolean;
    recommendation: 'full' | 'easy' | 'rest';
    reasons: string[];
    confidence: number;
  }> {
    try {
      const [firebaseActivities, firebaseRecoveryMetrics] = await Promise.all([
        FirestoreService.getActivities(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
        FirestoreService.getRecoveryMetrics(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      ]);
      
      // Convert Firebase data to AI-compatible formats
      const activities = DataAdapters.firebaseActivitiesToActivityMetrics(firebaseActivities);
      const recoveryMetrics = firebaseRecoveryMetrics;
      
      const latestRecovery = recoveryMetrics.length > 0 ? recoveryMetrics[0] : {
        date: new Date().toISOString().split('T')[0],
        userId,
        subjectiveFatigue: 5,
        recordedAt: new Date()
      };
      
      const result = await FatigueMonitor.quickFatigueCheck(userId, activities, latestRecovery);
      
      // Add confidence calculation
      let confidence = 70;
      if (firebaseActivities.length >= 7) confidence += 15;
      if (firebaseRecoveryMetrics.length >= 3) confidence += 15;
      
      return {
        ...result,
        confidence: Math.min(95, confidence)
      };
      
    } catch (error) {
      return {
        canTrain: true,
        recommendation: 'easy',
        reasons: ['Error assessing fatigue - defaulting to easy training'],
        confidence: 30
      };
    }
  }
  
  /**
   * Get weather-adjusted workout recommendation
   */
  static async getWeatherAdjustedRecommendation(
    userId: string,
    weatherData: WeatherCondition
  ): Promise<RecommendationResponse> {
    try {
      const [firebaseActivities, firebaseRecoveryMetrics] = await Promise.all([
        FirestoreService.getActivities(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)),
        FirestoreService.getRecoveryMetrics(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
      ]);
      
      // Convert Firebase data to AI-compatible formats
      const activities = DataAdapters.firebaseActivitiesToActivityMetrics(firebaseActivities);
      const recoveryMetrics = firebaseRecoveryMetrics;
      
      const userProfile = await this.createUserProfile(userId);
      
      const input: AIRecommendationInput = {
        userId,
        currentDate: new Date().toISOString().split('T')[0],
        recentActivities: activities,
        recoveryMetrics,
        userProfile,
        weatherData
      };
      
      return await PlanAdvisor.recommendTomorrowWorkout(input);
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to get weather-adjusted recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings: [],
        context: { userId, timestamp: new Date().toISOString(), inputData: {}, algorithms: [], parameters: {}, version: '1.0.0' },
        processingTime: 0
      };
    }
  }
  
  /**
   * Helper method to get workout recommendation
   */
  private static async getWorkoutRecommendation(
    userId: string,
    activities: ActivityMetrics[],
    recoveryMetrics: FirebaseRecoveryMetrics[],
    userProfile: UserTrainingProfile
  ): Promise<RecommendationResponse> {
    const input: AIRecommendationInput = {
      userId,
      currentDate: new Date().toISOString().split('T')[0],
      recentActivities: activities,
      recoveryMetrics,
      userProfile
    };
    
    return await PlanAdvisor.recommendTomorrowWorkout(input);
  }
  
  /**
   * Helper method to get fatigue assessment
   */
  private static async getFatigueAssessment(
    userId: string,
    activities: ActivityMetrics[],
    recoveryMetrics: FirebaseRecoveryMetrics[],
    userProfile: UserTrainingProfile
  ): Promise<FatigueResponse> {
    return await FatigueMonitor.assessFatigue(userId, activities, recoveryMetrics, userProfile);
  }
  
  /**
   * Helper method to get performance analysis
   */
  private static async getPerformanceAnalysis(
    userId: string,
    activities: ActivityMetrics[],
    recoveryMetrics: FirebaseRecoveryMetrics[],
    userProfile: UserTrainingProfile
  ): Promise<PerformanceResponse> {
    return await PerformanceTrends.analyzePerformance(userId, activities, recoveryMetrics, userProfile);
  }
  
  /**
   * Create user training profile from available data
   */
  private static async createUserProfile(userId: string): Promise<UserTrainingProfile> {
    try {
      // Get user profile from UserProfileService
      const userProfileService = UserProfileService.getInstance();
      return DataAdapters.createUserTrainingProfileFromService(userProfileService);
    } catch (error) {
      // Return default profile if error
      console.warn('Failed to load user profile, using defaults:', error);
      return DataAdapters.createUserTrainingProfile();
    }
  }
  
  /**
   * Calculate quick stats for dashboard
   */
  private static calculateQuickStats(
    workoutRec: RecommendationResponse | null,
    fatigueAssess: FatigueResponse | null,
    perfAnalysis: PerformanceResponse | null
  ): {
    readinessScore: number;
    trendDirection: 'improving' | 'stable' | 'declining';
    nextRecommendation: string;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  } {
    // Calculate readiness score
    let readinessScore = 50; // Default neutral
    
    if (fatigueAssess?.success && fatigueAssess.data) {
      const fatigue = fatigueAssess.data;
      switch (fatigue.overallStatus) {
        case 'fresh': readinessScore = 85; break;
        case 'normal': readinessScore = 70; break;
        case 'fatigued': readinessScore = 40; break;
        case 'overtrained': readinessScore = 20; break;
      }
    }
    
    // Determine trend direction
    let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
    
    if (perfAnalysis?.success && perfAnalysis.data) {
      trendDirection = perfAnalysis.data.overallTrend;
    }
    
    // Get next recommendation
    let nextRecommendation = 'Continue with current training';
    
    if (workoutRec?.success && workoutRec.data) {
      const workout = workoutRec.data.recommendedWorkout;
      nextRecommendation = `${workout.type}: ${workout.description}`;
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    
    if (fatigueAssess?.success && fatigueAssess.data) {
      riskLevel = fatigueAssess.data.riskLevel;
    }
    
    return {
      readinessScore,
      trendDirection,
      nextRecommendation,
      riskLevel
    };
  }
  
  /**
   * Clear cache (useful for testing or forcing updates)
   */
  static clearCache(): void {
    this.cachedRecommendations.clear();
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    size: number;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const entries = Array.from(this.cachedRecommendations.entries());
    
    if (entries.length === 0) {
      return { size: 0 };
    }
    
    const timestamps = entries.map(([key, value]) => ({ key, timestamp: value.timestamp }));
    timestamps.sort((a, b) => a.timestamp - b.timestamp);
    
    return {
      size: entries.length,
      oldestEntry: timestamps[0]?.key,
      newestEntry: timestamps[timestamps.length - 1]?.key
    };
  }
}