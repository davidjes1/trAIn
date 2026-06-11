import { ParsedFitData } from '../types/fit-parser.types';
import { ActivityMetrics, LapMetrics } from '../types/training-metrics.types';
import { FitParser } from '../parser/FitParser';
import { AnalysisService } from './AnalysisService';
import { DashboardService } from './DashboardService';
import { AuthService } from '../firebase/auth';
import { UIHelpers } from '../utils/ui-helpers';

export interface FileProcessingResult {
  parsedData: ParsedFitData;
  activityMetrics: ActivityMetrics;
  lapMetrics: LapMetrics[];
}

export interface FileUploadResult {
  success: boolean;
  activityId?: string;
  error?: string;
}

export interface FileProcessingOptions {
  saveToFirebase?: boolean;
  showProgress?: boolean;
}

export class FileService {
  private static parser = new FitParser({
    speedUnit: 'km/h',
    lengthUnit: 'km',
    temperatureUnit: 'celsius',
    mode: 'both' // Get both hierarchical and flat data
  });
  
  private static analysisService = new AnalysisService();
  private static dashboardService = new DashboardService();

  public static handleFile(file: File): Promise<ParsedFitData> {
    return this.handleFileBasic(file);
  }

  public static handleFileWithAnalysis(file: File): Promise<FileProcessingResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const parsedData = await this.handleFileBasic(file);
        
        // Perform training analysis
        const activityMetrics = this.analysisService.extractActivityMetrics(parsedData, file.name);
        const lapMetrics = this.analysisService.extractLapMetrics(parsedData, activityMetrics.date, activityMetrics.activityId);
        
        resolve({
          parsedData,
          activityMetrics,
          lapMetrics
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Process FIT file and save analyzed data to Firebase
   */
  public static async processAndSaveToFirebase(
    file: File, 
    options: FileProcessingOptions = {}
  ): Promise<FileUploadResult> {
    const { saveToFirebase = true, showProgress = true } = options;

    try {
      if (showProgress) {
        UIHelpers.showLoading('📖 Processing FIT file...');
      }

      // Check if user is authenticated for Firebase save
      if (saveToFirebase && !AuthService.isAuthenticated()) {
        throw new Error('User not authenticated. Please sign in to save data.');
      }

      // Parse and analyze the FIT file
      const result = await this.handleFileWithAnalysis(file);
      
      if (showProgress) {
        UIHelpers.showLoading('💾 Saving to Firebase...');
      }

      let activityId: string | undefined;

      if (saveToFirebase) {
        // Save activity data to Firebase
        activityId = await this.dashboardService.addActivity(result.activityMetrics);
        
        // Save lap data to Firebase if available
        if (result.lapMetrics.length > 0) {
          // Update lap metrics with the saved activity ID
          const lapsWithActivityId = result.lapMetrics.map(lap => ({
            ...lap,
            activityId: activityId
          }));
          
          await this.dashboardService.addLapData(lapsWithActivityId);
        }
      }

      if (showProgress) {
        const message = saveToFirebase 
          ? `✅ Activity saved successfully! (${result.lapMetrics.length} laps processed)`
          : '✅ FIT file processed successfully!';
        UIHelpers.showStatus(message, 'success');
      }

      return {
        success: true,
        activityId
      };

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      if (showProgress) {
        UIHelpers.showStatus(`❌ Error: ${errorMessage}`, 'error');
      }
      
      console.error('File processing error:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Process multiple FIT files and save to Firebase
   */
  public static async processBatchFiles(
    files: File[],
    options: FileProcessingOptions = {}
  ): Promise<{
    successful: number;
    failed: number;
    results: FileUploadResult[];
  }> {
    const results: FileUploadResult[] = [];
    let successful = 0;
    let failed = 0;

    UIHelpers.showLoading(`Processing ${files.length} files...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        UIHelpers.showLoading(`Processing file ${i + 1}/${files.length}: ${file.name}`);
        
        const result = await this.processAndSaveToFirebase(file, {
          ...options,
          showProgress: false // Don't show individual progress for batch
        });

        results.push(result);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        results.push({
          success: false,
          error: `Failed to process ${file.name}: ${(error as Error).message}`
        });
      }
    }

    const message = `Batch complete: ${successful} successful, ${failed} failed`;
    UIHelpers.showStatus(message, failed > 0 ? 'error' : 'success');

    return { successful, failed, results };
  }

  private static handleFileBasic(file: File): Promise<ParsedFitData> {
    return new Promise((resolve, reject) => {
      if (!file.name.toLowerCase().endsWith('.fit')) {
        UIHelpers.showStatus('❌ Please select a .fit file', 'error');
        reject(new Error('Invalid file type'));
        return;
      }

      UIHelpers.showLoading('📖 Parsing FIT file...');
      
      const reader = new FileReader();
      
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          if (!e.target?.result) {
            throw new Error('Failed to read file');
          }

          const arrayBuffer = e.target.result as ArrayBuffer;
          const parsedData = await this.parser.parse(arrayBuffer);
          
          console.log('Parsed data:', parsedData);
          
          this.displayFileInfo(file, parsedData);
          UIHelpers.showStatus('✅ File parsed successfully!', 'success');
          
          resolve(parsedData);
        } catch (error) {
          const errorMessage = (error as Error).message;
          UIHelpers.showStatus(`❌ Error parsing file: ${errorMessage}`, 'error');
          console.error('Parse error:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        UIHelpers.showStatus('❌ Error reading file', 'error');
        reject(new Error('File read error'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  private static displayFileInfo(file: File, data: ParsedFitData): void {
    const fileInfoDiv = document.getElementById('fileInfo');
    if (!fileInfoDiv) return;

    const recordCount = data.records ? data.records.length : 0;
    const sessionCount = data.sessions ? data.sessions.length : 0;
    const activityCount = data.activity ? (Array.isArray(data.activity) ? data.activity.length : 1) : 0;
    
    fileInfoDiv.innerHTML = `
      <div class="file-info">
        <h3>📊 File Information</h3>
        <p><strong>Filename:</strong> ${file.name}</p>
        <p><strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
        <p><strong>Protocol Version:</strong> ${data.header?.protocolVersion || 'N/A'}</p>
        <p><strong>Profile Version:</strong> ${data.header?.profileVersion || 'N/A'}</p>
        <p><strong>Records:</strong> ${recordCount}</p>
        <p><strong>Sessions:</strong> ${sessionCount}</p>
        <p><strong>Activities:</strong> ${activityCount}</p>
        <p><strong>Raw Messages:</strong> ${data.rawMessages?.length || 0}</p>
      </div>
    `;
  }
}