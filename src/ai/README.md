# trAIn AI Training Insights System

This directory contains the complete AI-powered training insights system for the trAIn fitness platform, implemented entirely with client-side processing and free-tier APIs.

## Architecture Overview

The AI system is built with a modular TypeScript architecture that integrates seamlessly with the existing Firebase-based trAIn platform:

```
src/ai/
├── aiTypes.ts              # Complete TypeScript type definitions
├── aiUtils.ts              # Core utilities and calculations (TSB, recovery analysis)
├── AIService.ts            # Central orchestration service
├── planAdvisor.ts          # Workout recommendation engine
├── fatigueMonitor.ts       # Overtraining detection system
├── performanceTrends.ts    # Progress analysis and insights
└── planAdjuster.ts         # Dynamic plan modification logic
```

## Core Features

### 🤖 Workout Recommendations (`planAdvisor.ts`)
- **Dynamic workout suggestions** based on TSB, recovery metrics, and weather
- **Alternative options** with confidence scoring
- **Contextual modifications** for indoor/outdoor conditions
- **User preference integration** for sport and time preferences

**Example Usage:**
```typescript
const recommendation = await AIService.getTomorrowWorkoutRecommendation(userId);
// Returns: workout type, intensity, duration, reasoning, alternatives
```

### 📊 Fatigue & Overtraining Detection (`fatigueMonitor.ts`)
- **Multi-metric analysis**: HRV, resting HR, body battery, sleep, subjective fatigue
- **Training Stress Balance**: 7-day (ATL) and 28-day (CTL) load monitoring
- **Risk assessment** with actionable recommendations
- **Overtraining syndrome** marker detection

**Key Thresholds:**
- TSB < -30: High fatigue risk
- HRV in lowest 20%: Recovery compromised  
- Resting HR +5 bpm: Stress indicator
- Body Battery < 30: Reduce intensity

### 📈 Performance Analysis (`performanceTrends.ts`)
- **Trend detection** for aerobic efficiency, pace, training load
- **Natural language insights**: "6% aerobic efficiency improvement"
- **Performance predictions** with confidence intervals
- **Training focus recommendations** based on weaknesses

### 🔧 Plan Adjustment Logic (`planAdjuster.ts`)
- **Missed workout compensation** strategies
- **Illness/injury recovery** protocols
- **Schedule change** adaptations
- **Performance plateau** interventions

## Sports Science Integration

### TRIMP Calculation
```typescript
// Gender-specific training load formulas
const trimp = durationMinutes × hrRatio × e^(1.92 × hrRatio); // Male
const trimp = durationMinutes × hrRatio × e^(1.67 × hrRatio); // Female
```

### Training Stress Balance (TSB)
```typescript
const acuteLoad = 7dayExponentialAverage;    // ATL
const chronicLoad = 28dayExponentialAverage; // CTL
const tsb = chronicLoad - acuteLoad;         // TSB

// Interpretation:
// TSB > +10: Peak form window
// TSB -10 to +10: Normal training readiness
// TSB < -10: High fatigue risk
```

## Integration Points

### Dashboard Integration
The `DashboardService` has been enhanced to include AI insights:

```typescript
// Get comprehensive AI insights
const insights = await dashboardService.getDashboardData();
console.log(insights.aiInsights.quickStats.readinessScore); // 0-100
```

### Training Plan Integration
The `TrainingPlanManager` includes AI recommendation features:

```typescript
// Get AI recommendation for tomorrow's workout
await trainingPlanManager.getAIRecommendation();
// Displays interactive panel with workout suggestions and fatigue assessment
```

## Data Requirements

The AI system works with existing trAIn data structures:

**Required Data:**
- `ActivityMetrics[]`: Recent training activities (last 28 days minimum)
- `FirebaseRecoveryMetrics[]`: Recovery data (last 14 days minimum)
- `UserTrainingProfile`: Age, sex, HR zones, preferences

**Optional Enhancements:**
- `WeatherCondition`: For weather-adjusted recommendations
- `TrainingPlan[]`: For plan-specific adjustments

## Privacy & Performance

- **Client-side processing**: All AI computations happen in browser
- **No external APIs**: Uses only free-tier services or local processing
- **Caching strategy**: 1-hour cache for dashboard insights
- **Offline-ready**: Works without internet after initial data load

## Configuration

Enable/disable AI features:

```typescript
// In DashboardService
dashboardService.setAIInsightsEnabled(true);

// In TrainingPlanManager  
trainingPlanManager.setAIEnabled(true);
```

## Future Enhancements

The modular architecture allows for easy extension:

- **TensorFlow.js integration** for advanced pattern recognition
- **Hugging Face models** for natural language generation
- **Weather API integration** for environmental recommendations
- **Heart rate variability analysis** for advanced recovery insights

## Error Handling

The system includes comprehensive error handling:

- **Graceful degradation**: Continues without AI if data insufficient
- **Confidence scoring**: All recommendations include confidence levels
- **Fallback logic**: Default recommendations when AI unavailable
- **User feedback**: Clear status messages for all operations

## Development Notes

- **TypeScript strict mode**: Full type safety throughout
- **Deterministic logic**: Critical training decisions use rule-based systems
- **Modular design**: Each AI feature is independently testable
- **Sports science based**: All algorithms grounded in exercise physiology

This AI system enhances the trAIn platform with intelligent training insights while maintaining privacy, performance, and the existing user experience.