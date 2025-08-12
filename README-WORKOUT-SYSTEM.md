# Unified Workout Management System for trAIn

A comprehensive TypeScript + Firebase Firestore system for managing planned and completed workouts with automatic Garmin FIT file matching.

## 🎯 Overview

This system provides a unified approach to workout management, combining planned workouts with actual training data from Garmin devices. It automatically matches uploaded FIT file data to planned workouts or creates unplanned workout records.

## ✨ Key Features

- **Unified Workout Schema**: Single data structure for planned, completed, missed, and unplanned workouts
- **Intelligent Matching**: Automatically matches FIT file data to planned workouts based on date, sport, duration, and distance
- **Batch Processing**: Handle multiple FIT files simultaneously with progress tracking
- **TypeScript Safety**: Full type coverage with comprehensive interfaces
- **Firebase Integration**: Cloud storage with offline-capable design
- **Comprehensive Analytics**: Training load, heart rate zones, and adherence tracking
- **Client-Side Processing**: No server-side dependencies, works entirely in the browser

## 🏗️ Architecture

### Data Flow
```
Garmin FIT Files → Local Parsing → JSON → Workout Matching → Firestore Storage
                                    ↓
                              Planned Workouts ← User Input
```

### Core Components

1. **WorkoutService**: Main service for CRUD operations and matching logic
2. **GarminParser**: FIT file parsing and standardization
3. **WorkoutUploadManager**: UI integration and batch processing
4. **Type System**: Comprehensive TypeScript interfaces

## 📊 Data Structure

### Workout Interface
```typescript
interface Workout {
  // Metadata
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  sport: SportType;
  name: string;
  description?: string;
  
  // Status and matching
  status: 'planned' | 'completed' | 'missed' | 'unplanned';
  matchedActivityId?: string;
  
  // Planned data
  planned?: {
    durationMin?: number;
    distanceKm?: number;
    targetMetrics?: TargetMetrics;
    segments?: WorkoutSegment[];
    tags?: string[];
    expectedFatigue?: number;
  };
  
  // Actual results
  actual?: ActualWorkout;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Firestore Structure
```
workouts/
├── {workoutId1}
│   ├── id: "uuid-1"
│   ├── userId: "user123"
│   ├── date: "2024-01-15"
│   ├── sport: "run"
│   ├── status: "completed"
│   ├── planned: {...}
│   ├── actual: {...}
│   └── timestamps...
├── {workoutId2}
└── ...
```

## 🚀 Quick Start

### 1. Installation

```bash
npm install uuid @types/uuid
```

### 2. Firebase Setup

```typescript
// Ensure your Firebase config includes Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### 3. Basic Usage

```typescript
import WorkoutService from './services/WorkoutService';

// Create a planned workout
const plannedWorkout = await WorkoutService.createPlannedWorkout({
  userId: 'user123',
  date: '2024-01-15',
  sport: 'run',
  name: 'Morning Easy Run',
  durationMin: 45,
  distanceKm: 7.5
});

// Process a FIT file
const fitData = GarminParser.parseFitFile(rawFitFileData);
const result = await WorkoutService.processParsedFitData('user123', fitData);

if (result.wasMatched) {
  console.log('Matched to planned workout!');
} else {
  console.log('Created as unplanned workout');
}
```

## 📋 API Reference

### WorkoutService

#### Core Methods

```typescript
// Create planned workout
static async createPlannedWorkout(input: CreatePlannedWorkoutInput): Promise<Workout>

// Match FIT data to planned workout  
static async matchPlannedWorkout(userId: string, parsedData: ParsedFitData): Promise<WorkoutMatchResult | null>

// Update planned workout with actual data
static async updateWorkoutWithActual(workoutId: string, parsedData: ParsedFitData): Promise<Workout>

// Create unplanned workout
static async handleUnplannedWorkout(userId: string, parsedData: ParsedFitData): Promise<Workout>

// Process FIT data (complete workflow)
static async processParsedFitData(userId: string, parsedData: ParsedFitData): Promise<{ workout: Workout; wasMatched: boolean }>

// Batch processing
static async processBatchFitData(userId: string, parsedDataArray: ParsedFitData[]): Promise<WorkoutBatchResult>

// Queries
static async getUserWorkouts(userId: string, limit?: number): Promise<Workout[]>
static async getWorkoutsByDateRange(userId: string, startDate: string, endDate: string): Promise<Workout[]>

// Management
static async markWorkoutAsMissed(workoutId: string): Promise<void>
static async deleteWorkout(workoutId: string): Promise<void>
```

### GarminParser

```typescript
// Parse FIT file data
static parseFitFile(rawFitData: any): ParsedFitData

// Create test data
static createSampleParsedData(overrides?: Partial<ParsedFitData>): ParsedFitData

// Validate parsed data
static validateParsedData(data: ParsedFitData): { isValid: boolean; errors: string[] }
```

### WorkoutUploadManager

```typescript
// Process single file
async processSingleFile(file: File): Promise<{ workout: Workout; wasMatched: boolean }>

// Process batch
async processBatchFiles(files: FileList | File[]): Promise<WorkoutBatchResult>

// Setup drag and drop
static setupDragAndDrop(dropZone: HTMLElement, uploadManager: WorkoutUploadManager): void
```

## 🧠 Matching Logic

