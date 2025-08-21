// Quick test script to check Firebase workouts data
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

// Firebase config - should match your project
const firebaseConfig = {
  apiKey: "AIzaSyDlrFoJq3SHYVCdMGQfgJmVNYh6fYzx7sg",
  authDomain: "train-e89bb.firebaseapp.com",
  projectId: "train-e89bb",
  storageBucket: "train-e89bb.firebasestorage.app",
  messagingSenderId: "747695006749",
  appId: "1:747695006749:web:7e2a2b3c8f31b2e8b2f5b3",
  measurementId: "G-E5WNHQC1QL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRecentWorkouts() {
  try {
    console.log('🔍 Checking Firebase for workout data...\n');
    
    // Query all workouts, ordered by date (most recent first)
    const workoutsRef = collection(db, 'workouts');
    const q = query(
      workoutsRef,
      orderBy('date', 'desc'),
      limit(10) // Get most recent 10 workouts
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('📭 No workouts found in Firebase database');
      return;
    }

    console.log(`📊 Found ${querySnapshot.size} recent workouts:\n`);
    
    querySnapshot.forEach((doc, index) => {
      const data = doc.data();
      
      console.log(`${index + 1}. Workout ID: ${data.id}`);
      console.log(`   User: ${data.userId}`);
      console.log(`   Date: ${data.date}`);
      console.log(`   Sport: ${data.sport}`);
      console.log(`   Name: ${data.name}`);
      console.log(`   Status: ${data.status}`);
      
      if (data.actual) {
        console.log(`   ✅ Has actual data:`);
        console.log(`      Duration: ${data.actual.durationMin} min`);
        console.log(`      Distance: ${data.actual.distanceKm} km`);
        console.log(`      Avg HR: ${data.actual.avgHR || 'N/A'} bpm`);
        console.log(`      Training Load: ${data.actual.trainingLoad || 'N/A'}`);
        console.log(`      Processed: ${data.actual.processedAt ? new Date(data.actual.processedAt.seconds * 1000).toLocaleString() : 'N/A'}`);
        
        if (data.actual.zones && data.actual.zones.length > 0) {
          console.log(`      HR Zones: ${data.actual.zones.length} zones`);
          data.actual.zones.forEach((zone, i) => {
            console.log(`         Z${i + 1}: ${Math.round(zone.timeMin || zone.minutes || 0)} min`);
          });
        }
      } else {
        console.log(`   ⏳ Planned workout only (no actual data)`);
        if (data.planned) {
          console.log(`      Planned Duration: ${data.planned.durationMin || 'N/A'} min`);
          console.log(`      Planned Distance: ${data.planned.distanceKm || 'N/A'} km`);
        }
      }
      
      console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}`);
      console.log(`   Updated: ${data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}`);
      console.log('   ---');
    });

    // Find the most recent completed/unplanned workout (one with actual data)
    console.log('\n🎯 Most Recent Completed Workout:');
    const completedWorkout = querySnapshot.docs.find(doc => {
      const data = doc.data();
      return (data.status === 'completed' || data.status === 'unplanned') && data.actual;
    });

    if (completedWorkout) {
      const data = completedWorkout.data();
      console.log(`   ✅ Found: ${data.name} (${data.date})`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Sport: ${data.sport}`);
      console.log('   Actual Metrics:');
      console.log(`      Duration: ${data.actual.durationMin} min`);
      console.log(`      Distance: ${data.actual.distanceKm} km`);
      console.log(`      Avg HR: ${data.actual.avgHR || 'N/A'}`);
      console.log(`      Max HR: ${data.actual.maxHR || 'N/A'}`);
      console.log(`      Training Load: ${data.actual.trainingLoad || 'N/A'}`);
      console.log(`      Data Source: ${data.actual.dataSource || 'N/A'}`);
      
      if (data.planned && data.actual) {
        console.log('   📊 Planned vs Actual:');
        if (data.planned.durationMin && data.actual.durationMin) {
          const durationDiff = ((data.actual.durationMin - data.planned.durationMin) / data.planned.durationMin * 100);
          console.log(`      Duration: Planned ${data.planned.durationMin}min → Actual ${data.actual.durationMin}min (${durationDiff > 0 ? '+' : ''}${durationDiff.toFixed(1)}%)`);
        }
        if (data.planned.distanceKm && data.actual.distanceKm) {
          const distanceDiff = ((data.actual.distanceKm - data.planned.distanceKm) / data.planned.distanceKm * 100);
          console.log(`      Distance: Planned ${data.planned.distanceKm}km → Actual ${data.actual.distanceKm}km (${distanceDiff > 0 ? '+' : ''}${distanceDiff.toFixed(1)}%)`);
        }
      }
    } else {
      console.log('   ❌ No completed workouts with actual data found');
    }

  } catch (error) {
    console.error('❌ Error checking workouts:', error);
  }
}

// Run the check
checkRecentWorkouts();