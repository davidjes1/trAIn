// Workout Calendar component - displays planned vs actual workouts in calendar format
import { TrackedWorkout, CalendarViewConfig } from '../../types/workout-tracking.types';
import { WorkoutStorageService } from '../../services/WorkoutStorageService';

export class WorkoutCalendar {
  private container: HTMLElement | null = null;
  private workouts: TrackedWorkout[] = [];
  private config: CalendarViewConfig;
  private onWorkoutSelect: (workout: TrackedWorkout) => void;

  constructor(onWorkoutSelect: (workout: TrackedWorkout) => void) {
    this.onWorkoutSelect = onWorkoutSelect;
    this.config = {
      viewType: 'week',
      startDate: new Date().toISOString().split('T')[0],
      showPlannedOnly: false,
      showActualOnly: false,
      showComparison: true,
      highlightAdherence: true
    };
  }

  public async initialize(workouts: TrackedWorkout[], config: CalendarViewConfig): Promise<void> {
    this.container = document.getElementById('workout-calendar');
    this.config = config;

    if (!this.container) {
      console.error('Workout calendar container not found');
      return;
    }

    // If no workouts provided, try to load from storage
    if (workouts.length === 0) {
      this.workouts = await this.loadWorkoutsFromStorage();
    } else {
      this.workouts = workouts;
    }

    this.render();
  }

  public async updateWorkouts(workouts: TrackedWorkout[]): Promise<void> {
    this.workouts = workouts;
    this.render();
  }

  public updateView(config: CalendarViewConfig): void {
    this.config = config;
    this.render();
  }

  private render(): void {
    if (!this.container) return;

    // Clear loading state
    this.container.innerHTML = '';

    const viewWorkouts = this.getWorkoutsForView();
    const calendarHtml = this.generateCalendarHTML(viewWorkouts);
    
    this.container.innerHTML = calendarHtml;
    this.attachEventListeners();
  }

