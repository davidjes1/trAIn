// Enhanced Modern Workout Calendar component
import { TrackedWorkout, CalendarViewConfig } from '../../types/workout-tracking.types';

export class EnhancedWorkoutCalendar {
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
    this.workouts = workouts;
    this.config = config;

    if (!this.container) {
      console.error('Workout calendar container not found');
      return;
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

    this.container.innerHTML = '';
    const calendarHtml = this.generateModernCalendarHTML();
    this.container.innerHTML = calendarHtml;
    this.attachEventListeners();
  }

  private generateModernCalendarHTML(): string {
    const currentDate = new Date(this.config.startDate);
    const days: string[] = [];

    // Generate week view centered on current date
    for (let i = -3; i <= 3; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      const dayWorkouts = this.getWorkoutsForDate(date);
      
      days.push(this.generateModernDayCard(date, dayWorkouts, i === 0));
    }

    return `
      <div class="modern-calendar-container">
        <div class="calendar-header">
          <div class="calendar-title">
            <h3>Training Calendar</h3>
            <p class="calendar-subtitle">${this.getWeekRangeText()}</p>
          </div>
          <div class="calendar-legend">
            <div class="legend-item">
              <div class="legend-dot planned"></div>
              <span>Planned</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot completed"></div>
              <span>Completed</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot rest"></div>
              <span>Rest</span>
            </div>
          </div>
        </div>
        
        <div class="modern-calendar-grid">
          ${days.join('')}
        </div>
        
        <div class="calendar-footer">
          <div class="week-stats">
            ${this.generateWeekStats()}
          </div>
        </div>
      </div>
    `;
  }

  private generateModernDayCard(date: Date, workouts: TrackedWorkout[], isCenter: boolean): string {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayShort = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    
    const primaryWorkout = this.getPrimaryWorkout(workouts);
    const cardClass = this.getModernCardClass(primaryWorkout, isToday, isCenter);
    
    if (!primaryWorkout) {
      return this.generateModernRestDay(date, isToday, isCenter);
    }

    const statusIcon = this.getStatusIcon(primaryWorkout);
    const intensityColor = this.getIntensityColor(primaryWorkout);
    const duration = this.formatDuration(primaryWorkout);
    const description = this.getSmartDescription(primaryWorkout);

    return `
      <div class="${cardClass}" data-date="${dateStr}" data-workout-id="${primaryWorkout.workoutId || ''}">
        <div class="day-header">
          <div class="date-info">
            <div class="day-name">${isCenter ? dayName : dayShort}</div>
            <div class="date-number">${dayNumber}</div>
            <div class="month-name">${monthName}</div>
          </div>
          <div class="status-indicator ${primaryWorkout.status}">
            ${statusIcon}
          </div>
        </div>
        
        <div class="workout-content">
          <div class="workout-type" style="border-left: 4px solid ${intensityColor}">
            ${this.formatWorkoutType(primaryWorkout.workoutType)}
          </div>
          
          <div class="workout-details">
            <div class="duration">${duration}</div>
            ${primaryWorkout.expectedFatigue ? `<div class="intensity">Intensity: ${this.getIntensityLabel(primaryWorkout.expectedFatigue)}</div>` : ''}
          </div>
          
          <div class="workout-description">
            ${description}
          </div>
          
          ${this.generateModernMetrics(primaryWorkout)}
        </div>
        
        ${workouts.length > 1 ? `<div class="multiple-indicator">+${workouts.length - 1}</div>` : ''}
        ${this.generateAdherenceBadge(primaryWorkout)}
      </div>
    `;
  }

