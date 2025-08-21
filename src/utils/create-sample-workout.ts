// Create Sample Workout Data for Testing
import WorkoutService from '../services/WorkoutService';
import { CreatePlannedWorkoutInput, Workout } from '../types/workout.types';
import { AuthService } from '../firebase/auth';

export async function createSampleWorkoutData(): Promise<void> {
  const userId = AuthService.getCurrentUserId();
  if (!userId) {
    console.error('❌ User not authenticated, cannot create sample data');
    return;
  }

  console.log('🏗️ Creating sample workout data...');

  try {
    // Create a sample completed workout with actual data
    const sampleParsedData = {
      activityId: 'sample-activity-12345',
      sport: 'run' as const,
      date: new Date().toISOString().split('T')[0], // Today
      startTime: new Date(),
      durationMin: 45,
      distanceKm: 8.5,
      avgHR: 155,
      maxHR: 175,
      avgPace: '5:18',
      avgPower: undefined,
      maxPower: undefined,
      ascentM: 120,
      descentM: 115,
      calories: 450,
      avgCadence: 170,
      avgSpeed: 11.3,
      zones: [
        { zone: 1, minutes: 5, timeMin: 5 },
        { zone: 2, minutes: 15, timeMin: 15 },
        { zone: 3, minutes: 18, timeMin: 18 },
        { zone: 4, minutes: 6, timeMin: 6 },
        { zone: 5, minutes: 1, timeMin: 1 }
      ],
      trainingLoad: 85,
      rawData: {
        sample: true,
        created: new Date().toISOString()
      }
    };

    // Create the unplanned workout (simulating imported FIT data)
    const sampleWorkout = await WorkoutService.handleUnplannedWorkout(userId, sampleParsedData);
    
    console.log('✅ Created sample workout:', sampleWorkout);
    console.log('🎯 Workout details:');
    console.log(`   Name: ${sampleWorkout.name}`);
    console.log(`   Date: ${sampleWorkout.date}`);
    console.log(`   Sport: ${sampleWorkout.sport}`);
    console.log(`   Duration: ${sampleWorkout.actual?.durationMin} min`);
    console.log(`   Distance: ${sampleWorkout.actual?.distanceKm} km`);
    console.log(`   Avg HR: ${sampleWorkout.actual?.avgHR} bpm`);
    console.log(`   Training Load: ${sampleWorkout.actual?.trainingLoad}`);

    // Dispatch event to refresh components
    document.dispatchEvent(new CustomEvent('workouts-updated'));

    console.log('🔄 Components should refresh automatically with new data');

  } catch (error) {
    console.error('❌ Failed to create sample workout:', error);
  }
}

// Add a global function for easy testing from console
if (import.meta.env.DEV) {
  (window as any).createSampleWorkout = createSampleWorkoutData;
  console.log('🛠️ Development helper: Run createSampleWorkout() in console to create test data');
}

export default createSampleWorkoutData;