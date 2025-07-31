// Types for fit-file-parser library integration

export interface FitParserOptions {
  speedUnit?: 'km/h' | 'm/s' | 'mph';
  lengthUnit?: 'km' | 'mi' | 'm';
  temperatureUnit?: 'celsius' | 'kelvin' | 'fahrenheit';
  mode?: 'cascade' | 'list' | 'both';
  elapsedRecordField?: boolean;
  force?: boolean;
}

// Base record structure from fit-file-parser
export interface FitRecord {
  timestamp?: Date;
  position_lat?: number;
  position_long?: number;
  distance?: number;
  enhanced_altitude?: number;
  altitude?: number;
  enhanced_speed?: number;
  speed?: number;
  heart_rate?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
  calories?: number;
  fractional_cadence?: number;
  [key: string]: any; // Allow additional dynamic fields
}

export interface FitLap {
  timestamp?: Date;
  start_time?: Date;
  start_position_lat?: number;
  start_position_long?: number;
  end_position_lat?: number;
  end_position_long?: number;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_calories?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  max_cadence?: number;
  avg_power?: number;
  max_power?: number;
  total_ascent?: number;
  total_descent?: number;
  records?: FitRecord[]; // Available in cascade mode
  [key: string]: any;
}

export interface FitSession {
  timestamp?: Date;
  start_time?: Date;
  start_position_lat?: number;
  start_position_long?: number;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_calories?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  sport?: string;
  sub_sport?: string;
  laps?: FitLap[]; // Available in cascade mode
  [key: string]: any;
}

export interface FitActivity {
  timestamp?: Date;
  total_timer_time?: number;
  num_sessions?: number;
  type?: number;
  event?: string;
  event_type?: string;
  local_timestamp?: Date;
  sessions?: FitSession[]; // Available in cascade mode
  [key: string]: any;
}

// Main parsed data structure from fit-file-parser
export interface FitFileData {
  // Cascade mode - hierarchical structure
  activity?: FitActivity;
  
  // List mode - flat arrays
  sessions?: FitSession[];
  laps?: FitLap[];
  records?: FitRecord[];
  
  // Additional data types
  events?: any[];
  device_infos?: any[];
  developer_data_ids?: any[];
  field_descriptions?: any[];
  
  // Raw message access
  [key: string]: any;
}

// Legacy types for backward compatibility
export interface ParsedFitData extends FitFileData {
  header?: any; // Not directly provided by fit-file-parser
  rawMessages?: any[]; // For backward compatibility
  deviceInfos?: any[]; // Alias for device_infos
}

export interface AvailableFields {
  [section: string]: string[];
}

export interface ExportMetadata {
  exportDate: string;
  selectedFields: string[];
  totalRecords: Record<string, number>;
  fileHeader?: any;
  testMode?: boolean;
  parsingMode?: string;
}

export interface ExportData {
  metadata: ExportMetadata;
  data: Record<string, Record<string, unknown>[]>;
}

export type StatusType = 'info' | 'success' | 'error' | 'warning';

// Callback type for fit-file-parser
export type FitParserCallback = (error: Error | null, data?: FitFileData) => void;