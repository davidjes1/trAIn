import { DashboardService } from '../../services/DashboardService';
import { ChartService } from '../../services/ChartService';
import { UIHelpers } from '../../utils/ui-helpers';

export class DashboardManager {
  private dashboardService: DashboardService;
  private chartService: ChartService;
  private isInitialized = false;
  private updateInterval: number | null = null;

  constructor() {
    // Simplified constructor - no longer dependent on Google Sheets
    this.dashboardService = new DashboardService();
    this.chartService = new ChartService();
  }

  /**
   * Initialize the dashboard
   */
  async initialize(): Promise<boolean> {
    try {
      UIHelpers.showStatus('Initializing dashboard...', 'info');
      
      const success = await this.dashboardService.initialize();
      if (!success) {
        UIHelpers.showStatus('Failed to initialize dashboard service', 'error');
        return false;
      }

      this.isInitialized = true;
      this.setupEventListeners();
      
      // Load initial dashboard data
      await this.loadDashboard();
      
      // Set up auto-refresh every 5 minutes
      this.startAutoRefresh();
      
      UIHelpers.clearStatus();
      return true;
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      UIHelpers.showStatus(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return false;
    }
  }

  /**
   * Load and display dashboard data
   */
  async loadDashboard(forceRefresh = false): Promise<void> {
    if (!this.isInitialized) {
      UIHelpers.showStatus('Dashboard not initialized', 'error');
      return;
    }

    try {
      UIHelpers.showStatus('Loading dashboard data...', 'info');
      
      const dashboardData = await this.dashboardService.getDashboardData(forceRefresh);
      
      // Update status panels
      this.updateStatusPanels(dashboardData.metrics);
      
      // Update charts
      this.updateCharts(dashboardData.metrics);
      
      // Update activity logs
      this.updateActivityLogs(dashboardData.activities.slice(0, 10)); // Last 10 activities
      
      // Update last updated timestamp
      this.updateTimestamp(dashboardData.lastUpdated);
      
      UIHelpers.showStatus(`Dashboard updated - ${dashboardData.activities.length} activities loaded`, 'success');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => UIHelpers.clearStatus(), 3000);
      
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      UIHelpers.showStatus(`Load failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  /**
   * Update status panels
   */
  private updateStatusPanels(metrics: any): void {
    // Fatigue Risk Panel
    const fatiguePanel = document.getElementById('fatigue-risk-panel');
    if (fatiguePanel) {
      const riskElement = fatiguePanel.querySelector('.risk-level');
      const indicatorElement = fatiguePanel.querySelector('.risk-indicator');
      
      if (riskElement && indicatorElement) {
        riskElement.textContent = metrics.currentFatigueRisk.toUpperCase();
        indicatorElement.className = `risk-indicator risk-${metrics.currentFatigueRisk}`;
      }
    }

    // Readiness Score Panel
    const readinessPanel = document.getElementById('readiness-score-panel');
    if (readinessPanel) {
      const scoreElement = readinessPanel.querySelector('.readiness-score');
      const progressElement = readinessPanel.querySelector('.readiness-progress');
      
      if (scoreElement && progressElement) {
        scoreElement.textContent = `${metrics.readinessScore}/100`;
        (progressElement as HTMLElement).style.width = `${metrics.readinessScore}%`;
      }
    }

    // Weekly Training Load Panel
    const loadPanel = document.getElementById('weekly-load-panel');
    if (loadPanel) {
      const loadElement = loadPanel.querySelector('.training-load');
      const trendElement = loadPanel.querySelector('.load-trend');
      
      if (loadElement && trendElement) {
        loadElement.textContent = `${metrics.weeklyTrainingLoad} TRIMP`;
        trendElement.className = `load-trend trend-${metrics.trainingLoadTrend}`;
        trendElement.textContent = this.getTrendIcon(metrics.trainingLoadTrend);
      }
    }

    // Streak Panel
    const streakPanel = document.getElementById('streak-panel');
    if (streakPanel) {
      const currentStreakElement = streakPanel.querySelector('.current-streak');
      const longestStreakElement = streakPanel.querySelector('.longest-streak');
      
      if (currentStreakElement && longestStreakElement) {
        currentStreakElement.textContent = `${metrics.currentStreak} days`;
        longestStreakElement.textContent = `Best: ${metrics.longestStreak} days`;
      }
    }

    // Zone Distribution Bars
    this.updateZoneBars(metrics.weeklyZoneDistribution);

    // Injury Risk Factors
    this.updateInjuryRiskAlerts(metrics.injuryRiskFactors);
  }

  /**
   * Update HR zone distribution bars
   */
  private updateZoneBars(zoneDistribution: any): void {
    const totalMinutes = Object.values(zoneDistribution).reduce((sum: number, minutes: any) => sum + minutes, 0);
    
    if (totalMinutes === 0) return;

    const zones = ['zone1', 'zone2', 'zone3', 'zone4', 'zone5'];
    zones.forEach((zone) => {
      const barElement = document.getElementById(`${zone}-bar`);
      const timeElement = document.getElementById(`${zone}-time`);
      
      if (barElement && timeElement) {
        const minutes = zoneDistribution[zone] || 0;
        const percentage = (minutes / totalMinutes) * 100;
        
        (barElement as HTMLElement).style.width = `${percentage}%`;
        timeElement.textContent = `${minutes}min`;
      }
    });
  }

  /**
   * Update injury risk alerts
   */
  private updateInjuryRiskAlerts(riskFactors: string[]): void {
    const alertsContainer = document.getElementById('injury-risk-alerts');
    if (!alertsContainer) return;

    alertsContainer.innerHTML = '';

    if (riskFactors.length === 0) {
      alertsContainer.innerHTML = '<div class="no-alerts">✅ No injury risk factors detected</div>';
      return;
    }

    riskFactors.forEach(risk => {
      const alertElement = document.createElement('div');
      alertElement.className = 'risk-alert';
      alertElement.innerHTML = `
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">${risk}</span>
      `;
      alertsContainer.appendChild(alertElement);
    });
  }

  /**
   * Update all charts
   */
  private updateCharts(metrics: any): void {
    // HR Trend Chart
    const hrTrendCanvas = document.getElementById('hr-trend-chart') as HTMLCanvasElement;
    if (hrTrendCanvas && metrics.chartData.hrTrendData.length > 0) {
      this.chartService.createHRTrendChart(hrTrendCanvas, metrics.chartData.hrTrendData);
    }

    // Training Load Chart
    const loadChart = document.getElementById('training-load-chart') as HTMLCanvasElement;
    if (loadChart && metrics.chartData.weeklyLoadComparison.length > 0) {
      this.chartService.createTrainingLoadChart(loadChart, metrics.chartData.weeklyLoadComparison);
    }

    // HR Zone Distribution Chart
    const zoneChart = document.getElementById('zone-distribution-chart') as HTMLCanvasElement;
    if (zoneChart) {
      this.chartService.createHRZoneChart(zoneChart, metrics.weeklyZoneDistribution);
    }

    // Daily Load Chart
    const dailyLoadChart = document.getElementById('daily-load-chart') as HTMLCanvasElement;
    if (dailyLoadChart && metrics.chartData.trainingLoadHistory.length > 0) {
      this.chartService.createDailyLoadChart(dailyLoadChart, metrics.chartData.trainingLoadHistory);
    }
  }

  /**
   * Update activity logs table
   */
  private updateActivityLogs(activities: any[]): void {
    const tableBody = document.getElementById('activity-logs-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (activities.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No recent activities</td></tr>';
      return;
    }

    activities.forEach(activity => {
      const row = document.createElement('tr');
      row.className = 'activity-row';
      
      const date = new Date(activity.date).toLocaleDateString();
      const duration = `${Math.round(activity.duration)}min`;
      const distance = activity.distance > 0 ? `${activity.distance.toFixed(1)}km` : '-';
      const avgHR = activity.avgHR ? `${activity.avgHR}bpm` : '-';
      const load = Math.round(activity.trainingLoad);
      
      row.innerHTML = `
        <td class="activity-date">${date}</td>
        <td class="activity-sport">${activity.sport}</td>
        <td class="activity-duration">${duration}</td>
        <td class="activity-distance">${distance}</td>
        <td class="activity-hr">${avgHR}</td>
        <td class="activity-load">${load}</td>
      `;
      
      tableBody.appendChild(row);
    });
  }

  /**
   * Update last updated timestamp
   */
  private updateTimestamp(lastUpdated: Date): void {
    const timestampElement = document.getElementById('last-updated');
    if (timestampElement) {
      timestampElement.textContent = `Last updated: ${lastUpdated.toLocaleString()}`;
    }
  }

  /**
   * Setup event listeners for dashboard controls
   */
  private setupEventListeners(): void {
    // Refresh button
    const refreshBtn = document.getElementById('dashboard-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadDashboard(true));
    }

    // Sign in button
    const signInBtn = document.getElementById('dashboard-signin-btn');
    if (signInBtn) {
      signInBtn.addEventListener('click', async () => {
        const success = await this.dashboardService.signIn();
        if (success) {
          UIHelpers.showStatus('Successfully signed in', 'success');
          await this.loadDashboard(true);
        } else {
          UIHelpers.showStatus('Failed to sign in', 'error');
        }
      });
    }

    // Test connection button
    const testBtn = document.getElementById('test-connection-btn');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const result = await this.dashboardService.testConnection();
        UIHelpers.showStatus(result.message, result.success ? 'success' : 'error');
      });
    }

    // Export chart buttons
    document.querySelectorAll('[data-export-chart]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chartId = (e.target as HTMLElement).getAttribute('data-export-chart');
        if (chartId) {
          this.chartService.exportChartAsImage(chartId);
        }
      });
    });

    // Toggle auto-refresh
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle') as HTMLInputElement;
    if (autoRefreshToggle) {
      autoRefreshToggle.addEventListener('change', (e) => {
        if ((e.target as HTMLInputElement).checked) {
          this.startAutoRefresh();
        } else {
          this.stopAutoRefresh();
        }
      });
    }
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    this.stopAutoRefresh(); // Clear any existing interval
    
    // Refresh every 5 minutes
    this.updateInterval = window.setInterval(() => {
      this.loadDashboard();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop auto-refresh timer
   */
  private stopAutoRefresh(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get trend icon for display
   */
  private getTrendIcon(trend: string): string {
    switch (trend) {
      case 'increasing': return '↗️';
      case 'decreasing': return '↘️';
      case 'stable': return '→';
      default: return '→';
    }
  }

  /**
   * Cleanup dashboard resources
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.chartService.destroyAllCharts();
  }

  /**
   * Show/hide dashboard sections
   */
  toggleSection(sectionId: string): void {
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
  }

  /**
   * Get dashboard statistics for export
   */
  async exportDashboardData(): Promise<void> {
    try {
      const data = await this.dashboardService.exportDashboardData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      UIHelpers.showStatus('Dashboard data exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      UIHelpers.showStatus('Export failed', 'error');
    }
  }
}