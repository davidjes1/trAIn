import { ParsedFitData, ExportData } from '../types/fit-parser.types';
import { UIHelpers } from '../utils/ui-helpers';

export class ExportService {
  public static exportToJSON(parsedData: ParsedFitData): void {
    console.log('Export button clicked');
    
    try {
      const selectedFields = UIHelpers.getSelectedFields();
      
      console.log('Found checkboxes:', selectedFields.length);
      
      if (selectedFields.length === 0) {
        UIHelpers.showStatus('⚠️ Please select at least one field to export', 'error');
        return;
      }
      
      if (!parsedData) {
        UIHelpers.showStatus('❌ No data to export. Please upload and parse a FIT file first.', 'error');
        return;
      }
      
      UIHelpers.showLoading('🔄 Generating JSON...');
      console.log('Starting export with fields:', selectedFields);
      
      const exportData = this.buildExportData(parsedData, selectedFields);
      
      console.log('Export data prepared:', exportData);
      
      const jsonString = JSON.stringify(exportData, null, 2);
      console.log('JSON string length:', jsonString.length);
      
      this.downloadJSON(jsonString, selectedFields.length);
      
    } catch (error) {
      console.error('Export error:', error);
      UIHelpers.showStatus(`❌ Export failed: ${(error as Error).message}`, 'error');
    }
  }

  public static testExport(): void {
    console.log('Testing export functionality...');
    
    const testData = {
      metadata: {
        exportDate: new Date().toISOString(),
        testMode: true
      },
      data: {
        sample: [
          { field1: 'value1', field2: 123 },
          { field1: 'value2', field2: 456 }
        ]
      }
    };
    
    try {
      const jsonString = JSON.stringify(testData, null, 2);
      this.downloadFile(jsonString, 'test_export.json', 'application/json');
      
      UIHelpers.showStatus('✅ Test export successful! Check your downloads.', 'success');
      
    } catch (error) {
      console.error('Test export failed:', error);
      UIHelpers.showStatus(`❌ Test export failed: ${(error as Error).message}`, 'error');
    }
  }

  private static buildExportData(parsedData: ParsedFitData, selectedFields: string[]): ExportData {
    const exportData: ExportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        selectedFields: selectedFields,
        totalRecords: {},
        fileHeader: parsedData.header || {}
      },
      data: {}
    };
    
    selectedFields.forEach(fieldPath => {
      const [section, field] = fieldPath.split('.');
      console.log(`Processing ${section}.${field}`);
      
      const sectionData = (parsedData as any)[section];
      if (sectionData && Array.isArray(sectionData)) {
        if (!exportData.data[section]) {
          exportData.data[section] = [];
          exportData.metadata.totalRecords[section] = sectionData.length;
        }
        
        sectionData.forEach((record: any, index: number) => {
          if (!exportData.data[section][index]) {
            exportData.data[section][index] = {};
          }
          exportData.data[section][index][field] = record[field];
        });
      }
    });
    
    return exportData;
  }

  private static downloadJSON(jsonString: string, fieldCount: number): void {
    try {
      this.downloadFile(jsonString, 'garmin_data_export.json', 'application/json');
      UIHelpers.showStatus(`✅ JSON exported successfully! (${fieldCount} fields)`, 'success');
      
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      
      // Fallback: show JSON in a new window
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write('<pre>' + jsonString + '</pre>');
        newWindow.document.title = 'Garmin Data Export';
      }
      
      UIHelpers.showStatus('✅ JSON opened in new window (download failed)', 'success');
    }
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    
    console.log('Triggering download...');
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}