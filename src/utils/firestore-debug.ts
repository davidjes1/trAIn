// Firestore Access Debug Utility
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export function debugFirestoreAccess(): void {
  console.log('🔍 Setting up Firestore access debugging...');

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('🔐 User authenticated, testing Firestore access...');
      console.log('User UID:', user.uid);
      console.log('User Email:', user.email);

      // Test 1: Try to access user profile document
      try {
        console.log('📝 Testing user profile access...');
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          console.log('✅ User profile exists:', userDoc.data());
        } else {
          console.log('📄 User profile document does not exist, but no permission error');
        }
      } catch (error) {
        console.error('❌ User profile access failed:', error);
      }

      // Test 2: Try to access workouts collection
      try {
        console.log('💪 Testing workouts collection access...');
        const workoutsRef = collection(db, 'workouts');
        const q = query(
          workoutsRef, 
          where('userId', '==', user.uid),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        console.log(`✅ Workouts query successful. Found ${querySnapshot.size} workouts`);
        querySnapshot.forEach((doc) => {
          console.log('Workout document:', doc.id, doc.data());
        });
      } catch (error) {
        console.error('❌ Workouts collection access failed:', error);
      }

      // Test 3: Try to access training plans
      try {
        console.log('📋 Testing training plans collection access...');
        const plansRef = collection(db, 'trainingPlans');
        const q = query(
          plansRef, 
          where('userId', '==', user.uid),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        console.log(`✅ Training plans query successful. Found ${querySnapshot.size} plans`);
        querySnapshot.forEach((doc) => {
          console.log('Training plan document:', doc.id, doc.data());
        });
      } catch (error) {
        console.error('❌ Training plans collection access failed:', error);
      }

      // Test 4: Try to read a generic document to test overall permissions
      try {
        console.log('🧪 Testing generic collection access...');
        const testRef = collection(db, 'test');
        const testQuery = query(testRef, limit(1));
        const testSnapshot = await getDocs(testQuery);
        
        console.log(`✅ Generic collection access successful. Found ${testSnapshot.size} documents`);
      } catch (error) {
        console.error('❌ Generic collection access failed:', error);
      }

    } else {
      console.log('❌ User not authenticated for Firestore testing');
    }
  });
}

// Auto-run in development
if (import.meta.env.DEV) {
  debugFirestoreAccess();
}

export default debugFirestoreAccess;