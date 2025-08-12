// Training Plan Manager - handles the training plan UI and interactions
import { PlanGenerator } from '../../services/PlanGenerator';
import { PeriodizationService } from '../../services/PeriodizationService';
import { PlanAdjustmentService } from '../../services/PlanAdjustmentService';
import { WorkoutStorageService } from '../../services/WorkoutStorageService';
import WorkoutPlanIntegration from '../../services/WorkoutPlanIntegration';
import { TrainingTemplates } from '../../config/training-templates';
import { 
  PlanOptions, 
  TrainingPlan, 
  PlanGenerationResult,
  MacroPlan,
  WorkoutModification,
  WorkoutModificationType,
  PlanAdjustmentResult
} from '../../types/training-metrics.types';
import { UIHelpers } from '../../utils/ui-helpers';
import { AIService } from '../../ai/AIService';

export class TrainingPlanManager {
  private currentPlan: PlanGenerationResult | null = null;
  private currentMacroPlan: MacroPlan | null = null;
  private planModifications: WorkoutModification[] = [];
  private aiInsightsEnabled = true;

  constructor() {
    this.initializeEventListeners();
    this.initializeTemplateDescriptions();
    this.setDefaultEventDate();
    this.loadSavedPlan();
  }

  private initializeEventListeners(): void {
    // Generate plan button
    const generateBtn = document.getElementById('generate-plan-btn');
    generateBtn?.addEventListener('click', () => this.generatePlan());

    // Export buttons
    const exportCsvBtn = document.getElementById('export-csv-btn');
    exportCsvBtn?.addEventListener('click', () => this.exportToCSV());
    
    const exportSheetsBtn = document.getElementById('export-sheets-btn');
    exportSheetsBtn?.addEventListener('click', () => this.exportToSheets());

    // Regenerate button
    const regenerateBtn = document.getElementById('regenerate-plan-btn');
    regenerateBtn?.addEventListener('click', () => this.regeneratePlan());

    // AI recommendation button
    const aiRecommendBtn = document.getElementById('ai-recommend-btn');
    aiRecommendBtn?.addEventListener('click', () => this.getAIRecommendation());

    // Template selection change
    const templateSelect = document.getElementById('plan-template') as HTMLSelectElement;
    templateSelect?.addEventListener('change', () => this.updateTemplateDescription());

    // Close modification modal
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('workout-modification-modal');
      if (e.target === modal) {
        this.closeModificationModal();
      }
    });

    // Handle Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModificationModal();
      }
    });
  }

  private initializeTemplateDescriptions(): void {
    this.updateTemplateDescription();
  }

  private setDefaultEventDate(): void {
    const eventDateInput = document.getElementById('event-date') as HTMLInputElement;
    if (eventDateInput && !eventDateInput.value) {
      // Set default to 12 weeks from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + (12 * 7));
      eventDateInput.value = defaultDate.toISOString().split('T')[0];
    }
  }

  private updateTemplateDescription(): void {
    const templateSelect = document.getElementById('plan-template') as HTMLSelectElement;
    const descriptionEl = document.getElementById('template-description');
    
    if (!templateSelect || !descriptionEl) return;

    const selectedTemplate = templateSelect.value;
    
    const descriptions: Record<string, string> = {
      dynamic: 'Generates an adaptive plan based on your current fitness and recovery status',
      sprintTriathlon: 'Complete 16-week plan for sprint distance triathlon (750m/20km/5km)',
      olympicTriathlon: 'Comprehensive 26-week plan for Olympic distance triathlon (1500m/40km/10km)',
      quickRacePrep: 'Rapid race preparation for short-notice events (8 weeks)',
      offSeason: 'Off-season base building and recovery plan (18 weeks)'
    };

    descriptionEl.textContent = descriptions[selectedTemplate] || 'Custom training template';
  }

  private async generatePlan(): Promise<void> {
    try {
      UIHelpers.showStatus('Generating your personalized training plan...', 'info');
      
      const planOptions = this.gatherPlanOptions();
      const templateType = (document.getElementById('plan-template') as HTMLSelectElement).value;

      // Generate plan based on template type
      if (templateType === 'dynamic') {
        // Use dynamic plan generator
        this.currentPlan = PlanGenerator.generatePlan(planOptions);
        this.currentMacroPlan = null;
      } else {
        // Use structured periodization
        this.currentMacroPlan = TrainingTemplates.createMacroPlanFromTemplate(
          templateType,
          new Date().toISOString().split('T')[0], // Start today
          planOptions.user.eventDate,
          planOptions.user.age,
          planOptions.user.fitnessLevel
        );
        
        const structuredPlan = PeriodizationService.generateStructuredPlan(this.currentMacroPlan);
        
        // Convert to dynamic plan format for display
        this.currentPlan = {
          plan: structuredPlan.slice(0, planOptions.planDuration), // Show only requested duration
          readinessMetrics: {
            score: 75, // Default score for structured plans
            fatigue7DayAvg: 45,
            recoveryScore: 70,
            trainingLoad7Day: 250,
            recentHardDays: 1
          },
          recommendations: [`Following ${templateType} training template`, 'Plan adapted for your fitness level'],
          warnings: [],
          generatedAt: new Date().toISOString()
        };
      }

      // Save the plan to unified WorkoutService (new approach)
      await this.saveGeneratedPlanAsWorkouts();

      // Also save to legacy storage system for backward compatibility
      await this.savePlanToStorage();

      this.displayGeneratedPlan();
      UIHelpers.showStatus('Training plan generated and saved successfully!', 'success');
      
    } catch (error) {
      console.error('Error generating plan:', error);
      UIHelpers.showStatus('Failed to generate training plan. Please check your settings.', 'error');
    }
  }

  private gatherPlanOptions(): PlanOptions {
    // Gather form values
    const age = parseInt((document.getElementById('athlete-age') as HTMLInputElement).value) || 30;
    const sex = (document.getElementById('athlete-sex') as HTMLSelectElement).value as 'male' | 'female' | 'other';
    const fitnessLevel = (document.getElementById('fitness-level') as HTMLSelectElement).value as 'beginner' | 'intermediate' | 'advanced';
    const trainingDays = parseInt((document.getElementById('training-days') as HTMLInputElement).value) || 5;
    const eventDate = (document.getElementById('event-date') as HTMLInputElement).value;
    const planDuration = parseInt((document.getElementById('plan-duration') as HTMLInputElement).value) || 10;
    const currentPhase = (document.getElementById('training-phase') as HTMLSelectElement).value;

    // Recovery metrics
    const bodyBattery = parseInt((document.getElementById('body-battery') as HTMLInputElement).value) || undefined;
    const sleepScore = parseInt((document.getElementById('sleep-score') as HTMLInputElement).value) || undefined;
    const hrv = parseInt((document.getElementById('hrv') as HTMLInputElement).value) || undefined;
    const restingHR = parseInt((document.getElementById('resting-hr') as HTMLInputElement).value) || undefined;

    // Generate sample recent data (in real app, this would come from activity data)
    const recentFatigueScores = this.generateSampleFatigueScores();
    const recentWorkouts = this.generateSampleWorkouts();

    return {
      user: {
        age,
        sex,
        eventDate: eventDate || this.getDefaultEventDate(),
        trainingDays,
        fitnessLevel
      },
      recoveryMetrics: {
        bodyBattery,
        sleepScore,
        hrv,
        restingHR
      },
      recentFatigueScores,
      recentWorkouts,
      planDuration,
      currentPhase: currentPhase as any || undefined,
      availabilityToday: true
    };
  }

  private generateSampleFatigueScores(): number[] {
    // Generate realistic fatigue scores for last 7 days (lower = better recovery)
    const scores = [];
    for (let i = 0; i < 7; i++) {
      scores.push(Math.floor(Math.random() * 30) + 20); // 20-50 range (moderate fatigue)
    }
    return scores;
  }

  private generateSampleWorkouts(): any[] {
    // Generate sample recent workouts
    const workouts = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      if (Math.random() > 0.3) { // 70% chance of workout
        workouts.push({
          date: date.toISOString().split('T')[0],
          type: ['run', 'bike', 'strength'][Math.floor(Math.random() * 3)],
          duration: Math.floor(Math.random() * 60) + 30,
          fatigue: Math.floor(Math.random() * 40) + 20, // 20-60 range (more realistic)
          trainingLoad: Math.floor(Math.random() * 60) + 30
        });
      }
    }
    
    return workouts;
  }

  private getDefaultEventDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + (12 * 7)); // 12 weeks from now
    return date.toISOString().split('T')[0];
  }

  private displayGeneratedPlan(): void {
    if (!this.currentPlan) return;

    // Show the generated plan section
    const planSection = document.getElementById('generatedPlanSection');
    if (planSection) {
      planSection.style.display = 'block';
    }

    // Update plan metadata
    this.updatePlanMetadata();

    // Display readiness summary
    this.displayReadinessSummary();

    // Display workout calendar
    this.displayWorkoutCalendar();

    // Enable export buttons
    const exportCsvBtn = document.getElementById('export-csv-btn') as HTMLButtonElement;
    const exportSheetsBtn = document.getElementById('export-sheets-btn') as HTMLButtonElement;
    
    if (exportCsvBtn) exportCsvBtn.disabled = false;
    if (exportSheetsBtn) exportSheetsBtn.disabled = false;
  }

  private updatePlanMetadata(): void {
    if (!this.currentPlan) return;

    const metaEl = document.getElementById('plan-meta');
    if (metaEl) {
      const planStart = this.currentPlan.plan[0]?.date;
      const planEnd = this.currentPlan.plan[this.currentPlan.plan.length - 1]?.date;
      metaEl.textContent = `${this.currentPlan.plan.length} days • ${planStart} to ${planEnd}`;
    }
  }

  private displayReadinessSummary(): void {
    if (!this.currentPlan) return;

    const { readinessMetrics, recommendations, warnings } = this.currentPlan;

    // Update readiness score
    const scoreEl = document.getElementById('readiness-score-display');
    if (scoreEl) {
      scoreEl.textContent = `${Math.round(readinessMetrics.score)}/100`;
      scoreEl.className = `readiness-score-large ${this.getReadinessClass(readinessMetrics.score)}`;
    }

    // Update indicators
    const indicatorsEl = document.getElementById('readiness-indicators');
    if (indicatorsEl) {
      indicatorsEl.innerHTML = this.generateReadinessIndicators(readinessMetrics);
    }

    // Update recommendations
    const recommendationsEl = document.getElementById('recommendations-list');
    if (recommendationsEl) {
      recommendationsEl.innerHTML = recommendations
        .map(rec => `<li>${rec}</li>`)
        .join('');
    }

    // Update warnings
    const warningsCard = document.getElementById('warnings-card');
    const warningsEl = document.getElementById('warnings-list');
    
    if (warnings.length > 0 && warningsCard && warningsEl) {
      warningsCard.style.display = 'block';
      warningsEl.innerHTML = warnings
        .map(warning => `<li>${warning}</li>`)
        .join('');
    } else if (warningsCard) {
      warningsCard.style.display = 'none';
    }
  }

  private displayWorkoutCalendar(): void {
    if (!this.currentPlan) return;

    const cardsContainer = document.getElementById('workout-cards');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = this.currentPlan.plan
      .map(workout => this.createWorkoutCard(workout))
      .join('');
    
    // Add click event listeners to workout cards
    this.attachWorkoutCardListeners();
  }

  private createWorkoutCard(workout: TrainingPlan): string {
    const fatigueSeverity = this.getFatigueSeverity(workout.expectedFatigue);
    const fatigueClass = this.getFatigueClass(workout.expectedFatigue);
    const fatigueWidth = Math.min(100, workout.expectedFatigue);

    const workoutDate = new Date(workout.date);
    const dayName = workoutDate.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = workoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <div class="workout-card workout-${fatigueSeverity}" data-date="${workout.date}">
        <div class="workout-header">
          <div class="workout-date">${dayName}, ${dateStr}</div>
          <button class="modify-workout-btn" data-date="${workout.date}" title="Modify workout">
            <span>⚙️</span>
          </button>
        </div>
        <div class="workout-type">${workout.workoutType}</div>
        <div class="workout-description">${workout.description}</div>
        <div class="workout-stats">
          <div class="workout-duration">${workout.durationMin} min</div>
          <div class="workout-fatigue">
            <div class="fatigue-bar">
              <div class="fatigue-fill ${fatigueClass}" style="width: ${fatigueWidth}%"></div>
            </div>
            <div class="fatigue-value">${workout.expectedFatigue}</div>
          </div>
        </div>
        ${this.getModificationIndicator(workout.date)}
      </div>
    `;
  }

  private generateReadinessIndicators(metrics: any): string {
    const indicators = [];
    
    if (metrics.fatigue7DayAvg < 50) {
      indicators.push('<div class="indicator">Low Fatigue</div>');
    } else if (metrics.fatigue7DayAvg > 70) {
      indicators.push('<div class="indicator">High Fatigue</div>');
    }
    
    if (metrics.recentHardDays <= 1) {
      indicators.push('<div class="indicator">Well Recovered</div>');
    } else if (metrics.recentHardDays >= 3) {
      indicators.push('<div class="indicator">High Load</div>');
    }
    
    if (metrics.daysUntilRace && metrics.daysUntilRace <= 14) {
      indicators.push('<div class="indicator">Race Soon</div>');
    }

    return indicators.join('');
  }

  private getReadinessClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  private getFatigueSeverity(fatigue: number): string {
    if (fatigue <= 40) return 'low';
    if (fatigue <= 65) return 'moderate';
    if (fatigue <= 85) return 'hard';
    return 'extreme';
  }

  private getFatigueClass(fatigue: number): string {
    if (fatigue <= 40) return 'low';
    if (fatigue <= 65) return 'moderate';
    if (fatigue <= 85) return 'hard';
    return 'extreme';
  }

  private async exportToCSV(): Promise<void> {
    if (!this.currentPlan) return;

    try {
      const csvContent = PlanGenerator.exportPlanToCSV(this.currentPlan.plan);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-plan-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      UIHelpers.showStatus('Training plan exported to CSV successfully!', 'success');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      UIHelpers.showStatus('Failed to export plan to CSV', 'error');
    }
  }

  private async exportToSheets(): Promise<void> {
    if (!this.currentPlan) return;

    try {
      UIHelpers.showStatus('Exporting to Google Sheets...', 'info');
      
      // Here you would integrate with the Google Sheets service
      // For now, show a placeholder message
      UIHelpers.showStatus('Google Sheets export coming soon! Use CSV export for now.', 'info');
      
    } catch (error) {
      console.error('Error exporting to Sheets:', error);
      UIHelpers.showStatus('Failed to export plan to Google Sheets', 'error');
    }
  }

  private async regeneratePlan(): Promise<void> {
    await this.generatePlan();
  }

  /**
   * Workout Modification Methods
   */
  private attachWorkoutCardListeners(): void {
    const modifyButtons = document.querySelectorAll('.modify-workout-btn');
    modifyButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const date = (button as HTMLElement).dataset.date;
        if (date) {
          this.openModificationModal(date);
        }
      });
    });
  }

  private openModificationModal(date: string): void {
    if (!this.currentPlan) return;

    const workout = this.currentPlan.plan.find(w => w.date === date);
    if (!workout) return;

    this.createModificationModal(workout);
  }

  private createModificationModal(workout: TrainingPlan): void {
    // Remove existing modal if present
    const existingModal = document.getElementById('workout-modification-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'workout-modification-modal';
    modal.className = 'modification-modal';

    const workoutDate = new Date(workout.date);
    const dateStr = workoutDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Modify Workout - ${dateStr}</h3>
          <button class="close-modal-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="current-workout">
            <h4>Current Workout</h4>
            <div class="workout-summary">
              <div><strong>Type:</strong> ${workout.workoutType}</div>
              <div><strong>Duration:</strong> ${workout.durationMin} minutes</div>
              <div><strong>Intensity:</strong> ${workout.expectedFatigue}/100</div>
              <div><strong>Description:</strong> ${workout.description}</div>
            </div>
          </div>

          <div class="modification-options">
            <h4>Modification Options</h4>
            
            <div class="quick-actions">
              <button class="action-btn rest-btn" data-action="rest" data-date="${workout.date}">
                🛌 Make Rest Day
              </button>
              <button class="action-btn substitute-btn" data-action="substitute" data-date="${workout.date}">
                🔄 Substitute Workout
              </button>
            </div>

            <div class="custom-adjustments">
              <div class="adjustment-group">
                <label for="duration-adjustment">Duration (minutes):</label>
                <input type="number" id="duration-adjustment" value="${workout.durationMin}" min="0" max="180">
              </div>
              
              <div class="adjustment-group">
                <label for="intensity-adjustment">Intensity (0-100):</label>
                <input type="range" id="intensity-adjustment" value="${workout.expectedFatigue}" min="0" max="100">
                <span class="intensity-value">${workout.expectedFatigue}</span>
              </div>

              <div class="adjustment-group">
                <label for="workout-type-select">Workout Type:</label>
                <select id="workout-type-select">
                  <option value="run" ${workout.workoutType === 'run' ? 'selected' : ''}>Run</option>
                  <option value="bike" ${workout.workoutType === 'bike' ? 'selected' : ''}>Bike</option>
                  <option value="strength" ${workout.workoutType === 'strength' ? 'selected' : ''}>Strength</option>
                  <option value="brick" ${workout.workoutType === 'brick' ? 'selected' : ''}>Brick</option>
                  <option value="mobility" ${workout.workoutType === 'mobility' ? 'selected' : ''}>Mobility</option>
                  <option value="rest" ${workout.workoutType === 'rest' ? 'selected' : ''}>Rest</option>
                </select>
              </div>

              <div class="adjustment-group">
                <label for="modification-reason">Reason (optional):</label>
                <input type="text" id="modification-reason" placeholder="e.g., feeling tired, schedule conflict">
              </div>
            </div>

            <div class="rebalance-options">
              <h5>Rebalancing Options</h5>
              <label class="checkbox-label">
                <input type="checkbox" id="redistribute-load" checked>
                Redistribute training load to other days
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="maintain-volume" checked>
                Try to maintain weekly volume
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-modification">Cancel</button>
          <button class="btn btn-primary" id="apply-modification" data-date="${workout.date}">Apply Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Add event listeners
    this.attachModalEventListeners(workout);
    
    // Show modal
    modal.style.display = 'flex';
  }

  private attachModalEventListeners(workout: TrainingPlan): void {
    // Close button
    const closeBtn = document.querySelector('.close-modal-btn');
    closeBtn?.addEventListener('click', () => this.closeModificationModal());

    // Cancel button
    const cancelBtn = document.getElementById('cancel-modification');
    cancelBtn?.addEventListener('click', () => this.closeModificationModal());

    // Quick action buttons
    const restBtn = document.querySelector('.rest-btn');
    restBtn?.addEventListener('click', (e) => {
      const date = (e.target as HTMLElement).dataset.date;
      if (date) {
        this.quickModifyWorkout(date, 'change-to-rest');
      }
    });

    const substituteBtn = document.querySelector('.substitute-btn');
    substituteBtn?.addEventListener('click', () => this.showSubstitutionOptions(workout));

    // Intensity slider
    const intensitySlider = document.getElementById('intensity-adjustment') as HTMLInputElement;
    const intensityValue = document.querySelector('.intensity-value');
    intensitySlider?.addEventListener('input', (e) => {
      if (intensityValue) {
        intensityValue.textContent = (e.target as HTMLInputElement).value;
      }
    });

    // Apply changes button
    const applyBtn = document.getElementById('apply-modification');
    applyBtn?.addEventListener('click', () => this.applyWorkoutModification(workout));
  }

  private async quickModifyWorkout(date: string, modificationType: WorkoutModificationType): Promise<void> {
    if (!this.currentPlan) return;

    try {
      const reason = modificationType === 'change-to-rest' ? 'User requested rest day' : 'Quick modification';
      
      const result = PlanAdjustmentService.modifyWorkout(
        this.currentPlan.plan,
        date,
        modificationType,
        {},
        reason
      );

      if (result.success) {
        this.applyPlanAdjustment(result);
        this.closeModificationModal();
        UIHelpers.showStatus('Workout modified successfully!', 'success');
      } else {
        UIHelpers.showStatus('Failed to modify workout: ' + result.warnings.join(', '), 'error');
      }
    } catch (error) {
      console.error('Error modifying workout:', error);
      UIHelpers.showStatus('Error modifying workout', 'error');
    }
  }

  private async applyWorkoutModification(originalWorkout: TrainingPlan): Promise<void> {
    if (!this.currentPlan) return;

    try {
      // Gather form data
      const durationInput = document.getElementById('duration-adjustment') as HTMLInputElement;
      const intensityInput = document.getElementById('intensity-adjustment') as HTMLInputElement;
      const typeSelect = document.getElementById('workout-type-select') as HTMLSelectElement;
      const reasonInput = document.getElementById('modification-reason') as HTMLInputElement;
      const redistributeLoad = (document.getElementById('redistribute-load') as HTMLInputElement).checked;
      const maintainVolume = (document.getElementById('maintain-volume') as HTMLInputElement).checked;

      const newDuration = parseInt(durationInput.value);
      const newIntensity = parseInt(intensityInput.value);
      const newType = typeSelect.value;
      const reason = reasonInput.value || 'User modification';

      // Determine modification type and data
      let modificationType: WorkoutModificationType = 'adjust-duration';
      let newWorkoutData: Partial<TrainingPlan> = {};

      if (newType !== originalWorkout.workoutType) {
        modificationType = 'change-workout-type';
        newWorkoutData.workoutType = newType;
      } else if (newDuration !== originalWorkout.durationMin) {
        modificationType = 'adjust-duration';
        newWorkoutData.durationMin = newDuration;
      } else if (newIntensity !== originalWorkout.expectedFatigue) {
        modificationType = 'adjust-intensity';
        newWorkoutData.expectedFatigue = newIntensity;
      }

      // Apply both duration and intensity if both changed
      if (newDuration !== originalWorkout.durationMin && newIntensity !== originalWorkout.expectedFatigue) {
        newWorkoutData.durationMin = newDuration;
        newWorkoutData.expectedFatigue = newIntensity;
      }

      const adjustmentOptions = {
        redistributeLoad,
        maintainWeeklyVolume: maintainVolume,
        preserveHardDays: true,
        maxDailyFatigueIncrease: 15
      };

      const result = PlanAdjustmentService.modifyWorkout(
        this.currentPlan.plan,
        originalWorkout.date,
        modificationType,
        newWorkoutData,
        reason,
        adjustmentOptions
      );

      if (result.success) {
        this.applyPlanAdjustment(result);
        this.closeModificationModal();
        UIHelpers.showStatus('Workout modified successfully!', 'success');
      } else {
        UIHelpers.showStatus('Failed to modify workout: ' + result.warnings.join(', '), 'error');
      }
    } catch (error) {
      console.error('Error applying workout modification:', error);
      UIHelpers.showStatus('Error applying modifications', 'error');
    }
  }

  private showSubstitutionOptions(workout: TrainingPlan): void {
    const substitutions = PlanAdjustmentService.getWorkoutSubstitutions(workout);
    
    if (substitutions.length === 0) {
      UIHelpers.showStatus('No suitable workout substitutions found', 'info');
      return;
    }

    // Create substitution options UI
    const substituteContainer = document.querySelector('.custom-adjustments');
    if (!substituteContainer) return;

    const existingSubstitutions = document.querySelector('.substitution-options');
    if (existingSubstitutions) {
      existingSubstitutions.remove();
    }

    const substitutionDiv = document.createElement('div');
    substitutionDiv.className = 'substitution-options';
    substitutionDiv.innerHTML = `
      <h5>Workout Substitutions</h5>
      <div class="substitution-list">
        ${substitutions.map(sub => `
          <button class="substitution-option" data-workout-type="${sub.type}" data-workout-tag="${sub.tag}">
            <div class="sub-type">${sub.type}</div>
            <div class="sub-description">${sub.description}</div>
            <div class="sub-stats">${sub.durationMin}min • ${sub.fatigueScore}/100</div>
          </button>
        `).join('')}
      </div>
    `;

    substituteContainer.appendChild(substitutionDiv);

    // Add click listeners to substitution options
    const substitutionBtns = substitutionDiv.querySelectorAll('.substitution-option');
    substitutionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const workoutType = (btn as HTMLElement).dataset.workoutType;
        if (workoutType) {
          (document.getElementById('workout-type-select') as HTMLSelectElement).value = workoutType;
        }
      });
    });
  }

  private applyPlanAdjustment(result: PlanAdjustmentResult): void {
    if (!this.currentPlan) return;

    // Update the current plan
    this.currentPlan.plan = result.adjustedPlan;
    
    // Store modifications
    this.planModifications.push(...result.modifications);

    // Update the UI
    this.displayWorkoutCalendar();

    // Update recommendations and warnings
    if (result.warnings.length > 0) {
      console.warn('Plan adjustment warnings:', result.warnings);
    }

    if (result.recommendations.length > 0) {
      console.info('Plan adjustment recommendations:', result.recommendations);
    }

    // Show impact summary
    this.showAdjustmentImpact(result.impactSummary);
  }

  private showAdjustmentImpact(impactSummary: any): void {
    if (impactSummary.daysAffected > 1) {
      const message = `Plan adjusted: ${impactSummary.daysAffected} days affected, ` + 
                     `load change: ${impactSummary.totalLoadChange > 0 ? '+' : ''}${impactSummary.totalLoadChange}`;
      UIHelpers.showStatus(message, 'info');
    }
  }

  private getModificationIndicator(date: string): string {
    const modifications = this.planModifications.filter(m => m.date === date);
    if (modifications.length === 0) return '';

    return `<div class="modification-indicator" title="This workout has been modified">📝</div>`;
  }

  private closeModificationModal(): void {
    const modal = document.getElementById('workout-modification-modal');
    if (modal) {
      modal.remove();
    }
  }

  public showSection(): void {
    const section = document.getElementById('trainingPlanSection');
    if (section) {
      section.style.display = 'block';
    }
  }

  public hideSection(): void {
    const section = document.getElementById('trainingPlanSection');
    if (section) {
      section.style.display = 'none';
    }
  }

  /**
   * AI INTEGRATION METHODS
   */

  private async getAIRecommendation(): Promise<void> {
    if (!this.aiInsightsEnabled) {
      UIHelpers.showStatus('AI insights are disabled', 'info');
      return;
    }

    try {
      UIHelpers.showStatus('Getting AI recommendations for your training plan...', 'info');

      // Get AI insights
      const recommendation = await AIService.getTomorrowWorkoutRecommendation('current-user');
      const fatigueAssessment = await AIService.getCurrentFatigueAssessment('current-user');

      if (recommendation.success && recommendation.data) {
        this.displayAIRecommendation(recommendation.data, fatigueAssessment.data);
      } else {
        UIHelpers.showStatus('Unable to generate AI recommendation', 'warning');
      }
    } catch (error) {
      console.error('Error getting AI recommendation:', error);
      UIHelpers.showStatus('Failed to get AI recommendation', 'error');
    }
  }

  private displayAIRecommendation(recommendation: any, fatigue: any): void {
    // Create or update AI recommendation section
    let aiSection = document.getElementById('ai-recommendations-section');
    
    if (!aiSection) {
      aiSection = document.createElement('div');
      aiSection.id = 'ai-recommendations-section';
      aiSection.className = 'ai-recommendations-panel';
      
      // Insert after the form section
      const formSection = document.querySelector('.plan-generation-form');
      formSection?.parentNode?.insertBefore(aiSection, formSection.nextSibling);
    }

    aiSection.innerHTML = `
      <div class="ai-panel-header">
        <h3>🤖 AI Training Insights</h3>
        <button id="close-ai-panel" class="close-btn">&times;</button>
      </div>
      
      <div class="ai-insights">
        <div class="insight-card recommendation-card">
          <h4>Tomorrow's Recommended Workout</h4>
          <div class="workout-recommendation">
            <div class="workout-type">${recommendation.recommendedWorkout.type}</div>
            <div class="workout-description">${recommendation.recommendedWorkout.description}</div>
            <div class="workout-stats">
              <span class="duration">${recommendation.recommendedWorkout.durationMin} min</span>
              <span class="intensity">Intensity: ${recommendation.recommendedWorkout.fatigueScore}/100</span>
            </div>
            <div class="confidence">Confidence: ${recommendation.confidence}%</div>
          </div>
          
          ${recommendation.reasoning && recommendation.reasoning.length > 0 ? `
            <div class="reasoning">
              <h5>Why this workout?</h5>
              <ul>
                ${recommendation.reasoning.map((reason: string) => `<li>${reason}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${recommendation.alternatives && recommendation.alternatives.length > 0 ? `
            <div class="alternatives">
              <h5>Alternative Options</h5>
              <div class="alternative-workouts">
                ${recommendation.alternatives.map((alt: any) => `
                  <div class="alternative-workout">
                    <div class="alt-type">${alt.type}</div>
                    <div class="alt-description">${alt.description}</div>
                    <div class="alt-stats">${alt.durationMin}min • ${alt.fatigueScore}/100</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        ${fatigue ? `
          <div class="insight-card fatigue-card">
            <h4>Fatigue Assessment</h4>
            <div class="fatigue-status status-${fatigue.overallStatus}">
              <div class="status-indicator">${this.getFatigueEmoji(fatigue.overallStatus)}</div>
              <div class="status-text">Status: ${fatigue.overallStatus}</div>
              <div class="risk-level">Risk Level: ${fatigue.riskLevel}</div>
            </div>
            
            <div class="recommendation">
              <strong>Recommendation:</strong> ${this.getRecommendationText(fatigue.recommendation)}
            </div>
            
            ${fatigue.indicators && fatigue.indicators.length > 0 ? `
              <div class="indicators">
                <h5>Key Indicators</h5>
                <div class="indicator-list">
                  ${fatigue.indicators
                    .filter((ind: any) => ind.status !== 'normal')
                    .map((ind: any) => `
                      <div class="indicator ${ind.status}">
                        <span class="metric">${ind.metric}</span>
                        <span class="description">${ind.description}</span>
                      </div>
                    `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="ai-actions">
          <button class="btn btn-primary" id="apply-ai-recommendation">
            Apply AI Recommendation to Plan
          </button>
          <button class="btn btn-secondary" id="get-weekly-plan">
            Generate AI Weekly Plan
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    this.attachAIEventListeners(recommendation);

    // Scroll to AI section
    aiSection.scrollIntoView({ behavior: 'smooth' });
  }

  private attachAIEventListeners(recommendation: any): void {
    // Close AI panel
    const closeBtn = document.getElementById('close-ai-panel');
    closeBtn?.addEventListener('click', () => {
      const aiSection = document.getElementById('ai-recommendations-section');
      aiSection?.remove();
    });

    // Apply AI recommendation
    const applyBtn = document.getElementById('apply-ai-recommendation');
    applyBtn?.addEventListener('click', () => {
      this.applyAIRecommendation(recommendation);
    });

    // Generate weekly AI plan
    const weeklyBtn = document.getElementById('get-weekly-plan');
    weeklyBtn?.addEventListener('click', () => {
      this.generateAIWeeklyPlan();
    });
  }

  private async applyAIRecommendation(recommendation: any): Promise<void> {
    if (!this.currentPlan) {
      UIHelpers.showStatus('Please generate a base plan first', 'warning');
      return;
    }

    try {
      // Find tomorrow's workout in the current plan
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const tomorrowWorkout = this.currentPlan.plan.find(w => w.date === tomorrowStr);
      
      if (tomorrowWorkout) {
        // Replace tomorrow's workout with AI recommendation
        const newWorkout: TrainingPlan = {
          date: tomorrowStr,
          workoutType: recommendation.recommendedWorkout.type,
          description: `${recommendation.recommendedWorkout.description} (AI recommended)`,
          expectedFatigue: recommendation.recommendedWorkout.fatigueScore,
          durationMin: recommendation.recommendedWorkout.durationMin,
          completed: false
        };

        // Find and replace the workout
        const index = this.currentPlan.plan.findIndex(w => w.date === tomorrowStr);
        if (index >= 0) {
          this.currentPlan.plan[index] = newWorkout;

          // Add to modifications
          this.planModifications.push({
            date: tomorrowStr,
            type: 'change-workout-type',
            reason: 'Applied AI recommendation',
            originalWorkout: tomorrowWorkout,
            newWorkout: newWorkout,
            timestamp: new Date().toISOString()
          });

          // Update display
          this.displayWorkoutCalendar();
          UIHelpers.showStatus('AI recommendation applied to tomorrow\'s workout', 'success');
        }
      } else {
        UIHelpers.showStatus('No workout found for tomorrow to replace', 'warning');
      }

    } catch (error) {
      console.error('Error applying AI recommendation:', error);
      UIHelpers.showStatus('Failed to apply AI recommendation', 'error');
    }
  }

  private async generateAIWeeklyPlan(): Promise<void> {
    try {
      UIHelpers.showStatus('Generating AI-optimized weekly plan...', 'info');

      // This would integrate with the PlanAdvisor for a full week
      // For now, show a placeholder
      UIHelpers.showStatus('AI weekly plan generation coming soon! Apply single recommendations for now.', 'info');

    } catch (error) {
      console.error('Error generating AI weekly plan:', error);
      UIHelpers.showStatus('Failed to generate AI weekly plan', 'error');
    }
  }

  private getFatigueEmoji(status: string): string {
    switch (status) {
      case 'fresh': return '✨';
      case 'normal': return '👍';
      case 'fatigued': return '😴';
      case 'overtrained': return '⚠️';
      default: return '❓';
    }
  }

  private getRecommendationText(recommendation: string): string {
    switch (recommendation) {
      case 'full-training': return 'Full training load recommended';
      case 'active-recovery': return 'Active recovery recommended';
      case 'rest': return 'Rest day recommended';
      case 'medical-attention': return 'Consider medical consultation';
      default: return 'Continue with planned training';
    }
  }

  /**
   * Enable or disable AI features
   */
  public setAIEnabled(enabled: boolean): void {
    this.aiInsightsEnabled = enabled;
    
    const aiBtn = document.getElementById('ai-recommend-btn') as HTMLButtonElement;
    if (aiBtn) {
      aiBtn.disabled = !enabled;
      aiBtn.title = enabled ? 'Get AI workout recommendation' : 'AI features disabled';
    }

    if (!enabled) {
      // Remove AI recommendations section if displayed
      const aiSection = document.getElementById('ai-recommendations-section');
      aiSection?.remove();
    }
  }

  /**
   * Check if AI features are enabled
   */
  public isAIEnabled(): boolean {
    return this.aiInsightsEnabled;
  }

  /**
   * WORKOUT PERSISTENCE METHODS
   */

  /**
   * Save the current plan to Firebase storage
   */
  private async savePlanToStorage(): Promise<void> {
    if (!this.currentPlan) {
      console.warn('No current plan to save');
      return;
    }

    try {
      // Check if user is authenticated
      if (!WorkoutStorageService.isAuthenticated()) {
        console.log('User not authenticated, plan will only be stored locally');
        return;
      }

      // Generate a descriptive plan name
      const planName = this.generatePlanName();
      
      // Save to Firebase (with localStorage fallback)
      const planId = await WorkoutStorageService.saveTrainingPlan(this.currentPlan, planName);
      
      // Set as active plan
      await WorkoutStorageService.setActivePlan(planId);
      
      console.log(`Plan saved with ID: ${planId}`);
      
    } catch (error) {
      console.error('Error saving plan:', error);
      UIHelpers.showStatus('Plan generated but saving failed. It will be available this session only.', 'warning');
    }
  }

  /**
   * Load saved plan on initialization
   */
  private async loadSavedPlan(): Promise<void> {
    try {
      // Only load if user is authenticated
      if (!WorkoutStorageService.isAuthenticated()) {
        return;
      }

      const activePlan = await WorkoutStorageService.getActivePlan();
      if (activePlan && this.isPlanStillRelevant(activePlan)) {
        this.loadPlanFromStorage(activePlan);
        UIHelpers.showStatus('Loaded your saved training plan', 'info');
      }
      
    } catch (error) {
      console.error('Error loading saved plan:', error);
      // Continue silently - user can generate new plan
    }
  }

  /**
   * Load plan from storage format to current plan
   */
  private loadPlanFromStorage(storedPlan: import('../../services/WorkoutStorageService').StoredTrainingPlan): void {
    this.currentPlan = {
      plan: storedPlan.plan,
      readinessMetrics: storedPlan.readinessMetrics,
      recommendations: storedPlan.recommendations,
      warnings: storedPlan.warnings,
      generatedAt: storedPlan.generatedAt
    };

    // Display the loaded plan
    this.displayGeneratedPlan();
    
    // Add indication that this is a loaded plan
    const planSection = document.getElementById('generatedPlanSection');
    if (planSection) {
      planSection.style.display = 'block';
      
      // Add a "loaded plan" indicator
      const existingIndicator = document.getElementById('loaded-plan-indicator');
      if (!existingIndicator) {
        const indicator = document.createElement('div');
        indicator.id = 'loaded-plan-indicator';
        indicator.className = 'alert alert-info';
        indicator.innerHTML = `
          <span>📋</span> <strong>${storedPlan.name}</strong> - Generated ${new Date(storedPlan.generatedAt).toLocaleDateString()}
          <button class="btn btn-ghost btn-small" id="load-different-plan">Load Different Plan</button>
        `;
        
        const planHeader = planSection.querySelector('.plan-header');
        if (planHeader) {
          planSection.insertBefore(indicator, planHeader.nextSibling);
        }

        // Add event listener for loading different plan
        const loadDifferentBtn = document.getElementById('load-different-plan');
        loadDifferentBtn?.addEventListener('click', () => this.showPlanSelectionModal());
      }
    }
  }

  /**
   * Check if a stored plan is still relevant (within date range)
   */
  private isPlanStillRelevant(storedPlan: import('../../services/WorkoutStorageService').StoredTrainingPlan): boolean {
    const today = new Date().toISOString().split('T')[0];
    const planEndDate = storedPlan.endDate;
    
    // Plan is relevant if it hasn't ended yet
    return planEndDate >= today;
  }

  /**
   * Generate a descriptive name for the training plan
   */
  private generatePlanName(): string {
    if (!this.currentPlan) return 'Training Plan';
    
    const startDate = this.currentPlan.plan[0]?.date;
    const duration = this.currentPlan.plan.length;
    const primaryWorkoutTypes = this.getTopWorkoutTypes();
    
    let name = `${duration}-Day Plan`;
    
    if (primaryWorkoutTypes.length > 0) {
      name += ` (${primaryWorkoutTypes.slice(0, 2).join(', ')})`;
    }
    
    if (startDate) {
      const date = new Date(startDate);
      name += ` - ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    
    return name;
  }

  /**
   * Get the most common workout types in the plan
   */
  private getTopWorkoutTypes(): string[] {
    if (!this.currentPlan) return [];
    
    const typeCounts = this.currentPlan.plan.reduce((counts, workout) => {
      counts[workout.workoutType] = (counts[workout.workoutType] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    return Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([type]) => type);
  }

  /**
   * Show modal to select from saved training plans
   */
  private async showPlanSelectionModal(): Promise<void> {
    try {
      const savedPlans = await WorkoutStorageService.getStoredTrainingPlans();
      
      if (savedPlans.length === 0) {
        UIHelpers.showStatus('No saved plans found', 'info');
        return;
      }

      this.createPlanSelectionModal(savedPlans);
      
    } catch (error) {
      console.error('Error loading saved plans:', error);
      UIHelpers.showStatus('Error loading saved plans', 'error');
    }
  }

  /**
   * Create modal for selecting saved plans
   */
  private createPlanSelectionModal(plans: import('../../services/WorkoutStorageService').StoredTrainingPlan[]): void {
    // Remove existing modal
    const existingModal = document.getElementById('plan-selection-modal');
    existingModal?.remove();

    const modal = document.createElement('div');
    modal.id = 'plan-selection-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Select Training Plan</h3>
          <button class="btn btn-ghost close-modal-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="plans-list">
            ${plans.map(plan => `
              <div class="plan-item" data-plan-id="${plan.id}">
                <div class="plan-info">
                  <h4>${plan.name}</h4>
                  <p class="plan-details">
                    ${plan.plan.length} days • ${plan.startDate} to ${plan.endDate}
                    ${plan.isActive ? '<span class="active-badge">Active</span>' : ''}
                  </p>
                  <p class="plan-summary">${plan.recommendations.slice(0, 2).join(', ')}</p>
                </div>
                <div class="plan-actions">
                  <button class="btn btn-primary load-plan-btn" data-plan-id="${plan.id}">Load Plan</button>
                  <button class="btn btn-danger delete-plan-btn" data-plan-id="${plan.id}">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary close-modal-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';

    // Add event listeners
    this.attachPlanSelectionEventListeners(plans);
  }

  /**
   * Attach event listeners for plan selection modal
   */
  private attachPlanSelectionEventListeners(plans: import('../../services/WorkoutStorageService').StoredTrainingPlan[]): void {
    // Close modal events
    const closeButtons = document.querySelectorAll('#plan-selection-modal .close-modal-btn');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('plan-selection-modal')?.remove();
      });
    });

    // Load plan events
    const loadButtons = document.querySelectorAll('.load-plan-btn');
    loadButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const planId = (e.target as HTMLElement).dataset.planId;
        if (planId) {
          const plan = plans.find(p => p.id === planId);
          if (plan) {
            // Set as active plan
            await WorkoutStorageService.setActivePlan(planId);
            
            // Load the plan
            this.loadPlanFromStorage(plan);
            
            // Close modal
            document.getElementById('plan-selection-modal')?.remove();
            
            UIHelpers.showStatus(`Loaded plan: ${plan.name}`, 'success');
          }
        }
      });
    });

    // Delete plan events
    const deleteButtons = document.querySelectorAll('.delete-plan-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const planId = (e.target as HTMLElement).dataset.planId;
        if (planId && confirm('Are you sure you want to delete this training plan?')) {
          try {
            await WorkoutStorageService.deleteTrainingPlan(planId);
            
            // Remove from UI
            const planItem = document.querySelector(`[data-plan-id="${planId}"]`);
            planItem?.remove();
            
            UIHelpers.showStatus('Plan deleted successfully', 'success');
            
          } catch (error) {
            console.error('Error deleting plan:', error);
            UIHelpers.showStatus('Error deleting plan', 'error');
          }
        }
      });
    });

    // Click outside to close
    const modal = document.getElementById('plan-selection-modal');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Add method to show all saved plans (can be called from UI)
   */
  public async showSavedPlans(): Promise<void> {
    await this.showPlanSelectionModal();
  }

  /**
   * Save generated plan using unified WorkoutService
   */
  private async saveGeneratedPlanAsWorkouts(): Promise<void> {
    if (!this.currentPlan) {
      console.warn('No current plan to save as workouts');
      return;
    }

    try {
      console.log('💾 Saving generated plan to unified WorkoutService...');
      
      // Use integration service to convert and save
      const result = await WorkoutPlanIntegration.replaceGeneratedPlan(this.currentPlan);
      
      console.log(`✅ Successfully saved ${result.workouts.length} planned workouts`);
      
      if (result.failures.length > 0) {
        console.warn(`⚠️ ${result.failures.length} workouts failed to save`);
        result.failures.forEach(failure => {
          console.error(`Failed to save workout for ${failure.trainingPlan.date}:`, failure.error);
        });
      }

      // Trigger calendar refresh if present
      this.notifyWorkoutCalendarUpdate();
      
    } catch (error) {
      console.error('❌ Failed to save plan as workouts:', error);
      UIHelpers.showStatus('Plan generated but failed to save to workout calendar', 'warning');
    }
  }

  /**
   * Notify other components that workouts have been updated
   */
  private notifyWorkoutCalendarUpdate(): void {
    // Dispatch custom event for other components to listen to
    const event = new CustomEvent('workouts-updated', {
      detail: {
        source: 'plan-generation',
        timestamp: new Date().toISOString()
      }
    });
    
    document.dispatchEvent(event);
    
    // Also trigger existing recovery metrics update for compatibility
    window.dispatchEvent(new Event('recovery-metrics-updated'));
  }

  /**
   * Add method to clear current plan and start fresh
   */
  public clearCurrentPlan(): void {
    this.currentPlan = null;
    this.currentMacroPlan = null;
    this.planModifications = [];
    
    // Hide plan section
    const planSection = document.getElementById('generatedPlanSection');
    if (planSection) {
      planSection.style.display = 'none';
    }
    
    // Remove loaded plan indicator
    const indicator = document.getElementById('loaded-plan-indicator');
    indicator?.remove();
    
    UIHelpers.showStatus('Cleared current plan', 'info');
  }
}