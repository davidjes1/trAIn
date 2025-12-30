// Segment Builder - utility service for creating and managing workout segments
import {
  WorkoutSegment,
  TimeBasedSegment,
  DistanceBasedSegment,
  RepBasedSegment,
  RoundBasedSegment,
  CustomSegment,
  SegmentGroup,
  SegmentType,
  SegmentMeasurement
} from '@/core/models';
import { v4 as uuidv4 } from 'uuid';

export class SegmentBuilder {

  /**
   * Create a time-based segment (intervals, tempo, etc.)
   */
  static createTimeBasedSegment(options: {
    name: string;
    type: SegmentType;
    durationMin: number;
    durationSec?: number;
    targetHR?: number;
    targetHRZone?: number;
    targetPace?: string;
    targetPower?: number;
    targetRPE?: number;
    restAfterMin?: number;
    description?: string;
    notes?: string;
    order: number;
  }): TimeBasedSegment {
    return {
      id: uuidv4(),
      measurement: 'time',
      ...options
    };
  }

  /**
   * Create a distance-based segment
   */
  static createDistanceBasedSegment(options: {
    name: string;
    type: SegmentType;
    distanceKm: number;
    targetPace?: string;
    targetHR?: number;
    targetHRZone?: number;
    targetPower?: number;
    targetRPE?: number;
    restAfterMin?: number;
    description?: string;
    notes?: string;
    order: number;
  }): DistanceBasedSegment {
    return {
      id: uuidv4(),
      measurement: 'distance',
      ...options
    };
  }

  /**
   * Create a repetition-based segment (strength training)
   */
  static createRepBasedSegment(options: {
    name: string;
    type: SegmentType;
    reps: number;
    sets?: number;
    weight?: number;
    weightUnit?: 'kg' | 'lbs';
    targetRPE?: number;
    restBetweenSetsMin?: number;
    restAfterMin?: number;
    equipment?: string;
    exercise?: string;
    muscleGroups?: string[];
    description?: string;
    notes?: string;
    order: number;
  }): RepBasedSegment {
    return {
      id: uuidv4(),
      measurement: 'reps',
      ...options
    };
  }

  /**
   * Create a round-based segment (circuits, boxing, etc.)
   */
  static createRoundBasedSegment(options: {
    name: string;
    type: SegmentType;
    rounds: number;
    workTimeMin: number;
    restTimeMin: number;
    exercises?: string[];
    targetHR?: number;
    targetRPE?: number;
    restAfterMin?: number;
    description?: string;
    notes?: string;
    order: number;
  }): RoundBasedSegment {
    return {
      id: uuidv4(),
      measurement: 'rounds',
      ...options
    };
  }

  /**
   * Create a custom segment
   */
  static createCustomSegment(options: {
    name: string;
    type: SegmentType;
    customMeasurement: string;
    customValue: number;
    customInstructions: string;
    targetMetrics?: Record<string, any>;
    restAfterMin?: number;
    description?: string;
    notes?: string;
    order: number;
  }): CustomSegment {
    return {
      id: uuidv4(),
      measurement: 'custom',
      ...options
    };
  }

  /**
   * Create a segment group
   */
  static createSegmentGroup(options: {
    name: string;
    description?: string;
    segments: WorkoutSegment[];
    repeatCount?: number;
    restBetweenRepeatsMin?: number;
  }): SegmentGroup {
    return {
      id: uuidv4(),
      ...options
    };
  }

  /**
   * Quick builders for common workout patterns
   */

  /**
   * Create interval training segments
   * Example: 3 rounds of 5 minutes in Zone 4 with 2 min recovery
   */
  static createIntervalPattern(options: {
    workDurationMin: number;
    restDurationMin: number;
    intervals: number;
    targetHRZone?: number;
    targetPace?: string;
    targetPower?: number;
    targetRPE?: number;
    description?: string;
  }): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    
    for (let i = 0; i < options.intervals; i++) {
      // Work interval
      segments.push(this.createTimeBasedSegment({
        name: `Interval ${i + 1}`,
        type: 'interval',
        durationMin: options.workDurationMin,
        targetHRZone: options.targetHRZone,
        targetPace: options.targetPace,
        targetPower: options.targetPower,
        targetRPE: options.targetRPE,
        description: options.description || `Interval ${i + 1} - work hard!`,
        order: i * 2
      }));

      // Recovery interval (except after last interval)
      if (i < options.intervals - 1) {
        segments.push(this.createTimeBasedSegment({
          name: `Recovery ${i + 1}`,
          type: 'recovery',
          durationMin: options.restDurationMin,
          targetHRZone: 1,
          targetRPE: 3,
          description: 'Easy recovery pace',
          order: i * 2 + 1
        }));
      }
    }
    
