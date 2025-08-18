// Segment Display Component - renders workout segments in a readable format
import { 
  WorkoutSegment, 
  TimeBasedSegment,
  DistanceBasedSegment,
  RepBasedSegment,
  RoundBasedSegment,
  CustomSegment,
  SegmentGroup 
} from '../../types/workout.types';

export class SegmentDisplay {

  /**
   * Generate HTML for displaying workout segments
   */
  static generateSegmentsHTML(segments: WorkoutSegment[], segmentGroups?: SegmentGroup[]): string {
    if (!segments || segments.length === 0) {
      return '<p class="no-segments">No detailed segments available</p>';
    }

    let html = '<div class="workout-segments">';
    
    // Display segment groups first (if any)
    if (segmentGroups && segmentGroups.length > 0) {
      segmentGroups.forEach((group, groupIndex) => {
        html += this.generateSegmentGroupHTML(group, groupIndex);
      });
    }

    // Display individual segments
    const sortedSegments = [...segments].sort((a, b) => a.order - b.order);
    
    html += '<div class="segments-list">';
    sortedSegments.forEach((segment, index) => {
      html += this.generateSegmentHTML(segment, index);
    });
    html += '</div>';
    
    // Add workout summary
    html += this.generateWorkoutSummary(segments);
    
    html += '</div>';
    return html;
  }

