// Main Training Hub component - unified interface for planning, tracking, and analytics
import { 
  TrackedWorkout, 
  TrainingHubState, 
  TrainingPeriodSummary 
} from '../../types/workout-tracking.types';
import { ActivityMetrics, LapMetrics } from '../../types/training-metrics.types';
import { UserProfile } from '../../types/firebase.types';
import { WorkoutMatchingService } from '../../services/WorkoutMatchingService';
import { PlanGenerator, EnhancedPlanOptions } from '../../services/PlanGenerator';
import { FileService } from '../../services/FileService';
import { DashboardService, DashboardData } from '../../services/DashboardService';
import { FirestoreService } from '../../firebase/firestore';
import { UIHelpers } from '../../utils/ui-helpers';
import { EnhancedWorkoutCalendar } from './WorkoutCalendar-Enhanced';
import { WorkoutComparison } from './WorkoutComparison';
import { RecoveryMetricsTracker } from '../recovery/RecoveryMetricsTracker';
import { AuthManager } from '../auth/AuthManager';
import { Router } from '../../services/Router';
import { UserProfileService } from '../../services/UserProfileService';
import { User } from 'firebase/auth';

export class TrainingHub {
  private state: TrainingHubState;
  private workoutCalendar: EnhancedWorkoutCalendar;
  private workoutComparison: WorkoutComparison;
  private recoveryTracker!: RecoveryMetricsTracker; // Initialized after authentication
  private authManager!: AuthManager; // Initialized in constructor
  private router!: Router; // Initialized after authentication
  private dashboardService: DashboardService;
  private userProfileService: UserProfileService;

  constructor() {
    this.state = this.initializeState();
    
    // Initialize services
    this.dashboardService = new DashboardService();
    this.userProfileService = UserProfileService.getInstance();
    
    // Initialize authentication first
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) {
      throw new Error('Auth container not found');
    }
    
    this.authManager = new AuthManager(authContainer, this.onAuthStateChanged.bind(this));
    
    // Initialize other components (they will be shown after authentication)
    this.workoutCalendar = new EnhancedWorkoutCalendar(this.onWorkoutSelected.bind(this));
    this.workoutComparison = new WorkoutComparison();
    
