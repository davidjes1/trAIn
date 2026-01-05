// Complete Integration Example for Workout Management System
import WorkoutService from '../services/WorkoutService';
import GarminParser from '../utils/garmin-parser';
import WorkoutUploadManager from '../components/workout-upload/WorkoutUploadManager';
import { WorkoutServiceTests } from '../tests/workout-service.test';
import {
  CreatePlannedWorkoutInput,
  ParsedFitData,
  Workout,
  WorkoutBatchResult
} from '@/core/models';

/**
 * Example: Complete workout management integration for trAIn
 */
export class WorkoutIntegrationExample {

  /**
   * Example 1: Creating and managing planned workouts
   */
  static async examplePlannedWorkouts(): Promise<void> {
    console.log('📋 Example: Planning Workouts for the Week');
    
    const userId = 'demo-user-123';
    const weeklyPlan = [
      {
        userId,
        date: '2024-01-15',
        sport: 'run' as const,
        name: 'Monday Easy Run',
        description: 'Zone 2 base building run',
        durationMin: 45,
        distanceKm: 7.5,
        targetMetrics: {
          expectedAvgHR: 145,
          expectedMaxHR: 160,
          expectedFatigue: 3
        },
        tags: ['easy', 'base', 'zone2'],
        expectedFatigue: 3,
        notes: 'Keep HR below 150. Focus on form.'
      },
      {
        userId,
        date: '2024-01-16',
        sport: 'bike' as const,
        name: 'Tuesday Bike Intervals',
        description: '5x5min threshold intervals',
        durationMin: 75,
        distanceKm: 25,
        targetMetrics: {
          expectedAvgHR: 165,
          expectedMaxHR: 180,
          expectedFatigue: 7
        },
        segments: [
          { id: '1', name: 'Warmup', durationMin: 15, targetHR: 140 },
          { id: '2', name: 'Intervals', durationMin: 50, targetHR: 165 },
          { id: '3', name: 'Cooldown', durationMin: 10, targetHR: 120 }
        ],
        tags: ['intervals', 'threshold', 'structured'],
        expectedFatigue: 7
      },
      {
        userId,
        date: '2024-01-17',
        sport: 'swim' as const,
        name: 'Wednesday Swim Technique',
        description: 'Drill-focused session',
        durationMin: 60,
        distanceKm: 2.5,
        targetMetrics: {
          expectedFatigue: 4
        },
        tags: ['technique', 'drills', 'skills'],
        expectedFatigue: 4,
        notes: 'Focus on catch and rotation. 50m build sets.'
      },
      {
        userId,
        date: '2024-01-18',
        sport: 'run' as const,
        name: 'Thursday Tempo Run',
        description: 'Comfortably hard effort',
        durationMin: 50,
        distanceKm: 8,
        targetMetrics: {
          expectedAvgHR: 155,
          expectedFatigue: 6
        },
        tags: ['tempo', 'threshold'],
        expectedFatigue: 6
      },
      {
        userId,
        date: '2024-01-20',
        sport: 'run' as const,
        name: 'Saturday Long Run',
        description: 'Aerobic endurance builder',
        durationMin: 90,
        distanceKm: 15,
        targetMetrics: {
          expectedAvgHR: 150,
          expectedFatigue: 8
        },
        tags: ['long', 'endurance', 'aerobic'],
        expectedFatigue: 8,
        notes: 'Negative split. Last 3km at marathon pace.'
      }
    ];

    console.log(`\n📝 Creating ${weeklyPlan.length} planned workouts...`);
    
    for (const workout of weeklyPlan) {
      try {
        const created = await WorkoutService.createPlannedWorkout(workout);
        console.log(`✅ ${workout.name} (${workout.date})`);
      } catch (error) {
        console.error(`❌ Failed to create ${workout.name}:`, error);
      }
    }
  }

