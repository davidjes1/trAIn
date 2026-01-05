// Firebase Data Test Utility
import WorkoutService from '../services/WorkoutService';
import { Workout } from '@/core/models';

export async function testFirebaseWorkoutData(userId: string): Promise<void> {
  try {
    console.log('🔍 Testing Firebase workout data for user:', userId);
    
    // Get all user workouts
    const allWorkouts = await WorkoutService.getUserWorkouts(userId, 20);
    console.log(`📊 Found ${allWorkouts.length} total workouts`);
    
    if (allWorkouts.length === 0) {
      console.log('📭 No workouts found. User needs to upload some FIT files first.');
      return;
    }
    
    // Filter for completed/unplanned workouts (those with actual data)
    const completedWorkouts = allWorkouts.filter(w => 
      (w.status === 'completed' || w.status === 'unplanned') && w.actual
    );
    
    console.log(`✅ Found ${completedWorkouts.length} completed workouts with actual data`);
    
    if (completedWorkouts.length === 0) {
      console.log('⏳ All workouts are planned only. User needs to upload actual workout data.');
      
      // Show planned workouts for reference
      console.log('\n📋 Planned workouts:');
      allWorkouts.slice(0, 5).forEach((workout, index) => {
        console.log(`${index + 1}. ${workout.name} (${workout.date}) - ${workout.status}`);
        if (workout.planned) {
          console.log(`   Planned: ${workout.planned.durationMin || 'N/A'}min, ${workout.planned.distanceKm || 'N/A'}km`);
        }
      });
      return;
    }
    
    // Sort by processed date (most recent first)
    completedWorkouts.sort((a, b) => {
      const dateA = a.actual?.processedAt || a.updatedAt;
      const dateB = b.actual?.processedAt || b.updatedAt;
      return dateB.getTime() - dateA.getTime();
    });
    
    const recentWorkout = completedWorkouts[0];
    console.log('\n🎯 Most Recent Completed Workout:');
    console.log(`   Name: ${recentWorkout.name}`);
    console.log(`   Date: ${recentWorkout.date}`);
    console.log(`   Sport: ${recentWorkout.sport}`);
    console.log(`   Status: ${recentWorkout.status}`);
    
    const actual = recentWorkout.actual!;
    console.log('\n📊 Actual Performance Data:');
    console.log(`   Duration: ${actual.durationMin} minutes`);
    console.log(`   Distance: ${actual.distanceKm} km`);
    console.log(`   Avg HR: ${actual.avgHR || 'N/A'} bpm`);
    console.log(`   Max HR: ${actual.maxHR || 'N/A'} bpm`);
    console.log(`   Avg Pace: ${actual.avgPace || 'N/A'}`);
    console.log(`   Avg Power: ${actual.avgPower || 'N/A'} W`);
    console.log(`   Training Load: ${actual.trainingLoad || 'N/A'}`);
    console.log(`   Calories: ${actual.calories || 'N/A'}`);
    console.log(`   Avg Cadence: ${actual.avgCadence || 'N/A'} rpm`);
    console.log(`   Elevation Gain: ${actual.ascentM || 'N/A'} m`);
    console.log(`   Elevation Loss: ${actual.descentM || 'N/A'} m`);
    console.log(`   Data Source: ${actual.dataSource}`);
    console.log(`   Processed: ${actual.processedAt.toLocaleString()}`);
    
    // HR Zones
    if (actual.zones && actual.zones.length > 0) {
      console.log('\n❤️ Heart Rate Zones:');
      actual.zones.forEach((zone, index) => {
        const timeMin = zone.timeMin || zone.minutes || 0;
        const percentage = zone.percentage || Math.round((timeMin / actual.durationMin) * 100);
        console.log(`   Z${index + 1}: ${Math.round(timeMin)} min (${percentage}%)`);
      });
    } else {
      console.log('\n❤️ Heart Rate Zones: Not available');
    }
    
    // Planned vs Actual Comparison
    if (recentWorkout.planned && actual) {
      console.log('\n⚖️ Planned vs Actual Comparison:');
      
      if (recentWorkout.planned.durationMin && actual.durationMin) {
        const durationDiff = ((actual.durationMin - recentWorkout.planned.durationMin) / recentWorkout.planned.durationMin * 100);
        console.log(`   Duration: ${recentWorkout.planned.durationMin}min → ${actual.durationMin}min (${durationDiff > 0 ? '+' : ''}${durationDiff.toFixed(1)}%)`);
      }
      
      if (recentWorkout.planned.distanceKm && actual.distanceKm) {
        const distanceDiff = ((actual.distanceKm - recentWorkout.planned.distanceKm) / recentWorkout.planned.distanceKm * 100);
        console.log(`   Distance: ${recentWorkout.planned.distanceKm}km → ${actual.distanceKm}km (${distanceDiff > 0 ? '+' : ''}${distanceDiff.toFixed(1)}%)`);
      }
    } else {
      console.log('\n⚖️ No planned workout to compare against (unplanned activity)');
    }
    
    console.log('\n✅ Firebase data test completed successfully!');
    
    // Verify the data structure matches what RecentWorkoutDisplay expects
    console.log('\n🔧 Data Structure Validation:');
    console.log(`   ✓ Has ID: ${!!recentWorkout.id}`);
    console.log(`   ✓ Has userId: ${!!recentWorkout.userId}`);
    console.log(`   ✓ Has date: ${!!recentWorkout.date}`);
    console.log(`   ✓ Has sport: ${!!recentWorkout.sport}`);
    console.log(`   ✓ Has name: ${!!recentWorkout.name}`);
    console.log(`   ✓ Has status: ${!!recentWorkout.status}`);
    console.log(`   ✓ Has actual data: ${!!recentWorkout.actual}`);
    console.log(`   ✓ Has processedAt: ${!!(recentWorkout.actual?.processedAt)}`);
    console.log(`   ✓ Has zones array: ${!!(recentWorkout.actual?.zones)}`);
    console.log(`   ✓ Has core metrics: ${!!(actual.durationMin && actual.distanceKm)}`);
    
  } catch (error) {
    console.error('❌ Error testing Firebase data:', error);
  }
}

export default testFirebaseWorkoutData;