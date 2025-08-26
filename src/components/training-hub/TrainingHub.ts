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
import { UnifiedWorkoutCalendar } from '../workout-calendar/UnifiedWorkoutCalendar';
import { SegmentDisplay } from '../segments/SegmentDisplay';
import { WorkoutComparison } from './WorkoutComparison';
import { RecoveryMetricsTracker } from '../recovery/RecoveryMetricsTracker';
import { TrainingPlanManager } from '../training-plan/TrainingPlanManager';
import { RecentWorkoutDisplay } from '../recent-workout/RecentWorkoutDisplay';
import { StravaConnector } from '../strava/StravaConnector';
import { AuthManager } from '../auth/AuthManager';
import { Router } from '../../services/Router';
import { UserProfileService } from '../../services/UserProfileService';
import { User } from 'firebase/auth';

export class TrainingHub {
  private state: TrainingHubState;
  private workoutCalendar: EnhancedWorkoutCalendar;
  private unifiedWorkoutCalendar: UnifiedWorkoutCalendar | null = null;
  private workoutComparison: WorkoutComparison;
  private recoveryTracker!: RecoveryMetricsTracker; // Initialized after authentication
  private recentWorkoutDisplay!: RecentWorkoutDisplay; // Initialized after authentication
  private trainingPlanManager!: TrainingPlanManager; // Initialized after authentication
  private authManager!: AuthManager; // Initialized in constructor
  private router!: Router; // Initialized after authentication
  private dashboardService: DashboardService;
  private userProfileService: UserProfileService;
  private stravaConnector: StravaConnector | null = null;
  private isImportModalOpen: boolean = false;
  private currentPlan: any | null = null;

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
    try {
      const isAuthenticated = user !== null;

      console.log('🔄 Auth state changed:', { 
        isAuthenticated, 
        userId: user?.uid,
        email: user?.email,
        hasProfile: !!profile
      });

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
        
        console.log('✅ Main content should now be visible');
        
        // Update Strava footer badge visibility
        this.updateStravaFooterBadge();
      
      // Initialize router
      this.router = new Router((view: string) => this.onViewChange(view));
      
      // Initialize recovery metrics tracker
      const recoveryContainer = document.getElementById('recovery-metrics-container');
      if (recoveryContainer) {
        this.recoveryTracker = new RecoveryMetricsTracker(recoveryContainer);
      }

      // Initialize recent workout display
      const recentWorkoutContainer = document.getElementById('recent-workout-container');
      if (recentWorkoutContainer) {
        this.recentWorkoutDisplay = new RecentWorkoutDisplay(recentWorkoutContainer);
      }
      
      // Initialize training plan manager with reference to this hub
      this.trainingPlanManager = new TrainingPlanManager(this);
      
      // Setup integration between training plan and other components
      this.setupTrainingPlanIntegration();
      
      // Update nav user info using centralized service
      const displayName = this.userProfileService.getDisplayName();
      const email = this.userProfileService.getEmail();
      this.router.updateNavUser(displayName, email);
      
        // Initialize the app
        this.initializeEventListeners();
        this.initializeUnifiedCalendar();
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
    } catch (error) {
      console.error('❌ Error in auth state change handler:', error);
      // Try to show auth screen as fallback
      const authContainer = document.getElementById('auth-container');
      const mainContent = document.getElementById('main-content');
      
      if (authContainer) {
        authContainer.style.display = 'block';
      }
      if (mainContent) {
        mainContent.style.display = 'none';
      }
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
    
    // Header controls - ensure single event listener
    const importBtn = document.getElementById('import-data-btn');
    if (importBtn && !importBtn.hasAttribute('data-listener-added')) {
      importBtn.setAttribute('data-listener-added', 'true');
      importBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('📁 Import data button clicked');
        this.navigateToImportPage();
      });
    }

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

    // Recent workout updates - refresh when new workouts are imported/synced
    document.addEventListener('workouts-updated', () => {
      console.log('📊 Workouts updated, refreshing recent workout display...');
      if (this.recentWorkoutDisplay) {
        this.recentWorkoutDisplay.refresh();
      }
    });

    // Show import modal from recent workout empty state
    document.addEventListener('show-import-modal', (e) => {
      console.log('📋 Custom show-import-modal event triggered');
      this.navigateToImportPage();
    });

    // AI Insights controls
    document.getElementById('refresh-ai-btn')?.addEventListener('click', () => {
      this.refreshAIInsights();
    });

    document.getElementById('toggle-ai-btn')?.addEventListener('click', () => {
      this.toggleAIInsights();
    });

    // Import modal - handled in showImportModal method

    // File handling for legacy components (keeping for backward compatibility)
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

  private navigateToImportPage(): void {
    // Hide current view
    const currentView = document.querySelector('.view-container.active');
    if (currentView) {
      currentView.classList.remove('active');
      (currentView as HTMLElement).style.display = 'none';
    }

    // Show import data view
    const importView = document.getElementById('import-data-view');
    if (importView) {
      importView.style.display = 'block';
      importView.classList.add('active');
      
      // Initialize the import page if not already done
      const app = (window as any).app;
      if (app && app.importDataPage) {
        app.importDataPage.show();
      }
    }

    // Update navigation state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // No specific nav item for import page, so we leave all inactive
    console.log('📁 Navigated to import data page');
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
      
      // Populate excluded exercises from saved preferences
      const savedExcludedExercises = trainingProfile.excludedExercises || [];
      savedExcludedExercises.forEach((exercise: string) => {
        const checkbox = document.getElementById(`exclude-${exercise}`) as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = true;
        }
      });
      
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

    // Collect excluded exercises from checkboxes
    const excludedExercises: string[] = [];
    document.querySelectorAll('input[name="excludedExercises"]:checked').forEach((checkbox) => {
      const input = checkbox as HTMLInputElement;
      excludedExercises.push(input.value);
    });
    console.log('🚫 Excluded exercises:', excludedExercises);

    // Use profile data as defaults, form data as overrides
    const age = ageInput ? parseInt(ageInput) : trainingProfile.age;
    const fitnessLevel = (fitnessInput as 'beginner' | 'intermediate' | 'advanced') || trainingProfile.fitnessLevel;

    // Save excluded exercises to user preferences if they differ from saved preferences
    const sortedExcluded = excludedExercises.sort();
    const sortedSaved = trainingProfile.excludedExercises.sort();
    
    if (JSON.stringify(sortedExcluded) !== JSON.stringify(sortedSaved)) {
      console.log('💾 Saving exercise exclusions to user preferences');
      try {
        // Update user preferences with excluded exercises
        const currentProfile = userProfileService.getUserProfile();
        const currentPreferences = currentProfile?.preferences;
        
        if (currentPreferences) {
          await userProfileService.updateProfile({
            preferences: {
              ...currentPreferences,
              excludedExercises: excludedExercises
            }
          });
        } else {
          // Create default preferences with excluded exercises
          await userProfileService.updateProfile({
            preferences: {
              timezone: 'UTC',
              units: 'metric' as const,
              hrZones: {
                zone1: { min: 50, max: 60 },
                zone2: { min: 60, max: 70 },
                zone3: { min: 70, max: 80 },
                zone4: { min: 80, max: 90 },
                zone5: { min: 90, max: 100 }
              },
              fitnessLevel: 'intermediate' as const,
              restingHR: 60,
              maxHR: 190,
              age: 30,
              sports: ['running'],
              goals: ['general_fitness'],
              excludedExercises: excludedExercises
            }
          });
        }
        console.log('✅ Exercise exclusions saved successfully');
      } catch (error) {
        console.warn('Failed to save exercise exclusions:', error);
      }
    }

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
      excludedExercises, // Add excluded exercises to plan options
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
  private showImportModal(): void {
    // Check if modal actually exists in DOM (in case flag is out of sync)
    const currentModal = document.getElementById('import-modal');
    if (currentModal) {
      console.log('⚠️ Import modal already exists in DOM, removing it first');
      currentModal.remove();
      this.isImportModalOpen = false;
    }

    // Prevent duplicate modal creation
    if (this.isImportModalOpen) {
      console.log('⚠️ Import modal already open, ignoring duplicate call');
      return;
    }

    this.isImportModalOpen = true;
    console.log('🔄 Opening import modal...');

    // Also remove any Strava settings modals that might be open
    const stravaModals = document.querySelectorAll('.strava-settings-modal');
    stravaModals.forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'import-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    `;
    modal.innerHTML = `
      <div class="modal-content large-modal" style="
        background: #FFFFFF;
        border-radius: 12px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        width: 100%;
        max-width: 800px;
      ">
        <div class="modal-header" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid #D0D7DE;
        ">
          <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: #1A1A1A;">
            📁 Import Training Data
          </h3>
          <button class="close-btn" id="close-import-modal" aria-label="Close import modal" style="
            background: none;
            border: none;
            font-size: 1.5rem;
            color: #4D4D4D;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
          ">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px;">
          <div class="import-options" style="display: flex; flex-direction: column; gap: 24px;">
            
            <!-- Import Method Selection -->
            <div class="import-method-tabs" style="display: flex; border-bottom: 1px solid #D0D7DE; margin-bottom: 16px;">
              <button class="import-tab active" data-method="fit" style="
                padding: 12px 24px;
                border: none;
                background: none;
                border-bottom: 2px solid #00B26F;
                color: #00B26F;
                font-weight: 600;
                cursor: pointer;
              ">📁 FIT Files</button>
              <button class="import-tab" data-method="strava" style="
                padding: 12px 24px;
                border: none;
                background: none;
                border-bottom: 2px solid transparent;
                color: #666;
                font-weight: 500;
                cursor: pointer;
              ">🏃 Strava</button>
            </div>

            <!-- FIT File Import -->
            <div class="import-method-content" id="fit-import-content">
              <div class="drop-zone" id="fit-drop-zone" style="
                border: 2px dashed #D0D7DE;
                border-radius: 12px;
                padding: 32px;
                text-align: center;
                background: #F7F9FB;
                transition: all 0.3s ease;
                cursor: pointer;
              ">
                <div class="drop-zone-content" style="
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 16px;
                ">
                  <div class="drop-zone-icon" style="font-size: 3rem; opacity: 0.7;">📁</div>
                  <p class="drop-zone-text" style="
                    font-size: 1.1rem;
                    color: #4D4D4D;
                    margin: 0;
                  ">Drop .fit files here or click to select</p>
                  <button class="btn btn-secondary" id="select-files-btn" style="
                    background-color: #00B26F;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                  ">
                    <span aria-hidden="true">📂</span> Select Files
                  </button>
                </div>
                <input type="file" id="fit-file-input" accept=".fit" multiple style="display: none;">
              </div>
            </div>

            <!-- Strava Import -->
            <div class="import-method-content" id="strava-import-content" style="display: none;">
              <div id="strava-connector-container" style="
                border: 2px solid #FC4C02;
                border-radius: 12px;
                padding: 24px;
                background: #FFF8F6;
              "></div>
            </div>
            
            <div class="import-settings" style="background: #F7F9FB; padding: 20px; border-radius: 8px;">
              <h4 style="margin: 0 0 16px 0; font-size: 1.1rem; color: #1A1A1A;">Import Settings</h4>
              <div class="settings-grid" style="display: flex; flex-direction: column; gap: 12px;">
                <label class="checkbox-label" style="
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  cursor: pointer;
                  padding: 8px;
                  border-radius: 4px;
                  transition: background-color 0.2s ease;
                ">
                  <input type="checkbox" id="auto-save-firebase" checked>
                  <span>Automatically save to Firebase</span>
                </label>
                <label class="checkbox-label" style="
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  cursor: pointer;
                  padding: 8px;
                  border-radius: 4px;
                  transition: background-color 0.2s ease;
                ">
                  <input type="checkbox" id="auto-match-workouts" checked>
                  <span>Auto-match with planned workouts</span>
                </label>
              </div>
            </div>
            
            <div class="selected-files" id="selected-files-list">
              <div class="files-header" style="
                display: none;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 1px solid #D0D7DE;
              ">
                <h4 style="margin: 0; font-size: 1.1rem; color: #1A1A1A;">Selected Files</h4>
                <span class="file-count" id="file-count" style="
                  font-size: 0.9rem;
                  color: #4D4D4D;
                  background: #F7F9FB;
                  padding: 4px 12px;
                  border-radius: 12px;
                ">0 files selected</span>
              </div>
              <div class="files-grid" id="files-grid" style="
                display: flex;
                flex-direction: column;
                gap: 8px;
              "></div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer" style="
          padding: 24px;
          border-top: 1px solid #D0D7DE;
          background: #F7F9FB;
          border-radius: 0 0 12px 12px;
        ">
          <div class="import-actions" style="
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            align-items: center;
          ">
            <button class="btn btn-ghost" id="clear-files-btn" disabled style="
              background: none;
              color: #4D4D4D;
              border: 1px solid #D0D7DE;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">
              Clear All
            </button>
            <button class="btn btn-primary" id="process-files-btn" disabled style="
              background-color: #0066CC;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">
              <span aria-hidden="true">⚡</span> Process Files
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Debug: Log modal creation
    console.log('📋 Import modal created and added to DOM');
    console.log('🔍 Modal element:', modal);
    console.log('🔍 Close button:', document.getElementById('close-import-modal'));
    
    this.initializeImportModalEvents();
  }

  private initializeImportModalEvents(): void {
    const modal = document.getElementById('import-modal');
    const closeBtn = document.getElementById('close-import-modal');
    const dropZone = document.getElementById('fit-drop-zone');
    const fileInput = document.getElementById('fit-file-input') as HTMLInputElement;
    const selectBtn = document.getElementById('select-files-btn');
    const processBtn = document.getElementById('process-files-btn');
    
    // Tab switching
    const importTabs = document.querySelectorAll('.import-tab');
    const importContents = document.querySelectorAll('.import-method-content');
    
    importTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const method = (e.target as HTMLElement).getAttribute('data-method');
        this.switchImportMethod(method);
      });
    });

    // Initialize Strava connector
    try {
      this.initializeStravaConnector();
    } catch (error) {
      console.error('❌ Error initializing Strava connector:', error);
      // Continue without Strava connector - don't break the modal
    }
    const clearBtn = document.getElementById('clear-files-btn');
    const filesList = document.getElementById('selected-files-list');

    let selectedFiles: File[] = [];

    // Close modal function
    const closeModal = () => {
      console.log('🔄 Closing import modal');
      const modalElement = document.getElementById('import-modal');
      if (modalElement) {
        modalElement.remove();
        this.isImportModalOpen = false;
        console.log('✅ Import modal closed');
      }
    };

    // Close modal events with better error handling
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('❌ Close button clicked');
        closeModal();
      });
    } else {
      console.warn('⚠️ Close button not found');
    }

    // Close on overlay click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          console.log('❌ Overlay clicked to close');
          closeModal();
        }
      });
    }

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.getElementById('import-modal')) {
        console.log('❌ Escape key pressed to close');
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

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
      console.log('Files selected via input:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
      
      if (files.length === 0) {
        console.warn('No files selected from input');
        return;
      }
      
      const fitFiles = files.filter(file => file.name.toLowerCase().endsWith('.fit'));
      if (fitFiles.length === 0) {
        UIHelpers.showStatus('Please select .fit files only', 'warning');
        return;
      }
      
      if (fitFiles.length < files.length) {
        UIHelpers.showStatus(`Selected ${fitFiles.length} .fit files (${files.length - fitFiles.length} non-.fit files ignored)`, 'info');
      }
      
      selectedFiles.push(...fitFiles);
      this.updateFilesList(selectedFiles, filesList, processBtn);
    });

    // Process files
    processBtn?.addEventListener('click', async () => {
      console.log('Process files button clicked');
      console.log('Selected files count:', selectedFiles.length);
      
      if (selectedFiles.length === 0) {
        UIHelpers.showStatus('No files selected to process', 'warning');
        return;
      }
      
      // Disable button during processing
      processBtn.setAttribute('disabled', 'true');
      processBtn.textContent = '⚡ Processing...';
      
      try {
        const autoSave = (document.getElementById('auto-save-firebase') as HTMLInputElement)?.checked ?? true;
        console.log('Processing with auto-save:', autoSave);
        
        await this.processFitFiles(selectedFiles, autoSave);
        
        // Close modal after successful processing
        setTimeout(() => modal?.remove(), 2000); // Give time to see success message
      } catch (error) {
        console.error('Error in process button handler:', error);
        UIHelpers.showStatus('Processing failed', 'error');
      } finally {
        // Re-enable button
        processBtn.removeAttribute('disabled');
        processBtn.innerHTML = '<span aria-hidden="true">⚡</span> Process Files';
      }
    });

    // Clear files
    clearBtn?.addEventListener('click', () => {
      selectedFiles = [];
      this.updateFilesList(selectedFiles, filesList, processBtn);
    });
  }

  private updateFilesList(files: File[], listElement: HTMLElement | null, processBtn: HTMLElement | null): void {
    if (!listElement || !processBtn) return;

    const filesHeader = document.querySelector('.files-header') as HTMLElement;
    const filesGrid = document.getElementById('files-grid');
    const fileCount = document.getElementById('file-count');
    const clearBtn = document.getElementById('clear-files-btn') as HTMLButtonElement;

    if (files.length === 0) {
      if (filesHeader) filesHeader.style.display = 'none';
      if (filesGrid) filesGrid.innerHTML = '';
      processBtn.setAttribute('disabled', 'true');
      if (clearBtn) clearBtn.setAttribute('disabled', 'true');
      return;
    }

    if (filesHeader) filesHeader.style.display = 'flex';
    if (fileCount) fileCount.textContent = `${files.length} ${files.length === 1 ? 'file' : 'files'} selected`;

    if (filesGrid) {
      filesGrid.innerHTML = files.map((file, index) => `
        <div class="file-item" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: #FFFFFF;
          border-radius: 8px;
          border: 1px solid #D0D7DE;
          transition: all 0.2s ease;
        ">
          <div class="file-info" style="
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
          ">
            <div class="file-icon" style="font-size: 1.5rem; opacity: 0.7;">📄</div>
            <div class="file-details" style="
              display: flex;
              flex-direction: column;
              min-width: 0;
            ">
              <span class="file-name" title="${file.name}" style="
                font-weight: 500;
                color: #1A1A1A;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              ">${file.name}</span>
              <span class="file-size" style="
                font-size: 0.85rem;
                color: #4D4D4D;
              ">${(file.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <button class="remove-file btn-icon" data-index="${index}" title="Remove file" aria-label="Remove ${file.name}" style="
            background: none;
            border: none;
            color: #4D4D4D;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            font-size: 1.2rem;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='#FEF2F2'; this.style.color='#D93025';" onmouseout="this.style.background='none'; this.style.color='#4D4D4D';">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      `).join('');
    }

    // Add remove file event listeners
    document.querySelectorAll('.remove-file').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('.remove-file') as HTMLElement;
        const index = parseInt(button.dataset.index || '0');
        files.splice(index, 1);
        this.updateFilesList(files, listElement, processBtn);
      });
    });

    processBtn.removeAttribute('disabled');
    if (clearBtn) clearBtn.removeAttribute('disabled');
  }

  private async processFitFiles(files: File[], saveToFirebase: boolean): Promise<void> {
    if (files.length === 0) {
      console.warn('No files to process');
      UIHelpers.showStatus('No files selected for processing', 'warning');
      return;
    }

    console.log(`Starting to process ${files.length} files`, { saveToFirebase, files: files.map(f => f.name) });
    UIHelpers.showStatus(`Processing ${files.length} files...`, 'info');

    try {
      // Check if FileService exists and has the method
      if (!FileService || typeof FileService.processBatchFiles !== 'function') {
        console.error('FileService.processBatchFiles is not available');
        throw new Error('File processing service is not available');
      }

      const result = await FileService.processBatchFiles(files, {
        saveToFirebase,
        showProgress: true
      });

      console.log('File processing completed:', result);

      // Refresh data after successful processing
      if (result.successful > 0) {
        console.log('Refreshing data after successful processing');
        await this.syncData();
      }

      // Show detailed results
      console.log('Import results:', result);
      const successMsg = `Processing complete! ✅ ${result.successful} successful, ❌ ${result.failed} failed`;
      console.log(successMsg);
      
      if (result.failed > 0) {
        UIHelpers.showStatus(`${result.successful}/${files.length} files processed. ${result.failed} failed.`, 'warning');
      } else {
        UIHelpers.showStatus(`All ${result.successful} files processed successfully!`, 'success');
      }
      
    } catch (error) {
      console.error('Batch processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      UIHelpers.showStatus(`Failed to process files: ${errorMessage}`, 'error');
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
    } else if (view === 'training-plan') {
      this.showTrainingPlanView();
    } else if (view === 'dashboard') {
      this.hideTrainingPlanView();
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
    if (!contentEl) {
      console.warn('🤖 AI Insights: Content element not found');
      return;
    }

    console.log('🤖 AI Insights Debug:', {
      aiEnabled: this.dashboardService.isAIInsightsEnabled(),
      hasInsights: !!aiInsights,
      insights: aiInsights
    });

    // Check if we have valid AI insights data first, regardless of enabled state
    if (aiInsights && aiInsights.quickStats) {
      // We have valid AI data - display it regardless of the toggle state
      console.log('🤖 Displaying AI insights with valid data');
      this.renderAIInsights(aiInsights, contentEl);
      return;
    }

    if (!this.dashboardService.isAIInsightsEnabled()) {
      contentEl.innerHTML = `
        <div class="ai-disabled">
          <span class="error-icon">🤖</span>
          <p>AI insights are disabled or unavailable</p>
          <button class="btn btn-primary enable-btn" id="enable-ai-btn">Enable AI Insights</button>
        </div>
      `;
      
      // Add event listener for enable button
      document.getElementById('enable-ai-btn')?.addEventListener('click', () => {
        this.toggleAIInsights();
      });
      return;
    }

    if (!aiInsights) {
      contentEl.innerHTML = `
        <div class="ai-error">
          <span class="error-icon">⚠️</span>
          <p>Unable to load AI insights</p>
          <button class="btn btn-secondary retry-btn" id="ai-retry-btn">Retry</button>
        </div>
      `;
      
      // Add event listener for retry button
      document.getElementById('ai-retry-btn')?.addEventListener('click', () => {
        this.refreshAIInsights();
      });
      return;
    }

    // If we reach here, use the existing rendering logic
    this.renderAIInsights(aiInsights, contentEl);
  }

  /**
   * Render AI insights content
   */
  private renderAIInsights(aiInsights: any, contentEl: HTMLElement): void {
    console.log('🎨 Rendering AI insights to DOM element:', contentEl);
    
    // Create insights grid
    const insightsHTML = `
      <div class="ai-insights-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; padding: 1rem;">
        ${this.createReadinessCard(aiInsights.quickStats)}
        ${this.createWorkoutRecommendationCard(aiInsights.workoutRecommendation)}
        ${this.createFatigueStatusCard(aiInsights.fatigueAssessment)}
        ${this.createPerformanceTrendCard(aiInsights.performanceAnalysis)}
      </div>
    `;

    contentEl.innerHTML = insightsHTML;
    console.log('✅ AI insights HTML set, element should now be visible');
  }

  private createReadinessCard(quickStats: any): string {
    if (!quickStats) return '';
    
    const score = quickStats.readinessScore || 0;
    const progressPercent = (score / 100) * 360;
    
    return `
      <div class="ai-insight-card" style="
        background: #FFFFFF;
        border: 1px solid #D0D7DE;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        min-height: 200px;
      ">
        <div class="insight-header" style="margin-bottom: 16px;">
          <h4 class="insight-title" style="margin: 0; color: #1A1A1A; font-size: 1.1rem;">🎯 Training Readiness</h4>
        </div>
        <div class="insight-content">
          <div class="readiness-score" style="text-align: center; margin: 20px 0;">
            <div class="score-circle" style="
              display: inline-block;
              width: 80px;
              height: 80px;
              border-radius: 50%;
              background: conic-gradient(#0066CC 0deg ${progressPercent}deg, #F0F0F0 ${progressPercent}deg 360deg);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
              font-weight: bold;
              color: #1A1A1A;
              margin: 0 auto;
            ">
              ${score}
            </div>
            <div class="score-label" style="margin-top: 8px; color: #4D4D4D; font-size: 0.9rem;">Ready to Train</div>
          </div>
          <div class="performance-trend" style="text-align: center; margin-top: 16px;">
            <span class="trend-indicator" style="margin-right: 8px;">${this.getTrendIcon(quickStats.trendDirection)}</span>
            <span class="trend-text" style="color: #4D4D4D; text-transform: capitalize;">${quickStats.trendDirection}</span>
          </div>
          <div style="margin-top: 16px; padding: 12px; background: #F7F9FB; border-radius: 8px;">
            <strong style="color: #1A1A1A;">Recommendation:</strong>
            <p style="margin: 8px 0 0 0; color: #4D4D4D; font-size: 0.9rem;">${quickStats.nextRecommendation}</p>
          </div>
        </div>
      </div>
    `;
  }

  private createWorkoutRecommendationCard(workoutRec: any): string {
    if (!workoutRec || !workoutRec.recommendedWorkout) {
      return `
        <div class="ai-insight-card" style="
          background: #FFFFFF;
          border: 1px solid #D0D7DE;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          min-height: 200px;
        ">
          <div class="insight-header" style="margin-bottom: 16px;">
            <h4 style="margin: 0; color: #1A1A1A; font-size: 1.1rem;">🏃 Tomorrow's Workout</h4>
          </div>
          <div style="text-align: center; color: #4D4D4D; padding: 40px 0;">
            <div style="font-size: 2rem; margin-bottom: 16px;">💤</div>
            <p>Let your body guide the workout</p>
            <p style="font-size: 0.9rem; margin-top: 12px;">AI is analyzing your recent activities to provide personalized recommendations.</p>
          </div>
        </div>
      `;
    }
    
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
    if (!fatigueAssessment) {
      return `
        <div class="ai-insight-card" style="
          background: #FFFFFF;
          border: 1px solid #D0D7DE;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          min-height: 200px;
        ">
          <div class="insight-header" style="margin-bottom: 16px;">
            <h4 style="margin: 0; color: #1A1A1A; font-size: 1.1rem;">⚡ Recovery Status</h4>
          </div>
          <div style="text-align: center; color: #4D4D4D; padding: 40px 0;">
            <div style="font-size: 2rem; margin-bottom: 16px;">💚</div>
            <p>Feeling good and ready to train</p>
            <div style="margin-top: 16px; padding: 12px; background: #F0FDF4; border-radius: 8px; color: #166534;">
              <strong>Status:</strong> Low Risk
            </div>
          </div>
        </div>
      `;
    }
    
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
    if (!perfAnalysis) {
      return `
        <div class="ai-insight-card" style="
          background: #FFFFFF;
          border: 1px solid #D0D7DE;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          min-height: 200px;
        ">
          <div class="insight-header" style="margin-bottom: 16px;">
            <h4 style="margin: 0; color: #1A1A1A; font-size: 1.1rem;">📈 Performance Trend</h4>
          </div>
          <div style="text-align: center; color: #4D4D4D; padding: 40px 0;">
            <div style="font-size: 2rem; margin-bottom: 16px;">📊</div>
            <p>Building fitness progressively</p>
            <div style="margin-top: 16px; padding: 12px; background: #EFF6FF; border-radius: 8px; color: #1E40AF;">
              <strong>Trend:</strong> Stable Progress
            </div>
          </div>
        </div>
      `;
    }
    
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
   * Initialize unified workout calendar
   */
  private initializeUnifiedCalendar(): void {
    try {
      // Find the calendar container
      const calendarContainer = document.getElementById('workout-calendar');
      if (!calendarContainer) {
        console.warn('Workout calendar container not found, skipping unified calendar initialization');
        return;
      }

      console.log('🗓️ Initializing unified workout calendar...');

      // Create unified calendar configuration
      const config = {
        viewType: 'week' as const,
        startDate: new Date().toISOString().split('T')[0],
        highlightToday: true,
        showStatusFilter: undefined, // Show all statuses
        showSportFilter: undefined   // Show all sports
      };

      // Initialize unified calendar
      this.unifiedWorkoutCalendar = new UnifiedWorkoutCalendar(
        calendarContainer,
        config,
        {
          onWorkoutClick: (workout) => this.onUnifiedWorkoutSelected(workout)
        }
      );

      console.log('✅ Unified workout calendar initialized');

    } catch (error) {
      console.error('❌ Failed to initialize unified workout calendar:', error);
    }
  }

  /**
   * Handle workout selection from unified calendar
   */
  private onUnifiedWorkoutSelected(workout: any): void {
    console.log('🎯 Workout selected from unified calendar:', workout.name);
    console.log('📊 Workout data:', workout);
    
    // Show workout detail panel for unified workout
    this.showUnifiedWorkoutDetail(workout);
    
    // You can also trigger other actions here
    // like showing a workout editing modal, etc.
  }

  /**
   * Show workout detail panel for unified workouts
   */
  private showUnifiedWorkoutDetail(workout: any): void {
    console.log('🔍 Attempting to show workout detail for:', workout.name);
    
    const detailPanel = document.getElementById('workout-detail-panel');
    const detailContent = document.getElementById('workout-detail-content');
    
    console.log('📋 Detail panel found:', !!detailPanel);
    console.log('📋 Detail content found:', !!detailContent);
    
    if (!detailPanel || !detailContent) {
      console.warn('Workout detail panel not found - panel:', !!detailPanel, 'content:', !!detailContent);
      return;
    }

    // Generate workout detail HTML
    const detailHTML = this.generateWorkoutDetailHTML(workout);
    detailContent.innerHTML = detailHTML;
    
    console.log('✅ Generated detail HTML, showing panel...');
    
    // Show the panel with proper CSS animation (same as existing method)
    detailPanel.style.display = 'block';
    setTimeout(() => detailPanel.classList.add('visible'), 10);
    
    console.log('📋 Panel shown with visible class and animation');
    
    // Update panel title
    const titleElement = document.getElementById('workout-detail-title');
    if (titleElement) {
      titleElement.textContent = workout.name;
      console.log('📋 Updated panel title to:', workout.name);
    }
  }

  /**
   * Generate workout detail HTML
   */
  private generateWorkoutDetailHTML(workout: any): string {
    const sportIcon = this.getSportIcon(workout.sport);
    const statusBadge = this.getStatusBadge(workout.status);
    
    return `
      <div class="workout-detail-content">
        <div class="workout-header">
          <span class="sport-icon">${sportIcon}</span>
          <div class="workout-info">
            <h4>${workout.name}</h4>
            <p class="workout-date">${new Date(workout.date).toLocaleDateString()}</p>
            ${statusBadge}
          </div>
        </div>

        ${workout.description ? `
          <div class="workout-description">
            <h5>Description</h5>
            <p>${workout.description}</p>
          </div>
        ` : ''}

        ${workout.planned ? `
          <div class="planned-workout-section">
            <h5>📋 Planned Workout</h5>
            <div class="workout-metrics">
              ${workout.planned.durationMin ? `<div class="metric"><strong>Duration:</strong> ${workout.planned.durationMin} min</div>` : ''}
              ${workout.planned.distanceKm ? `<div class="metric"><strong>Distance:</strong> ${workout.planned.distanceKm} km</div>` : ''}
              ${workout.planned.expectedFatigue ? `<div class="metric"><strong>Expected Effort:</strong> ${workout.planned.expectedFatigue}/100</div>` : ''}
            </div>
            ${workout.planned.tags && workout.planned.tags.length > 0 ? `
              <div class="workout-tags">
                <strong>Tags:</strong> ${workout.planned.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
              </div>
            ` : ''}
            ${workout.planned.notes ? `
              <div class="workout-notes">
                <strong>Notes:</strong> <p>${workout.planned.notes}</p>
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${workout.planned && (workout.planned.segments || workout.planned.segmentGroups) ? `
          <div class="workout-segments-section">
            <h5>📋 Workout Structure</h5>
            ${SegmentDisplay.generateSegmentsHTML(workout.planned.segments || [], workout.planned.segmentGroups)}
          </div>
        ` : ''}

        ${workout.actual ? `
          <div class="actual-workout-section">
            <h5>✅ Completed Workout</h5>
            <div class="workout-metrics">
              <div class="metric"><strong>Duration:</strong> ${workout.actual.durationMin} min</div>
              <div class="metric"><strong>Distance:</strong> ${workout.actual.distanceKm.toFixed(2)} km</div>
              ${workout.actual.avgHR ? `<div class="metric"><strong>Avg HR:</strong> ${workout.actual.avgHR} bpm</div>` : ''}
              ${workout.actual.maxHR ? `<div class="metric"><strong>Max HR:</strong> ${workout.actual.maxHR} bpm</div>` : ''}
              ${workout.actual.avgPace ? `<div class="metric"><strong>Avg Pace:</strong> ${workout.actual.avgPace}/km</div>` : ''}
              ${workout.actual.trainingLoad ? `<div class="metric"><strong>Training Load:</strong> ${workout.actual.trainingLoad}</div>` : ''}
              ${workout.actual.calories ? `<div class="metric"><strong>Calories:</strong> ${workout.actual.calories}</div>` : ''}
            </div>

            ${workout.actual.zones && workout.actual.zones.length > 0 ? `
              <div class="hr-zones">
                <strong>Heart Rate Zones:</strong>
                <div class="zones-chart">
                  ${workout.actual.zones.map(zone => `
                    <div class="zone-bar">
                      <span class="zone-label">Z${zone.zone}</span>
                      <div class="zone-time">${zone.minutes}min</div>
                      ${zone.percentage ? `<div class="zone-percentage">${zone.percentage}%</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="workout-actions">
          ${workout.status === 'planned' ? `
            <button class="btn btn-success" onclick="markWorkoutCompleted('${workout.id}')">Mark Completed</button>
            <button class="btn btn-warning" onclick="markWorkoutMissed('${workout.id}')">Mark Missed</button>
          ` : ''}
          <button class="btn btn-secondary" onclick="editWorkout('${workout.id}')">Edit</button>
          <button class="btn btn-danger" onclick="deleteWorkout('${workout.id}')">Delete</button>
        </div>
      </div>
    `;
  }

  /**
   * Get sport icon
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
   * Get status badge
   */
  private getStatusBadge(status: string): string {
    const badgeMap: Record<string, string> = {
      'planned': '<span class="status-badge planned">📅 Planned</span>',
      'completed': '<span class="status-badge completed">✅ Completed</span>',
      'missed': '<span class="status-badge missed">❌ Missed</span>',
      'unplanned': '<span class="status-badge unplanned">⚡ Unplanned</span>'
    };
    return badgeMap[status] || '<span class="status-badge">❓ Unknown</span>';
  }

  /**
   * Sync training data from Firebase
   */
  private async syncTrainingData(): Promise<void> {
    try {
      UIHelpers.showStatus('Syncing training data...', 'info');
      
      // Refresh dashboard data
      if (this.recentWorkoutDisplay) {
        await this.recentWorkoutDisplay.refresh();
      }
      
      // Refresh calendar data
      if (this.unifiedWorkoutCalendar) {
        // Use existing refresh methods if available
        try {
          await this.unifiedWorkoutCalendar.refreshFromStorage?.() || 
                this.unifiedWorkoutCalendar.refresh?.();
        } catch (error) {
          console.warn('Calendar refresh failed:', error);
        }
      }
      
      // Trigger global workout update event
      document.dispatchEvent(new CustomEvent('workouts-updated'));
      
      UIHelpers.showStatus('Training data synchronized successfully', 'success');
      
    } catch (error) {
      console.error('Error syncing training data:', error);
      UIHelpers.showStatus('Failed to sync training data', 'error');
    }
  }

  /**
   * TRAINING PLAN MANAGEMENT METHODS
   */

  private showTrainingPlanView(): void {
    // Show training plan section
    if (this.trainingPlanManager) {
      this.trainingPlanManager.showSection();
    }
    
    // Hide other sections
    const dashboardSection = document.getElementById('dashboard-content');
    if (dashboardSection) {
      dashboardSection.style.display = 'none';
    }
  }

  private hideTrainingPlanView(): void {
    // Hide training plan section
    if (this.trainingPlanManager) {
      this.trainingPlanManager.hideSection();
    }
    
    // Show dashboard section
    const dashboardSection = document.getElementById('dashboard-content');
    if (dashboardSection) {
      dashboardSection.style.display = 'block';
    }
  }

  /**
   * Public API for TrainingPlanManager integration
   */
  public getTrainingPlanManager(): TrainingPlanManager | null {
    return this.trainingPlanManager || null;
  }

  /**
   * Listen for workout updates from TrainingPlanManager
   */
  private setupTrainingPlanIntegration(): void {
    // Listen for workout updates from plan generation
    document.addEventListener('workouts-updated', (event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.source === 'plan-generation') {
        console.log('🔄 Workouts updated from plan generation, refreshing calendar...');
        
        // Refresh the unified workout calendar
        if (this.unifiedWorkoutCalendar) {
          this.unifiedWorkoutCalendar.refreshData();
        }
        
        // Refresh recovery metrics if they depend on workout data
        if (this.recoveryTracker) {
          // The recovery tracker will automatically pick up new workouts
          console.log('🔄 Recovery metrics will reflect new workout data');
        }
        
        // Show success message
        UIHelpers.showStatus('Training plan integrated with workout calendar', 'success');
      }
    });
  }

  /**
   * Public method for TrainingPlanManager to get current plan
   */
  public getCurrentPlan(): any | null {
    return this.currentPlan;
  }

  /**
   * Public method to check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.userProfileService.isAuthenticated();
  }

  // Strava import methods
  private switchImportMethod(method: string | null): void {
    const tabs = document.querySelectorAll('.import-tab');
    const contents = document.querySelectorAll('.import-method-content');
    
    tabs.forEach(tab => {
      const tabMethod = tab.getAttribute('data-method');
      if (tabMethod === method) {
        tab.classList.add('active');
        (tab as HTMLElement).style.borderBottomColor = '#00B26F';
        (tab as HTMLElement).style.color = '#00B26F';
        (tab as HTMLElement).style.fontWeight = '600';
      } else {
        tab.classList.remove('active');
        (tab as HTMLElement).style.borderBottomColor = 'transparent';
        (tab as HTMLElement).style.color = '#666';
        (tab as HTMLElement).style.fontWeight = '500';
      }
    });

    contents.forEach(content => {
      const contentId = content.id;
      if ((method === 'fit' && contentId === 'fit-import-content') ||
          (method === 'strava' && contentId === 'strava-import-content')) {
        (content as HTMLElement).style.display = 'block';
      } else {
        (content as HTMLElement).style.display = 'none';
      }
    });
  }

  private initializeStravaConnector(): void {
    const container = document.getElementById('strava-connector-container');
    if (!container) return;

    // Create Strava connector instance
    this.stravaConnector = new StravaConnector(container, (connected) => {
      if (connected) {
        console.log('✅ Strava connected successfully');
        this.updateStravaFooterBadge();
      } else {
        console.log('❌ Strava disconnected');
        this.updateStravaFooterBadge();
      }
    });
  }

  private updateStravaFooterBadge(): void {
    const footerBadge = document.getElementById('strava-footer-badge');
    if (!footerBadge) return;

    const isStravaConnected = this.userProfileService.isStravaConnected();
    
    if (isStravaConnected) {
      footerBadge.style.display = 'block';
      console.log('🏷️ Showing Strava footer badge');
    } else {
      footerBadge.style.display = 'none';
      console.log('🏷️ Hiding Strava footer badge');
    }
  }
}