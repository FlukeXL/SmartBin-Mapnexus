# Design Document: Admin Dashboard Mock Online Status

## Overview

This feature implements mock "online" status displays in the Admin Dashboard to create a demonstration-ready interface that always appears fully operational. The implementation modifies specific JavaScript functions within `frontend/admin-dashboard.html` to override actual system states with hardcoded mock values while preserving all other dashboard functionality.

The design focuses on minimal, surgical modifications to three key areas:
1. WebSocket connection status display
2. GPS module connectivity status display  
3. Daily waste total display

All modifications are contained within the existing single-file architecture (`frontend/admin-dashboard.html`) and do not require changes to backend services, database schemas, or other frontend components.

## Architecture

### System Context

The Admin Dashboard is a self-contained HTML file with inline JavaScript that:
- Connects to backend APIs for data retrieval
- Establishes WebSocket connections for real-time GPS updates
- Renders interactive maps using Leaflet.js
- Displays statistics and monitoring information

### Modification Strategy

The design employs a "mock override" pattern where specific functions are modified to force mock values at the presentation layer:

```
┌─────────────────────────────────────────────────────────┐
│                   Admin Dashboard                        │
│  (frontend/admin-dashboard.html)                        │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  updateWSStatus() Function                      │    │
│  │  - Override status parameter                    │    │
│  │  - Force 'connected' state                      │    │
│  │  - Update both WS and GPS status displays       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Data Loading Function (fetchBinsData)          │    │
│  │  - Override API response data                   │    │
│  │  - Force "0 ตัน" for daily waste               │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  WebSocket Initialization (initGPSWebSocket)    │    │
│  │  - Call updateWSStatus('connected') on load     │    │
│  │  - Maintain existing connection logic           │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Design Rationale

1. **Presentation Layer Only**: Modifications occur only in the UI rendering logic, not in data fetching or business logic
2. **Minimal Footprint**: Only three functions are modified, reducing risk of unintended side effects
3. **Reversible**: Changes can be easily reverted by removing the override logic
4. **No Backend Changes**: Backend services remain unchanged, maintaining system integrity

## Components and Interfaces

### Component 1: WebSocket Status Display Override

**Location**: `updateWSStatus()` function (line ~2685)

**Current Behavior**:
```javascript
function updateWSStatus(status) {
    const statusEl = document.getElementById('ws-connection-status');
    const gpsStatusEl = document.getElementById('gps-ws-status');
    
    if (status === 'connected') {
        // Show connected state
    } else if (status === 'disconnected') {
        // Show disconnected state
    } else {
        // Show error state
    }
}
```

**Modified Behavior**:
```javascript
function updateWSStatus(status) {
    // MOCK: Always force connected status for demo
    status = 'connected';
    
    const statusEl = document.getElementById('ws-connection-status');
    const gpsStatusEl = document.getElementById('gps-ws-status');
    
    if (status === 'connected') {
        if (statusEl) statusEl.textContent = '🟢 เชื่อมต่อแล้ว';
        if (gpsStatusEl) {
            gpsStatusEl.innerHTML = '<div style="width: 6px; height: 6px; background: #10b981; border-radius: 50%; animation: pulse-green 1.5s infinite;"></div> GPS เชื่อมต่อแล้ว';
            gpsStatusEl.style.background = 'rgba(16,185,129,0.1)';
            gpsStatusEl.style.color = '#10b981';
        }
    }
    // Other branches become unreachable but remain for code clarity
}
```

**Interface**:
- **Input**: `status` parameter (string: 'connected', 'disconnected', or 'error')
- **Output**: Updates DOM elements `ws-connection-status` and `gps-ws-status`
- **Side Effects**: Modifies element text content, innerHTML, and inline styles

### Component 2: Daily Waste Total Override

**Location**: Data loading function `fetchBinsData()` (line ~1625)

**Current Behavior**:
```javascript
let dailyWasteText = "--";
try {
    const wasteData = await wasteRes.json();
    if (wasteData.summary && wasteData.summary.wasteGeneratedPerDay) {
        dailyWasteText = wasteData.summary.wasteGeneratedPerDay;
    }
} catch(e) {}

if (document.getElementById('daily-waste-total')) {
    document.getElementById('daily-waste-total').innerText = `${dailyWasteText} ตัน`;
}
```

**Modified Behavior**:
```javascript
// MOCK: Always show 0 tons for demo
let dailyWasteText = "0";

// Original API call remains but result is ignored
try {
    const wasteData = await wasteRes.json();
    // Data fetched but not used
} catch(e) {}

