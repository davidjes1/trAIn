// Strava Configuration Management
// Secure handling of Strava API credentials

export interface StravaConfig {
  clientId: string;
  clientSecret: string;
  configured: boolean;
}

export class StravaConfigManager {
  private static instance: StravaConfigManager;
  private config: StravaConfig | null = null;

  private constructor() {
    // Initialize with default configuration
    this.initializeDefaultConfig();
  }

  private initializeDefaultConfig(): void {
    // Use provided Strava app credentials
    this.config = {
      clientId: '174184',
      clientSecret: '3bfb5093e02798ed5180f032913c094e16ad926e',
      configured: true
    };
    console.log('✅ Strava configuration initialized with provided credentials');
  }

  public static getInstance(): StravaConfigManager {
    if (!StravaConfigManager.instance) {
      StravaConfigManager.instance = new StravaConfigManager();
    }
    return StravaConfigManager.instance;
  }

  /**
   * Configure Strava API credentials
   * These should be entered through a secure UI, not hardcoded
   */
  public configure(clientId: string, clientSecret: string): void {
    this.config = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      configured: true
    };

    console.log('✅ Strava configuration updated');
  }

  /**
   * Get current configuration
   * Client secret is not returned for security
   */
  public getConfig(): { clientId: string; configured: boolean } | null {
    if (!this.config) return null;
    
    return {
      clientId: this.config.clientId,
      configured: this.config.configured
    };
  }

  /**
   * Get client secret (only for internal use by StravaAuthManager)
   */
  public getClientSecret(): string {
    return this.config?.clientSecret || '';
  }

  /**
   * Check if Strava is properly configured
   */
  public isConfigured(): boolean {
    return this.config?.configured && 
           !!this.config.clientId && 
           !!this.config.clientSecret;
  }

  /**
   * Clear configuration (for logout/reset)
   */
  public clearConfig(): void {
    this.config = null;
    console.log('🧹 Strava configuration cleared');
  }

  /**
   * Load configuration from secure storage (if implemented)
   * Only overrides defaults if user has explicitly saved custom credentials
   */
  public async loadFromStorage(): Promise<boolean> {
    try {
      // In a production app, you might load from encrypted storage
      // For now, this is a placeholder
      const stored = localStorage.getItem('strava_config_encrypted');
      if (stored) {
        // In production: decrypt the stored data
        // For demo: just parse (NOT SECURE - don't use for real credentials)
        const parsed = JSON.parse(stored);
        
        // Only override if it's different from defaults (user customization)
        if (parsed.clientId !== '174184' || parsed.clientSecret !== '3bfb5093e02798ed5180f032913c094e16ad926e') {
          this.configure(parsed.clientId, parsed.clientSecret);
          console.log('✅ Custom Strava configuration loaded from storage');
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading Strava config from storage:', error);
    }
    console.log('📋 Using default Strava configuration');
    return false;
  }

  /**
   * Save configuration to secure storage (if implemented)
   */
  public async saveToStorage(): Promise<boolean> {
    try {
      if (!this.config) return false;

      // In production: encrypt before storing
      // For demo: just stringify (NOT SECURE - don't use for real credentials)
      const toStore = JSON.stringify({
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret
      });
      
      localStorage.setItem('strava_config_encrypted', toStore);
      return true;
    } catch (error) {
      console.error('Error saving Strava config to storage:', error);
      return false;
    }
  }
}