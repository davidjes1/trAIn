// Workout Upload Manager for FIT File Processing
import WorkoutService from '../../services/WorkoutService';
import GarminParser from '../../utils/garmin-parser';
import { ParsedFitData, WorkoutBatchResult, Workout } from '../../types/workout.types';
import { UIHelpers } from '../../utils/ui-helpers';

export interface FitFileUpload {
  file: File;
  name: string;
  size: number;
  lastModified: Date;
}

export interface UploadProgress {
  current: number;
  total: number;
  currentFile: string;
  status: 'parsing' | 'processing' | 'complete' | 'error';
}

export class WorkoutUploadManager {
  private userId: string;
  private onProgress?: (progress: UploadProgress) => void;
  private onComplete?: (results: WorkoutBatchResult) => void;
  private onError?: (error: string) => void;

  constructor(
    userId: string,
    callbacks: {
      onProgress?: (progress: UploadProgress) => void;
      onComplete?: (results: WorkoutBatchResult) => void;
      onError?: (error: string) => void;
    } = {}
  ) {
    this.userId = userId;
    this.onProgress = callbacks.onProgress;
    this.onComplete = callbacks.onComplete;
    this.onError = callbacks.onError;
  }

  /**
   * Process a single FIT file
   */
  async processSingleFile(file: File): Promise<{ workout: Workout; wasMatched: boolean }> {
    try {
      console.log(`🔄 Processing single FIT file: ${file.name}`);

      // Parse the FIT file
      const parsedData = await this.parseFile(file);

      // Validate the parsed data
      const validation = GarminParser.validateParsedData(parsedData);
      if (!validation.isValid) {
        throw new Error(`Invalid FIT data: ${validation.errors.join(', ')}`);
      }

      // Process with WorkoutService (match or create unplanned)
      const result = await WorkoutService.processParsedFitData(this.userId, parsedData);

      console.log(`✅ Successfully processed ${file.name} - ${result.wasMatched ? 'matched' : 'unplanned'}`);
      return result;

    } catch (error) {
      console.error(`❌ Error processing ${file.name}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple FIT files in batch
   */
  async processBatchFiles(files: FileList | File[]): Promise<WorkoutBatchResult> {
    const fileArray = Array.from(files);
    console.log(`⚡ Starting batch processing of ${fileArray.length} FIT files`);

    const parsedDataArray: ParsedFitData[] = [];
    let processed = 0;

    try {
      // Step 1: Parse all files
      for (const file of fileArray) {
        this.updateProgress({
          current: processed + 1,
          total: fileArray.length,
          currentFile: file.name,
          status: 'parsing'
        });

        try {
          const parsedData = await this.parseFile(file);
          const validation = GarminParser.validateParsedData(parsedData);
          
          if (validation.isValid) {
            parsedDataArray.push(parsedData);
          } else {
            console.warn(`⚠️ Skipping invalid file ${file.name}: ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          console.error(`❌ Failed to parse ${file.name}:`, error);
          // Continue with other files
        }

        processed++;
      }

      // Step 2: Process parsed data
      this.updateProgress({
        current: 0,
        total: parsedDataArray.length,
        currentFile: 'Processing activities...',
        status: 'processing'
      });

      const batchResult = await WorkoutService.processBatchFitData(this.userId, parsedDataArray);

      // Step 3: Complete
      this.updateProgress({
        current: batchResult.successful.length,
        total: parsedDataArray.length,
        currentFile: 'Complete',
        status: 'complete'
      });

      console.log(`✅ Batch processing complete: ${batchResult.successful.length} successful, ${batchResult.failed.length} failed`);

      if (this.onComplete) {
        this.onComplete(batchResult);
      }

      return batchResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Batch processing failed:', errorMessage);
      
      this.updateProgress({
        current: processed,
        total: fileArray.length,
        currentFile: 'Error occurred',
        status: 'error'
      });

      if (this.onError) {
        this.onError(errorMessage);
      }

      throw error;
    }
  }

  /**
   * Parse a single FIT file to JSON
   */
  private async parseFile(file: File): Promise<ParsedFitData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            throw new Error('Failed to read file data');
          }

          // Here you would integrate with your existing FIT parser
          // For this example, we'll simulate parsing with actual fit-file-parser
          const rawFitData = await this.parseFitBuffer(arrayBuffer);
          
          // Convert to our standardized format
          const parsedData = GarminParser.parseFitFile(rawFitData);
          
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse FIT file: ${error}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parse FIT file buffer (integrate with your existing FIT parser)
   */
  private async parseFitBuffer(buffer: ArrayBuffer): Promise<any> {
    // This would integrate with your existing fit-file-parser
    // For now, return sample data structure that matches what GarminParser expects
    
    // In a real implementation, you'd do something like:
    // const FitParser = require('fit-file-parser').default;
    // const fitParser = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'km' });
    // return fitParser.parse(buffer);

    // For demo purposes, return sample structure
    return {
      activity: [{
        timestamp: new Date().toISOString(),
        sport: 'running',
        total_timer_time: 2700, // 45 minutes
        total_distance: 7500 // 7.5km
      }],
      sessions: [{
        sport: 'running',
        start_time: new Date().toISOString(),
        total_timer_time: 2700,
        total_distance: 7500,
        avg_heart_rate: 155,
        max_heart_rate: 172,
        total_calories: 485,
        avg_cadence: 165,
        total_ascent: 125,
        total_descent: 118
      }],
      records: [
        // Sample records for HR zone calculation
        { heart_rate: 145, timestamp: new Date() },
        { heart_rate: 155, timestamp: new Date() },
        { heart_rate: 165, timestamp: new Date() }
      ]
    };
  }

  /**
   * Update progress callback
   */
  private updateProgress(progress: UploadProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * Setup drag and drop functionality
   */
  static setupDragAndDrop(
    dropZone: HTMLElement,
    uploadManager: WorkoutUploadManager,
    options: {
      allowMultiple?: boolean;
      showProgress?: boolean;
    } = {}
  ): void {
    const { allowMultiple = true, showProgress = true } = options;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Highlight drop zone when file is dragged over
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      });
    });

    // Handle dropped files
    dropZone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Filter for .fit files only
      const fitFiles = Array.from(files).filter(file => 
        file.name.toLowerCase().endsWith('.fit')
      );

      if (fitFiles.length === 0) {
        UIHelpers.showStatus('Please upload .fit files only', 'warning');
        return;
      }

      try {
        if (allowMultiple && fitFiles.length > 1) {
          // Process multiple files
          const results = await uploadManager.processBatchFiles(fitFiles);
          UIHelpers.showStatus(
            `Processed ${results.successful.length} workouts (${results.matched} matched, ${results.unplanned} unplanned)`, 
            'success'
          );
        } else {
          // Process single file
          const result = await uploadManager.processSingleFile(fitFiles[0]);
          UIHelpers.showStatus(
            `Workout ${result.wasMatched ? 'matched and updated' : 'created as unplanned'}`, 
            'success'
          );
        }
      } catch (error) {
        UIHelpers.showStatus('Failed to process FIT files', 'error');
        console.error('Upload error:', error);
      }
    });

    // Setup file input if present
    const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) return;

        try {
          if (allowMultiple && files.length > 1) {
            await uploadManager.processBatchFiles(files);
          } else {
            await uploadManager.processSingleFile(files[0]);
          }
        } catch (error) {
          UIHelpers.showStatus('Failed to process FIT files', 'error');
          console.error('Upload error:', error);
        }
      });
    }
  }

  /**
   * Create progress display element
   */
  static createProgressDisplay(): HTMLElement {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress';
    progressContainer.innerHTML = `
      <div class="progress-header">
        <h4>Processing FIT Files</h4>
        <span class="progress-count">0 / 0</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <div class="progress-status">Initializing...</div>
    `;

    progressContainer.style.display = 'none';
    return progressContainer;
  }

  /**
   * Update progress display
   */
  static updateProgressDisplay(element: HTMLElement, progress: UploadProgress): void {
    const countElement = element.querySelector('.progress-count');
    const fillElement = element.querySelector('.progress-fill') as HTMLElement;
    const statusElement = element.querySelector('.progress-status');

    if (countElement) {
      countElement.textContent = `${progress.current} / ${progress.total}`;
    }

    if (fillElement) {
      const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
      fillElement.style.width = `${percentage}%`;
    }

    if (statusElement) {
      const statusMap = {
        'parsing': '📁 Parsing',
        'processing': '⚙️ Processing',
        'complete': '✅ Complete',
        'error': '❌ Error'
      };
      
      statusElement.textContent = `${statusMap[progress.status]} ${progress.currentFile}`;
    }

    // Show/hide progress
    element.style.display = progress.status === 'complete' || progress.status === 'error' ? 'none' : 'block';
  }

  /**
   * Integration with existing TrainingHub import functionality
   */
  static integrateWithTrainingHub(trainingHub: any): WorkoutUploadManager {
    // Get user ID from training hub
    const userId = trainingHub.getUserId(); // Assuming this method exists

    // Create upload manager with callbacks
    const uploadManager = new WorkoutUploadManager(userId, {
      onProgress: (progress) => {
        // Update any existing progress displays
        const progressElement = document.getElementById('fit-upload-progress');
        if (progressElement) {
          this.updateProgressDisplay(progressElement, progress);
        }
      },
      
      onComplete: (results) => {
        // Refresh the training hub data
        trainingHub.refreshWorkoutData();
        
        // Show completion message
        UIHelpers.showStatus(
          `Successfully processed ${results.successful.length} workouts`, 
          'success'
        );
      },
      
      onError: (error) => {
        UIHelpers.showStatus(`Upload failed: ${error}`, 'error');
      }
    });

    // Setup drag and drop on existing import drawer
    const importDrawer = document.getElementById('data-import-drawer');
    const bulkDropZone = document.getElementById('bulkDropZone');
    
    if (bulkDropZone) {
      this.setupDragAndDrop(bulkDropZone, uploadManager, {
        allowMultiple: true,
        showProgress: true
      });
    }

    return uploadManager;
  }
}

export default WorkoutUploadManager;