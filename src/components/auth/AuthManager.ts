// Authentication UI Manager
import { AuthService } from '../../firebase/auth';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types/firebase.types';

export class AuthManager {
  private container: HTMLElement;
  private currentUser: User | null = null;
  private userProfile: UserProfile | null = null;
  private onAuthStateChanged: (user: User | null, profile: UserProfile | null) => void;

  constructor(container: HTMLElement, onAuthStateChanged: (user: User | null, profile: UserProfile | null) => void) {
    this.container = container;
    this.onAuthStateChanged = onAuthStateChanged;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Initialize Firebase Auth
    this.currentUser = await AuthService.initialize();
    
    if (this.currentUser) {
      this.userProfile = await AuthService.getUserProfile();
      this.renderUserProfile();
    } else {
      this.renderAuthForms();
    }

    // Listen for auth state changes
    AuthService.addAuthStateListener(async (user) => {
      this.currentUser = user;
      if (user) {
        this.userProfile = await AuthService.getUserProfile();
        this.renderUserProfile();
      } else {
        this.userProfile = null;
        this.renderAuthForms();
      }
      this.onAuthStateChanged(user, this.userProfile);
    });
  }

  private renderAuthForms(): void {
    this.container.innerHTML = `
      <div class="auth-container">
        <div class="auth-header">
          <h1>trAIn - Training Analytics</h1>
          <p>Sign in to access your personalized training dashboard</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Sign In</button>
          <button class="auth-tab" data-tab="register">Sign Up</button>
        </div>

        <div class="auth-forms">
          <!-- Login Form -->
          <form id="loginForm" class="auth-form active">
            <div class="form-group">
              <label for="loginEmail">Email</label>
              <input type="email" id="loginEmail" required>
            </div>
            <div class="form-group">
              <label for="loginPassword">Password</label>
              <input type="password" id="loginPassword" required>
            </div>
            <button type="submit" class="auth-btn">Sign In</button>
            <div class="auth-links">
              <button type="button" class="link-btn" id="forgotPasswordBtn">Forgot Password?</button>
            </div>
          </form>

          <!-- Register Form -->
          <form id="registerForm" class="auth-form">
            <div class="form-group">
              <label for="registerDisplayName">Display Name</label>
              <input type="text" id="registerDisplayName" required>
            </div>
            <div class="form-group">
              <label for="registerEmail">Email</label>
              <input type="email" id="registerEmail" required>
            </div>
            <div class="form-group">
              <label for="registerPassword">Password</label>
              <input type="password" id="registerPassword" required minlength="6">
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" required minlength="6">
            </div>
            <button type="submit" class="auth-btn">Create Account</button>
          </form>

          <!-- Password Reset Form -->
          <form id="resetPasswordForm" class="auth-form">
            <div class="form-group">
              <label for="resetEmail">Email</label>
              <input type="email" id="resetEmail" required>
            </div>
            <button type="submit" class="auth-btn">Send Reset Email</button>
            <div class="auth-links">
              <button type="button" class="link-btn" id="backToLoginBtn">Back to Sign In</button>
            </div>
          </form>
        </div>

        <div class="auth-status" id="authStatus"></div>
      </div>
    `;

    this.attachAuthEventListeners();
  }

  private renderUserProfile(): void {
    const displayName = this.userProfile?.displayName || this.currentUser?.email || 'User';
    const email = this.currentUser?.email || '';

    this.container.innerHTML = `
      <div class="user-profile">
        <div class="user-info">
          <div class="user-avatar">
            <i class="fas fa-user-circle"></i>
          </div>
          <div class="user-details">
            <h3>${displayName}</h3>
            <p>${email}</p>
          </div>
        </div>
        <div class="user-stats">
          <div class="stat">
            <span class="stat-value">${this.userProfile?.stats.totalActivities || 0}</span>
            <span class="stat-label">Activities</span>
          </div>
          <div class="stat">
            <span class="stat-value">${Math.round((this.userProfile?.stats.totalTrainingTime || 0) / 60)}</span>
            <span class="stat-label">Hours</span>
          </div>
        </div>
        <div class="user-actions">
          <button class="profile-btn" id="editProfileBtn">Edit Profile</button>
          <button class="logout-btn" id="logoutBtn">Sign Out</button>
        </div>
      </div>
    `;

    this.attachUserProfileListeners();
  }

