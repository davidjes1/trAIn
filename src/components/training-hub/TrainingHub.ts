// Main Training Hub component - unified interface for planning, tracking, and analytics
import { 
  TrackedWorkout, 
  TrainingHubState, 
  TrainingPeriodSummary 
} from '../../types/workout-tracking.types';
import { ActivityMetrics, LapMetrics } from '../../types/training-metrics.types';
import { UserProfile } from '../../types/firebase.types';
import { WorkoutMatchingService } from '../../services/WorkoutMatchingService';
import { PlanGenerator } from '../../services/PlanGenerator';
import { FileService } from '../../services/FileService';
import { UIHelpers } from '../../utils/ui-helpers';
import { WorkoutCalendar } from './WorkoutCalendar';
import { WorkoutComparison } from './WorkoutComparison';
import { AuthManager } from '../auth/AuthManager';
import { User } from 'firebase/auth';

export class TrainingHub {
  private state: TrainingHubState;
  private workoutCalendar: WorkoutCalendar;
  private workoutComparison: WorkoutComparison;
  private authManager: AuthManager;
  private currentUser: User | null = null;
  private userProfile: UserProfile | null = null;
  private isAuthenticated: boolean = false;

  constructor() {
    this.state = this.initializeState();
    
    // Initialize authentication first
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) {
      throw new Error('Auth container not found');
    }
    
    this.authManager = new AuthManager(authContainer, this.onAuthStateChanged.bind(this));
    
