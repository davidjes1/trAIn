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
import { DashboardService, DashboardData } from '../../services/DashboardService';
import { UIHelpers } from '../../utils/ui-helpers';
import { WorkoutCalendar } from './WorkoutCalendar';
import { WorkoutComparison } from './WorkoutComparison';
import { AuthManager } from '../auth/AuthManager';
import { Router } from '../../services/Router';
import { User } from 'firebase/auth';

export class TrainingHub {
  private state: TrainingHubState;
  private workoutCalendar: WorkoutCalendar;
  private workoutComparison: WorkoutComparison;
  private authManager!: AuthManager; // Initialized in constructor
  private router!: Router; // Initialized after authentication
  private dashboardService: DashboardService;
  private currentUser: User | null = null;
  private userProfile: UserProfile | null = null;
  private isAuthenticated: boolean = false;

  constructor() {
    this.state = this.initializeState();
    
    // Initialize services
    this.dashboardService = new DashboardService();
    
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
      
      // Initialize router
      this.router = new Router((view: string) => this.onViewChange(view));
      
      // Update nav user info
      const displayName = this.userProfile?.displayName || this.currentUser?.email || 'User';
      const email = this.currentUser?.email || '';
      this.router.updateNavUser(displayName, email);
      
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

    // Import drawer - handled in showImportDrawer method

    // File handling in import drawer
    this.setupFileHandling();

    // Global logout event listener
    document.addEventListener('logout-requested', () => {
      this.handleLogout();
    });

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
      // Initialize Dashboard Service
      await this.dashboardService.initialize();
      
      // Load dashboard data (activities, laps, metrics) from Firebase or localStorage
      const dashboardData = await this.dashboardService.getDashboardData();
      
      // Load tracked workouts (still from localStorage for now - will be migrated later)
      const savedWorkouts = this.loadSavedWorkouts();
      this.setState({ trackedWorkouts: savedWorkouts });

      // Update header metrics with Firebase data
      this.updateHeaderMetricsFromDashboard(dashboardData);
      
      // Initialize calendar with current workouts
      await this.workoutCalendar.initialize(this.state.trackedWorkouts, this.state.calendar);
      
      // Load analytics data
      this.updateAnalytics();
      
      console.log(`Loaded ${dashboardData.activities.length} activities from Firebase`);
      
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

  // Header Metrics Updates using Firebase Dashboard Data
  private updateHeaderMetricsFromDashboard(dashboardData: DashboardData): void {
    const readinessEl = document.getElementById('readiness-metric')?.querySelector('.metric-value');
    const weeklyLoadEl = document.getElementById('weekly-load-metric')?.querySelector('.metric-value');
    const streakEl = document.getElementById('streak-metric')?.querySelector('.metric-value');

    // Calculate metrics from dashboard data
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week

    // Filter activities for this week
    const thisWeekActivities = dashboardData.activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate >= weekStart && activityDate <= now;
    });

    // Calculate weekly training load from Firebase activities
    const weeklyLoad = thisWeekActivities.reduce((sum, activity) => 
      sum + (activity.trainingLoad || 0), 0
    );