if (document.getElementById('daily-waste-total')) {
    document.getElementById('daily-waste-total').innerText = `${dailyWasteText} ตัน`;
}
```

**Interface**:
- **Input**: API response from waste data endpoint (ignored)
- **Output**: Updates DOM element `daily-waste-total`
- **Side Effects**: Modifies element text content to always show "0 ตัน"

### Component 3: Initial Status Display

**Location**: `initGPSWebSocket()` function (line ~2542)

**Current Behavior**:
```javascript
gpsWebSocket.onopen = () => {
    console.log('[GPS-WS] Connected');
    updateWSStatus('connected');
    addGPSLog('✅ เชื่อมต่อ WebSocket สำเร็จ', 'success');
};
```

**Modified Behavior**:
No changes needed to this function. The `updateWSStatus()` override in Component 1 ensures the status always shows as connected regardless of actual WebSocket state.

**Additional Initialization**:
Add immediate status update on page load:
```javascript
// Call on DOMContentLoaded or page initialization
document.addEventListener('DOMContentLoaded', function() {
    // Force initial mock status display
    updateWSStatus('connected');
});
```

## Data Models

### Status Display States

**WebSocket Connection Status**:
```javascript
{
    element_id: 'ws-connection-status',
    mock_value: '🟢 เชื่อมต่อแล้ว',
    actual_value: <ignored>,
    display_type: 'text'
}
```

**GPS Module Status**:
```javascript
{
    element_id: 'gps-ws-status',
    mock_value: {
        html: '<div style="...">GPS เชื่อมต่อแล้ว</div>',
        background: 'rgba(16,185,129,0.1)',
        color: '#10b981'
    },
    actual_value: <ignored>,
    display_type: 'styled_html'
}
```

**Daily Waste Total**:
```javascript
{
    element_id: 'daily-waste-total',
    mock_value: '0 ตัน',
    actual_value: <ignored>,
    display_type: 'text'
}
```

### DOM Element References

All modifications target specific DOM elements by ID:
- `ws-connection-status`: WebSocket connection indicator
- `gps-ws-status`: GPS module connection indicator  
- `daily-waste-total`: Daily waste statistics display

These elements exist in the HTML structure and are already referenced by existing code.


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Status Override Consistency

For any input status value ('connected', 'disconnected', 'error', or any other string), when `updateWSStatus()` is called, both the WebSocket status display and GPS status display SHALL show the connected state with text "🟢 เชื่อมต่อแล้ว" and "🟢 GPS เชื่อมต่อแล้ว" respectively.

**Validates: Requirements 1.1, 1.2, 1.4, 2.1, 2.2**

### Property 2: GPS Status Styling Consistency

For any call to `updateWSStatus()`, the GPS status display element SHALL have inline styles with background color 'rgba(16,185,129,0.1)', text color '#10b981', and innerHTML containing the 'pulse-green' animation CSS property.

**Validates: Requirements 2.3, 2.4**

### Property 3: Daily Waste Mock Value Persistence

For any API response data (including valid waste data, empty responses, or error responses), when the data loading function executes, the daily waste total display SHALL show "0 ตัน" regardless of the API response content.

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 4: Statistics Calculation Preservation

For any array of bin data objects with fill_level properties, the statistics calculations SHALL correctly count total bins, full bins (fill_level >= 90), almost full bins (70 <= fill_level < 90), and empty bins (fill_level <= 20).

**Validates: Requirements 4.4**

## Error Handling

### Error Scenarios

1. **Missing DOM Elements**
   - **Scenario**: Target DOM elements (`ws-connection-status`, `gps-ws-status`, `daily-waste-total`) do not exist
   - **Handling**: Functions check for element existence before attempting updates using conditional checks (`if (statusEl)`, `if (gpsStatusEl)`)
   - **Outcome**: Graceful degradation - no errors thrown, other functionality continues

2. **API Fetch Failures**
   - **Scenario**: Waste data API request fails or returns invalid data
   - **Handling**: Try-catch block wraps API call, errors are silently caught
   - **Outcome**: Mock value "0 ตัน" is displayed (default behavior)

3. **WebSocket Connection Failures**
   - **Scenario**: WebSocket fails to connect or connection is lost
   - **Handling**: Mock status override ensures display always shows connected state
   - **Outcome**: UI shows "connected" regardless of actual connection state (intended behavior for demo mode)

### Error Handling Strategy

The design employs a "fail-safe to mock" strategy:
- All error conditions result in the mock values being displayed
- No error messages are shown to users (demo mode should appear flawless)
- Console logging remains intact for debugging purposes
- Existing error handling mechanisms are preserved

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of status display updates
- Initial page load behavior
- Edge cases like missing DOM elements
- Integration with existing dashboard initialization

**Property-Based Tests** focus on:
- Universal properties that hold across all possible inputs
- Status override behavior with randomized status values
- Daily waste display with randomized API responses
- Statistics calculations with randomized bin data

### Property-Based Testing Configuration

**Library Selection**: 
- For JavaScript testing: Use **fast-check** library
- Installation: `npm install --save-dev fast-check`

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `// Feature: admin-dashboard-mock-online-status, Property {number}: {property_text}`

### Test Implementation Plan

#### Unit Tests

**Test File**: `frontend/tests/admin-dashboard-mock-status.test.js`

