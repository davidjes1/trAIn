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
    
    // Store in sessionStorage for callback validation
    sessionStorage.setItem('strava_auth_state', JSON.stringify(this.authState));

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
    const storedState = sessionStorage.getItem('strava_auth_state');
    if (!storedState) {
      throw new Error('No stored auth state found');
    }

    const authState: StravaAuthState = JSON.parse(storedState);
    if (authState.state !== state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Clear stored state
    sessionStorage.removeItem('strava_auth_state');

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
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.message || response.statusText}`);
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
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.message || response.statusText}`);
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