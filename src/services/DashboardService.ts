import { MetricsCalculator, DashboardMetrics } from './MetricsCalculator';
import { ActivityMetrics, LapMetrics } from '../types/training-metrics.types';

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
      let activities: ActivityMetrics[] = [];
      let laps: LapMetrics[] = [];

      // Load data from localStorage (temporary until Firebase integration)
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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      
      // Return cached data if available, even if expired
      if (this.cachedData) {
        console.warn('Using expired cached data due to error');
        return this.cachedData;
      }
      
      // Return empty data as fallback
      return this.getEmptyDashboardData();
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
   * Test connection - simplified for localStorage mode
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test localStorage availability
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return { 
        success: true, 
        message: 'Local storage connection successful' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Local storage not available' 
      };
    }
  }

  /**
   * Initialize dashboard service - simplified for localStorage mode
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
   * Sign in - not needed in localStorage mode
   */
  async signIn(): Promise<boolean> {
    // No authentication needed for localStorage mode
    return true;
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