    // Initialize event listeners
    this.initializeEventListeners();
  }

  private onAuthStateChanged(user: User | null, profile?: UserProfile | null): void {
    const isAuthenticated = user !== null;

    if (isAuthenticated) {
      // Hide auth container and show main app
      const authContainer = document.getElementById('auth-container');
      const mainContent = document.getElementById('main-content');
      
      if (authContainer) {
        authContainer.style.display = 'none';
      }
      if (mainContent) {
        mainContent.style.display = 'block';
      }
      
      // Initialize router
      this.router = new Router((view: string) => this.onViewChange(view));
      
      // Initialize recovery metrics tracker
      const recoveryContainer = document.getElementById('recovery-metrics-container');
      if (recoveryContainer) {
        this.recoveryTracker = new RecoveryMetricsTracker(recoveryContainer);
      }
      
      // Update nav user info using centralized service
      const displayName = this.userProfileService.getDisplayName();
      const email = this.userProfileService.getEmail();
      this.router.updateNavUser(displayName, email);
      
      // Initialize the app
      this.initializeEventListeners();
      this.loadInitialData();
    } else {
      // Disable real-time sync when user logs out
      this.dashboardService.disableRealtimeSync();
      
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
    // Calendar refresh button
    const refreshBtn = document.getElementById('refresh-calendar-btn');
    refreshBtn?.addEventListener('click', () => this.refreshCalendar());

    // Sync data button
    const syncBtn = document.getElementById('sync-data-btn');
    syncBtn?.addEventListener('click', () => this.syncTrainingData());
    
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

    // Recovery metrics updates
    window.addEventListener('recovery-metrics-updated', () => {
      // Refresh dashboard metrics when recovery data changes
      this.loadInitialData();
    });

    // AI Insights controls
    document.getElementById('refresh-ai-btn')?.addEventListener('click', () => {
      this.refreshAIInsights();
    });

    document.getElementById('toggle-ai-btn')?.addEventListener('click', () => {
      this.toggleAIInsights();
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
      
      // Load tracked workouts from Firebase first, fallback to localStorage
      const savedWorkouts = await this.loadWorkoutsFromFirebaseOrLocal();
      this.setState({ trackedWorkouts: savedWorkouts });

      // Update header metrics with Firebase data
      this.updateHeaderMetricsFromDashboard(dashboardData);
      
      // Display AI insights if available
      this.displayAIInsights(dashboardData.aiInsights);
      
      // Initialize calendar with current workouts
      await this.workoutCalendar.initialize(this.state.trackedWorkouts, this.state.calendar);
      
      // Load analytics data
      this.updateAnalytics();
      
      // Enable real-time synchronization
      const realtimeEnabled = this.dashboardService.enableRealtimeSync({
        onDataChange: (newData) => {
          this.handleRealtimeDataUpdate(newData);
        },
        onError: (error) => {
          console.error('Real-time sync error:', error);
          this.addError('Real-time sync error: ' + error.message);
        }
      });

      if (realtimeEnabled) {
        console.log('✅ Real-time synchronization enabled');
        this.updateSyncButtonStatus(true);
      } else {
        console.warn('⚠️ Real-time synchronization could not be enabled');
        this.updateSyncButtonStatus(false);
      }
      
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

  /**
   * Load workouts from Firebase first, fallback to localStorage
   */
  private async loadWorkoutsFromFirebaseOrLocal(): Promise<TrackedWorkout[]> {
    let workouts: TrackedWorkout[] = [];
    
    // Try to load from Firebase first if user is authenticated
    if (this.userProfileService.isAuthenticated()) {
      try {
        // Check if there's an active generated plan
        const activePlan = await FirestoreService.getActivePlan();
        
        if (activePlan && activePlan.workouts && activePlan.workouts.length > 0) {
          // Convert Firebase training plans to tracked workouts
          workouts = activePlan.workouts.map(plan => ({
            date: plan.date,
            workoutType: plan.workoutType,
            description: plan.description || '',
            durationMin: plan.durationMin || 60,
            sport: plan.sport || 'running',
            status: 'planned' as const,
            expectedFatigue: plan.expectedFatigue || 50,
            workoutZones: plan.workoutZones || [],
            workoutTags: plan.workoutTags || [],
            hrTargetZone: plan.hrTargetZone || 'Zone 2', // Default to Zone 2 if undefined
            customParameters: plan.customParameters || {}
          }));
          
          console.log(`✅ Loaded ${workouts.length} workouts from Firebase active plan`);
          
          // Also load any tracked workouts (with actual workout data)
          const trackedWorkouts = await FirestoreService.getTrackedWorkouts();
          
          // Merge with Firebase tracked workouts, giving priority to tracked workouts
          const trackedWorkoutMap = new Map(trackedWorkouts.map(tw => [tw.date, tw]));
          
          workouts = workouts.map(workout => {
            const tracked = trackedWorkoutMap.get(workout.date);
            if (tracked) {
              // Convert Firebase tracked workout to local format
              return {
                ...workout,
                status: tracked.status,
                userNotes: tracked.userNotes || '', // Default to empty string if undefined
                userRating: tracked.userRating || null, // Default to null if undefined
                comparison: tracked.comparison || null, // Default to null if undefined
                completedAt: tracked.lastUpdated.toISOString()
              };
            }
            return workout;
          });
          
          console.log(`✅ Merged with ${trackedWorkouts.length} tracked workouts from Firebase`);
        }
      } catch (firebaseError) {
        console.warn('Failed to load workouts from Firebase, falling back to localStorage:', firebaseError);
      }
    }
    
    // Fallback to localStorage if no Firebase data or not authenticated
    if (workouts.length === 0) {
      workouts = this.loadSavedWorkouts();
      console.log(`📁 Loaded ${workouts.length} workouts from localStorage`);
    }
    
    return workouts;
  }

  private saveWorkouts(): void {
    try {
      // Always save to localStorage for offline access
      localStorage.setItem('training-hub-workouts', JSON.stringify(this.state.trackedWorkouts));
      
      // Also save to Firebase if authenticated (don't await to avoid blocking UI)
      if (this.userProfileService.isAuthenticated()) {
        this.saveWorkoutsToFirebase().catch(error => {
          console.warn('Failed to save workouts to Firebase:', error);
        });
      }
    } catch (error) {
      console.warn('Error saving workouts:', error);
    }
  }

  /**
   * Save completed/modified workouts to Firebase as tracked workouts
   */
  private async saveWorkoutsToFirebase(): Promise<void> {
    try {
      // Only save workouts that have been completed or modified
      const workoutsToSave = this.state.trackedWorkouts.filter(workout => 
        workout.status !== 'planned' || workout.userNotes || workout.userRating || workout.comparison
      );
      
      for (const workout of workoutsToSave) {
        // Check if this workout already exists in Firebase
        const existingTracked = await FirestoreService.getTrackedWorkouts();
        const existing = existingTracked.find(tw => tw.date === workout.date);
        
        const trackedWorkoutData = {
          date: workout.date,
          status: workout.status,
          userNotes: workout.userNotes || '', // Default to empty string if undefined
          userRating: workout.userRating || null, // Default to null if undefined
          comparison: workout.comparison || null, // Default to null if undefined
          lastUpdated: new Date()
        };
        
        if (existing) {
          // Update existing tracked workout
          await FirestoreService.updateTrackedWorkout(existing.id, trackedWorkoutData);
        } else {
          // Create new tracked workout
          await FirestoreService.addTrackedWorkout(trackedWorkoutData);
        }
      }
    } catch (error) {
      console.error('Error saving workouts to Firebase:', error);
      throw error;
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

    // Enhanced readiness calculation - use AI insights if available
    let readiness = 85 - (weeklyLoad / 50); // Base calculation decreases with high training load
    
    if (dashboardData.aiInsights?.quickStats?.readinessScore) {
      readiness = dashboardData.aiInsights.quickStats.readinessScore;
    }
    
    // Incorporate recovery metrics if available
    if (this.recoveryTracker) {
      const recoveryScore = this.recoveryTracker.getReadinessScore();
      // Blend recovery metrics (60%) with load-based calculation (40%)
      readiness = (recoveryScore * 0.6) + (readiness * 0.4);
    }
    
    // Ensure readiness stays within reasonable bounds
    readiness = Math.min(100, Math.max(30, readiness));

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
      
      // Parse and analyze the file
      const result = await FileService.handleFileWithAnalysis(file);
      
      if (result.activityMetrics) {
        // Save to Firebase using DashboardService and handle workout matching
        await this.processNewActivity(result.activityMetrics, result.lapMetrics);
        UIHelpers.showStatus('Activity processed and saved successfully!', 'success');
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
          UIHelpers.showStatus(`Processing ${file.name} (${processed + 1}/${files.length})...`, 'info');
          
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
      
      // Clear the file list after processing
      (this as any).bulkFiles = [];
      const selectedFilesEl = document.getElementById('selectedFiles');
      if (selectedFilesEl) {
        selectedFilesEl.innerHTML = '';
      }
      const bulkActionsEl = document.getElementById('bulkActions');
      if (bulkActionsEl) {
        bulkActionsEl.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Bulk processing failed:', error);
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

    // Save activity and laps to Firebase
    try {
      await this.dashboardService.addActivity(activity);
      if (laps && laps.length > 0) {
        await this.dashboardService.addLapData(laps);
      }
    } catch (error) {
      console.warn('Failed to save to Firebase, data will be kept locally:', error);
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
      // Pre-populate form with user profile data
      const userProfileService = UserProfileService.getInstance();
      const trainingProfile = userProfileService.getTrainingProfile();
      
      // Populate age field
      const ageInput = document.getElementById('athlete-age') as HTMLInputElement;
      if (ageInput && trainingProfile.age) {
        ageInput.value = trainingProfile.age.toString();
      }
      
      // Populate fitness level
      const fitnessInput = document.getElementById('fitness-level') as HTMLSelectElement;
      if (fitnessInput && trainingProfile.fitnessLevel) {
        fitnessInput.value = trainingProfile.fitnessLevel;
      }
      
      // Set default event date (12 weeks from now)
      const eventDateInput = document.getElementById('event-date') as HTMLInputElement;
      if (eventDateInput) {
        eventDateInput.value = this.getDefaultEventDate();
      }
      
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
      UIHelpers.showStatus('Generating enhanced training plan...', 'info');
      
      const planOptions = await this.gatherEnhancedPlanOptions();
      const result = PlanGenerator.generateEnhancedPlan(planOptions);
      
      // Convert to tracked workouts and add to state
      const newTrackedWorkouts = result.plan.map(workout => 
        WorkoutMatchingService.createTrackedWorkout(workout)
      ).filter(w => {
        // Don't overwrite existing workouts
        return !this.state.trackedWorkouts.some(existing => existing.date === w.date);
      });
      
      // Save generated plan to Firebase if user is authenticated
      if (this.userProfileService.isAuthenticated()) {
        try {
          UIHelpers.showStatus('Saving training plan to cloud...', 'info');
          
          // Prepare plan data for Firebase
          const startDate = planOptions.startDate || new Date().toISOString().split('T')[0];
          const weeks = planOptions.weeks || 8;
          const endDate = new Date(new Date(startDate).getTime() + (weeks * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
          
          const generatedPlanData = {
            planName: `${planOptions.planType || 'Custom'} - ${planOptions.sport || 'Multi-Sport'} Plan`,
            planType: (planOptions.planType as 'base' | 'build' | 'peak' | 'recovery' | 'custom') || 'custom',
            startDate,
            endDate,
            totalWeeks: weeks,
            config: {
              sport: planOptions.sport || 'running',
              weeklyHours: planOptions.weeklyHours || 5,
              fitnessLevel: planOptions.user.fitnessLevel,
              goals: planOptions.goals || ['fitness'],
              availableDays: planOptions.trainingDays || ['Monday', 'Wednesday', 'Friday']
            },
            workouts: [],
            generatedBy: 'user' as const,
            version: '1.0.0',
            isActive: true
          };
          
          // Convert new tracked workouts to Firebase training plans
          const firebaseWorkouts = newTrackedWorkouts.map(workout => ({
            date: workout.date,
            workoutType: workout.workoutType,
            description: workout.description,
            durationMin: workout.durationMin,
            sport: workout.sport || 'running',
            expectedFatigue: workout.expectedFatigue,
            workoutZones: workout.workoutZones || [],
            workoutTags: workout.workoutTags || [],
            hrTargetZone: workout.hrTargetZone || 'Zone 2', // Default to Zone 2 if undefined
            customParameters: workout.customParameters || {},
            completed: false,
            generatedAt: new Date(),
            generatedBy: 'user' as const,
            createdAt: new Date()
          }));
          
          // Save plan with workouts to Firebase
          const planId = await FirestoreService.saveGeneratedPlanWithWorkouts(
            generatedPlanData,
            firebaseWorkouts
          );
          
          console.log('Saved generated plan to Firebase with ID:', planId);
          
        } catch (firebaseError) {
          console.warn('Failed to save plan to Firebase, using local storage:', firebaseError);
          UIHelpers.showStatus('Plan generated (saved locally)', 'info');
        }
      }
      
      this.setState({
        trackedWorkouts: [...this.state.trackedWorkouts, ...newTrackedWorkouts]
      });
      
      this.saveWorkouts();
      await this.workoutCalendar.updateWorkouts(this.state.trackedWorkouts);
      this.updateHeaderMetrics();
      
      this.hidePlanGenerationModal();
      
      // Show enhanced feedback with recommendations
      const recommendations = result.recommendations.slice(0, 3).join('; ');
      const message = `Generated ${newTrackedWorkouts.length} workouts! ${recommendations ? `Insights: ${recommendations}` : ''}`;
      UIHelpers.showStatus(message, 'success');
      
    } catch (error) {
      console.error('Error generating plan:', error);
      this.addError('Failed to generate training plan');
    }
  }

  private async gatherEnhancedPlanOptions(): Promise<EnhancedPlanOptions> {
    // Get user profile data from centralized service
    const userProfileService = UserProfileService.getInstance();
    const trainingProfile = userProfileService.getTrainingProfile();
    
    // Gather form values from the modal (these override profile defaults)
    const ageInput = (document.getElementById('athlete-age') as HTMLInputElement)?.value;
    const fitnessInput = (document.getElementById('fitness-level') as HTMLSelectElement)?.value;
    const eventDate = (document.getElementById('event-date') as HTMLInputElement)?.value;
    const planDuration = parseInt((document.getElementById('plan-duration') as HTMLInputElement)?.value) || 10;
    const bodyBattery = parseInt((document.getElementById('body-battery') as HTMLInputElement)?.value) || undefined;
    const sleepScore = parseInt((document.getElementById('sleep-score') as HTMLInputElement)?.value) || undefined;

    // Use profile data as defaults, form data as overrides
    const age = ageInput ? parseInt(ageInput) : trainingProfile.age;
    const fitnessLevel = (fitnessInput as 'beginner' | 'intermediate' | 'advanced') || trainingProfile.fitnessLevel;

    // Get historical activities from Firebase for enhanced analysis
    let historicalActivities: any[] = [];
    let completedWorkouts: any[] = [];
    
    try {
      const dashboardData = await this.dashboardService.getDashboardData();
      historicalActivities = dashboardData.activities;
      
      // Convert completed tracked workouts to the enhanced format
      completedWorkouts = this.state.trackedWorkouts
        .filter(w => w.status === 'completed' && w.actualWorkout)
        .map(w => ({
          date: w.date,
          workoutType: w.workoutType,
          expectedDuration: w.durationMin,
          actualDuration: w.actualWorkout!.duration,
          expectedFatigue: w.expectedFatigue,
          actualFatigue: w.actualFatigue || Math.round(w.actualWorkout!.trainingLoad / 5),
          completed: true,
          sport: w.actualWorkout!.sport,
          trainingLoad: w.actualWorkout!.trainingLoad
        }));
      
      console.log(`Enhanced plan generation: Using ${historicalActivities.length} historical activities and ${completedWorkouts.length} completed workouts`);
    } catch (error) {
      console.warn('Could not load historical data for enhanced planning, using basic planning:', error);
      // Fall back to basic planning without historical data
    }

    // Generate recent workouts data based on actual workouts
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
      recoveryMetrics: this.getEnhancedRecoveryMetrics(bodyBattery, sleepScore, trainingProfile.restingHR),
      recentFatigueScores,
      recentWorkouts,
      planDuration,
      availabilityToday: true,
      // Enhanced plan options with historical data
      historicalActivities,
      completedWorkouts
    };
  }

  private getEnhancedRecoveryMetrics(formBodyBattery?: number, formSleepScore?: number, defaultRestingHR?: number): any {
    // Prioritize daily recovery metrics over form values
    const todaysMetrics = this.recoveryTracker?.getCurrentMetrics();
    
    return {
      bodyBattery: todaysMetrics?.bodyBattery ?? formBodyBattery,
      sleepScore: todaysMetrics?.sleepScore ?? formSleepScore,
      hrv: todaysMetrics?.hrv,
      restingHR: todaysMetrics?.restingHR ?? defaultRestingHR,
      subjectiveFatigue: todaysMetrics?.subjectiveFatigue,
      stressLevel: todaysMetrics?.stressLevel,
      // Add metadata about data source
      hasCurrentDayData: todaysMetrics !== null,
      dataSource: todaysMetrics ? 'daily-tracker' : 'form-input'
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
      
      // Convert Firebase activities to TrackedWorkouts
      const firebaseWorkouts = dashboardData.activities.map(activity => {
        // Create a tracked workout from the completed activity
        const trackedWorkout: TrackedWorkout = {
          date: activity.date,
          workoutType: activity.sport,
          description: `${activity.sport} - ${activity.distance.toFixed(2)}km in ${activity.duration} min`,
          expectedFatigue: Math.round(activity.trainingLoad / 5), // Estimate from training load
          durationMin: activity.duration,
          completed: true,
          status: 'completed',
          actualWorkout: activity,
          actualFatigue: Math.round(activity.trainingLoad / 5),
          completedAt: activity.date,
          // No comparison data for activities without planned workouts
          comparison: undefined
        };
        return trackedWorkout;
      });
      
      // Merge with existing planned workouts and avoid duplicates
      const existingPlanned = this.state.trackedWorkouts.filter(w => w.status === 'planned');
      const existingCompleted = this.state.trackedWorkouts.filter(w => w.status === 'completed');
      
      // Only add Firebase workouts that don't already exist
      const newFirebaseWorkouts = firebaseWorkouts.filter(fw => 
        !existingCompleted.some(existing => 
          existing.date === fw.date && 
          existing.workoutType === fw.workoutType &&
          existing.actualWorkout?.activityId === fw.actualWorkout?.activityId
        )
      );
      
      const updatedWorkouts = [...existingPlanned, ...existingCompleted, ...newFirebaseWorkouts];
      
      // Update state with merged workouts
      this.setState({
        trackedWorkouts: updatedWorkouts
      });
      
      // Update header metrics with fresh data
      this.updateHeaderMetricsFromDashboard(dashboardData);
      
      // Update analytics
      this.updateAnalytics();
      
      // Refresh calendar with merged workout data
      await this.workoutCalendar.updateWorkouts(updatedWorkouts);
      
      UIHelpers.showStatus(
        `Data synced! Loaded ${dashboardData.activities.length} activities from Firebase.`, 
        'success'
      );
      
    } catch (error) {
      console.error('Sync error:', error);
      this.addError('Failed to sync data');
    }
  }

  /**
   * Handle real-time data updates from Firebase
   */
  private async handleRealtimeDataUpdate(dashboardData: DashboardData): Promise<void> {
    try {
      console.log(`🔄 Real-time update: ${dashboardData.activities.length} activities`);
      
      // Convert Firebase activities to TrackedWorkouts (same logic as syncData)
      const firebaseWorkouts = dashboardData.activities.map(activity => {
        const trackedWorkout: TrackedWorkout = {
          date: activity.date,
          workoutType: activity.sport,
          description: `${activity.sport} - ${activity.distance.toFixed(2)}km in ${activity.duration} min`,
          expectedFatigue: Math.round(activity.trainingLoad / 5),
          durationMin: activity.duration,
          completed: true,
          status: 'completed',
          actualWorkout: activity,
          actualFatigue: Math.round(activity.trainingLoad / 5),
          completedAt: activity.date,
          comparison: undefined
        };
        return trackedWorkout;
      });
      
      // Merge with existing planned workouts and avoid duplicates
      const existingPlanned = this.state.trackedWorkouts.filter(w => w.status === 'planned');
      const existingCompleted = this.state.trackedWorkouts.filter(w => w.status === 'completed');
      
      const newFirebaseWorkouts = firebaseWorkouts.filter(fw => 
        !existingCompleted.some(existing => 
          existing.date === fw.date && 
          existing.workoutType === fw.workoutType &&
          existing.actualWorkout?.activityId === fw.actualWorkout?.activityId
        )
      );
      
      const updatedWorkouts = [...existingPlanned, ...existingCompleted, ...newFirebaseWorkouts];
      
      // Update state
      this.setState({
        trackedWorkouts: updatedWorkouts
      });
      
      // Update header metrics with fresh data
      this.updateHeaderMetricsFromDashboard(dashboardData);
      
      // Update analytics
      this.updateAnalytics();
      
      // Refresh calendar
      await this.workoutCalendar.updateWorkouts(updatedWorkouts);
      
      // Show subtle notification for real-time updates
      if (newFirebaseWorkouts.length > 0) {
        UIHelpers.showStatus(
          `🔄 ${newFirebaseWorkouts.length} new activities synced`, 
          'info'
        );
      }
      
    } catch (error) {
      console.error('Error handling real-time update:', error);
      this.addError('Real-time update failed');
    }
  }

  /**
   * Update sync button to show real-time status
   */
  private updateSyncButtonStatus(isRealtimeEnabled: boolean): void {
    const syncButton = document.getElementById('sync-data-btn');
    if (syncButton) {
      if (isRealtimeEnabled) {
        syncButton.innerHTML = '🔄 Live Sync';
        syncButton.style.color = '#4CAF50'; // Green to indicate active
        syncButton.title = 'Real-time synchronization active - click to refresh manually';
      } else {
        syncButton.innerHTML = '🔄 Sync Data';
        syncButton.style.color = '#666'; // Gray to indicate inactive
        syncButton.title = 'Click to sync data manually';
      }
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

  // Helper methods for accessing authentication state (delegated to UserProfileService)
  public getCurrentUser(): User | null {
    return this.userProfileService.getCurrentUser();
  }

  public getUserProfile(): UserProfile | null {
    return this.userProfileService.getUserProfile();
  }

  public getIsAuthenticated(): boolean {
    return this.userProfileService.isAuthenticated();
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

    const displayName = this.userProfileService.getDisplayName();
    const email = this.userProfileService.getEmail();
    const joinDate = this.userProfileService.getJoinDate();
    const activityStats = this.userProfileService.getActivityStats();

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
                <span class="stat-value">${activityStats.totalActivities}</span>
                <span class="stat-label">Total Activities</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${Math.round(activityStats.totalTrainingTime / 60)}</span>
                <span class="stat-label">Hours Trained</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${activityStats.lastActivityDate || 'Never'}</span>
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

  /**
   * AI INSIGHTS METHODS
   */
  
  /**
   * Display AI insights in the dashboard
   */
  private displayAIInsights(aiInsights?: any): void {
    const contentEl = document.getElementById('ai-insights-content');
    if (!contentEl) return;

    if (!this.dashboardService.isAIInsightsEnabled()) {
      contentEl.innerHTML = `
        <div class="ai-disabled">
          <span class="error-icon">🤖</span>
          <p>AI insights are disabled or unavailable</p>
          <button class="btn btn-primary enable-btn" onclick="this.enableAI()">Enable AI Insights</button>
        </div>
      `;
      return;
    }

    if (!aiInsights) {
      contentEl.innerHTML = `
        <div class="ai-error">
          <span class="error-icon">⚠️</span>
          <p>Unable to load AI insights</p>
          <button class="btn btn-secondary retry-btn" onclick="this.refreshAIInsights()">Retry</button>
        </div>
      `;
      return;
    }

    // Create insights grid
    const insightsHTML = `
      <div class="ai-insights-grid">
        ${this.createReadinessCard(aiInsights.quickStats)}
        ${this.createWorkoutRecommendationCard(aiInsights.workoutRecommendation)}
        ${this.createFatigueStatusCard(aiInsights.fatigueAssessment)}
        ${this.createPerformanceTrendCard(aiInsights.performanceAnalysis)}
      </div>
    `;

    contentEl.innerHTML = insightsHTML;
  }

  private createReadinessCard(quickStats: any): string {
    if (!quickStats) return '';
    
    const score = quickStats.readinessScore || 0;
    const progressPercent = (score / 100) * 360;
    
    return `
      <div class="ai-insight-card">
        <div class="insight-header">
          <h4 class="insight-title">Training Readiness</h4>
        </div>
        <div class="insight-content">
          <div class="readiness-score">
            <div class="score-circle" style="--progress: ${progressPercent}deg">
              ${score}
            </div>
            <div class="score-label">Ready to Train</div>
          </div>
          <div class="performance-trend">
            <span class="trend-indicator ${quickStats.trendDirection}">${this.getTrendIcon(quickStats.trendDirection)}</span>
            <span class="trend-text">${quickStats.trendDirection}</span>
          </div>
        </div>
      </div>
    `;
  }

  private createWorkoutRecommendationCard(workoutRec: any): string {
    if (!workoutRec || !workoutRec.recommendedWorkout) return '';
    
    const workout = workoutRec.recommendedWorkout;
    const confidence = workoutRec.confidence || 0;
    
    return `
      <div class="ai-insight-card">
        <div class="insight-header">
          <h4 class="insight-title">Tomorrow's Workout</h4>
          <div class="insight-confidence">${confidence}% confidence</div>
        </div>
        <div class="insight-content">
          <div class="workout-recommendation">
            <div class="workout-type">${workout.type}</div>
            <div class="workout-description">${workout.description}</div>
            <div class="workout-stats">
              <div class="stat">
                <span>⏱️ ${workout.durationMin} min</span>
              </div>
              <div class="stat">
                <span>💪 ${workout.fatigueScore}/100 intensity</span>
              </div>
            </div>
          </div>
        </div>
        <div class="insight-actions">
          <button class="btn btn-primary btn-sm" onclick="this.applyWorkoutRecommendation()">Apply to Plan</button>
        </div>
      </div>
    `;
  }

  private createFatigueStatusCard(fatigueAssessment: any): string {
    if (!fatigueAssessment) return '';
    
    const status = fatigueAssessment.overallStatus || 'unknown';
    const riskLevel = fatigueAssessment.riskLevel || 'low';
    
    return `
      <div class="ai-insight-card">
        <div class="insight-header">
          <h4 class="insight-title">Fatigue Status</h4>
        </div>
        <div class="insight-content">
          <div class="fatigue-status">
            <div class="status-indicator ${status}"></div>
            <div class="status-text">${status}</div>
          </div>
          <p style="margin: 0.5rem 0; color: rgba(255,255,255,0.7); font-size: 0.85rem;">
            Risk Level: <strong style="color: ${this.getRiskColor(riskLevel)}">${riskLevel}</strong>
          </p>
          <p style="margin: 0; font-size: 0.85rem; color: rgba(255,255,255,0.6);">
            ${this.getFatigueRecommendation(status, riskLevel)}
          </p>
        </div>
      </div>
    `;
  }

  private createPerformanceTrendCard(perfAnalysis: any): string {
    if (!perfAnalysis) return '';
    
    const trend = perfAnalysis.overallTrend || 'stable';
    
    return `
      <div class="ai-insight-card">
        <div class="insight-header">
          <h4 class="insight-title">Performance Trend</h4>
        </div>
        <div class="insight-content">
          <div class="performance-trend">
            <span class="trend-indicator ${trend}">${this.getTrendIcon(trend)}</span>
            <span class="trend-text">${trend}</span>
          </div>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: rgba(255,255,255,0.6);">
            ${this.getPerformanceInsight(trend)}
          </p>
        </div>
      </div>
    `;
  }

  private getTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  }

  private getRiskColor(risk: string): string {
    switch (risk) {
      case 'low': return '#4CAF50';
      case 'moderate': return '#2196F3';
      case 'high': return '#FF9800';
      case 'critical': return '#F44336';
      default: return '#666';
    }
  }

  private getFatigueRecommendation(status: string, risk: string): string {
    if (risk === 'critical') return 'Consider taking a rest day';
    if (status === 'overtrained') return 'Focus on recovery and light training';
    if (status === 'fatigued') return 'Easy training recommended';
    if (status === 'fresh') return 'Ready for quality training';
    return 'Continue with planned training';
  }

  private getPerformanceInsight(trend: string): string {
    switch (trend) {
      case 'improving': return 'Your performance is trending upward - great work!';
      case 'declining': return 'Consider adjusting training load or focus on recovery';
      case 'stable': return 'Performance is consistent - maintain current approach';
      default: return 'Keep training consistently for best results';
    }
  }

  /**
   * Refresh AI insights
   */
  private async refreshAIInsights(): Promise<void> {
    try {
      UIHelpers.showStatus('Refreshing AI insights...', 'info');
      
      // Force refresh dashboard data to get new AI insights
      const dashboardData = await this.dashboardService.getDashboardData(true);
      this.displayAIInsights(dashboardData.aiInsights);
      
      UIHelpers.showStatus('AI insights refreshed', 'success');
    } catch (error) {
      console.error('Failed to refresh AI insights:', error);
      UIHelpers.showStatus('Failed to refresh AI insights', 'error');
    }
  }

  /**
   * Toggle AI insights on/off
   */
  private toggleAIInsights(): void {
    const currentState = this.dashboardService.isAIInsightsEnabled();
    this.dashboardService.setAIInsightsEnabled(!currentState);
    
    if (!currentState) {
      // AI was enabled - refresh to show insights
      this.refreshAIInsights();
      UIHelpers.showStatus('AI insights enabled', 'success');
    } else {
      // AI was disabled - show disabled state
      this.displayAIInsights(null);
      UIHelpers.showStatus('AI insights disabled', 'info');
    }
    
    // Update toggle button state
    const toggleBtn = document.getElementById('toggle-ai-btn');
    if (toggleBtn) {
      toggleBtn.style.color = !currentState ? '#4CAF50' : 'rgba(255,255,255,0.8)';
      toggleBtn.title = !currentState ? 'Disable AI Features' : 'Enable AI Features';
    }
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
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content profile-modal">
        <div class="modal-header">
          <h3>🏃‍♂️ Edit Training Profile</h3>
          <button class="close-btn" id="close-profile-modal">&times;</button>
        </div>
        
        <div class="modal-body">
          <form id="profile-form" class="profile-form">
            <!-- Basic Information -->
            <div class="form-section">
              <h4>Basic Information</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="profile-age">Age</label>
                  <input type="number" id="profile-age" min="13" max="100" value="${this.userProfileService.getTrainingProfile().age}" required>
                  <small>Used for heart rate zone calculations and training recommendations</small>
                </div>
                <div class="form-group">
                  <label for="profile-sex">Sex</label>
                  <select id="profile-sex" required>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other/Prefer not to say</option>
                  </select>
                  <small>Used for TRIMP calculations and training load analysis</small>
                </div>
              </div>
            </div>

            <!-- Heart Rate Zones -->
            <div class="form-section">
              <h4>Heart Rate Data</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="profile-resting-hr">Resting Heart Rate (bpm)</label>
                  <input type="number" id="profile-resting-hr" min="30" max="100" value="${this.userProfileService.getTrainingProfile().restingHR}" required>
                  <small>Measure when you first wake up in the morning</small>
                </div>
                <div class="form-group">
                  <label for="profile-max-hr">Maximum Heart Rate (bpm)</label>
                  <input type="number" id="profile-max-hr" min="100" max="250" value="${this.userProfileService.getTrainingProfile().maxHR}" required>
                  <small>Highest HR you've achieved in all-out effort</small>
                </div>
              </div>
            </div>

            <!-- Training Information -->
            <div class="form-section">
              <h4>Training Background</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="profile-fitness-level">Current Fitness Level</label>
                  <select id="profile-fitness-level" required>
                    <option value="beginner">Beginner (0-1 year experience)</option>
                    <option value="intermediate" selected>Intermediate (1-5 years experience)</option>
                    <option value="advanced">Advanced (5+ years experience)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="profile-weekly-hours">Weekly Training Hours</label>
                  <input type="number" id="profile-weekly-hours" min="0" max="40" step="0.5" value="5">
                  <small>Average hours per week you train</small>
                </div>
              </div>
            </div>

            <!-- Sport Preferences -->
            <div class="form-section">
              <h4>Sport Preferences</h4>
              <div class="form-group">
                <label>Primary Sports (select all that apply)</label>
                <div class="checkbox-grid">
                  <label class="checkbox-item">
                    <input type="checkbox" name="sport" value="running" checked> Running
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="sport" value="cycling"> Cycling
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="sport" value="swimming"> Swimming
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="sport" value="triathlon"> Triathlon
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="sport" value="strength"> Strength Training
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="sport" value="other"> Other
                  </label>
                </div>
              </div>
            </div>

            <!-- Training Goals -->
            <div class="form-section">
              <h4>Training Goals</h4>
              <div class="form-group">
                <label>What are your main training goals? (select all that apply)</label>
                <div class="checkbox-grid">
                  <label class="checkbox-item">
                    <input type="checkbox" name="goal" value="fitness" checked> General Fitness
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="goal" value="weight-loss"> Weight Loss
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="goal" value="endurance"> Endurance
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="goal" value="speed"> Speed/Performance
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="goal" value="race"> Race Preparation
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="goal" value="health"> Health/Recovery
                  </label>
                </div>
              </div>
            </div>

            <!-- Training Schedule -->
            <div class="form-section">
              <h4>Training Schedule</h4>
              <div class="form-group">
                <label>Available Training Days</label>
                <div class="checkbox-grid">
                  <label class="checkbox-item">
                    <input type="checkbox" name="day" value="Monday" checked> Monday
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="day" value="Tuesday" checked> Tuesday
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="day" value="Wednesday" checked> Wednesday
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="day" value="Thursday" checked> Thursday
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="day" value="Friday" checked> Friday
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="day" value="Saturday" checked> Saturday
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="day" value="Sunday"> Sunday
                  </label>
                </div>
              </div>
            </div>

            <!-- AI Settings -->
            <div class="form-section">
              <h4>🤖 AI Insights Settings</h4>
              <div class="form-group">
                <label class="checkbox-item">
                  <input type="checkbox" id="enable-ai-insights" checked>
                  Enable AI-powered training insights and recommendations
                </label>
                <small>AI uses your profile data and training history to provide personalized recommendations</small>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-profile-edit">Cancel</button>
          <button type="submit" form="profile-form" class="btn btn-primary" id="save-profile">Save Profile</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Set current values
    const currentProfile = this.userProfileService.getTrainingProfile();
    (document.getElementById('profile-fitness-level') as HTMLSelectElement).value = currentProfile.fitnessLevel;
    
    // Check current sports
    const sports = currentProfile.preferredSports;
    sports.forEach(sport => {
      const checkbox = document.querySelector(`input[name="sport"][value="${sport}"]`) as HTMLInputElement;
      if (checkbox) checkbox.checked = true;
    });

    // Event listeners
    document.getElementById('close-profile-modal')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    document.getElementById('cancel-profile-edit')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveProfileData(modal);
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  private async saveProfileData(modal: HTMLElement): Promise<void> {
    try {
      UIHelpers.showStatus('Saving profile...', 'info');

      // Collect form data
      const age = parseInt((document.getElementById('profile-age') as HTMLInputElement).value);
      const sex = (document.getElementById('profile-sex') as HTMLSelectElement).value as 'male' | 'female' | 'other';
      const restingHR = parseInt((document.getElementById('profile-resting-hr') as HTMLInputElement).value);
      const maxHR = parseInt((document.getElementById('profile-max-hr') as HTMLInputElement).value);
      const fitnessLevel = (document.getElementById('profile-fitness-level') as HTMLSelectElement).value as 'beginner' | 'intermediate' | 'advanced';
      const weeklyHours = parseFloat((document.getElementById('profile-weekly-hours') as HTMLInputElement).value);
      
      // Collect selected sports
      const sportsCheckboxes = document.querySelectorAll('input[name="sport"]:checked') as NodeListOf<HTMLInputElement>;
      const sports = Array.from(sportsCheckboxes).map(cb => cb.value);
      
      // Collect selected goals
      const goalsCheckboxes = document.querySelectorAll('input[name="goal"]:checked') as NodeListOf<HTMLInputElement>;
      const goals = Array.from(goalsCheckboxes).map(cb => cb.value);
      
      // Collect available days
      const daysCheckboxes = document.querySelectorAll('input[name="day"]:checked') as NodeListOf<HTMLInputElement>;
      const availableDays = Array.from(daysCheckboxes).map(cb => cb.value);

      // AI settings
      const aiEnabled = (document.getElementById('enable-ai-insights') as HTMLInputElement).checked;

      // Validate required fields
      if (!age || age < 13 || age > 100) {
        throw new Error('Please enter a valid age between 13 and 100');
      }
      if (!restingHR || restingHR < 30 || restingHR > 100) {
        throw new Error('Please enter a valid resting heart rate between 30 and 100 bpm');
      }
      if (!maxHR || maxHR < 100 || maxHR > 250) {
        throw new Error('Please enter a valid maximum heart rate between 100 and 250 bpm');
      }
      if (sports.length === 0) {
        throw new Error('Please select at least one sport');
      }
      if (goals.length === 0) {
        throw new Error('Please select at least one training goal');
      }

      // Update user profile
      await this.userProfileService.updateProfile({
        preferences: {
          age,
          sex,
          restingHR,
          maxHR,
          fitnessLevel,
          sports,
          goals,
          weeklyHours,
          availableDays,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          units: 'metric',
          hrZones: this.calculateHRZones(restingHR, maxHR)
        }
      });

      // Update AI settings
      this.dashboardService.setAIInsightsEnabled(aiEnabled);

      // Close modal and refresh
      document.body.removeChild(modal);
      this.renderProfileView();
      
      UIHelpers.showStatus('Profile saved successfully!', 'success');

      // Refresh AI insights if enabled
      if (aiEnabled) {
        await this.refreshAIInsights();
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      UIHelpers.showStatus(error instanceof Error ? error.message : 'Failed to save profile', 'error');
    }
  }

  private calculateHRZones(restingHR: number, maxHR: number) {
    const hrReserve = maxHR - restingHR;
    return {
      zone1: { min: restingHR + Math.round(hrReserve * 0.50), max: restingHR + Math.round(hrReserve * 0.60) },
      zone2: { min: restingHR + Math.round(hrReserve * 0.60), max: restingHR + Math.round(hrReserve * 0.70) },
      zone3: { min: restingHR + Math.round(hrReserve * 0.70), max: restingHR + Math.round(hrReserve * 0.80) },
      zone4: { min: restingHR + Math.round(hrReserve * 0.80), max: restingHR + Math.round(hrReserve * 0.90) },
      zone5: { min: restingHR + Math.round(hrReserve * 0.90), max: maxHR }
    };
  }

  private showDeleteAccountModal(): void {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      UIHelpers.showStatus('Delete account functionality coming soon!', 'info');
    }
  }

  /**
   * Refresh calendar from saved training plan
   */
  private async refreshCalendar(): Promise<void> {
    try {
      UIHelpers.showStatus('Refreshing training calendar...', 'info');
      
      await this.workoutCalendar.refreshFromStorage();
      
      UIHelpers.showStatus('Calendar refreshed successfully', 'success');
      
    } catch (error) {
      console.error('Error refreshing calendar:', error);
      UIHelpers.showStatus('Failed to refresh calendar', 'error');
    }
  }

  /**
   * Sync training data from Firebase
   */
  private async syncTrainingData(): Promise<void> {
    try {
      UIHelpers.showStatus('Syncing training data...', 'info');
      
      // Refresh dashboard data
      await this.loadDashboardData();
      
      // Refresh calendar data
      await this.workoutCalendar.refreshFromStorage();
      
      // Refresh recovery metrics
      if (this.recoveryTracker) {
        await this.recoveryTracker.refreshData();
      }
      
      UIHelpers.showStatus('Training data synchronized successfully', 'success');
      
    } catch (error) {
      console.error('Error syncing training data:', error);
      UIHelpers.showStatus('Failed to sync training data', 'error');
    }
  }
}