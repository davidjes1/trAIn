import { ActivityMetrics } from '../types/training-metrics.types';
import { subDays, startOfWeek, endOfWeek, differenceInDays, parseISO, isWithinInterval } from 'date-fns';

export interface DashboardMetrics {
  // Current status
  currentFatigueRisk: 'low' | 'moderate' | 'high';
  readinessScore: number; // 0-100

  // Weekly metrics
  weeklyTrainingLoad: number;
  weeklyZoneDistribution: {
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };

  // Trends and patterns
  trainingLoadTrend: 'increasing' | 'stable' | 'decreasing';
  currentStreak: number; // days
  longestStreak: number; // days

  // Recovery indicators
  hrDriftTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  volumeChangePercent: number; // week over week

  // Injury risk factors
  injuryRiskFactors: string[];

  // Fitness-Fatigue-Form metrics (CTL/ATL/TSB)
  fitnessForm: {
    ctl: number; // Chronic Training Load (Fitness) - 42 day exponential average
    atl: number; // Acute Training Load (Fatigue) - 7 day exponential average
    tsb: number; // Training Stress Balance (Form) = CTL - ATL
    ctlChange: number; // Change in CTL over last 7 days
    status: 'fresh' | 'optimal' | 'productive' | 'maintaining' | 'overreaching' | 'high_risk';
  };

  // Time-based data for charts
  chartData: {
    trainingLoadHistory: Array<{ date: string; load: number; }>;
    weeklyLoadComparison: Array<{ week: string; load: number; recovery: number; }>;
    hrTrendData: Array<{ date: string; avgHR: number; maxHR: number; }>;
    zoneProgressData: Array<{ date: string; zones: number[]; }>;
    fitnessFormHistory: Array<{ date: string; ctl: number; atl: number; tsb: number; }>;
    intensityHeatMap: Array<{ date: string; intensity: number; load: number; duration: number; }>;
  };
}

