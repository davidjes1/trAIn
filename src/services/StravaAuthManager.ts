// Strava OAuth Authentication Manager
// Handles OAuth flow, token management, and secure storage

import { 
  StravaOAuthConfig, 
  StravaAuthState, 
  StravaTokens, 
  StravaTokenResponse,
  StravaConnection
} from '../types/strava.types';
import { StravaConfigManager } from '../config/strava-config';

export class StravaAuthManager {
  private static instance: StravaAuthManager;
  private config: StravaOAuthConfig = {
    clientId: '',
    clientSecret: '',
    redirectUri: window.location.origin,
    scope: 'read,activity:read'
  };
  private authState: StravaAuthState | null = null;

  private constructor() {
    // Load configuration from secure config manager
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    const configManager = StravaConfigManager.getInstance();
    const config = configManager.getConfig();
    
    this.config = {
      clientId: config?.clientId || '',
      clientSecret: configManager.getClientSecret(),
      redirectUri: window.location.origin,
      scope: 'read,activity:read'
    };
  }

  public static getInstance(): StravaAuthManager {
    if (!StravaAuthManager.instance) {
      StravaAuthManager.instance = new StravaAuthManager();
    }
    return StravaAuthManager.instance;
  }

  /**
   * Initialize OAuth flow by redirecting to Strava authorization page
   */
  public async initiateOAuthFlow(): Promise<void> {
    if (!this.config.clientId) {
      throw new Error('Strava client ID not configured');
    }

    // Generate state parameter for CSRF protection
    const state = this.generateRandomString(32);
    
    // Store auth state for validation on callback
    this.authState = {
      state,
      redirectUri: this.config.redirectUri
    };
    
    // Store in localStorage for persistence across page reloads/redirects
    localStorage.setItem('strava_auth_state', JSON.stringify(this.authState));
    console.log('🔒 Stored auth state for validation:', state);

    // Build authorization URL
    const authUrl = this.buildAuthorizationUrl(state);
    
    // Redirect to Strava
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  public async handleOAuthCallback(
    code: string, 
    state: string, 
    scope: string
  ): Promise<StravaConnection> {
    // Validate state parameter
    const storedState = localStorage.getItem('strava_auth_state');
    console.log('🔍 Checking stored auth state:', { storedState: !!storedState, receivedState: state });
    
    if (!storedState) {
      throw new Error('No stored auth state found');
    }

    const authState: StravaAuthState = JSON.parse(storedState);
    console.log('🔍 Validating state:', { stored: authState.state, received: state, match: authState.state === state });
    
    if (authState.state !== state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Clear stored state
    localStorage.removeItem('strava_auth_state');
    console.log('✅ Auth state validated and cleared');

    // Exchange authorization code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(code);
    
    // Create connection object
    const connection: StravaConnection = {
      isConnected: true,
      athleteId: tokenResponse.athlete.id,
      username: tokenResponse.athlete.username,
      firstname: tokenResponse.athlete.firstname,
      lastname: tokenResponse.athlete.lastname,
      profileImageUrl: tokenResponse.athlete.profile_medium,
      connectedAt: new Date(),
      lastSyncAt: null,
      tokens: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: tokenResponse.expires_at,
        expiresIn: tokenResponse.expires_in,
        tokenType: tokenResponse.token_type,
        scope: scope
      },
      syncPreferences: {
        autoSync: true,
        syncInterval: 'daily',
        syncHistoryDays: 30,
        activityTypes: ['Ride', 'Run', 'Swim'],
        includePrivateActivities: false,
        overwriteExisting: false
      }
    };

    return connection;
  }

  /**
   * Refresh expired access token using refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
    // Strava API expects form-encoded data, not JSON
    const formData = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error_description || response.statusText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      throw new Error(`Token refresh failed: ${errorMessage}`);
    }

    const tokenResponse: StravaTokenResponse = await response.json();

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_at,
      expiresIn: tokenResponse.expires_in,
      tokenType: tokenResponse.token_type,
      scope: tokenResponse.athlete ? '' : 'read,activity:read' // Refresh doesn't return scope
    };
  }

  /**
   * Check if access token is expired or about to expire
   */
  public isTokenExpired(tokens: StravaTokens): boolean {
    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 300; // 5 minutes buffer
    return tokens.expiresAt <= (now + bufferSeconds);
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  public async getValidAccessToken(connection: StravaConnection): Promise<string> {
    if (!connection.tokens) {
      throw new Error('No tokens available in connection');
    }

    if (this.isTokenExpired(connection.tokens)) {
      const newTokens = await this.refreshAccessToken(connection.tokens.refreshToken);
      // Update connection with new tokens (caller should save to storage)
      connection.tokens = newTokens;
    }

    return connection.tokens.accessToken;
  }

  /**
   * Revoke Strava authorization and clear tokens
   */
  public async revokeAuthorization(accessToken: string): Promise<void> {
    try {
      const response = await fetch('https://www.strava.com/oauth/deauthorize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to revoke Strava authorization:', response.statusText);
        // Continue anyway to clear local tokens
      }
    } catch (error) {
      console.warn('Error revoking Strava authorization:', error);
      // Continue anyway to clear local tokens
    }
  }

  /**
   * Build Strava authorization URL
   */
  private buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      approval_prompt: 'force', // Always show consent screen
      scope: this.config.scope,
      state: state
    });

    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<StravaTokenResponse> {
    // Strava API expects form-encoded data, not JSON
    const formData = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: code,
      grant_type: 'authorization_code'
    });

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error_description || response.statusText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      throw new Error(`Token exchange failed: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * Generate cryptographically secure random string
   */
  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    
    return Array.from(values, (byte) => charset[byte % charset.length]).join('');
  }

  /**
   * Update configuration and reload from config manager
   */
  public updateConfig(config: Partial<StravaOAuthConfig>): void {
    this.config = { ...this.config, ...config };
    // Also reload from config manager to get latest credentials
    this.loadConfiguration();
  }

  /**
   * Get current configuration (excluding secrets)
   */
  public getConfig(): Omit<StravaOAuthConfig, 'clientSecret'> {
    return {
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      scope: this.config.scope
    };
  }
}