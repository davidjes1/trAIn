import './polyfills';
import './styles/main.scss';
import { UIHelpers } from './utils/ui-helpers';
import { ExportService } from './services/ExportService';
import { TrainingHub } from './components/training-hub/TrainingHub';
import { ImportDataPage } from './components/import-data/ImportDataPage';
import { StravaAuthManager } from './services/StravaAuthManager';
import { StravaService } from './services/StravaService';
import { UserProfileService } from './services/UserProfileService';

class TrainingHubApp {
  private trainingHub: TrainingHub;
  private importDataPage: ImportDataPage;

  constructor() {
    this.trainingHub = new TrainingHub();
    this.initializeImportDataPage();
    this.setupLegacySupport();
    this.handleStravaOAuthCallback();
  }

  private initializeImportDataPage(): void {
    const importContainer = document.getElementById('import-data-view');
    if (importContainer) {
      this.importDataPage = new ImportDataPage(importContainer);
    }
  }

  // Maintain backward compatibility for any existing integrations
  private setupLegacySupport(): void {
    // Global legacy functions for HTML onclick handlers
    (window as any).selectAllFields = UIHelpers.selectAllFields;
    (window as any).deselectAllFields = UIHelpers.deselectAllFields;
    (window as any).exportToJSON = () => {
      console.warn('exportToJSON called - functionality moved to TrainingHub');
    };
    (window as any).testExport = ExportService.testExport;
    
    // Make training hub globally accessible for debugging/integration
    (window as any).trainingHub = this.trainingHub;
    
    // Make import data page globally accessible
    (window as any).app = {
      importDataPage: this.importDataPage
    };
  }

  /**
   * Handle Strava OAuth callback globally
   * This allows OAuth callbacks to work from any page
   */
  private async handleStravaOAuthCallback(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthCallback = urlParams.has('code') && urlParams.has('state') && urlParams.has('scope');
    
    console.log('🔍 Global OAuth callback check:', { 
      hasCode: urlParams.has('code'), 
      hasState: urlParams.has('state'), 
      hasScope: urlParams.has('scope'),
      willHandle: hasAuthCallback 
    });
    
    if (hasAuthCallback) {
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const scope = urlParams.get('scope');
      const error = urlParams.get('error');

      if (error) {
        console.error('Strava OAuth error:', error);
        this.showStatus(`Strava authorization failed: ${error}`, 'error');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code && state && scope) {
        try {
          console.log('🔄 Processing Strava OAuth callback globally...');
          this.showStatus('Connecting to Strava...', 'info');
          
          const authManager = StravaAuthManager.getInstance();
          const stravaService = StravaService.getInstance();
          const userProfileService = UserProfileService.getInstance();

          // Check if Strava is configured before attempting OAuth
          const config = authManager.getConfig();
          console.log('🔍 Strava configuration check:', {
            hasClientId: !!config.clientId,
            redirectUri: config.redirectUri,
            scope: config.scope
          });

          if (!config.clientId) {
            throw new Error('Strava is not configured. Please configure your Strava API credentials first.');
          }
          
          // Exchange code for tokens
          const connection = await authManager.handleOAuthCallback(code, state, scope);
          
          // Test the connection
          const isValid = await stravaService.testConnection(connection);
          if (!isValid) {
            throw new Error('Failed to validate Strava connection');
          }

          // Save connection to user profile
          await userProfileService.updateProfile({
            stravaConnection: connection
          });

          console.log('✅ Strava connection successful');
          this.showStatus('Successfully connected to Strava!', 'success');
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Stay on current page or navigate back to dashboard
          setTimeout(() => {
            this.navigateToDashboard();
          }, 1000);
          
        } catch (error) {
          console.error('Strava OAuth callback error:', error);
          this.showStatus(`Failed to connect to Strava: ${error instanceof Error ? error.message : String(error)}`, 'error');
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }

  private navigateToImportPage(): void {
    // Use the same navigation logic as in TrainingHub
    if (this.trainingHub) {
      // Trigger navigation through the training hub's router
      const event = new CustomEvent('navigate', { detail: { view: 'import-data' } });
      document.dispatchEvent(event);
    }
  }

  private navigateToDashboard(): void {
    // Navigate back to dashboard
    console.log('🏠 Navigating back to dashboard after Strava connection');
    
    // Make sure dashboard view is visible
    const dashboardView = document.getElementById('dashboard-view');
    if (dashboardView) {
      dashboardView.style.display = 'block';
      dashboardView.classList.add('active');
    }
    
    // Hide any other views that might be open
    const otherViews = document.querySelectorAll('.view-container:not(#dashboard-view)');
    otherViews.forEach(view => {
      (view as HTMLElement).style.display = 'none';
      view.classList.remove('active');
    });
    
    // Update navigation state
    const navItems = document.querySelectorAll('.nav-btn');
    navItems.forEach(item => item.classList.remove('active'));
    
    const dashboardNav = document.querySelector('.nav-btn[data-view="dashboard"]');
    if (dashboardNav) {
      dashboardNav.classList.add('active');
      dashboardNav.setAttribute('aria-current', 'page');
    }
    
    // Update browser URL if needed
    if (window.location.pathname !== '/') {
      window.history.pushState({}, 'Dashboard', '/');
    }
  }

  private showStatus(message: string, type: 'info' | 'success' | 'error'): void {
    console.log(`📢 Status (${type}):`, message);
    
    // Create or update status display
    let statusEl = document.getElementById('global-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'global-status';
      statusEl.className = 'global-status-overlay';
      document.body.appendChild(statusEl);
    }
    
    statusEl.className = `global-status-overlay status-${type}`;
    statusEl.innerHTML = `
      <div class="status-content">
        <span class="status-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="status-message">${message}</span>
      </div>
    `;
    
    statusEl.style.display = 'block';
    
    // Auto-hide after a few seconds
    setTimeout(() => {
      if (statusEl) {
        statusEl.style.display = 'none';
      }
    }, type === 'error' ? 8000 : 4000);
  }

  // Public API for external access
  public getTrainingHub(): TrainingHub {
    return this.trainingHub;
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const app = new TrainingHubApp();
    
    // Make app globally accessible for debugging
    (window as any).app = app;
    
  } catch (error) {
    console.error('❌ Failed to initialize Training Hub:', error);
    UIHelpers.showStatus('Failed to initialize application. Please refresh the page.', 'error');
  }
});

export { TrainingHubApp };