export class MetricsCalculator {
  /**
   * Calculate comprehensive dashboard metrics from activities
   */
  static calculateDashboardMetrics(activities: ActivityMetrics[]): DashboardMetrics {
    const sortedActivities = activities
      .filter(a => a.date && a.trainingLoad > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sortedActivities.length === 0) {
      return this.getEmptyMetrics();
    }

    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const previousWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
    const previousWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });

    // Current week activities
    const currentWeekActivities = sortedActivities.filter(a => {
      const activityDate = parseISO(a.date);
      return isWithinInterval(activityDate, { start: currentWeekStart, end: currentWeekEnd });
    });

    // Previous week activities
    const previousWeekActivities = sortedActivities.filter(a => {
      const activityDate = parseISO(a.date);
      return isWithinInterval(activityDate, { start: previousWeekStart, end: previousWeekEnd });
    });

    // Recent activities (last 7 days)
    const recentActivities = sortedActivities.filter(a => {
      const activityDate = parseISO(a.date);
      return differenceInDays(now, activityDate) <= 7;
    });

    // Calculate fitness-fatigue-form metrics
    const fitnessForm = this.calculateFitnessForm(sortedActivities);

    return {
      currentFatigueRisk: this.calculateFatigueRisk(recentActivities),
      readinessScore: this.calculateReadinessScore(recentActivities, sortedActivities),
      weeklyTrainingLoad: this.sumTrainingLoad(currentWeekActivities),
      weeklyZoneDistribution: this.calculateZoneDistribution(currentWeekActivities),
      trainingLoadTrend: this.calculateTrainingLoadTrend(sortedActivities),
      currentStreak: this.calculateCurrentStreak(sortedActivities),
      longestStreak: this.calculateLongestStreak(sortedActivities),
      hrDriftTrend: this.calculateHRDriftTrend(recentActivities),
      volumeChangePercent: this.calculateVolumeChange(currentWeekActivities, previousWeekActivities),
      injuryRiskFactors: this.identifyInjuryRiskFactors(recentActivities, sortedActivities),
      fitnessForm,
      chartData: this.generateChartData(sortedActivities)
    };
  }

  /**
   * Calculate fatigue risk based on recent training load and patterns
   */
  private static calculateFatigueRisk(recentActivities: ActivityMetrics[]): 'low' | 'moderate' | 'high' {
    if (recentActivities.length === 0) return 'low';

    const totalLoad = this.sumTrainingLoad(recentActivities);
    const avgDailyLoad = totalLoad / 7; // Over last 7 days
    const highIntensityMinutes = recentActivities.reduce((sum, a) => 
      sum + a.zone4Minutes + a.zone5Minutes, 0);

    // High fatigue indicators
    if (avgDailyLoad > 100 || highIntensityMinutes > 120) return 'high';
    if (avgDailyLoad > 60 || highIntensityMinutes > 60) return 'moderate';
    return 'low';
  }

  /**
   * Calculate readiness score (0-100) based on recent training patterns
   */
  private static calculateReadinessScore(recentActivities: ActivityMetrics[], allActivities: ActivityMetrics[]): number {
    if (recentActivities.length === 0) return 85; // Default high readiness

    let score = 100;

    // Reduce score based on recent training load
    const recentLoad = this.sumTrainingLoad(recentActivities);
    const avgLoad = allActivities.length > 0 ? 
      this.sumTrainingLoad(allActivities) / allActivities.length * 7 : 0;
    
    if (recentLoad > avgLoad * 1.5) score -= 20;
    else if (recentLoad > avgLoad * 1.2) score -= 10;

    // Check for rest days
    const daysSinceLastRest = this.daysSinceLastRest(recentActivities);
    if (daysSinceLastRest > 6) score -= 15;
    else if (daysSinceLastRest > 4) score -= 10;

    // HR drift indicator
    const avgHRDrift = recentActivities
      .filter(a => a.hrDrift !== undefined)
      .reduce((sum, a) => sum + (a.hrDrift || 0), 0) / recentActivities.length;
    
    if (avgHRDrift > 10) score -= 15; // High HR drift indicates fatigue

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate weekly zone distribution
   */
  private static calculateZoneDistribution(activities: ActivityMetrics[]) {
    return activities.reduce((zones, activity) => ({
      zone1: zones.zone1 + activity.zone1Minutes,
      zone2: zones.zone2 + activity.zone2Minutes,
      zone3: zones.zone3 + activity.zone3Minutes,
      zone4: zones.zone4 + activity.zone4Minutes,
      zone5: zones.zone5 + activity.zone5Minutes,
    }), { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 });
  }

  /**
   * Analyze training load trend over recent weeks
   */
  private static calculateTrainingLoadTrend(activities: ActivityMetrics[]): 'increasing' | 'stable' | 'decreasing' {
    if (activities.length < 14) return 'stable'; // Need at least 2 weeks of data

    const now = new Date();
    const twoWeeksAgo = subDays(now, 14);
    const oneWeekAgo = subDays(now, 7);

    const week1Load = activities
      .filter(a => {
        const date = parseISO(a.date);
        return date >= twoWeeksAgo && date < oneWeekAgo;
      })
      .reduce((sum, a) => sum + a.trainingLoad, 0);

    const week2Load = activities
      .filter(a => {
        const date = parseISO(a.date);
        return date >= oneWeekAgo;
      })
      .reduce((sum, a) => sum + a.trainingLoad, 0);

    const changePercent = week1Load > 0 ? ((week2Load - week1Load) / week1Load) * 100 : 0;

    if (changePercent > 15) return 'increasing';
    if (changePercent < -15) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate current training streak
   */
  private static calculateCurrentStreak(activities: ActivityMetrics[]): number {
    if (activities.length === 0) return 0;

    const now = new Date();
    let streak = 0;
    let currentDate = new Date(now);

    // Check each day backwards from today
    for (let i = 0; i < 30; i++) { // Max 30 days to prevent infinite loop
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasActivity = activities.some(a => a.date.startsWith(dateStr));
      
      if (hasActivity) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate longest training streak
   */
  private static calculateLongestStreak(activities: ActivityMetrics[]): number {
    if (activities.length === 0) return 0;

    const activityDates = activities.map(a => a.date.split('T')[0]);
    const uniqueDates = [...new Set(activityDates)].sort();

    let longestStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currentDate = new Date(uniqueDates[i]);
      const daysDiff = differenceInDays(currentDate, prevDate);

      if (daysDiff === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(longestStreak, currentStreak);
  }

  /**
   * Analyze HR drift trend
   */
  private static calculateHRDriftTrend(activities: ActivityMetrics[]): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
    const activitiesWithHRDrift = activities.filter(a => a.hrDrift !== undefined);
    
    if (activitiesWithHRDrift.length < 3) return 'insufficient_data';

    // Take last 3 activities with HR drift data
    const recentDrift = activitiesWithHRDrift.slice(-3);
    const avgRecentDrift = recentDrift.reduce((sum, a) => sum + (a.hrDrift || 0), 0) / recentDrift.length;

    // Compare with longer-term average if available
    if (activitiesWithHRDrift.length >= 6) {
      const olderDrift = activitiesWithHRDrift.slice(-6, -3);
      const avgOlderDrift = olderDrift.reduce((sum, a) => sum + (a.hrDrift || 0), 0) / olderDrift.length;
      
      if (avgRecentDrift < avgOlderDrift - 2) return 'improving';
      if (avgRecentDrift > avgOlderDrift + 2) return 'declining';
    }

    return 'stable';
  }

  /**
   * Calculate volume change percentage
   */
  private static calculateVolumeChange(currentWeek: ActivityMetrics[], previousWeek: ActivityMetrics[]): number {
    const currentVolume = currentWeek.reduce((sum, a) => sum + a.duration, 0);
    const previousVolume = previousWeek.reduce((sum, a) => sum + a.duration, 0);

    if (previousVolume === 0) return currentVolume > 0 ? 100 : 0;
    return ((currentVolume - previousVolume) / previousVolume) * 100;
  }

  /**
   * Identify potential injury risk factors
   */
  private static identifyInjuryRiskFactors(recentActivities: ActivityMetrics[], allActivities: ActivityMetrics[]): string[] {
    const risks: string[] = [];

    // High volume increase
    const volumeChange = this.calculateVolumeChange(
      recentActivities,
      allActivities.slice(-14, -7) // Previous week
    );
    if (volumeChange > 25) {
      risks.push('High volume increase (>25%)');
    }

    // High training load
    const recentLoad = this.sumTrainingLoad(recentActivities);
    if (recentLoad > 500) {
      risks.push('High weekly training load');
    }

    // Lack of recovery
    const daysSinceRest = this.daysSinceLastRest(recentActivities);
    if (daysSinceRest > 6) {
      risks.push('No rest days in over 6 days');
    }

    // High intensity ratio
    const totalMinutes = recentActivities.reduce((sum, a) => sum + a.duration, 0);
    const highIntensityMinutes = recentActivities.reduce((sum, a) => 
      sum + a.zone4Minutes + a.zone5Minutes, 0);
    
    if (totalMinutes > 0 && (highIntensityMinutes / totalMinutes) > 0.3) {
      risks.push('High intensity ratio (>30%)');
    }

    return risks;
  }

  /**
   * Calculate CTL (Chronic Training Load), ATL (Acute Training Load), and TSB (Training Stress Balance)
   * Uses exponential weighted moving average (EWMA) to model fitness and fatigue
   */
  private static calculateFitnessForm(activities: ActivityMetrics[]) {
    if (activities.length === 0) {
      return {
        ctl: 0,
        atl: 0,
        tsb: 0,
        ctlChange: 0,
        status: 'maintaining' as const
      };
    }

    const now = new Date();
    const ctlTimeConstant = 42; // Fitness builds slowly over ~6 weeks
    const atlTimeConstant = 7;  // Fatigue responds quickly over ~1 week

    // Calculate daily training loads
    const dailyLoads = this.generateDailyTrainingLoads(activities);

    let ctl = 0;
    let atl = 0;
    let previousCTL = 0;

    // Calculate exponential moving averages
    dailyLoads.forEach((dayLoad, index) => {
      // Store previous CTL for tracking change
      if (index === dailyLoads.length - 8) {
        previousCTL = ctl;
      }

      // EWMA formulas:
      // CTL_today = CTL_yesterday + (TSS_today - CTL_yesterday) * (1 / timeConstant)
      ctl = ctl + (dayLoad.load - ctl) * (1 / ctlTimeConstant);
      atl = atl + (dayLoad.load - atl) * (1 / atlTimeConstant);
    });

    const tsb = ctl - atl;
    const ctlChange = ctl - previousCTL;

    // Determine training status based on TSB
    let status: 'fresh' | 'optimal' | 'productive' | 'maintaining' | 'overreaching' | 'high_risk';
    if (tsb > 25) status = 'fresh';
    else if (tsb >= 5 && tsb <= 25) status = 'optimal';
    else if (tsb >= -10 && tsb < 5) status = 'productive';
    else if (tsb >= -30 && tsb < -10) status = 'overreaching';
    else if (tsb < -30) status = 'high_risk';
    else status = 'maintaining';

    return {
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      ctlChange: Math.round(ctlChange * 10) / 10,
      status
    };
  }

  /**
   * Generate daily training loads with date gaps filled
   */
  private static generateDailyTrainingLoads(activities: ActivityMetrics[]): Array<{ date: string; load: number }> {
    if (activities.length === 0) return [];

    const dailyLoads = new Map<string, number>();

    // Sum up loads by day
    activities.forEach(activity => {
      const date = activity.date.split('T')[0];
      dailyLoads.set(date, (dailyLoads.get(date) || 0) + activity.trainingLoad);
    });

    // Fill in all days from first activity to today
    const firstDate = parseISO(activities[0].date);
    const lastDate = new Date();
    const result: Array<{ date: string; load: number }> = [];

    let currentDate = new Date(firstDate);
    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        load: dailyLoads.get(dateStr) || 0
      });
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Generate chart data for dashboard visualizations
   */
  private static generateChartData(activities: ActivityMetrics[]) {
    const last30Days = subDays(new Date(), 30);
    const recentActivities = activities.filter(a => parseISO(a.date) >= last30Days);

    return {
      trainingLoadHistory: this.generateTrainingLoadHistory(recentActivities),
      weeklyLoadComparison: this.generateWeeklyComparison(activities),
      hrTrendData: this.generateHRTrendData(recentActivities),
      zoneProgressData: this.generateZoneProgressData(recentActivities),
      fitnessFormHistory: this.generateFitnessFormHistory(activities),
      intensityHeatMap: this.generateIntensityHeatMap(activities)
    };
  }

  /**
   * Generate historical fitness-fatigue-form data for charting
   */
  private static generateFitnessFormHistory(activities: ActivityMetrics[]) {
    if (activities.length === 0) return [];

    const dailyLoads = this.generateDailyTrainingLoads(activities);
    const ctlTimeConstant = 42;
    const atlTimeConstant = 7;

    let ctl = 0;
    let atl = 0;
    const history: Array<{ date: string; ctl: number; atl: number; tsb: number }> = [];

    // Calculate CTL/ATL for each day
    dailyLoads.forEach(dayLoad => {
      ctl = ctl + (dayLoad.load - ctl) * (1 / ctlTimeConstant);
      atl = atl + (dayLoad.load - atl) * (1 / atlTimeConstant);
      const tsb = ctl - atl;

      history.push({
        date: dayLoad.date,
        ctl: Math.round(ctl * 10) / 10,
        atl: Math.round(atl * 10) / 10,
        tsb: Math.round(tsb * 10) / 10
      });
    });

    // Return last 90 days
    return history.slice(-90);
  }

  /**
   * Generate intensity heat map data for calendar visualization
   */
  private static generateIntensityHeatMap(activities: ActivityMetrics[]) {
    const last90Days = subDays(new Date(), 90);
    const recentActivities = activities.filter(a => parseISO(a.date) >= last90Days);

    const dailyData = new Map<string, { intensity: number; load: number; duration: number }>();

    recentActivities.forEach(activity => {
      const date = activity.date.split('T')[0];
      const existing = dailyData.get(date) || { intensity: 0, load: 0, duration: 0 };

      // Calculate intensity as load per minute
      const activityIntensity = activity.duration > 0 ? activity.trainingLoad / activity.duration : 0;

      dailyData.set(date, {
        intensity: Math.max(existing.intensity, activityIntensity), // Use max intensity for the day
        load: existing.load + activity.trainingLoad,
        duration: existing.duration + activity.duration
      });
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generate daily training load history
   */
  private static generateTrainingLoadHistory(activities: ActivityMetrics[]) {
    const dailyLoads = new Map<string, number>();
    
    activities.forEach(activity => {
      const date = activity.date.split('T')[0];
      dailyLoads.set(date, (dailyLoads.get(date) || 0) + activity.trainingLoad);
    });

    return Array.from(dailyLoads.entries())
      .map(([date, load]) => ({ date, load }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generate weekly load comparison data
   */
  private static generateWeeklyComparison(activities: ActivityMetrics[]) {
    const weeklyData = new Map<string, { load: number; recovery: number }>();
    const now = new Date();

    // Generate last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekKey = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

      const weekActivities = activities.filter(a => {
        const activityDate = parseISO(a.date);
        return isWithinInterval(activityDate, { start: weekStart, end: weekEnd });
      });

      const load = this.sumTrainingLoad(weekActivities);
      const recovery = this.calculateWeekRecoveryScore(weekActivities);

      weeklyData.set(weekKey, { load, recovery });
    }

    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({ week, ...data }));
  }

  /**
   * Generate HR trend data
   */
  private static generateHRTrendData(activities: ActivityMetrics[]) {
    return activities
      .filter(a => a.avgHR && a.maxHR)
      .map(a => ({
        date: a.date.split('T')[0],
        avgHR: a.avgHR!,
        maxHR: a.maxHR!
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generate zone progress data
   */
  private static generateZoneProgressData(activities: ActivityMetrics[]) {
    const dailyZones = new Map<string, number[]>();

    activities.forEach(activity => {
      const date = activity.date.split('T')[0];
      const existingZones = dailyZones.get(date) || [0, 0, 0, 0, 0];
      
      existingZones[0] += activity.zone1Minutes;
      existingZones[1] += activity.zone2Minutes;
      existingZones[2] += activity.zone3Minutes;
      existingZones[3] += activity.zone4Minutes;
      existingZones[4] += activity.zone5Minutes;
      
      dailyZones.set(date, existingZones);
    });

    return Array.from(dailyZones.entries())
      .map(([date, zones]) => ({ date, zones }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Helper: Sum training load for activities
   */
  private static sumTrainingLoad(activities: ActivityMetrics[]): number {
    return activities.reduce((sum, a) => sum + a.trainingLoad, 0);
  }

  /**
   * Helper: Days since last rest day
   */
  private static daysSinceLastRest(activities: ActivityMetrics[]): number {
    const now = new Date();
    const activityDates = activities.map(a => parseISO(a.date));
    
    for (let i = 0; i < 14; i++) {
      const checkDate = subDays(now, i);
      const hasActivity = activityDates.some(date => 
        date.toDateString() === checkDate.toDateString()
      );
      
      if (!hasActivity) return i;
    }
    
    return 14; // More than 2 weeks without rest
  }

  /**
   * Helper: Calculate recovery score for a week
   */
  private static calculateWeekRecoveryScore(weekActivities: ActivityMetrics[]): number {
    if (weekActivities.length === 0) return 100;
    
    const avgLoad = this.sumTrainingLoad(weekActivities) / 7;
    const restDays = 7 - new Set(weekActivities.map(a => a.date.split('T')[0])).size;
    
    // Higher recovery score for more rest days and lower average load
    return Math.min(100, (restDays * 20) + Math.max(0, 40 - avgLoad));
  }

  /**
   * Helper: Get empty metrics for no data scenario
   */
  private static getEmptyMetrics(): DashboardMetrics {
    return {
      currentFatigueRisk: 'low',
      readinessScore: 85,
      weeklyTrainingLoad: 0,
      weeklyZoneDistribution: { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 },
      trainingLoadTrend: 'stable',
      currentStreak: 0,
      longestStreak: 0,
      hrDriftTrend: 'insufficient_data',
      volumeChangePercent: 0,
      injuryRiskFactors: [],
      fitnessForm: {
        ctl: 0,
        atl: 0,
        tsb: 0,
        ctlChange: 0,
        status: 'maintaining'
      },
      chartData: {
        trainingLoadHistory: [],
        weeklyLoadComparison: [],
        hrTrendData: [],
        zoneProgressData: [],
        fitnessFormHistory: [],
        intensityHeatMap: []
      }
    };
  }
}