// Intensity Heat Map Component
// GitHub-style heat map showing training intensity over time
import { DashboardMetrics } from '../../services/MetricsCalculator';

export interface HeatMapConfig {
  months: number; // Number of months to display (default: 3)
  cellSize: number; // Size of each day cell in pixels
  cellGap: number; // Gap between cells
}

export class IntensityHeatMap {
  private container: HTMLElement;
  private config: HeatMapConfig;
  private intensityData: Map<string, { intensity: number; load: number; duration: number }> = new Map();

  constructor(container: HTMLElement, config: Partial<HeatMapConfig> = {}) {
    this.container = container;
    this.config = {
      months: config.months || 3,
      cellSize: config.cellSize || 14,
      cellGap: config.cellGap || 3
    };
    this.initialize();
  }

  private initialize(): void {
    this.container.className = 'intensity-heat-map';
    this.render();
  }

  /**
   * Update heat map with new data
   */
  public update(metrics: DashboardMetrics): void {
    const heatMapData = metrics.chartData.intensityHeatMap;

    // Clear existing data
    this.intensityData.clear();

    // Store new data
    heatMapData.forEach(day => {
      this.intensityData.set(day.date, {
        intensity: day.intensity,
        load: day.load,
        duration: day.duration
      });
    });

    this.render();
  }

  /**
   * Render the heat map
   */
  private render(): void {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - this.config.months);
    startDate.setDate(1); // Start from the first of the month

    // Calculate weeks to display
    const weeks = this.calculateWeeks(startDate, today);

