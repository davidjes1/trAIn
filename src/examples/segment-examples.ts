// Example segments showing the flexibility of the segment system
import { SegmentBuilder } from '../services/SegmentBuilder';
import {
  WorkoutSegment,
  SegmentGroup,
  TimeBasedSegment,
  RepBasedSegment
} from '@/core/models';

export class SegmentExamples {

  /**
   * Example 1: Cycling Interval Session
   * "3 rounds of 5 minutes in Zone 4 with 2 minute recovery"
   */
  static createCyclingIntervals(): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    
    // Warmup
    segments.push(...SegmentBuilder.createWarmupSequence('bike', 15));
    
    // Main intervals
    const intervalSegments = SegmentBuilder.createIntervalPattern({
      workDurationMin: 5,
      restDurationMin: 2,
      intervals: 3,
      targetHRZone: 4,
      targetPower: 280,
      targetRPE: 8,
      description: '5min Zone 4 intervals - hard but sustainable effort'
    });
    
    segments.push(...intervalSegments);
    
    // Cooldown
    segments.push(...SegmentBuilder.createCooldownSequence('bike', 10));
    
    return segments;
  }

  /**
   * Example 2: Strength Training Circuit
   * "3 sets of squats, push-ups, and planks - 10 reps each"
   */
  static createStrengthCircuit(): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    
    // Warmup
    segments.push(...SegmentBuilder.createWarmupSequence('strength', 10));
    
    // Main strength circuit
    const strengthSegments = SegmentBuilder.createStrengthCircuit({
      exercises: [
        {
          name: 'Squats',
          reps: 10,
          weight: 60,
          weightUnit: 'kg',
          equipment: 'barbell',
          muscleGroups: ['legs', 'glutes', 'core']
        },
        {
          name: 'Push-ups',
          reps: 10,
          equipment: 'bodyweight',
          muscleGroups: ['chest', 'shoulders', 'triceps']
        },
        {
          name: 'Planks',
          reps: 1, // Duration-based, but using reps field
          equipment: 'bodyweight',
          muscleGroups: ['core']
        }
      ],
      sets: 3,
      restBetweenExercisesMin: 1,
      restBetweenSetsMin: 2,
      targetRPE: 7
    });
    
    segments.push(...strengthSegments);
    
    // Cooldown
    segments.push(...SegmentBuilder.createCooldownSequence('strength', 10));
    
    return segments;
  }

  /**
   * Example 3: Complex Running Workout with Mixed Segments
   * Tempo run with strides and strength exercises
   */
  static createComplexRunningWorkout(): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    let order = 0;
    
    // Warmup jog
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Easy Warmup',
      type: 'warmup',
      durationMin: 10,
      targetHRZone: 1,
      targetPace: '6:00/km',
      targetRPE: 3,
      description: 'Easy conversational pace to warm up',
      order: order++
    }));
    
    // Dynamic warmup
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Dynamic Stretches',
      type: 'stretch',
      durationMin: 5,
      targetRPE: 2,
      description: 'Leg swings, high knees, butt kicks',
      order: order++
    }));
    
    // Main tempo block
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Tempo Run',
      type: 'tempo',
      durationMin: 20,
      targetHRZone: 3,
      targetPace: '4:30/km',
      targetRPE: 7,
      description: 'Comfortably hard tempo pace',
      order: order++
    }));
    
    // Recovery jog
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Recovery Jog',
      type: 'recovery',
      durationMin: 5,
      targetHRZone: 1,
      targetPace: '6:30/km',
      targetRPE: 3,
      description: 'Easy jog to recover',
      order: order++
    }));
    
    // Strides
    segments.push(SegmentBuilder.createRoundBasedSegment({
      name: 'Strides',
      type: 'interval',
      rounds: 4,
      workTimeMin: 0.5, // 30 seconds
      restTimeMin: 1,
      targetRPE: 8,
      description: 'Fast but controlled strides',
      order: order++
    }));
    
    // Running-specific strength
    segments.push(SegmentBuilder.createRepBasedSegment({
      name: 'Single Leg Squats',
      type: 'strength_set',
      reps: 8,
      sets: 2,
      equipment: 'bodyweight',
      exercise: 'single_leg_squat',
      muscleGroups: ['legs', 'glutes', 'core'],
      targetRPE: 6,
      restBetweenSetsMin: 1,
      description: 'Focus on control and balance',
      order: order++
    }));
    
    // Final cooldown
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Cool Down Jog',
      type: 'cooldown',
      durationMin: 10,
      targetHRZone: 1,
      targetPace: '6:30/km',
      targetRPE: 2,
      description: 'Easy jog to finish',
      order: order++
    }));
    
    return segments;
  }

  /**
   * Example 4: Swimming Workout with Technique Focus
   */
  static createSwimmingWorkout(): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    let order = 0;
    
    // Warmup
    segments.push(SegmentBuilder.createDistanceBasedSegment({
      name: 'Easy Swim Warmup',
      type: 'warmup',
      distanceKm: 0.4, // 400m
      targetRPE: 3,
      description: 'Easy freestyle to warm up',
      order: order++
    }));
    
    // Technique work
    segments.push(SegmentBuilder.createRoundBasedSegment({
      name: 'Drill Set',
      type: 'interval',
      rounds: 8,
      workTimeMin: 1.5, // ~100m intervals
      restTimeMin: 0.5,
      exercises: ['Catch-up drill', 'Fingertip drag', 'High elbow'],
      targetRPE: 4,
      description: 'Focus on technique',
      order: order++
    }));
    
    // Main set
    segments.push(SegmentBuilder.createRoundBasedSegment({
      name: 'Main Set',
      type: 'interval',
      rounds: 6,
      workTimeMin: 3, // ~200m intervals
      restTimeMin: 1,
      targetHRZone: 4,
      targetRPE: 7,
      description: 'Fast but controlled pace',
      order: order++
    }));
    
    // Cool down
    segments.push(SegmentBuilder.createDistanceBasedSegment({
      name: 'Easy Cool Down',
      type: 'cooldown',
      distanceKm: 0.2, // 200m
      targetRPE: 2,
      description: 'Easy swimming to finish',
      order: order++
    }));
    
    return segments;
  }

  /**
   * Example 5: High-Intensity Functional Training (HIIT)
   * Using segment groups for complex circuits
   */
  static createHIITWorkout(): { segments: WorkoutSegment[]; groups: SegmentGroup[] } {
    const segments: WorkoutSegment[] = [];
    const groups: SegmentGroup[] = [];
    
    // Warmup
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Dynamic Warmup',
      type: 'warmup',
      durationMin: 8,
      targetRPE: 4,
      description: 'Joint mobility and activation',
      order: 0
    }));
    
    // Create HIIT circuit as a segment group
    const hiitSegments: WorkoutSegment[] = [];
    let segmentOrder = 0;
    
    // Circuit exercises
    const exercises = [
      { name: 'Burpees', reps: 10 },
      { name: 'Jump Squats', reps: 15 },
      { name: 'Push-ups', reps: 12 },
      { name: 'Mountain Climbers', reps: 20 },
      { name: 'Plank Hold', reps: 30 } // Using reps for seconds
    ];
    
    exercises.forEach(exercise => {
      hiitSegments.push(SegmentBuilder.createRepBasedSegment({
        name: exercise.name,
        type: 'strength_set',
        reps: exercise.reps,
        sets: 1,
        equipment: 'bodyweight',
        targetRPE: 9,
        restAfterMin: 0.5, // 30 seconds rest
        description: `Max effort ${exercise.name}`,
        order: segmentOrder++
      }));
    });
    
    // Create the circuit group
    const hiitGroup = SegmentBuilder.createSegmentGroup({
      name: 'HIIT Circuit',
      description: '5 exercises, 30 seconds rest between exercises, 2 minutes rest between rounds',
      segments: hiitSegments,
      repeatCount: 4,
      restBetweenRepeatsMin: 2
    });
    
    groups.push(hiitGroup);
    
    // Final cooldown
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Cool Down & Stretch',
      type: 'cooldown',
      durationMin: 10,
      targetRPE: 2,
      description: 'Static stretches and deep breathing',
      order: 100
    }));
    
    return { segments, groups };
  }

  /**
   * Example 6: Custom Yoga Flow
   */
  static createYogaFlow(): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    let order = 0;
    
    // Sun salutation warmup
    segments.push(SegmentBuilder.createRoundBasedSegment({
      name: 'Sun Salutations',
      type: 'warmup',
      rounds: 5,
      workTimeMin: 2,
      restTimeMin: 0.5,
      exercises: ['Mountain pose', 'Forward fold', 'Halfway lift', 'Chaturanga', 'Upward dog', 'Downward dog'],
      targetRPE: 3,
      description: 'Flow through sun salutations',
      order: order++
    }));
    
    // Standing poses
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Standing Sequence',
      type: 'strength_set',
      durationMin: 15,
      targetRPE: 5,
      description: 'Warrior poses, triangle, and balancing poses',
      notes: 'Hold each pose for 30-60 seconds',
      order: order++
    }));
    
    // Seated poses
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Seated Sequence',
      type: 'stretch',
      durationMin: 10,
      targetRPE: 3,
      description: 'Hip openers and spinal twists',
      order: order++
    }));
    
    // Final relaxation
    segments.push(SegmentBuilder.createTimeBasedSegment({
      name: 'Savasana',
      type: 'rest',
      durationMin: 8,
      targetRPE: 1,
      description: 'Complete relaxation',
      order: order++
    }));
    
    return segments;
  }

  /**
   * Generate readable summary for any example
   */
  static generateExampleSummary(segments: WorkoutSegment[], groups?: SegmentGroup[]): string {
    let summary = `📊 Workout Summary:\n`;
    summary += `Total Duration: ${SegmentBuilder.calculateTotalDuration(segments)} minutes\n`;
    summary += `Segments: ${segments.length}\n\n`;
    
    if (groups && groups.length > 0) {
      summary += `🔄 Segment Groups:\n`;
      groups.forEach(group => {
        summary += `- ${group.name}: ${group.segments.length} exercises × ${group.repeatCount || 1} rounds\n`;
      });
      summary += '\n';
    }
    
    summary += `📋 Detailed Structure:\n`;
    summary += SegmentBuilder.generateWorkoutSummary(segments);
    
    return summary;
  }
}

export default SegmentExamples;