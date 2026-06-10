// Strava Configuration Modal
// Secure UI for entering Strava API credentials

import { StravaConfigManager } from '../../config/strava-config';
import { StravaAuthManager } from '../../services/StravaAuthManager';

export class StravaConfigurationModal {
  private container: HTMLElement;
  private onConfigured?: () => void;

  constructor(container: HTMLElement, onConfigured?: () => void) {
    this.container = container;
    this.onConfigured = onConfigured;
  }

  public show(): void {
    console.log('🔧 StravaConfigurationModal.show() - Creating modal');
    const modal = this.createModal();
    
    console.log('🔧 Modal created, adding to body');
    document.body.appendChild(modal);
    
    // Debug modal position and visibility
    console.log('🔧 Modal styles after append:', {
      position: modal.style.position,
      zIndex: modal.style.zIndex,
      display: modal.style.display,
      visibility: modal.style.visibility,
      opacity: modal.style.opacity
    });
    
    console.log('🔧 Modal bounding rect:', modal.getBoundingClientRect());
    
    this.attachEventListeners(modal);

    // Focus on first input
    setTimeout(() => {
      const clientIdInput = modal.querySelector('#strava-client-id') as HTMLInputElement;
      clientIdInput?.focus();
      console.log('🔧 Focus attempted on input:', clientIdInput);
    }, 100);
    
    console.log('🔧 StravaConfigurationModal.show() - Complete');
  }

  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'strava-config-modal';
    
    // Force visibility with inline styles to bypass any CSS issues
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 9999 !important;
      display: block !important;
      background-color: rgba(0, 0, 0, 0.8) !important;
      pointer-events: auto !important;
    `;
    
    modal.innerHTML = `
      <div class="modal-overlay" style="
        position: absolute;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex !important;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      ">
        <div class="modal-content" style="
          background: white !important;
          border-radius: 12px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          display: block !important;
        ">
          <div class="modal-header">
            <h3>🔧 Configure Strava API</h3>
            <button class="modal-close" id="close-config-modal" type="button">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="config-info">
              <div class="info-section">
                <h4>📋 Setup Instructions</h4>
                <ol>
                  <li>Go to <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener">Strava API Settings</a></li>
                  <li>Create a new application or use an existing one</li>
                  <li>Set the <strong>Authorization Callback Domain</strong> to: <code>${window.location.origin}</code></li>
                  <li>Copy your <strong>Client ID</strong> and <strong>Client Secret</strong> below</li>
                </ol>
              </div>
              
              <div class="security-warning">
                <span class="warning-icon">⚠️</span>
                <div>
                  <strong>Security Notice:</strong> Your credentials are stored locally and encrypted. Never share your Client Secret publicly.
                </div>
              </div>
            </div>

            <form id="strava-config-form" class="config-form">
              <div class="form-group">
                <label for="strava-client-id">Client ID</label>
                <input 
                  type="text" 
                  id="strava-client-id" 
                  name="clientId"
                  placeholder="Your Strava Client ID"
                  required
                  autocomplete="off"
                >
                <small class="help-text">Found in your Strava API application settings</small>
              </div>

