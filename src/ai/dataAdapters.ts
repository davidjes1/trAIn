// Data adapters to convert between Firebase types and AI system types

import { FirebaseActivity, FirebaseRecoveryMetrics, ActivityMetrics } from '@/core/models';
import { UserTrainingProfile } from './aiTypes';

export class DataAdapters {
  /**
   * Convert Firebase activity to ActivityMetrics for AI processing
   */
  static firebaseActivityToActivityMetrics(activity: FirebaseActivity): ActivityMetrics {
    return {
      date: activity.date,
      activityId: activity.id,
      sport: activity.sport,
      subSport: activity.subSport,
      duration: activity.duration,
      distance: activity.distance,
      avgHR: activity.avgHR,
      maxHR: activity.maxHR,
      hrDrift: activity.hrDrift,
      zone1Minutes: activity.zone1Minutes,
      zone2Minutes: activity.zone2Minutes,
      zone3Minutes: activity.zone3Minutes,
      zone4Minutes: activity.zone4Minutes,
      zone5Minutes: activity.zone5Minutes,
      trainingLoad: activity.trainingLoad,
      calories: activity.calories,
      totalAscent: activity.totalAscent,
      totalDescent: activity.totalDescent,
      avgSpeed: activity.avgSpeed,
      maxSpeed: activity.maxSpeed,
      avgPace: activity.avgPace,
      notes: activity.notes
    };
  }

  /**
   * Convert array of Firebase activities to ActivityMetrics array
   */
  static firebaseActivitiesToActivityMetrics(activities: FirebaseActivity[]): ActivityMetrics[] {
    return activities.map(this.firebaseActivityToActivityMetrics);
  }

  /**
   * Create UserTrainingProfile from Firebase user data (with sensible defaults)
   */
  static createUserTrainingProfile(userData?: any): UserTrainingProfile {
    // If we have user profile data from Firebase, use it
    if (userData?.preferences) {
      const prefs = userData.preferences;
      return {
        age: prefs.age || 35,
        sex: this.normalizeSex(prefs.sex),
        restingHR: prefs.restingHR || 60,
        maxHR: prefs.maxHR || 185,
        fitnessLevel: prefs.fitnessLevel || 'intermediate',
        preferredSports: prefs.sports || ['running'],
        trainingGoals: prefs.goals || ['fitness'],
        availableDays: prefs.availableDays || this.getDefaultAvailableDays(),
        preferredWorkoutTimes: this.getDefaultWorkoutTimes()
      };
    }

    // Return sensible defaults if no user data available
    return {
      age: 35,
      sex: 'other',
      restingHR: 60,
      maxHR: 185,
      fitnessLevel: 'intermediate',
      preferredSports: ['running'],
      trainingGoals: ['fitness'],
      availableDays: this.getDefaultAvailableDays(),
      preferredWorkoutTimes: this.getDefaultWorkoutTimes()
    };
  }

  /**
   * Create UserTrainingProfile from UserProfileService (preferred method)
   */
  static createUserTrainingProfileFromService(userProfileService: any): UserTrainingProfile {
    const userProfile = userProfileService.getUserProfile();
    const trainingProfile = userProfileService.getTrainingProfile();
    
    if (userProfile?.preferences) {
      const prefs = userProfile.preferences;
      return {
        age: trainingProfile.age,
        sex: this.normalizeSex(prefs.sex),
        restingHR: trainingProfile.restingHR,
        maxHR: trainingProfile.maxHR,
        fitnessLevel: trainingProfile.fitnessLevel,
        preferredSports: trainingProfile.preferredSports,
        trainingGoals: trainingProfile.goals,
        availableDays: prefs.availableDays || this.getDefaultAvailableDays(),
        preferredWorkoutTimes: this.getDefaultWorkoutTimes()
      };
    }

    // Fallback to service defaults
    return {
      age: trainingProfile.age,
      sex: 'other',
      restingHR: trainingProfile.restingHR,
      maxHR: trainingProfile.maxHR,
      fitnessLevel: trainingProfile.fitnessLevel,
      preferredSports: trainingProfile.preferredSports,
      trainingGoals: trainingProfile.goals,
      availableDays: this.getDefaultAvailableDays(),
      preferredWorkoutTimes: this.getDefaultWorkoutTimes()
    };
  }

  /**
   * Normalize sex field to match AI types
   */
  private static normalizeSex(sex?: string): 'male' | 'female' | 'other' {
    if (!sex) return 'other';
    const normalized = sex.toLowerCase();
    if (normalized === 'male' || normalized === 'm') return 'male';
    if (normalized === 'female' || normalized === 'f') return 'female';
    return 'other';
  }

  /**
   * Get default available training days
   */
  private static getDefaultAvailableDays(): string[] {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  }

  /**
   * Get default workout time preferences
   */
  private static getDefaultWorkoutTimes(): Array<{
    dayOfWeek: string;
    timeSlot: 'morning' | 'afternoon' | 'evening';
    duration: number;
  }> {
    return [
      { dayOfWeek: 'Monday', timeSlot: 'evening', duration: 60 },
      { dayOfWeek: 'Wednesday', timeSlot: 'evening', duration: 60 },
      { dayOfWeek: 'Friday', timeSlot: 'evening', duration: 60 },
      { dayOfWeek: 'Saturday', timeSlot: 'morning', duration: 90 }
    ];
  }

