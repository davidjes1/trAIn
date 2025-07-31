import FitFileParser from 'fit-file-parser';
import { Buffer } from 'buffer';
import { 
  FitParserOptions, 
  FitFileData, 
  ParsedFitData
} from '../types/fit-parser.types';

export class FitParser {
  private parser: any;
  private options: FitParserOptions;

  constructor(options: FitParserOptions = {}) {
    this.options = {
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
      mode: 'both', // Use 'both' to get hierarchical and flat data
      elapsedRecordField: true,
      force: true,
      ...options
    };

    this.parser = new FitFileParser(this.options);
  }

  public parse(arrayBuffer: ArrayBuffer): Promise<ParsedFitData> {
    return new Promise((resolve, reject) => {
      try {
        // Convert ArrayBuffer to Buffer for fit-file-parser
        const buffer = Buffer.from(arrayBuffer);
        
        this.parser.parse(buffer, (error: Error | null, data?: FitFileData) => {
          if (error) {
            reject(new Error(`FIT parsing failed: ${error.message}`));
            return;
          }

          if (!data) {
            reject(new Error('No data returned from FIT parser'));
            return;
          }

          // Transform the data to match our legacy interface
          const parsedData = this.transformToLegacyFormat(data);
          resolve(parsedData);
        });
      } catch (error) {
        reject(new Error(`FIT parsing error: ${(error as Error).message}`));
      }
    });
  }

  private transformToLegacyFormat(data: FitFileData): ParsedFitData {
    // Create a legacy-compatible structure
    const parsedData: ParsedFitData = {
      ...data,
      // Legacy compatibility fields
      deviceInfos: data.device_infos || [],
      rawMessages: this.extractRawMessages(data),
      header: this.createLegacyHeader(data)
    };

    // Ensure we have flat arrays for backward compatibility
    parsedData.records = this.extractRecords(data);
    parsedData.sessions = this.extractSessions(data);
    parsedData.laps = this.extractLaps(data);
    parsedData.events = data.events || [];

    return parsedData;
  }

  private extractRecords(data: FitFileData): any[] {
    const records: any[] = [];

    // If we have flat records array, use it
    if (data.records && Array.isArray(data.records)) {
      records.push(...data.records);
    }

    // Also extract from hierarchical structure if in cascade/both mode
    if (data.activity?.sessions) {
      data.activity.sessions.forEach(session => {
        if (session.laps) {
          session.laps.forEach(lap => {
            if (lap.records) {
              records.push(...lap.records);
            }
          });
        }
      });
    }

    return records;
  }

  private extractSessions(data: FitFileData): any[] {
    // Return flat sessions array or extract from activity
    return data.sessions || data.activity?.sessions || [];
  }

  private extractLaps(data: FitFileData): any[] {
    const laps: any[] = [];

    // If we have flat laps array, use it
    if (data.laps && Array.isArray(data.laps)) {
      laps.push(...data.laps);
    }

    // Also extract from hierarchical structure
    if (data.activity?.sessions) {
      data.activity.sessions.forEach(session => {
        if (session.laps) {
          laps.push(...session.laps);
        }
      });
    }

    return laps;
  }

  private extractRawMessages(data: FitFileData): any[] {
    // fit-file-parser doesn't provide raw messages in the same way
    // Return processed data as "raw messages" for compatibility
    const messages: any[] = [];

    if (data.records) messages.push(...data.records.map((r, i) => ({ ...r, messageIndex: i, messageType: 'record' })));
    if (data.sessions) messages.push(...data.sessions.map((s, i) => ({ ...s, messageIndex: i, messageType: 'session' })));
    if (data.laps) messages.push(...data.laps.map((l, i) => ({ ...l, messageIndex: i, messageType: 'lap' })));
    if (data.events) messages.push(...data.events.map((e, i) => ({ ...e, messageIndex: i, messageType: 'event' })));

    return messages;
  }

  private createLegacyHeader(_data: FitFileData): any {
    // fit-file-parser doesn't provide header info, create a basic one
    return {
      headerSize: 14,
      protocolVersion: 2.0,
      profileVersion: 21.0,
      dataSize: 0, // Unknown without raw access
      dataType: '.FIT'
    };
  }

  public getParserOptions(): FitParserOptions {
    return { ...this.options };
  }
}