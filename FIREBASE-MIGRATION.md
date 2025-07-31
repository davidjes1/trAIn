# Firebase Migration Plan - Training App

## Overview
Migrating from Google Sheets integration to a full Firebase-powered multi-user training platform with authentication, real-time data, and cloud storage.

## Firebase Stack Architecture

| Component | Firebase Service | Purpose |
|-----------|------------------|---------|
| Authentication | Firebase Auth | User registration, login, profile management |
| Database | Cloud Firestore | Real-time structured data storage |
| File Storage | Firebase Storage | .fit files and exported JSON storage |
| Backend Logic | Cloud Functions | Training plan generation, data processing |
| Frontend Hosting | Firebase Hosting | Static site deployment |
| Real-time Updates | Firestore Listeners | Live dashboard synchronization |

## Firestore Data Structure

```
users/{userId}
├── profile/
│   ├── email: string
│   ├── createdAt: timestamp
│   ├── displayName: string
│   ├── preferences: {
│   │   ├── timezone: string
│   │   ├── units: 'metric' | 'imperial'
│   │   ├── hrZones: HRZoneConfig
│   │   ├── fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
│   │   └── restingHR: number
│   │   }
│   └── stats: {
│       ├── totalActivities: number
│       ├── totalTrainingTime: number
│       └── lastActivityDate: string
│       }
│
├── activities/{activityId}
│   ├── date: string (YYYY-MM-DD)
│   ├── sport: string
│   ├── duration: number (minutes)
│   ├── distance: number (km)
│   ├── avgHR?: number
│   ├── maxHR?: number
│   ├── trainingLoad: number
│   ├── zone1Minutes: number
│   ├── zone2Minutes: number
│   ├── zone3Minutes: number
│   ├── zone4Minutes: number
│   ├── zone5Minutes: number
│   ├── calories?: number
│   ├── totalAscent?: number
│   ├── notes?: string
│   ├── fitFileUrl?: string (Firebase Storage path)
│   ├── uploadedAt: timestamp
│   └── processed: boolean
│
├── lapData/{lapId}
│   ├── activityId: string (reference)
│   ├── lapNumber: number
│   ├── lapDuration: number
│   ├── lapDistance: number
│   ├── avgHR?: number
│   ├── avgSpeed?: number
│   ├── elevationGain?: number
│   └── splitType: string
│
├── trainingPlans/{planId}
│   ├── date: string (YYYY-MM-DD)
│   ├── workoutType: string
│   ├── description: string
│   ├── expectedFatigue: number (0-100)
│   ├── durationMin: number
│   ├── completed: boolean
│   ├── actualFatigue?: number
│   ├── adherenceScore?: number
│   ├── generatedAt: timestamp
│   ├── generatedBy: 'user' | 'algorithm'
│   └── metadata: {
│       ├── basedOnMetrics: boolean
│       └── adjustmentReason?: string
│       }
│
├── trackedWorkouts/{workoutId}
│   ├── date: string
│   ├── status: 'planned' | 'completed' | 'missed' | 'unplanned'
│   ├── plannedWorkout?: reference to trainingPlans
│   ├── actualActivity?: reference to activities
│   ├── comparison?: WorkoutComparison
│   ├── userNotes?: string
│   ├── userRating?: number (1-5)
│   └── lastUpdated: timestamp
│
├── recoveryMetrics/{date}
│   ├── date: string (YYYY-MM-DD)
│   ├── sleepScore?: number (0-100)
│   ├── bodyBattery?: number (0-100)
│   ├── hrv?: number
│   ├── restingHR?: number
│   ├── subjectiveFatigue: number (1-10)
│   ├── stressLevel?: number (0-100)
│   ├── notes?: string
│   └── recordedAt: timestamp
│
└── analytics/{period}
    ├── period: string ('week-YYYY-WW' | 'month-YYYY-MM')
    ├── adherence: {
    │   ├── completionRate: number
    │   ├── durationAdherence: number
    │   └── loadAdherence: number
    │   }
    ├── performance: {
    │   ├── totalActivities: number
    │   ├── totalDuration: number
    │   ├── totalLoad: number
    │   └── averageLoadVariance: number
    │   }
    ├── trends: {
    │   ├── consistencyScore: number
    │   └── intensityTrend: 'increasing' | 'stable' | 'decreasing'
    │   }
    └── generatedAt: timestamp
```

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Shared workout templates (read-only for authenticated users)
    match /workoutTemplates/{templateId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## Firebase Storage Structure

```
fitFiles/{userId}/
├── raw/
│   └── {activityId}.fit
├── processed/
│   └── {activityId}.json
└── exports/
    └── {exportId}.json

userProfiles/{userId}/
└── avatar.jpg

workoutTemplates/
└── {templateId}.json
```

## Migration Steps

### Phase 1: Firebase Setup & Authentication
1. **Initialize Firebase Project**
   - Create Firebase project
   - Enable Authentication, Firestore, Storage, Functions, Hosting
   - Configure environment variables and API keys

2. **Remove Google Sheets Dependencies**
   - Remove SheetsService.ts and related imports
   - Remove google-sheets-config.json references
   - Update package.json to remove googleapis dependency
   - Remove sheets-related server.js code

3. **Implement Firebase Authentication**
   - Create AuthService.ts for login/logout/registration
   - Add login/register UI components
   - Update TrainingHub to handle authenticated state
   - Add user profile management

### Phase 2: Data Migration & Services
4. **Create Firebase Services**
   - FirebaseService.ts for connection management
   - FirestoreService.ts for database operations
   - StorageService.ts for file uploads
   - Replace localStorage with Firestore sync

5. **Update Data Models**
   - Add userId to all existing interfaces
   - Create Firebase-compatible type definitions
   - Update existing services to use Firestore

6. **Implement File Upload Flow**
   - Upload .fit files to Firebase Storage
   - Store processed JSON in Firestore
   - Maintain file references and metadata

### Phase 3: Real-time Features & Cloud Functions
7. **Add Real-time Synchronization**
   - Replace manual data loading with Firestore listeners
   - Implement real-time dashboard updates
   - Add offline support with Firestore caching

8. **Create Cloud Functions**
   - Training plan generation function
   - Analytics calculation function
   - File processing pipeline
   - Automated adherence scoring

### Phase 4: Enhanced Features & PWA
9. **PWA Implementation**
   - Add service worker for offline functionality
   - Create web app manifest
   - Implement push notifications for training reminders

10. **Advanced Analytics**
    - Real-time trend analysis
    - Comparative performance metrics
    - Predictive training recommendations

## Key Interface Updates

```typescript
// Updated with Firebase integration
interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  preferences: UserPreferences;
  stats: UserStats;
}

interface ActivityMetrics {
  id: string;
  userId: string;
  date: string;
  sport: string;
  duration: number;
  distance: number;
  // ... existing fields
  fitFileUrl?: string;
  uploadedAt: Date;
  processed: boolean;
}

interface TrainingPlan {
  id: string;
  userId: string;
  date: string;
  // ... existing fields
  generatedAt: Date;
  generatedBy: 'user' | 'algorithm';
}

interface TrackedWorkout {
  id: string;
  userId: string;
  date: string;
  status: WorkoutStatus;
  plannedWorkoutRef?: string;
  actualActivityRef?: string;
  // ... existing fields
  lastUpdated: Date;
}
```

## File Structure Changes

```
src/
├── firebase/
│   ├── config.ts              # Firebase configuration
│   ├── auth.ts                # Authentication service
│   ├── firestore.ts           # Firestore operations
│   ├── storage.ts             # Storage operations
│   └── functions.ts           # Cloud Functions client
├── services/
│   ├── AuthService.ts         # User authentication
│   ├── FirestoreService.ts    # Database operations
│   ├── StorageService.ts      # File storage
│   └── SyncService.ts         # Real-time synchronization
├── components/
│   ├── auth/
│   │   ├── LoginForm.ts
│   │   ├── RegisterForm.ts
│   │   └── UserProfile.ts
│   └── training-hub/
│       └── ... (existing components updated)
├── types/
│   ├── firebase.types.ts      # Firebase-specific types
│   └── ... (existing types updated)
└── utils/
    ├── firebase-helpers.ts    # Firebase utility functions
    └── offline-support.ts     # PWA offline functionality
```

## Cost Optimization

### Firestore Usage Optimization
- Use composite indexes efficiently
- Implement data pagination
- Cache frequently accessed data
- Use Firestore offline persistence

### Storage Optimization
- Compress .fit files before upload
- Implement file cleanup for old data
- Use appropriate storage classes

### Function Optimization
- Use smallest possible runtime
- Implement efficient cold start strategies
- Cache expensive computations

## Testing Strategy

1. **Unit Tests**: Firebase services with emulators
2. **Integration Tests**: Full auth + data flow
3. **Performance Tests**: Large dataset handling
4. **Security Tests**: Rules validation
5. **Offline Tests**: PWA functionality

## Deployment Pipeline

1. **Development**: Local Firebase emulators
2. **Staging**: Firebase project with test data
3. **Production**: Automated deployment via GitHub Actions

This migration will transform your training app into a scalable, multi-user platform while maintaining all existing functionality and adding real-time capabilities.