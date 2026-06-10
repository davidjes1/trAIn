// Integration test for unified workout system
import WorkoutService from './services/WorkoutService';
import { WorkoutPlanIntegration } from './services/WorkoutPlanIntegration';
import { UnifiedWorkoutCalendar } from './components/workout-calendar/UnifiedWorkoutCalendar';
import { AuthService } from './firebase/auth';
import { UIHelpers } from './utils/ui-helpers';
import { SegmentExamples } from './examples/segment-examples';

// Make services available globally for testing
declare global {
  interface Window {
    testServices: any;
    testUserId?: string;
    checkAuth: () => Promise<void>;
    generateSamplePlan: () => Promise<void>;
    generateSegmentedWorkout: () => Promise<void>;
    replaceAllFutureWorkouts: () => Promise<void>;
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

// Generate detailed segmented workout
window.generateSegmentedWorkout = async function() {
  const results = document.getElementById('plan-results');
  if (!results) return;
  
  results.innerHTML = 'Generating detailed segmented workout...';

  try {
    const userId = window.testUserId || 'test-user';
    
    // Create cycling interval workout with detailed segments
    const cyclingSegments = SegmentExamples.createCyclingIntervals();
    
    const detailedWorkout = {
      userId,
      date: new Date().toISOString().split('T')[0],
      sport: 'bike' as const,
      name: 'Tuesday Cycling Intervals',
      description: 'High-intensity cycling session with Zone 4 intervals',
      durationMin: cyclingSegments.reduce((total, segment) => {
        if (segment.measurement === 'time') {
          return total + (segment as any).durationMin;
        }
        return total;
      }, 0),
      targetMetrics: {
        targetPower: 280,
        expectedFatigue: 75
      },
      segments: cyclingSegments,
      tags: ['intervals', 'cycling', 'zone4'],
      expectedFatigue: 75,
      notes: 'Focus on maintaining power output during work intervals'
    };

    // Save the workout
    const savedWorkout = await WorkoutService.createPlannedWorkout(detailedWorkout);
    
    // Also create a strength circuit example
    const strengthSegments = SegmentExamples.createStrengthCircuit();
    const strengthWorkout = {
      userId,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sport: 'strength' as const,
      name: 'Wednesday Strength Circuit',
      description: 'Full-body strength training with compound movements',
      durationMin: strengthSegments.reduce((total, segment) => {
        if (segment.measurement === 'time') {
          return total + (segment as any).durationMin;
        }
        return total + 2; // Approximate time for rep-based exercises
      }, 0),
      targetMetrics: {
        expectedFatigue: 65
      },
      segments: strengthSegments,
      tags: ['strength', 'circuit', 'full-body'],
      expectedFatigue: 65,
      notes: 'Focus on proper form over speed'
    };

    const savedStrengthWorkout = await WorkoutService.createPlannedWorkout(strengthWorkout);
    
    // Generate summary
    const cyclingSummary = SegmentExamples.generateExampleSummary(cyclingSegments);
    const strengthSummary = SegmentExamples.generateExampleSummary(strengthSegments);
    
    results.innerHTML = `✅ Detailed Segmented Workouts Created!

<h4>🚴 Cycling Intervals Workout:</h4>
<div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
<strong>ID:</strong> ${savedWorkout.id.substring(0, 8)}...<br>
<strong>Segments:</strong> ${cyclingSegments.length}<br>
<strong>Total Duration:</strong> ${savedWorkout.planned?.durationMin} minutes<br>
<strong>Focus:</strong> Zone 4 intervals with power targets
</div>

<h4>💪 Strength Circuit Workout:</h4>
<div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
<strong>ID:</strong> ${savedStrengthWorkout.id.substring(0, 8)}...<br>
<strong>Segments:</strong> ${strengthSegments.length}<br>
<strong>Exercises:</strong> Squats, Push-ups, Planks (3 sets each)<br>
<strong>Equipment:</strong> Barbell, bodyweight
</div>

<details style="margin-top: 1rem;">
<summary><strong>📋 Detailed Cycling Structure:</strong></summary>
<pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 4px; white-space: pre-wrap; font-size: 0.8rem; margin-top: 0.5rem;">${cyclingSummary}</pre>
</details>

<details style="margin-top: 1rem;">
<summary><strong>💪 Detailed Strength Structure:</strong></summary>
<pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 4px; white-space: pre-wrap; font-size: 0.8rem; margin-top: 0.5rem;">${strengthSummary}</pre>
</details>

<p style="margin-top: 1rem; color: #22c55e;">
✨ Click on these workouts in the calendar to see the detailed segment display!
</p>`;

    showStatus('Created detailed segmented workouts!', 'success');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.innerHTML = `❌ Failed to create segmented workouts: ${errorMessage}`;
    showStatus('Segmented workout creation failed', 'error');
    console.error('Segmented workout error:', error);
  }
};

// Test comprehensive future workout replacement
window.replaceAllFutureWorkouts = async function() {
  const results = document.getElementById('plan-results');
  if (!results) return;
  
  results.innerHTML = 'Testing comprehensive workout replacement...';

  try {
    const userId = window.testUserId || 'test-user';
    
    // First, create some existing workouts to demonstrate replacement
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    console.log('Creating test workouts to demonstrate replacement...');
    
    // Create a past workout (should be preserved)
    const pastWorkout = await WorkoutService.createPlannedWorkout({
      userId,
      date: yesterday.toISOString().split('T')[0],
      sport: 'run' as const,
      name: 'Past Planned Workout (Should Preserve)',
      description: 'This workout is in the past and should not be deleted',
      durationMin: 30,
      tags: ['preserve-me']
    });

    // Create future planned workouts (should be replaced)
    const futureWorkout1 = await WorkoutService.createPlannedWorkout({
      userId,
      date: tomorrow.toISOString().split('T')[0],
      sport: 'bike' as const,
      name: 'Old Future Workout 1 (Will be replaced)',
      description: 'This should be deleted and replaced',
      durationMin: 45,
      tags: ['old-plan']
    });

    const futureWorkout2 = await WorkoutService.createPlannedWorkout({
      userId,
      date: dayAfterTomorrow.toISOString().split('T')[0],
      sport: 'strength' as const,
      name: 'Old Future Workout 2 (Will be replaced)',
      description: 'This should also be deleted and replaced',
      durationMin: 60,
      tags: ['old-plan']
    });

    // Now create a new plan to replace all future workouts
    const newPlan = {
      plan: [
        {
          date: today.toISOString().split('T')[0],
          sport: 'run',
          workoutType: 'tempo_run',
          durationMin: 40,
          description: 'New tempo run replacing old plan',
          expectedFatigue: 60,
          hrTargetZone: 'Zone 3',
          workoutTags: ['new-plan', 'tempo']
        },
        {
          date: tomorrow.toISOString().split('T')[0],
          sport: 'swim',
          workoutType: 'endurance_swim',
          durationMin: 50,
          description: 'New swim workout replacing old plan',
          expectedFatigue: 45,
          workoutTags: ['new-plan', 'swimming']
        },
        {
          date: dayAfterTomorrow.toISOString().split('T')[0],
          sport: 'yoga',
          workoutType: 'yoga_flow',
          durationMin: 60,
          description: 'New yoga session replacing old plan',
          expectedFatigue: 20,
          workoutTags: ['new-plan', 'recovery']
        }
      ]
    };

    // Use the comprehensive replacement method
    const result = await WorkoutPlanIntegration.replaceAllFutureWorkouts(newPlan, userId);
    
    // Verify the results
    const allWorkouts = await WorkoutService.getUserWorkouts(userId, 20);
    const pastWorkouts = allWorkouts.filter(w => w.date < today.toISOString().split('T')[0]);
    const futureWorkouts = allWorkouts.filter(w => w.date >= today.toISOString().split('T')[0]);
    
    results.innerHTML = `✅ Comprehensive Workout Replacement Complete!

<h4>📊 Replacement Summary:</h4>
<div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
<strong>Replaced:</strong> ${result.replacedCount} old future workouts<br>
<strong>Created:</strong> ${result.workouts.length} new planned workouts<br>
<strong>Preserved:</strong> ${pastWorkouts.length} past workouts<br>
<strong>Failures:</strong> ${result.failures.length}
</div>

<h4>🛡️ Preserved Past Workouts:</h4>
<div style="background: rgba(34,197,94,0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0; border-left: 3px solid #22c55e;">
${pastWorkouts.map(w => `
<div style="margin-bottom: 0.5rem;">
• <strong>${w.name}</strong> (${w.date})<br>
  <small style="color: rgba(255,255,255,0.7);">${w.description}</small>
</div>
`).join('')}
</div>

<h4>🆕 New Future Workouts:</h4>
<div style="background: rgba(99,102,241,0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0; border-left: 3px solid #6366f1;">
${result.workouts.map(w => `
<div style="margin-bottom: 0.5rem;">
• <strong>${w.name}</strong> (${w.date})<br>
  <small style="color: rgba(255,255,255,0.7);">${w.description}</small><br>
  <small style="color: rgba(255,255,255,0.6);">Tags: ${w.planned?.tags?.join(', ') || 'None'}</small>
</div>
`).join('')}
</div>

<p style="margin-top: 1rem; color: #fbbf24;">
⚡ <strong>Smart Replacement Logic:</strong><br>
• Past workouts (completed, missed, or before today) are preserved<br>
• Only future planned workouts are replaced<br>
• New plan completely overwrites the old training schedule going forward
</p>`;

    showStatus(`Replaced ${result.replacedCount} old workouts with ${result.workouts.length} new workouts!`, 'success');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.innerHTML = `❌ Failed to test comprehensive replacement: ${errorMessage}`;
    showStatus('Comprehensive replacement test failed', 'error');
    console.error('Comprehensive replacement error:', error);
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