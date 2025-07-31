// Firestore Database Service
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
  QuerySnapshot,
  DocumentData,
  serverTimestamp
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
      const metricsData: FirebaseRecoveryMetrics = {
        ...metrics,
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
   * REAL-TIME LISTENERS
   */
  static subscribeToActivities(
    callback: (activities: FirebaseActivity[]) => void,
    startDate?: Date,
    endDate?: Date
  ): () => void {
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

      return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
        const activities = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          uploadedAt: doc.data().uploadedAt?.toDate()
        })) as FirebaseActivity[];
        callback(activities);
      });
    } catch (error) {
      console.error('Error subscribing to activities:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  static subscribeToTrackedWorkouts(
    callback: (workouts: FirebaseTrackedWorkout[]) => void,
    startDate?: Date,
    endDate?: Date
  ): () => void {
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

      return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
        const workouts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastUpdated: doc.data().lastUpdated?.toDate()
        })) as FirebaseTrackedWorkout[];
        callback(workouts);
      });
    } catch (error) {
      console.error('Error subscribing to tracked workouts:', error);
      return () => {}; // Return empty unsubscribe function
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
}