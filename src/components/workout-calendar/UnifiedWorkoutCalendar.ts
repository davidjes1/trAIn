// Unified Workout Calendar - displays workouts from the unified WorkoutService
import WorkoutService from '../../services/WorkoutService';
import { Workout, SportType } from '@/core/models';
import { UIHelpers } from '../../utils/ui-helpers';
import { AuthService } from '../../firebase/auth';

export interface CalendarConfig {
  viewType: 'week' | 'month' | 'day';
  startDate: string; // YYYY-MM-DD
  showStatusFilter?: ('planned' | 'completed' | 'missed' | 'unplanned')[];
  showSportFilter?: SportType[];
  highlightToday: boolean;
}

export class UnifiedWorkoutCalendar {
  private container: HTMLElement;
  private config: CalendarConfig;
  private workouts: Workout[] = [];
  private onWorkoutClick?: (workout: Workout) => void;
  private userId: string | null = null;

  constructor(
    container: HTMLElement, 
    config: CalendarConfig,
    callbacks: {
      onWorkoutClick?: (workout: Workout) => void;
    } = {}
  ) {
    this.container = container;
    this.config = config;
    this.onWorkoutClick = callbacks.onWorkoutClick;
    this.userId = AuthService.getCurrentUserId();
    
    this.initialize();
  }

  /**
   * Initialize the calendar
   */
  private async initialize(): Promise<void> {
    try {
      // Setup event listeners
      this.setupEventListeners();
      
      // Load initial workouts
      await this.loadWorkouts();
      
      // Render calendar
      this.render();
      
    } catch (error) {
      console.error('Failed to initialize unified workout calendar:', error);
      this.showError('Failed to load workout calendar');
    }
  }

  /**
   * Load workouts from WorkoutService
   */
  public async loadWorkouts(): Promise<void> {
    if (!this.userId) {
      console.log('User not authenticated, cannot load workouts');
      this.workouts = [];
      return;
    }

    try {
      console.log('📅 Loading workouts for calendar...');

      // Determine date range based on view type
      const dateRange = this.getDateRange();
      console.log('📅 Date range:', dateRange);
      
      // Load workouts from unified service
      this.workouts = await WorkoutService.getWorkoutsByDateRange(
        this.userId,
        dateRange.startDate,
        dateRange.endDate
      );

      console.log(`📅 Raw workouts loaded: ${this.workouts.length}`);

      // Apply filters
      this.workouts = this.applyFilters(this.workouts);

      console.log(`✅ Loaded ${this.workouts.length} filtered workouts for calendar (${dateRange.startDate} to ${dateRange.endDate})`);
      
      // Log workout dates for debugging
      if (this.workouts.length > 0) {
        const workoutDates = this.workouts.map(w => w.date).sort();
        console.log('📅 Workout dates:', workoutDates);
      }
      
    } catch (error) {
      console.error('Failed to load workouts:', error);
      this.workouts = [];
    }
  }

  /**
   * Get date range for current view
   */
  private getDateRange(): { startDate: string; endDate: string } {
    const baseDate = new Date(this.config.startDate);
    let startDate: Date, endDate: Date;

    switch (this.config.viewType) {
      case 'week':
        // Show current week (Sunday to Saturday)
        startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() - baseDate.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;

      case 'month':
        // For month view, extend the range to include adjacent month days for complete calendar grid
        const firstDayOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        const lastDayOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        
        // Get first Sunday of the calendar view
        startDate = new Date(firstDayOfMonth);
        startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
        
        // Get last Saturday of the calendar view
        endDate = new Date(lastDayOfMonth);
        endDate.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay()));
        break;

      case 'day':
        // Show just the current day
        startDate = new Date(baseDate);
        endDate = new Date(baseDate);
        break;

      default:
        startDate = baseDate;
        endDate = baseDate;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Apply filters to workouts
   */
  private applyFilters(workouts: Workout[]): Workout[] {
    let filtered = [...workouts];

    // Status filter
    if (this.config.showStatusFilter && this.config.showStatusFilter.length > 0) {
      filtered = filtered.filter(workout => 
        this.config.showStatusFilter!.includes(workout.status)
      );
    }

    // Sport filter  
    if (this.config.showSportFilter && this.config.showSportFilter.length > 0) {
      filtered = filtered.filter(workout =>
        this.config.showSportFilter!.includes(workout.sport)
      );
    }

    return filtered;
  }