  /**
   * Generate HTML for a segment group
   */
  private static generateSegmentGroupHTML(group: SegmentGroup, groupIndex: number): string {
    return `
      <div class="segment-group" data-group-id="${group.id}">
        <div class="segment-group-header">
          <h4 class="segment-group-name">
            <span class="group-icon">🔄</span>
            ${group.name}
            ${group.repeatCount && group.repeatCount > 1 ? `<span class="repeat-count">× ${group.repeatCount}</span>` : ''}
          </h4>
          ${group.description ? `<p class="segment-group-description">${group.description}</p>` : ''}
        </div>
        
        <div class="segment-group-segments">
          ${group.segments.map((segment, segmentIndex) => 
            this.generateSegmentHTML(segment, segmentIndex, true)
          ).join('')}
        </div>
        
        ${group.restBetweenRepeatsMin ? `
          <div class="group-rest-info">
            <span class="rest-icon">⏳</span>
            ${group.restBetweenRepeatsMin}min rest between repeats
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate HTML for a single segment
   */
  private static generateSegmentHTML(segment: WorkoutSegment, index: number, inGroup: boolean = false): string {
    const segmentClass = `segment segment-${segment.type} segment-${segment.measurement}`;
    const segmentIcon = this.getSegmentIcon(segment.type);
    const segmentColor = this.getSegmentColor(segment.type);
    
    return `
      <div class="${segmentClass}" data-segment-id="${segment.id}" style="border-left-color: ${segmentColor}">
        <div class="segment-header">
          <div class="segment-title">
            <span class="segment-number">${inGroup ? '' : index + 1}</span>
            <span class="segment-icon">${segmentIcon}</span>
            <span class="segment-name">${segment.name}</span>
            <span class="segment-type-badge ${segment.type}">${this.formatSegmentType(segment.type)}</span>
          </div>
          ${segment.description ? `<div class="segment-description">${segment.description}</div>` : ''}
        </div>
        
        <div class="segment-content">
          ${this.generateSegmentSpecificContent(segment)}
        </div>
        
        ${segment.notes ? `<div class="segment-notes"><strong>Notes:</strong> ${segment.notes}</div>` : ''}
        
        ${segment.restAfterMin ? `
          <div class="segment-rest">
            <span class="rest-icon">⏳</span>
            <span class="rest-duration">${segment.restAfterMin}min rest</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate content specific to segment type
   */
  private static generateSegmentSpecificContent(segment: WorkoutSegment): string {
    switch (segment.measurement) {
      case 'time':
        return this.generateTimeBasedContent(segment as TimeBasedSegment);
      case 'distance':
        return this.generateDistanceBasedContent(segment as DistanceBasedSegment);
      case 'reps':
        return this.generateRepBasedContent(segment as RepBasedSegment);
      case 'rounds':
        return this.generateRoundBasedContent(segment as RoundBasedSegment);
      case 'custom':
        return this.generateCustomContent(segment as CustomSegment);
      default:
        return '<div class="segment-info">Basic segment</div>';
    }
  }

  /**
   * Generate content for time-based segments
   */
  private static generateTimeBasedContent(segment: TimeBasedSegment): string {
    let content = '<div class="segment-metrics">';
    
    // Duration
    const duration = segment.durationSec 
      ? `${segment.durationMin}:${segment.durationSec.toString().padStart(2, '0')}` 
      : `${segment.durationMin} min`;
    content += `<div class="metric duration"><span class="metric-icon">⏱️</span><span class="metric-value">${duration}</span></div>`;
    
    // Heart rate targets
    if (segment.targetHRZone) {
      content += `<div class="metric hr-zone"><span class="metric-icon">❤️</span><span class="metric-value">Zone ${segment.targetHRZone}</span></div>`;
    } else if (segment.targetHR) {
      content += `<div class="metric hr-target"><span class="metric-icon">❤️</span><span class="metric-value">${segment.targetHR} bpm</span></div>`;
    }
    
    // Pace target
    if (segment.targetPace) {
      content += `<div class="metric pace"><span class="metric-icon">🏃</span><span class="metric-value">${segment.targetPace}/km</span></div>`;
    }
    
    // Power target
    if (segment.targetPower) {
      content += `<div class="metric power"><span class="metric-icon">⚡</span><span class="metric-value">${segment.targetPower}W</span></div>`;
    }
    
    // RPE target
    if (segment.targetRPE) {
      content += `<div class="metric rpe"><span class="metric-icon">💪</span><span class="metric-value">RPE ${segment.targetRPE}/10</span></div>`;
    }
    
    content += '</div>';
    return content;
  }

  /**
   * Generate content for distance-based segments
   */
  private static generateDistanceBasedContent(segment: DistanceBasedSegment): string {
    let content = '<div class="segment-metrics">';
    
    // Distance
    content += `<div class="metric distance"><span class="metric-icon">📏</span><span class="metric-value">${segment.distanceKm} km</span></div>`;
    
    // Pace target
    if (segment.targetPace) {
      content += `<div class="metric pace"><span class="metric-icon">🏃</span><span class="metric-value">${segment.targetPace}/km</span></div>`;
    }
    
    // Heart rate targets
    if (segment.targetHRZone) {
      content += `<div class="metric hr-zone"><span class="metric-icon">❤️</span><span class="metric-value">Zone ${segment.targetHRZone}</span></div>`;
    } else if (segment.targetHR) {
      content += `<div class="metric hr-target"><span class="metric-icon">❤️</span><span class="metric-value">${segment.targetHR} bpm</span></div>`;
    }
    
    // Power target
    if (segment.targetPower) {
      content += `<div class="metric power"><span class="metric-icon">⚡</span><span class="metric-value">${segment.targetPower}W</span></div>`;
    }
    
    // RPE target
    if (segment.targetRPE) {
      content += `<div class="metric rpe"><span class="metric-icon">💪</span><span class="metric-value">RPE ${segment.targetRPE}/10</span></div>`;
    }
    
    content += '</div>';
    return content;
  }

  /**
   * Generate content for rep-based segments (strength training)
   */
  private static generateRepBasedContent(segment: RepBasedSegment): string {
    let content = '<div class="segment-metrics">';
    
    // Sets and reps
    if (segment.sets && segment.sets > 1) {
      content += `<div class="metric sets-reps"><span class="metric-icon">🔢</span><span class="metric-value">${segment.sets} × ${segment.reps}</span></div>`;
    } else {
      content += `<div class="metric reps"><span class="metric-icon">🔢</span><span class="metric-value">${segment.reps} reps</span></div>`;
    }
    
    // Weight
    if (segment.weight) {
      content += `<div class="metric weight"><span class="metric-icon">🏋️</span><span class="metric-value">${segment.weight} ${segment.weightUnit || 'kg'}</span></div>`;
    }
    
    // Equipment
    if (segment.equipment) {
      content += `<div class="metric equipment"><span class="metric-icon">🔧</span><span class="metric-value">${this.formatEquipment(segment.equipment)}</span></div>`;
    }
    
    // RPE target
    if (segment.targetRPE) {
      content += `<div class="metric rpe"><span class="metric-icon">💪</span><span class="metric-value">RPE ${segment.targetRPE}/10</span></div>`;
    }
    
    content += '</div>';
    
    // Exercise details
    if (segment.exercise || segment.muscleGroups) {
      content += '<div class="exercise-details">';
      
      if (segment.exercise) {
        content += `<div class="exercise-name"><strong>Exercise:</strong> ${this.formatExerciseName(segment.exercise)}</div>`;
      }
      
      if (segment.muscleGroups && segment.muscleGroups.length > 0) {
        content += `<div class="muscle-groups"><strong>Targets:</strong> ${segment.muscleGroups.map(group => this.formatMuscleGroup(group)).join(', ')}</div>`;
      }
      
      content += '</div>';
    }
    
    // Rest information
    if (segment.restBetweenSetsMin) {
      content += `<div class="rest-info"><span class="rest-icon">⏳</span> ${segment.restBetweenSetsMin}min rest between sets</div>`;
    }
    
    return content;
  }

  /**
   * Generate content for round-based segments
   */
  private static generateRoundBasedContent(segment: RoundBasedSegment): string {
    let content = '<div class="segment-metrics">';
    
    // Rounds
    content += `<div class="metric rounds"><span class="metric-icon">🔄</span><span class="metric-value">${segment.rounds} rounds</span></div>`;
    
    // Work/rest times
    content += `<div class="metric work-time"><span class="metric-icon">⏱️</span><span class="metric-value">${segment.workTimeMin}min work</span></div>`;
    content += `<div class="metric rest-time"><span class="metric-icon">⏳</span><span class="metric-value">${segment.restTimeMin}min rest</span></div>`;
    
    // Heart rate target
    if (segment.targetHR) {
      content += `<div class="metric hr-target"><span class="metric-icon">❤️</span><span class="metric-value">${segment.targetHR} bpm</span></div>`;
    }
    
    // RPE target
    if (segment.targetRPE) {
      content += `<div class="metric rpe"><span class="metric-icon">💪</span><span class="metric-value">RPE ${segment.targetRPE}/10</span></div>`;
    }
    
    content += '</div>';
    
    // Exercises list
    if (segment.exercises && segment.exercises.length > 0) {
      content += '<div class="round-exercises">';
      content += '<div class="exercises-label"><strong>Exercises:</strong></div>';
      content += '<ul class="exercises-list">';
      segment.exercises.forEach(exercise => {
        content += `<li class="exercise-item">${exercise}</li>`;
      });
      content += '</ul>';
      content += '</div>';
    }
    
    return content;
  }

  /**
   * Generate content for custom segments
   */
  private static generateCustomContent(segment: CustomSegment): string {
    let content = '<div class="segment-metrics">';
    
    // Custom measurement
    content += `<div class="metric custom-measurement"><span class="metric-icon">📊</span><span class="metric-value">${segment.customValue} ${segment.customMeasurement}</span></div>`;
    
    content += '</div>';
    
    // Custom instructions
    if (segment.customInstructions) {
      content += `<div class="custom-instructions"><strong>Instructions:</strong> ${segment.customInstructions}</div>`;
    }
    
    return content;
  }

  /**
   * Generate workout summary
   */
  private static generateWorkoutSummary(segments: WorkoutSegment[]): string {
    const totalDuration = this.calculateTotalDuration(segments);
    const segmentCount = segments.length;
    const segmentTypes = [...new Set(segments.map(s => s.type))];
    
    return `
      <div class="workout-summary">
        <h5>Workout Summary</h5>
        <div class="summary-metrics">
          <div class="summary-metric">
            <span class="summary-icon">⏱️</span>
            <span class="summary-label">Total Duration:</span>
            <span class="summary-value">${totalDuration} min</span>
          </div>
          <div class="summary-metric">
            <span class="summary-icon">🔢</span>
            <span class="summary-label">Segments:</span>
            <span class="summary-value">${segmentCount}</span>
          </div>
          <div class="summary-metric">
            <span class="summary-icon">🎯</span>
            <span class="summary-label">Focus:</span>
            <span class="summary-value">${segmentTypes.map(type => this.formatSegmentType(type)).join(', ')}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Utility methods
   */

  private static getSegmentIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'warmup': '🌡️',
      'cooldown': '❄️',
      'interval': '🔥',
      'tempo': '⚡',
      'recovery': '💚',
      'strength_set': '💪',
      'stretch': '🤸',
      'rest': '😴',
      'custom': '⚙️'
    };
    return iconMap[type] || '⚽';
  }

  private static getSegmentColor(type: string): string {
    const colorMap: Record<string, string> = {
      'warmup': '#fbbf24',     // Amber
      'cooldown': '#60a5fa',   // Blue
      'interval': '#ef4444',   // Red
      'tempo': '#f97316',      // Orange
      'recovery': '#22c55e',   // Green
      'strength_set': '#8b5cf6', // Purple
      'stretch': '#06b6d4',    // Cyan
      'rest': '#6b7280',       // Gray
      'custom': '#ec4899'      // Pink
    };
    return colorMap[type] || '#6b7280';
  }

  private static formatSegmentType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private static formatEquipment(equipment: string): string {
    return equipment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private static formatExerciseName(exercise: string): string {
    return exercise.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private static formatMuscleGroup(group: string): string {
    return group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private static calculateTotalDuration(segments: WorkoutSegment[]): number {
    return segments.reduce((total, segment) => {
      let segmentDuration = 0;
      
      switch (segment.measurement) {
        case 'time':
          segmentDuration = (segment as TimeBasedSegment).durationMin;
          break;
        case 'rounds':
          const roundSegment = segment as RoundBasedSegment;
          segmentDuration = roundSegment.rounds * (roundSegment.workTimeMin + roundSegment.restTimeMin);
          break;
        case 'reps':
          const repSegment = segment as RepBasedSegment;
          if (repSegment.restBetweenSetsMin && repSegment.sets) {
            segmentDuration += repSegment.restBetweenSetsMin * (repSegment.sets - 1);
          }
          break;
      }
      
      if (segment.restAfterMin) {
        segmentDuration += segment.restAfterMin;
      }
      
      return total + segmentDuration;
    }, 0);
  }
}

export default SegmentDisplay;