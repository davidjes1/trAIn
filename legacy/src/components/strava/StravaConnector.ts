// Strava Connection UI Component
// Handles Strava OAuth flow and connection management with compliant branding

import { StravaAuthManager } from '../../services/StravaAuthManager';
import { StravaService } from '../../services/StravaService';
import { UserProfileService } from '../../services/UserProfileService';
import { StravaConnection } from '../../types/strava.types';
import { StravaConfigurationModal } from './StravaConfigurationModal';
import { StravaConfigManager } from '../../config/strava-config';

export class StravaConnector {
  private container: HTMLElement;
  private authManager: StravaAuthManager;
  private stravaService: StravaService;
  private userProfileService: UserProfileService;
  private connection: StravaConnection | null = null;
  private onConnectionChange?: (connected: boolean) => void;

  constructor(container: HTMLElement, onConnectionChange?: (connected: boolean) => void) {
    this.container = container;
    this.authManager = StravaAuthManager.getInstance();
    this.stravaService = StravaService.getInstance();
    this.userProfileService = UserProfileService.getInstance();
    this.onConnectionChange = onConnectionChange;
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Check if user already has Strava connection
    const userProfile = this.userProfileService.getUserProfile();
    this.connection = userProfile?.stravaConnection || null;
    
    // Check for OAuth callback parameters only if they exist and have Strava-related values
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthCallback = urlParams.has('code') && urlParams.has('state') && urlParams.has('scope');
    
    console.log('🔍 Checking for OAuth callback:', { 
      hasCode: urlParams.has('code'), 
      hasState: urlParams.has('state'), 
      hasScope: urlParams.has('scope'),
      willHandle: hasAuthCallback 
    });
    
    if (hasAuthCallback) {
      await this.handleOAuthCallback();
    }
    
    this.render();
  }

