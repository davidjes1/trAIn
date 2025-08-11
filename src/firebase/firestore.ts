// Firestore Database Service
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { AuthService } from './auth';
import {
  FirebaseActivity,
  FirebaseLapData,
  FirebaseTrainingPlan,
  FirebaseTrackedWorkout,
  FirebaseRecoveryMetrics,
  FirebaseAnalytics
} from '../types/firebase.types';

export class FirestoreService {
  private static getUserId(): string {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  /**
   * ACTIVITIES MANAGEMENT
   */
  static async addActivity(activity: Omit<FirebaseActivity, 'id' | 'userId' | 'uploadedAt'>): Promise<string> {
    try {
      const userId = this.getUserId();
      const activityData: Omit<FirebaseActivity, 'id'> = {
        ...activity,
        userId,
        uploadedAt: new Date(),
        processed: true
      };

      const docRef = await addDoc(collection(db, 'users', userId, 'activities'), activityData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding activity:', error);
      throw error;
    }
  }

  static async getActivities(startDate?: Date, endDate?: Date): Promise<FirebaseActivity[]> {
    try {
      const userId = this.getUserId();
      let q = query(
        collection(db, 'users', userId, 'activities'),
        orderBy('date', 'desc')
      );

      if (startDate) {
        q = query(q, where('date', '>=', startDate.toISOString().split('T')[0]));
      }
      if (endDate) {
        q = query(q, where('date', '<=', endDate.toISOString().split('T')[0]));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate()
      })) as FirebaseActivity[];
    } catch (error) {
      console.error('Error getting activities:', error);
      throw error;
    }
  }

  static async updateActivity(id: string, updates: Partial<FirebaseActivity>): Promise<void> {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, 'users', userId, 'activities', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  }

  static async deleteActivity(id: string): Promise<void> {
    try {
      const userId = this.getUserId();
      await deleteDoc(doc(db, 'users', userId, 'activities', id));
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }

  /**
   * LAP DATA MANAGEMENT
   */
  static async addLapData(lapData: Omit<FirebaseLapData, 'id' | 'userId'>[]): Promise<string[]> {
    try {
      const userId = this.getUserId();
      const batch = writeBatch(db);
      const lapIds: string[] = [];

      lapData.forEach(lap => {
        const docRef = doc(collection(db, 'users', userId, 'lapData'));
        batch.set(docRef, { ...lap, userId });
        lapIds.push(docRef.id);
      });

      await batch.commit();
      return lapIds;
    } catch (error) {
      console.error('Error adding lap data:', error);
      throw error;
    }
  }

  static async getLapDataForActivity(activityId: string): Promise<FirebaseLapData[]> {
    try {
      const userId = this.getUserId();
      const q = query(
        collection(db, 'users', userId, 'lapData'),
        where('activityId', '==', activityId),
        orderBy('lapNumber', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseLapData[];
    } catch (error) {
      console.error('Error getting lap data:', error);
      throw error;
    }
  }

  /**
   * TRAINING PLANS MANAGEMENT
   */
  static async addTrainingPlan(plan: Omit<FirebaseTrainingPlan, 'id' | 'userId' | 'generatedAt'>): Promise<string> {
    try {
      const userId = this.getUserId();
      const planData: Omit<FirebaseTrainingPlan, 'id'> = {
        ...plan,
        userId,
        generatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'users', userId, 'trainingPlans'), planData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding training plan:', error);
      throw error;
    }
  }

  static async getTrainingPlans(startDate?: Date, endDate?: Date): Promise<FirebaseTrainingPlan[]> {
    try {
      const userId = this.getUserId();
      let q = query(
        collection(db, 'users', userId, 'trainingPlans'),
        orderBy('date', 'asc')
      );

      if (startDate) {
        q = query(q, where('date', '>=', startDate.toISOString().split('T')[0]));
      }
      if (endDate) {
        q = query(q, where('date', '<=', endDate.toISOString().split('T')[0]));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        generatedAt: doc.data().generatedAt?.toDate()
      })) as FirebaseTrainingPlan[];
    } catch (error) {
      console.error('Error getting training plans:', error);
      throw error;
    }
  }

  static async updateTrainingPlan(id: string, updates: Partial<FirebaseTrainingPlan>): Promise<void> {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, 'users', userId, 'trainingPlans', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating training plan:', error);
      throw error;
    }
  }