The system uses a sophisticated scoring algorithm to match FIT file data to planned workouts:

### Scoring Criteria
- **Sport Match** (40%): Must match exactly
- **Date Match** (20%): Must be same day
- **Duration Match** (20%): Closer = higher score
- **Distance Match** (20%): Closer = higher score

### Confidence Thresholds
- **≥ 0.5**: Match accepted
- **< 0.5**: Create unplanned workout

### Example Matching
```typescript
// Planned: 45min run, 8km
// Actual: 47min run, 7.8km
// Score: 0.85 (excellent match)

// Planned: 60min bike, 25km  
// Actual: 30min bike, 12km
// Score: 0.65 (good match - scaled workout)

// Planned: 45min run
// Actual: 45min swim  
// Score: 0.20 (poor match - wrong sport)
```

## 📈 Analytics & Reporting

### Built-in Metrics
- Training Load (TRIMP-based calculation)
- Heart Rate Zones (5-zone system)
- Plan Adherence (duration/distance variance)
- Sport Distribution
- Weekly/Monthly Summaries

### Heart Rate Zones
- **Zone 1**: Recovery (50-68% max HR)
- **Zone 2**: Aerobic Base (68-78% max HR) 
- **Zone 3**: Aerobic (78-87% max HR)
- **Zone 4**: Lactate Threshold (87-93% max HR)
- **Zone 5**: Neuromuscular (93-100% max HR)

## 🧪 Testing

### Run Test Suite
```typescript
import { WorkoutServiceTests } from './tests/workout-service.test';

// Run all tests
await WorkoutServiceTests.runAllTests();

// Run specific test
await WorkoutServiceTests.testWorkoutMatching();

// Create demo data
await WorkoutServiceTests.createDemoData('user123');
```

### Example Integration
```typescript
import WorkoutIntegrationExample from './examples/workout-integration-example';

// Run complete example
await WorkoutIntegrationExample.runCompleteExample();
```

## 🎨 UI Integration

### Drag and Drop Upload
```typescript
const uploadManager = new WorkoutUploadManager('user123', {
  onProgress: (progress) => {
    console.log(`${progress.current}/${progress.total} - ${progress.currentFile}`);
  },
  onComplete: (results) => {
    console.log(`Processed ${results.successful.length} workouts`);
  }
});

WorkoutUploadManager.setupDragAndDrop(dropZoneElement, uploadManager);
```

### Progress Tracking
```html
<div id="upload-progress">
  <div class="progress-bar">
    <div class="progress-fill"></div>
  </div>
  <div class="progress-status">Ready to upload...</div>
</div>
```

## 🔒 Security & Permissions

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /workouts/{workoutId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## 🚀 Performance Optimization

### Indexing Strategy
```javascript
// Create composite indexes in Firebase Console
workouts: userId, date (desc)
workouts: userId, status, date (desc)  
workouts: userId, sport, date (desc)
```

### Best Practices
- Use pagination for large datasets
- Implement offline caching with localStorage
- Batch write operations when possible
- Use listeners for real-time updates

## 🔧 Configuration

### Heart Rate Zones
```typescript
// Customize in GarminParser
const zoneThresholds = [
  { zone: 1, min: 0, max: 0.68 * maxHR },
  { zone: 2, min: 0.68 * maxHR, max: 0.78 * maxHR },
  { zone: 3, min: 0.78 * maxHR, max: 0.87 * maxHR },
  { zone: 4, min: 0.87 * maxHR, max: 0.93 * maxHR },
  { zone: 5, min: 0.93 * maxHR, max: 220 }
];
```

### Training Load Calculation
```typescript
// TRIMP formula in GarminParser.estimateTrainingLoad()
const load = zones.reduce((sum, zone) => {
  const multipliers = [1.0, 1.2, 1.8, 2.5, 3.5];
  return sum + (zone.minutes * multipliers[zone.zone - 1]);
}, 0);
```

## 🐛 Error Handling

### Common Issues
1. **FIT File Parsing**: Invalid or corrupted files
2. **Firebase Permissions**: Insufficient security rules
3. **Matching Failures**: No suitable planned workout found
4. **Batch Processing**: Some files fail while others succeed

### Error Recovery
```typescript
try {
  const result = await WorkoutService.processParsedFitData(userId, fitData);
} catch (error) {
  if (error.code === 'permission-denied') {
    // Handle permission error
  } else if (error.message.includes('validation')) {
    // Handle validation error
  } else {
    // Generic error handling
  }
}
```

## 📱 Mobile Considerations

- All operations are client-side compatible
- Works with Capacitor/Cordova apps
- File upload works with device file systems
- Offline-capable with localStorage fallback

## 🔄 Migration Guide

### From Existing System
1. Export existing workout data
2. Transform to Workout interface format
3. Batch import using `WorkoutService.createPlannedWorkout()`
4. Update UI to use new components

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality  
4. Ensure TypeScript strict mode compliance
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

---

## 🎯 Next Steps

1. **Integration**: Add to your existing trAIn app
2. **Customization**: Modify matching logic for your needs
3. **UI Enhancement**: Build rich workout management interface
4. **Analytics**: Extend reporting capabilities
5. **Mobile**: Deploy to iOS/Android with Capacitor

For questions or support, please open an issue in the repository.

---

*Built with ❤️ for the trAIn fitness platform*