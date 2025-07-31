import { MetricsCalculator, DashboardMetrics } from './MetricsCalculator';
import { ActivityMetrics, LapMetrics } from '../types/training-metrics.types';
import { FirestoreService } from '../firebase/firestore';
import { AuthService } from '../firebase/auth';
import { FirebaseActivity, FirebaseLapData } from '../types/firebase.types';

export interface DashboardData {
  metrics: DashboardMetrics;
  activities: ActivityMetrics[];
  laps: LapMetrics[];
  lastUpdated: Date;
}

export class DashboardService {
  private cachedData: DashboardData | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Simplified constructor - Firebase integration will be added later
  }

  /**
   * Get complete dashboard data with caching
   */
  async getDashboardData(forceRefresh = false): Promise<DashboardData> {
    // Return cached data if available and not expired
    if (!forceRefresh && this.cachedData && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.cachedData;
    }

    try {
      // Check if user is authenticated
      if (!AuthService.isAuthenticated()) {
        console.warn('User not authenticated, using localStorage fallback');
        return this.getLocalStorageData();
      }

      let activities: ActivityMetrics[] = [];
      let laps: LapMetrics[] = [];

      // Load data from Firebase Firestore
      const firebaseActivities = await FirestoreService.getActivities();
      const allLapData: FirebaseLapData[] = [];

      // Convert Firebase activities to ActivityMetrics format
      activities = firebaseActivities.map(this.convertFirebaseActivityToMetrics);

      // Get lap data for all activities
      const activityMap = new Map<string, string>(); // activity ID -> date mapping
      for (const activity of firebaseActivities) {
        activityMap.set(activity.id, activity.date);
        const activityLaps = await FirestoreService.getLapDataForActivity(activity.id);
        allLapData.push(...activityLaps);
      }

      // Convert Firebase lap data to LapMetrics format
      laps = allLapData.map(lap => this.convertFirebaseLapToMetrics(lap, activityMap.get(lap.activityId)));

      // Calculate metrics
      const metrics = MetricsCalculator.calculateDashboardMetrics(activities);

      // Create dashboard data
      const dashboardData: DashboardData = {
        metrics,
        activities,
        laps,
        lastUpdated: new Date()
      };

      // Update cache
      this.cachedData = dashboardData;
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

      return dashboardData;
    } catch (error) {
      console.error('Failed to load dashboard data from Firebase:', error);
      
      // Fallback to localStorage if Firebase fails
      try {
        console.warn('Falling back to localStorage');
        return this.getLocalStorageData();
      } catch (localError) {
        console.error('localStorage fallback also failed:', localError);
        
        // Return cached data if available, even if expired
        if (this.cachedData) {
          console.warn('Using expired cached data due to error');
          return this.cachedData;
        }
        
        // Return empty data as final fallback
        return this.getEmptyDashboardData();
      }
    }
  }

  /**
   * Get recent activities for quick display
   */
  async getRecentActivities(days = 7): Promise<ActivityMetrics[]> {
    try {
      const data = await this.getDashboardData();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return data.activities
        .filter(activity => new Date(activity.date) >= cutoffDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Failed to get recent activities:', error);
      return [];
    }
  }

  /**
   * Get training metrics for a specific date range
   */
  async getMetricsForDateRange(startDate: Date, endDate: Date): Promise<DashboardMetrics> {
    try {
      const data = await this.getDashboardData();
      const filteredActivities = data.activities.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate >= startDate && activityDate <= endDate;
      });

      return MetricsCalculator.calculateDashboardMetrics(filteredActivities);
    } catch (error) {
      console.error('Failed to get metrics for date range:', error);
      return MetricsCalculator.calculateDashboardMetrics([]);
    }
  }

  /**
   * Get activity summary statistics
   */
  async getActivitySummary(): Promise<{
    totalActivities: number;
    totalDistance: number;
    totalDuration: number;
    totalTrainingLoad: number;
    averageHR: number;
    sportBreakdown: Record<string, number>;
  }> {
    try {
      const data = await this.getDashboardData();
      const activities = data.activities;

      const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
      const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
      const totalTrainingLoad = activities.reduce((sum, a) => sum + a.trainingLoad, 0);
      
      const activitiesWithHR = activities.filter(a => a.avgHR);
      const averageHR = activitiesWithHR.length > 0 
        ? activitiesWithHR.reduce((sum, a) => sum + (a.avgHR || 0), 0) / activitiesWithHR.length
        : 0;

      const sportBreakdown = activities.reduce((breakdown, activity) => {
        breakdown[activity.sport] = (breakdown[activity.sport] || 0) + 1;
        return breakdown;
      }, {} as Record<string, number>);

      return {
        totalActivities: activities.length,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalDuration: Math.round(totalDuration),
        totalTrainingLoad: Math.round(totalTrainingLoad),
        averageHR: Math.round(averageHR),
        sportBreakdown
      };
    } catch (error) {
      console.error('Failed to get activity summary:', error);
      return {
        totalActivities: 0,
        totalDistance: 0,
        totalDuration: 0,
        totalTrainingLoad: 0,
        averageHR: 0,
        sportBreakdown: {}
      };
    }
  }

  /**
   * Test connection to Firebase or localStorage
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user is authenticated for Firebase
      if (AuthService.isAuthenticated()) {
        try {
          // Test Firebase connection by trying to get activities
          const testActivities = await FirestoreService.getActivities();
          return { 
            success: true, 
            message: `Firebase connection successful. Found ${testActivities.length} activities.` 
          };
        } catch (firebaseError) {
          console.warn('Firebase connection failed, testing localStorage fallback:', firebaseError);
        }
      }

      // Test localStorage availability as fallback
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return { 
        success: true, 
        message: 'Local storage connection successful (offline mode)' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Connection failed: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Initialize dashboard service with Firebase integration
   */
  async initialize(): Promise<boolean> {
    try {
      // Test connection and load initial data
      const connectionTest = await this.testConnection();
      if (connectionTest.success) {
        await this.getDashboardData(); // Load initial data
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize dashboard service:', error);
      return false;
    }
  }

  /**
   * Sign in - uses Firebase authentication
   */
  async signIn(): Promise<boolean> {
    try {
      return AuthService.isAuthenticated();
    } catch (error) {
      console.error('Sign in check failed:', error);
      return false;
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedData = null;
    this.cacheExpiry = null;
  }

  /**
   * Check if data is cached and fresh
   */
  isCacheValid(): boolean {
    return this.cachedData !== null && 
           this.cacheExpiry !== null && 
           new Date() < this.cacheExpiry;
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): { 
    hasCachedData: boolean; 
    cacheExpiry: Date | null; 
    isValid: boolean; 
  } {
    return {
      hasCachedData: this.cachedData !== null,
      cacheExpiry: this.cacheExpiry,
      isValid: this.isCacheValid()
    };
  }

  /**
   * Get empty dashboard data as fallback
   */
  private getEmptyDashboardData(): DashboardData {
    return {
      metrics: MetricsCalculator.calculateDashboardMetrics([]),
      activities: [],
      laps: [],
      lastUpdated: new Date()
    };
  }

  /**
   * Fallback to localStorage for offline mode or when Firebase is unavailable
   */
  private async getLocalStorageData(): Promise<DashboardData> {
    let activities: ActivityMetrics[] = [];
    let laps: LapMetrics[] = [];

    // Load data from localStorage 
    const savedActivities = localStorage.getItem('dashboard-activities');
    const savedLaps = localStorage.getItem('dashboard-laps');

    if (savedActivities) {
      activities = JSON.parse(savedActivities);
    }

    if (savedLaps) {
      laps = JSON.parse(savedLaps);
    }

    // Calculate metrics
    const metrics = MetricsCalculator.calculateDashboardMetrics(activities);

    // Create dashboard data
    const dashboardData: DashboardData = {
      metrics,
      activities,
      laps,
      lastUpdated: new Date()
    };

    // Update cache
    this.cachedData = dashboardData;
    this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

    return dashboardData;
  }

  /**
   * Convert Firebase activity to ActivityMetrics format
   */
  private convertFirebaseActivityToMetrics(firebaseActivity: FirebaseActivity): ActivityMetrics {
    return {
      date: firebaseActivity.date,
      activityId: firebaseActivity.id,
      sport: firebaseActivity.sport,
      subSport: firebaseActivity.subSport,
      duration: firebaseActivity.duration,
      distance: firebaseActivity.distance,
      avgHR: firebaseActivity.avgHR,
      maxHR: firebaseActivity.maxHR,
      hrDrift: firebaseActivity.hrDrift,
      zone1Minutes: firebaseActivity.zone1Minutes,
      zone2Minutes: firebaseActivity.zone2Minutes,
      zone3Minutes: firebaseActivity.zone3Minutes,
      zone4Minutes: firebaseActivity.zone4Minutes,
      zone5Minutes: firebaseActivity.zone5Minutes,
      trainingLoad: firebaseActivity.trainingLoad,
      calories: firebaseActivity.calories,
      totalAscent: firebaseActivity.totalAscent,
      totalDescent: firebaseActivity.totalDescent,
      avgSpeed: firebaseActivity.avgSpeed,
      maxSpeed: firebaseActivity.maxSpeed,
      avgPace: firebaseActivity.avgPace,
      notes: firebaseActivity.notes
    };
  }

  /**
   * Convert Firebase lap data to LapMetrics format
   */
  private convertFirebaseLapToMetrics(firebaseLap: FirebaseLapData, activityDate?: string): LapMetrics {
    return {
      date: activityDate || new Date().toISOString().split('T')[0], // Use provided date or current date
      activityId: firebaseLap.activityId,
      lapNumber: firebaseLap.lapNumber,
      lapDuration: firebaseLap.lapDuration,
      lapDistance: firebaseLap.lapDistance,
      avgHR: firebaseLap.avgHR,
      maxHR: firebaseLap.maxHR,
      avgSpeed: firebaseLap.avgSpeed,
      maxSpeed: firebaseLap.maxSpeed,
      avgPace: firebaseLap.avgPace,
      elevationGain: firebaseLap.elevationGain,
      elevationLoss: firebaseLap.elevationLoss,
      avgPower: firebaseLap.avgPower,
      maxPower: firebaseLap.maxPower,
      normalizedPower: firebaseLap.normalizedPower,
      startTime: firebaseLap.startTime,
      endTime: firebaseLap.endTime,
      splitType: firebaseLap.splitType
    };
  }

  /**
   * Add new activity to Firebase and update cache
   */
  async addActivity(activity: ActivityMetrics): Promise<string> {
    try {
      if (AuthService.isAuthenticated()) {
        // Convert to Firebase format and save
        const firebaseActivity: Omit<FirebaseActivity, 'id' | 'userId' | 'uploadedAt'> = {
          date: activity.date,
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
          notes: activity.notes,
          processed: true
        };

        const activityId = await FirestoreService.addActivity(firebaseActivity);
        this.clearCache(); // Clear cache to force refresh
        return activityId;
      } else {
        // Fallback to localStorage
        return this.addActivityToLocalStorage(activity);
      }
    } catch (error) {
      console.error('Failed to add activity:', error);
      throw error;
    }
  }

  /**
   * Add lap data to Firebase
   */
  async addLapData(laps: LapMetrics[]): Promise<void> {
    try {
      if (AuthService.isAuthenticated()) {
        // Convert to Firebase format
        const firebaseLaps: Omit<FirebaseLapData, 'id' | 'userId'>[] = laps.map(lap => ({
          activityId: lap.activityId || '',
          lapNumber: lap.lapNumber,
          lapDuration: lap.lapDuration,
          lapDistance: lap.lapDistance,
          avgHR: lap.avgHR,
          maxHR: lap.maxHR,
          avgSpeed: lap.avgSpeed,
          maxSpeed: lap.maxSpeed,
          avgPace: lap.avgPace,
          elevationGain: lap.elevationGain,
          elevationLoss: lap.elevationLoss,
          avgPower: lap.avgPower,
          maxPower: lap.maxPower,
          normalizedPower: lap.normalizedPower,
          startTime: lap.startTime,
          endTime: lap.endTime,
          splitType: lap.splitType
        }));

        await FirestoreService.addLapData(firebaseLaps);
        this.clearCache(); // Clear cache to force refresh
      } else {
        // Fallback to localStorage
        this.addLapDataToLocalStorage(laps);
      }
    } catch (error) {
      console.error('Failed to add lap data:', error);
      throw error;
    }
  }

  /**
   * Fallback method to add activity to localStorage
   */
  private addActivityToLocalStorage(activity: ActivityMetrics): string {
    const savedActivities = localStorage.getItem('dashboard-activities');
    const activities: ActivityMetrics[] = savedActivities ? JSON.parse(savedActivities) : [];
    
    // Generate a simple ID
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const activityWithId = { ...activity, activityId };
    
    activities.push(activityWithId);
    localStorage.setItem('dashboard-activities', JSON.stringify(activities));
    
    this.clearCache();
    return activityId;
  }

  /**
   * Fallback method to add lap data to localStorage
   */
  private addLapDataToLocalStorage(laps: LapMetrics[]): void {
    const savedLaps = localStorage.getItem('dashboard-laps');
    const allLaps: LapMetrics[] = savedLaps ? JSON.parse(savedLaps) : [];
    
    allLaps.push(...laps);
    localStorage.setItem('dashboard-laps', JSON.stringify(allLaps));
    
    this.clearCache();
  }

  /**
   * Export dashboard data to JSON
   */
  async exportDashboardData(): Promise<string> {
    try {
      const data = await this.getDashboardData();
      return JSON.stringify({
        exportDate: new Date().toISOString(),
        activities: data.activities,
        laps: data.laps,
        metrics: data.metrics
      }, null, 2);
    } catch (error) {
      console.error('Failed to export dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get trend analysis for the last N weeks
   */
  async getTrendAnalysis(weeks = 4): Promise<{
    weeklyLoads: Array<{ week: string; load: number; change: number }>;
    totalTrend: 'increasing' | 'stable' | 'decreasing';
    avgWeeklyLoad: number;
  }> {
    try {
      const data = await this.getDashboardData();
      const now = new Date();
      const weeklyLoads: Array<{ week: string; load: number; change: number }> = [];

      for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7) - now.getDay() + 1); // Start of week (Monday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekActivities = data.activities.filter(activity => {
          const activityDate = new Date(activity.date);
          return activityDate >= weekStart && activityDate <= weekEnd;
        });

        const weekLoad = weekActivities.reduce((sum, a) => sum + a.trainingLoad, 0);
        const prevWeekLoad = i === weeks - 1 ? weekLoad : weeklyLoads[weeklyLoads.length - 1]?.load || 0;
        const change = prevWeekLoad > 0 ? ((weekLoad - prevWeekLoad) / prevWeekLoad) * 100 : 0;

        weeklyLoads.push({
          week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
          load: Math.round(weekLoad),
          change: Math.round(change)
        });
      }

      const avgWeeklyLoad = weeklyLoads.reduce((sum, w) => sum + w.load, 0) / weeks;
      const firstWeekLoad = weeklyLoads[0]?.load || 0;
      const lastWeekLoad = weeklyLoads[weeklyLoads.length - 1]?.load || 0;
      
      let totalTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (firstWeekLoad > 0) {
        const totalChange = ((lastWeekLoad - firstWeekLoad) / firstWeekLoad) * 100;
        if (totalChange > 10) totalTrend = 'increasing';
        else if (totalChange < -10) totalTrend = 'decreasing';
      }

      return {
        weeklyLoads,
        totalTrend,
        avgWeeklyLoad: Math.round(avgWeeklyLoad)
      };
    } catch (error) {
      console.error('Failed to get trend analysis:', error);
      return {
        weeklyLoads: [],
        totalTrend: 'stable',
        avgWeeklyLoad: 0
      };
    }
  }
}