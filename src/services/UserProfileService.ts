// Centralized User Profile Management Service
import { User } from 'firebase/auth';
import { UserProfile } from '../types/firebase.types';
import { AuthService } from '../firebase/auth';

export class UserProfileService {
  private static instance: UserProfileService;
  private currentUser: User | null = null;
  private userProfile: UserProfile | null = null;
  private listeners: Array<(user: User | null, profile: UserProfile | null) => void> = [];
  private isInitialized: boolean = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize current user from AuthService
      this.currentUser = await AuthService.initialize();
      
      if (this.currentUser) {
        this.userProfile = await AuthService.getUserProfile();
      }

      // Set up auth state listener
      AuthService.addAuthStateListener(async (user) => {
        this.currentUser = user;
        this.userProfile = user ? await AuthService.getUserProfile() : null;
        this.notifyListeners();
      });

      this.isInitialized = true;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to initialize UserProfileService:', error);
    }
  }

  // Public API for getting current state
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Enhanced profile data access with defaults
  public getDisplayName(): string {
    return this.userProfile?.displayName || this.currentUser?.email || 'User';
  }

  public getEmail(): string {
    return this.currentUser?.email || '';
  }

  public getUserId(): string {
    return this.currentUser?.uid || '';
  }

  public getJoinDate(): string {
    return this.currentUser?.metadata?.creationTime 
      ? new Date(this.currentUser.metadata.creationTime).toLocaleDateString()
      : 'Unknown';
  }

  // Training-specific profile data
  public getTrainingProfile(): {
    age: number;
    fitnessLevel: string;
    restingHR: number;
    maxHR: number;
    preferredSports: string[];
    goals: string[];
  } {
    const profile = this.userProfile;
    const defaultAge = this.calculateAgeFromEmail() || 30;
    
    return {
      age: profile?.preferences?.age || defaultAge,
      fitnessLevel: profile?.preferences?.fitnessLevel || 'intermediate',
      restingHR: profile?.preferences?.restingHR || 60,
      maxHR: profile?.preferences?.maxHR || this.calculateMaxHR(profile?.preferences?.age || defaultAge),
      preferredSports: profile?.preferences?.sports || ['running'],
      goals: profile?.preferences?.goals || ['general_fitness']
    };
  }

  // Activity statistics from profile
  public getActivityStats(): {
    totalActivities: number;
    totalTrainingTime: number;
    lastActivityDate: string | null;
  } {
    return {
      totalActivities: this.userProfile?.stats?.totalActivities || 0,
      totalTrainingTime: this.userProfile?.stats?.totalTrainingTime || 0,
      lastActivityDate: this.userProfile?.stats?.lastActivityDate || null
    };
  }

  // Subscribe to profile changes
  public addListener(callback: (user: User | null, profile: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    
    // Immediately call with current state if initialized
    if (this.isInitialized) {
      callback(this.currentUser, this.userProfile);
    }

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Update profile data
  public async updateProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No authenticated user to update profile for');
    }

    try {
      // Update in Firebase
      await AuthService.updateUserProfile(updates);
      
      // Update local cache
      if (this.userProfile) {
        this.userProfile = { ...this.userProfile, ...updates };
      } else {
        this.userProfile = await AuthService.getUserProfile();
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  // Update activity stats (called by DashboardService after activity changes)
  public async updateActivityStats(stats: {
    totalActivities?: number;
    totalTrainingTime?: number;
    lastActivityDate?: string;
  }): Promise<void> {
    if (!this.userProfile) return;

    const updatedStats = {
      ...this.userProfile.stats,
      ...stats
    };

    await this.updateProfile({ stats: updatedStats });
  }

  // Logout
  public async logout(): Promise<void> {
    try {
      await AuthService.logout();
      this.currentUser = null;
      this.userProfile = null;
      this.notifyListeners();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  // Private helper methods
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentUser, this.userProfile);
      } catch (error) {
        console.error('Error in profile listener:', error);
      }
    });
  }

  private calculateAgeFromEmail(): number | null {
    // Try to extract birth year from email if it contains digits
    const email = this.currentUser?.email || '';
    const yearMatch = email.match(/(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 1950 && year <= new Date().getFullYear() - 13) {
        return new Date().getFullYear() - year;
      }
    }
    return null;
  }

  private calculateMaxHR(age: number): number {
    // Tanaka formula: 208 - (0.7 × age)
    return Math.round(208 - (0.7 * age));
  }

  // Static convenience methods
  public static getCurrentUser(): User | null {
    return UserProfileService.getInstance().getCurrentUser();
  }

  public static getUserProfile(): UserProfile | null {
    return UserProfileService.getInstance().getUserProfile();
  }

  public static isAuthenticated(): boolean {
    return UserProfileService.getInstance().isAuthenticated();
  }

  public static getTrainingProfile() {
    return UserProfileService.getInstance().getTrainingProfile();
  }
}