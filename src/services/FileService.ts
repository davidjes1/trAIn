import { ParsedFitData } from '../types/fit-parser.types';
import { ActivityMetrics, LapMetrics } from '../types/training-metrics.types';
import { FitParser } from '../parser/FitParser';
import { AnalysisService } from './AnalysisService';
import { UIHelpers } from '../utils/ui-helpers';

export interface FileProcessingResult {
  parsedData: ParsedFitData;
  activityMetrics: ActivityMetrics;
  lapMetrics: LapMetrics[];
}

export class FileService {
  private static parser = new FitParser({
    speedUnit: 'km/h',
    lengthUnit: 'km',
    temperatureUnit: 'celsius',
    mode: 'both' // Get both hierarchical and flat data
  });
  
  private static analysisService = new AnalysisService();

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