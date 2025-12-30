// Periodization service for structured macro and mesocycle planning
import {
  MacroPlan,
  Mesocycle,
  TrainingPlan,
  TrainingPhase,
  WorkoutType
} from '@/core/models';
import { WorkoutLibrary } from '../config/workouts';

export class PeriodizationService {
  /**
   * Generate a structured training plan from a macro periodization template
   */
  static generateStructuredPlan(macroPlan: MacroPlan): TrainingPlan[] {
    const planStart = new Date(macroPlan.startDate);
    const workouts: TrainingPlan[] = [];
    let currentDate = new Date(planStart);

    for (const mesocycle of macroPlan.mesocycles) {
      const mesocycleWorkouts = this.generateMesocycleWorkouts(
        mesocycle, 
        currentDate, 
        macroPlan.athlete.fitnessLevel
      );
      
      workouts.push(...mesocycleWorkouts);
      
      // Advance date by mesocycle duration
      currentDate.setDate(currentDate.getDate() + (mesocycle.weeks * 7));
    }

    return workouts;
  }

  /**
   * Generate workouts for a specific mesocycle
   */
  private static generateMesocycleWorkouts(
    mesocycle: Mesocycle,
    startDate: Date,
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): TrainingPlan[] {
    const workouts: TrainingPlan[] = [];
    const currentDate = new Date(startDate);

    for (let week = 0; week < mesocycle.weeks; week++) {
      // Progressive loading within mesocycle
      const weekMultiplier = this.getWeeklyProgressionMultiplier(week, mesocycle.weeks);
      
      for (let day = 0; day < 7; day++) {
        const workoutType = mesocycle.template[day] || 'rest';
        
        const baseWorkout = this.getWorkoutForTypeAndPhase(workoutType, mesocycle.phase);
        if (!baseWorkout) {
          // Skip if no suitable workout found
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Apply mesocycle-specific adjustments
        const adjustedWorkout = this.adjustWorkoutForMesocycle(
          baseWorkout, 
          mesocycle, 
          weekMultiplier,
          fitnessLevel
        );

        workouts.push({
          date: this.formatDate(currentDate),
          workoutType: adjustedWorkout.type,
          description: `${mesocycle.name}: ${adjustedWorkout.description}`,
          expectedFatigue: adjustedWorkout.fatigueScore,
          durationMin: adjustedWorkout.durationMin,
          workoutId: `${mesocycle.name.toLowerCase().replace(/\s+/g, '-')}-${adjustedWorkout.type}-${adjustedWorkout.tag}`,
          completed: false
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return workouts;
  }

  /**
   * Get appropriate workout for type and phase
   */
  private static getWorkoutForTypeAndPhase(
    workoutType: string, 
    phase: TrainingPhase
  ): WorkoutType | null {
    // Handle rest days
    if (workoutType === 'rest') {
      return WorkoutLibrary.getWorkoutByTypeAndTag('rest', 'zone1') || null;
    }

    // Get workouts by type, filtered by phase appropriateness
    const candidateWorkouts = WorkoutLibrary.getWorkoutsByType(workoutType)
      .filter(w => !w.phase || w.phase === phase);

    if (candidateWorkouts.length === 0) {
      // Fallback to any workout of this type
      const fallbackWorkouts = WorkoutLibrary.getWorkoutsByType(workoutType);
      return fallbackWorkouts.length > 0 ? fallbackWorkouts[0] : null;
    }

    // Select workout based on phase priorities
    return this.selectWorkoutByPhase(candidateWorkouts, phase);
  }

  /**
   * Select workout based on phase-specific priorities
   */
  private static selectWorkoutByPhase(
    workouts: WorkoutType[], 
    phase: TrainingPhase
  ): WorkoutType {
    switch (phase) {
      case 'base':
        // Prioritize zone 2 aerobic work
        return workouts.find(w => w.tag === 'zone2') || 
               workouts.find(w => w.fatigueScore <= 50) || 
               workouts[0];
      
      case 'build':
        // Prioritize threshold and interval work
        return workouts.find(w => w.tag === 'threshold') ||
               workouts.find(w => w.tag === 'intervals') ||
               workouts.find(w => w.fatigueScore >= 60) ||
               workouts[0];
      
      case 'peak':
        // Prioritize race-specific efforts
        return workouts.find(w => w.tag === 'threshold') ||
               workouts.find(w => w.type === 'brick') ||
               workouts.find(w => w.fatigueScore >= 70) ||
               workouts[0];
      
      case 'taper':
        // Prioritize short, race-pace efforts
        return workouts.find(w => w.tag === 'strides') ||
               workouts.find(w => w.durationMin <= 30) ||
               workouts.find(w => w.fatigueScore <= 40) ||
               workouts[0];
      
      case 'recovery':
        // Prioritize easy, restorative work
        return workouts.find(w => w.tag === 'zone1') ||
               workouts.find(w => w.recoveryImpact === 'restorative') ||
               workouts.find(w => w.fatigueScore <= 30) ||
               workouts[0];
      
      default:
        return workouts[0];
    }
  }

  /**
   * Apply mesocycle-specific adjustments to workout
   */
  private static adjustWorkoutForMesocycle(
    workout: WorkoutType,
    mesocycle: Mesocycle,
    weekMultiplier: number,
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): WorkoutType {
    // Start with fitness level adjustment
    let adjustedWorkout = WorkoutLibrary.adjustWorkoutForFitnessLevel(workout, fitnessLevel);

    // Apply mesocycle volume multiplier
    if (mesocycle.volumeMultiplier) {
      adjustedWorkout = {
        ...adjustedWorkout,
        durationMin: Math.round(adjustedWorkout.durationMin * mesocycle.volumeMultiplier * weekMultiplier)
      };
    }

    // Apply mesocycle intensity multiplier
    if (mesocycle.intensityMultiplier) {
      adjustedWorkout = {
        ...adjustedWorkout,
        fatigueScore: Math.min(100, Math.round(adjustedWorkout.fatigueScore * mesocycle.intensityMultiplier))
      };
    }

    return adjustedWorkout;
  }

  /**
   * Calculate weekly progression multiplier within mesocycle
   */
  private static getWeeklyProgressionMultiplier(
    weekNumber: number, 
    totalWeeks: number
  ): number {
    // Progressive loading with recovery week
    if (totalWeeks <= 2) {
      return 1.0; // Short blocks don't need progression
    }
    
    if (totalWeeks === 3) {
      return [1.0, 1.15, 0.85][weekNumber] || 1.0;
    }
    
    if (totalWeeks === 4) {
      // Classic 3-week build + 1 week recovery
      return [1.0, 1.1, 1.2, 0.7][weekNumber] || 1.0;
    }
    
    // For longer mesocycles, build for most weeks with periodic recovery
    const isRecoveryWeek = (weekNumber + 1) % 4 === 0;
    const baseProgression = 1.0 + (weekNumber * 0.05);
    
    return isRecoveryWeek ? 0.75 : Math.min(1.25, baseProgression);
  }

  /**
   * Create a sample triathlon macro plan
   */
  static createSampleTriathlonPlan(
    startDate: string,
    eventDate: string,
    athleteAge: number,
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): MacroPlan {
    const start = new Date(startDate);
    const event = new Date(eventDate);
    const totalWeeks = Math.ceil((event.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));

    const mesocycles: Mesocycle[] = [];

    if (totalWeeks >= 16) {
      // Long-term periodization
      mesocycles.push(
        {
          name: 'Base I',
          phase: 'base',
          weeks: 4,
          goal: 'Build aerobic endurance and establish routine',
          template: ['bike', 'run', 'rest', 'strength', 'bike', 'run', 'mobility'],
          volumeMultiplier: fitnessLevel === 'beginner' ? 0.8 : 1.0
        },
        {
          name: 'Base II',
          phase: 'base',
          weeks: 4,
          goal: 'Add volume and introduce brick training',
          template: ['run', 'bike', 'strength', 'brick', 'rest', 'run', 'mobility'],
          volumeMultiplier: fitnessLevel === 'beginner' ? 0.9 : 1.1
        },
        {
          name: 'Build I',
          phase: 'build',
          weeks: 4,
          goal: 'Develop lactate threshold and speed',
          template: ['run', 'brick', 'bike', 'rest', 'run', 'strength', 'mobility'],
          volumeMultiplier: 1.0,
          intensityMultiplier: 1.1
        },
        {
          name: 'Build II',
          phase: 'build',
          weeks: 3,
          goal: 'Race-specific training and brick focus',
          template: ['brick', 'run', 'bike', 'rest', 'brick', 'strength', 'mobility'],
          volumeMultiplier: 1.1,
          intensityMultiplier: 1.2
        },
        {
          name: 'Taper',
          phase: 'taper',
          weeks: Math.max(1, totalWeeks - 15),
          goal: 'Freshen legs and prepare for race',
          template: ['rest', 'run', 'bike', 'rest', 'brick', 'mobility', 'rest'],
          volumeMultiplier: 0.6,
          intensityMultiplier: 0.8
        }
      );
    } else if (totalWeeks >= 8) {
      // Medium-term plan
      mesocycles.push(
        {
          name: 'Base Build',
          phase: 'base',
          weeks: Math.floor(totalWeeks * 0.5),
          goal: 'Build aerobic base and introduce brick training',
          template: ['run', 'bike', 'rest', 'brick', 'strength', 'run', 'mobility']
        },
        {
          name: 'Intensity',
          phase: 'build',
          weeks: Math.floor(totalWeeks * 0.3),
          goal: 'Develop race-specific fitness',
          template: ['brick', 'run', 'bike', 'rest', 'brick', 'strength', 'mobility'],
          intensityMultiplier: 1.2
        },
        {
          name: 'Peak & Taper',
          phase: 'taper',
          weeks: Math.ceil(totalWeeks * 0.2),
          goal: 'Peak fitness and race preparation',
          template: ['rest', 'run', 'bike', 'rest', 'brick', 'mobility', 'rest'],
          volumeMultiplier: 0.7
        }
      );
    } else {
      // Short-term focused plan
      mesocycles.push({
        name: 'Race Prep',
        phase: totalWeeks <= 2 ? 'taper' : 'build',
        weeks: totalWeeks,
        goal: 'Prepare for upcoming event',
        template: ['run', 'bike', 'rest', 'brick', 'strength', 'run', 'mobility']
      });
    }

    return {
      startDate,
      eventDate,
      mesocycles,
      athlete: {
        age: athleteAge,
        fitnessLevel
      }
    };
  }

  /**
   * Utility function to format dates
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}