  /**
   * Validate Firebase activity has required fields for AI processing
   */
  static validateFirebaseActivity(activity: FirebaseActivity): {
    valid: boolean;
    missingFields: string[];
    warnings: string[];
  } {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!activity.date) missingFields.push('date');
    if (typeof activity.duration !== 'number') missingFields.push('duration');
    if (typeof activity.distance !== 'number') missingFields.push('distance');
    if (!activity.sport) missingFields.push('sport');
    if (typeof activity.trainingLoad !== 'number') missingFields.push('trainingLoad');

    // HR zone minutes (required for training load calculations)
    const hrFields = ['zone1Minutes', 'zone2Minutes', 'zone3Minutes', 'zone4Minutes', 'zone5Minutes'];
    const missingHRFields = hrFields.filter(field => 
      typeof (activity as any)[field] !== 'number'
    );
    
    if (missingHRFields.length > 0) {
      missingFields.push(...missingHRFields);
    }

    // Warnings for optional but useful fields
    if (!activity.avgHR) warnings.push('Missing average HR - may affect fatigue calculations');
    if (!activity.maxHR) warnings.push('Missing max HR - may affect intensity analysis');

    return {
      valid: missingFields.length === 0,
      missingFields,
      warnings
    };
  }

  /**
   * Validate Firebase recovery metrics for AI processing
   */
  static validateFirebaseRecoveryMetrics(metrics: FirebaseRecoveryMetrics): {
    valid: boolean;
    missingFields: string[];
    warnings: string[];
  } {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!metrics.date) missingFields.push('date');
    if (typeof metrics.subjectiveFatigue !== 'number') missingFields.push('subjectiveFatigue');

    // Warn about missing optional fields that improve AI accuracy
    if (metrics.bodyBattery === undefined) warnings.push('Missing body battery - may affect recovery assessment');
    if (metrics.sleepScore === undefined) warnings.push('Missing sleep score - may affect recovery assessment');
    if (metrics.hrv === undefined) warnings.push('Missing HRV - may affect fatigue detection');
    if (metrics.restingHR === undefined) warnings.push('Missing resting HR - may affect stress detection');

    return {
      valid: missingFields.length === 0,
      missingFields,
      warnings
    };
  }

  /**
   * Get data quality score for AI processing (0-100)
   */
  static assessDataQuality(
    activities: FirebaseActivity[], 
    recoveryMetrics: FirebaseRecoveryMetrics[]
  ): {
    score: number;
    category: 'excellent' | 'good' | 'fair' | 'poor';
    factors: string[];
  } {
    let score = 100;
    const factors: string[] = [];

    // Activity data quality
    if (activities.length === 0) {
      score -= 50;
      factors.push('No activity data available');
    } else if (activities.length < 5) {
      score -= 30;
      factors.push('Limited activity history');
    } else if (activities.length < 15) {
      score -= 15;
      factors.push('Moderate activity history');
    } else {
      factors.push('Good activity history');
    }

    // Recovery data quality
    if (recoveryMetrics.length === 0) {
      score -= 30;
      factors.push('No recovery data available');
    } else if (recoveryMetrics.length < 7) {
      score -= 20;
      factors.push('Limited recovery data');
    } else if (recoveryMetrics.length < 14) {
      score -= 10;
      factors.push('Moderate recovery data');
    } else {
      factors.push('Good recovery data history');
    }

    // Check activity data completeness
    const activitiesWithHR = activities.filter(a => a.avgHR && a.maxHR);
    const hrCoverage = activitiesWithHR.length / Math.max(1, activities.length);
    
    if (hrCoverage < 0.3) {
      score -= 15;
      factors.push('Limited heart rate data');
    } else if (hrCoverage < 0.7) {
      score -= 5;
      factors.push('Moderate heart rate coverage');
    }

    // Check recovery metrics completeness
    const metricsWithBiodata = recoveryMetrics.filter(m => 
      m.bodyBattery !== undefined || m.sleepScore !== undefined || m.hrv !== undefined
    );
    const bioCoverage = metricsWithBiodata.length / Math.max(1, recoveryMetrics.length);
    
    if (bioCoverage < 0.3) {
      score -= 10;
      factors.push('Limited biometric recovery data');
    }

    // Data recency
    if (activities.length > 0) {
      const latestActivity = new Date(Math.max(...activities.map(a => new Date(a.date).getTime())));
      const daysAgo = (Date.now() - latestActivity.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysAgo > 14) {
        score -= 15;
        factors.push('Activity data is getting stale');
      } else if (daysAgo > 7) {
        score -= 5;
        factors.push('Recent activity data available');
      }
    }

    // Determine category
    let category: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 85) category = 'excellent';
    else if (score >= 70) category = 'good';
    else if (score >= 50) category = 'fair';
    else category = 'poor';

    return {
      score: Math.max(0, score),
      category,
      factors
    };
  }
}