  /**
   * Example 2: Processing uploaded FIT files
   */
  static async exampleFitFileProcessing(): Promise<void> {
    console.log('\n📁 Example: Processing Uploaded FIT Files');
    
    const userId = 'demo-user-123';

    // Simulate FIT file uploads with realistic data
    const fitUploads = [
      {
        filename: 'monday-run.fit',
        data: GarminParser.createSampleParsedData({
          activityId: 'garmin_monday_run_456',
          sport: 'run',
          date: '2024-01-15', // Matches planned workout
          durationMin: 47,    // Close to planned 45min
          distanceKm: 7.8,    // Close to planned 7.5km
          avgHR: 147,
          maxHR: 162,
          avgPace: '06:02',
          ascentM: 85,
          descentM: 78,
          calories: 425,
          trainingLoad: 52,
          zones: [
            { zone: 1, minutes: 5, percentage: 11 },
            { zone: 2, minutes: 32, percentage: 68 },
            { zone: 3, minutes: 8, percentage: 17 },
            { zone: 4, minutes: 2, percentage: 4 },
            { zone: 5, minutes: 0, percentage: 0 }
          ]
        })
      },
      {
        filename: 'tuesday-bike.fit',
        data: GarminParser.createSampleParsedData({
          activityId: 'garmin_bike_intervals_789',
          sport: 'bike',
          date: '2024-01-16', // Matches planned workout
          durationMin: 78,    // Close to planned 75min
          distanceKm: 26.2,   // Close to planned 25km
          avgHR: 168,
          maxHR: 182,
          avgPower: 245,
          maxPower: 320,
          avgSpeed: 20.1,
          ascentM: 245,
          calories: 856,
          trainingLoad: 98,
          zones: [
            { zone: 1, minutes: 8, percentage: 10 },
            { zone: 2, minutes: 15, percentage: 19 },
            { zone: 3, minutes: 25, percentage: 32 },
            { zone: 4, minutes: 25, percentage: 32 },
            { zone: 5, minutes: 5, percentage: 6 }
          ]
        })
      },
      {
        filename: 'unplanned-evening-run.fit',
        data: GarminParser.createSampleParsedData({
          activityId: 'garmin_evening_run_321',
          sport: 'run',
          date: '2024-01-17', // No planned run for this date (swim was planned)
          durationMin: 35,
          distanceKm: 5.2,
          avgHR: 158,
          maxHR: 171,
          avgPace: '06:44',
          calories: 312,
          trainingLoad: 41
        })
      }
    ];

    console.log(`\n⚙️ Processing ${fitUploads.length} FIT files...`);

    for (const upload of fitUploads) {
      try {
        console.log(`\n📁 Processing: ${upload.filename}`);
        
        const result = await WorkoutService.processParsedFitData(userId, upload.data);
        
        if (result.wasMatched) {
          console.log(`✅ Matched to planned workout: ${result.workout.name}`);
          console.log(`   📊 Duration: ${result.workout.actual?.durationMin}min (planned: ${result.workout.planned?.durationMin}min)`);
          console.log(`   📏 Distance: ${result.workout.actual?.distanceKm.toFixed(1)}km (planned: ${result.workout.planned?.distanceKm}km)`);
          console.log(`   💓 Avg HR: ${result.workout.actual?.avgHR} bpm`);
          console.log(`   ⚡ Training Load: ${result.workout.actual?.trainingLoad}`);
        } else {
          console.log(`🆕 Created unplanned workout: ${result.workout.name}`);
          console.log(`   📊 ${result.workout.actual?.durationMin}min • ${result.workout.actual?.distanceKm.toFixed(1)}km`);
          console.log(`   💓 ${result.workout.actual?.avgHR} bpm avg • ${result.workout.actual?.maxHR} bpm max`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to process ${upload.filename}:`, error);
      }
    }
  }

  /**
   * Example 3: Batch processing with progress tracking
   */
  static async exampleBatchProcessing(): Promise<void> {
    console.log('\n⚡ Example: Batch Processing Multiple FIT Files');
    
    const userId = 'demo-user-batch';

    // Create some planned workouts first
    const plannedWorkouts = [
      { userId, date: '2024-01-10', sport: 'run' as const, name: 'Morning Run', durationMin: 40 },
      { userId, date: '2024-01-11', sport: 'bike' as const, name: 'Bike Ride', durationMin: 60 },
      { userId, date: '2024-01-12', sport: 'swim' as const, name: 'Swim Session', durationMin: 45 }
    ];

    for (const workout of plannedWorkouts) {
      await WorkoutService.createPlannedWorkout(workout);
    }

    // Create batch of FIT files
    const batchFitData: ParsedFitData[] = [
      GarminParser.createSampleParsedData({
        sport: 'run',
        date: '2024-01-10',
        durationMin: 42,
        activityId: 'batch_run_1'
      }),
      GarminParser.createSampleParsedData({
        sport: 'bike', 
        date: '2024-01-11',
        durationMin: 58,
        activityId: 'batch_bike_1'
      }),
      GarminParser.createSampleParsedData({
        sport: 'run',
        date: '2024-01-13', // Unplanned
        durationMin: 25,
        activityId: 'batch_run_unplanned'
      }),
      GarminParser.createSampleParsedData({
        sport: 'strength',
        date: '2024-01-14', // Unplanned
        durationMin: 50,
        activityId: 'batch_strength_1'
      })
    ];

    console.log(`\n📦 Processing batch of ${batchFitData.length} activities...`);
    
    const batchResult = await WorkoutService.processBatchFitData(userId, batchFitData);

    console.log(`\n📊 Batch Results:`);
    console.log(`   ✅ Successful: ${batchResult.successful.length}`);
    console.log(`   🎯 Matched: ${batchResult.matched}`);
    console.log(`   🆕 Unplanned: ${batchResult.unplanned}`);
    console.log(`   ❌ Failed: ${batchResult.failed.length}`);

    // Show individual results
    batchResult.successful.forEach(workout => {
      const matchStatus = workout.status === 'completed' ? '🎯 Matched' : '🆕 Unplanned';
      console.log(`   ${matchStatus}: ${workout.name} (${workout.date})`);
    });

    if (batchResult.failed.length > 0) {
      console.log(`\n❌ Failed items:`);
      batchResult.failed.forEach(failure => {
        console.log(`   - ${failure.error}`);
      });
    }
  }

  /**
   * Example 4: Advanced workout analysis and reporting
   */
  static async exampleWorkoutAnalysis(): Promise<void> {
    console.log('\n📈 Example: Workout Analysis and Reporting');
    
    const userId = 'demo-user-123';
    
    // Get user's workouts
    const workouts = await WorkoutService.getUserWorkouts(userId, 10);
    
    console.log(`\n📋 User has ${workouts.length} recent workouts`);

    // Analyze workouts by status
    const statusCounts = workouts.reduce((counts, workout) => {
      counts[workout.status] = (counts[workout.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    console.log(`📊 Workout Status Distribution:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = {
        'planned': '📅',
        'completed': '✅', 
        'missed': '❌',
        'unplanned': '🆕'
      }[status] || '❓';
      console.log(`   ${emoji} ${status}: ${count}`);
    });

    // Analyze completed workouts
    const completedWorkouts = workouts.filter(w => w.status === 'completed' && w.actual);
    
    if (completedWorkouts.length > 0) {
      console.log(`\n🏃 Completed Workouts Analysis (${completedWorkouts.length} workouts):`);
      
      // Total training time and distance
      const totalTime = completedWorkouts.reduce((sum, w) => sum + (w.actual?.durationMin || 0), 0);
      const totalDistance = completedWorkouts.reduce((sum, w) => sum + (w.actual?.distanceKm || 0), 0);
      const totalLoad = completedWorkouts.reduce((sum, w) => sum + (w.actual?.trainingLoad || 0), 0);
      
      console.log(`   ⏱️  Total Time: ${Math.floor(totalTime / 60)}h ${totalTime % 60}min`);
      console.log(`   📏 Total Distance: ${totalDistance.toFixed(1)}km`);
      console.log(`   ⚡ Total Training Load: ${totalLoad}`);
      
      // Average metrics
      const avgHR = completedWorkouts
        .filter(w => w.actual?.avgHR)
        .reduce((sum, w, _, arr) => sum + (w.actual!.avgHR! / arr.length), 0);
      
      if (avgHR > 0) {
        console.log(`   💓 Average Heart Rate: ${Math.round(avgHR)} bpm`);
      }

      // Sport distribution
      const sportCounts = completedWorkouts.reduce((counts, workout) => {
        counts[workout.sport] = (counts[workout.sport] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      console.log(`   🏃 Sports Distribution:`);
      Object.entries(sportCounts).forEach(([sport, count]) => {
        const emoji = {
          'run': '🏃',
          'bike': '🚴',
          'swim': '🏊',
          'strength': '💪',
          'yoga': '🧘'
        }[sport] || '⚽';
        console.log(`     ${emoji} ${sport}: ${count} workouts`);
      });

      // Plan adherence analysis
      const plannedAndCompleted = completedWorkouts.filter(w => w.planned);
      if (plannedAndCompleted.length > 0) {
        console.log(`\n🎯 Plan Adherence Analysis:`);
        console.log(`   📋 Planned workouts completed: ${plannedAndCompleted.length}`);
        
        // Duration adherence
        const durationVariances = plannedAndCompleted
          .filter(w => w.planned?.durationMin && w.actual?.durationMin)
          .map(w => {
            const planned = w.planned!.durationMin!;
            const actual = w.actual!.durationMin;
            return ((actual - planned) / planned) * 100;
          });

        if (durationVariances.length > 0) {
          const avgDurationVariance = durationVariances.reduce((sum, v) => sum + v, 0) / durationVariances.length;
          console.log(`   ⏱️  Avg Duration Variance: ${avgDurationVariance.toFixed(1)}%`);
        }

        // Distance adherence  
        const distanceVariances = plannedAndCompleted
          .filter(w => w.planned?.distanceKm && w.actual?.distanceKm)
          .map(w => {
            const planned = w.planned!.distanceKm!;
            const actual = w.actual!.distanceKm;
            return ((actual - planned) / planned) * 100;
          });

        if (distanceVariances.length > 0) {
          const avgDistanceVariance = distanceVariances.reduce((sum, v) => sum + v, 0) / distanceVariances.length;
          console.log(`   📏 Avg Distance Variance: ${avgDistanceVariance.toFixed(1)}%`);
        }
      }
    }
  }

  /**
   * Example 5: UI Integration with upload manager
   */
  static exampleUIIntegration(): void {
    console.log('\n🖥️ Example: UI Integration Setup');
    
    const userId = 'demo-user-ui';

    // Create upload manager with UI callbacks
    const uploadManager = new WorkoutUploadManager(userId, {
      onProgress: (progress) => {
        console.log(`📈 Progress: ${progress.current}/${progress.total} - ${progress.currentFile}`);
        
        // Update progress bar in UI
        const progressBar = document.getElementById('upload-progress-bar') as HTMLElement;
        if (progressBar) {
          const percentage = (progress.current / progress.total) * 100;
          progressBar.style.width = `${percentage}%`;
        }

        // Update status text
        const statusElement = document.getElementById('upload-status');
        if (statusElement) {
          const statusMap = {
            'parsing': '📁 Parsing files...',
            'processing': '⚙️ Matching workouts...',
            'complete': '✅ Upload complete!',
            'error': '❌ Upload failed'
          };
          statusElement.textContent = statusMap[progress.status];
        }
      },
      
      onComplete: (results) => {
        console.log(`✅ Upload complete: ${results.successful.length} workouts processed`);
        
        // Show success message
        const messageElement = document.getElementById('upload-message');
        if (messageElement) {
          messageElement.innerHTML = `
            <div class="success-message">
              <h4>✅ Upload Successful!</h4>
              <p>${results.successful.length} workouts processed</p>
              <p>🎯 ${results.matched} matched to planned workouts</p>
              <p>🆕 ${results.unplanned} created as unplanned workouts</p>
              ${results.failed.length > 0 ? `<p>❌ ${results.failed.length} failed to process</p>` : ''}
            </div>
          `;
        }

        // Refresh workout list
        this.refreshWorkoutList(userId);
      },
      
      onError: (error) => {
        console.error(`❌ Upload error: ${error}`);
        
        const messageElement = document.getElementById('upload-message');
        if (messageElement) {
          messageElement.innerHTML = `
            <div class="error-message">
              <h4>❌ Upload Failed</h4>
              <p>${error}</p>
              <button onclick="this.parentElement.style.display='none'">Dismiss</button>
            </div>
          `;
        }
      }
    });

    // Setup drag and drop
    const dropZone = document.getElementById('fit-upload-dropzone');
    if (dropZone) {
      WorkoutUploadManager.setupDragAndDrop(dropZone, uploadManager, {
        allowMultiple: true,
        showProgress: true
      });
      console.log('✅ Drag and drop setup complete');
    }

    console.log('✅ UI integration configured');
  }

  /**
   * Refresh workout list in UI
   */
  static async refreshWorkoutList(userId: string): Promise<void> {
    try {
      const workouts = await WorkoutService.getUserWorkouts(userId, 20);
      
      const listElement = document.getElementById('workout-list');
      if (listElement) {
        listElement.innerHTML = workouts.map(workout => `
          <div class="workout-item ${workout.status}">
            <div class="workout-header">
              <h4>${workout.name}</h4>
              <span class="workout-date">${workout.date}</span>
            </div>
            <div class="workout-details">
              <span class="sport-icon">${this.getSportEmoji(workout.sport)}</span>
              <span class="duration">${workout.actual?.durationMin || workout.planned?.durationMin || '?'}min</span>
              <span class="distance">${(workout.actual?.distanceKm || workout.planned?.distanceKm || 0).toFixed(1)}km</span>
              ${workout.actual?.avgHR ? `<span class="hr">${workout.actual.avgHR} bpm</span>` : ''}
              <span class="status-badge ${workout.status}">${workout.status}</span>
            </div>
          </div>
        `).join('');
      }
      
    } catch (error) {
      console.error('Failed to refresh workout list:', error);
    }
  }

  /**
   * Get emoji for sport type
   */
  static getSportEmoji(sport: string): string {
    const emojiMap: Record<string, string> = {
      'run': '🏃',
      'bike': '🚴',
      'swim': '🏊',
      'strength': '💪',
      'yoga': '🧘',
      'other': '⚽'
    };
    return emojiMap[sport] || '⚽';
  }

  /**
   * Run complete integration example
   */
  static async runCompleteExample(): Promise<void> {
    console.log('🚀 Starting Complete Workout Management Integration Example\n');
    console.log('=' .repeat(60));

    try {
      // Step 1: Plan workouts for the week
      await this.examplePlannedWorkouts();
      console.log('\n' + '='.repeat(60));

      // Step 2: Process FIT file uploads
      await this.exampleFitFileProcessing();
      console.log('\n' + '='.repeat(60));

      // Step 3: Batch processing demo
      await this.exampleBatchProcessing();
      console.log('\n' + '='.repeat(60));

      // Step 4: Analysis and reporting
      await this.exampleWorkoutAnalysis();
      console.log('\n' + '='.repeat(60));

      // Step 5: UI integration
      this.exampleUIIntegration();

      console.log('\n🎉 Complete integration example finished successfully!');
      console.log('\n📚 Key Features Demonstrated:');
      console.log('   ✅ Planned workout creation and management');
      console.log('   ✅ FIT file parsing and processing');
      console.log('   ✅ Intelligent workout matching');  
      console.log('   ✅ Batch processing capabilities');
      console.log('   ✅ Comprehensive workout analysis');
      console.log('   ✅ UI integration with progress tracking');
      console.log('   ✅ Error handling and validation');

    } catch (error) {
      console.error('\n❌ Integration example failed:', error);
      throw error;
    }
  }

  /**
   * Demo for testing the workout service
   */
  static async runTestSuite(): Promise<void> {
    console.log('🧪 Running Workout Service Test Suite\n');
    await WorkoutServiceTests.runAllTests();
  }
}

// Export example functions for use in your app
export const {
  examplePlannedWorkouts,
  exampleFitFileProcessing,
  exampleBatchProcessing,
  exampleWorkoutAnalysis,
  exampleUIIntegration,
  runCompleteExample,
  runTestSuite
} = WorkoutIntegrationExample;

export default WorkoutIntegrationExample;