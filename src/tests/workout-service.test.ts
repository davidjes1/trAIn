// Comprehensive Test Suite for WorkoutService
import WorkoutService from '../services/WorkoutService';
import GarminParser from '../utils/garmin-parser';
import {
  CreatePlannedWorkoutInput,
  ParsedFitData,
  Workout,
  SportType
} from '@/core/models';

// Note: These tests are for demonstration. In a real app, you'd use Jest/Mocha
// and mock Firebase instead of using actual Firestore calls.

export class WorkoutServiceTests {
  
  /**
   * Test creating planned workouts
   */
  static async testCreatePlannedWorkout(): Promise<void> {
    console.log('🧪 Testing: Create Planned Workout');

    const testInput: CreatePlannedWorkoutInput = {
      userId: 'test-user-123',
      date: '2024-01-15',
      sport: 'run',
      name: 'Morning Easy Run',
      description: 'Easy-paced recovery run in the park',
      durationMin: 45,
      distanceKm: 7.5,
      targetMetrics: {
        durationMin: 45,
        distanceKm: 7.5,
        expectedAvgHR: 145,
        expectedMaxHR: 160,
        expectedFatigue: 3
      },
      tags: ['easy', 'recovery', 'base-building'],
      expectedFatigue: 3,
      notes: 'Focus on keeping HR in Zone 2'
    };

    try {
      const workout = await WorkoutService.createPlannedWorkout(testInput);
      console.log('✅ Created planned workout:', workout.id);
      console.log(`📋 Details: ${workout.name} - ${workout.sport} - ${workout.date}`);
      return;
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }

  /**
   * Test matching logic with various scenarios
   */
  static async testWorkoutMatching(): Promise<void> {
    console.log('🧪 Testing: Workout Matching Logic');

    const userId = 'test-user-123';

    // Create test planned workouts
    const plannedWorkouts = [
      {
        userId,
        date: '2024-01-15',
        sport: 'run' as SportType,
        name: 'Morning Run',
        durationMin: 45,
        distanceKm: 8.0
      },
      {
        userId,
        date: '2024-01-15',
        sport: 'bike' as SportType,
        name: 'Evening Bike',
        durationMin: 60,
        distanceKm: 25.0
      },
      {
        userId,
        date: '2024-01-16',
        sport: 'run' as SportType,
        name: 'Long Run',
        durationMin: 90,
        distanceKm: 15.0
      }
    ];

    // Create planned workouts in database
    console.log('📝 Creating test planned workouts...');
    for (const planned of plannedWorkouts) {
      await WorkoutService.createPlannedWorkout(planned);
    }

    // Test Case 1: Perfect match
    console.log('\n🎯 Test Case 1: Perfect Match');
    const perfectMatch = GarminParser.createSampleParsedData({
      sport: 'run',
      date: '2024-01-15',
      durationMin: 44, // Very close to planned 45min
      distanceKm: 8.1   // Very close to planned 8.0km
    });

    const matchResult1 = await WorkoutService.matchPlannedWorkout(userId, perfectMatch);
    if (matchResult1) {
      console.log(`✅ Found match with confidence: ${matchResult1.confidence.toFixed(2)}`);
      console.log(`🔍 Match reasons: ${matchResult1.matchReasons.join(', ')}`);
    } else {
      console.log('❌ No match found (unexpected)');
    }

    // Test Case 2: Good match with some differences
    console.log('\n🎯 Test Case 2: Good Match with Differences');
    const goodMatch = GarminParser.createSampleParsedData({
      sport: 'run',
      date: '2024-01-15',
      durationMin: 38,  // 7 minutes shorter
      distanceKm: 7.2   // 0.8km shorter
    });

    const matchResult2 = await WorkoutService.matchPlannedWorkout(userId, goodMatch);
    if (matchResult2) {
      console.log(`✅ Found match with confidence: ${matchResult2.confidence.toFixed(2)}`);
      console.log(`🔍 Match reasons: ${matchResult2.matchReasons.join(', ')}`);
      console.log(`📊 Duration diff: ${matchResult2.differences.durationDiff}min`);
      console.log(`📊 Distance diff: ${matchResult2.differences.distanceDiff?.toFixed(1)}km`);
    } else {
      console.log('❌ No match found');
    }

    // Test Case 3: Wrong sport (should not match)
    console.log('\n🎯 Test Case 3: Wrong Sport');
    const wrongSport = GarminParser.createSampleParsedData({
      sport: 'swim', // Different sport
      date: '2024-01-15',
      durationMin: 45,
      distanceKm: 2.0
    });

    const matchResult3 = await WorkoutService.matchPlannedWorkout(userId, wrongSport);
    if (matchResult3) {
      console.log(`⚠️ Unexpected match found: ${matchResult3.confidence.toFixed(2)}`);
    } else {
      console.log('✅ No match found (correct - wrong sport)');
    }

    // Test Case 4: Wrong date (should not match)
    console.log('\n🎯 Test Case 4: Wrong Date');
    const wrongDate = GarminParser.createSampleParsedData({
      sport: 'run',
      date: '2024-01-20', // Different date
      durationMin: 45,
      distanceKm: 8.0
    });

    const matchResult4 = await WorkoutService.matchPlannedWorkout(userId, wrongDate);
    if (matchResult4) {
      console.log(`⚠️ Unexpected match found: ${matchResult4.confidence.toFixed(2)}`);
    } else {
      console.log('✅ No match found (correct - wrong date)');
    }
  }

  /**
   * Test complete FIT processing workflow
   */
  static async testCompleteWorkflow(): Promise<void> {
    console.log('🧪 Testing: Complete FIT Processing Workflow');

    const userId = 'test-user-workflow';

    // Step 1: Create a planned workout
    console.log('\n📋 Step 1: Creating planned workout');
    const plannedInput: CreatePlannedWorkoutInput = {
      userId,
      date: '2024-01-20',
      sport: 'bike',
      name: 'Saturday Bike Ride',
      durationMin: 90,
      distanceKm: 30.0,
      targetMetrics: {
        expectedAvgHR: 150,
        expectedFatigue: 6
      }
    };

    await WorkoutService.createPlannedWorkout(plannedInput);
    console.log('✅ Planned workout created');

    // Step 2: Simulate FIT file upload and parsing
    console.log('\n📁 Step 2: Processing simulated FIT file');
    const fitData = GarminParser.createSampleParsedData({
      activityId: 'garmin_bike_ride_456',
      sport: 'bike',
      date: '2024-01-20',
      durationMin: 92,    // Close to planned
      distanceKm: 31.2,   // Close to planned
      avgHR: 148,
      maxHR: 165,
      avgPower: 185,
      trainingLoad: 82
    });

    // Step 3: Process the FIT data (match and update)
    console.log('\n⚙️ Step 3: Processing FIT data');
    const result = await WorkoutService.processParsedFitData(userId, fitData);

    if (result.wasMatched) {
      console.log('✅ Successfully matched and updated planned workout!');
      console.log(`🎯 Workout ID: ${result.workout.id}`);
      console.log(`📊 Status: ${result.workout.status}`);
      console.log(`💓 Avg HR: ${result.workout.actual?.avgHR}`);
      console.log(`⚡ Training Load: ${result.workout.actual?.trainingLoad}`);
    } else {
      console.log('ℹ️ Created as unplanned workout');
    }

    // Step 4: Test unplanned workout scenario
    console.log('\n📁 Step 4: Processing unplanned activity');
    const unplannedFitData = GarminParser.createSampleParsedData({
      activityId: 'garmin_unplanned_789',
      sport: 'run',
      date: '2024-01-21', // No planned workout for this date
      durationMin: 30,
      distanceKm: 5.0,
      avgHR: 160
    });

    const unplannedResult = await WorkoutService.processParsedFitData(userId, unplannedFitData);
    
    if (!unplannedResult.wasMatched) {
      console.log('✅ Successfully created unplanned workout!');
      console.log(`🆕 Workout ID: ${unplannedResult.workout.id}`);
      console.log(`📊 Status: ${unplannedResult.workout.status}`);
    } else {
      console.log('⚠️ Unexpected match found');
    }
  }

  /**
   * Test batch processing
   */
  static async testBatchProcessing(): Promise<void> {
    console.log('🧪 Testing: Batch FIT Processing');

    const userId = 'test-user-batch';

    // Create some planned workouts
    const plannedWorkouts = [
      { userId, date: '2024-01-10', sport: 'run' as SportType, name: 'Run 1', durationMin: 30 },
      { userId, date: '2024-01-11', sport: 'bike' as SportType, name: 'Bike 1', durationMin: 60 },
    ];

    for (const planned of plannedWorkouts) {
      await WorkoutService.createPlannedWorkout(planned);
    }

    // Create batch of FIT data (mix of matched and unmatched)
    const fitDataBatch: ParsedFitData[] = [
      GarminParser.createSampleParsedData({
        sport: 'run',
        date: '2024-01-10', // Should match
        durationMin: 32,
        activityId: 'batch_1'
      }),
      GarminParser.createSampleParsedData({
        sport: 'bike',
        date: '2024-01-11', // Should match  
        durationMin: 58,
        activityId: 'batch_2'
      }),
      GarminParser.createSampleParsedData({
        sport: 'swim',
        date: '2024-01-12', // No planned workout - should be unplanned
        durationMin: 45,
        activityId: 'batch_3'
      }),
    ];

    console.log(`\n⚡ Processing batch of ${fitDataBatch.length} activities`);
    const batchResult = await WorkoutService.processBatchFitData(userId, fitDataBatch);

    console.log(`✅ Batch processing complete:`);
    console.log(`   📊 Total processed: ${batchResult.successful.length}`);
    console.log(`   🎯 Matched: ${batchResult.matched}`);
    console.log(`   🆕 Unplanned: ${batchResult.unplanned}`);
    console.log(`   ❌ Failed: ${batchResult.failed.length}`);

    if (batchResult.failed.length > 0) {
      console.log('Failed items:');
      batchResult.failed.forEach(failure => {
        console.log(`   - ${failure.error}`);
      });
    }
  }

  /**
   * Test getting user workouts
   */
  static async testGetUserWorkouts(): Promise<void> {
    console.log('🧪 Testing: Get User Workouts');

    const userId = 'test-user-123';
    
    const workouts = await WorkoutService.getUserWorkouts(userId);
    console.log(`📋 Found ${workouts.length} workouts for user`);
    
    workouts.slice(0, 3).forEach(workout => {
      console.log(`   🏃 ${workout.date}: ${workout.name} (${workout.status})`);
      if (workout.actual) {
        console.log(`      ⏱️  ${workout.actual.durationMin}min | 📏 ${workout.actual.distanceKm.toFixed(1)}km`);
      }
    });
  }

  /**
   * Run all tests in sequence
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting Workout Service Test Suite\n');
    
    try {
      await this.testCreatePlannedWorkout();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.testWorkoutMatching();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.testCompleteWorkflow();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.testBatchProcessing();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await this.testGetUserWorkouts();
      
      console.log('\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      throw error;
    }
  }

  /**
   * Demo data creation for UI testing
   */
  static async createDemoData(userId: string): Promise<void> {
    console.log('🎭 Creating demo data for UI testing');

    // Create a variety of planned workouts
    const plannedWorkouts: CreatePlannedWorkoutInput[] = [
      {
        userId,
        date: '2024-01-15',
        sport: 'run',
        name: 'Easy Monday Run',
        durationMin: 45,
        distanceKm: 7.0,
        tags: ['easy', 'base'],
        expectedFatigue: 3
      },
      {
        userId,
        date: '2024-01-16',
        sport: 'bike',
        name: 'Tuesday Intervals',
        durationMin: 60,
        distanceKm: 20.0,
        tags: ['intervals', 'threshold'],
        expectedFatigue: 7
      },
      {
        userId,
        date: '2024-01-17',
        sport: 'swim',
        name: 'Wednesday Swim',
        durationMin: 45,
        distanceKm: 2.0,
        tags: ['technique', 'endurance'],
        expectedFatigue: 5
      }
    ];

    // Create planned workouts
    for (const planned of plannedWorkouts) {
      await WorkoutService.createPlannedWorkout(planned);
    }

    // Simulate some completed workouts
    const completedActivities = [
      GarminParser.createSampleParsedData({
        sport: 'run',
        date: '2024-01-15',
        durationMin: 47,
        distanceKm: 7.2,
        avgHR: 145
      }),
      GarminParser.createSampleParsedData({
        sport: 'run',
        date: '2024-01-14', // Unplanned
        durationMin: 25,
        distanceKm: 4.0,
        avgHR: 155
      })
    ];

    // Process completed activities
    for (const activity of completedActivities) {
      await WorkoutService.processParsedFitData(userId, activity);
    }

    console.log('✅ Demo data created successfully');
  }
}

// Export individual test functions for modular testing
export const {
  testCreatePlannedWorkout,
  testWorkoutMatching,
  testCompleteWorkflow,
  testBatchProcessing,
  testGetUserWorkouts,
  runAllTests,
  createDemoData
} = WorkoutServiceTests;