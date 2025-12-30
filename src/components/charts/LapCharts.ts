// Lap Charts Component
// Displays detailed lap-by-lap analysis with interactive charts
import { LapMetrics } from '@/core/models';

export class LapCharts {
  private container: HTMLElement;
  private laps: LapMetrics[] = [];
  private charts: any[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.initialize();
  }

  private async initialize(): Promise<void> {
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
   * Update charts with lap data
   */
  public async update(laps: LapMetrics[]): Promise<void> {
    this.laps = laps;

    if (laps.length === 0) {
      this.showNoData();
      return;
    }

    this.render();
  }

  /**
   * Render lap charts
   */
  private render(): void {
    // Destroy existing charts
    this.destroyCharts();

    this.container.innerHTML = `
      <div class="lap-charts-container">
        <div class="lap-summary">
          <h4>Lap Analysis (${this.laps.length} laps)</h4>
        </div>

        <div class="lap-charts-grid">
          <!-- Pace/Speed Chart -->
          <div class="chart-card">
            <h5>Pace/Speed by Lap</h5>
            <canvas id="lap-pace-chart"></canvas>
          </div>

          <!-- Heart Rate Chart -->
          ${this.hasHeartRateData() ? `
            <div class="chart-card">
              <h5>Heart Rate by Lap</h5>
              <canvas id="lap-hr-chart"></canvas>
            </div>
          ` : ''}

          <!-- Elevation Chart -->
          ${this.hasElevationData() ? `
            <div class="chart-card">
              <h5>Elevation Gain/Loss by Lap</h5>
              <canvas id="lap-elevation-chart"></canvas>
            </div>
          ` : ''}

          <!-- Power Chart (for cycling) -->
          ${this.hasPowerData() ? `
            <div class="chart-card">
              <h5>Power by Lap</h5>
              <canvas id="lap-power-chart"></canvas>
            </div>
          ` : ''}
        </div>

        <!-- Lap Table -->
        <div class="lap-table-container">
          <h5>Lap Details Table</h5>
          ${this.renderLapTable()}
        </div>
      </div>
    `;

    // Create charts
    this.createPaceChart();
    if (this.hasHeartRateData()) this.createHRChart();
    if (this.hasElevationData()) this.createElevationChart();
    if (this.hasPowerData()) this.createPowerChart();
  }

  /**
   * Create pace/speed chart
   */
  private createPaceChart(): void {
    const canvas = document.getElementById('lap-pace-chart') as HTMLCanvasElement;
    if (!canvas) return;

    const Chart = (window as any).Chart;
    if (!Chart) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hasPace = this.laps.some(lap => lap.avgPace);
    const hasSpeed = this.laps.some(lap => lap.avgSpeed);

    const datasets: any[] = [];

    if (hasPace) {
      datasets.push({
        label: 'Avg Pace (min/km)',
        data: this.laps.map(lap => lap.avgPace),
        borderColor: 'rgb(99, 102, 241)', // indigo-500
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        fill: false,
        yAxisID: 'y-pace'
      });
    }

    if (hasSpeed) {
      datasets.push({
        label: 'Avg Speed (km/h)',
        data: this.laps.map(lap => lap.avgSpeed),
        borderColor: 'rgb(16, 185, 129)', // emerald-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: false,
        yAxisID: 'y-speed'
      });
    }

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.laps.map((_, i) => `Lap ${i + 1}`),
        datasets
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
            position: 'top'
          }
        },
        scales: {
          ...(hasPace && {
            'y-pace': {
              type: 'linear',
              display: true,
              position: 'left',
              reverse: true, // Lower pace is better
              title: {
                display: true,
                text: 'Pace (min/km)'
              }
            }
          }),
          ...(hasSpeed && {
            'y-speed': {
              type: 'linear',
              display: true,
              position: hasPace ? 'right' : 'left',
              title: {
                display: true,
                text: 'Speed (km/h)'
              }
            }
          })
        }
      }
    });

    this.charts.push(chart);
  }

  /**
   * Create heart rate chart
   */
  private createHRChart(): void {
    const canvas = document.getElementById('lap-hr-chart') as HTMLCanvasElement;
    if (!canvas) return;

    const Chart = (window as any).Chart;
    if (!Chart) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.laps.map((_, i) => `Lap ${i + 1}`),
        datasets: [
          {
            label: 'Avg HR',
            data: this.laps.map(lap => lap.avgHR),
            backgroundColor: 'rgba(239, 68, 68, 0.5)', // red-500
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1
          },
          {
            label: 'Max HR',
            data: this.laps.map(lap => lap.maxHR),
            backgroundColor: 'rgba(220, 38, 38, 0.5)', // red-600
            borderColor: 'rgb(220, 38, 38)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Heart Rate (bpm)'
            }
          }
        }
      }
    });

    this.charts.push(chart);
  }

  /**
   * Create elevation chart
   */
  private createElevationChart(): void {
    const canvas = document.getElementById('lap-elevation-chart') as HTMLCanvasElement;
    if (!canvas) return;

    const Chart = (window as any).Chart;
    if (!Chart) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.laps.map((_, i) => `Lap ${i + 1}`),
        datasets: [
          {
            label: 'Elevation Gain',
            data: this.laps.map(lap => lap.elevationGain || 0),
            backgroundColor: 'rgba(34, 197, 94, 0.5)', // green-500
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1
          },
          {
            label: 'Elevation Loss',
            data: this.laps.map(lap => -(lap.elevationLoss || 0)),
            backgroundColor: 'rgba(239, 68, 68, 0.5)', // red-500
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Elevation (m)'
            }
          }
        }
      }
    });

    this.charts.push(chart);
  }

  /**
   * Create power chart
   */
  private createPowerChart(): void {
    const canvas = document.getElementById('lap-power-chart') as HTMLCanvasElement;
    if (!canvas) return;

    const Chart = (window as any).Chart;
    if (!Chart) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.laps.map((_, i) => `Lap ${i + 1}`),
        datasets: [
          {
            label: 'Avg Power',
            data: this.laps.map(lap => lap.avgPower),
            borderColor: 'rgb(251, 191, 36)', // amber-400
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            borderWidth: 2,
            fill: false
          },
          {
            label: 'Normalized Power',
            data: this.laps.map(lap => lap.normalizedPower),
            borderColor: 'rgb(245, 158, 11)', // amber-500
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            fill: false,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Power (watts)'
            }
          }
        }
      }
    });

    this.charts.push(chart);
  }

  /**
   * Render lap data table
   */
  private renderLapTable(): string {
    const hasDistance = this.laps.some(lap => lap.lapDistance && lap.lapDistance > 0);
    const hasPace = this.laps.some(lap => lap.avgPace);
    const hasSpeed = this.laps.some(lap => lap.avgSpeed);
    const hasHR = this.laps.some(lap => lap.avgHR);
    const hasElevation = this.laps.some(lap => lap.elevationGain || lap.elevationLoss);
    const hasPower = this.laps.some(lap => lap.avgPower);

    return `
      <div class="lap-table-scroll">
        <table class="lap-table">
          <thead>
            <tr>
              <th>Lap</th>
              <th>Duration</th>
              ${hasDistance ? '<th>Distance</th>' : ''}
              ${hasPace ? '<th>Avg Pace</th>' : ''}
              ${hasSpeed ? '<th>Avg Speed</th>' : ''}
              ${hasHR ? '<th>Avg HR</th>' : ''}
              ${hasHR ? '<th>Max HR</th>' : ''}
              ${hasElevation ? '<th>Elev +/-</th>' : ''}
              ${hasPower ? '<th>Avg Power</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${this.laps.map((lap, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${this.formatDuration(lap.lapDuration)}</td>
                ${hasDistance ? `<td>${lap.lapDistance?.toFixed(2)} km</td>` : ''}
                ${hasPace ? `<td>${this.formatPace(lap.avgPace)}</td>` : ''}
                ${hasSpeed ? `<td>${lap.avgSpeed?.toFixed(1)} km/h</td>` : ''}
                ${hasHR ? `<td>${lap.avgHR ? Math.round(lap.avgHR) : '-'} bpm</td>` : ''}
                ${hasHR ? `<td>${lap.maxHR ? Math.round(lap.maxHR) : '-'} bpm</td>` : ''}
                ${hasElevation ? `<td>+${lap.elevationGain || 0}m / -${lap.elevationLoss || 0}m</td>` : ''}
                ${hasPower ? `<td>${lap.avgPower ? Math.round(lap.avgPower) : '-'} W</td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Helper methods to check data availability
   */
  private hasHeartRateData(): boolean {
    return this.laps.some(lap => lap.avgHR && lap.avgHR > 0);
  }

  private hasElevationData(): boolean {
    return this.laps.some(lap => lap.elevationGain || lap.elevationLoss);
  }

  private hasPowerData(): boolean {
    return this.laps.some(lap => lap.avgPower && lap.avgPower > 0);
  }

  /**
   * Format duration as MM:SS
   */
  private formatDuration(minutes: number): string {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format pace as M:SS/km
   */
  private formatPace(pace?: number): string {
    if (!pace) return '-';
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Show "no data" message
   */
  private showNoData(): void {
    this.container.innerHTML = `
      <div class="no-lap-data">
        <p>No lap data available for this workout.</p>
      </div>
    `;
  }

  /**
   * Destroy all charts
   */
  private destroyCharts(): void {
    this.charts.forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.charts = [];
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.destroyCharts();
    this.container.innerHTML = '';
  }
}