    // Initialize other components (they will be shown after authentication)
    this.workoutCalendar = new WorkoutCalendar(this.onWorkoutSelected.bind(this));
    this.workoutComparison = new WorkoutComparison();
  }

  private onAuthStateChanged(user: User | null, profile: UserProfile | null): void {
    this.currentUser = user;
    this.userProfile = profile;
    this.isAuthenticated = user !== null;

    if (this.isAuthenticated) {
      // Hide auth container and show main app
      const authContainer = document.getElementById('auth-container');
      const mainContent = document.getElementById('main-content');
      
      if (authContainer) authContainer.style.display = 'none';
      if (mainContent) mainContent.style.display = 'block';
      
      // Initialize the app
      this.initializeEventListeners();
      this.loadInitialData();
    } else {
      // Show auth container and hide main app
      const authContainer = document.getElementById('auth-container');
      const mainContent = document.getElementById('main-content');
      
      if (authContainer) authContainer.style.display = 'block';
      if (mainContent) mainContent.style.display = 'none';
    }
  }

  private initializeState(): TrainingHubState {
    return {
      calendar: {
        viewType: 'week',
        startDate: new Date().toISOString().split('T')[0],
        showPlannedOnly: false,
        showActualOnly: false,
        showComparison: true,
        highlightAdherence: true
      },
      trackedWorkouts: [],
      isLoading: false,
      errors: [],
      notifications: []
    };
  }

  private initializeEventListeners(): void {
    // Header controls
    document.getElementById('import-data-btn')?.addEventListener('click', () => {
      this.showImportDrawer();
    });

    document.getElementById('sync-data-btn')?.addEventListener('click', () => {
      this.syncData();
    });

    // Calendar controls
    document.getElementById('prev-week-btn')?.addEventListener('click', () => {
      this.navigateWeek(-1);
    });

    document.getElementById('next-week-btn')?.addEventListener('click', () => {
      this.navigateWeek(1);
    });

    document.getElementById('generate-plan-btn')?.addEventListener('click', () => {
      this.showPlanGenerationModal();
    });

    // Import drawer
    document.getElementById('close-import-drawer')?.addEventListener('click', () => {
      this.hideImportDrawer();
    });

    // File handling in import drawer
    this.setupFileHandling();

    // Plan generation modal
    document.getElementById('close-plan-modal')?.addEventListener('click', () => {
      this.hidePlanGenerationModal();
    });

    document.getElementById('cancel-plan-generation')?.addEventListener('click', () => {
      this.hidePlanGenerationModal();
    });

    document.getElementById('confirm-plan-generation')?.addEventListener('click', () => {
      this.generatePlan();
    });

    // Analytics controls
    document.getElementById('analytics-timeframe')?.addEventListener('change', (e) => {
      const timeframe = (e.target as HTMLSelectElement).value as 'week' | 'month' | 'quarter';
      this.updateAnalyticsTimeframe(timeframe);
    });

    // Workout detail panel
    document.getElementById('close-detail-panel')?.addEventListener('click', () => {
      this.hideWorkoutDetail();
    });
  }

  private async loadInitialData(): Promise<void> {
    this.setState({ isLoading: true });
    
    try {
      // Load any existing tracked workouts from localStorage or server
      const savedWorkouts = this.loadSavedWorkouts();
      this.setState({ trackedWorkouts: savedWorkouts });

      // Update header metrics
      this.updateHeaderMetrics();
      
      // Initialize calendar with current workouts
      await this.workoutCalendar.initialize(this.state.trackedWorkouts, this.state.calendar);
      
      // Load analytics data
      this.updateAnalytics();
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.addError('Failed to load training data');
    } finally {
      this.setState({ isLoading: false });
    }
  }

  private loadSavedWorkouts(): TrackedWorkout[] {
    try {
      const saved = localStorage.getItem('training-hub-workouts');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Error loading saved workouts:', error);
      return [];
    }
  }

  private saveWorkouts(): void {
    try {
      localStorage.setItem('training-hub-workouts', JSON.stringify(this.state.trackedWorkouts));
    } catch (error) {
      console.warn('Error saving workouts:', error);
    }
  }

  private setState(updates: Partial<TrainingHubState>): void {
    this.state = { ...this.state, ...updates };
    this.state.lastUpdated = new Date().toISOString();
  }

  private addError(message: string): void {
    this.setState({ 
      errors: [...this.state.errors, message] 
    });
    UIHelpers.showStatus(message, 'error');
  }

  // Note: addNotification method removed - will be replaced with Firebase notifications

  // Header Metrics Updates
  private updateHeaderMetrics(): void {
    const metrics = this.calculateCurrentMetrics();
    
    const readinessEl = document.getElementById('readiness-metric')?.querySelector('.metric-value');
    const weeklyLoadEl = document.getElementById('weekly-load-metric')?.querySelector('.metric-value');
    const streakEl = document.getElementById('streak-metric')?.querySelector('.metric-value');

    if (readinessEl) readinessEl.textContent = metrics.readiness.toString();
    if (weeklyLoadEl) weeklyLoadEl.textContent = metrics.weeklyLoad.toString();
    if (streakEl) streakEl.textContent = `${metrics.streak}d`;
  }

  private calculateCurrentMetrics() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week

    const thisWeekWorkouts = this.state.trackedWorkouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= weekStart && workoutDate <= now && w.status === 'completed';
    });

    const weeklyLoad = thisWeekWorkouts.reduce((sum, w) => 
      sum + (w.actualWorkout?.trainingLoad || w.expectedFatigue * 5), 0
    );

    // Calculate streak (consecutive days with completed workouts)
    let streak = 0;
    let currentDate = new Date(now);
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayWorkout = this.state.trackedWorkouts.find(w => 
        w.date === dateStr && w.status === 'completed'
      );
      
      if (dayWorkout) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Simple readiness calculation (would be more sophisticated in real app)
    const recentFatigue = thisWeekWorkouts.slice(-3).reduce((sum, w) => 
      sum + (w.actualWorkout?.trainingLoad || w.expectedFatigue * 5), 0
    ) / 3;
    const readiness = Math.max(0, Math.min(100, 100 - (recentFatigue / 10)));

    return {
      readiness: Math.round(readiness),
      weeklyLoad: Math.round(weeklyLoad),
      streak
    };
  }

  // Calendar Navigation
  private navigateWeek(direction: number): void {
    const currentDate = new Date(this.state.calendar.startDate);
    currentDate.setDate(currentDate.getDate() + (direction * 7));
    
    const newConfig = {
      ...this.state.calendar,
      startDate: currentDate.toISOString().split('T')[0]
    };

    this.setState({ calendar: newConfig });
    this.workoutCalendar.updateView(newConfig);
    this.updateCurrentPeriodDisplay();
  }

  private updateCurrentPeriodDisplay(): void {
    const startDate = new Date(this.state.calendar.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const periodEl = document.getElementById('current-period');
    if (periodEl) {
      const formatter = new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      periodEl.textContent = `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
    }
  }

  // Workout Selection Handler
  private onWorkoutSelected(workout: TrackedWorkout): void {
    this.setState({ selectedWorkout: workout });
    this.showWorkoutDetail(workout);
  }

  // Import Data Management
  private showImportDrawer(): void {
    const drawer = document.getElementById('data-import-drawer');
    if (drawer) {
      drawer.style.display = 'block';
      setTimeout(() => drawer.classList.add('visible'), 10);
    }
  }

  private hideImportDrawer(): void {
    const drawer = document.getElementById('data-import-drawer');
    if (drawer) {
      drawer.classList.remove('visible');
      setTimeout(() => drawer.style.display = 'none', 300);
    }
  }

  private setupFileHandling(): void {
    // Single file handling
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const dropZone = document.getElementById('dropZone');

    if (fileInput && dropZone) {
      fileInput.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          this.handleSingleFile(files[0]);
        }
      });

      dropZone.addEventListener('click', () => fileInput.click());
      this.setupDragAndDrop(dropZone, ['.fit'], (files) => {
        if (files.length > 0) this.handleSingleFile(files[0]);
      });
    }

    // Bulk file handling
    const bulkFileInput = document.getElementById('bulkFileInput') as HTMLInputElement;
    const bulkDropZone = document.getElementById('bulkDropZone');

    if (bulkFileInput && bulkDropZone) {
      bulkFileInput.addEventListener('change', (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        this.handleBulkFiles(files);
      });

      bulkDropZone.addEventListener('click', () => bulkFileInput.click());
      this.setupDragAndDrop(bulkDropZone, ['.fit'], (files) => {
        this.handleBulkFiles(files);
      });
    }

    // Bulk action buttons
    document.querySelector('[data-action="analyze-activities"]')?.addEventListener('click', () => {
      this.processBulkFiles();
    });

    // Note: Google Sheets upload removed - Firebase integration will replace this
  }

  private setupDragAndDrop(element: HTMLElement, acceptedExtensions: string[], onDrop: (files: File[]) => void): void {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      element.classList.add('dragover');
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('dragover');
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      element.classList.remove('dragover');
      
      const files = Array.from(e.dataTransfer?.files || []).filter(file =>
        acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      );
      
      if (files.length > 0) {
        onDrop(files);
      }
    });
  }

  private async handleSingleFile(file: File): Promise<void> {
    try {
      UIHelpers.showStatus('Processing FIT file...', 'info');
      
      const result = await FileService.handleFileWithAnalysis(file);
      
      if (result.activityMetrics) {
        await this.processNewActivity(result.activityMetrics, result.lapMetrics);
        UIHelpers.showStatus('Activity processed successfully!', 'success');
      }
      
    } catch (error) {
      console.error('Error processing file:', error);
      this.addError(`Failed to process ${file.name}: ${(error as Error).message}`);
    }
  }

  private handleBulkFiles(files: File[]): void {
    const selectedFilesEl = document.getElementById('selectedFiles');
    const bulkActionsEl = document.getElementById('bulkActions');
    
    if (selectedFilesEl && bulkActionsEl) {
      // Display selected files
      selectedFilesEl.innerHTML = files.map((file, index) => `
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${(file.size / 1024).toFixed(2)} KB</div>
          </div>
          <button class="remove-file" data-index="${index}">×</button>
        </div>
      `).join('');

      // Show bulk actions
      bulkActionsEl.style.display = files.length > 0 ? 'flex' : 'none';
      
      // Store files for processing
      (this as any).bulkFiles = files;
    }
  }

  private async processBulkFiles(): Promise<void> {
    const files = (this as any).bulkFiles as File[];
    if (!files || files.length === 0) return;

    try {
      UIHelpers.showStatus(`Processing ${files.length} FIT files...`, 'info');
      
      let processed = 0;
      let errors = 0;

      for (const file of files) {
        try {
          const result = await FileService.handleFileWithAnalysis(file);
          if (result.activityMetrics) {
            await this.processNewActivity(result.activityMetrics, result.lapMetrics);
            processed++;
          }
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          errors++;
        }
      }
      
      const message = errors > 0 
        ? `Processed ${processed} files, ${errors} failed`
        : `Successfully processed all ${processed} files!`;
      
      UIHelpers.showStatus(message, errors > 0 ? 'warning' : 'success');
      
    } catch (error) {
      this.addError('Bulk processing failed');
    }
  }

  private async processNewActivity(activity: ActivityMetrics, laps?: LapMetrics[]): Promise<void> {
    // Try to match with existing planned workouts
    const matchResult = WorkoutMatchingService.matchWorkout(
      activity,
      laps || [],
      this.state.trackedWorkouts.filter(w => w.status === 'planned')
    );

    let trackedWorkout: TrackedWorkout;

    if (matchResult.recommendation.shouldAutoMatch && matchResult.recommendation.bestMatch) {
      // Auto-match with planned workout
      trackedWorkout = WorkoutMatchingService.createTrackedWorkout(
        matchResult.recommendation.bestMatch,
        activity,
        laps
      );
      
      // Remove the original planned workout and add the tracked one
      this.setState({
        trackedWorkouts: this.state.trackedWorkouts.filter(w => 
          w.date !== matchResult.recommendation.bestMatch!.date
        ).concat(trackedWorkout)
      });
      
    } else {
      // Create as unplanned workout
      trackedWorkout = WorkoutMatchingService.createTrackedWorkout(
        {
          date: activity.date,
          workoutType: activity.sport.toLowerCase(),
          description: `${activity.sport} workout`,
          expectedFatigue: Math.min(100, activity.trainingLoad / 5),
          durationMin: activity.duration,
          workoutId: `unplanned-${Date.now()}`,
          completed: false
        },
        activity,
        laps
      );
      trackedWorkout.status = 'unplanned';
      
      this.setState({
        trackedWorkouts: [...this.state.trackedWorkouts, trackedWorkout]
      });
    }

    // Save and refresh UI
    this.saveWorkouts();
    this.updateHeaderMetrics();
    await this.workoutCalendar.updateWorkouts(this.state.trackedWorkouts);
    this.updateAnalytics();
  }

  // Note: uploadToSheets method removed - Firebase integration will replace this

  // Plan Generation
  private showPlanGenerationModal(): void {
    const modal = document.getElementById('plan-generation-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  private hidePlanGenerationModal(): void {
    const modal = document.getElementById('plan-generation-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  private async generatePlan(): Promise<void> {
    try {
      UIHelpers.showStatus('Generating training plan...', 'info');
      
      const planOptions = this.gatherPlanOptions();
      const result = PlanGenerator.generatePlan(planOptions);
      
      // Convert to tracked workouts and add to state
      const newTrackedWorkouts = result.plan.map(workout => 
        WorkoutMatchingService.createTrackedWorkout(workout)
      ).filter(w => {
        // Don't overwrite existing workouts
        return !this.state.trackedWorkouts.some(existing => existing.date === w.date);
      });
      
      this.setState({
        trackedWorkouts: [...this.state.trackedWorkouts, ...newTrackedWorkouts]
      });
      
      this.saveWorkouts();
      await this.workoutCalendar.updateWorkouts(this.state.trackedWorkouts);
      this.updateHeaderMetrics();
      
      this.hidePlanGenerationModal();
      UIHelpers.showStatus(`Generated ${newTrackedWorkouts.length} new workouts!`, 'success');
      
    } catch (error) {
      console.error('Error generating plan:', error);
      this.addError('Failed to generate training plan');
    }
  }

  private gatherPlanOptions(): any {
    // Gather form values from the modal
    const age = parseInt((document.getElementById('athlete-age') as HTMLInputElement).value) || 30;
    const fitnessLevel = (document.getElementById('fitness-level') as HTMLSelectElement).value as 'beginner' | 'intermediate' | 'advanced';
    const eventDate = (document.getElementById('event-date') as HTMLInputElement).value;
    const planDuration = parseInt((document.getElementById('plan-duration') as HTMLInputElement).value) || 10;
    const bodyBattery = parseInt((document.getElementById('body-battery') as HTMLInputElement).value) || undefined;
    const sleepScore = parseInt((document.getElementById('sleep-score') as HTMLInputElement).value) || undefined;

    // Generate sample recent data based on actual workouts
    const recentWorkouts = this.state.trackedWorkouts
      .filter(w => w.status === 'completed' && w.actualWorkout)
      .slice(-7)
      .map(w => ({
        date: w.date,
        type: w.workoutType,
        duration: w.actualWorkout!.duration,
        fatigue: w.actualWorkout!.trainingLoad / 5,
        trainingLoad: w.actualWorkout!.trainingLoad
      }));

    const recentFatigueScores = recentWorkouts.length > 0
      ? recentWorkouts.map(w => w.fatigue)
      : [25, 30, 35, 25, 40, 30, 35]; // Default sample data

    return {
      user: {
        age,
        sex: 'male' as const,
        eventDate: eventDate || this.getDefaultEventDate(),
        trainingDays: 5,
        fitnessLevel
      },
      recoveryMetrics: {
        bodyBattery,
        sleepScore
      },
      recentFatigueScores,
      recentWorkouts,
      planDuration,
      availabilityToday: true
    };
  }

  private getDefaultEventDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + (12 * 7)); // 12 weeks from now
    return date.toISOString().split('T')[0];
  }

  // Workout Detail Panel
  private showWorkoutDetail(workout: TrackedWorkout): void {
    const panel = document.getElementById('workout-detail-panel');
    const title = document.getElementById('workout-detail-title');
    const content = document.getElementById('workout-detail-content');
    
    if (panel && title && content) {
      title.textContent = `${workout.workoutType} - ${new Date(workout.date).toLocaleDateString()}`;
      content.innerHTML = this.workoutComparison.generateComparisonHTML(workout);
      
      panel.style.display = 'block';
      setTimeout(() => panel.classList.add('visible'), 10);
    }
  }

  private hideWorkoutDetail(): void {
    const panel = document.getElementById('workout-detail-panel');
    if (panel) {
      panel.classList.remove('visible');
      setTimeout(() => panel.style.display = 'none', 300);
    }
  }

  // Analytics
  private updateAnalyticsTimeframe(timeframe: 'week' | 'month' | 'quarter'): void {
    // Update analytics based on selected timeframe
    this.updateAnalytics(timeframe);
  }

  private updateAnalytics(timeframe: 'week' | 'month' | 'quarter' = 'week'): void {
    const summary = this.calculatePeriodSummary(timeframe);
    this.updateAdherenceOverview(summary);
    this.updatePerformanceMetrics();
  }

  private calculatePeriodSummary(timeframe: 'week' | 'month' | 'quarter'): TrainingPeriodSummary {
    const now = new Date();
    const startDate = new Date(now);
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        startDate.setDate(now.getDate() - 90);
        break;
    }

    const periodWorkouts = this.state.trackedWorkouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= startDate && workoutDate <= now;
    });

    const plannedWorkouts = periodWorkouts.filter(w => w.status !== 'unplanned');
    const completedWorkouts = periodWorkouts.filter(w => w.status === 'completed');

    const planned = {
      totalWorkouts: plannedWorkouts.length,
      totalDuration: plannedWorkouts.reduce((sum, w) => sum + w.durationMin, 0),
      totalTrainingLoad: plannedWorkouts.reduce((sum, w) => sum + w.expectedFatigue * 5, 0),
      workoutsByType: this.groupWorkoutsByType(plannedWorkouts)
    };

    const actual = {
      completedWorkouts: completedWorkouts.length,
      totalDuration: completedWorkouts.reduce((sum, w) => sum + (w.actualWorkout?.duration || w.durationMin), 0),
      totalTrainingLoad: completedWorkouts.reduce((sum, w) => sum + (w.actualWorkout?.trainingLoad || w.expectedFatigue * 5), 0),
      workoutsByType: this.groupWorkoutsByType(completedWorkouts, true)
    };

    const adherence = {
      completionRate: planned.totalWorkouts > 0 ? (actual.completedWorkouts / planned.totalWorkouts) * 100 : 0,
      durationAdherence: planned.totalDuration > 0 ? (actual.totalDuration / planned.totalDuration) * 100 : 0,
      loadAdherence: planned.totalTrainingLoad > 0 ? (actual.totalTrainingLoad / planned.totalTrainingLoad) * 100 : 0,
      overallScore: 0
    };

    adherence.overallScore = (adherence.completionRate + adherence.durationAdherence + adherence.loadAdherence) / 3;

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      planned,
      actual,
      adherence,
      insights: {
        consistencyScore: adherence.completionRate,
        intensityTrend: 'stable' as const,
        recommendations: [],
        warnings: []
      }
    };
  }

  private groupWorkoutsByType(workouts: TrackedWorkout[], useActual = false): Record<string, number> {
    return workouts.reduce((acc, workout) => {
      const type = useActual ? (workout.actualWorkout?.sport || workout.workoutType) : workout.workoutType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private updateAdherenceOverview(summary: TrainingPeriodSummary): void {
    const completionRate = Math.round(summary.adherence.completionRate);
    const circle = document.getElementById('completion-rate-circle');
    const plannedEl = document.getElementById('planned-workouts');
    const completedEl = document.getElementById('completed-workouts');
    const loadVarianceEl = document.getElementById('load-variance');

    if (circle) {
      const valueEl = circle.querySelector('.metric-value');
      if (valueEl) valueEl.textContent = `${completionRate}%`;
      
      // Update circle progress
      (circle as any).style.setProperty('--percentage', completionRate.toString());
    }

    if (plannedEl) plannedEl.textContent = summary.planned.totalWorkouts.toString();
    if (completedEl) completedEl.textContent = summary.actual.completedWorkouts.toString();
    if (loadVarianceEl) {
      const variance = Math.round(summary.adherence.loadAdherence - 100);
      loadVarianceEl.textContent = `${variance > 0 ? '+' : ''}${variance}%`;
    }
  }

  private updatePerformanceMetrics(): void {
    // Calculate and update performance metrics
    const avgDurationVariance = document.getElementById('avg-duration-variance');
    const zoneCompliance = document.getElementById('zone-compliance');
    const consistencyScore = document.getElementById('consistency-score');

    // Placeholder calculations - would be more sophisticated in real app
    if (avgDurationVariance) avgDurationVariance.textContent = '+2.3%';
    if (zoneCompliance) zoneCompliance.textContent = '87%';
    if (consistencyScore) consistencyScore.textContent = '8.2/10';
  }

  // Data Sync
  private async syncData(): Promise<void> {
    try {
      UIHelpers.showStatus('Syncing data...', 'info');
      
      // Placeholder for actual sync logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.updateHeaderMetrics();
      this.updateAnalytics();
      
      UIHelpers.showStatus('Data synced successfully!', 'success');
      
    } catch (error) {
      this.addError('Failed to sync data');
    }
  }

  // Public API for external integration
  public getState(): TrainingHubState {
    return { ...this.state };
  }

  public addWorkout(workout: TrackedWorkout): void {
    this.setState({
      trackedWorkouts: [...this.state.trackedWorkouts, workout]
    });
    this.saveWorkouts();
  }

  public updateWorkout(date: string, updates: Partial<TrackedWorkout>): void {
    this.setState({
      trackedWorkouts: this.state.trackedWorkouts.map(w => 
        w.date === date ? { ...w, ...updates } : w
      )
    });
    this.saveWorkouts();
  }
}