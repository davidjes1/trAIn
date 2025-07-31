# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains a comprehensive web application for parsing, analyzing, and managing Garmin FIT files. It includes both a web interface for individual file processing and a complete training analysis system with Google Sheets integration for batch processing multiple activities.

## Project Structure

The repository contains:
- **index.html**: Main HTML template with FIT parsing and training analysis UI
- **src/**: TypeScript source code organized by feature
  - **main.ts**: Application entry point with bulk import functionality
  - **parser/**: FIT file parsing logic using fit-file-parser library
  - **services/**: Business logic services
    - **FileService.ts**: Individual FIT file processing
    - **AnalysisService.ts**: Batch activity analysis and metrics computation
    - **SheetsService.ts**: Google Sheets API integration
    - **ExportService.ts**: JSON export functionality
    - **FieldAnalyzer.ts**: Dynamic field discovery
  - **types/**: TypeScript type definitions
    - **fit-parser.types.ts**: FIT file parsing types
    - **training-metrics.types.ts**: Training analysis and Google Sheets types
  - **config/**: Configuration files
    - **training.ts**: HR zones and training parameters
  - **cli/**: Command-line interface
    - **import-activities.ts**: Batch processing CLI tool
  - **utils/**: Utility functions
  - **styles/**: SCSS stylesheets with variables and responsive design
- **dist/**: Production build output (generated)
- **service-account.example.json**: Google Service Account template
- **google-sheets-config.example.json**: Google Sheets configuration template

## Development Commands

The application uses TypeScript, SCSS with Vite build system, and a Node.js server for Google Sheets integration:

```bash
# Install dependencies
npm install

# Start both frontend and Google Sheets server
npm start

# Or start individually:
npm run dev     # Frontend only (localhost:3000)  
npm run server  # Google Sheets server only (localhost:3004)

# Build for production
npm run build

# Type checking and linting
npm run type-check
npm run lint
npm run lint:fix

# Training Analysis CLI (requires server running)
npm run import-activities -- --help
npm run import-activities -- --input-dir ./exported --sheets-id YOUR_SHEET_ID
```

## Architecture Overview

### Application Structure
- **Modular TypeScript architecture**: Organized into services, utilities, and types
- **SCSS with variables**: Modular styling with shared variables and responsive design
- **Vite build system**: Modern development experience with hot reload and optimized builds
- **Client-side parsing**: File parsing and data extraction performed entirely in the browser
- **Server-side Google Sheets integration**: Node.js/Express server handles Google Sheets API calls
- **Type safety**: Full TypeScript coverage with strict type checking

### Core Components

#### Core Services
- **FitParser**: `src/parser/FitParser.ts` - Wrapper around fit-file-parser npm package with legacy compatibility
- **FileService**: `src/services/FileService.ts` - File upload handling and validation
- **AnalysisService**: `src/services/AnalysisService.ts` - Comprehensive training analysis and metrics computation
- **SheetsService**: `src/services/SheetsService.ts` - Google Sheets API integration with chart creation
- **ExportService**: `src/services/ExportService.ts` - JSON export functionality with error handling
- **FieldAnalyzer**: `src/services/FieldAnalyzer.ts` - Dynamic field discovery and UI generation
- **UIHelpers**: `src/utils/ui-helpers.ts` - DOM manipulation utilities

#### Type System
- **FitHeader**: File header structure with metadata
- **MessageData**: Individual FIT message record structure  
- **ParsedFitData**: Complete parsed file structure
- **ActivityMetrics**: Comprehensive activity analysis with HR zones and training load
- **LapMetrics**: Detailed lap-by-lap performance metrics
- **TrainingConfig**: Configurable HR zones and sport classifications
- **GoogleSheetsConfig**: Google Sheets API integration configuration
- **ProcessingResult**: Batch processing results and error handling

#### Data Processing Pipeline
1. **File Upload**: Drag-and-drop or file picker interface
2. **Binary Parsing**: SimpleFitParser processes ArrayBuffer data
3. **Data Categorization**: Records sorted into types (records, sessions, laps, events, etc.)
4. **Field Analysis**: Dynamic discovery of available data fields
5. **Export Generation**: JSON export with user-selected fields

### Data Structure

#### Parsed Data Object
```javascript
{
  header: {
    headerSize, protocolVersion, profileVersion, dataSize, dataType
  },
  records: [],      // GPS/sensor data points
  sessions: [],     // Workout sessions
  laps: [],         // Lap markers
  events: [],       // Workout events
  deviceInfos: [],  // Device information
  activity: [],     // Activity summaries
  rawMessages: []   // All parsed messages
}
```

#### Export Data Format
- **Metadata**: Export timestamp, selected fields, record counts
- **Data**: Organized by section with only selected fields included
- **Format**: Pretty-printed JSON for readability

### Key Features

#### FIT File Parsing
- **Binary Format Support**: Handles FIT file binary structure
- **Message Type Recognition**: Identifies different FIT message types
- **Header Validation**: Verifies FIT file format signature
- **Error Handling**: Robust parsing with corruption recovery

#### User Interface
- **Modern Design**: Glass-morphism styling with gradient backgrounds
- **Responsive Layout**: Grid-based field selection interface
- **Interactive Elements**: Hover effects, loading states, status messages
- **Accessibility**: Proper labels and keyboard navigation

#### Data Export
- **Field Selection**: Checkbox interface for choosing specific data fields
- **Bulk Operations**: Select/deselect all functionality
- **JSON Export**: Structured data export with metadata
- **Test Mode**: Sample data export for testing functionality

### Browser Compatibility
- **Modern Browsers**: Requires ES6+ support for classes and arrow functions
- **File API**: Uses FileReader for binary file processing
- **Blob API**: For generating downloadable JSON files
- **Drag & Drop API**: For file upload interface

## Development Patterns

### Error Handling
- Try-catch blocks around file parsing operations
- Graceful degradation for corrupted FIT files
- User-friendly error messages with specific failure reasons

### Data Processing
- **ArrayBuffer Processing**: Binary data handling for FIT format
- **Dynamic Field Discovery**: Runtime analysis of available data fields
- **Memory Efficient**: Processes data in chunks to handle large files

### UI State Management
- **Status Display**: Real-time feedback during file processing
- **Loading States**: Visual indicators for long-running operations
- **Form State**: Dynamic enabling/disabling of export functionality

## File Format Support

### FIT File Structure
- **Header**: 12-14 bytes containing metadata
- **Data Records**: Variable-length messages with different types
- **CRC**: Checksum validation (basic implementation)

### Supported Message Types
- Records (GPS/sensor data)
- Sessions (workout summaries)
- Laps (segment markers)
- Events (workout milestones)
- Device Info (hardware details)
- Activity (overall workout data)

## Testing

Since this is a client-side application:
- **Manual Testing**: Load different FIT files and verify parsing
- **Browser Testing**: Test across different browsers
- **File Validation**: Ensure proper handling of corrupted/invalid files
- **Export Verification**: Confirm JSON output structure and content

## Deployment

### Static Hosting
The application can be deployed to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- Simple HTTP server

### Local Development
#### Development
```bash
npm run dev    # Start development server at http://localhost:3000
```

#### Production Build
```bash
npm run build  # Creates optimized build in dist/ directory
```

#### Static Hosting
Deploy the `dist/` folder to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront

#### Build Output
- Optimized JavaScript bundles with code splitting
- Compiled and minified CSS from SCSS
- Type-checked TypeScript compilation
- Static assets optimization

## Security Considerations
- **Client-side Processing**: All file processing happens in browser - no server upload
- **File Type Validation**: Only accepts .fit files
- **Memory Management**: Handles large files without server storage
- **TypeScript Safety**: Compile-time type checking prevents runtime errors
- **Modern Build Tools**: Vite provides secure development environment with built-in protections
- **Trusted Library**: Uses well-maintained fit-file-parser npm package (~2,050 weekly downloads)

## Training Analysis Features

### Comprehensive Activity Metrics
- **Duration and Distance**: Automatically extracted from session data
- **Heart Rate Analysis**: Average, maximum, and HR drift calculation
- **HR Zone Distribution**: Time spent in 5 configurable heart rate zones (Z1-Z5)
- **Training Load**: TRIMP-style calculation using configurable resting HR
- **Sport Classification**: Automatic sport detection with pace vs speed handling
- **Elevation Data**: Total ascent/descent when available

### Advanced Metrics Computation
- **HR Drift Analysis**: Compares first vs last third of workout to detect fatigue
- **Zone Distribution**: Calculates time in each HR zone based on configurable thresholds
- **Training Load (TRIMP)**: `Duration × HR Ratio × e^(1.92 × HR Ratio)` formula
- **Pace vs Speed**: Automatic handling based on sport type (running = pace, cycling = speed)

### Lap-by-Lap Analysis
- **Lap Splits**: Duration, distance, and performance metrics per lap
- **HR Analysis**: Average and maximum heart rate per lap
- **Elevation Changes**: Gain/loss per lap when available
- **Power Data**: Average, max, and normalized power for cycling activities

### Google Sheets Integration
- **Automated Upload**: Batch upload activities and laps to designated sheets
- **Chart Generation**: Automatic creation of training load and HR zone charts
- **Data Organization**: Separate sheets for activities (Training Log) and laps (Lap Splits)
- **Service Account Auth**: Secure authentication using Google Service Account

### Batch Processing
- **CLI Tool**: Command-line interface for processing multiple files
- **Web Interface**: Drag-and-drop bulk import with real-time analysis
- **Error Handling**: Comprehensive error reporting and validation
- **Progress Tracking**: Real-time progress updates during processing

## Usage Workflows

### Individual FIT File Processing
1. Upload .fit file via drag-and-drop or file picker
2. View parsed data structure and available fields
3. Select desired fields for export
4. Export to JSON format

### Batch Training Analysis
1. Export multiple .fit files to JSON using individual processing
2. Use bulk import interface or CLI tool to analyze activities
3. Configure Google Sheets integration (optional)
4. Upload results to Google Sheets with automatic chart creation

### CLI Batch Processing
```bash
# Basic analysis (no upload)
npm run import-activities -- --dry-run --input-dir ./exported

# Upload to Google Sheets
npm run import-activities -- \
  --input-dir ./exported \
  --sheets-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --service-account ./service-account.json

# Verbose output
npm run import-activities -- --verbose --help
```

## Configuration

### HR Zone Setup
Edit `src/config/training.ts` to customize:
- Resting heart rate (default: 59 bpm)
- Maximum heart rate (default: 190 bpm)  
- HR zone thresholds (default: 50-60%, 60-70%, 70-80%, 80-90%, 90-100%)
- Sport classifications for pace vs speed

### Google Sheets Setup
1. Create Google Cloud Project with Sheets API enabled
2. Create Service Account and download JSON credentials
3. Share target spreadsheet with service account email
4. Configure spreadsheet ID and credentials path

Example `google-sheets-config.json`:
```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "serviceAccountPath": "./service-account.json",
  "trainingLogSheet": "Training Log", 
  "lapSplitsSheet": "Lap Splits",
  "createCharts": true
}
```