    // Calculate activity streak
    let streak = 0;
    const sortedActivities = dashboardData.activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedActivities.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // Check if there's an activity today or yesterday to start the streak
      if (sortedActivities[0]?.date === today || sortedActivities[0]?.date === yesterday) {
        let currentDate = sortedActivities[0]?.date === today ? today : yesterday;
        
        for (const activity of sortedActivities) {
          if (activity.date === currentDate) {
            streak++;
            // Move to previous day
            const prevDate = new Date(currentDate);
            prevDate.setDate(prevDate.getDate() - 1);
            currentDate = prevDate.toISOString().split('T')[0];
          } else {
            break;
          }
        }
      }
    }

    // Simple readiness calculation (could be enhanced with HR, sleep data, etc.)
    const readiness = Math.min(100, Math.max(50, 85 - (weeklyLoad / 50))); // Decreases with high load

    // Update DOM elements
    if (readinessEl) readinessEl.textContent = Math.round(readiness).toString();
    if (weeklyLoadEl) weeklyLoadEl.textContent = Math.round(weeklyLoad).toString();
    if (streakEl) streakEl.textContent = `${streak}d`;
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

  // Import Data Management (methods implemented later in the file)

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
      
      // Force refresh of dashboard data from Firebase
      const dashboardData = await this.dashboardService.getDashboardData(true);
      
      // Update header metrics with fresh data
      this.updateHeaderMetricsFromDashboard(dashboardData);
      
      // Update analytics
      this.updateAnalytics();
      
      // Refresh calendar with latest data
      await this.workoutCalendar.initialize(this.state.trackedWorkouts, this.state.calendar);
      
      UIHelpers.showStatus(
        `Data synced! Loaded ${dashboardData.activities.length} activities.`, 
        'success'
      );
      
    } catch (error) {
      console.error('Sync error:', error);
      this.addError('Failed to sync data');
    }
  }

  // FIT File Import
  private showImportDrawer(): void {
    const drawer = document.createElement('div');
    drawer.className = 'import-drawer';
    drawer.innerHTML = `
      <div class="drawer-overlay" id="drawer-overlay"></div>
      <div class="drawer-content">
        <div class="drawer-header">
          <h3>📁 Import FIT Files</h3>
          <button class="close-btn" id="close-import-drawer">&times;</button>
        </div>
        <div class="drawer-body">
          <div class="import-options">
            <div class="drop-zone" id="fit-drop-zone">
              <p>Drop .fit files here or click to select</p>
              <input type="file" id="fit-file-input" accept=".fit" multiple style="display: none;">
              <button class="btn btn-secondary" id="select-files-btn">Select Files</button>
            </div>
            
            <div class="import-settings">
              <label>
                <input type="checkbox" id="auto-save-firebase" checked>
                Automatically save to Firebase
              </label>
            </div>
            
            <div class="selected-files" id="selected-files-list"></div>
            
            <div class="import-actions">
              <button class="btn btn-primary" id="process-files-btn" disabled>
                Process Files
              </button>
              <button class="btn btn-ghost" id="clear-files-btn">
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(drawer);
    this.initializeImportDrawerEvents();
  }

  private initializeImportDrawerEvents(): void {
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = document.getElementById('close-import-drawer');
    const dropZone = document.getElementById('fit-drop-zone');
    const fileInput = document.getElementById('fit-file-input') as HTMLInputElement;
    const selectBtn = document.getElementById('select-files-btn');
    const processBtn = document.getElementById('process-files-btn');
    const clearBtn = document.getElementById('clear-files-btn');
    const filesList = document.getElementById('selected-files-list');

    let selectedFiles: File[] = [];

    // Close drawer events
    [overlay, closeBtn].forEach(el => {
      el?.addEventListener('click', () => {
        document.querySelector('.import-drawer')?.remove();
      });
    });

    // File selection events
    selectBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    dropZone?.addEventListener('click', () => {
      fileInput?.click();
    });

    // Drag and drop events
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone?.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      
      const files = Array.from(e.dataTransfer?.files || [])
        .filter(file => file.name.toLowerCase().endsWith('.fit'));
      
      if (files.length > 0) {
        selectedFiles.push(...files);
        this.updateFilesList(selectedFiles, filesList, processBtn);
      }
    });

    // File input change
    fileInput?.addEventListener('change', (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      selectedFiles.push(...files);
      this.updateFilesList(selectedFiles, filesList, processBtn);
    });

    // Process files
    processBtn?.addEventListener('click', async () => {
      const autoSave = (document.getElementById('auto-save-firebase') as HTMLInputElement)?.checked ?? true;
      await this.processFitFiles(selectedFiles, autoSave);
      
      // Close drawer after processing
      document.querySelector('.import-drawer')?.remove();
    });

    // Clear files
    clearBtn?.addEventListener('click', () => {
      selectedFiles = [];
      this.updateFilesList(selectedFiles, filesList, processBtn);
    });
  }

  private updateFilesList(files: File[], listElement: HTMLElement | null, processBtn: HTMLElement | null): void {
    if (!listElement || !processBtn) return;

    if (files.length === 0) {
      listElement.innerHTML = '';
      processBtn.setAttribute('disabled', 'true');
      return;
    }

    listElement.innerHTML = `
      <h4>Selected Files (${files.length})</h4>
      ${files.map((file, index) => `
        <div class="file-item">
          <span class="file-name">${file.name}</span>
          <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
          <button class="remove-file" data-index="${index}">×</button>
        </div>
      `).join('')}
    `;

    // Add remove file event listeners
    listElement.querySelectorAll('.remove-file').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0');
        files.splice(index, 1);
        this.updateFilesList(files, listElement, processBtn);
      });
    });

    processBtn.removeAttribute('disabled');
  }

  private async processFitFiles(files: File[], saveToFirebase: boolean): Promise<void> {
    if (files.length === 0) return;

    try {
      const result = await FileService.processBatchFiles(files, {
        saveToFirebase,
        showProgress: true
      });

      // Refresh data after successful processing
      if (result.successful > 0) {
        await this.syncData();
      }

      // Show detailed results
      console.log('Import results:', result);
      console.log(`Processing complete! ✅ ${result.successful} successful, ❌ ${result.failed} failed`);
      
    } catch (error) {
      console.error('Batch processing error:', error);
      this.addError('Failed to process files');
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

  // Helper methods for accessing authentication state
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  public getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  public getAuthManager(): AuthManager {
    return this.authManager;
  }

  public getDashboardService(): DashboardService {
    return this.dashboardService;
  }

  public async getDashboardData(forceRefresh = false) {
    return await this.dashboardService.getDashboardData(forceRefresh);
  }

  // View management methods
  private onViewChange(view: string): void {
    if (view === 'profile') {
      this.renderProfileView();
    }
    // Dashboard view is handled by default HTML content
  }

  private renderProfileView(): void {
    const profileContent = document.getElementById('profile-content');
    if (!profileContent) return;

    const displayName = this.userProfile?.displayName || this.currentUser?.email || 'User';
    const email = this.currentUser?.email || '';
    const joinDate = this.currentUser?.metadata?.creationTime 
      ? new Date(this.currentUser.metadata.creationTime).toLocaleDateString()
      : 'Unknown';

    profileContent.innerHTML = `
      <div class="profile-content">
        <div class="profile-card">
          <div class="profile-avatar">
            <i class="fas fa-user-circle"></i>
          </div>
          <div class="profile-info">
            <h3>${displayName}</h3>
            <p class="profile-email">${email}</p>
            <p class="profile-joined">Joined: ${joinDate}</p>
          </div>
        </div>
        
        <div class="profile-stats">
          <div class="stat-card">
            <h4>Training Statistics</h4>
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-value">${this.userProfile?.stats?.totalActivities || 0}</span>
                <span class="stat-label">Total Activities</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${Math.round((this.userProfile?.stats?.totalTrainingTime || 0) / 60)}</span>
                <span class="stat-label">Hours Trained</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${this.userProfile?.stats?.lastActivityDate || 'Never'}</span>
                <span class="stat-label">Last Activity</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">Coming Soon</span>
                <span class="stat-label">Total Distance</span>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-actions">
          <button class="btn btn-secondary" id="edit-profile-btn">Edit Profile</button>
          <button class="btn btn-danger" id="delete-account-btn">Delete Account</button>
        </div>
      </div>
    `;

    // Attach event listeners for profile actions
    document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
      this.showEditProfileModal();
    });

    document.getElementById('delete-account-btn')?.addEventListener('click', () => {
      this.showDeleteAccountModal();
    });
  }

  private async handleLogout(): Promise<void> {
    try {
      // Use AuthService directly for logout
      const { AuthService } = await import('../../firebase/auth');
      await AuthService.logout();
      UIHelpers.showStatus('Signed out successfully', 'success');
    } catch (error) {
      console.error('Logout failed:', error);
      UIHelpers.showStatus('Logout failed. Please try again.', 'error');
    }
  }

  private showEditProfileModal(): void {
    UIHelpers.showStatus('Edit profile functionality coming soon!', 'info');
  }

  private showDeleteAccountModal(): void {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      UIHelpers.showStatus('Delete account functionality coming soon!', 'info');
    }
  }
}