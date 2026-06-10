// Fitness-Fatigue-Form Chart Component
// Displays CTL (Chronic Training Load), ATL (Acute Training Load), and TSB (Training Stress Balance)
import { DashboardMetrics } from '../../services/MetricsCalculator';

export class FitnessFatigueChart {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private chart: any = null; // Chart.js instance

  constructor(container: HTMLElement) {
    this.container = container;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'fitness-fatigue-chart';
    this.container.appendChild(this.canvas);

    // Load Chart.js if not already loaded
    await this.loadChartJS();
  }

  /**
   * Load Chart.js library dynamically
   */
  private async loadChartJS(): Promise<void> {
    if (typeof (window as any).Chart !== 'undefined') {
      return; // Already loaded
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Chart.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Update chart with new data
   */
  public async update(metrics: DashboardMetrics): Promise<void> {
    if (!this.canvas) {
      console.error('Canvas not initialized');
      return;
    }

    const { fitnessForm, chartData } = metrics;
    const history = chartData.fitnessFormHistory;

    if (history.length === 0) {
      this.showNoData();
      return;
    }

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    // Create new chart
    const Chart = (window as any).Chart;
    if (!Chart) {
      console.error('Chart.js not loaded');
      return;
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: history.map(h => this.formatDate(h.date)),
        datasets: [
          {
            label: 'CTL (Fitness)',
            data: history.map(h => h.ctl),
            borderColor: 'rgb(34, 197, 94)', // green-500
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4
          },
          {
            label: 'ATL (Fatigue)',
            data: history.map(h => h.atl),
            borderColor: 'rgb(239, 68, 68)', // red-500
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4
          },
          {
            label: 'TSB (Form)',
            data: history.map(h => h.tsb),
            borderColor: 'rgb(59, 130, 246)', // blue-500
            backgroundColor: (context: any) => {
              const value = context.parsed.y;
              if (value > 0) {
                return 'rgba(34, 197, 94, 0.2)'; // Positive = rested (green)
              } else {
                return 'rgba(239, 68, 68, 0.2)'; // Negative = fatigued (red)
              }
            },
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              title: (tooltipItems: any[]) => {
                return tooltipItems[0].label;
              },
              label: (context: any) => {
                const label = context.dataset.label || '';
                const value = Math.round(context.parsed.y * 10) / 10;

                // Add interpretation
                if (label.includes('TSB')) {
                  let status = '';
                  if (value > 25) status = ' (Fresh)';
                  else if (value >= 5) status = ' (Optimal)';
                  else if (value >= -10) status = ' (Productive)';
                  else if (value >= -30) status = ' (Overreaching)';
                  else status = ' (High Risk)';

                  return `${label}: ${value}${status}`;
                }

                return `${label}: ${value}`;
              }
            }
          },
          annotation: {
            annotations: {
              zeroLine: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: 'rgba(0, 0, 0, 0.3)',
                borderWidth: 1,
                borderDash: [5, 5]
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 0,
              autoSkipPadding: 20,
              font: {
                size: 10
              }
            }
          },
          y: {
            display: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: 11
              }
            }
          }
        }
      }
    });

    // Update status summary
    this.updateStatusSummary(fitnessForm);
  }

  /**
   * Update status summary below chart
   */
  private updateStatusSummary(fitnessForm: DashboardMetrics['fitnessForm']): void {
    const summaryEl = this.container.querySelector('.fitness-form-summary');
    if (!summaryEl) {
      const summary = document.createElement('div');
      summary.className = 'fitness-form-summary';
      this.container.appendChild(summary);
    }

    const summary = this.container.querySelector('.fitness-form-summary');
    if (!summary) return;

    const statusColors: Record<string, string> = {
      'fresh': 'var(--color-success)',
      'optimal': 'var(--color-success)',
      'productive': 'var(--color-info)',
      'maintaining': 'var(--color-warning)',
      'overreaching': 'var(--color-warning)',
      'high_risk': 'var(--color-danger)'
    };

    const statusLabels: Record<string, string> = {
      'fresh': 'Fresh - Consider increasing load',
      'optimal': 'Optimal - Peak performance zone',
      'productive': 'Productive - Building fitness',
      'maintaining': 'Maintaining - Steady state',
      'overreaching': 'Overreaching - Need recovery',
      'high_risk': 'High Risk - Reduce training!'
    };

    summary.innerHTML = `
      <div class="fitness-form-grid">
        <div class="form-metric">
          <div class="form-metric-label">CTL (Fitness)</div>
          <div class="form-metric-value">${fitnessForm.ctl}</div>
          <div class="form-metric-change ${fitnessForm.ctlChange >= 0 ? 'positive' : 'negative'}">
            ${fitnessForm.ctlChange >= 0 ? '↑' : '↓'} ${Math.abs(fitnessForm.ctlChange)} (7d)
          </div>
        </div>
        <div class="form-metric">
          <div class="form-metric-label">ATL (Fatigue)</div>
          <div class="form-metric-value">${fitnessForm.atl}</div>
        </div>
        <div class="form-metric">
          <div class="form-metric-label">TSB (Form)</div>
          <div class="form-metric-value" style="color: ${statusColors[fitnessForm.status]}">${fitnessForm.tsb}</div>
        </div>
        <div class="form-status">
          <div class="status-badge" style="background: ${statusColors[fitnessForm.status]}">
            ${statusLabels[fitnessForm.status]}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show "no data" message
   */
  private showNoData(): void {
    if (!this.canvas) return;
    this.canvas.style.display = 'none';

    let noDataEl = this.container.querySelector('.no-data-message');
    if (!noDataEl) {
      noDataEl = document.createElement('div');
      noDataEl.className = 'no-data-message';
      noDataEl.textContent = 'No training data available. Import activities to see fitness-fatigue trends.';
      this.container.appendChild(noDataEl);
    }
    (noDataEl as HTMLElement).style.display = 'block';
  }

  /**
   * Format date for chart labels
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  }

  /**
   * Destroy chart and cleanup
   */
  public destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
