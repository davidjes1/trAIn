# Development & Testing Files

This directory contains development, testing, and debugging utilities that are **not included in production builds**.

## Structure

```
__dev__/
├── examples/           # Example code and integration demos
├── debug/              # Debugging utilities
├── tests/              # Test files
└── test-integration.ts # Integration test runner
```

## Contents

### Examples (`examples/`)
- **segment-examples.ts** - Workout segment creation examples
- **workout-integration-example.ts** - Unified workout system integration demo

### Debug Utilities (`debug/`)
- **auth-debug.ts** - Authentication debugging helpers
- **firebase-test.ts** - Firebase connection testing
- **firestore-debug.ts** - Firestore query debugging
- **create-sample-workout.ts** - Sample workout data generator

### Tests (`tests/`)
- **workout-service.test.ts** - WorkoutService unit tests

### Integration Testing
- **test-integration.ts** - Full system integration test

## Usage

These files are for development use only and are automatically excluded from production builds. They can be imported and used during development but will not increase bundle size.

## Note

Files in this directory may use features or imports not available in production and should not be imported by production code.
