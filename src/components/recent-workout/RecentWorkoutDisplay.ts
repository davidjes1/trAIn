// Recent Workout Display Component - shows detailed info about the most recently uploaded workout
import WorkoutService from '../../services/WorkoutService';
import { Workout } from '@/core/models';
import { AuthService } from '../../firebase/auth';

export class RecentWorkoutDisplay {
  private container: HTMLElement;
  private recentWorkouts: Workout[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadRecentWorkouts();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Load the most recent completed or unplanned workouts (last 3)
   */
  private async loadRecentWorkouts(): Promise<void> {
    try {
      const userId = AuthService.getCurrentUserId();
      if (!userId) {
        console.log('User not authenticated, cannot load recent workouts');
        return;
      }

      console.log('📊 Loading recent workouts...');
      
      // Run Firebase data test for debugging (only in development)
      if ((import.meta as any).env?.DEV) {
        console.log('🔍 Running Firebase data test...');
        try {
          await testFirebaseWorkoutData(userId);
        } catch (error) {
          console.log('⚠️ Firebase test failed (but continuing):', error);
        }
      }
      
      // Get all user workouts and find the most recent completed/unplanned ones
      const allWorkouts = await WorkoutService.getUserWorkouts(userId, 50); // Get recent 50
      
      // Filter for completed or unplanned workouts (those with actual data)
      const completedWorkouts = allWorkouts.filter(w => 
        (w.status === 'completed' || w.status === 'unplanned') && w.actual
      );

      if (completedWorkouts.length > 0) {
        // Sort by processed date (most recent first)
        completedWorkouts.sort((a, b) => {
          const dateA = a.actual?.processedAt || a.updatedAt;
          const dateB = b.actual?.processedAt || b.updatedAt;
          return dateB.getTime() - dateA.getTime();
        });

        // Take the last 3 workouts
        this.recentWorkouts = completedWorkouts.slice(0, 3);
        console.log(`✅ Found ${this.recentWorkouts.length} recent workouts`);
      } else {
        console.log('📊 No recent completed workouts found');
        this.recentWorkouts = [];
      }
      
    } catch (error) {
      console.error('❌ Error loading recent workouts:', error);
      this.recentWorkouts = [];
    }
  }

  /**
   * Render the recent workouts display
   */
  public render(): void {
    if (!this.recentWorkouts || this.recentWorkouts.length === 0) {
      this.showEmptyState();
      return;
    }

    const workoutsHtml = this.recentWorkouts.map(workout => this.renderSingleWorkout(workout)).join('');
    
    this.container.innerHTML = `
      <div class="recent-workouts-container">
        <div class="recent-workouts-header">
          <h3 class="section-title">
            <span class="section-icon">📊</span>
            Recent Workouts (${this.recentWorkouts.length})
          </h3>
          <button class="btn btn-ghost refresh-btn" id="refresh-recent-workout" aria-label="Refresh recent workouts">
            <span aria-hidden="true">🔄</span>
          </button>
        </div>
        <div class="recent-workouts-list">
          ${workoutsHtml}
        </div>
      </div>
    `;

    // Dispatch event to notify that component has rendered
    this.container.dispatchEvent(new CustomEvent('recent-workouts-rendered', {
      detail: { workouts: this.recentWorkouts }
    }));
  }

  /**
   * Render a single workout card
   */
  private renderSingleWorkout(workout: Workout): string {
    const actual = workout.actual;
    if (!actual) {
      console.warn('No actual workout data available');
      return '';
    }
    const uploadDate = actual.processedAt ? new Date(actual.processedAt) : new Date(workout.updatedAt);
    
    return `
      <div class="recent-workout-card">
        <div class="workout-header">
          <div class="workout-title">
            <div class="sport-icon">${this.getSportIcon(workout.sport)}</div>
            <div class="workout-info">
              <h4 class="workout-name">${workout.name}</h4>
              <div class="workout-metadata">
                <span class="workout-date">${new Date(workout.date).toLocaleDateString()}</span>
                <span class="status-badge ${workout.status}">${this.getStatusLabel(workout.status)}</span>
                <span class="upload-time">Uploaded ${this.formatTimeAgo(uploadDate)}</span>
              </div>
            </div>
          </div>
          <button class="btn btn-ghost refresh-btn" id="refresh-recent-workout" aria-label="Refresh recent workout">
            <span aria-hidden="true">🔄</span>
          </button>
        </div>

        <div class="workout-content">
          <!-- Main Performance Metrics -->
          <div class="performance-overview">
            <div class="primary-metrics">
              ${actual.durationMin ? `
                <div class="metric-large">
                  <div class="metric-icon">⏱️</div>
                  <div class="metric-details">
                    <div class="metric-value">${actual.durationMin}</div>
                    <div class="metric-label">Minutes</div>
                  </div>
                </div>
              ` : ''}
              
              ${actual.distanceKm ? `
                <div class="metric-large">
                  <div class="metric-icon">📏</div>
                  <div class="metric-details">
                    <div class="metric-value">${actual.distanceKm.toFixed(2)}</div>
                    <div class="metric-label">Kilometers</div>
                  </div>
                </div>
              ` : ''}
              
              ${actual.avgHR ? `
                <div class="metric-large">
                  <div class="metric-icon">💗</div>
                  <div class="metric-details">
                    <div class="metric-value">${actual.avgHR}</div>
                    <div class="metric-label">Avg HR</div>
                  </div>
                </div>
              ` : ''}
              
              ${actual.trainingLoad ? `
                <div class="metric-large">
                  <div class="metric-icon">⚡</div>
                  <div class="metric-details">
                    <div class="metric-value">${actual.trainingLoad}</div>
                    <div class="metric-label">Training Load</div>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Secondary Metrics Grid -->
          <div class="secondary-metrics">
            ${actual.maxHR ? `
              <div class="metric-item">
                <span class="metric-label">Max HR</span>
                <span class="metric-value">${actual.maxHR} bpm</span>
              </div>
            ` : ''}
            
            ${actual.avgPace ? `
              <div class="metric-item">
                <span class="metric-label">Avg Pace</span>
                <span class="metric-value">${actual.avgPace}</span>
              </div>
            ` : ''}
            
            ${actual.avgPower ? `
              <div class="metric-item">
                <span class="metric-label">Avg Power</span>
                <span class="metric-value">${actual.avgPower}W</span>
              </div>
            ` : ''}
            
            ${actual.maxPower ? `
              <div class="metric-item">
                <span class="metric-label">Max Power</span>
                <span class="metric-value">${actual.maxPower}W</span>
              </div>
            ` : ''}
            
            ${actual.calories ? `
              <div class="metric-item">
                <span class="metric-label">Calories</span>
                <span class="metric-value">${actual.calories}</span>
              </div>
            ` : ''}
            
            ${actual.avgCadence ? `
              <div class="metric-item">
                <span class="metric-label">Avg Cadence</span>
                <span class="metric-value">${actual.avgCadence} rpm</span>
              </div>
            ` : ''}
            
            ${actual.avgSpeed ? `
              <div class="metric-item">
                <span class="metric-label">Avg Speed</span>
                <span class="metric-value">${actual.avgSpeed.toFixed(1)} km/h</span>
              </div>
            ` : ''}
            
            ${actual.ascentM ? `
              <div class="metric-item">
                <span class="metric-label">Elevation Gain</span>
                <span class="metric-value">↗${actual.ascentM}m</span>
              </div>
            ` : ''}
            
            ${actual.descentM ? `
              <div class="metric-item">
                <span class="metric-label">Elevation Loss</span>
                <span class="metric-value">↘${actual.descentM}m</span>
              </div>
            ` : ''}
          </div>

          <!-- HR Zones (if available) -->
          ${actual.zones && actual.zones.length > 0 ? `
            <div class="hr-zones-section">
              <h5 class="section-title">
                <span class="section-icon">❤️</span>
                Heart Rate Zones
              </h5>
              <div class="zones-display">
                ${actual.zones.map((zone, index) => {
                  const zoneTime = this.getZoneTime(zone);
                  const percentage = this.calculateZonePercentage(zoneTime, actual.durationMin || 0);
                  return `
                    <div class="zone-item zone-${index + 1}">
                      <div class="zone-header">
                        <span class="zone-label">Z${index + 1}</span>
                        <span class="zone-percentage">${percentage}%</span>
                      </div>
                      <div class="zone-bar">
                        <div class="zone-fill" style="width: ${percentage}%"></div>
                      </div>
                      <div class="zone-time">${Math.round(zoneTime)} min</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Planned vs Actual Comparison (if available) -->
          ${workout.planned && this.hasComparison(workout) ? `
            <div class="comparison-section">
              <h5 class="section-title">
                <span class="section-icon">⚖️</span>
                Planned vs Actual
              </h5>
              <div class="comparison-grid">
                ${workout.planned.durationMin && actual.durationMin ? 
                  this.renderComparison('Duration', workout.planned.durationMin, actual.durationMin, 'min') : ''}
                ${workout.planned.distanceKm && actual.distanceKm ? 
                  this.renderComparison('Distance', workout.planned.distanceKm, actual.distanceKm, 'km', 1) : ''}
              </div>
            </div>
          ` : ''}

          <!-- Data Source Info -->
          <div class="data-source-info">
            <div class="source-details">
              <span class="source-label">Data Source:</span>
              <span class="source-value">${actual.dataSource || 'Unknown'}</span>
              <span class="upload-details">• Processed ${uploadDate.toLocaleDateString()} at ${uploadDate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show empty state when no recent workouts
   */
  private showEmptyState(): void {
    this.container.innerHTML = `
      <div class="recent-workout-empty">
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h4>No Recent Workouts</h4>
          <p>Upload your first FIT file or connect Strava to see detailed workout information here.</p>
          <div class="empty-actions">
            <button class="btn btn-secondary" id="go-to-import">
              <span aria-hidden="true">📁</span> Import Workout Data
            </button>
            ${(import.meta as any).env?.DEV ? `
              <button class="btn btn-outline" id="create-sample-data">
                <span aria-hidden="true">🧪</span> Create Sample Data
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Refresh button
    const refreshBtn = this.container.querySelector('#refresh-recent-workout');
    refreshBtn?.addEventListener('click', () => {
      this.refresh();
    });

    // Go to import button (empty state)
    const importBtn = this.container.querySelector('#go-to-import');
    importBtn?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('show-import-modal'));
    });

    // Create sample data button (development only)
    const sampleBtn = this.container.querySelector('#create-sample-data');
    sampleBtn?.addEventListener('click', async () => {
      console.log('🧪 Creating sample workout data...');
      try {
        await createSampleWorkoutData();
        // Component should refresh automatically via workouts-updated event
      } catch (error) {
        console.error('❌ Failed to create sample data:', error);
      }
    });
  }

  /**
   * Check if workout has comparison data
   */
  private hasComparison(workout: Workout): boolean {
    return !!(workout.planned && workout.actual && 
      (workout.planned.durationMin || workout.planned.distanceKm));
  }

  /**
   * Render comparison between planned and actual values
   */
  private renderComparison(label: string, planned: number, actual: number, unit: string, decimals: number = 0): string {
    const difference = actual - planned;
    const percentageDiff = (difference / planned) * 100;
    const isOver = percentageDiff > 10;
    const isUnder = percentageDiff < -10;
    const statusClass = isOver ? 'over' : isUnder ? 'under' : 'on-target';
    
    return `
      <div class="comparison-item ${statusClass}">
        <div class="comparison-label">${label}</div>
        <div class="comparison-values">
          <span class="planned-value">${planned.toFixed(decimals)}${unit}</span>
          <span class="comparison-arrow">→</span>
          <span class="actual-value">${actual.toFixed(decimals)}${unit}</span>
        </div>
        <div class="comparison-diff">
          ${percentageDiff > 0 ? '+' : ''}${percentageDiff.toFixed(1)}%
        </div>
      </div>
    `;
  }

  /**
   * Calculate zone percentage
   */
  private calculateZonePercentage(zoneTime: number, totalTime: number): number {
    if (totalTime === 0) return 0;
    return Math.round((zoneTime / totalTime) * 100);
  }

  /**
   * Get zone time with fallback for different data structures
   */
  private getZoneTime(zone: any): number {
    // Handle different possible field names from Firebase
    return zone.timeMin || zone.minutes || zone.time || 0;
  }

  /**
   * Get sport icon emoji
   */
  private getSportIcon(sport: string): string {
    const iconMap: Record<string, string> = {
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
   * Get status label
   */
  private getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'completed': 'Completed',
      'unplanned': 'Unplanned',
      'planned': 'Planned',
      'missed': 'Missed'
    };
    return labelMap[status] || status;
  }

  /**
   * Format time ago string
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      return 'just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Refresh recent workouts data
   */
  public async refresh(): Promise<void> {
    const refreshBtn = this.container.querySelector('#refresh-recent-workout');
    if (refreshBtn) {
      refreshBtn.classList.add('loading');
    }
    
    await this.loadRecentWorkouts();
    this.render();
    
    if (refreshBtn) {
      refreshBtn.classList.remove('loading');
    }
  }

  /**
   * Get current recent workouts
   */
  public getRecentWorkouts(): Workout[] {
    return this.recentWorkouts;
  }
}

export default RecentWorkoutDisplay;