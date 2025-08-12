// Integration test for unified workout system
import WorkoutService from './services/WorkoutService';
import { WorkoutPlanIntegration } from './services/WorkoutPlanIntegration';
import { UnifiedWorkoutCalendar } from './components/workout-calendar/UnifiedWorkoutCalendar';
import { AuthService } from './firebase/auth';
import { UIHelpers } from './utils/ui-helpers';

// Make services available globally for testing
declare global {
  interface Window {
    testServices: any;
    testUserId?: string;
    checkAuth: () => Promise<void>;
    generateSamplePlan: () => Promise<void>;
    loadWorkoutsFromUnifiedService: () => Promise<void>;
    testCalendarDisplay: () => Promise<void>;
    simulateWorkoutCompletion: () => Promise<void>;
    clearTestData: () => Promise<void>;
    showStatus: (message: string, type?: string) => void;
  }
}

// Make services available globally for testing
window.testServices = {
  WorkoutService,
  WorkoutPlanIntegration,
  UnifiedWorkoutCalendar,
  AuthService,
  UIHelpers
};

// Test authentication
window.checkAuth = async function() {
  const results = document.getElementById('auth-results');
  if (!results) return;
  
  results.innerHTML = 'Checking authentication...';

  try {
    const currentUser = AuthService.getCurrentUserId();
    if (currentUser) {
      results.innerHTML = `✅ Authenticated as: ${currentUser}`;
      showStatus('Authentication successful', 'success');
    } else {
      results.innerHTML = '❌ Not authenticated - simulating user for testing';
      showStatus('Using test user ID', 'info');
      // Set a test user ID for integration testing
      window.testUserId = 'test-user-' + Date.now();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.innerHTML = `❌ Auth check failed: ${errorMessage}`;
    showStatus('Authentication failed', 'error');
    window.testUserId = 'test-user-' + Date.now();
  }
};

// Generate sample training plan
window.generateSamplePlan = async function() {
  const results = document.getElementById('plan-results');
  if (!results) return;
  
  results.innerHTML = 'Generating sample training plan...';

  try {
    // Create sample training plan data
    const today = new Date();
    const samplePlan = {
      plan: [
        {
          date: today.toISOString().split('T')[0],
          sport: 'run',
          workoutType: 'easy_run',
          durationMin: 45,
          description: 'Easy recovery run',
          expectedFatigue: 25,
          hrTargetZone: 'Zone 2 (145 bpm)',
          workoutTags: ['recovery', 'base'],
          customParameters: { targetPace: '5:30/km' }
        },
        {
          date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sport: 'bike',
          workoutType: 'tempo_bike',
          durationMin: 60,
          description: 'Tempo cycling session',
          expectedFatigue: 65,
          hrTargetZone: 'Zone 3 (160 bpm)',
          workoutTags: ['tempo', 'aerobic'],
          customParameters: { targetPower: 250, intensity: 0.85 }
        },
        {
          date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sport: 'strength',
          workoutType: 'strength_training',
          durationMin: 50,
          description: 'Upper body strength training',
          expectedFatigue: 45,
          workoutTags: ['strength', 'upper-body']
        }
      ]
    };

    const userId = window.testUserId || 'test-user';
    
    // Use WorkoutPlanIntegration to save the plan
    const result = await WorkoutPlanIntegration.replaceGeneratedPlan(samplePlan, userId);
    
    results.innerHTML = `✅ Plan Generated Successfully!
    
Workouts created: ${result.workouts.length}
Failures: ${result.failures.length}

Workout Details:
${result.workouts.map((w, i) => `
${i + 1}. ${w.name}
   - Date: ${w.date}
   - Sport: ${w.sport}
   - Duration: ${w.planned?.durationMin || 'N/A'} minutes
   - Status: ${w.status}
   - ID: ${w.id.substring(0, 8)}...
`).join('')}

${result.failures.length > 0 ? `
Failures:
${result.failures.map((f, i) => `${i + 1}. ${f.error}`).join('\n')}
` : ''}`;

    showStatus(`Generated ${result.workouts.length} workouts successfully`, 'success');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.innerHTML = `❌ Failed to generate plan: ${errorMessage}`;
    showStatus('Plan generation failed', 'error');
    console.error('Plan generation error:', error);
  }
};

// Load workouts from unified service
window.loadWorkoutsFromUnifiedService = async function() {
  const results = document.getElementById('workout-results');
  if (!results) return;
  
  results.innerHTML = 'Loading workouts from unified service...';

  try {
    const userId = window.testUserId || 'test-user';
    const workouts = await WorkoutService.getUserWorkouts(userId, 10);
    
    results.innerHTML = `✅ Loaded ${workouts.length} workouts

${workouts.map((w, i) => `
<div class="workout-card ${w.status}">
<strong>${w.name}</strong> (${w.sport})
<br>📅 ${w.date}
<br>📊 Status: ${w.status}
${w.planned?.durationMin ? `<br>⏱️ Duration: ${w.planned.durationMin}min` : ''}
${w.actual?.durationMin ? `<br>✅ Completed: ${w.actual.durationMin}min` : ''}
</div>
`).join('')}`;

    showStatus(`Loaded ${workouts.length} workouts`, 'success');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.innerHTML = `❌ Failed to load workouts: ${errorMessage}`;
    showStatus('Failed to load workouts', 'error');
    console.error('Workout loading error:', error);
  }
};

// Test calendar display
window.testCalendarDisplay = async function() {
  const calendarContainer = document.getElementById('calendar-container');
  if (!calendarContainer) return;
  
  calendarContainer.innerHTML = 'Initializing calendar...';

  try {
    const userId = window.testUserId || 'test-user';
    const today = new Date().toISOString().split('T')[0];
    
    const config = {
      viewType: 'week' as const,
      startDate: today,
      highlightToday: true
    };

    const calendar = new UnifiedWorkoutCalendar(calendarContainer, config, {
      onWorkoutClick: (workout) => {
        showStatus(`Clicked workout: ${workout.name}`, 'info');
        console.log('Workout clicked:', workout);
      }
    });

    // Wait a moment for calendar to initialize
    setTimeout(() => {
      showStatus('Calendar display initialized', 'success');
    }, 1000);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    calendarContainer.innerHTML = `❌ Calendar failed to initialize: ${errorMessage}`;
    showStatus('Calendar initialization failed', 'error');
    console.error('Calendar error:', error);
  }
};

// Simulate workout completion
window.simulateWorkoutCompletion = async function() {
  const results = document.getElementById('fit-results');
  if (!results) return;
  
  results.innerHTML = 'Simulating workout completion...';

  try {
    const userId = window.testUserId || 'test-user';
    
    // Get recent planned workouts
    const workouts = await WorkoutService.getUserWorkouts(userId, 5);
    const plannedWorkouts = workouts.filter(w => w.status === 'planned');
    
    if (plannedWorkouts.length === 0) {
      results.innerHTML = '❌ No planned workouts found to complete. Generate a plan first.';
      return;
    }

    const workoutToComplete = plannedWorkouts[0];
    
    // Simulate parsed FIT data
    const mockFitData = {
      fileId: 'test-fit-' + Date.now(),
      sport: workoutToComplete.sport,
      startTime: new Date().toISOString(),
      durationMin: (workoutToComplete.planned?.durationMin || 45) + Math.random() * 10 - 5,
      distanceKm: workoutToComplete.sport === 'run' ? 8.5 : workoutToComplete.sport === 'bike' ? 25.3 : undefined,
      avgHR: 155 + Math.random() * 20,
      maxHR: 175 + Math.random() * 15,
      elevationGain: Math.random() * 200,
      avgPace: workoutToComplete.sport === 'run' ? '5:25/km' : undefined,
      avgSpeed: workoutToComplete.sport === 'bike' ? 28.5 : undefined,
      trainingLoad: 45 + Math.random() * 30,
      hrZones: [
        { zone: 1, timeMin: 5, percentage: 11 },
        { zone: 2, timeMin: 25, percentage: 56 },
        { zone: 3, timeMin: 12, percentage: 27 },
        { zone: 4, timeMin: 3, percentage: 6 },
        { zone: 5, timeMin: 0, percentage: 0 }
      ]
    };

    // Process the "FIT data"
    const result = await WorkoutService.processParsedFitData(userId, mockFitData);
    
    results.innerHTML = `✅ Workout Completion Simulated!
    
${result.wasMatched ? '🎯 Matched to planned workout!' : '⚡ Saved as unplanned workout'}

Workout: ${result.workout.name}
Date: ${result.workout.date}
Status: ${result.workout.status}
Duration: ${result.workout.actual?.durationMin?.toFixed(1)}min
${result.workout.actual?.distanceKm ? `Distance: ${result.workout.actual.distanceKm.toFixed(1)}km` : ''}
Avg HR: ${result.workout.actual?.avgHR} bpm
Training Load: ${result.workout.actual?.trainingLoad}`;

    showStatus(result.wasMatched ? 'Workout matched and completed!' : 'Unplanned workout saved!', 'success');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.innerHTML = `❌ Failed to simulate workout completion: ${errorMessage}`;
    showStatus('Workout completion simulation failed', 'error');
    console.error('Workout completion error:', error);
  }
};

// Clear test data
window.clearTestData = async function() {
  const results = document.getElementById('plan-results');
  if (!results) return;
  
  results.innerHTML = 'Clearing test data...';

  try {
    const userId = window.testUserId || 'test-user';
    const workouts = await WorkoutService.getUserWorkouts(userId, 50);
    
    for (const workout of workouts) {
      await WorkoutService.deleteWorkout(workout.id);
    }
    
    results.innerHTML = `✅ Cleared ${workouts.length} test workouts`;
    showStatus(`Cleared ${workouts.length} workouts`, 'success');
    
    // Refresh displays
    const workoutResults = document.getElementById('workout-results');
    const calendarContainer = document.getElementById('calendar-container');
    if (workoutResults) workoutResults.innerHTML = '';
    if (calendarContainer) calendarContainer.innerHTML = '';
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.innerHTML = `❌ Failed to clear test data: ${errorMessage}`;
    showStatus('Failed to clear test data', 'error');
  }
};

// Status display helper
window.showStatus = function(message: string, type: string = 'info') {
  const statusDiv = document.getElementById('status-display');
  if (!statusDiv) return;
  
  const statusClass = `status-${type}`;
  statusDiv.innerHTML = `<div class="${statusClass}">${message}</div>`;
  
  setTimeout(() => {
    statusDiv.innerHTML = '';
  }, 5000);
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  window.checkAuth();
  window.showStatus('Integration test page loaded', 'info');
});