// Centralized User Profile Management Service
import { User } from 'firebase/auth';
import { UserProfile, HRZoneConfig } from '../types/firebase.types';
import { StravaConnection } from '../types/strava.types';
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
        try {
          this.userProfile = await AuthService.getUserProfile();
        } catch (error) {
          console.warn('Failed to get user profile in UserProfileService, continuing without it:', error);
          this.userProfile = null;
        }
      }

      // Set up auth state listener
      AuthService.addAuthStateListener(async (user) => {
        this.currentUser = user;
        if (user) {
          try {
            this.userProfile = await AuthService.getUserProfile();
          } catch (error) {
            console.warn('Failed to get user profile in auth state listener, continuing without it:', error);
            this.userProfile = null;
          }
        } else {
          this.userProfile = null;
        }
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
    excludedExercises: string[];
    hrZones: HRZoneConfig;
  } {
    const profile = this.userProfile;
    const defaultAge = this.calculateAgeFromEmail() || 30;
    const maxHR = profile?.preferences?.maxHR || this.calculateMaxHR(profile?.preferences?.age || defaultAge);
    
    return {
      age: profile?.preferences?.age || defaultAge,
      fitnessLevel: profile?.preferences?.fitnessLevel || 'intermediate',
      restingHR: profile?.preferences?.restingHR || 60,
      maxHR,
      preferredSports: profile?.preferences?.sports || ['running'],
      goals: profile?.preferences?.goals || ['general_fitness'],
      excludedExercises: profile?.preferences?.excludedExercises || [],
      hrZones: profile?.preferences?.hrZones || this.calculateDefaultHRZones(maxHR)
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

  private calculateDefaultHRZones(maxHR: number): HRZoneConfig {
    // Standard HR zones based on % of max HR
    return {
      zone1: { min: Math.round(maxHR * 0.50), max: Math.round(maxHR * 0.60) }, // 50-60%
      zone2: { min: Math.round(maxHR * 0.60), max: Math.round(maxHR * 0.70) }, // 60-70%
      zone3: { min: Math.round(maxHR * 0.70), max: Math.round(maxHR * 0.80) }, // 70-80%
      zone4: { min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.90) }, // 80-90%
      zone5: { min: Math.round(maxHR * 0.90), max: Math.round(maxHR * 1.00) }  // 90-100%
    };
  }

  // Strava connection management
  public getStravaConnection(): StravaConnection | null {
    return this.userProfile?.stravaConnection || null;
  }

  public async updateStravaConnection(connection: StravaConnection | undefined): Promise<void> {
    await this.updateProfile({ stravaConnection: connection });
  }

  public isStravaConnected(): boolean {
    return this.userProfile?.stravaConnection?.isConnected || false;
  }

  public getStravaAthleteInfo(): {
    athleteId?: number;
    username?: string;
    fullName?: string;
    lastSyncAt?: Date;
  } {
    const connection = this.userProfile?.stravaConnection;
    if (!connection?.isConnected) {
      return {};
    }

    return {
      athleteId: connection.athleteId,
      username: connection.username,
      fullName: connection.firstname && connection.lastname ? 
        `${connection.firstname} ${connection.lastname}` : undefined,
      lastSyncAt: connection.lastSyncAt
    };
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

  public static getStravaConnection(): StravaConnection | null {
    return UserProfileService.getInstance().getStravaConnection();
  }

  public static isStravaConnected(): boolean {
    return UserProfileService.getInstance().isStravaConnected();
  }
}