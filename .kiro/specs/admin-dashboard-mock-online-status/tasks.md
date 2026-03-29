# Implementation Plan: Admin Dashboard Mock Online Status

## Overview

This implementation modifies the Admin Dashboard (`frontend/admin-dashboard.html`) to display mock "online" status for demonstration purposes. All changes are contained within a single file, focusing on three key areas: WebSocket status display, GPS status display, and daily waste total display. The implementation uses JavaScript to override actual system states with hardcoded mock values while preserving all existing dashboard functionality.

## Tasks

- [x] 1. Modify updateWSStatus() function to force connected status
  - Add status override at the start of the function (line ~2685)
  - Force status parameter to always be 'connected'
  - Ensure both WebSocket and GPS status displays show connected state
  - Add comment indicating this is mock behavior for demo purposes
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 2.4_

- [ ] 1.1 Write property test for status override consistency
  - **Property 1: Status Override Consistency**
  - **Validates: Requirements 1.1, 1.2, 1.4, 2.1, 2.2**
  - Test that any input status value results in connected display
  - Use fast-check to generate random status strings
  - Verify both ws-connection-status and gps-ws-status show connected state

- [ ] 1.2 Write property test for GPS status styling consistency
  - **Property 2: GPS Status Styling Consistency**
  - **Validates: Requirements 2.3, 2.4**
  - Test that GPS status element has correct inline styles
  - Verify background color, text color, and pulse-green animation
  - Use fast-check to generate random status inputs

- [x] 2. Modify daily waste display logic to show mock value
  - Locate dailyWasteText initialization in fetchBinsData() function (line ~1613)
  - Change initialization from "--" to "0"
  - Add comment indicating mock value for demo purposes
  - Ensure API call remains but result is overridden
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 2.1 Write property test for daily waste mock value persistence
  - **Property 3: Daily Waste Mock Value Persistence**
  - **Validates: Requirements 3.2, 3.3, 3.4**
  - Test that any API response results in "0 ตัน" display
  - Use fast-check to generate random API response objects
  - Include valid data, null values, and undefined values in test cases

- [x] 3. Add initial status display on page load
  - Add DOMContentLoaded event listener
  - Call updateWSStatus('connected') immediately on page load
  - Ensure this runs before any WebSocket connection attempts
  - Add comment explaining initial mock status setup
  - _Requirements: 1.3_

- [ ] 3.1 Write unit tests for initial page load behavior
  - Test that status displays show connected state immediately
  - Test that displays update before WebSocket initialization
  - Test graceful handling of missing DOM elements

- [ ] 4. Verify existing functionality preservation
  - [ ] 4.1 Test bin statistics calculations remain unchanged
    - Verify total bins count calculation
    - Verify full bins count (fill_level >= 90)
    - Verify almost full bins count (70 <= fill_level < 90)
    - Verify empty bins count (fill_level <= 20)
    - _Requirements: 4.4_
  
  - [ ] 4.2 Write property test for statistics calculation preservation
    - **Property 4: Statistics Calculation Preservation**
    - **Validates: Requirements 4.4**
    - Use fast-check to generate random arrays of bin objects
    - Verify statistics calculations match expected values
    - Test with empty arrays, single bins, and large datasets
  
  - [ ] 4.3 Verify map rendering functionality unchanged
    - Test that Leaflet map initializes correctly
    - Test that bin markers render on map
    - _Requirements: 4.2_
  
  - [ ] 4.4 Verify gauge rendering functionality unchanged
    - Test that gauge charts render correctly
    - Test that gauge values update properly
    - _Requirements: 4.3_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Run all property-based tests (minimum 100 iterations each)
  - Run all unit tests
  - Verify no console errors in browser
  - Test dashboard loads and displays mock status correctly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All modifications are in `frontend/admin-dashboard.html` (single file)
- Property-based tests use fast-check library with 100+ iterations
- Each property test references specific design document properties
- Mock values: WebSocket status = "🟢 เชื่อมต่อแล้ว", GPS status = "🟢 GPS เชื่อมต่อแล้ว", Daily waste = "0 ตัน"
- Existing error handling and console logging remain intact
- No backend or database changes required
