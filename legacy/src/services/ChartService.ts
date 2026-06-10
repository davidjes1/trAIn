import {
  Chart,
  ChartConfiguration,
  ChartTypeRegistry,
  registerables,
  TooltipItem
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { DashboardMetrics } from './MetricsCalculator';

// Register Chart.js components
Chart.register(...registerables);

export interface ChartColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  zone1: string;
  zone2: string;
  zone3: string;
  zone4: string;
  zone5: string;
}

export class ChartService {
  private static readonly COLORS: ChartColors = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    zone1: '#4CAF50',
    zone2: '#8BC34A', 
    zone3: '#FFC107',
    zone4: '#FF9800',
    zone5: '#F44336'
  };

  private charts: Map<string, Chart> = new Map();

  /**
   * Create heart rate trend chart
   */
  createHRTrendChart(canvas: HTMLCanvasElement, data: DashboardMetrics['chartData']['hrTrendData']): Chart {
    const chartId = 'hr-trend';
    this.destroyChart(chartId);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Average HR',
            data: data.map(d => ({ x: d.date as any, y: d.avgHR })),
            borderColor: ChartService.COLORS.primary,
            backgroundColor: ChartService.COLORS.primary + '20',
            borderWidth: 2,
            tension: 0.4,
            fill: false
          },
          {
            label: 'Max HR',
            data: data.map(d => ({ x: d.date as any, y: d.maxHR })),
            borderColor: ChartService.COLORS.error,
            backgroundColor: ChartService.COLORS.error + '20',
            borderWidth: 2,
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Heart Rate Trends',
            color: '#ffffff',
            font: { size: 16 }
          },
          legend: {
            labels: { color: '#ffffff' }
          },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<'line'>) => {
                return `${context.dataset.label}: ${context.parsed.y} bpm`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: { day: 'MMM dd' }
            },
            ticks: { color: '#ffffff' },
            grid: { color: '#ffffff20' }
          },
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Heart Rate (bpm)',
              color: '#ffffff'
            },
            ticks: { color: '#ffffff' },
            grid: { color: '#ffffff20' }
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(chartId, chart);
    return chart;
  }

  /**
   * Create training load vs recovery chart
   */
  createTrainingLoadChart(canvas: HTMLCanvasElement, data: DashboardMetrics['chartData']['weeklyLoadComparison']): Chart {
    const chartId = 'training-load';
    this.destroyChart(chartId);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(d => d.week),
        datasets: [
          {
            label: 'Training Load',
            data: data.map(d => d.load),
            backgroundColor: ChartService.COLORS.primary + '80',
            borderColor: ChartService.COLORS.primary,
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Recovery Score',
            data: data.map(d => d.recovery),
            backgroundColor: ChartService.COLORS.success + '80',
            borderColor: ChartService.COLORS.success,
            borderWidth: 1,
            type: 'line',
            yAxisID: 'y1',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Weekly Training Load vs Recovery',
            color: '#ffffff',
            font: { size: 16 }
          },
          legend: {
            labels: { color: '#ffffff' }
          },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<keyof ChartTypeRegistry>) => {
                const suffix = context.datasetIndex === 0 ? ' TRIMP' : '/100';
                return `${context.dataset.label}: ${context.parsed.y}${suffix}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#ffffff' },
            grid: { color: '#ffffff20' }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Training Load (TRIMP)',
              color: '#ffffff'
            },
            ticks: { color: '#ffffff' },
            grid: { color: '#ffffff20' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Recovery Score',
              color: '#ffffff'
            },
            ticks: { color: '#ffffff' },
            grid: { drawOnChartArea: false, color: '#ffffff20' },
            min: 0,
            max: 100
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(chartId, chart);
    return chart;
  }

  /**
   * Create HR zone distribution chart
   */
  createHRZoneChart(canvas: HTMLCanvasElement, zoneData: DashboardMetrics['weeklyZoneDistribution']): Chart {
    const chartId = 'hr-zones';
    this.destroyChart(chartId);

    const totalMinutes = Object.values(zoneData).reduce((sum, minutes) => sum + minutes, 0);
    
    if (totalMinutes === 0) {
      return this.createEmptyChart(canvas, 'No HR Zone Data Available');
    }

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'],
        datasets: [{
          data: [
            zoneData.zone1,
            zoneData.zone2, 
            zoneData.zone3,
            zoneData.zone4,
            zoneData.zone5
          ],
          backgroundColor: [
            ChartService.COLORS.zone1,
            ChartService.COLORS.zone2,
            ChartService.COLORS.zone3,
            ChartService.COLORS.zone4,
            ChartService.COLORS.zone5
          ],
          borderWidth: 2,
          borderColor: '#ffffff40'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'HR Zone Distribution (This Week)',
            color: '#ffffff',
            font: { size: 16 }
          },
          legend: {
            position: 'bottom',
            labels: { 
              color: '#ffffff',
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<'doughnut'>) => {
                const minutes = context.parsed;
                const percentage = totalMinutes > 0 ? ((minutes / totalMinutes) * 100).toFixed(1) : '0';
                return `${context.label}: ${minutes}min (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(chartId, chart);
    return chart;
  }

  /**
   * Create daily training load history chart
   */
  createDailyLoadChart(canvas: HTMLCanvasElement, data: DashboardMetrics['chartData']['trainingLoadHistory']): Chart {
    const chartId = 'daily-load';
    this.destroyChart(chartId);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        datasets: [{
          label: 'Daily Training Load',
          data: data.map(d => ({ x: d.date as any, y: d.load })),
          backgroundColor: ChartService.COLORS.secondary + '60',
          borderColor: ChartService.COLORS.secondary,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Daily Training Load (Last 30 Days)',
            color: '#ffffff',
            font: { size: 16 }
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<'bar'>) => {
                return `Load: ${context.parsed.y} TRIMP`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: { day: 'MMM dd' }
            },
            ticks: { color: '#ffffff' },
            grid: { color: '#ffffff20' }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Training Load (TRIMP)',
              color: '#ffffff'
            },
            ticks: { color: '#ffffff' },
            grid: { color: '#ffffff20' }
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(chartId, chart);
    return chart;
  }

  /**
   * Create zone progress over time chart
   */
  createZoneProgressChart(canvas: HTMLCanvasElement, data: DashboardMetrics['chartData']['zoneProgressData']): Chart {
    const chartId = 'zone-progress';
    this.destroyChart(chartId);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Zone 1',
            data: data.map(d => ({ x: d.date as any, y: d.zones[0] })),
            borderColor: ChartService.COLORS.zone1,
            backgroundColor: ChartService.COLORS.zone1 + '20',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Zone 2', 
            data: data.map(d => ({ x: d.date as any, y: d.zones[1] })),
            borderColor: ChartService.COLORS.zone2,
            backgroundColor: ChartService.COLORS.zone2 + '20',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Zone 3',
            data: data.map(d => ({ x: d.date as any, y: d.zones[2] })),
            borderColor: ChartService.COLORS.zone3,
            backgroundColor: ChartService.COLORS.zone3 + '20',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Zone 4',
            data: data.map(d => ({ x: d.date as any, y: d.zones[3] })),
            borderColor: ChartService.COLORS.zone4,
            backgroundColor: ChartService.COLORS.zone4 + '20',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Zone 5',
            data: data.map(d => ({ x: d.date as any, y: d.zones[4] })),
            borderColor: ChartService.COLORS.zone5,
            backgroundColor: ChartService.COLORS.zone5 + '20',
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Zone Time Progress',
            color: '#ffffff',
            font: { size: 16 }
          },
          legend: {
            position: 'bottom',
            labels: { 
              color: '#ffffff',
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<'line'>) => {
                return `${context.dataset.label}: ${context.parsed.y}min`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: { day: 'MMM dd' }
            },
            ticks: { color: '#ffffff' },
            grid: { color: '#ffffff20' }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Minutes',
              color: '#ffffff'
            },
            ticks: { color: '#ffffff' },
            grid: { color: '#ffffff20' }
          }
        }
      }
    };

    const chart = new Chart(canvas, config);
    this.charts.set(chartId, chart);
    return chart;
  }

  /**
   * Create empty chart placeholder
   */
  private createEmptyChart(canvas: HTMLCanvasElement, message: string): Chart {
    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#ffffff20'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: message,
            color: '#ffffff',
            font: { size: 16 }
          },
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        }
      }
    };

    return new Chart(canvas, config);
  }

  /**
   * Update chart data
   */
  updateChart(chartId: string, newData: any): void {
    const chart = this.charts.get(chartId);
    if (chart) {
      chart.data = newData;
      chart.update();
    }
  }

  /**
   * Destroy a specific chart
   */
  destroyChart(chartId: string): void {
    const chart = this.charts.get(chartId);
    if (chart) {
      chart.destroy();
      this.charts.delete(chartId);
    }
  }

  /**
   * Destroy all charts
   */
  destroyAllCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }

  /**
   * Resize all charts (useful for responsive updates)
   */
  resizeAllCharts(): void {
    this.charts.forEach(chart => chart.resize());
  }

  /**
   * Get chart instance by ID
   */
  getChart(chartId: string): Chart | undefined {
    return this.charts.get(chartId);
  }

  /**
   * Get all chart IDs
   */
  getChartIds(): string[] {
    return Array.from(this.charts.keys());
  }

  /**
   * Apply dark theme colors to all charts
   */
  applyDarkTheme(): void {
    this.charts.forEach(chart => {
      if (chart.options.plugins?.title) {
        chart.options.plugins.title.color = '#ffffff';
      }
      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = '#ffffff';
      }
      if (chart.options.scales) {
        Object.values(chart.options.scales).forEach(scale => {
          if (scale && scale.ticks) (scale.ticks as any).color = '#ffffff';
          if (scale && scale.grid) (scale.grid as any).color = '#ffffff20';
          if (scale && (scale as any).title) (scale as any).title.color = '#ffffff';
        });
      }
      chart.update();
    });
  }

  /**
   * Export chart as image
   */
  exportChartAsImage(chartId: string, filename?: string): void {
    const chart = this.charts.get(chartId);
    if (chart) {
      const url = chart.toBase64Image('image/png', 1);
      const link = document.createElement('a');
      link.download = filename || `${chartId}-chart.png`;
      link.href = url;
      link.click();
    }
  }

  /**
   * Get default colors
   */
  static getColors(): ChartColors {
    return { ...ChartService.COLORS };
  }
}