# Requirements Document

## Introduction

This feature modifies the Admin Dashboard UI to display mock "online" status for all monitoring systems. The purpose is to create a demonstration-ready dashboard that always appears fully operational, regardless of actual backend connectivity. This allows for effective demonstrations and presentations without requiring live backend services.

## Glossary

- **Admin_Dashboard**: The web-based administrative interface located at `frontend/admin-dashboard.html` that displays system monitoring information
- **WebSocket_Status_Display**: The UI element with id `ws-connection-status` that shows the WebSocket connection state
- **GPS_Status_Display**: The UI element with id `gps-ws-status` that shows GPS module connectivity status
- **Daily_Waste_Display**: The UI element with id `daily-waste-total` that shows the total waste collected per day
- **Mock_Status**: A hardcoded status value used for demonstration purposes that does not reflect actual system state
- **updateWSStatus_Function**: The JavaScript function at line ~2685 that updates connection status displays

## Requirements

### Requirement 1: Mock WebSocket Connection Status

**User Story:** As a system demonstrator, I want the WebSocket connection status to always show as online, so that the dashboard appears fully operational during demonstrations.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display "🟢 เชื่อมต่อแล้ว" in the WebSocket_Status_Display element regardless of actual connection state
2. THE updateWSStatus_Function SHALL override the status parameter to always use 'connected' state
3. WHEN the Admin_Dashboard loads, THE WebSocket_Status_Display SHALL immediately show the mock online status
4. THE mock status SHALL persist throughout the entire user session

### Requirement 2: Mock GPS Module Status

**User Story:** As a system demonstrator, I want the GPS module status to always show as connected, so that all monitoring systems appear operational during demonstrations.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display "🟢 GPS เชื่อมต่อแล้ว" with a green pulsing indicator in the GPS_Status_Display element
2. THE updateWSStatus_Function SHALL set GPS_Status_Display to connected state regardless of actual GPS connectivity
3. THE GPS_Status_Display SHALL use green color styling (background: rgba(16,185,129,0.1), color: #10b981)
4. THE GPS_Status_Display SHALL include the pulse-green animation effect

### Requirement 3: Mock Daily Waste Total

**User Story:** As a system demonstrator, I want the daily waste total to show a default value of "0 ตัน", so that the dashboard displays consistent baseline data during demonstrations.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display "0 ตัน" in the Daily_Waste_Display element by default
2. THE Daily_Waste_Display SHALL show "0 ตัน" regardless of API response data
3. WHEN the dashboard data loading function executes, THE Admin_Dashboard SHALL override any API-provided waste data with the mock value
4. THE mock waste value SHALL remain "0 ตัน" throughout the user session

### Requirement 4: Preserve Existing Functionality

**User Story:** As a developer, I want all other dashboard functionality to remain unchanged, so that only the status displays are affected by the mock implementation.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL maintain all existing bin monitoring features
2. THE Admin_Dashboard SHALL maintain all existing map rendering functionality
3. THE Admin_Dashboard SHALL maintain all existing gauge rendering functionality
4. THE Admin_Dashboard SHALL maintain all existing statistics calculations for bins (total, full, almost full, empty)
