// Quick test to verify training plan generation intensity distribution
const { PlanGenerator } = require('./dist/services/PlanGenerator.js');

// Sample plan options with good readiness metrics
const sampleOptions = {
  user: {
    age: 35,
    sex: 'male',
    eventDate: '2024-04-01',
    trainingDays: 5,
    fitnessLevel: 'intermediate'
  },
  recoveryMetrics: {
    bodyBattery: 85,
    sleepScore: 80,
    hrv: 45,
    restingHR: 55
  },
  recentFatigueScores: [25, 30, 35, 25, 40, 30, 35], // Low fatigue scores
  recentWorkouts: [
    { date: '2024-01-25', type: 'run', duration: 45, fatigue: 35, trainingLoad: 45 },
    { date: '2024-01-23', type: 'bike', duration: 60, fatigue: 40, trainingLoad: 50 }
  ],
  planDuration: 10,
  currentPhase: 'build',
  availabilityToday: true
};

console.log('Testing training plan generation...');
console.log('Sample options:', JSON.stringify(sampleOptions, null, 2));

try {
  const result = PlanGenerator.generatePlan(sampleOptions);
  
  console.log('\n=== PLAN GENERATION RESULTS ===');
  console.log(`Generated ${result.plan.length} workouts`);
  console.log(`Readiness Score: ${result.readinessMetrics.score}/100`);
  console.log(`Fatigue 7-day avg: ${result.readinessMetrics.fatigue7DayAvg}`);
  console.log(`Recovery Score: ${result.readinessMetrics.recoveryScore}`);
  
  console.log('\n=== WORKOUT INTENSITY DISTRIBUTION ===');
  const intensityBreakdown = {
    low: result.plan.filter(w => w.expectedFatigue <= 40).length,
    moderate: result.plan.filter(w => w.expectedFatigue > 40 && w.expectedFatigue <= 65).length,
    hard: result.plan.filter(w => w.expectedFatigue > 65 && w.expectedFatigue <= 85).length,
    extreme: result.plan.filter(w => w.expectedFatigue > 85).length,
    rest: result.plan.filter(w => w.workoutType === 'rest').length
  };
  
  console.log('Low intensity (≤40):', intensityBreakdown.low);
  console.log('Moderate intensity (41-65):', intensityBreakdown.moderate);
  console.log('Hard intensity (66-85):', intensityBreakdown.hard);
  console.log('Extreme intensity (>85):', intensityBreakdown.extreme);
  console.log('Rest days:', intensityBreakdown.rest);
  
  console.log('\n=== DAILY WORKOUT BREAKDOWN ===');
  result.plan.forEach((workout, index) => {
    console.log(`Day ${index + 1}: ${workout.workoutType} - ${workout.expectedFatigue}/100 - ${workout.description}`);
  });
  
  console.log('\n=== RECOMMENDATIONS ===');
  result.recommendations.forEach(rec => console.log('✓', rec));
  
  if (result.warnings.length > 0) {
    console.log('\n=== WARNINGS ===');
    result.warnings.forEach(warn => console.log('⚠️', warn));
  }
  
  // Check if we have variety in intensity
  const hasModerate = intensityBreakdown.moderate > 0;
  const hasHard = intensityBreakdown.hard > 0;
  
  console.log('\n=== TEST RESULTS ===');
  console.log('✅ Plan generated successfully');
  console.log(`${hasModerate ? '✅' : '❌'} Contains moderate intensity workouts (${intensityBreakdown.moderate})`);
  console.log(`${hasHard ? '✅' : '❌'} Contains hard intensity workouts (${intensityBreakdown.hard})`);
  console.log(`${result.readinessMetrics.score >= 70 ? '✅' : '❌'} Readiness score is good (${result.readinessMetrics.score})`);
  
} catch (error) {
  console.error('❌ Error generating plan:', error);
  console.error(error.stack);
}