// Automatic Strava Activity Synchronization Service
// Checks for recent Strava activities and syncs them to Firebase

import { StravaService } from './StravaService';
import { StravaDataMapper } from './StravaDataMapper';
import { FirestoreService } from '../firebase/firestore';
import { UserProfileService } from './UserProfileService';
import { StravaConnection, StravaActivity } from '../types/strava.types';
import { FirebaseActivity } from '../types/firebase.types';

export class StravaAutoSync {
  private static instance: StravaAutoSync;
  private stravaService: StravaService;
  private dataMapper: StravaDataMapper;
  private userProfileService: UserProfileService;
  private isRunning: boolean = false;

  private constructor() {
    this.stravaService = StravaService.getInstance();
    this.dataMapper = StravaDataMapper.getInstance();
    this.userProfileService = UserProfileService.getInstance();
  }

  public static getInstance(): StravaAutoSync {
    if (!StravaAutoSync.instance) {
      StravaAutoSync.instance = new StravaAutoSync();
    }
    return StravaAutoSync.instance;
  }

  /**
   * Main sync method - checks for recent Strava activities and saves new ones
   */
  public async syncRecentActivities(): Promise<{ synced: number; skipped: number; errors: number }> {
    if (this.isRunning) {
      console.log('🔄 Strava sync already running, skipping...');
      return { synced: 0, skipped: 0, errors: 0 };
    }

    this.isRunning = true;
    console.log('🚀 Starting automatic Strava activity sync...');

    try {
      // Check if user has Strava connection
      const stravaConnection = await this.getStravaConnection();
      if (!stravaConnection) {
        console.log('📋 No Strava connection found, skipping sync');
        return { synced: 0, skipped: 0, errors: 0 };
      }

      // Get date range (yesterday and today)
      const { afterTimestamp, beforeTimestamp } = this.getDateRange();
      console.log('📅 Syncing activities from yesterday and today:', {
        after: new Date(afterTimestamp * 1000).toISOString(),
        before: new Date(beforeTimestamp * 1000).toISOString()
      });

      // Fetch recent Strava activities
      const stravaActivities = await this.stravaService.getActivities(stravaConnection, {
        after: afterTimestamp,
        before: beforeTimestamp,
        per_page: 10
      });

      console.log(`📊 Found ${stravaActivities.length} recent Strava activities`);

      if (stravaActivities.length === 0) {
        return { synced: 0, skipped: 0, errors: 0 };
      }

      // Get existing Firebase activities to avoid duplicates
      const existingActivities = await this.getExistingActivities(afterTimestamp, beforeTimestamp);
      const existingStravaIds = new Set(
        existingActivities
          .filter(a => a.stravaActivityId)
          .map(a => a.stravaActivityId!.toString())
      );

      let synced = 0;
      let skipped = 0;
      let errors = 0;

      // Process each Strava activity
      for (const stravaActivity of stravaActivities) {
        try {
          // Skip if already exists in Firebase
          if (existingStravaIds.has(stravaActivity.id.toString())) {
            console.log(`⏭️ Skipping existing activity: ${stravaActivity.name} (ID: ${stravaActivity.id})`);
            skipped++;
            continue;
          }

          // Convert and save to Firebase
          const firebaseActivity = this.dataMapper.mapStravaActivityToFirebase(stravaActivity);
          const activityId = await FirestoreService.addActivity(firebaseActivity);
          
          console.log(`✅ Synced activity: ${stravaActivity.name} (Strava ID: ${stravaActivity.id}, Firebase ID: ${activityId})`);
          synced++;

        } catch (error) {
          console.error(`❌ Error syncing activity ${stravaActivity.name}:`, error);
          errors++;
        }
      }

      console.log(`🎯 Strava sync completed: ${synced} synced, ${skipped} skipped, ${errors} errors`);
      return { synced, skipped, errors };

    } catch (error) {
      console.error('❌ Error during Strava auto-sync:', error);
      return { synced: 0, skipped: 0, errors: 1 };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get user's Strava connection from profile
   */
  private async getStravaConnection(): Promise<StravaConnection | null> {
    try {
      return this.userProfileService.getStravaConnection();
    } catch (error) {
      console.error('Error getting Strava connection:', error);
      return null;
    }
  }

  /**
   * Get timestamp range for yesterday and today
   */
  private getDateRange(): { afterTimestamp: number; beforeTimestamp: number } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      afterTimestamp: Math.floor(yesterday.getTime() / 1000), // Start of yesterday
      beforeTimestamp: Math.floor(tomorrow.getTime() / 1000)  // Start of tomorrow (end of today)
    };
  }

  /**
   * Get existing Firebase activities in date range
   */
  private async getExistingActivities(afterTimestamp: number, beforeTimestamp: number): Promise<FirebaseActivity[]> {
    try {
      const afterDate = new Date(afterTimestamp * 1000);
      const beforeDate = new Date(beforeTimestamp * 1000);
      return await FirestoreService.getActivities(afterDate, beforeDate);
    } catch (error) {
      console.error('Error getting existing activities:', error);
      return [];
    }
  }

  /**
   * Check if sync should run (can be called periodically)
   */
  public shouldRunSync(): boolean {
    return !this.isRunning && this.userProfileService.isAuthenticated();
  }
}