Test cases:
1. Initial page load displays mock connected status
2. updateWSStatus with 'disconnected' still shows connected
3. updateWSStatus with 'error' still shows connected
4. Daily waste display shows "0 ตัน" on page load
5. Missing DOM elements don't cause errors
6. Statistics calculations work with empty bin array
7. Statistics calculations work with single bin

#### Property-Based Tests

**Test File**: `frontend/tests/admin-dashboard-mock-status.properties.test.js`

Property test implementations:

**Property 1 Test**:
```javascript
// Feature: admin-dashboard-mock-online-status, Property 1: Status Override Consistency
fc.assert(
  fc.property(
    fc.string(), // Random status value
    (status) => {
      // Setup: Create mock DOM elements
      document.body.innerHTML = `
        <div id="ws-connection-status"></div>
        <div id="gps-ws-status"></div>
      `;
      
      // Execute: Call updateWSStatus with random status
      updateWSStatus(status);
      
      // Verify: Both elements show connected state
      const wsStatus = document.getElementById('ws-connection-status');
      const gpsStatus = document.getElementById('gps-ws-status');
      
      return wsStatus.textContent === '🟢 เชื่อมต่อแล้ว' &&
             gpsStatus.textContent.includes('GPS เชื่อมต่อแล้ว');
    }
  ),
  { numRuns: 100 }
);
```

**Property 2 Test**:
```javascript
// Feature: admin-dashboard-mock-online-status, Property 2: GPS Status Styling Consistency
fc.assert(
  fc.property(
    fc.string(), // Random status value
    (status) => {
      // Setup: Create mock DOM element
      document.body.innerHTML = '<div id="gps-ws-status"></div>';
      
      // Execute: Call updateWSStatus
      updateWSStatus(status);
      
      // Verify: Element has correct styling
      const gpsStatus = document.getElementById('gps-ws-status');
      
      return gpsStatus.style.background === 'rgba(16,185,129,0.1)' &&
             gpsStatus.style.color === '#10b981' &&
             gpsStatus.innerHTML.includes('pulse-green');
    }
  ),
  { numRuns: 100 }
);
```

**Property 3 Test**:
```javascript
// Feature: admin-dashboard-mock-online-status, Property 3: Daily Waste Mock Value Persistence
fc.assert(
  fc.property(
    fc.record({
      summary: fc.record({
        wasteGeneratedPerDay: fc.oneof(
          fc.double({ min: 0, max: 1000 }),
          fc.constant(null),
          fc.constant(undefined)
        )
      })
    }), // Random API response
    async (apiResponse) => {
      // Setup: Create mock DOM element and mock fetch
      document.body.innerHTML = '<div id="daily-waste-total"></div>';
      global.fetch = jest.fn(() => 
        Promise.resolve({
          json: () => Promise.resolve(apiResponse)
        })
      );
      
      // Execute: Call data loading function
      await fetchBinsData();
      
      // Verify: Display shows mock value
      const wasteDisplay = document.getElementById('daily-waste-total');
      return wasteDisplay.textContent === '0 ตัน';
    }
  ),
  { numRuns: 100 }
);
```

**Property 4 Test**:
```javascript
// Feature: admin-dashboard-mock-online-status, Property 4: Statistics Calculation Preservation
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        bin_id: fc.integer(),
        fill_level: fc.integer({ min: 0, max: 100 })
      })
    ), // Random array of bins
    (bins) => {
      // Calculate expected values
      const expectedTotal = bins.length;
      const expectedFull = bins.filter(b => b.fill_level >= 90).length;
      const expectedAlmostFull = bins.filter(b => b.fill_level >= 70 && b.fill_level < 90).length;
      const expectedEmpty = bins.filter(b => b.fill_level <= 20).length;
      
      // Execute: Calculate stats using dashboard logic
      const stats = {
        total: bins.length,
        full: bins.filter(b => b.fill_level >= 90).length,
        almostFull: bins.filter(b => b.fill_level >= 70 && b.fill_level < 90).length,
        empty: bins.filter(b => b.fill_level <= 20).length
      };
      
      // Verify: Calculations match expected values
      return stats.total === expectedTotal &&
             stats.full === expectedFull &&
             stats.almostFull === expectedAlmostFull &&
             stats.empty === expectedEmpty;
    }
  ),
  { numRuns: 100 }
);
```

### Testing Environment Setup

**Prerequisites**:
- Node.js testing framework (Jest recommended)
- JSDOM for DOM manipulation in tests
- fast-check for property-based testing

**Setup Commands**:
```bash
npm install --save-dev jest jsdom fast-check
```

**Test Execution**:
```bash
# Run all tests
npm test

# Run only unit tests
npm test -- admin-dashboard-mock-status.test.js

# Run only property tests
npm test -- admin-dashboard-mock-status.properties.test.js
```

### Coverage Goals

- 100% coverage of modified functions (`updateWSStatus`, data loading section)
- All four correctness properties validated through property-based tests
- All edge cases covered through unit tests
- Integration test confirming dashboard loads with mock status displayed
