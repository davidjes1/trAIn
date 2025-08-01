# Client-Side File Processing Workflow Test Plan

## Test Objectives
Verify that the FIT file processing workflow works correctly with the new Firebase-integrated architecture.

## Components to Test

### 1. Core File Processing (`FileService`)
- **Basic file validation**: Only accepts .fit files
- **File parsing**: Uses FitParser to convert binary data to structured data
- **Error handling**: Graceful failure for corrupted files
- **UI feedback**: Loading states and status messages

### 2. Training Analysis (`AnalysisService`)
- **Activity extraction**: Converts FIT data to ActivityMetrics
- **Lap analysis**: Extracts lap-by-lap performance data
- **HR zone calculations**: Proper time in zones computation
- **Training load calculation**: TRIMP-style metrics

### 3. Firebase Integration (`DashboardService`)
- **Authentication check**: Verifies user login before saving
- **Activity storage**: Saves parsed activity to Firestore
- **Lap data storage**: Saves lap metrics with proper activity linkage
- **Offline fallback**: Falls back to localStorage when needed

### 4. UI Integration (`TrainingHub`)
- **Single file upload**: Drag-and-drop and file picker
- **Bulk file processing**: Multiple file handling
- **Progress feedback**: Loading states and success/error messages
- **Calendar integration**: New activities appear in workout calendar

## Test Scenarios

### Scenario 1: Single File Processing (Authenticated)
1. **Setup**: User logged in to Firebase
2. **Action**: Upload single .fit file via drag-and-drop
3. **Expected**:
   - File validation passes
   - Parsing completes successfully
   - Activity metrics calculated
   - Data saved to Firestore
   - Success message shown
   - Activity appears in calendar

### Scenario 2: Single File Processing (Not Authenticated)
1. **Setup**: User not logged in
2. **Action**: Upload single .fit file
3. **Expected**:
   - File parsing works
   - Firebase save fails gracefully
   - Falls back to localStorage
   - Warning message about authentication

### Scenario 3: Bulk File Processing
1. **Setup**: User logged in, multiple .fit files ready
2. **Action**: Upload 3-5 .fit files via bulk interface
3. **Expected**:
   - Batch processing progress shown
   - Each file processed individually
   - Success/failure count reported
   - All successful activities saved to Firestore

### Scenario 4: Invalid File Handling
1. **Setup**: Non-.fit file (e.g., .txt, .json)
2. **Action**: Attempt to upload invalid file
3. **Expected**:
   - File validation fails immediately
   - Clear error message shown
   - No processing attempted

### Scenario 5: Corrupted FIT File
1. **Setup**: Damaged/incomplete .fit file
2. **Action**: Upload corrupted file
3. **Expected**:
   - Parsing fails gracefully
   - Error message explains issue
   - No partial data saved

## Manual Test Steps

### Pre-Test Setup
1. Start development server: `npm run dev`
2. Open browser to `http://localhost:3008`
3. Create test Firebase user account
4. Prepare test .fit files (valid and invalid)

### Test Execution

#### Test 1: Basic File Processing
- [ ] Sign in to Firebase account
- [ ] Navigate to "Process Activities" tab
- [ ] Drag valid .fit file to drop zone
- [ ] Verify parsing progress shown
- [ ] Check success message appears
- [ ] Verify activity data displayed
- [ ] Check Firebase console for saved data
- [ ] Verify activity appears in calendar

#### Test 2: Unauthenticated Processing
- [ ] Sign out of Firebase
- [ ] Upload same .fit file
- [ ] Verify localStorage fallback works
- [ ] Check appropriate warning shown

#### Test 3: Bulk Processing
- [ ] Sign back in
- [ ] Use bulk file interface
- [ ] Upload 3 different .fit files
- [ ] Monitor batch progress
- [ ] Verify all files processed
- [ ] Check success/failure summary

#### Test 4: Error Handling
- [ ] Upload .txt file → verify rejection
- [ ] Upload corrupted .fit file → verify graceful failure
- [ ] Upload very large file → verify handling

#### Test 5: Integration Testing
- [ ] Process new activity
- [ ] Verify it appears in dashboard metrics
- [ ] Check calendar integration
- [ ] Test workout matching functionality

## Expected Outcomes

### Successful Test Results
- ✅ All valid .fit files parse correctly
- ✅ Activity metrics calculated accurately
- ✅ Firebase integration works when authenticated
- ✅ localStorage fallback functions properly
- ✅ UI provides clear feedback throughout
- ✅ Error handling is robust and informative
- ✅ Bulk processing handles multiple files efficiently
- ✅ Data appears correctly in dashboard and calendar

### Performance Expectations
- File parsing: < 2 seconds for typical .fit file
- Firebase save: < 1 second per activity
- Bulk processing: Reasonable progress for 5+ files
- UI responsiveness maintained throughout

## Validation Checklist

### Data Integrity
- [ ] Activity date extracted correctly
- [ ] Duration and distance accurate
- [ ] Heart rate data preserved
- [ ] GPS coordinates (if available) maintained
- [ ] Lap splits calculated properly

### User Experience
- [ ] Clear loading indicators
- [ ] Informative error messages
- [ ] Progress feedback for long operations
- [ ] Successful completion confirmation
- [ ] Seamless integration with existing UI

### Technical Robustness
- [ ] Handles various .fit file formats
- [ ] Graceful error recovery
- [ ] Memory efficient for large files
- [ ] No memory leaks during bulk processing
- [ ] Proper cleanup after operations

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Single file (auth) | ⏳ | |
| Single file (no auth) | ⏳ | |
| Bulk processing | ⏳ | |
| Invalid file rejection | ⏳ | |
| Corrupted file handling | ⏳ | |
| UI integration | ⏳ | |
| Firebase persistence | ⏳ | |
| Performance | ⏳ | |

## Issues Found
*Document any issues discovered during testing*

## Recommendations
*List any improvements or fixes needed*