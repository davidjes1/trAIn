// Pre-built training templates for different goals and durations
import { MacroPlan, Mesocycle } from '../types/training-metrics.types';

// Weekly templates for different phases
export const WEEKLY_TEMPLATES = {
  // Base phase templates - focus on aerobic development
  base: {
    beginner: ['rest', 'run', 'bike', 'rest', 'strength', 'run', 'mobility'],
    intermediate: ['bike', 'run', 'rest', 'strength', 'bike', 'run', 'mobility'],
    advanced: ['run', 'bike', 'strength', 'brick', 'rest', 'run', 'mobility']
  },
  
  // Build phase templates - add intensity and brick work  
  build: {
    beginner: ['rest', 'run', 'bike', 'strength', 'rest', 'brick', 'mobility'],
    intermediate: ['run', 'brick', 'bike', 'rest', 'run', 'strength', 'mobility'],
    advanced: ['run', 'brick', 'bike', 'strength', 'brick', 'run', 'mobility']
  },
  
  // Peak phase templates - race-specific training
  peak: {
    beginner: ['rest', 'brick', 'bike', 'rest', 'run', 'strength', 'mobility'],
    intermediate: ['brick', 'run', 'bike', 'rest', 'brick', 'strength', 'mobility'],
    advanced: ['brick', 'run', 'brick', 'bike', 'rest', 'run', 'mobility']
  },
  
  // Taper phase templates - reduce volume, maintain intensity
  taper: {
    beginner: ['rest', 'run', 'rest', 'bike', 'rest', 'mobility', 'rest'],
    intermediate: ['rest', 'run', 'bike', 'rest', 'brick', 'mobility', 'rest'],
    advanced: ['run', 'rest', 'bike', 'rest', 'brick', 'mobility', 'rest']
  },
  
  // Recovery phase templates - active recovery
  recovery: {
    beginner: ['rest', 'mobility', 'rest', 'mobility', 'rest', 'mobility', 'rest'],
    intermediate: ['mobility', 'run', 'rest', 'bike', 'rest', 'mobility', 'rest'],
    advanced: ['run', 'mobility', 'bike', 'rest', 'strength', 'mobility', 'rest']
  }
};

