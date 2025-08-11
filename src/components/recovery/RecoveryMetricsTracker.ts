// Daily Recovery Metrics Tracker Component
import { FirebaseRecoveryMetrics } from '../../types/firebase.types';
import { FirestoreService } from '../../firebase/firestore';
import { UIHelpers } from '../../utils/ui-helpers';

export class RecoveryMetricsTracker {
  private container: HTMLElement;
  private currentDate: string;
  private todaysMetrics: FirebaseRecoveryMetrics | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadTodaysMetrics();
    this.render();
    this.attachEventListeners();
  }

  private async loadTodaysMetrics(): Promise<void> {
    try {
      const metrics = await FirestoreService.getRecoveryMetrics();
      this.todaysMetrics = metrics.find(m => m.date === this.currentDate) || null;
    } catch (error) {
      console.error('Error loading today\'s recovery metrics:', error);
    }
  }

  private render(): void {
    const hasDataToday = this.todaysMetrics !== null;
    
    this.container.innerHTML = `
      <div class="recovery-metrics-tracker">
        <div class="recovery-header">
          <h3>🏃‍♂️ Daily Recovery Metrics</h3>
          <div class="recovery-date">
            <span class="date-display">${this.formatDate(this.currentDate)}</span>
            ${hasDataToday ? 
              '<span class="data-status recorded">✅ Recorded</span>' : 
              '<span class="data-status pending">⏳ Pending</span>'
            }
          </div>
        </div>

        <form id="recovery-form" class="recovery-form">
          <div class="metrics-grid">
            <div class="metric-group">
              <label for="sleep-score">😴 Sleep Score</label>
              <div class="input-with-range">
                <input 
                  type="number" 
                  id="sleep-score" 
                  min="0" 
                  max="100" 
                  value="${this.todaysMetrics?.sleepScore || ''}"
                  placeholder="0-100"
                />
                <span class="range-label">Poor ← → Excellent</span>
              </div>
            </div>

            <div class="metric-group">
              <label for="body-battery">🔋 Body Battery</label>
              <div class="input-with-range">
                <input 
                  type="number" 
                  id="body-battery" 
                  min="0" 
                  max="100" 
                  value="${this.todaysMetrics?.bodyBattery || ''}"
                  placeholder="0-100"
                />
                <span class="range-label">Drained ← → Charged</span>
              </div>
            </div>

            <div class="metric-group">
              <label for="hrv">💓 HRV (Heart Rate Variability)</label>
              <div class="input-with-range">
                <input 
                  type="number" 
                  id="hrv" 
                  min="10" 
                  max="100" 
                  step="0.1"
                  value="${this.todaysMetrics?.hrv || ''}"
                  placeholder="ms"
                />
                <span class="range-label">Lower ← → Higher variability</span>
              </div>
            </div>

            <div class="metric-group">
              <label for="resting-hr">❤️ Resting Heart Rate</label>
              <div class="input-with-range">
                <input 
                  type="number" 
                  id="resting-hr" 
                  min="30" 
                  max="120" 
                  value="${this.todaysMetrics?.restingHR || ''}"
                  placeholder="bpm"
                />
                <span class="range-label">Typical range: 50-80 bpm</span>
              </div>
            </div>

            <div class="metric-group">
              <label for="subjective-fatigue">😫 Subjective Fatigue</label>
              <div class="input-with-range">
                <input 
                  type="range" 
                  id="subjective-fatigue" 
                  min="1" 
                  max="10" 
                  value="${this.todaysMetrics?.subjectiveFatigue || 5}"
                />
                <div class="range-labels">
                  <span>Fresh (1)</span>
                  <span id="fatigue-value">${this.todaysMetrics?.subjectiveFatigue || 5}</span>
                  <span>Exhausted (10)</span>
                </div>
              </div>
            </div>

            <div class="metric-group">
              <label for="stress-level">😤 Stress Level</label>
              <div class="input-with-range">
                <input 
                  type="number" 
                  id="stress-level" 
                  min="0" 
                  max="100" 
                  value="${this.todaysMetrics?.stressLevel || ''}"
                  placeholder="0-100"
                />
                <span class="range-label">Calm ← → Very Stressed</span>
              </div>
            </div>
          </div>

          <div class="notes-section">
            <label for="recovery-notes">📝 Notes</label>
            <textarea 
              id="recovery-notes" 
              placeholder="How are you feeling today? Any additional context..."
              rows="3"
            >${this.todaysMetrics?.notes || ''}</textarea>
          </div>

          <div class="form-actions">
            <button type="button" id="quick-fill-btn" class="btn btn-secondary">
              ⚡ Quick Fill (Average Values)
            </button>
            <button type="submit" class="btn btn-primary">
              💾 ${hasDataToday ? 'Update' : 'Save'} Today's Metrics
            </button>
          </div>
        </form>

        <div class="recovery-insights" id="recovery-insights">
          ${this.generateInsights()}
        </div>

        <div class="recent-trends">
          <h4>📊 Recent Trend</h4>
          <div id="recovery-trend-chart" class="trend-chart">
            Loading recent recovery data...
          </div>
        </div>
      </div>
    `;
  }

  private generateInsights(): string {
    if (!this.todaysMetrics) {
      return `
        <div class="insight-card">
          <h4>💡 Recovery Insights</h4>
          <p>Enter your daily metrics to get personalized recovery insights and training readiness recommendations.</p>
        </div>
      `;
    }

    const insights: string[] = [];
    const metrics = this.todaysMetrics;

    // Sleep analysis
    if (metrics.sleepScore !== undefined) {
      if (metrics.sleepScore >= 80) {
        insights.push("🌟 Excellent sleep quality - you're well-recovered for intense training");
      } else if (metrics.sleepScore >= 60) {
        insights.push("✅ Good sleep - moderate training intensity recommended");
      } else {
        insights.push("⚠️ Poor sleep quality - consider easy training or rest day");
      }
    }

    // Body Battery analysis
    if (metrics.bodyBattery !== undefined) {
      if (metrics.bodyBattery >= 75) {
        insights.push("🔋 High energy levels - great day for challenging workouts");
      } else if (metrics.bodyBattery >= 50) {
        insights.push("⚡ Moderate energy - steady-state training recommended");
      } else {
        insights.push("🪫 Low energy - focus on recovery or easy movement");
      }
    }

    // HRV analysis
    if (metrics.hrv !== undefined && metrics.hrv > 0) {
      insights.push(`💓 HRV: ${metrics.hrv}ms - ${metrics.hrv > 40 ? 'Good recovery status' : 'Consider easier training'}`);
    }

    // Overall readiness
    const readinessScore = this.calculateReadinessScore();
    insights.push(`🎯 Training Readiness: ${readinessScore}/100 - ${this.getReadinessMessage(readinessScore)}`);

    return `
      <div class="insight-card">
        <h4>💡 Today's Recovery Insights</h4>
        <ul>
          ${insights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  private calculateReadinessScore(): number {
    if (!this.todaysMetrics) return 50;

    let score = 0;
    let factors = 0;

    if (this.todaysMetrics.sleepScore !== undefined) {
      score += this.todaysMetrics.sleepScore;
      factors++;
    }

    if (this.todaysMetrics.bodyBattery !== undefined) {
      score += this.todaysMetrics.bodyBattery;
      factors++;
    }

    if (this.todaysMetrics.hrv !== undefined) {
      // Normalize HRV to 0-100 scale (assuming 40ms is good)
      const normalizedHRV = Math.min(100, (this.todaysMetrics.hrv / 40) * 100);
      score += normalizedHRV;
      factors++;
    }

    if (this.todaysMetrics.subjectiveFatigue !== undefined) {
      // Convert fatigue (1-10, lower is better) to score (0-100, higher is better)
      const fatigueScore = (11 - this.todaysMetrics.subjectiveFatigue) * 10;
      score += fatigueScore;
      factors++;
    }

    if (this.todaysMetrics.stressLevel !== undefined) {
      // Convert stress (0-100, lower is better) to recovery score
      const stressScore = 100 - this.todaysMetrics.stressLevel;
      score += stressScore;
      factors++;
    }

    return factors > 0 ? Math.round(score / factors) : 50;
  }

  private getReadinessMessage(score: number): string {
    if (score >= 80) return "Ready for intense training! 💪";
    if (score >= 60) return "Good for moderate training 👍";
    if (score >= 40) return "Easy training recommended 🚶‍♂️";
    return "Focus on recovery today 😴";
  }

  private attachEventListeners(): void {
    const form = this.container.querySelector('#recovery-form') as HTMLFormElement;
    const quickFillBtn = this.container.querySelector('#quick-fill-btn') as HTMLButtonElement;
    const fatigueSlider = this.container.querySelector('#subjective-fatigue') as HTMLInputElement;
    const fatigueValue = this.container.querySelector('#fatigue-value') as HTMLSpanElement;

    // Form submission
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveMetrics();
    });

    // Quick fill with average values
    quickFillBtn?.addEventListener('click', () => {
      this.quickFillAverageValues();
    });

    // Update fatigue value display
    fatigueSlider?.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      if (fatigueValue) {
        fatigueValue.textContent = value;
      }
    });
  }

  private async saveMetrics(): Promise<void> {
    try {
      const formData = this.getFormData();
      
      if (!this.hasAnyMetricData(formData)) {
        UIHelpers.showStatus('Please enter at least one recovery metric', 'warning');
        return;
      }

      // Create metrics data object, filtering out undefined values for Firestore
      const metricsData: any = {
        date: this.currentDate,
        subjectiveFatigue: formData.subjectiveFatigue || 5, // Default to 5 if not provided
      };

      // Only add fields that have values (Firestore doesn't allow undefined)
      if (formData.sleepScore !== undefined) metricsData.sleepScore = formData.sleepScore;
      if (formData.bodyBattery !== undefined) metricsData.bodyBattery = formData.bodyBattery;
      if (formData.hrv !== undefined) metricsData.hrv = formData.hrv;
      if (formData.restingHR !== undefined) metricsData.restingHR = formData.restingHR;
      if (formData.stressLevel !== undefined) metricsData.stressLevel = formData.stressLevel;
      if (formData.notes && formData.notes.trim()) metricsData.notes = formData.notes.trim();

      await FirestoreService.addRecoveryMetrics(metricsData);
      
      // Update local state
      await this.loadTodaysMetrics();
      this.render();
      
      UIHelpers.showStatus('Recovery metrics saved successfully! 💾', 'success');
      
      // Dispatch event for other components to update
      window.dispatchEvent(new CustomEvent('recovery-metrics-updated', {
        detail: { date: this.currentDate, metrics: this.todaysMetrics }
      }));
      
    } catch (error) {
      console.error('Error saving recovery metrics:', error);
      UIHelpers.showStatus(`Failed to save metrics: ${(error as Error).message}`, 'error');
    }
  }

  private getFormData(): Partial<FirebaseRecoveryMetrics> {
    const getData = (id: string): number | undefined => {
      const element = this.container.querySelector(`#${id}`) as HTMLInputElement;
      const value = element?.value?.trim();
      return value ? parseFloat(value) : undefined;
    };

    return {
      sleepScore: getData('sleep-score'),
      bodyBattery: getData('body-battery'),
      hrv: getData('hrv'),
      restingHR: getData('resting-hr'),
      subjectiveFatigue: getData('subjective-fatigue') || 5,
      stressLevel: getData('stress-level'),
      notes: (this.container.querySelector('#recovery-notes') as HTMLTextAreaElement)?.value?.trim() || undefined
    };
  }

  private hasAnyMetricData(data: Partial<FirebaseRecoveryMetrics>): boolean {
    return !!(
      data.sleepScore !== undefined ||
      data.bodyBattery !== undefined ||
      data.hrv !== undefined ||
      data.restingHR !== undefined ||
      data.stressLevel !== undefined ||
      data.notes
    );
  }

  private quickFillAverageValues(): void {
    // Fill with reasonable average values
    const sleepInput = this.container.querySelector('#sleep-score') as HTMLInputElement;
    const batteryInput = this.container.querySelector('#body-battery') as HTMLInputElement;
    const hrvInput = this.container.querySelector('#hrv') as HTMLInputElement;
    const restingHRInput = this.container.querySelector('#resting-hr') as HTMLInputElement;
    const stressInput = this.container.querySelector('#stress-level') as HTMLInputElement;

    if (sleepInput && !sleepInput.value) sleepInput.value = '75';
    if (batteryInput && !batteryInput.value) batteryInput.value = '70';
    if (hrvInput && !hrvInput.value) hrvInput.value = '35';
    if (restingHRInput && !restingHRInput.value) restingHRInput.value = '60';
    if (stressInput && !stressInput.value) stressInput.value = '30';

    UIHelpers.showStatus('Quick filled with average values ⚡', 'info');
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  public async updateDate(date: string): Promise<void> {
    this.currentDate = date;
    await this.loadTodaysMetrics();
    this.render();
    this.attachEventListeners();
  }

  public getCurrentMetrics(): FirebaseRecoveryMetrics | null {
    return this.todaysMetrics;
  }

  public getReadinessScore(): number {
    return this.calculateReadinessScore();
  }
}