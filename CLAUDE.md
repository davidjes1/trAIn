# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**trAIn** is a comprehensive AI-powered training analysis and management platform built with TypeScript, Firebase, and modern web technologies. The application provides intelligent training insights, workout tracking, Strava integration, recovery monitoring, and adaptive training plan generation. It combines FIT file parsing, real-time data visualization, and client-side AI processing to deliver a complete training management solution.

## Project Structure

The repository is organized into the following structure:

- **index.html**: Main application HTML with Training Hub UI
- **src/**: TypeScript source code organized by domain
  - **main.ts**: Application entry point and initialization
  - **core/**: Core business logic and domain models
    - **models/**: Unified type system (use `@/core/models` for imports)
      - **workout.types.ts**: Workout data structures and states
      - **training.types.ts**: Training plans, metrics, and analytics
      - **user.types.ts**: User profiles and preferences
      - **firebase.types.ts**: Firebase/Firestore document types
      - **strava.types.ts**: Strava integration types
      - **index.ts**: Barrel export for clean imports
  - **ai/**: AI-powered training insights system
    - **AIService.ts**: Central AI orchestration service
    - **planAdvisor.ts**: Workout recommendation engine
    - **fatigueMonitor.ts**: Overtraining detection system
    - **performanceTrends.ts**: Progress analysis and insights
    - **planAdjuster.ts**: Dynamic plan modification logic
  - **components/**: UI components and views
    - **auth/**: Authentication UI (AuthManager)
    - **dashboard/**: Dashboard visualization (DashboardManager)
    - **training-hub/**: Main training interface (TrainingHub, WorkoutComparison)
    - **training-plan/**: Training plan management (TrainingPlanManager)
    - **workout-calendar/**: Unified calendar component (UnifiedWorkoutCalendar)
    - **workout-upload/**: FIT file upload interface (WorkoutUploadManager)
    - **import-data/**: Data import page (ImportDataPage)
    - **recovery/**: Recovery metrics tracking (RecoveryMetricsTracker)
    - **recent-workout/**: Recent workout display (RecentWorkoutDisplay)
    - **segments/**: Segment analysis (SegmentDisplay)
    - **strava/**: Strava integration UI (StravaConnector, StravaConfigurationModal)
    - **charts/**: Chart components (FitnessFatigueChart, IntensityHeatMap, LapCharts)
    - **workout-filter/**: Workout filtering UI
  - **services/**: Business logic services
    - **WorkoutService.ts**: Primary workout CRUD operations (Firebase)
    - **TrainingPlanService.ts**: Training plan management and workout integration
    - **FileService.ts**: FIT file processing
    - **AnalysisService.ts**: Activity analysis and metrics computation
    - **DashboardService.ts**: Dashboard data aggregation
    - **ChartService.ts**: Chart.js visualization service
    - **StravaService.ts**: Strava API integration
    - **StravaAuthManager.ts**: Strava OAuth flow
    - **StravaAutoSync.ts**: Automatic Strava synchronization
    - **StravaDataMapper.ts**: Strava data conversion
    - **PlanGenerator.ts**: Training plan generation
    - **PeriodizationService.ts**: Training periodization logic
    - **PlanAdjustmentService.ts**: Dynamic plan adjustments
    - **MetricsCalculator.ts**: Training metrics computation
    - **UserProfileService.ts**: User profile management
    - **WorkoutMatchingService.ts**: Match FIT files to planned workouts
    - **SegmentBuilder.ts**: Workout segment creation
    - **Router.ts**: Client-side routing
  - **firebase/**: Firebase integration
    - **config.ts**: Firebase initialization
    - **auth.ts**: Authentication helpers
    - **firestore.ts**: Firestore database helpers
    - **storage.ts**: Cloud storage helpers
  - **parser/**: FIT file parsing
    - **FitParser.ts**: Wrapper around fit-file-parser library
  - **config/**: Configuration files
    - **training.ts**: HR zones and training parameters
    - **workouts.ts**: Workout type definitions
    - **training-templates.ts**: Training plan templates
    - **strava-config.ts**: Strava API configuration
  - **utils/**: Utility functions
    - **ui-helpers.ts**: DOM manipulation utilities
    - **garmin-parser.ts**: Garmin data parsing
  - **styles/**: SCSS stylesheets
    - **main.scss**: Main stylesheet
    - **_unified-workout-calendar.scss**: Calendar component styles
    - **training-hub.scss**: Training hub styles
    - **dashboard.scss**: Dashboard styles
    - **auth.scss**: Authentication styles
    - **components/**: Component-specific styles
  - **__dev__/**: Development and testing code (excluded from production)
    - **examples/**: Example code and integration demos
    - **debug/**: Debugging utilities
    - **tests/**: Test files
    - **test-integration.ts**: Integration test runner
  - **__archive__/**: Legacy files preserved for reference
    - **types/**: Old type files (replaced by core/models)
- **dist/**: Production build output (generated)
- **vite.config.ts**: Vite build configuration with path aliases

## Development Commands

The application uses TypeScript, SCSS, and the Vite build system:

```bash
# Install dependencies
npm install

# Start development server
npm start  # or npm run dev
# Opens at http://localhost:3000 with hot reload

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking and linting
npm run type-check
npm run lint
npm run lint:fix

# Deployment
npm run deploy:vercel    # Deploy to Vercel
npm run deploy:netlify   # Deploy to Netlify
npm run deploy:gh-pages  # Deploy to GitHub Pages
```

## Recent Refactoring (January 2026)

The codebase underwent a comprehensive refactoring to improve maintainability, eliminate redundancies, and establish clearer architectural boundaries.

### Changes Made

**Phase 1: Type System Consolidation**
- Created `/src/core/models/` with unified type system
- Consolidated 4 duplicate type definitions
- Updated 50+ files to use `@/core/models` imports
- Configured TypeScript path aliases (`@/*`)

**Phase 2: Calendar Component Consolidation**
- Merged 3 calendar components into single `UnifiedWorkoutCalendar`
- Removed ~1,900 lines of duplicate code
- Added 16 features from legacy calendars
- Consolidated calendar SCSS files

**Phase 3: Service Layer Refactoring**
- Renamed `WorkoutStorageService` → `TrainingPlanService` (clearer purpose)
- Removed 193 lines of unused localStorage methods
- Integrated `WorkoutPlanIntegration.ts` into `TrainingPlanService`
- Eliminated duplicate conversion layer

**Phase 4: Code Organization**
- Moved development/test files to `/src/__dev__/` (excluded from production)
- Archived legacy type files to `/src/__archive__/`
- Removed unused entry points (`main-new.ts`, `main-old.scss`)
- Cleaned ~2,900 lines from production source tree

### Impact

- **Files Deleted:** 23 files (duplicates, legacy, dev files moved)
- **Lines Removed:** ~6,000 lines total
- **Code Organization:** Clear domain-driven structure
- **Type Safety:** Single source of truth for all types
- **Build Size:** Smaller production bundles

### Importing Types

**Use the unified type system:**
```typescript
// ✅ CORRECT - Use @/core/models
import { Workout, TrainingPlan, UserProfile } from '@/core/models';

// ❌ WRONG - Old paths (archived)
import { Workout } from '../types/workout.types';
```

### Service Usage

**WorkoutService** - Primary workout CRUD operations
```typescript
import WorkoutService from '@/services/WorkoutService';

// Create planned workout
const workout = await WorkoutService.createPlannedWorkout(input);

// Match FIT file to planned workout
const match = await WorkoutService.matchPlannedWorkout(userId, fitData);

// Process FIT file
const { workout, wasMatched } = await WorkoutService.processParsedFitData(userId, fitData);
```

**TrainingPlanService** - Training plan management
```typescript
import { TrainingPlanService } from '@/services/TrainingPlanService';

// Save generated plan as workouts
const { workouts, failures } = await TrainingPlanService.saveGeneratedPlanAsWorkouts(plan);

// Replace all future workouts with new plan
const result = await TrainingPlanService.replaceGeneratedPlan(plan, userId);
```

## Architecture Overview

### Application Structure
- **Single Page Application (SPA)**: Client-side routing with multiple views (Dashboard, Training Plans, Profile, Import Data)
- **Firebase Backend**: Authentication, Firestore database, and Cloud Storage
- **Modular TypeScript Architecture**: Organized into components, services, utilities, and types
- **Component-based UI**: Reusable UI components with encapsulated logic
- **SCSS Styling**: Modern glass-morphism design with variables and responsive layout
- **Vite Build System**: Fast HMR, optimized builds, and ES module support
- **Type Safety**: Full TypeScript coverage with strict type checking
- **Client-side AI Processing**: All AI computations run in the browser

### Core Features

#### 1. AI-Powered Training Insights (`src/ai/`)
- **Workout Recommendations**: Dynamic suggestions based on Training Stress Balance (TSB), recovery metrics, and weather
- **Fatigue Monitoring**: Multi-metric overtraining detection (HRV, resting HR, body battery, sleep)
- **Performance Analysis**: Trend detection for aerobic efficiency, pace, and training load
- **Plan Adjustment**: Adaptive logic for missed workouts, illness recovery, and performance plateaus
- **Sports Science Integration**: TRIMP calculations, TSB monitoring (7-day ATL, 28-day CTL)

#### 2. Firebase Integration (`src/firebase/`)
- **Authentication**: Email/password and Google OAuth
- **Firestore Database**: Real-time data synchronization for workouts, plans, and recovery metrics
- **Cloud Storage**: FIT file and media storage
- **Offline Support**: Firestore persistence for offline-first experience

#### 3. Strava Integration (`src/components/strava/`, `src/services/Strava*.ts`)
- **OAuth Flow**: Secure Strava authentication
- **Auto-Sync**: Automatic activity synchronization
- **Data Mapping**: Convert Strava activities to trAIn workout format
- **Activity Import**: Bulk import of historical activities

#### 4. Training Management
- **Training Plans**: `src/services/PlanGenerator.ts` - Generate periodized training plans
- **Workout Tracking**: `src/services/WorkoutService.ts` - CRUD operations for workouts
- **Calendar Views**: `src/components/workout-calendar/` - Month, week, and day views
- **Recovery Metrics**: `src/components/recovery/` - HRV, sleep, fatigue tracking

#### 5. Data Visualization (`src/services/ChartService.ts`)
- **Chart.js Integration**: Interactive charts for HR trends, training load, zone distribution
- **Real-time Updates**: Live data updates on dashboard
- **Responsive Charts**: Mobile-optimized visualizations

#### 6. FIT File Processing (`src/parser/`, `src/services/FileService.ts`)
- **Binary Parsing**: Client-side FIT file processing
- **Activity Analysis**: HR zones, TRIMP, pace/speed metrics
- **Lap Analysis**: Detailed lap-by-lap performance data

### Core Services

#### Primary Services
- **AIService**: `src/ai/AIService.ts` - Central AI orchestration and insights generation
- **DashboardService**: `src/services/DashboardService.ts` - Dashboard data aggregation and caching
- **WorkoutService**: `src/services/WorkoutService.ts` - Workout CRUD with Firebase integration
- **StravaService**: `src/services/StravaService.ts` - Strava API integration and data sync
- **PlanGenerator**: `src/services/PlanGenerator.ts` - Training plan generation with periodization
- **ChartService**: `src/services/ChartService.ts` - Chart.js visualization management
- **MetricsCalculator**: `src/services/MetricsCalculator.ts` - Training metrics computation (TRIMP, TSB, zones)
- **UserProfileService**: `src/services/UserProfileService.ts` - User profile and preferences management

#### UI Components
- **TrainingHub**: `src/components/training-hub/TrainingHub.ts` - Main dashboard view
- **DashboardManager**: `src/components/dashboard/DashboardManager.ts` - Dashboard visualization coordinator
- **AuthManager**: `src/components/auth/AuthManager.ts` - Authentication UI and flow
- **TrainingPlanManager**: `src/components/training-plan/TrainingPlanManager.ts` - Plan creation and management UI
- **UnifiedWorkoutCalendar**: `src/components/workout-calendar/UnifiedWorkoutCalendar.ts` - Calendar interface
- **RecoveryMetricsTracker**: `src/components/recovery/RecoveryMetricsTracker.ts` - Recovery monitoring UI

### Type System

#### Core Types
- **ActivityMetrics**: `src/types/training-metrics.types.ts` - Comprehensive activity analysis with HR zones and TRIMP
- **WorkoutData**: `src/types/workout.types.ts` - Workout data structures and Firebase models
- **StravaActivity**: `src/types/strava.types.ts` - Strava API response types
- **FirebaseModels**: `src/types/firebase.types.ts` - Firestore document structures
- **AITypes**: `src/ai/aiTypes.ts` - AI insights and recommendation types
- **FitParserTypes**: `src/types/fit-parser.types.ts` - FIT file parsing types

### Data Flow

#### Workout Upload & Processing
1. **Upload**: User uploads FIT file via drag-and-drop or file picker
2. **Parse**: FitParser processes binary data
3. **Analyze**: AnalysisService computes metrics (HR zones, TRIMP, pace/speed)
4. **Store**: WorkoutService saves to Firestore
5. **Display**: Dashboard updates with new workout data
6. **AI Analysis**: AIService generates insights based on new data

#### Strava Sync
1. **Authenticate**: OAuth flow with Strava
2. **Fetch**: Retrieve activities from Strava API
3. **Map**: StravaDataMapper converts to trAIn format
4. **Store**: Save to Firestore with Strava metadata
5. **Auto-sync**: Periodic background synchronization

#### AI Insights Generation
1. **Data Collection**: Fetch recent workouts and recovery metrics from Firestore
2. **TSB Calculation**: Compute acute (7-day) and chronic (28-day) training load
3. **Fatigue Analysis**: Assess recovery metrics (HRV, resting HR, sleep)
4. **Recommendation**: Generate workout suggestions with confidence scores
5. **Cache**: Store insights with 1-hour TTL for performance

### Data Models

#### Firebase Firestore Collections
```typescript
// users/{userId}
{
  email: string;
  displayName: string;
  createdAt: Timestamp;
  profile: {
    age: number;
    sex: 'male' | 'female';
    restingHR: number;
    maxHR: number;
    zones: HRZone[];
  }
}

// users/{userId}/workouts/{workoutId}
{
  id: string;
  userId: string;
  date: Timestamp;
  sport: string;
  duration: number;
  distance: number;
  averageHR: number;
  maxHR: number;
  zones: { z1-z5: number };
  trainingLoad: number;
  source: 'manual' | 'fit' | 'strava';
  stravaId?: string;
}

// users/{userId}/recoveryMetrics/{date}
{
  date: Timestamp;
  hrv: number;
  restingHR: number;
  bodyBattery: number;
  sleep: number;
  subjectiveFatigue: number;
}

// users/{userId}/trainingPlans/{planId}
{
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  goal: string;
  workouts: PlannedWorkout[];
  periodization: PeriodizationConfig;
}
```

### Key Features

#### 1. Dashboard View
- **Recovery Metrics Display**: HRV, resting HR, sleep, body battery tracking
- **Recent Workout Summary**: Latest activity with key metrics and charts
- **AI Insights Panel**: Workout recommendations, fatigue warnings, performance trends
- **Training Calendar**: Month/week/day views with workout visualization
- **Quick Stats**: Readiness score, weekly training load, training streak

#### 2. Training Plans
- **Plan Generation**: AI-powered periodized training plan creation
- **Template Library**: Pre-built plans for common goals (5K, 10K, marathon, etc.)
- **Plan Customization**: Adjust duration, volume, intensity, and schedule
- **Progress Tracking**: Visual progress indicators and completion status
- **Adaptive Adjustment**: Auto-adjust based on actual performance and recovery

#### 3. Workout Management
- **Multi-source Import**: FIT files, Strava sync, manual entry
- **Detailed Analysis**: HR zones, pace/speed, elevation, power (cycling)
- **Segment Analysis**: Lap-by-lap breakdown with performance metrics
- **Historical Tracking**: Searchable workout history with filtering
- **Comparison Tools**: Compare workouts across different time periods

#### 4. Strava Integration
- **OAuth Authentication**: Secure Strava account linking
- **Activity Sync**: Automatic import of new Strava activities
- **Bulk Import**: Import historical activities with date range selection
- **Data Mapping**: Convert Strava activities to trAIn workout format
- **Bi-directional Sync**: Upload workouts from trAIn to Strava (planned)

#### 5. AI Training Insights
- **Readiness Scoring**: Multi-factor analysis (TSB, recovery, recent load)
- **Workout Recommendations**: Personalized daily workout suggestions
- **Fatigue Monitoring**: Overtraining detection and prevention
- **Performance Trends**: Progress tracking and performance predictions
- **Plan Adjustments**: Adaptive recommendations for missed workouts or illness

#### 6. Recovery Tracking
- **HRV Monitoring**: Heart rate variability trends and analysis
- **Sleep Tracking**: Sleep duration and quality metrics
- **Body Battery**: Energy level tracking and recovery state
- **Subjective Metrics**: User-reported fatigue and wellness scores
- **Recovery Recommendations**: AI-powered rest day suggestions

### User Interface

#### Design System
- **Glass-morphism**: Modern glassmorphic UI with transparency and blur effects
- **Gradient Backgrounds**: Vibrant gradient color schemes
- **Responsive Layout**: Mobile-first design with breakpoints for tablet/desktop
- **Dark Mode**: Automatic dark mode support (planned)
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

#### Navigation
- **Top Navigation**: Dashboard, Training Plans, Profile, Import Data
- **View Routing**: Client-side routing with browser history
- **Quick Actions**: Import data, sync Strava, generate plan buttons
- **User Menu**: Profile, settings, logout

#### Interactive Elements
- **Calendar**: Click dates to view/add workouts, drag-and-drop support (planned)
- **Charts**: Interactive Chart.js visualizations with tooltips and zoom
- **Modals**: Configuration, import, and detail modals
- **Loading States**: Skeleton screens and loading indicators
- **Toast Notifications**: Success/error feedback messages

### Browser Compatibility
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **ES Modules**: Native ES module support required
- **APIs Used**: FileReader, Drag & Drop, LocalStorage, IndexedDB (via Firebase)
- **Progressive Enhancement**: Core features work without JavaScript (authentication only)

## Development Patterns

### Error Handling
- **Try-catch Blocks**: Comprehensive error handling around async operations
- **Firebase Error Handling**: Specific error codes for auth and database operations
- **User-friendly Messages**: Clear error messages with actionable guidance
- **Graceful Degradation**: Fallback to default behavior when features unavailable
- **Logging**: Console logging for debugging with different log levels

### State Management
- **Service Singletons**: Single instances of core services (getInstance() pattern)
- **Firebase Real-time**: Firestore listeners for live data updates
- **Local Caching**: 1-hour cache for AI insights, dashboard data
- **Loading States**: Visual indicators for async operations
- **Optimistic Updates**: UI updates before server confirmation

### Data Processing
- **ArrayBuffer Processing**: Binary FIT file handling
- **Batch Operations**: Efficient bulk workout imports
- **Background Sync**: Periodic Strava synchronization
- **Memory Management**: Cleanup of event listeners and subscriptions

### Code Organization
- **Single Responsibility**: Each service handles one domain
- **Dependency Injection**: Services passed as constructor parameters where needed
- **TypeScript Strict Mode**: Full type safety enforcement
- **ES Modules**: Native ES module imports/exports
- **Async/Await**: Consistent async patterns throughout codebase

## Data Sources & Formats

### FIT File Support
- **Binary Format**: ANT FIT protocol support via fit-file-parser library
- **Message Types**: Records, sessions, laps, events, device info, activity
- **Metrics Extracted**: HR data, GPS coordinates, pace/speed, elevation, power, cadence
- **File Validation**: Header verification and CRC checking
- **Error Recovery**: Graceful handling of corrupted or incomplete files

### Strava Integration
- **API Version**: Strava API v3
- **Activity Types**: Run, ride, swim, and 20+ other sport types
- **Data Mapping**: Convert Strava streams to trAIn workout format
- **Rate Limiting**: Respect Strava API rate limits (100 requests/15min, 1000/day)
- **OAuth 2.0**: Secure token-based authentication

### Manual Entry
- **Quick Entry**: Sport, duration, distance, HR, perceived effort
- **Detailed Entry**: Lap splits, segments, elevation, weather
- **Recovery Metrics**: HRV, resting HR, sleep, body battery, subjective fatigue

## Configuration

### Firebase Setup
Create a `.env` file in the project root:
```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### Strava Setup
1. **Create Strava App**: Go to https://www.strava.com/settings/api
2. **Configure OAuth**: Set callback URL to `http://localhost:3000` (dev) or your production URL
3. **Update Config**: Edit `src/config/strava-config.ts`:
```typescript
export const stravaConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: window.location.origin,
  scope: 'read,activity:read_all'
};
```

### Training Configuration
Edit `src/config/training.ts` to customize:
```typescript
export const trainingConfig = {
  restingHR: 59,        // Resting heart rate (bpm)
  maxHR: 190,           // Maximum heart rate (bpm)
  zones: [
    { min: 0.50, max: 0.60, name: 'Z1' },  // Recovery
    { min: 0.60, max: 0.70, name: 'Z2' },  // Aerobic
    { min: 0.70, max: 0.80, name: 'Z3' },  // Tempo
    { min: 0.80, max: 0.90, name: 'Z4' },  // Threshold
    { min: 0.90, max: 1.00, name: 'Z5' }   // VO2 Max
  ],
  paceBasedSports: ['running', 'swimming'],
  speedBasedSports: ['cycling', 'rowing']
};
```

## Testing

### Unit Testing (Planned)
- **Jest**: Test runner for TypeScript
- **Service Tests**: Mock Firebase and test business logic
- **Component Tests**: DOM manipulation and UI state

### Manual Testing
- **FIT File Upload**: Test with various Garmin devices (Edge, Fenix, Forerunner)
- **Strava Sync**: Verify OAuth flow and activity import
- **Cross-browser**: Chrome, Firefox, Safari, Edge
- **Responsive Design**: Mobile (iOS Safari, Chrome Android), tablet, desktop
- **Offline Mode**: Test Firestore offline persistence

### Integration Testing
- **Firebase**: Test auth, database reads/writes, storage uploads
- **Strava API**: Verify OAuth, activity fetch, data mapping
- **AI Insights**: Validate TSB calculations, workout recommendations

## Deployment

### Prerequisites
- **Firebase Project**: Create at https://console.firebase.google.com
- **Firebase Authentication**: Enable Email/Password and Google providers
- **Firestore Database**: Create in Firebase console (start in test mode for development)
- **Firebase Storage**: Enable for FIT file storage
- **Strava API** (optional): Register app at https://www.strava.com/settings/api

### Production Build
```bash
# Build optimized production bundle
npm run build

# Output: dist/ directory
# - Optimized JavaScript with code splitting
# - Compiled and minified SCSS
# - Type-checked TypeScript
# - Static assets optimization
```

### Deployment Options

#### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# - VITE_FIREBASE_API_KEY
# - VITE_FIREBASE_AUTH_DOMAIN
# - VITE_FIREBASE_PROJECT_ID
# - VITE_FIREBASE_STORAGE_BUCKET
# - VITE_FIREBASE_MESSAGING_SENDER_ID
# - VITE_FIREBASE_APP_ID
# - VITE_FIREBASE_MEASUREMENT_ID
```

#### Option 2: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Add environment variables in Netlify dashboard
```

#### Option 3: Firebase Hosting
```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Deploy
npm run build
firebase deploy --only hosting
```

#### Option 4: GitHub Pages
```bash
# Deploy to gh-pages branch
npm run deploy:gh-pages

# Configure GitHub Pages in repository settings
# Enable from gh-pages branch
```

### Environment Variables
Set these in your hosting provider's dashboard:
```bash
VITE_FIREBASE_API_KEY=           # From Firebase Console
VITE_FIREBASE_AUTH_DOMAIN=       # your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=        # your-project-id
VITE_FIREBASE_STORAGE_BUCKET=    # your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

## Security Considerations

### Data Privacy
- **Client-side FIT Processing**: All file parsing happens in browser - files never uploaded to external servers
- **Firebase Security Rules**: Firestore rules ensure users can only access their own data
- **User Data Isolation**: Each user's workouts, plans, and metrics are isolated by userId
- **No Third-party Analytics**: No external tracking or analytics services (privacy-first)

### Authentication Security
- **Firebase Auth**: Industry-standard authentication with secure token management
- **OAuth 2.0**: Secure Strava integration with token refresh
- **Password Hashing**: Firebase handles password hashing and salting
- **Session Management**: Automatic token expiration and refresh

### API Security
- **Strava Token Storage**: Tokens stored securely in Firestore with encryption at rest
- **Rate Limiting**: Respect API rate limits to prevent abuse
- **Environment Variables**: Sensitive config stored in environment variables, not committed to git
- **CORS Protection**: Firebase automatically handles CORS for database operations

### Code Security
- **TypeScript Strict Mode**: Prevents many runtime errors at compile time
- **Input Validation**: All user inputs validated before processing
- **XSS Prevention**: Proper sanitization of user-generated content
- **Dependency Auditing**: Regular npm audit runs to check for vulnerabilities
- **Trusted Libraries**: Use well-maintained packages (Firebase, Chart.js, fit-file-parser)

### Production Hardening
- **HTTPS Only**: Enforce HTTPS in production
- **Content Security Policy**: CSP headers to prevent XSS attacks (when deployed)
- **Firestore Security Rules**: Restrict read/write access to authenticated users only
```javascript
// Example Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Usage Workflows

### First-time Setup
1. **Create Account**: Sign up with email/password or Google OAuth
2. **Configure Profile**: Set age, sex, resting HR, max HR, and HR zones
3. **Connect Strava** (optional): Link Strava account for automatic activity import
4. **Import Initial Data**: Upload FIT files or sync from Strava

### Daily Workflow
1. **View Dashboard**: Check readiness score, weekly load, and AI insights
2. **Review Recommendations**: See AI-suggested workout for the day
3. **Complete Workout**: Train according to plan or recommendation
4. **Upload Activity**: Upload FIT file or auto-sync from Strava
5. **Log Recovery**: Enter HRV, sleep, and subjective fatigue metrics
6. **Track Progress**: Review charts and performance trends

### Creating a Training Plan
1. **Navigate to Training Plans**: Click "Training Plans" in top navigation
2. **Generate Plan**: Click "Generate Plan" button
3. **Configure Plan**:
   - Select goal (5K, 10K, half marathon, marathon, etc.)
   - Set start date and race date
   - Choose experience level and weekly volume
   - Configure available training days
4. **Review Plan**: Preview generated plan with periodization
5. **Activate Plan**: Save and activate plan
6. **Track Compliance**: View planned vs actual workouts on calendar

### Importing Workouts

#### Option 1: FIT File Upload
1. Navigate to "Import Data" page
2. Drag-and-drop .fit files or click to browse
3. Wait for parsing and analysis
4. Review metrics and save to Firestore

#### Option 2: Strava Sync
1. Click "Sync" button in dashboard
2. Authenticate with Strava (first time only)
3. Select activities to import
4. Automatic import and analysis

#### Option 3: Manual Entry
1. Click "Add Workout" on calendar
2. Enter sport, date, duration, distance, HR
3. Optionally add lap splits and segments
4. Save to Firestore

### Analyzing Performance
1. **Recent Workout**: View detailed analysis of latest activity
2. **Calendar View**: See training distribution over time
3. **Charts**: Interactive visualizations of HR trends, training load, zones
4. **AI Insights**: Performance trends, fatigue warnings, recommendations
5. **Segment Analysis**: Compare specific segments (hills, intervals, etc.)

### Recovery Monitoring
1. **Daily Entry**: Log HRV, resting HR, sleep, body battery, fatigue
2. **Trend Analysis**: View recovery metrics over time
3. **AI Alerts**: Get warnings for low HRV or high resting HR
4. **Rest Recommendations**: AI suggests rest days when needed

## AI Training Insights

### Training Stress Balance (TSB)
- **Acute Load (ATL)**: 7-day exponential weighted average of training load
- **Chronic Load (CTL)**: 28-day exponential weighted average (fitness)
- **TSB = CTL - ATL**: Balance between fitness and fatigue
  - TSB > +10: Peak form, ready to race
  - TSB -10 to +10: Normal training readiness
  - TSB < -10: High fatigue, increased injury risk

### TRIMP Calculation
```
Male: TRIMP = Duration × HRratio × e^(1.92 × HRratio)
Female: TRIMP = Duration × HRratio × e^(1.67 × HRratio)

Where HRratio = (HR - RestingHR) / (MaxHR - RestingHR)
```

### Workout Recommendations
AI considers:
- Training Stress Balance (TSB)
- Recent training history (7-28 days)
- Recovery metrics (HRV, sleep, resting HR)
- Current training plan (if active)
- Weather conditions (if available)
- User preferences (sport, time availability)

### Fatigue Detection
Warnings triggered by:
- TSB < -30 (extreme fatigue)
- HRV in lowest 20% of recent values
- Resting HR +5 bpm above baseline
- Body battery < 30 for multiple days
- High subjective fatigue scores

## Performance Metrics

### Heart Rate Metrics
- **Average HR**: Mean heart rate for workout
- **Max HR**: Peak heart rate reached
- **HR Drift**: Comparison of early vs late workout HR (fatigue indicator)
- **HR Zones**: Time distribution across 5 zones (Z1-Z5)
- **HR Reserve**: % of range between resting and max HR

### Pace/Speed Metrics
- **Average Pace/Speed**: Mean for entire workout
- **Pace per Zone**: Pace distribution by HR zone
- **Best Pace**: Fastest sustained pace for various durations
- **Negative Split**: Comparison of first vs second half pace

### Training Load Metrics
- **TRIMP**: Training Impulse (intensity × duration)
- **Acute Load**: 7-day rolling average
- **Chronic Load**: 28-day rolling average
- **Training Stress Balance**: CTL - ATL
- **Weekly Volume**: Total duration/distance per week

### Recovery Metrics
- **HRV (RMSSD)**: Heart rate variability (higher = better recovery)
- **Resting HR**: Morning resting heart rate (lower = better fitness)
- **Body Battery**: Energy reserves (0-100 scale)
- **Sleep**: Duration and quality scores
- **Readiness Score**: Composite metric (0-100)

## Dependencies

### Core Dependencies
- **firebase** (^12.0.0): Backend services (Auth, Firestore, Storage)
- **chart.js** (^4.5.0): Interactive data visualizations
- **chartjs-adapter-date-fns** (^3.0.0): Date axis support for charts
- **date-fns** (^4.1.0): Date manipulation and formatting
- **fit-file-parser** (^1.21.0): Garmin FIT file parsing
- **uuid** (^11.1.0): Unique ID generation

### Development Dependencies
- **typescript** (^5.2.0): Type-safe development
- **vite** (^5.0.0): Build tool and dev server
- **sass** (^1.69.0): SCSS compilation
- **eslint** (^8.45.0): Code linting
- **@typescript-eslint** (^6.0.0): TypeScript linting rules

### Build Tools
- **Vite**: Fast builds, hot module replacement, optimized production bundles
- **TypeScript Compiler**: Type checking and transpilation
- **SCSS Compiler**: CSS preprocessing with variables and nesting

## Troubleshooting

### Common Issues

#### Firebase Connection Issues
**Problem**: "Firebase configuration not found" error
**Solution**:
1. Create `.env` file in project root
2. Add all Firebase environment variables
3. Restart dev server (`npm start`)

#### Strava OAuth Callback Fails
**Problem**: Strava redirect fails or returns error
**Solution**:
1. Check Strava app callback URL matches your domain
2. For development: use `http://localhost:3000`
3. For production: use your actual domain
4. Update `src/config/strava-config.ts` with correct redirect URI

#### FIT File Upload Not Working
**Problem**: FIT file fails to parse or import
**Solution**:
1. Verify file is genuine .fit file from Garmin device
2. Check browser console for parsing errors
3. Try with different .fit file to isolate issue
4. Ensure fit-file-parser dependency is installed

#### Charts Not Displaying
**Problem**: Charts show blank or fail to render
**Solution**:
1. Check browser console for Chart.js errors
2. Verify Chart.js and chartjs-adapter-date-fns are installed
3. Ensure canvas elements exist in DOM
4. Check data format matches Chart.js requirements

#### Build Fails
**Problem**: `npm run build` fails with TypeScript errors
**Solution**:
1. Run `npm run type-check` to see all type errors
2. Fix type errors in reported files
3. Ensure all dependencies are installed (`npm install`)
4. Check for missing type definitions (@types/*)

### Development Tips

#### Hot Reload Not Working
- Restart Vite dev server
- Clear browser cache
- Check file is being watched (not in node_modules)

#### Firestore Data Not Syncing
- Check Firestore security rules allow access
- Verify user is authenticated
- Check browser network tab for failed requests
- Ensure Firestore offline persistence is enabled

#### Slow Build Times
- Use `npm run dev` for development (faster than build)
- Enable Vite caching (default)
- Consider splitting large components

## Contributing

### Code Style
- **TypeScript Strict**: Enable strict mode for all new code
- **Naming Conventions**:
  - PascalCase for classes and components
  - camelCase for functions and variables
  - UPPER_CASE for constants
- **File Organization**: Group related code in directories
- **Exports**: Use named exports for utilities, default for components

### Pull Request Guidelines
1. **Fork Repository**: Create personal fork
2. **Create Branch**: Use descriptive branch name (feature/ai-insights, fix/calendar-bug)
3. **Write Code**: Follow existing patterns and style
4. **Type Check**: Run `npm run type-check` and fix errors
5. **Lint**: Run `npm run lint:fix` to auto-fix style issues
6. **Test**: Manually test changes in browser
7. **Commit**: Write clear commit messages
8. **Push**: Push to your fork
9. **PR**: Create pull request with description of changes

### Adding New Features

#### New AI Insight Module
1. Create new file in `src/ai/`
2. Define types in `src/ai/aiTypes.ts`
3. Implement analysis logic with sports science formulas
4. Add integration point in `AIService.ts`
5. Update dashboard to display new insight

#### New Data Visualization
1. Add chart configuration to `ChartService.ts`
2. Create chart component in appropriate directory
3. Fetch data using existing services
4. Render chart using Chart.js
5. Add to dashboard or relevant view

#### New Workout Source
1. Create service in `src/services/` (e.g., `GarminConnectService.ts`)
2. Define types in `src/core/models/` or extend existing types
3. Implement OAuth flow if needed
4. Add data mapping to trAIn workout format
5. Integrate with `WorkoutService` and `TrainingPlanService`

## Roadmap

### Planned Features
- [ ] **Dark Mode**: User-selectable theme with dark color scheme
- [ ] **Mobile App**: Native iOS/Android apps using Capacitor
- [ ] **Social Features**: Share workouts, follow friends, leaderboards
- [ ] **Advanced Analytics**: Race predictions, VO2 max estimation, lactate threshold
- [ ] **Workout Builder**: Create custom structured workouts
- [ ] **Garmin Connect Integration**: Direct sync from Garmin Connect
- [ ] **Race Calendar**: Track upcoming races and goals
- [ ] **Nutrition Tracking**: Food logging and calorie tracking
- [ ] **Equipment Tracking**: Log shoes/bike mileage, maintenance reminders
- [ ] **Export Options**: PDF reports, TCX/GPX export, Strava upload

### Known Limitations
- **Calendar Drag & Drop**: Not yet implemented for workout rescheduling
- **Offline Mode**: Limited functionality without internet connection
- **Mobile Optimization**: Some charts may be difficult to read on small screens
- **Batch Operations**: Cannot delete multiple workouts at once
- **Export Formats**: Currently only JSON export for FIT files

## Resources

### Documentation
- **Firebase**: https://firebase.google.com/docs
- **Strava API**: https://developers.strava.com
- **Chart.js**: https://www.chartjs.org/docs
- **TypeScript**: https://www.typescriptlang.org/docs
- **Vite**: https://vitejs.dev/guide

### Sports Science References
- **TRIMP**: Banister, E. (1991). Modeling Elite Athletic Performance
- **Training Stress Balance**: Coggan, A. (2003). Training and Racing with a Power Meter
- **HRV**: Plews, D. et al. (2012). Training Adaptation and Heart Rate Variability

### Community
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Contributing**: See CONTRIBUTING.md for guidelines

---

**Built with ❤️ for endurance athletes seeking data-driven training insights**