// Pre-built mesocycle templates
export const MESOCYCLE_TEMPLATES: Record<string, Mesocycle[]> = {
  // Sprint Triathlon (750m swim, 20km bike, 5km run)
  sprintTriathlon: [
    {
      name: 'Base Building',
      phase: 'base',
      weeks: 4,
      goal: 'Build aerobic endurance and establish training rhythm',
      template: ['bike', 'run', 'rest', 'strength', 'bike', 'run', 'mobility'],
      volumeMultiplier: 1.0
    },
    {
      name: 'Brick Introduction',
      phase: 'base',
      weeks: 4,
      goal: 'Add brick training and build weekly volume',
      template: ['run', 'bike', 'strength', 'brick', 'rest', 'run', 'mobility'],
      volumeMultiplier: 1.1
    },
    {
      name: 'Speed Development',
      phase: 'build',
      weeks: 4,
      goal: 'Develop lactate threshold and race pace',
      template: ['run', 'brick', 'bike', 'rest', 'run', 'strength', 'mobility'],
      volumeMultiplier: 1.0,
      intensityMultiplier: 1.2
    },
    {
      name: 'Race Simulation',
      phase: 'peak',
      weeks: 2,
      goal: 'Practice race scenarios and transitions',
      template: ['brick', 'run', 'rest', 'bike', 'mobility', 'brick', 'rest'],
      volumeMultiplier: 0.9,
      intensityMultiplier: 1.1
    },
    {
      name: 'Taper',
      phase: 'taper',
      weeks: 2,
      goal: 'Freshen legs while maintaining fitness',
      template: ['rest', 'run', 'bike', 'rest', 'brick', 'mobility', 'rest'],
      volumeMultiplier: 0.6,
      intensityMultiplier: 0.8
    }
  ],

  // Olympic Triathlon (1500m swim, 40km bike, 10km run)
  olympicTriathlon: [
    {
      name: 'Aerobic Base I',
      phase: 'base',
      weeks: 6,
      goal: 'Build large aerobic base for longer distances',
      template: ['bike', 'run', 'rest', 'strength', 'bike', 'run', 'mobility'],
      volumeMultiplier: 1.0
    },
    {
      name: 'Aerobic Base II',
      phase: 'base',
      weeks: 6,
      goal: 'Add volume and introduce longer brick sessions',
      template: ['run', 'bike', 'strength', 'brick', 'rest', 'bike', 'mobility'],
      volumeMultiplier: 1.2
    },
    {
      name: 'Threshold Build I',
      phase: 'build',
      weeks: 4,
      goal: 'Develop lactate threshold across all disciplines',
      template: ['run', 'brick', 'bike', 'rest', 'run', 'strength', 'mobility'],
      volumeMultiplier: 1.1,
      intensityMultiplier: 1.1
    },
    {
      name: 'Threshold Build II',
      phase: 'build',
      weeks: 4,
      goal: 'Race-specific intensities and longer bricks',
      template: ['brick', 'run', 'bike', 'strength', 'brick', 'run', 'mobility'],
      volumeMultiplier: 1.0,
      intensityMultiplier: 1.3
    },
    {
      name: 'Peak Preparation',
      phase: 'peak',
      weeks: 3,
      goal: 'Fine-tune race fitness and practice fueling',
      template: ['brick', 'run', 'rest', 'bike', 'brick', 'strength', 'mobility'],
      volumeMultiplier: 0.9,
      intensityMultiplier: 1.2
    },
    {
      name: 'Final Taper',
      phase: 'taper',
      weeks: 3,
      goal: 'Peak freshness for race day',
      template: ['rest', 'run', 'bike', 'rest', 'brick', 'mobility', 'rest'],
      volumeMultiplier: 0.5,
      intensityMultiplier: 0.7
    }
  ],

  // Off-season / Base Building
  offSeason: [
    {
      name: 'Active Recovery',
      phase: 'recovery',
      weeks: 4,
      goal: 'Mental and physical recovery from racing',
      template: ['rest', 'mobility', 'rest', 'run', 'rest', 'bike', 'mobility'],
      volumeMultiplier: 0.4
    },
    {
      name: 'Strength Focus',
      phase: 'base',
      weeks: 6,
      goal: 'Build strength and address limiters',
      template: ['strength', 'run', 'rest', 'strength', 'bike', 'run', 'mobility'],
      volumeMultiplier: 0.7
    },
    {
      name: 'Aerobic Development',
      phase: 'base',
      weeks: 8,
      goal: 'Build large aerobic engine for next season',
      template: ['bike', 'run', 'strength', 'bike', 'rest', 'run', 'mobility'],
      volumeMultiplier: 1.0
    }
  ],

  // Quick Race Prep (4-8 weeks)
  quickRacePrep: [
    {
      name: 'Base & Build',
      phase: 'build',
      weeks: 4,
      goal: 'Rapidly build fitness for upcoming race',
      template: ['run', 'bike', 'rest', 'brick', 'strength', 'run', 'mobility'],
      volumeMultiplier: 1.0,
      intensityMultiplier: 1.1
    },
    {
      name: 'Intensity Focus',
      phase: 'peak',
      weeks: 3,
      goal: 'Sharpen race-specific fitness',
      template: ['brick', 'run', 'bike', 'rest', 'brick', 'strength', 'mobility'],
      volumeMultiplier: 0.9,
      intensityMultiplier: 1.3
    },
    {
      name: 'Race Taper',
      phase: 'taper',
      weeks: 1,
      goal: 'Final preparation and recovery',
      template: ['rest', 'run', 'rest', 'bike', 'rest', 'mobility', 'rest'],
      volumeMultiplier: 0.5,
      intensityMultiplier: 0.6
    }
  ]
};

