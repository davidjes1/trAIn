// Workout Comparison component - generates detailed planned vs actual analysis
import { TrackedWorkout, WorkoutComparison as WorkoutComparisonData } from '@/core/models';

export class WorkoutComparison {
  
  /**
   * Generate HTML for workout comparison panel
   */
  public generateComparisonHTML(workout: TrackedWorkout): string {
    if (workout.status === 'planned' && !workout.actualWorkout) {
      return this.generatePlannedOnlyHTML(workout);
    }

    if (workout.status === 'unplanned' && workout.actualWorkout) {
      return this.generateUnplannedHTML(workout);
    }

    if (workout.actualWorkout && workout.comparison) {
      return this.generateFullComparisonHTML(workout, workout.comparison);
    }

    return this.generateBasicWorkoutHTML(workout);
  }

  private generatePlannedOnlyHTML(workout: TrackedWorkout): string {
    const intensityColor = this.getIntensityColor(workout.expectedFatigue);
    const intensityLabel = this.getIntensityLabel(workout.expectedFatigue);
    const formattedDate = new Date(workout.date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
      <div class="workout-comparison-content">
        <div class="comparison-header">
          <div class="workout-status planned">
            <span class="status-icon">📅</span>
            <span class="status-text">Planned Workout</span>
          </div>
          <div class="workout-date">
            <span class="date-text">${formattedDate}</span>
          </div>
        </div>

        <div class="planned-workout-details">
          <h4>Planned Details</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="label">Workout Type</div>
              <div class="value">${this.formatWorkoutType(workout.workoutType)}</div>
            </div>
            <div class="detail-item">
              <div class="label">Duration</div>
              <div class="value">${workout.durationMin} <span class="unit">minutes</span></div>
            </div>
            <div class="detail-item">
              <div class="label">Expected Intensity</div>
              <div class="value" style="color: ${intensityColor}">${intensityLabel}</div>
            </div>
            <div class="detail-item">
              <div class="label">Expected Load</div>
              <div class="value">${(workout.expectedFatigue * 5).toFixed(0)} <span class="unit">TRIMP</span></div>
            </div>
          </div>

          <div class="workout-description">
            <h5>📝 Workout Description</h5>
            <p>${workout.description}</p>
          </div>

          ${workout.userNotes ? `
            <div class="user-notes">
              <h5>📋 Personal Notes</h5>
              <p>${workout.userNotes}</p>
            </div>
          ` : ''}

          <div class="workout-actions">
            <button class="btn btn-primary" onclick="markWorkoutCompleted('${workout.date}')">
              ✅ Mark as Completed
            </button>
            <button class="btn btn-secondary" onclick="editWorkout('${workout.date}')">
              ✏️ Edit Workout
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private generateUnplannedHTML(workout: TrackedWorkout): string {
    const actual = workout.actualWorkout!;
    
    return `
      <div class="workout-comparison-content">
        <div class="comparison-header">
          <div class="workout-status unplanned">
            <span class="status-icon">⚡</span>
            <span class="status-text">Unplanned Workout</span>
          </div>
        </div>

        <div class="actual-workout-details">
          <h4>Workout Summary</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="label">Sport</div>
              <div class="value">${actual.sport}</div>
            </div>
            <div class="detail-item">
              <div class="label">Duration</div>
              <div class="value">${actual.duration.toFixed(1)} minutes</div>
            </div>
            <div class="detail-item">
              <div class="label">Distance</div>
              <div class="value">${actual.distance.toFixed(2)} km</div>
            </div>
            <div class="detail-item">
              <div class="label">Training Load</div>
              <div class="value">${actual.trainingLoad.toFixed(0)} TRIMP</div>
            </div>
          </div>

          ${this.generateHeartRateSection(actual)}
          ${this.generateHRZonesChart(actual)}
          
          <div class="workout-actions">
            <button class="btn btn-secondary" onclick="addToPlannedWorkouts('${workout.date}')">
              Add to Future Plans
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private generateFullComparisonHTML(workout: TrackedWorkout, comparison: WorkoutComparisonData): string {
    const actual = workout.actualWorkout!;
    
    return `
      <div class="workout-comparison-content">
        <div class="comparison-header">
          <div class="workout-status completed">
            <span class="status-icon">✅</span>
            <span class="status-text">Completed Workout</span>
          </div>
          <div class="adherence-badge ${comparison.adherence.category}">
            ${comparison.adherence.score}/100
          </div>
        </div>

        ${this.generateComparisonOverview(comparison)}
        ${this.generateDetailedComparison(workout, comparison)}
        ${this.generatePerformanceAnalysis(comparison)}
        ${this.generateHeartRateSection(actual)}
        ${this.generateHRZonesComparison(comparison.intensityVariance.zoneCompliance)}
        ${this.generateFeedbackSection(comparison.adherence.feedback)}
        
        <div class="workout-actions">
          <button class="btn btn-secondary" onclick="viewFullActivity('${workout.date}')">
            View Full Activity
          </button>
          <button class="btn btn-secondary" onclick="addWorkoutNotes('${workout.date}')">
            Add Notes
          </button>
        </div>
      </div>
    `;
  }

  private generateBasicWorkoutHTML(workout: TrackedWorkout): string {
    return `
      <div class="workout-comparison-content">
        <div class="comparison-header">
          <div class="workout-status ${workout.status}">
            <span class="status-icon">${this.getStatusIcon(workout.status)}</span>
            <span class="status-text">${this.formatStatus(workout.status)}</span>
          </div>
        </div>

        <div class="basic-workout-details">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="label">Workout Type</div>
              <div class="value">${this.formatWorkoutType(workout.workoutType)}</div>
            </div>
            <div class="detail-item">
              <div class="label">Date</div>
              <div class="value">${new Date(workout.date).toLocaleDateString()}</div>
            </div>
            <div class="detail-item">
              <div class="label">Description</div>
              <div class="value">${workout.description}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateComparisonOverview(comparison: WorkoutComparisonData): string {
    const duration = comparison.durationVariance;
    const durationClass = this.getVarianceClass(duration.percentageChange);
    const durationSign = duration.percentageChange > 0 ? '+' : '';

    const loadVariance = comparison.performance.trainingLoadVariance;
    const loadClass = this.getVarianceClass(loadVariance, 10); // 10 TRIMP threshold

    return `
      <div class="comparison-overview">
        <h4>Performance Overview</h4>
        <div class="overview-metrics">
          <div class="metric-item">
            <div class="metric-label">Duration</div>
            <div class="metric-comparison">
              <span class="planned">${duration.planned}min</span>
              <span class="arrow">→</span>
              <span class="actual">${duration.actual}min</span>
              <span class="variance ${durationClass}">
                (${durationSign}${duration.percentageChange.toFixed(1)}%)
              </span>
            </div>
          </div>
          
          <div class="metric-item">
            <div class="metric-label">Training Load</div>
            <div class="metric-comparison">
              <span class="planned">${(comparison.intensityVariance.plannedFatigue * 5).toFixed(0)}</span>
              <span class="arrow">→</span>
              <span class="actual">${loadVariance > 0 ? '+' : ''}${loadVariance.toFixed(0)}</span>
              <span class="variance ${loadClass}">TRIMP</span>
            </div>
          </div>

          <div class="metric-item">
            <div class="metric-label">Zone Compliance</div>
            <div class="metric-value">
              <span class="compliance-score ${this.getComplianceClass(comparison.intensityVariance.zoneCompliance.compliance.overallCompliance)}">
                ${comparison.intensityVariance.zoneCompliance.compliance.overallCompliance.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateDetailedComparison(workout: TrackedWorkout, comparison: WorkoutComparisonData): string {
    const actual = workout.actualWorkout!;
    
    return `
      <div class="detailed-comparison">
        <h4>Planned vs Actual</h4>
        <div class="comparison-table">
          <div class="comparison-row header">
            <div class="metric-name">Metric</div>
            <div class="planned-value">Planned</div>
            <div class="actual-value">Actual</div>
            <div class="variance-value">Variance</div>
          </div>
          
          <div class="comparison-row">
            <div class="metric-name">Duration</div>
            <div class="planned-value">${comparison.durationVariance.planned} min</div>
            <div class="actual-value">${comparison.durationVariance.actual} min</div>
            <div class="variance-value ${this.getVarianceClass(comparison.durationVariance.percentageChange)}">
              ${comparison.durationVariance.difference > 0 ? '+' : ''}${comparison.durationVariance.difference} min
            </div>
          </div>

          <div class="comparison-row">
            <div class="metric-name">Intensity</div>
            <div class="planned-value">${comparison.intensityVariance.plannedFatigue}/100</div>
            <div class="actual-value">${comparison.intensityVariance.actualFatigue.toFixed(0)}/100</div>
            <div class="variance-value ${this.getVarianceClass(comparison.intensityVariance.difference, 5)}">
              ${comparison.intensityVariance.difference > 0 ? '+' : ''}${comparison.intensityVariance.difference.toFixed(0)}
            </div>
          </div>

          ${actual.distance ? `
            <div class="comparison-row">
              <div class="metric-name">Distance</div>
              <div class="planned-value">Est.</div>
              <div class="actual-value">${actual.distance.toFixed(2)} km</div>
              <div class="variance-value neutral">-</div>
            </div>
          ` : ''}

          ${actual.avgHR ? `
            <div class="comparison-row">
              <div class="metric-name">Avg Heart Rate</div>
              <div class="planned-value">Est.</div>
              <div class="actual-value">${actual.avgHR} bpm</div>
              <div class="variance-value neutral">-</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private generatePerformanceAnalysis(comparison: WorkoutComparisonData): string {
    const performance = comparison.performance;
    
    return `
      <div class="performance-analysis">
        <h4>Performance Analysis</h4>
        <div class="analysis-items">
          ${performance.hrDrift !== undefined ? `
            <div class="analysis-item">
              <div class="analysis-label">HR Drift</div>
              <div class="analysis-value ${this.getHRDriftClass(performance.hrDrift)}">
                ${performance.hrDrift.toFixed(1)}%
              </div>
              <div class="analysis-description">
                ${this.getHRDriftDescription(performance.hrDrift)}
              </div>
            </div>
          ` : ''}

          ${performance.paceConsistency !== undefined ? `
            <div class="analysis-item">
              <div class="analysis-label">Pace Consistency</div>
              <div class="analysis-value ${this.getPaceConsistencyClass(performance.paceConsistency)}">
                CV: ${(performance.paceConsistency * 100).toFixed(1)}%
              </div>
              <div class="analysis-description">
                ${this.getPaceConsistencyDescription(performance.paceConsistency)}
              </div>
            </div>
          ` : ''}

          <div class="analysis-item">
            <div class="analysis-label">Training Load Impact</div>
            <div class="analysis-value ${this.getVarianceClass(performance.trainingLoadVariance, 10)}">
              ${performance.trainingLoadVariance > 0 ? '+' : ''}${performance.trainingLoadVariance.toFixed(0)} TRIMP
            </div>
            <div class="analysis-description">
              ${this.getLoadImpactDescription(performance.trainingLoadVariance)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateHeartRateSection(actual: any): string {
    if (!actual.avgHR) return '';

    return `
      <div class="heart-rate-section">
        <h4>Heart Rate Analysis</h4>
        <div class="hr-metrics">
          <div class="hr-metric">
            <div class="hr-label">Average</div>
            <div class="hr-value">${actual.avgHR} bpm</div>
          </div>
          ${actual.maxHR ? `
            <div class="hr-metric">
              <div class="hr-label">Maximum</div>
              <div class="hr-value">${actual.maxHR} bpm</div>
            </div>
          ` : ''}
          ${actual.hrDrift !== undefined ? `
            <div class="hr-metric">
              <div class="hr-label">HR Drift</div>
              <div class="hr-value ${this.getHRDriftClass(actual.hrDrift)}">${actual.hrDrift.toFixed(1)}%</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private generateHRZonesChart(actual: any): string {
    const zones = [
      { name: 'Z1', minutes: actual.zone1Minutes, color: '#4CAF50' },
      { name: 'Z2', minutes: actual.zone2Minutes, color: '#8BC34A' },
      { name: 'Z3', minutes: actual.zone3Minutes, color: '#FFC107' },
      { name: 'Z4', minutes: actual.zone4Minutes, color: '#FF9800' },
      { name: 'Z5', minutes: actual.zone5Minutes, color: '#F44336' }
    ];

    const totalTime = zones.reduce((sum, zone) => sum + zone.minutes, 0);
    
    return `
      <div class="hr-zones-section">
        <h4>Heart Rate Zones</h4>
        <div class="zones-chart">
          ${zones.map(zone => {
            const percentage = totalTime > 0 ? (zone.minutes / totalTime) * 100 : 0;
            return `
              <div class="zone-bar">
                <div class="zone-label">${zone.name}</div>
                <div class="zone-bar-track">
                  <div class="zone-bar-fill" style="width: ${percentage}%; background-color: ${zone.color}"></div>
                </div>
                <div class="zone-time">${zone.minutes.toFixed(1)}min</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private generateHRZonesComparison(zoneCompliance: any): string {
    const zones = ['zone1', 'zone2', 'zone3', 'zone4', 'zone5'];
    const zoneNames = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
    
    return `
      <div class="hr-zones-comparison">
        <h4>Zone Distribution Comparison</h4>
        <div class="zones-comparison-chart">
          ${zones.map((zone, index) => {
            const planned = zoneCompliance.plannedZones[zone];
            const actual = zoneCompliance.actualZones[zone];
            const variance = zoneCompliance.compliance[`${zone}Variance`];
            const varianceClass = this.getVarianceClass(variance, 2); // 2 minute threshold
            
            return `
              <div class="zone-comparison-row">
                <div class="zone-name">${zoneNames[index]}</div>
                <div class="zone-planned">${planned.toFixed(1)}min</div>
                <div class="zone-actual">${actual.toFixed(1)}min</div>
                <div class="zone-variance ${varianceClass}">
                  ${variance > 0 ? '+' : ''}${variance.toFixed(1)}min
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="overall-compliance">
          <strong>Overall Zone Compliance: ${zoneCompliance.compliance.overallCompliance.toFixed(1)}%</strong>
        </div>
      </div>
    `;
  }

  private generateFeedbackSection(feedback: string[]): string {
    return `
      <div class="feedback-section">
        <h4>Workout Feedback</h4>
        <div class="feedback-list">
          ${feedback.map(item => `
            <div class="feedback-item">
              <span class="feedback-icon">💡</span>
              <span class="feedback-text">${item}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Helper methods
  private formatWorkoutType(type: string): string {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'planned': 'Planned',
      'completed': 'Completed',
      'missed': 'Missed',
      'unplanned': 'Unplanned'
    };
    return statusMap[status] || status;
  }

  private getStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      'planned': '📅',
      'completed': '✅',
      'missed': '❌',
      'unplanned': '⚡'
    };
    return iconMap[status] || '❓';
  }

  private getVarianceClass(variance: number, threshold = 5): string {
    if (Math.abs(variance) <= threshold) return 'neutral';
    return variance > 0 ? 'positive' : 'negative';
  }

  private getComplianceClass(compliance: number): string {
    if (compliance >= 90) return 'excellent';
    if (compliance >= 80) return 'good';
    if (compliance >= 70) return 'fair';
    return 'poor';
  }

  private getHRDriftClass(drift: number): string {
    if (Math.abs(drift) <= 3) return 'excellent';
    if (Math.abs(drift) <= 6) return 'good';
    if (Math.abs(drift) <= 10) return 'fair';
    return 'poor';
  }

  private getHRDriftDescription(drift: number): string {
    if (Math.abs(drift) <= 3) return 'Excellent heart rate control throughout workout';
    if (Math.abs(drift) <= 6) return 'Good heart rate stability';
    if (Math.abs(drift) <= 10) return 'Moderate heart rate drift - consider pacing';
    return 'High heart rate drift - review pacing strategy';
  }

  private getPaceConsistencyClass(cv: number): string {
    if (cv <= 0.05) return 'excellent';
    if (cv <= 0.1) return 'good';
    if (cv <= 0.15) return 'fair';
    return 'poor';
  }

  private getPaceConsistencyDescription(cv: number): string {
    if (cv <= 0.05) return 'Very consistent pacing throughout';
    if (cv <= 0.1) return 'Good pacing consistency';
    if (cv <= 0.15) return 'Moderate pace variation';
    return 'High pace variation - work on consistency';
  }

  private getLoadImpactDescription(variance: number): string {
    if (Math.abs(variance) <= 10) return 'Training load matched plan well';
    if (variance > 10) return 'Higher than planned training stimulus';
    return 'Lower than planned training stimulus';
  }

  private getIntensityColor(intensity: number): string {
    if (intensity < 30) return '#4CAF50'; // Green - Easy
    if (intensity < 60) return '#FF9800'; // Orange - Moderate
    if (intensity < 80) return '#F44336'; // Red - Hard
    return '#9C27B0'; // Purple - Very Hard
  }

  private getIntensityLabel(intensity: number): string {
    if (intensity < 30) return 'Easy';
    if (intensity < 60) return 'Moderate';
    if (intensity < 80) return 'Hard';
    return 'Very Hard';
  }
}