  private attachAuthEventListeners(): void {
    // Tab switching
    const tabButtons = this.container.querySelectorAll('.auth-tab');
    const forms = this.container.querySelectorAll('.auth-form');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tab = (button as HTMLElement).dataset.tab;
        
        // Update active tab
        tabButtons.forEach(t => t.classList.remove('active'));
        button.classList.add('active');

        // Show corresponding form
        forms.forEach(form => {
          form.classList.remove('active');
          if (form.id === `${tab}Form`) {
            form.classList.add('active');
          }
        });
      });
    });

    // Login form
    const loginForm = this.container.querySelector('#loginForm') as HTMLFormElement;
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    // Register form
    const registerForm = this.container.querySelector('#registerForm') as HTMLFormElement;
    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegister();
    });

    // Reset password form
    const resetForm = this.container.querySelector('#resetPasswordForm') as HTMLFormElement;
    resetForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handlePasswordReset();
    });

    // Forgot password link
    const forgotPasswordBtn = this.container.querySelector('#forgotPasswordBtn');
    forgotPasswordBtn?.addEventListener('click', () => {
      forms.forEach(form => form.classList.remove('active'));
      const resetForm = this.container.querySelector('#resetPasswordForm');
      resetForm?.classList.add('active');
    });

    // Back to login link
    const backToLoginBtn = this.container.querySelector('#backToLoginBtn');
    backToLoginBtn?.addEventListener('click', () => {
      forms.forEach(form => form.classList.remove('active'));
      const loginForm = this.container.querySelector('#loginForm');
      loginForm?.classList.add('active');
    });
  }

  private attachUserProfileListeners(): void {
    const logoutBtn = this.container.querySelector('#logoutBtn');
    logoutBtn?.addEventListener('click', async () => {
      try {
        await AuthService.logout();
        this.showStatus('Signed out successfully', 'success');
      } catch (error) {
        this.showStatus(`Sign out failed: ${(error as Error).message}`, 'error');
      }
    });

    const editProfileBtn = this.container.querySelector('#editProfileBtn');
    editProfileBtn?.addEventListener('click', () => {
      this.showEditProfileModal();
    });
  }

  private async handleLogin(): Promise<void> {
    const email = (this.container.querySelector('#loginEmail') as HTMLInputElement).value;
    const password = (this.container.querySelector('#loginPassword') as HTMLInputElement).value;

    try {
      this.showStatus('Signing in...', 'info');
      await AuthService.login(email, password);
      this.showStatus('Signed in successfully!', 'success');
    } catch (error) {
      this.showStatus(`Sign in failed: ${(error as Error).message}`, 'error');
    }
  }

  private async handleRegister(): Promise<void> {
    const displayName = (this.container.querySelector('#registerDisplayName') as HTMLInputElement).value;
    const email = (this.container.querySelector('#registerEmail') as HTMLInputElement).value;
    const password = (this.container.querySelector('#registerPassword') as HTMLInputElement).value;
    const confirmPassword = (this.container.querySelector('#confirmPassword') as HTMLInputElement).value;

    if (password !== confirmPassword) {
      this.showStatus('Passwords do not match', 'error');
      return;
    }

    try {
      this.showStatus('Creating account...', 'info');
      await AuthService.register(email, password, displayName);
      this.showStatus('Account created successfully!', 'success');
    } catch (error) {
      this.showStatus(`Registration failed: ${(error as Error).message}`, 'error');
    }
  }

  private async handlePasswordReset(): Promise<void> {
    const email = (this.container.querySelector('#resetEmail') as HTMLInputElement).value;

    try {
      this.showStatus('Sending reset email...', 'info');
      await AuthService.resetPassword(email);
      this.showStatus('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
      this.showStatus(`Reset failed: ${(error as Error).message}`, 'error');
    }
  }

  private showEditProfileModal(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Edit Profile</h3>
          <button class="modal-close">&times;</button>
        </div>
        <form id="editProfileForm" class="modal-form">
          <div class="form-group">
            <label for="editDisplayName">Display Name</label>
            <input type="text" id="editDisplayName" value="${this.userProfile?.displayName || ''}" required>
          </div>
          <div class="form-group">
            <label for="editTimezone">Timezone</label>
            <select id="editTimezone">
              <option value="${this.userProfile?.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}">
                ${this.userProfile?.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="editUnits">Units</label>
            <select id="editUnits">
              <option value="metric" ${this.userProfile?.preferences?.units === 'metric' ? 'selected' : ''}>Metric (km, kg)</option>
              <option value="imperial" ${this.userProfile?.preferences?.units === 'imperial' ? 'selected' : ''}>Imperial (miles, lbs)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editRestingHR">Resting Heart Rate</label>
            <input type="number" id="editRestingHR" value="${this.userProfile?.preferences?.restingHR || 60}" min="30" max="100">
          </div>
          <div class="form-group">
            <label for="editMaxHR">Maximum Heart Rate</label>
            <input type="number" id="editMaxHR" value="${this.userProfile?.preferences?.maxHR || 190}" min="150" max="220">
          </div>
          <div class="modal-actions">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle modal close
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.cancel-btn');
    [closeBtn, cancelBtn].forEach(btn => {
      btn?.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    });

    // Handle form submission
    const form = modal.querySelector('#editProfileForm') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleProfileUpdate(modal);
    });
  }

  private async handleProfileUpdate(modal: HTMLElement): Promise<void> {
    const displayName = (modal.querySelector('#editDisplayName') as HTMLInputElement).value;
    const timezone = (modal.querySelector('#editTimezone') as HTMLSelectElement).value;
    const units = (modal.querySelector('#editUnits') as HTMLSelectElement).value as 'metric' | 'imperial';
    const restingHR = parseInt((modal.querySelector('#editRestingHR') as HTMLInputElement).value);
    const maxHR = parseInt((modal.querySelector('#editMaxHR') as HTMLInputElement).value);

    try {
      const updates: Partial<UserProfile> = {
        displayName,
        preferences: {
          ...this.userProfile?.preferences,
          timezone,
          units,
          restingHR,
          maxHR
        } as any
      };

      await AuthService.updateUserProfile(updates);
      this.userProfile = await AuthService.getUserProfile();
      this.renderUserProfile();
      document.body.removeChild(modal);
      this.showStatus('Profile updated successfully!', 'success');
    } catch (error) {
      this.showStatus(`Profile update failed: ${(error as Error).message}`, 'error');
    }
  }

  private showStatus(message: string, type: 'info' | 'success' | 'error'): void {
    const statusElement = this.container.querySelector('#authStatus');
    if (!statusElement) return;

    statusElement.className = `auth-status ${type}`;
    statusElement.textContent = message;

    // Clear status after 5 seconds
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'auth-status';
    }, 5000);
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}