  private getWorkoutsForView(): TrackedWorkout[] {
    const startDate = new Date(this.config.startDate);
    const endDate = new Date(startDate);

    switch (this.config.viewType) {
      case 'week':
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'month':
        endDate.setMonth(startDate.getMonth() + 1);
        break;
      case 'day':
        endDate.setDate(startDate.getDate());
        break;
    }

    return this.workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= startDate && workoutDate <= endDate;
    });
  }

  private generateCalendarHTML(workouts: TrackedWorkout[]): string {
    if (this.config.viewType === 'week') {
      return this.generateWeekView(workouts);
    } else if (this.config.viewType === 'day') {
      return this.generateDayView(workouts);
    } else {
      return this.generateMonthView(workouts);
    }
  }

  private generateWeekView(workouts: TrackedWorkout[]): string {
    const startDate = new Date(this.config.startDate);
    const days: string[] = [];

    // Create a centered view with startDate in the middle (3 days before, startDate, 3 days after)
    for (let i = -3; i <= 3; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      const isCenter = i === 0; // startDate is always center
      
      days.push(this.generateDayCard(currentDate, dayWorkouts, false, isCenter));
    }

    return days.join('');
  }

  private generateDayView(workouts: TrackedWorkout[]): string {
    const date = new Date(this.config.startDate);
    const dayWorkouts = workouts.filter(w => w.date === this.config.startDate);
    
    return `
      <div class="day-view-container">
        ${this.generateDayCard(date, dayWorkouts, true)}
      </div>
    `;
  }

  private generateMonthView(workouts: TrackedWorkout[]): string {
    // Simplified month view - would be more complex in real implementation
    const startDate = new Date(this.config.startDate);
    const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const days: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), day);
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      const isCenter = dateStr === todayStr; // Today is center in month view too
      
      days.push(this.generateDayCard(currentDate, dayWorkouts, false, isCenter));
    }

    return days.join('');
  }

  private generateDayCard(date: Date, workouts: TrackedWorkout[], expanded = false, isCenter = false): string {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    // Determine primary workout for the day
    const primaryWorkout = this.getPrimaryWorkout(workouts);
    
    if (!primaryWorkout && !expanded) {
      return this.generateEmptyDayCard(date, isToday, isCenter);
    }

    if (!primaryWorkout) {
      return `
        <div class="workout-card empty-day ${isToday ? 'today' : ''} ${isCenter ? 'center-day' : ''}">
          <div class="workout-date">${dayName}, ${dayNumber}</div>
          <div class="no-workout">Rest Day</div>
        </div>
      `;
    }

    const cardClass = this.getWorkoutCardClass(primaryWorkout);
    const statusBadges = this.generateStatusBadges(primaryWorkout);
    const comparisonData = this.generateComparisonData(primaryWorkout);
    const adherenceScore = this.generateAdherenceScore(primaryWorkout);

    return `
      <div class="workout-card ${cardClass} ${isToday ? 'today' : ''} ${isCenter ? 'center-day' : ''}" data-date="${dateStr}" data-workout-id="${primaryWorkout.workoutId}">
        <div class="workout-date">${dayName}, ${dayNumber}</div>
        ${adherenceScore}
        
        <div class="workout-header">
          <div class="workout-type">${this.formatWorkoutType(primaryWorkout.workoutType)}</div>
          ${statusBadges}
        </div>
        
        <div class="workout-description">
          ${this.truncateDescription(primaryWorkout.description, expanded ? 100 : 50)}
        </div>
        
        ${comparisonData}
        
        ${expanded ? this.generateExpandedDetails(primaryWorkout) : ''}
        
        ${workouts.length > 1 ? `<div class="multiple-workouts">+${workouts.length - 1} more</div>` : ''}
      </div>
    `;
  }

  private generateEmptyDayCard(date: Date, isToday: boolean, isCenter = false): string {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();

    return `
      <div class="workout-card empty-day ${isToday ? 'today' : ''} ${isCenter ? 'center-day' : ''}">
        <div class="workout-date">${dayName}, ${dayNumber}</div>
        <div class="no-workout">
          <div class="rest-day-icon">💤</div>
          <div class="rest-day-text">Rest Day</div>
        </div>
      </div>
    `;
  }

  private getPrimaryWorkout(workouts: TrackedWorkout[]): TrackedWorkout | null {
    if (workouts.length === 0) return null;
    if (workouts.length === 1) return workouts[0];

    // Prioritize completed workouts, then planned, then unplanned
    const completed = workouts.find(w => w.status === 'completed');
    if (completed) return completed;

    const planned = workouts.find(w => w.status === 'planned');
    if (planned) return planned;

    return workouts[0]; // Return first if no clear priority
  }

  private getWorkoutCardClass(workout: TrackedWorkout): string {
    const classes = ['workout-card'];
    
    if (workout.status === 'completed' && workout.actualWorkout) {
      classes.push('has-actual');
    } else if (workout.status === 'planned') {
      classes.push('planned-only');
    } else if (workout.status === 'missed') {
      classes.push('missed-workout');
    } else if (workout.status === 'unplanned') {
      classes.push('unplanned-workout');
    }

    // Add intensity class based on expected fatigue
    if (workout.expectedFatigue <= 40) {
      classes.push('low-intensity');
    } else if (workout.expectedFatigue <= 65) {
      classes.push('moderate-intensity');
    } else if (workout.expectedFatigue <= 85) {
      classes.push('high-intensity');
    } else {
      classes.push('extreme-intensity');
    }

    return classes.join(' ');
  }

  private generateStatusBadges(workout: TrackedWorkout): string {
    const badges: string[] = [];

    if (workout.status === 'completed') {
      badges.push('<span class="status-badge completed">✅ Done</span>');
    } else if (workout.status === 'planned') {
      badges.push('<span class="status-badge planned">📅 Planned</span>');
    } else if (workout.status === 'missed') {
      badges.push('<span class="status-badge missed">❌ Missed</span>');
    } else if (workout.status === 'unplanned') {
      badges.push('<span class="status-badge unplanned">⚡ Extra</span>');
    }

    return `<div class="workout-status">${badges.join('')}</div>`;
  }

  private generateComparisonData(workout: TrackedWorkout): string {
    if (!workout.comparison || !this.config.showComparison) {
      return '';
    }

    const durationVariance = workout.comparison.durationVariance;
    const varianceClass = this.getVarianceClass(durationVariance.percentageChange);
    const varianceSign = durationVariance.percentageChange > 0 ? '+' : '';

    return `
      <div class="workout-comparison">
        <div class="duration-comparison">
          <span class="label">Duration:</span>
          <span class="value">${durationVariance.actual}min</span>
          <span class="variance ${varianceClass}">
            (${varianceSign}${durationVariance.percentageChange.toFixed(1)}%)
          </span>
        </div>
        ${workout.comparison.intensityVariance ? `
          <div class="intensity-comparison">
            <span class="label">Load:</span>
            <span class="value">${workout.comparison.performance.trainingLoadVariance > 0 ? '+' : ''}${workout.comparison.performance.trainingLoadVariance.toFixed(0)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  private generateAdherenceScore(workout: TrackedWorkout): string {
    if (!workout.comparison || !this.config.highlightAdherence) {
      return '';
    }

    const score = workout.comparison.adherence.score;
    const category = workout.comparison.adherence.category;

    return `<div class="adherence-score ${category}">${score}</div>`;
  }

  private generateExpandedDetails(workout: TrackedWorkout): string {
    if (!workout.actualWorkout) {
      return `
        <div class="expanded-details">
          <div class="planned-details">
            <div class="detail-item">
              <span class="label">Expected Duration:</span>
              <span class="value">${workout.durationMin} min</span>
            </div>
            <div class="detail-item">
              <span class="label">Expected Fatigue:</span>
              <span class="value">${workout.expectedFatigue}/100</span>
            </div>
          </div>
        </div>
      `;
    }

    const actual = workout.actualWorkout;
    return `
      <div class="expanded-details">
        <div class="actual-details">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">Distance:</span>
              <span class="value">${actual.distance.toFixed(2)} km</span>
            </div>
            <div class="detail-item">
              <span class="label">Avg HR:</span>
              <span class="value">${actual.avgHR || 'N/A'} bpm</span>
            </div>
            <div class="detail-item">
              <span class="label">Training Load:</span>
              <span class="value">${actual.trainingLoad.toFixed(0)}</span>
            </div>
            <div class="detail-item">
              <span class="label">Calories:</span>
              <span class="value">${actual.calories || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        ${workout.comparison ? `
          <div class="adherence-summary">
            <div class="adherence-label">Adherence:</div>
            <div class="adherence-items">
              ${workout.comparison.adherence.feedback.slice(0, 2).map(feedback => 
                `<div class="feedback-item">${feedback}</div>`
              ).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getVarianceClass(percentage: number): string {
    if (Math.abs(percentage) <= 5) return 'neutral';
    return percentage > 0 ? 'positive' : 'negative';
  }

  private formatWorkoutType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }

  private truncateDescription(description: string, maxLength: number): string {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Add click listeners to workout cards
    const workoutCards = this.container.querySelectorAll('.workout-card:not(.empty-day)');
    workoutCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const date = (card as HTMLElement).dataset.date;
        const workoutId = (card as HTMLElement).dataset.workoutId;
        
        if (date) {
          const workout = this.workouts.find(w => w.date === date && w.workoutId === workoutId);
          if (workout) {
            this.onWorkoutSelect(workout);
          }
        }
      });

      // Add hover effect
      card.addEventListener('mouseenter', () => {
        card.classList.add('hovered');
      });

      card.addEventListener('mouseleave', () => {
        card.classList.remove('hovered');
      });
    });

    // Add double-click for quick edit (placeholder)
    workoutCards.forEach(card => {
      card.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const date = (card as HTMLElement).dataset.date;
        if (date) {
          // Placeholder for quick edit functionality
          console.log('Quick edit workout for date:', date);
        }
      });
    });
  }

  // Public methods for external control
  public selectWorkout(date: string): void {
    const workout = this.workouts.find(w => w.date === date);
    if (workout) {
      this.onWorkoutSelect(workout);
    }
  }

  public highlightDate(date: string): void {
    if (!this.container) return;
    
    // Remove existing highlights
    this.container.querySelectorAll('.workout-card.highlighted').forEach(card => {
      card.classList.remove('highlighted');
    });

    // Add highlight to specified date
    const card = this.container.querySelector(`[data-date="${date}"]`);
    if (card) {
      card.classList.add('highlighted');
    }
  }

  public getWorkoutsInView(): TrackedWorkout[] {
    return this.getWorkoutsForView();
  }

  /**
   * Load workouts from storage for the calendar view
   */
  private async loadWorkoutsFromStorage(): Promise<TrackedWorkout[]> {
    try {
      // Check if user is authenticated
      if (!WorkoutStorageService.isAuthenticated()) {
        console.log('User not authenticated, no workouts to load');
        return [];
      }

      // Get the active training plan
      const activePlan = await WorkoutStorageService.getActivePlan();
      if (!activePlan) {
        console.log('No active training plan found');
        return [];
      }

      // Convert plan workouts to TrackedWorkout format
      const trackedWorkouts: TrackedWorkout[] = activePlan.plan.map(workout => ({
        workoutId: workout.workoutId || `planned-${workout.date}`,
        date: workout.date,
        workoutType: workout.workoutType,
        description: workout.description,
        expectedFatigue: workout.expectedFatigue,
        durationMin: workout.durationMin,
        status: workout.completed ? 'completed' : 'planned',
        lastModified: new Date().toISOString()
      }));

      console.log(`Loaded ${trackedWorkouts.length} workouts from active plan: ${activePlan.name}`);
      return trackedWorkouts;

    } catch (error) {
      console.error('Error loading workouts from storage:', error);
      return [];
    }
  }

  /**
   * Refresh workouts from storage
   */
  public async refreshFromStorage(): Promise<void> {
    this.workouts = await this.loadWorkoutsFromStorage();
    this.render();
  }

  /**
   * Mark a workout as completed
   */
  public async markWorkoutCompleted(workoutId: string, actualData?: {
    duration?: number;
    distance?: number;
    avgHR?: number;
    notes?: string;
  }): Promise<void> {
    try {
      // Update in storage if available
      if (WorkoutStorageService.isAuthenticated()) {
        // This would need to be implemented in WorkoutStorageService
        console.log(`Marking workout ${workoutId} as completed with data:`, actualData);
      }

      // Update local workout status
      const workout = this.workouts.find(w => w.workoutId === workoutId);
      if (workout) {
        workout.status = 'completed';
        if (actualData) {
          workout.actualWorkout = {
            date: workout.date,
            sport: workout.workoutType,
            duration: actualData.duration || workout.durationMin,
            distance: actualData.distance || 0,
            trainingLoad: workout.expectedFatigue * 2, // Rough estimate
            avgHR: actualData.avgHR,
            maxHR: actualData.avgHR ? actualData.avgHR + 20 : undefined,
            calories: Math.round((actualData.duration || workout.durationMin) * 10), // Rough estimate
            zone1Minutes: 0,
            zone2Minutes: 0,
            zone3Minutes: 0,
            zone4Minutes: 0,
            zone5Minutes: 0,
            notes: actualData.notes
          };
        }
        workout.lastModified = new Date().toISOString();
        this.render();
      }

    } catch (error) {
      console.error('Error marking workout as completed:', error);
    }
  }

  /**
   * Mark a workout as missed
   */
  public async markWorkoutMissed(workoutId: string, reason?: string): Promise<void> {
    try {
      // Update in storage if available
      if (WorkoutStorageService.isAuthenticated()) {
        console.log(`Marking workout ${workoutId} as missed. Reason: ${reason || 'No reason provided'}`);
      }

      // Update local workout status
      const workout = this.workouts.find(w => w.workoutId === workoutId);
      if (workout) {
        workout.status = 'missed';
        workout.lastModified = new Date().toISOString();
        this.render();
      }

    } catch (error) {
      console.error('Error marking workout as missed:', error);
    }
  }
}