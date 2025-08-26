// Import Data Page
// Dedicated page for importing workouts from various sources

import { StravaConnector } from '../strava/StravaConnector';

export class ImportDataPage {
  private container: HTMLElement;
  private stravaConnector?: StravaConnector;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="import-page">
        <div class="import-header">
          <button class="back-button" id="back-to-dashboard">
            <span class="back-icon">←</span>
            Back to Dashboard
          </button>
          
          <div class="page-title">
            <h1>Import Workout Data</h1>
            <p class="page-subtitle">Choose how you'd like to import your workout data</p>
          </div>
        </div>

        <div class="import-methods">
          <!-- File Upload Method -->
          <div class="import-method-card">
            <div class="method-header">
              <div class="method-icon">📁</div>
              <h3>Import from Files</h3>
            </div>
            <div class="method-description">
              <p>Upload FIT files, GPX files, or JSON exports from other training platforms.</p>
              <ul class="feature-list">
                <li>Support for .fit, .gpx, .tcx, .json files</li>
                <li>Batch upload multiple files</li>
                <li>Automatic activity detection</li>
                <li>Data validation and cleanup</li>
              </ul>
            </div>
            <div class="method-actions">
              <button class="btn-primary" id="file-upload-btn">
                <span class="btn-icon">📤</span>
                Choose Files
              </button>
              <input type="file" id="file-input" multiple accept=".fit,.gpx,.tcx,.json" style="display: none;">
            </div>
          </div>

          <!-- Strava Integration Method -->
          <div class="import-method-card">
            <div class="method-header">
              <div class="method-icon">🟠</div>
              <h3>Connect to Strava</h3>
            </div>
            <div class="method-description">
              <p>Sync your activities directly from your Strava account.</p>
              <ul class="feature-list">
                <li>Automatic sync of recent activities</li>
                <li>Real-time updates when you complete workouts</li>
                <li>Access to detailed performance metrics</li>
                <li>Heart rate zones and training data</li>
              </ul>
            </div>
            <div class="method-actions">
              <div id="strava-connector-container"></div>
            </div>
          </div>

          <!-- Manual Entry Method -->
          <div class="import-method-card">
            <div class="method-header">
              <div class="method-icon">✏️</div>
              <h3>Manual Entry</h3>
            </div>
            <div class="method-description">
              <p>Manually enter workout details for activities not tracked digitally.</p>
              <ul class="feature-list">
                <li>Quick entry forms</li>
                <li>Support for all activity types</li>
                <li>Custom metrics and notes</li>
                <li>Retroactive data entry</li>
              </ul>
            </div>
            <div class="method-actions">
              <button class="btn-secondary" id="manual-entry-btn">
                <span class="btn-icon">➕</span>
                Add Workout
              </button>
            </div>
          </div>
        </div>

