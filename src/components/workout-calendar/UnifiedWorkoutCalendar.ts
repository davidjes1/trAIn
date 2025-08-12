// Unified Workout Calendar - displays workouts from the unified WorkoutService
import WorkoutService from '../../services/WorkoutService';
import { Workout, SportType } from '../../types/workout.types';
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
      
      // Load workouts from unified service
      this.workouts = await WorkoutService.getWorkoutsByDateRange(
        this.userId,
        dateRange.startDate,
        dateRange.endDate
      );

      // Apply filters
      this.workouts = this.applyFilters(this.workouts);

      console.log(`✅ Loaded ${this.workouts.length} workouts for calendar`);
      
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
        // Show current month
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
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

    if (this.workouts.length === 0) {
      this.showEmptyState();
      return;
    }

    // Generate calendar HTML based on view type
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
          <h3>Week of ${startDate.toLocaleDateString()}</h3>
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
    const days = [];

    // Generate all days in month
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dayWorkouts = this.workouts.filter(w => w.date === dateStr);
      days.push(this.generateDayCard(new Date(date), dayWorkouts, false));
    }

    return `
      <div class="unified-calendar month-view">
        <div class="calendar-header">
          <h3>${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <div class="calendar-controls">
            <button class="btn btn-ghost" id="prev-month">‹</button>
            <button class="btn btn-ghost" id="today">Today</button>
            <button class="btn btn-ghost" id="next-month">›</button>
          </div>
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
          <h3>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          <div class="calendar-controls">
            <button class="btn btn-ghost" id="prev-day">‹</button>
            <button class="btn btn-ghost" id="today">Today</button>
            <button class="btn btn-ghost" id="next-day">›</button>
          </div>
        </div>
        <div class="day-workouts">
          ${dayWorkouts.map(workout => this.generateWorkoutCard(workout, true)).join('')}
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
   * Generate workout card
   */
  private generateWorkoutCard(workout: Workout, expanded = false): string {
    const sportIcon = this.getSportIcon(workout.sport);
    const statusClass = `status-${workout.status}`;
    const statusIcon = this.getStatusIcon(workout.status);

    const duration = workout.actual?.durationMin || workout.planned?.durationMin;
    const distance = workout.actual?.distanceKm || workout.planned?.distanceKm;

    return `
      <div class="workout-card ${statusClass}" data-workout-id="${workout.id}">
        <div class="workout-header">
          <span class="sport-icon">${sportIcon}</span>
          <span class="workout-name">${workout.name}</span>
          <span class="status-icon">${statusIcon}</span>
        </div>
        
        ${expanded ? `
          <div class="workout-details">
            <div class="workout-description">${workout.description || ''}</div>
            
            <div class="workout-metrics">
              ${duration ? `<span class="metric"><span class="metric-label">Duration:</span> ${duration}min</span>` : ''}
              ${distance ? `<span class="metric"><span class="metric-label">Distance:</span> ${distance.toFixed(1)}km</span>` : ''}
              ${workout.actual?.avgHR ? `<span class="metric"><span class="metric-label">Avg HR:</span> ${workout.actual.avgHR} bpm</span>` : ''}
              ${workout.actual?.trainingLoad ? `<span class="metric"><span class="metric-label">Load:</span> ${workout.actual.trainingLoad}</span>` : ''}
            </div>

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
            ${duration ? `<span class="duration">${duration}min</span>` : ''}
            ${distance ? `<span class="distance">${distance.toFixed(1)}km</span>` : ''}
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
  }

  /**
   * Navigate to previous period
   */
  private navigatePrevious(): void {
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

    this.updateConfig({ startDate: currentDate.toISOString().split('T')[0] });
  }

  /**
   * Navigate to next period
   */
  private navigateNext(): void {
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

    this.updateConfig({ startDate: currentDate.toISOString().split('T')[0] });
  }

  /**
   * Navigate to today
   */
  private navigateToToday(): void {
    const today = new Date().toISOString().split('T')[0];
    this.updateConfig({ startDate: today });
  }

  /**
   * Update calendar configuration and refresh
   */
  public updateConfig(newConfig: Partial<CalendarConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.loadWorkouts().then(() => this.render());
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