import './polyfills';
import './styles/main.scss';
import { UIHelpers } from './utils/ui-helpers';
import { ExportService } from './services/ExportService';
import { TrainingHub } from './components/training-hub/TrainingHub';

class TrainingHubApp {
  private trainingHub: TrainingHub;

  constructor() {
    this.trainingHub = new TrainingHub();
    this.setupLegacySupport();
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