    // Build HTML
    const html = `
      <div class="heat-map-header">
        <h3>Training Intensity Heat Map</h3>
        <div class="heat-map-legend">
          <span class="legend-label">Less</span>
          ${this.renderLegendCells()}
          <span class="legend-label">More</span>
        </div>
      </div>
      <div class="heat-map-grid">
        ${this.renderMonthLabels(weeks)}
        <div class="heat-map-body">
          ${this.renderDayLabels()}
          ${this.renderWeeks(weeks)}
        </div>
      </div>
      <div class="heat-map-tooltip" id="heat-map-tooltip" style="display: none;"></div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Calculate week structure for the date range
   */
  private calculateWeeks(startDate: Date, endDate: Date): Date[][] {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    // Start from Sunday of the first week
    let currentDate = new Date(startDate);
    const dayOfWeek = currentDate.getDay();
    currentDate.setDate(currentDate.getDate() - dayOfWeek);

    while (currentDate <= endDate) {
      currentWeek.push(new Date(currentDate));

      if (currentDate.getDay() === 6) { // Saturday - end of week
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add remaining days if any
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }

  /**
   * Render month labels
   */
  private renderMonthLabels(weeks: Date[][]): string {
    const months: { label: string; span: number }[] = [];
    let currentMonth = -1;
    let span = 0;

    weeks.forEach(week => {
      const firstDay = week[0];
      const month = firstDay.getMonth();

      if (month !== currentMonth) {
        if (currentMonth !== -1) {
          months.push({
            label: new Date(firstDay.getFullYear(), currentMonth).toLocaleDateString('en-US', { month: 'short' }),
            span
          });
        }
        currentMonth = month;
        span = 1;
      } else {
        span++;
      }
    });

    // Add the last month
    if (span > 0 && currentMonth !== -1) {
      months.push({
        label: new Date(weeks[weeks.length - 1][0].getFullYear(), currentMonth).toLocaleDateString('en-US', { month: 'short' }),
        span
      });
    }

    return `
      <div class="heat-map-months">
        <div class="month-spacer"></div>
        ${months.map(m => `
          <div class="month-label" style="grid-column: span ${m.span}">${m.label}</div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render day labels (Sun, Mon, etc.)
   */
  private renderDayLabels(): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `
      <div class="heat-map-days">
        ${days.map((day, index) => `
          <div class="day-label" style="grid-row: ${index + 1}">
            ${index % 2 === 1 ? day : ''} <!-- Only show odd days to reduce clutter -->
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render all weeks
   */
  private renderWeeks(weeks: Date[][]): string {
    return `
      <div class="heat-map-weeks">
        ${weeks.map((week, weekIndex) => this.renderWeek(week, weekIndex)).join('')}
      </div>
    `;
  }

  /**
   * Render a single week column
   */
  private renderWeek(week: Date[], weekIndex: number): string {
    return `
      <div class="heat-map-week" style="grid-column: ${weekIndex + 1}">
        ${week.map((date, dayIndex) => this.renderDay(date, dayIndex)).join('')}
      </div>
    `;
  }

  /**
   * Render a single day cell
   */
  private renderDay(date: Date, dayIndex: number): string {
    const dateStr = date.toISOString().split('T')[0];
    const data = this.intensityData.get(dateStr);
    const today = new Date().toISOString().split('T')[0];
    const isToday = dateStr === today;
    const isFuture = date > new Date();

    let intensityLevel = 0;
    if (data && !isFuture) {
      // Calculate intensity level (0-4) based on training load
      if (data.load === 0) intensityLevel = 0;
      else if (data.load < 50) intensityLevel = 1;
      else if (data.load < 100) intensityLevel = 2;
      else if (data.load < 150) intensityLevel = 3;
      else intensityLevel = 4;
    }

    const cellClass = [
      'heat-map-cell',
      isFuture ? 'future' : `intensity-${intensityLevel}`,
      isToday ? 'today' : ''
    ].filter(Boolean).join(' ');

    return `
      <div
        class="${cellClass}"
        data-date="${dateStr}"
        data-load="${data?.load || 0}"
        data-duration="${data?.duration || 0}"
        data-intensity="${data?.intensity.toFixed(2) || 0}"
        style="grid-row: ${dayIndex + 1}"
        role="gridcell"
        aria-label="${this.getAriaLabel(date, data)}"
      ></div>
    `;
  }

  /**
   * Render legend cells
   */
  private renderLegendCells(): string {
    return [0, 1, 2, 3, 4]
      .map(level => `<div class="legend-cell intensity-${level}"></div>`)
      .join('');
  }

  /**
   * Get aria label for accessibility
   */
  private getAriaLabel(date: Date, data: { intensity: number; load: number; duration: number } | undefined): string {
    const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (!data || data.load === 0) {
      return `${dateStr}: No training`;
    }

    return `${dateStr}: ${Math.round(data.duration)} minutes, Training load ${Math.round(data.load)}`;
  }

  /**
   * Attach event listeners for tooltips
   */
  private attachEventListeners(): void {
    const cells = this.container.querySelectorAll('.heat-map-cell');
    const tooltip = this.container.querySelector('#heat-map-tooltip') as HTMLElement;

    if (!tooltip) return;

    cells.forEach(cell => {
      cell.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement;
        const date = target.dataset.date;
        const load = parseFloat(target.dataset.load || '0');
        const duration = parseFloat(target.dataset.duration || '0');
        const intensity = parseFloat(target.dataset.intensity || '0');

        if (!date) return;

        const formattedDate = new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        if (load === 0) {
          tooltip.innerHTML = `
            <div class="tooltip-date">${formattedDate}</div>
            <div class="tooltip-content">No training</div>
          `;
        } else {
          tooltip.innerHTML = `
            <div class="tooltip-date">${formattedDate}</div>
            <div class="tooltip-content">
              <div class="tooltip-row">
                <span class="tooltip-label">Duration:</span>
                <span class="tooltip-value">${Math.round(duration)} min</span>
              </div>
              <div class="tooltip-row">
                <span class="tooltip-label">Training Load:</span>
                <span class="tooltip-value">${Math.round(load)}</span>
              </div>
              <div class="tooltip-row">
                <span class="tooltip-label">Intensity:</span>
                <span class="tooltip-value">${intensity.toFixed(2)} load/min</span>
              </div>
            </div>
          `;
        }

        // Position tooltip
        const rect = target.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        tooltip.style.display = 'block';
        tooltip.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - containerRect.top - 10}px`;
      });

      cell.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    });
  }

  /**
   * Destroy heat map and cleanup
   */
  public destroy(): void {
    this.container.innerHTML = '';
  }
}