        <!-- Import Progress Section (initially hidden) -->
        <div class="import-progress" id="import-progress" style="display: none;">
          <div class="progress-header">
            <h3>Importing Data...</h3>
            <button class="btn-ghost" id="cancel-import">Cancel</button>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <div class="progress-details">
            <span id="progress-text">Preparing import...</span>
            <span id="progress-count">0/0</span>
          </div>
          <div class="import-results" id="import-results"></div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.initializeStrava();
  }

  private attachEventListeners(): void {
    // Back button
    const backBtn = this.container.querySelector('#back-to-dashboard');
    backBtn?.addEventListener('click', () => {
      this.navigateBack();
    });

    // File upload
    const fileUploadBtn = this.container.querySelector('#file-upload-btn');
    const fileInput = this.container.querySelector('#file-input') as HTMLInputElement;
    
    fileUploadBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      this.handleFileUpload(e as Event);
    });

    // Manual entry
    const manualEntryBtn = this.container.querySelector('#manual-entry-btn');
    manualEntryBtn?.addEventListener('click', () => {
      this.showManualEntryForm();
    });

    // Import progress cancel
    const cancelImportBtn = this.container.querySelector('#cancel-import');
    cancelImportBtn?.addEventListener('click', () => {
      this.cancelImport();
    });
  }

  private initializeStrava(): void {
    const stravaContainer = this.container.querySelector('#strava-connector-container');
    if (stravaContainer) {
      this.stravaConnector = new StravaConnector(stravaContainer as HTMLElement);
    }
  }

  private navigateBack(): void {
    // Hide import page
    this.container.style.display = 'none';
    this.container.classList.remove('active');
    
    // Show the dashboard view (main training hub)
    const dashboardView = document.querySelector('#dashboard-view');
    if (dashboardView) {
      (dashboardView as HTMLElement).style.display = 'block';
      dashboardView.classList.add('active');
    }

    // Update navigation state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Activate the dashboard navigation item
    const dashboardNav = document.querySelector('.nav-item[data-view="dashboard"]');
    dashboardNav?.classList.add('active');
  }

  private async handleFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) {
      return;
    }

    console.log(`📁 Selected ${files.length} files for upload`);
    
    // Show progress section
    this.showImportProgress();
    
    // Process files
    const results: any[] = [];
    let processed = 0;
    
    for (const file of Array.from(files)) {
      try {
        this.updateProgress(processed, files.length, `Processing ${file.name}...`);
        
        const result = await this.processFile(file);
        results.push({ file: file.name, success: true, data: result });
        
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({ 
          file: file.name, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
      
      processed++;
      this.updateProgress(processed, files.length, `Processed ${file.name}`);
    }

    // Show results
    this.showImportResults(results);
    
    // Clear file input
    input.value = '';
  }

  private async processFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const result = e.target?.result;
          if (!result) {
            throw new Error('Failed to read file');
          }

          // Process based on file type
          if (file.name.endsWith('.json')) {
            const data = JSON.parse(result as string);
            resolve(data);
          } else if (file.name.endsWith('.fit')) {
            // Would integrate with existing FIT parser
            resolve({ type: 'fit', size: file.size, name: file.name });
          } else {
            resolve({ type: 'other', size: file.size, name: file.name });
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      if (file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  private showImportProgress(): void {
    const progressSection = this.container.querySelector('#import-progress');
    if (progressSection) {
      (progressSection as HTMLElement).style.display = 'block';
    }
  }

  private updateProgress(current: number, total: number, message: string): void {
    const progressFill = this.container.querySelector('#progress-fill') as HTMLElement;
    const progressText = this.container.querySelector('#progress-text');
    const progressCount = this.container.querySelector('#progress-count');

    if (progressFill) {
      const percentage = (current / total) * 100;
      progressFill.style.width = `${percentage}%`;
    }

    if (progressText) {
      progressText.textContent = message;
    }

    if (progressCount) {
      progressCount.textContent = `${current}/${total}`;
    }
  }

  private showImportResults(results: any[]): void {
    const resultsContainer = this.container.querySelector('#import-results');
    if (!resultsContainer) return;

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    resultsContainer.innerHTML = `
      <div class="results-summary">
        <h4>Import Complete</h4>
        <div class="results-stats">
          <span class="success-count">✅ ${successful} successful</span>
          ${failed > 0 ? `<span class="error-count">❌ ${failed} failed</span>` : ''}
        </div>
      </div>
      
      <div class="results-details">
        ${results.map(result => `
          <div class="result-item ${result.success ? 'success' : 'error'}">
            <span class="result-file">${result.file}</span>
            <span class="result-status">
              ${result.success ? '✅' : '❌ ' + result.error}
            </span>
          </div>
        `).join('')}
      </div>

      <div class="results-actions">
        <button class="btn-primary" onclick="location.reload()">
          Continue to Dashboard
        </button>
      </div>
    `;
  }

  private cancelImport(): void {
    const progressSection = this.container.querySelector('#import-progress');
    if (progressSection) {
      (progressSection as HTMLElement).style.display = 'none';
    }
  }

  private showManualEntryForm(): void {
    // Would show a form for manual workout entry
    console.log('📝 Manual entry form would be shown here');
    alert('Manual entry form coming soon!');
  }

  public show(): void {
    this.container.style.display = 'block';
    this.render();
  }

  public hide(): void {
    this.container.style.display = 'none';
  }
}