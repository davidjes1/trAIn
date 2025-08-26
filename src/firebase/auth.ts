// Firebase Authentication Service
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  UserCredential,
  sendPasswordResetEmail,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile, UserPreferences } from '../types/firebase.types';

export class AuthService {
  private static currentUser: User | null = null;
  private static authStateListeners: ((user: User | null) => void)[] = [];

  /**
   * Initialize authentication state listener
   * Wait for Firebase to fully restore auth state before resolving
   */
  static initialize(): Promise<User | null> {
    return new Promise((resolve) => {
      // Add a small delay to allow Firebase to restore auth state
      let initialCheckComplete = false;
      
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('🔐 Auth state changed during initialization:', { 
          hasUser: !!user, 
          userId: user?.uid,
          initialCheck: !initialCheckComplete 
        });
        
        this.currentUser = user;
        this.authStateListeners.forEach(listener => listener(user));
        
        if (!initialCheckComplete) {
          initialCheckComplete = true;
          // Don't unsubscribe immediately - keep listening for state changes
          resolve(user);
        }
      });
      
      // Keep the unsubscribe function for later cleanup if needed
      (this as any).authUnsubscribe = unsubscribe;
    });
  }

  /**
   * Register a new user
   */
  static async register(
    email: string, 
    password: string, 
    displayName?: string
  ): Promise<{ user: User; profile: UserProfile }> {
    try {
      const credential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // Update display name if provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName || null,
        createdAt: new Date(),
        preferences: this.getDefaultPreferences(),
        stats: {
          totalActivities: 0,
          totalTrainingTime: 0,
          lastActivityDate: null
        }
      };

      await setDoc(doc(db, 'users', user.uid, 'profile', 'data'), userProfile);

      this.currentUser = user;
      this.notifyAuthStateListeners(user);

      return { user, profile: userProfile };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Sign in existing user
   */
  static async login(email: string, password: string): Promise<User> {
    try {
      const credential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      this.currentUser = user;
      this.notifyAuthStateListeners(user);

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.notifyAuthStateListeners(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current user ID
   */
  static getCurrentUserId(): string | null {
    return this.currentUser?.uid || null;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get user profile from Firestore
   */
  static async getUserProfile(uid?: string): Promise<UserProfile | null> {
    try {
      const userId = uid || this.currentUser?.uid;
      if (!userId) return null;

      const docRef = doc(db, 'users', userId, 'profile', 'data');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate()
        } as UserProfile;
      }

      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }


  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async changePassword(newPassword: string): Promise<void> {
    try {
      if (!this.currentUser) throw new Error('No authenticated user');
      await updatePassword(this.currentUser, newPassword);
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Add authentication state listener
   */
  static addAuthStateListener(listener: (user: User | null) => void): () => void {
    this.authStateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get default user preferences
   */
  private static getDefaultPreferences(): UserPreferences {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      units: 'metric',
      hrZones: {
        zone1: { min: 0, max: 142 },      // 50-60% of max HR (190)
        zone2: { min: 142, max: 152 },    // 60-70% of max HR
        zone3: { min: 152, max: 161 },    // 70-80% of max HR  
        zone4: { min: 161, max: 171 },    // 80-90% of max HR
        zone5: { min: 171, max: 190 }     // 90-100% of max HR
      },
      fitnessLevel: 'intermediate',
      restingHR: 60,
      maxHR: 190,
      age: 35,
      sports: ['running', 'cycling'],
      goals: ['fitness', 'endurance']
    };
  }

  /**
   * Notify all auth state listeners
   */
  private static notifyAuthStateListeners(user: User | null): void {
    this.authStateListeners.forEach(listener => listener(user));
  }

  /**
   * Update user profile data
   */
  static async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      const userDoc = doc(db, 'users', this.currentUser.uid);
      const currentProfile = await this.getUserProfile();
      
      if (!currentProfile) {
        throw new Error('No existing profile found');
      }

      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...updates
      };

      await setDoc(userDoc, updatedProfile, { merge: true });
      return updatedProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user ID token for API calls
   */
  static async getIdToken(): Promise<string | null> {
    try {
      if (!this.currentUser) return null;
      return await this.currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }
}