              <div class="form-group">
                <label for="strava-client-secret">Client Secret</label>
                <input 
                  type="password" 
                  id="strava-client-secret" 
                  name="clientSecret"
                  placeholder="Your Strava Client Secret"
                  required
                  autocomplete="off"
                >
                <small class="help-text">Keep this secret! Never share it publicly</small>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="save-config" checked>
                  <span>Save configuration securely for future use</span>
                </label>
              </div>
            </form>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancel-config">Cancel</button>
            <button type="submit" form="strava-config-form" class="btn-primary" id="save-config-btn">
              💾 Save Configuration
            </button>
          </div>
        </div>
      </div>
    `;

    return modal;
  }

  private attachEventListeners(modal: HTMLElement): void {
    const form = modal.querySelector('#strava-config-form') as HTMLFormElement;
    const closeBtn = modal.querySelector('#close-config-modal');
    const cancelBtn = modal.querySelector('#cancel-config');
    const saveBtn = modal.querySelector('#save-config-btn');

    // Close modal handlers
    const closeModal = () => {
      modal.remove();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Close on overlay click
    modal.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === modal.querySelector('.modal-overlay')) {
        closeModal();
      }
    });

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Form submission
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleConfigSave(modal, form);
    });

    // Input validation
    const inputs = modal.querySelectorAll('input[type="text"], input[type="password"]');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        this.validateForm(form, saveBtn as HTMLButtonElement);
      });
    });

    // Initial validation
    this.validateForm(form, saveBtn as HTMLButtonElement);
  }

  private validateForm(form: HTMLFormElement, saveBtn: HTMLButtonElement): void {
    const clientId = (form.querySelector('#strava-client-id') as HTMLInputElement).value.trim();
    const clientSecret = (form.querySelector('#strava-client-secret') as HTMLInputElement).value.trim();

    const isValid = clientId.length > 0 && clientSecret.length > 0;
    
    saveBtn.disabled = !isValid;
    saveBtn.style.opacity = isValid ? '1' : '0.6';
  }

  private async handleConfigSave(modal: HTMLElement, form: HTMLFormElement): Promise<void> {
    console.log('🔧 Form submission started');
    console.log('🔧 Form element:', form);
    console.log('🔧 Looking for save button with ID: save-config-btn');
    
    const formData = new FormData(form);
    const clientId = (formData.get('clientId') as string).trim();
    const clientSecret = (formData.get('clientSecret') as string).trim();
    const saveConfig = (form.querySelector('#save-config') as HTMLInputElement).checked;

    // The save button is outside the form but linked to it, so search in the whole modal
    const saveBtn = modal.querySelector('#save-config-btn') as HTMLButtonElement;
    console.log('🔧 Save button found:', saveBtn);
    console.log('🔧 All buttons in form:', form.querySelectorAll('button'));
    console.log('🔧 All elements with save-config-btn:', document.querySelectorAll('#save-config-btn'));
    
    if (!saveBtn) {
      console.error('❌ Save button not found! Cannot proceed.');
      return;
    }
    
    const originalText = saveBtn.innerHTML;

    try {
      // Show loading state
      saveBtn.disabled = true;
      saveBtn.innerHTML = '⏳ Saving...';

      // Configure Strava
      const configManager = StravaConfigManager.getInstance();
      configManager.configure(clientId, clientSecret);

      // Save to storage if requested
      if (saveConfig) {
        await configManager.saveToStorage();
      }

      // Update auth manager with new config
      const authManager = StravaAuthManager.getInstance();
      authManager.updateConfig({});

      // Show success
      saveBtn.innerHTML = '✅ Saved!';
      
      setTimeout(() => {
        modal.remove();
        this.onConfigured?.();
        this.showSuccessMessage();
      }, 1000);

    } catch (error) {
      console.error('Error saving Strava configuration:', error);
      
      // Show error state
      saveBtn.innerHTML = '❌ Error';
      saveBtn.style.backgroundColor = '#dc2626';
      
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        saveBtn.style.backgroundColor = '';
      }, 2000);
    }
  }

  private showSuccessMessage(): void {
    const message = document.createElement('div');
    message.className = 'config-success-message';
    message.innerHTML = `
      <div class="success-content">
        <span class="success-icon">✅</span>
        <span>Strava configuration saved! You can now connect to Strava.</span>
      </div>
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 3000);
  }

  // Static method to show configuration modal
  public static show(onConfigured?: () => void): void {
    // Remove any existing configuration modals
    const existingModals = document.querySelectorAll('.strava-config-modal');
    existingModals.forEach(modal => modal.remove());
    
    try {
      const container = document.createElement('div');
      const modal = new StravaConfigurationModal(container, onConfigured);
      modal.show();
    } catch (error) {
      console.error('❌ Error showing Strava configuration modal:', error);
    }
  }

  // Check if configuration is needed
  public static isConfigurationNeeded(): boolean {
    const configManager = StravaConfigManager.getInstance();
    return !configManager.isConfigured();
  }
}