  private async handleOAuthCallback(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const scope = urlParams.get('scope');
    const error = urlParams.get('error');

    if (error) {
      this.showError(`Strava authorization failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state && scope) {
      try {
        this.showConnecting();
        
        // Exchange code for tokens
        const connection = await this.authManager.handleOAuthCallback(code, state, scope);
        
        // Test the connection
        const isValid = await this.stravaService.testConnection(connection);
        if (!isValid) {
          throw new Error('Failed to validate Strava connection');
        }

        // Save connection to user profile
        await this.userProfileService.updateProfile({
          stravaConnection: connection
        });

        this.connection = connection;
        this.showSuccess('Successfully connected to Strava!');
        this.render();
        
        if (this.onConnectionChange) {
          this.onConnectionChange(true);
        }

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
      } catch (error) {
        console.error('Strava OAuth callback error:', error);
        this.showError(`Failed to connect to Strava: ${error instanceof Error ? error.message : String(error)}`);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  private render(): void {
    if (this.connection?.isConnected) {
      this.renderConnectedState();
    } else {
      this.renderDisconnectedState();
    }
  }

  private renderDisconnectedState(): void {
    this.container.innerHTML = `
      <div class="strava-connector">
        <div class="strava-info">
          <div class="strava-logo">
            <svg width="40" height="40" viewBox="0 0 432 432" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M157.5 0L157.5 216L216 324L274.5 216L274.5 0H216L157.5 0Z" fill="#FC4C02"/>
              <path d="M216 216L274.5 324L333 216H274.5L216 324L157.5 216H216Z" fill="#FC4C02"/>
            </svg>
          </div>
          <h3>Connect with Strava</h3>
          <p>Import your activities automatically from Strava to analyze your training data.</p>
          <ul class="benefits-list">
            <li>✓ Automatic activity import</li>
            <li>✓ Heart rate zone analysis</li>
            <li>✓ Training load calculations</li>
            <li>✓ Performance tracking</li>
          </ul>
        </div>
        
        <div class="strava-actions">
          <button id="connectStravaBtn" class="strava-connect-btn">
            <svg width="18" height="18" viewBox="0 0 432 432" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M157.5 0L157.5 216L216 324L274.5 216L274.5 0H216L157.5 0Z" fill="white"/>
              <path d="M216 216L274.5 324L333 216H274.5L216 324L157.5 216H216Z" fill="white"/>
            </svg>
            Connect with Strava
          </button>
          <div class="strava-disclaimer">
            <p>By connecting, you agree to Strava's data sharing terms. Your data will only be visible to you.</p>
          </div>
        </div>
        
        <div class="strava-branding">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMTIwIDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8dGV4dCB4PSIwIiB5PSIxOCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzc2NzY3NiI+UG93ZXJlZCBieSBTdHJhdmE8L3RleHQ+Cjwvc3ZnPg==" alt="Powered by Strava" class="powered-by-strava" />
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderConnectedState(): void {
    const connection = this.connection!;
    const lastSync = connection.lastSyncAt ? 
      new Date(connection.lastSyncAt).toLocaleDateString() : 'Never';
    
    this.container.innerHTML = `
      <div class="strava-connector connected">
        <div class="connection-status">
          <div class="status-header">
            <div class="athlete-info">
              ${connection.profileImageUrl ? 
                `<img src="${connection.profileImageUrl}" alt="Profile" class="athlete-avatar" />` : 
                '<div class="athlete-avatar-placeholder"></div>'
              }
              <div class="athlete-details">
                <h4>${connection.firstname} ${connection.lastname}</h4>
                <p>@${connection.username}</p>
              </div>
            </div>
            <div class="connection-badge">
              <span class="status-indicator connected"></span>
              Connected
            </div>
          </div>
          
          <div class="sync-info">
            <p><strong>Last sync:</strong> ${lastSync}</p>
            <p><strong>Auto sync:</strong> ${connection.syncPreferences.autoSync ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>

        <div class="strava-actions">
          <button id="syncStravaBtn" class="btn-primary">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
              <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
            </svg>
            Sync Now
          </button>
          <button id="settingsStravaBtn" class="btn-secondary">Settings</button>
          <button id="disconnectStravaBtn" class="btn-danger-outline">Disconnect</button>
        </div>

        <div class="rate-limit-info">
          <div class="rate-limit-indicator">
            <span class="rate-limit-label">API Usage</span>
            <div class="rate-limit-bar">
              <div class="rate-limit-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>
        
        <div class="strava-branding">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMTIwIDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8dGV4dCB4PSIwIiB5PSIxOCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzc2NzY3NiI+UG93ZXJlZCBieSBTdHJhdmE8L3RleHQ+Cjwvc3ZnPg==" alt="Powered by Strava" class="powered-by-strava" />
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.updateRateLimitDisplay();
  }

  private attachEventListeners(): void {
    const connectBtn = this.container.querySelector('#connectStravaBtn') as HTMLButtonElement;
    const syncBtn = this.container.querySelector('#syncStravaBtn') as HTMLButtonElement;
    const settingsBtn = this.container.querySelector('#settingsStravaBtn') as HTMLButtonElement;
    const disconnectBtn = this.container.querySelector('#disconnectStravaBtn') as HTMLButtonElement;

    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.handleConnect());
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.handleSync());
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showSettings());
    }

    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => this.handleDisconnect());
    }
  }

  private async handleConnect(): Promise<void> {
    try {
      // Check if Strava is configured first
      const configManager = StravaConfigManager.getInstance();
      if (!configManager.isConfigured()) {
        console.log('🔧 Strava not configured, showing configuration modal');
        StravaConfigurationModal.show(() => {
          // After configuration, try connecting again
          this.attemptConnection();
        });
        return;
      }

      await this.attemptConnection();
    } catch (error) {
      console.error('Strava connect error:', error);
      this.showError(`Failed to initiate Strava connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async attemptConnection(): Promise<void> {
    this.showConnecting();
    await this.authManager.initiateOAuthFlow();
  }

  private async handleSync(): Promise<void> {
    if (!this.connection) return;

    try {
      this.showSyncing();
      
      // Get current user ID from AuthService
      const userId = (await import('../../firebase/auth')).AuthService.getCurrentUserId();
      
      if (!userId) {
        throw new Error('User ID not found. Please sign in again.');
      }
      
      const result = await this.stravaService.syncRecentActivities(
        this.connection,
        userId,
        (progress) => {
          this.updateSyncProgress(progress.current, progress.total);
        }
      );

      this.connection.lastSyncAt = new Date();
      await this.userProfileService.updateProfile({
        stravaConnection: this.connection
      });

      this.showSyncComplete(result.savedWorkouts, result.totalFetched);
      this.render();

      // Trigger a refresh of workout displays
      document.dispatchEvent(new CustomEvent('workouts-updated'));

    } catch (error) {
      console.error('Strava sync error:', error);
      this.showError(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleDisconnect(): Promise<void> {
    if (!this.connection?.tokens) return;

    const confirmed = confirm('Are you sure you want to disconnect from Strava? This will stop automatic activity imports.');
    if (!confirmed) return;

    try {
      // Revoke authorization with Strava
      await this.authManager.revokeAuthorization(this.connection.tokens.accessToken);
      
      // Remove connection from user profile
      await this.userProfileService.updateProfile({
        stravaConnection: undefined
      });

      this.connection = null;
      this.render();
      
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }

      this.showSuccess('Successfully disconnected from Strava');

    } catch (error) {
      console.error('Strava disconnect error:', error);
      this.showError(`Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private showSettings(): void {
    if (!this.connection) return;

    // Create a simple settings modal
    const modal = document.createElement('div');
    modal.className = 'strava-settings-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Strava Sync Settings</h3>
          <button class="modal-close" type="button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="setting-group">
            <label>
              <input type="checkbox" id="autoSync" ${this.connection.syncPreferences.autoSync ? 'checked' : ''}>
              Enable automatic sync
            </label>
          </div>
          <div class="setting-group">
            <label for="syncInterval">Sync frequency:</label>
            <select id="syncInterval">
              <option value="manual" ${this.connection.syncPreferences.syncInterval === 'manual' ? 'selected' : ''}>Manual only</option>
              <option value="hourly" ${this.connection.syncPreferences.syncInterval === 'hourly' ? 'selected' : ''}>Every hour</option>
              <option value="daily" ${this.connection.syncPreferences.syncInterval === 'daily' ? 'selected' : ''}>Daily</option>
              <option value="weekly" ${this.connection.syncPreferences.syncInterval === 'weekly' ? 'selected' : ''}>Weekly</option>
            </select>
          </div>
          <div class="setting-group">
            <label for="syncHistoryDays">Days of history to sync:</label>
            <input type="number" id="syncHistoryDays" value="${this.connection.syncPreferences.syncHistoryDays}" min="1" max="90">
          </div>
          <div class="setting-group">
            <label>
              <input type="checkbox" id="includePrivate" ${this.connection.syncPreferences.includePrivateActivities ? 'checked' : ''}>
              Include private activities
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" id="saveSettings">Save</button>
          <button class="btn-secondary" id="cancelSettings">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle modal interactions
    modal.querySelector('.modal-close')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#cancelSettings')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#saveSettings')?.addEventListener('click', async () => {
      await this.saveSettings(modal);
      document.body.removeChild(modal);
    });
  }

  private async saveSettings(modal: Element): Promise<void> {
    if (!this.connection) return;

    const autoSync = (modal.querySelector('#autoSync') as HTMLInputElement).checked;
    const syncInterval = (modal.querySelector('#syncInterval') as HTMLSelectElement).value as any;
    const syncHistoryDays = parseInt((modal.querySelector('#syncHistoryDays') as HTMLInputElement).value);
    const includePrivate = (modal.querySelector('#includePrivate') as HTMLInputElement).checked;

    this.connection.syncPreferences = {
      ...this.connection.syncPreferences,
      autoSync,
      syncInterval,
      syncHistoryDays,
      includePrivateActivities: includePrivate
    };

    await this.userProfileService.updateProfile({
      stravaConnection: this.connection
    });

    this.showSuccess('Settings saved successfully');
  }

  private updateRateLimitDisplay(): void {
    const rateLimitStatus = this.stravaService.getRateLimitStatus();
    if (!rateLimitStatus) return;

    const fillElement = this.container.querySelector('.rate-limit-fill') as HTMLElement;
    if (fillElement) {
      const usagePercent = (rateLimitStatus.fifteenMinute.usage / rateLimitStatus.fifteenMinute.limit) * 100;
      fillElement.style.width = `${Math.min(usagePercent, 100)}%`;
      
      if (usagePercent > 80) {
        fillElement.style.backgroundColor = '#ff6b6b';
      } else if (usagePercent > 60) {
        fillElement.style.backgroundColor = '#ffd93d';
      } else {
        fillElement.style.backgroundColor = '#6bcf7f';
      }
    }
  }

  // Status message methods
  private showConnecting(): void {
    this.showStatus('Connecting to Strava...', 'info');
  }

  private showSyncing(): void {
    this.showStatus('Syncing activities from Strava...', 'info');
  }

  private showSyncComplete(savedWorkouts: number, total: number): void {
    this.showStatus(`Sync complete! ${savedWorkouts} new workouts saved (${total} total fetched)`, 'success');
  }

  private showSuccess(message: string): void {
    this.showStatus(message, 'success');
  }

  private showError(message: string): void {
    this.showStatus(message, 'error');
  }

  private showStatus(message: string, type: 'info' | 'success' | 'error'): void {
    const statusElement = document.createElement('div');
    statusElement.className = `status-message ${type}`;
    statusElement.textContent = message;

    this.container.appendChild(statusElement);

    setTimeout(() => {
      if (statusElement.parentNode === this.container) {
        this.container.removeChild(statusElement);
      }
    }, 5000);
  }

  private updateSyncProgress(current: number, total: number): void {
    const existingProgress = this.container.querySelector('.sync-progress');
    if (existingProgress) {
      existingProgress.textContent = `Syncing: ${current}/${total} activities`;
    }
  }
}