    return segments;
  }

  /**
   * Create strength training circuit
   * Example: 3 sets of squats, push-ups, and planks
   */
  static createStrengthCircuit(options: {
    exercises: Array<{
      name: string;
      reps: number;
      weight?: number;
      weightUnit?: 'kg' | 'lbs';
      equipment?: string;
      muscleGroups?: string[];
    }>;
    sets: number;
    restBetweenExercisesMin?: number;
    restBetweenSetsMin?: number;
    targetRPE?: number;
  }): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    let order = 0;

    for (let set = 0; set < options.sets; set++) {
      for (let i = 0; i < options.exercises.length; i++) {
        const exercise = options.exercises[i];
        
        segments.push(this.createRepBasedSegment({
          name: `${exercise.name} - Set ${set + 1}`,
          type: 'strength_set',
          reps: exercise.reps,
          sets: 1,
          weight: exercise.weight,
          weightUnit: exercise.weightUnit,
          equipment: exercise.equipment,
          exercise: exercise.name.toLowerCase(),
          muscleGroups: exercise.muscleGroups,
          targetRPE: options.targetRPE,
          restAfterMin: i < options.exercises.length - 1 ? options.restBetweenExercisesMin : options.restBetweenSetsMin,
          description: `Perform ${exercise.reps} reps of ${exercise.name}`,
          order: order++
        }));
      }
    }

    return segments;
  }

  /**
   * Create warmup sequence
   */
  static createWarmupSequence(sport: string, durationMin: number): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    
    switch (sport.toLowerCase()) {
      case 'run':
        segments.push(
          this.createTimeBasedSegment({
            name: 'Easy Jog',
            type: 'warmup',
            durationMin: durationMin * 0.7,
            targetHRZone: 1,
            targetRPE: 3,
            description: 'Start with an easy jog to warm up',
            order: 0
          }),
          this.createTimeBasedSegment({
            name: 'Dynamic Stretches',
            type: 'stretch',
            durationMin: durationMin * 0.3,
            targetRPE: 2,
            description: 'Leg swings, high knees, butt kicks',
            order: 1
          })
        );
        break;
        
      case 'bike':
        segments.push(
          this.createTimeBasedSegment({
            name: 'Easy Spin',
            type: 'warmup',
            durationMin: durationMin * 0.8,
            targetHRZone: 1,
            targetRPE: 3,
            description: 'Easy spinning to warm up legs',
            order: 0
          }),
          this.createTimeBasedSegment({
            name: 'Spin-ups',
            type: 'warmup',
            durationMin: durationMin * 0.2,
            targetHRZone: 2,
            targetRPE: 4,
            description: 'Gradually increase cadence',
            order: 1
          })
        );
        break;
        
      case 'strength':
        segments.push(
          this.createTimeBasedSegment({
            name: 'Light Cardio',
            type: 'warmup',
            durationMin: durationMin * 0.4,
            targetRPE: 3,
            description: 'Light cardio to raise heart rate',
            order: 0
          }),
          this.createTimeBasedSegment({
            name: 'Dynamic Mobility',
            type: 'stretch',
            durationMin: durationMin * 0.6,
            targetRPE: 3,
            description: 'Dynamic stretches and mobility work',
            order: 1
          })
        );
        break;
        
      default:
        segments.push(
          this.createTimeBasedSegment({
            name: 'General Warmup',
            type: 'warmup',
            durationMin: durationMin,
            targetHRZone: 1,
            targetRPE: 3,
            description: 'Light activity to prepare for workout',
            order: 0
          })
        );
    }
    
    return segments;
  }

  /**
   * Create cooldown sequence
   */
  static createCooldownSequence(sport: string, durationMin: number): WorkoutSegment[] {
    const segments: WorkoutSegment[] = [];
    let order = 100; // Start high to place at end
    
    switch (sport.toLowerCase()) {
      case 'run':
      case 'bike':
        segments.push(
          this.createTimeBasedSegment({
            name: 'Easy Cool Down',
            type: 'cooldown',
            durationMin: durationMin * 0.6,
            targetHRZone: 1,
            targetRPE: 2,
            description: 'Easy pace to bring heart rate down',
            order: order++
          }),
          this.createTimeBasedSegment({
            name: 'Stretching',
            type: 'stretch',
            durationMin: durationMin * 0.4,
            targetRPE: 1,
            description: 'Static stretches for worked muscles',
            order: order++
          })
        );
        break;
        
      default:
        segments.push(
          this.createTimeBasedSegment({
            name: 'Cool Down',
            type: 'cooldown',
            durationMin: durationMin,
            targetRPE: 1,
            description: 'Light activity and stretching',
            order: order++
          })
        );
    }
    
    return segments;
  }

  /**
   * Utility functions
   */

  /**
   * Calculate total workout duration from segments
   */
  static calculateTotalDuration(segments: WorkoutSegment[]): number {
    return segments.reduce((total, segment) => {
      let segmentDuration = 0;
      
      switch (segment.measurement) {
        case 'time':
          segmentDuration = (segment as TimeBasedSegment).durationMin;
          if (segment.restAfterMin) segmentDuration += segment.restAfterMin;
          break;
        case 'reps':
          const repSegment = segment as RepBasedSegment;
          if (repSegment.restBetweenSetsMin && repSegment.sets) {
            segmentDuration += repSegment.restBetweenSetsMin * (repSegment.sets - 1);
          }
          if (segment.restAfterMin) segmentDuration += segment.restAfterMin;
          break;
        case 'rounds':
          const roundSegment = segment as RoundBasedSegment;
          segmentDuration = roundSegment.rounds * (roundSegment.workTimeMin + roundSegment.restTimeMin);
          if (segment.restAfterMin) segmentDuration += segment.restAfterMin;
          break;
      }
      
      return total + segmentDuration;
    }, 0);
  }

  /**
   * Calculate total distance from segments
   */
  static calculateTotalDistance(segments: WorkoutSegment[]): number {
    return segments.reduce((total, segment) => {
      if (segment.measurement === 'distance') {
        return total + (segment as DistanceBasedSegment).distanceKm;
      }
      return total;
    }, 0);
  }

  /**
   * Sort segments by order
   */
  static sortSegmentsByOrder(segments: WorkoutSegment[]): WorkoutSegment[] {
    return [...segments].sort((a, b) => a.order - b.order);
  }

  /**
   * Generate readable workout summary
   */
  static generateWorkoutSummary(segments: WorkoutSegment[]): string {
    const sortedSegments = this.sortSegmentsByOrder(segments);
    const summary: string[] = [];
    
    sortedSegments.forEach((segment, index) => {
      let description = `${index + 1}. ${segment.name}: `;
      
      switch (segment.measurement) {
        case 'time':
          const timeSegment = segment as TimeBasedSegment;
          description += `${timeSegment.durationMin} minutes`;
          if (timeSegment.targetHRZone) description += ` in Zone ${timeSegment.targetHRZone}`;
          if (timeSegment.targetPace) description += ` at ${timeSegment.targetPace} pace`;
          break;
          
        case 'distance':
          const distSegment = segment as DistanceBasedSegment;
          description += `${distSegment.distanceKm} km`;
          if (distSegment.targetPace) description += ` at ${distSegment.targetPace} pace`;
          break;
          
        case 'reps':
          const repSegment = segment as RepBasedSegment;
          if (repSegment.sets && repSegment.sets > 1) {
            description += `${repSegment.sets} sets of ${repSegment.reps} reps`;
          } else {
            description += `${repSegment.reps} reps`;
          }
          if (repSegment.weight) {
            description += ` @ ${repSegment.weight}${repSegment.weightUnit || 'kg'}`;
          }
          break;
          
        case 'rounds':
          const roundSegment = segment as RoundBasedSegment;
          description += `${roundSegment.rounds} rounds of ${roundSegment.workTimeMin}min work, ${roundSegment.restTimeMin}min rest`;
          break;
          
        case 'custom':
          const customSegment = segment as CustomSegment;
          description += `${customSegment.customValue} ${customSegment.customMeasurement}`;
          break;
      }
      
      if (segment.restAfterMin) {
        description += ` + ${segment.restAfterMin}min rest`;
      }
      
      summary.push(description);
    });
    
    return summary.join('\n');
  }
}

export default SegmentBuilder;