  /**
   * Render the calendar
   */
  public render(): void {
    if (!this.container) {
      console.error('No container element for calendar');
      return;
    }

    // Clear container
    this.container.innerHTML = '';

    // Always generate calendar HTML - don't show empty state for no workouts
    // The calendar should show empty days instead
    let calendarHTML = '';
    
    switch (this.config.viewType) {
      case 'week':
        calendarHTML = this.generateWeekView();
        break;
      case 'month':
        calendarHTML = this.generateMonthView();
        break;
      case 'day':
        calendarHTML = this.generateDayView();
        break;
      default:
        this.showError('Invalid view type');
        return;
    }

    this.container.innerHTML = calendarHTML;
    this.attachEventListeners();
  }

  /**
   * Generate week view
   */
  private generateWeekView(): string {
    const dateRange = this.getDateRange();
    const startDate = new Date(dateRange.startDate);
    const days = [];

    // Generate 7 days
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayWorkouts = this.workouts.filter(w => w.date === dateStr);
      days.push(this.generateDayCard(currentDate, dayWorkouts));
    }

    return `
      <div class="unified-calendar week-view">
        <div class="calendar-header">
          <div class="calendar-title">
            <h3>Week of ${startDate.toLocaleDateString()}</h3>
            <div class="view-switcher">
              <button class="btn btn-small view-btn ${this.config.viewType === 'day' ? 'active' : ''}" data-view="day">Day</button>
              <button class="btn btn-small view-btn ${this.config.viewType === 'week' ? 'active' : ''}" data-view="week">Week</button>
              <button class="btn btn-small view-btn ${this.config.viewType === 'month' ? 'active' : ''}" data-view="month">Month</button>
            </div>
          </div>
          <div class="calendar-controls">
            <button class="btn btn-ghost" id="prev-week">‹</button>
            <button class="btn btn-ghost" id="today">Today</button>
            <button class="btn btn-ghost" id="next-week">›</button>
          </div>
        </div>
        <div class="calendar-grid week-grid">
          ${days.join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate month view
   */
  private generateMonthView(): string {
    const dateRange = this.getDateRange();
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    // Create a proper calendar grid starting from Sunday of the first week
    const firstDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    // Get first Sunday of the calendar view
    const startOfWeek = new Date(firstDayOfMonth);
    startOfWeek.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
    
    // Get last Saturday of the calendar view
    const endOfWeek = new Date(lastDayOfMonth);
    endOfWeek.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay()));
    
    const days = [];
    const weekDayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate all days in the calendar grid (6 weeks)
    for (let date = new Date(startOfWeek); date <= endOfWeek; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dayWorkouts = this.workouts.filter(w => w.date === dateStr);
      const isCurrentMonth = date.getMonth() === firstDayOfMonth.getMonth();
      days.push(this.generateMonthDayCard(new Date(date), dayWorkouts, isCurrentMonth));
    }

    return `
      <div class="unified-calendar month-view">
        <div class="calendar-header">
          <div class="calendar-title">
            <h3>${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <div class="view-switcher">
              <button class="btn btn-small view-btn ${this.config.viewType === 'day' ? 'active' : ''}" data-view="day">Day</button>
              <button class="btn btn-small view-btn ${this.config.viewType === 'week' ? 'active' : ''}" data-view="week">Week</button>
              <button class="btn btn-small view-btn ${this.config.viewType === 'month' ? 'active' : ''}" data-view="month">Month</button>
            </div>
          </div>
          <div class="calendar-controls">
            <button class="btn btn-ghost" id="prev-month">‹</button>
            <button class="btn btn-ghost" id="today">Today</button>
            <button class="btn btn-ghost" id="next-month">›</button>
          </div>
        </div>
        
        <!-- Weekday headers -->
        <div class="month-header">
          ${weekDayHeaders.map(day => `<div class="weekday-header">${day}</div>`).join('')}
        </div>
        
        <div class="calendar-grid month-grid">
          ${days.join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate day view
   */
  private generateDayView(): string {
    const date = new Date(this.config.startDate);
    const dayWorkouts = this.workouts.filter(w => w.date === this.config.startDate);

    return `
      <div class="unified-calendar day-view">
        <div class="calendar-header">
          <div class="calendar-title">
            <h3>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            <div class="view-switcher">
              <button class="btn btn-small view-btn ${this.config.viewType === 'day' ? 'active' : ''}" data-view="day">Day</button>
              <button class="btn btn-small view-btn ${this.config.viewType === 'week' ? 'active' : ''}" data-view="week">Week</button>
              <button class="btn btn-small view-btn ${this.config.viewType === 'month' ? 'active' : ''}" data-view="month">Month</button>
            </div>
          </div>
          <div class="calendar-controls">
            <button class="btn btn-ghost" id="prev-day">‹</button>
            <button class="btn btn-ghost" id="today">Today</button>
            <button class="btn btn-ghost" id="next-day">›</button>
          </div>
        </div>
        <div class="day-workouts">
          ${dayWorkouts.length > 0 
            ? dayWorkouts.map(workout => this.generateWorkoutCard(workout, true)).join('') 
            : '<div class="rest-day"><span class="rest-icon">💤</span><span class="rest-text">Rest Day - No Workouts Scheduled</span></div>'
          }
        </div>
      </div>
    `;
  }

  /**
   * Generate day card for calendar grid
   */
  private generateDayCard(date: Date, workouts: Workout[], expanded = false): string {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    const isToday = this.config.highlightToday && 
      dateStr === new Date().toISOString().split('T')[0];

    if (workouts.length === 0) {
      return `
        <div class="day-card empty-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <div class="day-header">
            <span class="day-name">${dayName}</span>
            <span class="day-number">${dayNumber}</span>
          </div>
          <div class="day-content">
            <div class="rest-day">
              <span class="rest-icon">💤</span>
              <span class="rest-text">Rest</span>
            </div>
          </div>
        </div>
      `;
    }

    const workoutCards = workouts.map(workout => 
      this.generateWorkoutCard(workout, expanded)
    ).join('');

    return `
      <div class="day-card has-workouts ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="day-header">
          <span class="day-name">${dayName}</span>
          <span class="day-number">${dayNumber}</span>
          ${workouts.length > 1 ? `<span class="workout-count">${workouts.length}</span>` : ''}
        </div>
        <div class="day-content">
          ${workoutCards}
        </div>
      </div>
    `;
  }

  /**
   * Generate compact day card for month view
   */
  private generateMonthDayCard(date: Date, workouts: Workout[], isCurrentMonth: boolean): string {
    const dateStr = date.toISOString().split('T')[0];
    const dayNumber = date.getDate();
    const isToday = this.config.highlightToday && 
      dateStr === new Date().toISOString().split('T')[0];
    
    const workoutCount = workouts.length;
    const hasCompletedWorkouts = workouts.some(w => w.status === 'completed' || w.status === 'unplanned');
    const hasPlannedWorkouts = workouts.some(w => w.status === 'planned');
    const hasMissedWorkouts = workouts.some(w => w.status === 'missed');

    // Get status for styling
    let statusClass = '';
    if (hasCompletedWorkouts) statusClass = 'has-completed';
    else if (hasMissedWorkouts) statusClass = 'has-missed';
    else if (hasPlannedWorkouts) statusClass = 'has-planned';

    return `
      <div class="month-day-card ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''} ${statusClass}" data-date="${dateStr}">
        <div class="month-day-number">${dayNumber}</div>
        ${workoutCount > 0 ? `
          <div class="month-day-indicators">
            ${workoutCount <= 3 
              ? workouts.map(w => `<div class="workout-dot status-${w.status}" title="${w.name}"></div>`).join('')
              : `<div class="workout-count-badge">${workoutCount}</div>`
            }
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate workout card with enhanced completed workout details
   */
  private generateWorkoutCard(workout: Workout, expanded = false): string {
    const sportIcon = this.getSportIcon(workout.sport);
    const statusClass = `status-${workout.status}`;
    const statusIcon = this.getStatusIcon(workout.status);

    // Use actual data if available (completed/unplanned), otherwise use planned data
    const duration = workout.actual?.durationMin || workout.planned?.durationMin;
    const distance = workout.actual?.distanceKm || workout.planned?.distanceKm;
    const isCompleted = workout.status === 'completed' || workout.status === 'unplanned';
    
    // Calculate completion vs planned comparison
    const hasComparison = workout.actual && workout.planned;
    const durationDiff = hasComparison ? 
      ((workout.actual.durationMin - workout.planned.durationMin) / workout.planned.durationMin * 100) : null;
    const distanceDiff = hasComparison && workout.planned.distanceKm ? 
      ((workout.actual.distanceKm! - workout.planned.distanceKm) / workout.planned.distanceKm * 100) : null;

    return `
      <div class="workout-card ${statusClass} ${isCompleted ? 'completed-workout' : ''}" data-workout-id="${workout.id}">
        <div class="workout-header">
          <span class="sport-icon">${sportIcon}</span>
          <span class="workout-name">${workout.name}</span>
          <div class="workout-status">
            <span class="status-icon">${statusIcon}</span>
            ${isCompleted ? '<span class="completion-badge">✓</span>' : ''}
          </div>
        </div>
        
        ${expanded ? `
          <div class="workout-details">
            <div class="workout-description">${workout.description || ''}</div>
            
            <!-- Actual Performance Metrics (if completed) -->
            ${workout.actual ? `
              <div class="actual-metrics">
                <h5 class="metrics-title">
                  <span class="actual-icon">📊</span> Actual Performance
                  ${workout.actual.processedAt ? `<small>Uploaded ${new Date(workout.actual.processedAt).toLocaleDateString()}</small>` : ''}
                </h5>
                <div class="workout-metrics">
                  ${workout.actual.durationMin ? `<span class="metric"><span class="metric-label">Duration:</span> ${workout.actual.durationMin}min</span>` : ''}
                  ${workout.actual.distanceKm ? `<span class="metric"><span class="metric-label">Distance:</span> ${workout.actual.distanceKm.toFixed(2)}km</span>` : ''}
                  ${workout.actual.avgHR ? `<span class="metric"><span class="metric-label">Avg HR:</span> ${workout.actual.avgHR} bpm</span>` : ''}
                  ${workout.actual.maxHR ? `<span class="metric"><span class="metric-label">Max HR:</span> ${workout.actual.maxHR} bpm</span>` : ''}
                  ${workout.actual.avgPace ? `<span class="metric"><span class="metric-label">Avg Pace:</span> ${workout.actual.avgPace}</span>` : ''}
                  ${workout.actual.avgPower ? `<span class="metric"><span class="metric-label">Avg Power:</span> ${workout.actual.avgPower}W</span>` : ''}
                  ${workout.actual.trainingLoad ? `<span class="metric"><span class="metric-label">Training Load:</span> ${workout.actual.trainingLoad}</span>` : ''}
                  ${workout.actual.calories ? `<span class="metric"><span class="metric-label">Calories:</span> ${workout.actual.calories}</span>` : ''}
                  ${workout.actual.ascentM ? `<span class="metric"><span class="metric-label">Elevation:</span> ↗${workout.actual.ascentM}m ↘${workout.actual.descentM || 0}m</span>` : ''}
                </div>
                
                <!-- HR Zones Distribution -->
                ${workout.actual.zones && workout.actual.zones.length > 0 ? `
                  <div class="hr-zones">
                    <h6>Heart Rate Zones</h6>
                    <div class="zones-grid">
                      ${workout.actual.zones.map((zone, index) => `
                        <div class="zone zone-${index + 1}">
                          <span class="zone-label">Z${index + 1}</span>
                          <span class="zone-time">${Math.round(zone.timeMin || 0)}min</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <!-- Planned vs Actual Comparison (if both available) -->
            ${hasComparison ? `
              <div class="planned-vs-actual">
                <h5 class="comparison-title">
                  <span class="comparison-icon">⚖️</span> Planned vs Actual
                </h5>
                <div class="comparison-metrics">
                  ${durationDiff !== null ? `
                    <div class="comparison-item ${Math.abs(durationDiff) > 10 ? (durationDiff > 0 ? 'over' : 'under') : 'on-target'}">
                      <span class="comparison-label">Duration:</span>
                      <span class="planned-value">${workout.planned!.durationMin}min</span>
                      <span class="comparison-arrow">→</span>
                      <span class="actual-value">${workout.actual!.durationMin}min</span>
                      <span class="comparison-diff">(${durationDiff > 0 ? '+' : ''}${durationDiff.toFixed(1)}%)</span>
                    </div>
                  ` : ''}
                  ${distanceDiff !== null ? `
                    <div class="comparison-item ${Math.abs(distanceDiff) > 10 ? (distanceDiff > 0 ? 'over' : 'under') : 'on-target'}">
                      <span class="comparison-label">Distance:</span>
                      <span class="planned-value">${workout.planned!.distanceKm!.toFixed(1)}km</span>
                      <span class="comparison-arrow">→</span>
                      <span class="actual-value">${workout.actual!.distanceKm!.toFixed(1)}km</span>
                      <span class="comparison-diff">(${distanceDiff > 0 ? '+' : ''}${distanceDiff.toFixed(1)}%)</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
            
            <!-- Planned Metrics (if not completed or no actual data) -->
            ${workout.planned && !workout.actual ? `
              <div class="planned-metrics">
                <h5 class="metrics-title">
                  <span class="planned-icon">🎯</span> Planned Workout
                </h5>
                <div class="workout-metrics">
                  ${workout.planned.durationMin ? `<span class="metric"><span class="metric-label">Duration:</span> ${workout.planned.durationMin}min</span>` : ''}
                  ${workout.planned.distanceKm ? `<span class="metric"><span class="metric-label">Distance:</span> ${workout.planned.distanceKm}km</span>` : ''}
                  ${workout.planned.targetMetrics?.expectedAvgHR ? `<span class="metric"><span class="metric-label">Target HR:</span> ${workout.planned.targetMetrics.expectedAvgHR} bpm</span>` : ''}
                  ${workout.planned.expectedFatigue ? `<span class="metric"><span class="metric-label">Expected Fatigue:</span> ${workout.planned.expectedFatigue}/100</span>` : ''}
                </div>
              </div>
            ` : ''}

            ${workout.planned?.tags && workout.planned.tags.length > 0 ? `
              <div class="workout-tags">
                ${workout.planned.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
              </div>
            ` : ''}

            ${workout.planned?.notes ? `
              <div class="workout-notes">${workout.planned.notes}</div>
            ` : ''}
          </div>
        ` : `
          <div class="workout-summary">
            <div class="workout-metrics-compact">
              ${duration ? `<span class="metric-compact duration">${duration}min</span>` : ''}
              ${distance ? `<span class="metric-compact distance">${distance.toFixed(1)}km</span>` : ''}
              ${workout.actual?.avgHR ? `<span class="metric-compact hr">${workout.actual.avgHR}bpm</span>` : ''}
              ${workout.actual?.trainingLoad ? `<span class="metric-compact load">Load: ${workout.actual.trainingLoad}</span>` : ''}
            </div>
            ${hasComparison && (Math.abs(durationDiff || 0) > 10 || Math.abs(distanceDiff || 0) > 10) ? `
              <div class="quick-comparison">
                ${durationDiff !== null && Math.abs(durationDiff) > 10 ? 
                  `<span class="diff-indicator ${durationDiff > 0 ? 'over' : 'under'}">${durationDiff > 0 ? '+' : ''}${durationDiff.toFixed(0)}%</span>` : ''
                }
              </div>
            ` : ''}
          </div>
        `}
      </div>
    `;
  }

  /**
   * Get sport icon emoji
   */
  private getSportIcon(sport: SportType): string {
    const iconMap: Record<SportType, string> = {
      'run': '🏃',
      'bike': '🚴', 
      'swim': '🏊',
      'strength': '💪',
      'yoga': '🧘',
      'other': '⚽'
    };
    return iconMap[sport] || '⚽';
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      'planned': '📅',
      'completed': '✅',
      'missed': '❌',
      'unplanned': '⚡'
    };
    return iconMap[status] || '❓';
  }

  /**
   * Show empty state
   */
  private showEmptyState(): void {
    this.container.innerHTML = `
      <div class="calendar-empty-state">
        <div class="empty-icon">📅</div>
        <h3>No Workouts Found</h3>
        <p>No workouts scheduled for this period.</p>
        <button class="btn btn-primary" id="create-workout-btn">Create Workout</button>
      </div>
    `;

    // Add event listener for create button
    const createBtn = document.getElementById('create-workout-btn');
    createBtn?.addEventListener('click', () => {
      // Trigger event to show plan generation modal
      document.dispatchEvent(new CustomEvent('show-plan-generation'));
    });
  }

  /**
   * Show error state
   */
  private showError(message: string): void {
    this.container.innerHTML = `
      <div class="calendar-error-state">
        <div class="error-icon">❌</div>
        <h3>Error Loading Calendar</h3>
        <p>${message}</p>
        <button class="btn btn-secondary" id="retry-btn">Retry</button>
      </div>
    `;

    // Add event listener for retry
    const retryBtn = document.getElementById('retry-btn');
    retryBtn?.addEventListener('click', () => {
      this.loadWorkouts().then(() => this.render());
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for workout updates
    document.addEventListener('workouts-updated', () => {
      console.log('📅 Workouts updated, refreshing calendar...');
      this.loadWorkouts().then(() => this.render());
    });

    // Listen for auth state changes
    document.addEventListener('auth-state-changed', (e: any) => {
      this.userId = e.detail?.user?.uid || null;
      this.loadWorkouts().then(() => this.render());
    });
  }

  /**
   * Attach event listeners to rendered elements
   */
  private attachEventListeners(): void {
    // Navigation controls
    const prevBtn = this.container.querySelector('#prev-week, #prev-month, #prev-day');
    const nextBtn = this.container.querySelector('#next-week, #next-month, #next-day');
    const todayBtn = this.container.querySelector('#today');

    prevBtn?.addEventListener('click', () => this.navigatePrevious());
    nextBtn?.addEventListener('click', () => this.navigateNext());
    todayBtn?.addEventListener('click', () => this.navigateToToday());

    // View switcher controls
    const viewBtns = this.container.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const viewType = (e.target as HTMLElement).dataset.view as 'day' | 'week' | 'month';
        if (viewType && viewType !== this.config.viewType) {
          this.switchView(viewType);
        }
      });
    });

    // Workout click handlers
    const workoutCards = this.container.querySelectorAll('.workout-card');
    workoutCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const workoutId = (card as HTMLElement).dataset.workoutId;
        if (workoutId && this.onWorkoutClick) {
          const workout = this.workouts.find(w => w.id === workoutId);
          if (workout) {
            this.onWorkoutClick(workout);
          }
        }
      });
    });

    // Month day card click handlers (for navigation to day view)
    const monthDayCards = this.container.querySelectorAll('.month-day-card');
    monthDayCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const date = (card as HTMLElement).dataset.date;
        if (date) {
          // Switch to day view for the clicked date
          this.updateConfig({ 
            viewType: 'day', 
            startDate: date 
          });
        }
      });
    });
  }

  /**
   * Switch calendar view type
   */
  private async switchView(newViewType: 'day' | 'week' | 'month'): Promise<void> {
    console.log(`📅 Switching calendar view from ${this.config.viewType} to ${newViewType}`);
    await this.updateConfig({ viewType: newViewType });
  }

  /**
   * Navigate to previous period
   */
  private async navigatePrevious(): Promise<void> {
    const currentDate = new Date(this.config.startDate);

    switch (this.config.viewType) {
      case 'week':
        currentDate.setDate(currentDate.getDate() - 7);
        break;
      case 'month':
        currentDate.setMonth(currentDate.getMonth() - 1);
        break;
      case 'day':
        currentDate.setDate(currentDate.getDate() - 1);
        break;
    }

    await this.updateConfig({ startDate: currentDate.toISOString().split('T')[0] });
  }

  /**
   * Navigate to next period
   */
  private async navigateNext(): Promise<void> {
    const currentDate = new Date(this.config.startDate);

    switch (this.config.viewType) {
      case 'week':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'month':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'day':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
    }

    await this.updateConfig({ startDate: currentDate.toISOString().split('T')[0] });
  }

  /**
   * Navigate to today
   */
  private async navigateToToday(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.updateConfig({ startDate: today });
  }

  /**
   * Update calendar configuration and refresh
   */
  public async updateConfig(newConfig: Partial<CalendarConfig>): Promise<void> {
    console.log('📅 Updating calendar config:', newConfig);
    this.config = { ...this.config, ...newConfig };
    
    // Reload workouts for new date range
    await this.loadWorkouts();
    
    // Re-render calendar
    this.render();
    
    console.log('📅 Calendar updated successfully');
  }

  /**
   * Refresh calendar data
   */
  public async refresh(): Promise<void> {
    await this.loadWorkouts();
    this.render();
  }

  /**
   * Get current workouts
   */
  public getCurrentWorkouts(): Workout[] {
    return [...this.workouts];
  }
}

export default UnifiedWorkoutCalendar;