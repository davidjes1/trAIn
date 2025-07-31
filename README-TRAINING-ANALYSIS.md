# 🏃‍♂️ Garmin FIT Training Analysis Setup Guide

This guide explains how to set up and use the comprehensive training analysis features of the Garmin FIT Parser application.

## 🎯 Overview

The application now includes advanced training analysis capabilities:

- **Comprehensive Activity Metrics**: Duration, distance, HR zones, training load (TRIMP)
- **Lap-by-Lap Analysis**: Detailed performance metrics for each lap
- **HR Zone Distribution**: Time spent in configurable heart rate zones (Z1-Z5)
- **Google Sheets Integration**: Automated upload with chart generation
- **Batch Processing**: CLI and web interface for multiple activities
- **Advanced Analytics**: HR drift, pace analysis, elevation data

## 🚀 Quick Start

### 1. Basic Usage (Individual Files)
```bash
npm install
npm run dev
```
- Open http://localhost:3000
- Upload .fit files and export to JSON
- Use the training analysis section for bulk processing

### 2. CLI Batch Processing
```bash
# Analyze files without upload
npm run import-activities -- --dry-run

# Full analysis with Google Sheets upload
npm run import-activities -- \
  --input-dir ./dist/exported \
  --sheets-id "YOUR_SHEET_ID" \
  --service-account ./service-account.json
```

## 📊 Google Sheets Integration Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Sheets API**

### Step 2: Create Service Account
1. Navigate to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Name it (e.g., "garmin-fit-analyzer")
4. Skip role assignment for now
5. Click **Create Key** → **JSON**
6. Download and save as `service-account.json`

### Step 3: Set Up Google Sheet
1. Create a new Google Sheet
2. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```
3. Share the sheet with your service account email:
   - Click **Share**
   - Add the service account email (found in the JSON file)
   - Give **Editor** permissions

### Step 4: Configure Application
Copy `google-sheets-config.example.json` to `google-sheets-config.json`:
```json
{
  "spreadsheetId": "YOUR_SHEET_ID_HERE",
  "serviceAccountPath": "./service-account.json",
  "trainingLogSheet": "Training Log",
  "lapSplitsSheet": "Lap Splits", 
  "createCharts": true
}
```

## 📈 Data Output Format

### Training Log Sheet
| Date | Sport | Duration (min) | Distance (km) | Avg HR | Max HR | Zone1-5 (min) | Training Load | Calories | Ascent (m) |
|------|-------|----------------|---------------|--------|--------|---------------|---------------|----------|------------|

### Lap Splits Sheet  
| Date | Activity ID | Lap # | Duration (min) | Distance (km) | Avg HR | Avg Pace | Elevation Gain |
|------|-------------|-------|----------------|---------------|--------|----------|----------------|

### Generated Charts
- **Weekly Training Load**: Line chart showing training load over time
- **HR Zone Distribution**: Pie chart of time spent in each zone
- **Lap Analysis**: Scatter plot of HR vs pace for lap analysis

## 🔧 Configuration

### HR Zones (src/config/training.ts)
```typescript
export const DEFAULT_TRAINING_CONFIG = {
  restingHR: 59,    // Your resting heart rate
  maxHR: 190,       // Your maximum heart rate
  hrZones: [
    { zone: 1, name: 'Recovery', minPercent: 50, maxPercent: 60 },
    { zone: 2, name: 'Aerobic Base', minPercent: 60, maxPercent: 70 },
    { zone: 3, name: 'Aerobic', minPercent: 70, maxPercent: 80 },
    { zone: 4, name: 'Threshold', minPercent: 80, maxPercent: 90 },
    { zone: 5, name: 'Neuromuscular', minPercent: 90, maxPercent: 100 }
  ]
};
```

### Sport Classifications
- **Pace Sports** (min/km): Running, trail running, track running
- **Speed Sports** (km/h): Cycling, mountain biking, swimming

## 🔄 Workflow Examples

### Individual Activity Analysis
1. Upload .fit file via web interface
2. Export to JSON format
3. View parsed metrics and HR zone distribution

### Batch Training Log
1. Export multiple .fit files to JSON
2. Use CLI: `npm run import-activities -- --input-dir ./exported --dry-run`
3. Review analysis results
4. Upload to Google Sheets: `npm run import-activities -- --sheets-id YOUR_ID`

### Ongoing Training Tracking  
1. Set up automated script to process new .fit files
2. Regular uploads to Google Sheets for trend analysis
3. Use generated charts to track training load and recovery

## 📊 Metrics Explained

### Training Load (TRIMP)
**Formula**: `Duration × HR Ratio × e^(1.92 × HR Ratio)`
- **HR Ratio**: `(Avg HR - Resting HR) / (Max HR - Resting HR)`  
- **Purpose**: Quantifies training stress for workout comparison

### HR Drift
**Calculation**: `((Last Third Avg HR - First Third Avg HR) / First Third Avg HR) × 100`
- **Purpose**: Detects cardiovascular fatigue during workout
- **Interpretation**: Higher values indicate greater fatigue

### Zone Distribution
**Time in Each Zone**: Based on % of maximum heart rate
- **Zone 1 (50-60%)**: Active recovery, warm-up
- **Zone 2 (60-70%)**: Aerobic base building  
- **Zone 3 (70-80%)**: Aerobic development
- **Zone 4 (80-90%)**: Lactate threshold training
- **Zone 5 (90-100%)**: Neuromuscular power, VO2 max

## 🐛 Troubleshooting

### Common Issues
1. **"Buffer is not defined"**: Run `npm install` to ensure polyfills are installed
2. **Google Sheets permission denied**: Check service account email is shared on sheet
3. **No JSON files found**: Ensure .fit files are exported to JSON first
4. **Charts not creating**: Verify `createCharts: true` in config

### CLI Debugging
```bash
# Verbose output for debugging
npm run import-activities -- --verbose --dry-run

# Test specific directory
npm run import-activities -- --input-dir ./test-data --verbose
```

## 🔮 Future Extensions

The architecture supports easy extension for:
- **Nutrition Tracking**: Calorie and macro logging
- **Recovery Metrics**: HRV, sleep quality integration  
- **Performance Analytics**: Power analysis, VO2 estimation
- **Multi-Sport Analysis**: Triathlon race analysis
- **Custom Charts**: Additional Google Sheets visualizations

## 📞 Support

- Check `CLAUDE.md` for detailed technical documentation
- Review example configuration files
- Use `--help` flag with CLI commands
- Ensure Google Cloud and Sheets API setup is correct

Happy analyzing! 🏃‍♂️📊