// Complete macro plan templates
export class TrainingTemplates {
  /**
   * Create a macro plan from a template
   */
  static createMacroPlanFromTemplate(
    template: string,
    startDate: string,
    eventDate: string,
    athleteAge: number,
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): MacroPlan {
    const mesocycles = MESOCYCLE_TEMPLATES[template];
    
    if (!mesocycles) {
      throw new Error(`Training template '${template}' not found`);
    }

    // Adjust templates based on fitness level
    const adjustedMesocycles = mesocycles.map(mesocycle => 
      this.adjustMesocycleForFitnessLevel(mesocycle, fitnessLevel)
    );

    return {
      startDate,
      eventDate,
      mesocycles: adjustedMesocycles,
      athlete: {
        age: athleteAge,
        fitnessLevel
      }
    };
  }

  /**
   * Get available template names
   */
  static getAvailableTemplates(): string[] {
    return Object.keys(MESOCYCLE_TEMPLATES);
  }

  /**
   * Get template description
   */
  static getTemplateDescription(template: string): string {
    const descriptions: Record<string, string> = {
      sprintTriathlon: 'Complete 16-week plan for sprint distance triathlon (750m/20km/5km)',
      olympicTriathlon: 'Comprehensive 26-week plan for Olympic distance triathlon (1500m/40km/10km)',
      offSeason: 'Off-season base building and recovery plan (18 weeks)',
      quickRacePrep: 'Rapid race preparation for short-notice events (8 weeks)'
    };

    return descriptions[template] || 'Custom training template';
  }

  /**
   * Adjust mesocycle for fitness level
   */
  private static adjustMesocycleForFitnessLevel(
    mesocycle: Mesocycle,
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): Mesocycle {
    // Use fitness-level specific templates if available
    const phaseTemplates = WEEKLY_TEMPLATES[mesocycle.phase];
    const levelTemplate = phaseTemplates?.[fitnessLevel];
    
    if (levelTemplate) {
      mesocycle = { ...mesocycle, template: levelTemplate };
    }

    // Adjust volume multipliers based on fitness level
    const volumeAdjustments = {
      beginner: 0.8,
      intermediate: 1.0,
      advanced: 1.2
    };

    const intensityAdjustments = {
      beginner: 0.9,
      intermediate: 1.0,
      advanced: 1.1
    };

    return {
      ...mesocycle,
      volumeMultiplier: (mesocycle.volumeMultiplier || 1.0) * volumeAdjustments[fitnessLevel],
      intensityMultiplier: (mesocycle.intensityMultiplier || 1.0) * intensityAdjustments[fitnessLevel]
    };
  }

  /**
   * Create a custom mesocycle
   */
  static createCustomMesocycle(
    name: string,
    phase: 'base' | 'build' | 'peak' | 'taper' | 'recovery',
    weeks: number,
    goal: string,
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  ): Mesocycle {
    const phaseTemplates = WEEKLY_TEMPLATES[phase];
    const template = phaseTemplates[fitnessLevel] || phaseTemplates.intermediate;

    return {
      name,
      phase,
      weeks,
      goal,
      template,
      volumeMultiplier: 1.0,
      intensityMultiplier: 1.0
    };
  }

  /**
   * Estimate total training time for a template
   */
  static estimateTrainingTime(template: string): {
    totalWeeks: number;
    hoursPerWeek: { min: number; max: number };
    totalHours: { min: number; max: number };
  } {
    const mesocycles = MESOCYCLE_TEMPLATES[template];
    if (!mesocycles) {
      return { totalWeeks: 0, hoursPerWeek: { min: 0, max: 0 }, totalHours: { min: 0, max: 0 } };
    }

    const totalWeeks = mesocycles.reduce((sum, m) => sum + m.weeks, 0);

    return {
      totalWeeks,
      hoursPerWeek: { min: 3, max: 12 }, // Range across all levels
      totalHours: { 
        min: totalWeeks * 3, 
        max: totalWeeks * 12 
      }
    };
  }
}