  private generateModernRestDay(date: Date, isToday: boolean, isCenter: boolean): string {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayShort = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });

    return `
      <div class="modern-day-card rest-day ${isToday ? 'today' : ''} ${isCenter ? 'center-day' : ''}" data-date="${dateStr}">
        <div class="day-header">
          <div class="date-info">
            <div class="day-name">${isCenter ? dayName : dayShort}</div>
            <div class="date-number">${dayNumber}</div>
            <div class="month-name">${monthName}</div>
          </div>
          <div class="status-indicator rest">
            💤
          </div>
        </div>
        
        <div class="rest-content">
          <div class="rest-icon">🌿</div>
          <div class="rest-text">Rest Day</div>
          <div class="rest-subtitle">Recovery time</div>
        </div>
      </div>
    `;
  }

  private getModernCardClass(workout: TrackedWorkout | null, isToday: boolean, isCenter: boolean): string {
    let classes = ['modern-day-card'];
    
    if (workout) {
      classes.push('has-workout', workout.status);
    }
    
    if (isToday) classes.push('today');
    if (isCenter) classes.push('center-day');
    
    return classes.join(' ');
  }

  private getStatusIcon(workout: TrackedWorkout): string {
    switch (workout.status) {
      case 'completed': return '✅';
      case 'planned': return '📅';
      case 'missed': return '⏭️';
      case 'unplanned': return '🔄';
      default: return '❓';
    }
  }

  private getIntensityColor(workout: TrackedWorkout): string {
    const intensity = workout.expectedFatigue || 50;
    if (intensity < 30) return '#4CAF50'; // Green - Easy
    if (intensity < 60) return '#FF9800'; // Orange - Moderate
    if (intensity < 80) return '#F44336'; // Red - Hard
    return '#9C27B0'; // Purple - Very Hard
  }

  private getIntensityLabel(intensity: number): string {
    if (intensity < 30) return 'Easy';
    if (intensity < 60) return 'Moderate';
    if (intensity < 80) return 'Hard';
    return 'Very Hard';
  }

  private formatDuration(workout: TrackedWorkout): string {
    const minutes = workout.durationMin || workout.actualWorkout?.duration || 0;
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  private getSmartDescription(workout: TrackedWorkout): string {
    if (workout.actualWorkout) {
      const { distance, sport } = workout.actualWorkout;
      return `${distance.toFixed(1)}km ${sport}`;
    }
    return workout.description.length > 40 
      ? `${workout.description.substring(0, 37)}...`
      : workout.description;
  }

  private generateModernMetrics(workout: TrackedWorkout): string {
    if (!workout.actualWorkout) return '';

    const { avgHR, trainingLoad, distance } = workout.actualWorkout;
    const metrics: string[] = [];

    if (distance) metrics.push(`📏 ${distance.toFixed(1)}km`);
    if (avgHR) metrics.push(`❤️ ${avgHR}bpm`);
    if (trainingLoad) metrics.push(`⚡ ${Math.round(trainingLoad)} TRIMP`);

    return metrics.length > 0 
      ? `<div class="workout-metrics">${metrics.join(' • ')}</div>`
      : '';
  }

  private generateAdherenceBadge(workout: TrackedWorkout): string {
    if (!workout.comparison?.adherence) return '';

    const { score, category } = workout.comparison.adherence;
    const badgeClass = category === 'excellent' ? 'success' : 
                     category === 'good' ? 'warning' : 'error';

    return `
      <div class="adherence-badge ${badgeClass}">
        ${Math.round(score)}%
      </div>
    `;
  }

  private getWeekRangeText(): string {
    const startDate = new Date(this.config.startDate);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `${startStr} - ${endStr}`;
  }

  private generateWeekStats(): string {
    const weekWorkouts = this.getWorkoutsForWeek();
    const completed = weekWorkouts.filter(w => w.status === 'completed').length;
    const planned = weekWorkouts.filter(w => w.status === 'planned').length;
    const totalTrainingLoad = weekWorkouts
      .filter(w => w.actualWorkout)
      .reduce((sum, w) => sum + (w.actualWorkout?.trainingLoad || 0), 0);

    return `
      <div class="stat-item">
        <span class="stat-value">${completed}</span>
        <span class="stat-label">Completed</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${planned}</span>
        <span class="stat-label">Planned</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${Math.round(totalTrainingLoad)}</span>
        <span class="stat-label">TRIMP</span>
      </div>
    `;
  }

  private getWorkoutsForDate(date: Date): TrackedWorkout[] {
    const dateStr = date.toISOString().split('T')[0];
    return this.workouts.filter(workout => workout.date === dateStr);
  }

  private getWorkoutsForWeek(): TrackedWorkout[] {
    const startDate = new Date(this.config.startDate);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return this.workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= startDate && workoutDate <= endDate;
    });
  }

  private getPrimaryWorkout(workouts: TrackedWorkout[]): TrackedWorkout | null {
    if (workouts.length === 0) return null;
    if (workouts.length === 1) return workouts[0];

    // Prioritize completed workouts, then planned
    const completed = workouts.find(w => w.status === 'completed');
    if (completed) return completed;

    const planned = workouts.find(w => w.status === 'planned');
    if (planned) return planned;

    return workouts[0];
  }

  private formatWorkoutType(type: string): string {
    return type.split(/[-_\s]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    this.container.querySelectorAll('.modern-day-card.has-workout').forEach(card => {
      card.addEventListener('click', (e) => {
        const workoutId = (e.currentTarget as HTMLElement).dataset.workoutId;
        const date = (e.currentTarget as HTMLElement).dataset.date;
        
        if (date) {
          const workout = this.workouts.find(w => 
            w.date === date && (workoutId ? w.workoutId === workoutId : true)
          );
          if (workout) {
            this.onWorkoutSelect(workout);
          }
        }
      });
    });
  }
}