  /**
   * TRACKED WORKOUTS MANAGEMENT
   */
  static async addTrackedWorkout(workout: Omit<FirebaseTrackedWorkout, 'id' | 'userId' | 'lastUpdated'>): Promise<string> {
    try {
      const userId = this.getUserId();
      const workoutData: Omit<FirebaseTrackedWorkout, 'id'> = {
        ...workout,
        userId,
        lastUpdated: new Date()
      };

      const docRef = await addDoc(collection(db, 'users', userId, 'trackedWorkouts'), workoutData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding tracked workout:', error);
      throw error;
    }
  }

  static async getTrackedWorkouts(startDate?: Date, endDate?: Date): Promise<FirebaseTrackedWorkout[]> {
    try {
      const userId = this.getUserId();
      let q = query(
        collection(db, 'users', userId, 'trackedWorkouts'),
        orderBy('date', 'asc')
      );

      if (startDate) {
        q = query(q, where('date', '>=', startDate.toISOString().split('T')[0]));
      }
      if (endDate) {
        q = query(q, where('date', '<=', endDate.toISOString().split('T')[0]));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate()
      })) as FirebaseTrackedWorkout[];
    } catch (error) {
      console.error('Error getting tracked workouts:', error);
      throw error;
    }
  }

  static async updateTrackedWorkout(id: string, updates: Partial<FirebaseTrackedWorkout>): Promise<void> {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, 'users', userId, 'trackedWorkouts', id);
      await updateDoc(docRef, { ...updates, lastUpdated: new Date() });
    } catch (error) {
      console.error('Error updating tracked workout:', error);
      throw error;
    }
  }

  /**
   * RECOVERY METRICS MANAGEMENT
   */
  static async addRecoveryMetrics(metrics: Omit<FirebaseRecoveryMetrics, 'userId' | 'recordedAt'>): Promise<void> {
    try {
      const userId = this.getUserId();
      
      // Filter out undefined values to avoid Firestore errors
      const cleanMetrics = Object.fromEntries(
        Object.entries(metrics).filter(([_, value]) => value !== undefined)
      );
      
      const metricsData: any = {
        ...cleanMetrics,
        userId,
        recordedAt: new Date()
      };

      // Use date as document ID for easy retrieval
      await setDoc(doc(db, 'users', userId, 'recoveryMetrics', metrics.date), metricsData);
    } catch (error) {
      console.error('Error adding recovery metrics:', error);
      throw error;
    }
  }

  static async getRecoveryMetrics(startDate?: Date, endDate?: Date): Promise<FirebaseRecoveryMetrics[]> {
    try {
      const userId = this.getUserId();
      let q = query(
        collection(db, 'users', userId, 'recoveryMetrics'),
        orderBy('date', 'desc')
      );

      if (startDate) {
        q = query(q, where('date', '>=', startDate.toISOString().split('T')[0]));
      }
      if (endDate) {
        q = query(q, where('date', '<=', endDate.toISOString().split('T')[0]));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        recordedAt: doc.data().recordedAt?.toDate()
      })) as FirebaseRecoveryMetrics[];
    } catch (error) {
      console.error('Error getting recovery metrics:', error);
      throw error;
    }
  }

  /**
   * ANALYTICS MANAGEMENT  
   */
  static async saveAnalytics(analytics: Omit<FirebaseAnalytics, 'userId' | 'generatedAt'>): Promise<void> {
    try {
      const userId = this.getUserId();
      const analyticsData: FirebaseAnalytics = {
        ...analytics,
        userId,
        generatedAt: new Date()
      };

      // Use period as document ID
      await setDoc(doc(db, 'users', userId, 'analytics', analytics.period), analyticsData);
    } catch (error) {
      console.error('Error saving analytics:', error);
      throw error;
    }
  }

  /**
   * BATCH OPERATIONS
   */
  static async batchUpdateActivities(updates: Array<{ id: string; data: Partial<FirebaseActivity> }>): Promise<void> {
    try {
      const userId = this.getUserId();
      const batch = writeBatch(db);

      updates.forEach(({ id, data }) => {
        const docRef = doc(db, 'users', userId, 'activities', id);
        batch.update(docRef, data);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error batch updating activities:', error);
      throw error;
    }
  }

  /**
   * USER STATS UPDATE
   */
  static async updateUserStats(stats: { totalActivities: number; totalTrainingTime: number; lastActivityDate: string }): Promise<void> {
    try {
      const userId = this.getUserId();
      const profileRef = doc(db, 'users', userId, 'profile', 'data');
      await updateDoc(profileRef, { stats });
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  /**
   * REAL-TIME SYNCHRONIZATION METHODS
   */

  /**
   * Listen to real-time changes in activities
   */
  static subscribeToActivities(
    callback: (activities: FirebaseActivity[]) => void,
    onError?: (error: Error) => void,
    dateRange?: { startDate?: Date; endDate?: Date }
  ): () => void {
    try {
      const userId = this.getUserId();
      const activitiesRef = collection(db, 'users', userId, 'activities');
      
      let q = query(activitiesRef, orderBy('date', 'desc'));
      
      // Add date range filtering if provided
      if (dateRange?.startDate) {
        q = query(q, where('date', '>=', dateRange.startDate.toISOString().split('T')[0]));
      }
      if (dateRange?.endDate) {
        q = query(q, where('date', '<=', dateRange.endDate.toISOString().split('T')[0]));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const activities: FirebaseActivity[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          activities.push({
            id: doc.id,
            ...data,
            uploadedAt: data.uploadedAt.toDate()
          } as FirebaseActivity);
        });
        callback(activities);
      }, (error) => {
        console.error('Error in activities subscription:', error);
        onError?.(error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up activities subscription:', error);
      onError?.(error as Error);
      return () => {}; // Return no-op unsubscribe function
    }
  }

  /**
   * Listen to real-time changes in training plans
   */
  static subscribeToTrainingPlans(
    callback: (plans: FirebaseTrainingPlan[]) => void,
    onError?: (error: Error) => void,
    dateRange?: { startDate?: Date; endDate?: Date }
  ): () => void {
    try {
      const userId = this.getUserId();
      const plansRef = collection(db, 'users', userId, 'trainingPlans');
      
      let q = query(plansRef, orderBy('date', 'asc'));
      
      // Add date range filtering if provided
      if (dateRange?.startDate) {
        q = query(q, where('date', '>=', dateRange.startDate.toISOString().split('T')[0]));
      }
      if (dateRange?.endDate) {
        q = query(q, where('date', '<=', dateRange.endDate.toISOString().split('T')[0]));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const plans: FirebaseTrainingPlan[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          plans.push({
            id: doc.id,
            ...data,
            generatedAt: data.generatedAt.toDate()
          } as FirebaseTrainingPlan);
        });
        callback(plans);
      }, (error) => {
        console.error('Error in training plans subscription:', error);
        onError?.(error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up training plans subscription:', error);
      onError?.(error as Error);
      return () => {}; // Return no-op unsubscribe function
    }
  }

  /**
   * Listen to real-time changes in tracked workouts
   */
  static subscribeToTrackedWorkouts(
    callback: (workouts: FirebaseTrackedWorkout[]) => void,
    onError?: (error: Error) => void,
    dateRange?: { startDate?: Date; endDate?: Date }
  ): () => void {
    try {
      const userId = this.getUserId();
      const workoutsRef = collection(db, 'users', userId, 'trackedWorkouts');
      
      let q = query(workoutsRef, orderBy('date', 'asc'));
      
      // Add date range filtering if provided
      if (dateRange?.startDate) {
        q = query(q, where('date', '>=', dateRange.startDate.toISOString().split('T')[0]));
      }
      if (dateRange?.endDate) {
        q = query(q, where('date', '<=', dateRange.endDate.toISOString().split('T')[0]));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const workouts: FirebaseTrackedWorkout[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          workouts.push({
            id: doc.id,
            ...data,
            lastUpdated: data.lastUpdated.toDate()
          } as FirebaseTrackedWorkout);
        });
        callback(workouts);
      }, (error) => {
        console.error('Error in tracked workouts subscription:', error);
        onError?.(error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up tracked workouts subscription:', error);
      onError?.(error as Error);
      return () => {}; // Return no-op unsubscribe function
    }
  }

  /**
   * Listen to real-time changes in user profile  
   */
  static subscribeToUserProfile(
    callback: (profile: any) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      const userId = this.getUserId();
      const profileRef = doc(db, 'users', userId, 'profile', 'data');

      const unsubscribe = onSnapshot(profileRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const profile = {
            ...data,
            createdAt: data.createdAt.toDate()
          };
          callback(profile);
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error in user profile subscription:', error);
        onError?.(error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up user profile subscription:', error);
      onError?.(error as Error);
      return () => {}; // Return no-op unsubscribe function
    }
  }

  /**
   * Subscribe to multiple data types at once for comprehensive real-time sync
   */
  static subscribeToAllUserData(
    callbacks: {
      onActivitiesChange?: (activities: FirebaseActivity[]) => void;
      onTrainingPlansChange?: (plans: FirebaseTrainingPlan[]) => void;
      onTrackedWorkoutsChange?: (workouts: FirebaseTrackedWorkout[]) => void;
      onProfileChange?: (profile: any) => void;
    },
    onError?: (error: Error) => void,
    dateRange?: { startDate?: Date; endDate?: Date }
  ): () => void {
    const unsubscribers: (() => void)[] = [];

    try {
      // Subscribe to activities
      if (callbacks.onActivitiesChange) {
        const unsubActivities = this.subscribeToActivities(
          callbacks.onActivitiesChange,
          onError,
          dateRange
        );
        unsubscribers.push(unsubActivities);
      }

      // Subscribe to training plans
      if (callbacks.onTrainingPlansChange) {
        const unsubPlans = this.subscribeToTrainingPlans(
          callbacks.onTrainingPlansChange,
          onError,
          dateRange
        );
        unsubscribers.push(unsubPlans);
      }

      // Subscribe to tracked workouts
      if (callbacks.onTrackedWorkoutsChange) {
        const unsubWorkouts = this.subscribeToTrackedWorkouts(
          callbacks.onTrackedWorkoutsChange,
          onError,
          dateRange
        );
        unsubscribers.push(unsubWorkouts);
      }

      // Subscribe to user profile
      if (callbacks.onProfileChange) {
        const unsubProfile = this.subscribeToUserProfile(
          callbacks.onProfileChange,
          onError
        );
        unsubscribers.push(unsubProfile);
      }

      // Return combined unsubscribe function
      return () => {
        unsubscribers.forEach(unsub => unsub());
      };

    } catch (error) {
      console.error('Error setting up comprehensive data subscription:', error);
      onError?.(error as Error);
      return () => {}; // Return no-op unsubscribe function
    }
  }
}