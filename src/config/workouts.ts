// Workout library with predefined templates for triathlon training
import { WorkoutType, TrainingPhase } from '@/core/models';

export const WORKOUT_LIBRARY: WorkoutType[] = [
  // Running Workouts
  {
    type: 'run',
    tag: 'zone1',
    description: 'Easy recovery run, conversational pace',
    durationMin: 25,
    fatigueScore: 25,
    recoveryImpact: 'low',
    phase: 'recovery'
  },
  {
    type: 'run',
    tag: 'zone2',
    description: 'Aerobic base run, comfortable effort',
    durationMin: 35,
    fatigueScore: 45,
    recoveryImpact: 'low'
  },
  {
    type: 'run',
    tag: 'zone3',
    description: 'Tempo run, comfortably hard effort',
    durationMin: 30,
    fatigueScore: 65,
    recoveryImpact: 'medium'
  },
  {
    type: 'run',
    tag: 'threshold',
    description: 'Lactate threshold intervals',
    durationMin: 40,
    fatigueScore: 75,
    recoveryImpact: 'high',
    phase: 'build'
  },
  {
    type: 'run',
    tag: 'strides',
    description: 'Easy run with 4-6 x 20s strides',
    durationMin: 35,
    fatigueScore: 50,
    recoveryImpact: 'medium'
  },
  {
    type: 'run',
    tag: 'intervals',
    description: 'VO2max intervals, 3-5 min efforts',
    durationMin: 45,
    fatigueScore: 85,
    recoveryImpact: 'high',
    phase: 'build'
  },

  // Cycling Workouts  
  {
    type: 'bike',
    tag: 'zone1',
    description: 'Recovery spin, very easy effort',
    durationMin: 30,
    fatigueScore: 20,
    recoveryImpact: 'restorative',
    phase: 'recovery'
  },
  {
    type: 'bike',
    tag: 'zone2',
    description: 'Aerobic base ride, conversational',
    durationMin: 45,
    fatigueScore: 45,
    recoveryImpact: 'low'
  },
  {
    type: 'bike',
    tag: 'zone3',
    description: 'Tempo ride, moderate effort',
    durationMin: 40,
    fatigueScore: 60,
    recoveryImpact: 'medium'
  },
  {
    type: 'bike',
    tag: 'threshold',
    description: 'FTP intervals, sustained efforts',
    durationMin: 50,
    fatigueScore: 80,
    recoveryImpact: 'high',
    phase: 'build'
  },
  {
    type: 'bike',
    tag: 'intervals',
    description: 'High-intensity intervals',
    durationMin: 45,
    fatigueScore: 85,
    recoveryImpact: 'high',
    phase: 'build'
  },

  // Brick Workouts
  {
    type: 'brick',
    tag: 'zone2',
    description: 'Easy brick: 25 min bike + 10 min run',
    durationMin: 40,
    fatigueScore: 55,
    recoveryImpact: 'medium'
  },
  {
    type: 'brick',
    tag: 'zone3',
    description: 'Race pace brick: 30 min bike + 15 min run',
    durationMin: 50,
    fatigueScore: 70,
    recoveryImpact: 'high',
    phase: 'build'
  },
  {
    type: 'brick',
    tag: 'threshold',
    description: 'Hard brick: Threshold bike + tempo run',
    durationMin: 60,
    fatigueScore: 85,
    recoveryImpact: 'high',
    phase: 'peak'
  },

  // Strength Training
  {
    type: 'strength',
    tag: 'strength',
    description: 'Core strength + bodyweight exercises',
    durationMin: 30,
    fatigueScore: 30,
    recoveryImpact: 'low'
  },
  {
    type: 'strength',
    tag: 'strength',
    description: 'Full body strength training',
    durationMin: 45,
    fatigueScore: 40,
    recoveryImpact: 'medium'
  },

  // Mobility & Recovery
  {
    type: 'mobility',
    tag: 'mobility',
    description: 'Yoga flow for recovery',
    durationMin: 20,
    fatigueScore: 10,
    recoveryImpact: 'restorative'
  },
  {
    type: 'mobility',
    tag: 'mobility',
    description: 'Dynamic stretching + foam rolling',
    durationMin: 15,
    fatigueScore: 5,
    recoveryImpact: 'restorative'
  },

  // Rest Day
  {
    type: 'rest',
    tag: 'zone1',
    description: 'Complete rest or gentle walk',
    durationMin: 0,
    fatigueScore: 0,
    recoveryImpact: 'restorative'
  },

  // Swimming (for full triathlon support)
  {
    type: 'swim',
    tag: 'zone2',
    description: 'Aerobic swim, steady pace',
    durationMin: 35,
    fatigueScore: 40,
    recoveryImpact: 'low'
  },
  {
    type: 'swim',
    tag: 'threshold',
    description: 'Swim intervals, race pace',
    durationMin: 45,
    fatigueScore: 70,
    recoveryImpact: 'medium',
    phase: 'build'
  }
];

// Phase-specific workout filters
export class WorkoutLibrary {
  static getWorkoutsByPhase(phase: TrainingPhase): WorkoutType[] {
    return WORKOUT_LIBRARY.filter(workout => 
      !workout.phase || workout.phase === phase
    );
  }

  static getWorkoutsByType(type: string): WorkoutType[] {
    return WORKOUT_LIBRARY.filter(workout => workout.type === type);
  }

  static getWorkoutByTypeAndTag(type: string, tag: string): WorkoutType | undefined {
    return WORKOUT_LIBRARY.find(workout => 
      workout.type === type && workout.tag === tag
    );
  }

  static getRecoveryWorkouts(): WorkoutType[] {
    return WORKOUT_LIBRARY.filter(workout => 
      workout.recoveryImpact === 'restorative' || workout.fatigueScore <= 20
    );
  }

  static getEasyWorkouts(): WorkoutType[] {
    return WORKOUT_LIBRARY.filter(workout => 
      workout.fatigueScore <= 50 && workout.recoveryImpact !== 'high'
    );
  }

  static getHardWorkouts(): WorkoutType[] {
    return WORKOUT_LIBRARY.filter(workout => 
      workout.fatigueScore >= 70
    );
  }

  static adjustWorkoutForFitnessLevel(
    workout: WorkoutType, 
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): WorkoutType {
    if (!workout) {
      // Fallback to a basic recovery workout if no workout provided
      console.warn('No workout provided to adjustWorkoutForFitnessLevel, using fallback');
      return {
        type: 'rest',
        tag: 'zone1',
        description: 'Rest day - recovery',
        durationMin: 0,
        fatigueScore: 0,
        recoveryImpact: 'restorative'
      } as WorkoutType;
    }

    const multipliers = {
      beginner: { duration: 0.7, fatigue: 0.8 },
      intermediate: { duration: 1.0, fatigue: 1.0 },
      advanced: { duration: 1.3, fatigue: 1.1 }
    };

    const multiplier = multipliers[fitnessLevel];
    
    return {
      ...workout,
      durationMin: Math.round(workout.durationMin * multiplier.duration),
      fatigueScore: Math.min(100, Math.round(workout.fatigueScore * multiplier.fatigue))
    };
  }
}