// Unified Workout Management Service for trAIn
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Workout,
  CreatePlannedWorkoutInput,
  ParsedFitData,
  WorkoutMatchResult,
  ActualWorkout,
  SportType,
  WorkoutBatchResult,
  HRZone
} from '@/core/models';
import { v4 as uuidv4 } from 'uuid';

export class WorkoutService {
  private static readonly COLLECTION_NAME = 'workouts';
  
  /**
   * Create a new planned workout
   */
  static async createPlannedWorkout(input: CreatePlannedWorkoutInput): Promise<Workout> {
    try {
      const workoutId = uuidv4();
      const now = new Date();
      
      const workout: Workout = {
        id: workoutId,
        userId: input.userId,
        date: input.date,
        sport: input.sport,
        name: input.name,
        description: input.description,
        status: 'planned',
        planned: {
          durationMin: input.durationMin,
          distanceKm: input.distanceKm,
          targetMetrics: input.targetMetrics,
          segments: input.segments,
          tags: input.tags,
          expectedFatigue: input.expectedFatigue,
          notes: input.notes
        },
        location: input.location,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...workout,
        createdAt: Timestamp.fromDate(workout.createdAt),
        updatedAt: Timestamp.fromDate(workout.updatedAt)
      });

      console.log(`✅ Created planned workout with ID: ${docRef.id}`);
      return workout;
      
    } catch (error) {
      console.error('❌ Error creating planned workout:', error);
      throw new Error(`Failed to create planned workout: ${error}`);
    }
  }

  /**
   * Find the best matching planned workout for parsed FIT data
   */
  static async matchPlannedWorkout(
    userId: string, 
    parsedData: ParsedFitData
  ): Promise<WorkoutMatchResult | null> {
    try {
      console.log(`🔍 Matching workout for user ${userId} on ${parsedData.date}`);
      
      // Query for planned workouts on the same date
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('date', '==', parsedData.date),
        where('status', '==', 'planned')
      );

      const querySnapshot = await getDocs(q);
      const candidates: Workout[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        candidates.push({
          ...data,
          id: data.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          actual: data.actual ? {
            ...data.actual,
            processedAt: data.actual.processedAt?.toDate(),
            zones: data.actual.zones || []
          } : undefined
        } as Workout);
      });

      if (candidates.length === 0) {
        console.log('🔍 No planned workouts found for matching');
        return null;
      }

      console.log(`🔍 Found ${candidates.length} planned workout candidates`);

      // Score each candidate
      const matches: WorkoutMatchResult[] = candidates.map(workout => 
        this.scoreWorkoutMatch(workout, parsedData)
      );

      // Sort by confidence score (highest first)
      matches.sort((a, b) => b.confidence - a.confidence);
      
      const bestMatch = matches[0];
      
      // Only return match if confidence is above threshold (0.5)
      if (bestMatch.confidence >= 0.5) {
        console.log(`✅ Best match found with confidence ${bestMatch.confidence.toFixed(2)}`);
        return bestMatch;
      }

      console.log(`⚠️ No confident match found. Best confidence: ${bestMatch.confidence.toFixed(2)}`);
      return null;
      
    } catch (error) {
      console.error('❌ Error matching planned workout:', error);
      throw new Error(`Failed to match planned workout: ${error}`);
    }
  }

  /**
   * Score a workout match based on multiple criteria
   */
  private static scoreWorkoutMatch(
    plannedWorkout: Workout, 
    parsedData: ParsedFitData
  ): WorkoutMatchResult {
    let score = 0;
    let maxScore = 0;
    const matchReasons: string[] = [];
    const differences = {
      sportMatch: false,
      dateMatch: false,
      durationDiff: undefined as number | undefined,
      distanceDiff: undefined as number | undefined
    };

    // Sport match (essential - 40% of score)
    maxScore += 40;
    if (plannedWorkout.sport === parsedData.sport) {
      score += 40;
      differences.sportMatch = true;
      matchReasons.push('Sport matches');
    }

    // Date match (already filtered, but verify - 20% of score)
    maxScore += 20;
    if (plannedWorkout.date === parsedData.date) {
      score += 20;
      differences.dateMatch = true;
      matchReasons.push('Date matches');
    }

    // Duration match (20% of score)
    maxScore += 20;
    if (plannedWorkout.planned?.durationMin && parsedData.durationMin) {
      const durationDiff = Math.abs(plannedWorkout.planned.durationMin - parsedData.durationMin);
      differences.durationDiff = durationDiff;
      
      if (durationDiff <= 5) { // Within 5 minutes
        score += 20;
        matchReasons.push('Duration within 5 minutes');
      } else if (durationDiff <= 15) { // Within 15 minutes
        score += 15;
        matchReasons.push('Duration within 15 minutes');
      } else if (durationDiff <= 30) { // Within 30 minutes
        score += 10;
        matchReasons.push('Duration within 30 minutes');
      } else {
        matchReasons.push(`Duration differs by ${durationDiff} minutes`);
      }
    }

    // Distance match (20% of score)
    maxScore += 20;
    if (plannedWorkout.planned?.distanceKm && parsedData.distanceKm) {
      const distanceDiff = Math.abs(plannedWorkout.planned.distanceKm - parsedData.distanceKm);
      differences.distanceDiff = distanceDiff;
      
      if (distanceDiff <= 0.5) { // Within 500m
        score += 20;
        matchReasons.push('Distance within 500m');
      } else if (distanceDiff <= 1.0) { // Within 1km
        score += 15;
        matchReasons.push('Distance within 1km');
      } else if (distanceDiff <= 2.0) { // Within 2km
        score += 10;
        matchReasons.push('Distance within 2km');
      } else {
        matchReasons.push(`Distance differs by ${distanceDiff.toFixed(1)}km`);
      }
    }

    const confidence = maxScore > 0 ? score / maxScore : 0;

    return {
      workout: plannedWorkout,
      confidence,
      matchReasons,
      differences
    };
  }

  /**
   * Update a planned workout with actual results
   */
  static async updateWorkoutWithActual(
    workoutId: string, 
    parsedData: ParsedFitData
  ): Promise<Workout> {
    try {
      console.log(`🔄 Updating workout ${workoutId} with actual data`);

      const actualWorkout: ActualWorkout = {
        durationMin: parsedData.durationMin,
        distanceKm: parsedData.distanceKm,
        avgHR: parsedData.avgHR,
        maxHR: parsedData.maxHR,
        avgPace: parsedData.avgPace,
        avgPower: parsedData.avgPower,
        maxPower: parsedData.maxPower,
        trainingLoad: parsedData.trainingLoad,
        ascentM: parsedData.ascentM,
        descentM: parsedData.descentM,
        zones: parsedData.zones,
        calories: parsedData.calories,
        avgCadence: parsedData.avgCadence,
        avgSpeed: parsedData.avgSpeed,
        rawData: parsedData.rawData,
        processedAt: new Date(),
        dataSource: 'garmin_fit'
      };

      const updateData = {
        status: 'completed' as const,
        matchedActivityId: parsedData.activityId,
        actual: {
          ...actualWorkout,
          processedAt: Timestamp.fromDate(actualWorkout.processedAt)
        },
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Find the document by workout ID
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('id', '==', workoutId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`Workout with ID ${workoutId} not found`);
      }

      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, updateData);

      // Get the updated workout
      const updatedDoc = await getDoc(docRef);
      const updatedData = updatedDoc.data();
      
      const updatedWorkout: Workout = {
        ...updatedData,
        id: updatedData!.id,
        createdAt: updatedData!.createdAt.toDate(),
        updatedAt: updatedData!.updatedAt.toDate(),
        actual: {
          ...updatedData!.actual,
          processedAt: updatedData!.actual.processedAt.toDate()
        }
      } as Workout;

      console.log(`✅ Updated workout ${workoutId} with actual data`);
      return updatedWorkout;
      
    } catch (error) {
      console.error('❌ Error updating workout with actual data:', error);
      throw new Error(`Failed to update workout: ${error}`);
    }
  }

  /**
   * Handle an unplanned workout (no matching planned workout found)
   */
  static async handleUnplannedWorkout(
    userId: string, 
    parsedData: ParsedFitData
  ): Promise<Workout> {
    try {
      console.log(`➕ Creating unplanned workout for user ${userId}`);

      const workoutId = uuidv4();
      const now = new Date();

      const actualWorkout: ActualWorkout = {
        durationMin: parsedData.durationMin,
        distanceKm: parsedData.distanceKm,
        avgHR: parsedData.avgHR,
        maxHR: parsedData.maxHR,
        avgPace: parsedData.avgPace,
        avgPower: parsedData.avgPower,
        maxPower: parsedData.maxPower,
        trainingLoad: parsedData.trainingLoad,
        ascentM: parsedData.ascentM,
        descentM: parsedData.descentM,
        zones: parsedData.zones,
        calories: parsedData.calories,
        avgCadence: parsedData.avgCadence,
        avgSpeed: parsedData.avgSpeed,
        rawData: parsedData.rawData,
        processedAt: now,
        dataSource: 'garmin_fit'
      };

      const workout: Workout = {
        id: workoutId,
        userId,
        date: parsedData.date,
        sport: parsedData.sport,
        name: `Unplanned ${parsedData.sport} - ${parsedData.date}`,
        description: `Imported from Garmin FIT file`,
        status: 'unplanned',
        matchedActivityId: parsedData.activityId,
        actual: actualWorkout,
        createdAt: now,
        updatedAt: now
      };

      await addDoc(collection(db, this.COLLECTION_NAME), {
        ...workout,
        actual: {
          ...actualWorkout,
          processedAt: Timestamp.fromDate(actualWorkout.processedAt)
        },
        createdAt: Timestamp.fromDate(workout.createdAt),
        updatedAt: Timestamp.fromDate(workout.updatedAt)
      });

      console.log(`✅ Created unplanned workout with ID: ${workoutId}`);
      return workout;
      
    } catch (error) {
      console.error('❌ Error creating unplanned workout:', error);
      throw new Error(`Failed to create unplanned workout: ${error}`);
    }
  }

  /**
   * Process a parsed FIT file - either match to planned workout or create unplanned
   */
  static async processParsedFitData(
    userId: string, 
    parsedData: ParsedFitData
  ): Promise<{ workout: Workout; wasMatched: boolean }> {
    try {
      console.log(`⚙️ Processing FIT data for user ${userId}`);

      // Try to match with a planned workout
      const matchResult = await this.matchPlannedWorkout(userId, parsedData);

      if (matchResult) {
        // Update the planned workout with actual data
        const updatedWorkout = await this.updateWorkoutWithActual(
          matchResult.workout.id, 
          parsedData
        );
        
        return {
          workout: updatedWorkout,
          wasMatched: true
        };
      } else {
        // Create as unplanned workout
        const unplannedWorkout = await this.handleUnplannedWorkout(userId, parsedData);
        
        return {
          workout: unplannedWorkout,
          wasMatched: false
        };
      }
      
    } catch (error) {
      console.error('❌ Error processing parsed FIT data:', error);
      throw new Error(`Failed to process FIT data: ${error}`);
    }
  }

  /**
   * Process multiple FIT files in batch
   */
  static async processBatchFitData(
    userId: string, 
    parsedDataArray: ParsedFitData[]
  ): Promise<WorkoutBatchResult> {
    const result: WorkoutBatchResult = {
      successful: [],
      failed: [],
      matched: 0,
      unplanned: 0
    };

    console.log(`🔄 Processing batch of ${parsedDataArray.length} FIT files`);

    for (const parsedData of parsedDataArray) {
      try {
        const processResult = await this.processParsedFitData(userId, parsedData);
        result.successful.push(processResult.workout);
        
        if (processResult.wasMatched) {
          result.matched++;
        } else {
          result.unplanned++;
        }
        
      } catch (error) {
        result.failed.push({
          input: parsedData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`✅ Batch processing complete: ${result.successful.length} successful, ${result.failed.length} failed`);
    return result;
  }

  /**
   * Get all workouts for a user
   */
  static async getUserWorkouts(userId: string, limit?: number): Promise<Workout[]> {
    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );

      if (limit) {
        q = query(q);
      }

      const querySnapshot = await getDocs(q);
      const workouts: Workout[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        workouts.push({
          ...data,
          id: data.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          actual: data.actual ? {
            ...data.actual,
            processedAt: data.actual.processedAt?.toDate(),
            zones: data.actual.zones || []
          } : undefined
        } as Workout);
      });

      return workouts;
      
    } catch (error) {
      console.error('❌ Error fetching user workouts:', error);
      throw new Error(`Failed to fetch workouts: ${error}`);
    }
  }

  /**
   * Get workouts by date range
   */
  static async getWorkoutsByDateRange(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Workout[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const workouts: Workout[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        workouts.push({
          ...data,
          id: data.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          actual: data.actual ? {
            ...data.actual,
            processedAt: data.actual.processedAt?.toDate()
          } : undefined
        } as Workout);
      });

      return workouts;
      
    } catch (error) {
      console.error('❌ Error fetching workouts by date range:', error);
      throw new Error(`Failed to fetch workouts: ${error}`);
    }
  }

  /**
   * Mark a planned workout as missed
   */
  static async markWorkoutAsMissed(workoutId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('id', '==', workoutId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`Workout with ID ${workoutId} not found`);
      }

      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        status: 'missed',
        updatedAt: Timestamp.fromDate(new Date())
      });

      console.log(`✅ Marked workout ${workoutId} as missed`);
      
    } catch (error) {
      console.error('❌ Error marking workout as missed:', error);
      throw new Error(`Failed to mark workout as missed: ${error}`);
    }
  }

  /**
   * Delete a workout
   */
  static async deleteWorkout(workoutId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('id', '==', workoutId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`Workout with ID ${workoutId} not found`);
      }

      const docRef = querySnapshot.docs[0].ref;
      await deleteDoc(docRef);

      console.log(`✅ Deleted workout ${workoutId}`);
      
    } catch (error) {
      console.error('❌ Error deleting workout:', error);
      throw new Error(`Failed to delete workout: ${error}`);
    }
  }
}

export default WorkoutService;