# Development Plan: Pearson Washroom Cleaning Optimization Dashboard

**Purpose:** Incremental, step-by-step development plan for building the React dashboard based on `context.MD`.

**Approach:** One phase at a time, with clear deliverables and acceptance criteria before moving to the next phase.

---

## Phase 0: Project Setup & Foundation

**Goal:** Establish the React project structure, tooling, and development environment.

**Deliverables:**

1. **React project initialization**
   - Create React app (Vite or Create React App)
   - Set up TypeScript
   - Configure ESLint and Prettier
   - Set up folder structure:
     ```
     dashboard/
     ├── src/
     │   ├── components/      # Reusable UI components
     │   ├── pages/           # Tab/page components
     │   ├── hooks/           # Custom React hooks
     │   ├── services/        # API/data service layer
     │   ├── store/           # State management (Redux/Zustand)
     │   ├── types/           # TypeScript type definitions
     │   ├── utils/           # Utility functions
     │   └── constants/       # Constants and config
     ├── public/
     └── package.json
     ```

2. **Core dependencies**
   - React Router (for tab navigation)
   - State management library (Redux Toolkit or Zustand)
   - UI component library (Material-UI, Ant Design, or custom)
   - Charting library (Recharts or Chart.js)
   - Date/time handling (date-fns or dayjs)
   - HTTP client (axios or fetch wrapper)

3. **Development environment**
   - Environment variable setup (`DATA_ROOT`, API endpoints)
   - Hot reload configuration
   - Basic error boundary component
   - Loading and error state components

4. **Type definitions (foundational)**
   - `Washroom`, `Task`, `Crew`, `EmergencyEvent`, `HappyScore` types
   - Based on Section 4 of `context.MD`

**Acceptance Criteria:**
- ✅ Project runs without errors
- ✅ TypeScript compiles cleanly
- ✅ Basic routing structure in place (10 tabs as placeholders)
- ✅ Can import and use mock data types

**Estimated Time:** 1-2 days

---

## Phase 1: Data Layer & Mock Data

**Goal:** Build the data service layer and create mock data generators for development.

**Deliverables:**

1. **Data service architecture**
   - Create `services/dataService.ts` with interfaces for:
     - `loadWashrooms()` - from `gates_washrooms.csv`
     - `loadHappyScoreData()` - from Happy or Not CSV
     - `loadTasks()` - from lighthouse.io Tasks
     - `loadCrewData()` - crew roster and status
     - `loadSimulationData()` - from `multi_od_results_2024-01-01.json`
   - Implement CSV/JSON parsers (use `papaparse` for CSV, native JSON for JSON)
   - Handle `DATA_ROOT` environment variable

2. **Mock data generators**
   - Generate realistic mock data for:
     - 20-30 washrooms with coordinates
     - 5-10 crew members with statuses
     - 50-100 tasks (various states)
     - Happy scores per washroom (time series)
     - Emergency events
   - Use Faker.js or similar for realistic names/IDs

3. **Data transformation utilities**
   - Functions to:
     - Map washroom IDs across data sources (Section 8.4)
     - Calculate Happy Score aggregates (rolling windows)
     - Compute headway from task completion times
     - Derive task states and SLA deadlines

4. **Error handling**
   - Graceful degradation when data files are missing
   - Loading states and error messages
   - Fallback to mock data in development

**Acceptance Criteria:**
- ✅ Can load and parse `gates_washrooms.csv`
- ✅ Can load and parse `multi_od_results_2024-01-01.json`
- ✅ Mock data generators produce realistic test data
- ✅ Data transformation functions work correctly
- ✅ Error handling tested with missing files

**Estimated Time:** 2-3 days

---

## Phase 2: Core Layout & Navigation

**Goal:** Build the main application shell with tab navigation.

**Deliverables:**

1. **Main layout component**
   - Header with app title and user info
   - Sidebar or top navigation with 10 tabs:
     1. Live Ops
     2. Assignments
     3. Optimizer ("Craptimizer")
     4. Demand & Flights
     5. Performance & SLAs
     6. Incidents & Alerts
     7. Crew & Shifts
     8. Locations & Config
     9. Activity Log
     10. Help & Playbook
   - Footer with status indicators (data refresh time, connection status)

2. **Routing setup**
   - React Router configuration
   - Route guards (if authentication needed later)
   - Active tab highlighting
   - URL-based navigation (e.g., `/live-ops`, `/assignments`)

3. **Global state management**
   - Store setup for:
     - Current user/session
     - Selected filters (terminal, time range)
     - Data refresh timestamps
     - UI preferences (theme, layout)
   - Actions and reducers/selectors

4. **Basic UI components**
   - Button, Input, Select, Card, Table (from UI library or custom)
   - Consistent styling/theme
   - Responsive layout (mobile-friendly)

**Acceptance Criteria:**
- ✅ All 10 tabs are navigable
- ✅ Active tab is visually highlighted
- ✅ Layout is responsive
- ✅ Global state can be accessed from any component
- ✅ Basic UI components are reusable

**Estimated Time:** 2-3 days

---

## Phase 3: Live Ops Tab (Core View)

**Goal:** Implement the primary operational view where dispatchers spend most of their time.

**Deliverables:**

1. **Mini KPI Panel** (Section 6.1.4)
   - Display cards for:
     - Current avg happy score
     - Number of active emergencies
     - Number of overdue tasks
     - Avg response time (last 2 hours)
     - Avg headway vs SLA
   - Auto-refresh every 15-30 seconds
   - Color coding (green/yellow/red thresholds)

2. **Incoming Demand Panel** (Section 6.1.1)
   - List of new tasks and incidents
   - Columns: time, priority, location, type
   - Sortable by time, priority, location
   - Quick actions: Assign, Acknowledge, Snooze
   - Filter by terminal/zone

3. **Crew Strip/Roster** (Section 6.1.3)
   - Horizontal or vertical list of on-shift crew
   - For each crew member show:
     - Name, status badge (available/busy/on_break)
     - Current task with location and ETA
     - Next task (if assigned)
     - Time since last break
     - Shift start/end times
   - Click to see details or assign task

4. **Airport Map** (Section 6.1.2) - **Simplified version**
   - Static SVG or image of terminal layout
   - Washrooms as clickable nodes/circles
   - Color coding: clean (green), due soon (yellow), overdue (orange), emergency (red), closed (gray)
   - Tooltip on hover: last cleaned time, headway, happy score
   - Side panel on click with full details
   - Filter by terminal/zone

5. **Auto-refresh mechanism**
   - Polling every 15-30 seconds (or WebSocket if available)
   - Visual indicator when data is refreshing
   - Manual refresh button

**Acceptance Criteria:**
- ✅ All 4 panels render with mock data
- ✅ KPIs update automatically
- ✅ Can filter by terminal/zone
- ✅ Can assign task from incoming demand panel
- ✅ Map shows washroom status correctly
- ✅ Crew strip shows accurate status
- ✅ Auto-refresh works without page reload

**Estimated Time:** 5-7 days

---

## Phase 4: Assignments Tab

**Goal:** Detailed task management with manual override capabilities.

**Deliverables:**

1. **Task List/Board** (Section 6.2.1)
   - Table view with columns:
     - Task ID, type, washroom, priority
     - State (badge: unassigned/assigned/in_progress/completed/cancelled/overdue)
     - Assigned crew (if any)
     - SLA deadline with countdown timer
     - Created time
   - Filters: state, priority, terminal, crew
   - Sort by: SLA urgency, creation time
   - Time horizon: next 4-6 hours (configurable)

2. **Manual Assignment Controls** (Section 6.2.2)
   - Assign task to crew (dropdown/select)
   - Reassign task (change crew)
   - Unassign task (returns to unassigned pool)
   - Cancel task (with reason code dropdown)
   - Bulk actions (select multiple tasks)

3. **Conflict/Overload Indicators** (Section 6.2.3)
   - Highlight crew with overlapping tasks (time conflict)
   - Warning badge for crew with excessive queued tasks (>N threshold)
   - Validation warnings (e.g., unauthorized location)
   - Visual indicators in task list

4. **Task Detail Modal**
   - Full task information
   - Edit form for priority, SLA, notes
   - Assignment history
   - Related incidents/events

**Acceptance Criteria:**
- ✅ Task list displays all tasks with correct states
- ✅ Can filter and sort tasks
- ✅ Can assign/reassign/unassign tasks
- ✅ Conflict warnings appear correctly
- ✅ SLA countdown timers update in real-time
- ✅ Task detail modal shows complete information

**Estimated Time:** 4-5 days

---

## Phase 5: Crew & Shifts Tab

**Goal:** Manage crew availability, workload, and fairness.

**Deliverables:**

1. **Roster View** (Section 6.7.1)
   - Table/list of crew for current day
   - Columns: name, shift start/end, current status
   - Visual distinction: active vs upcoming shifts
   - Filter by shift time, status

2. **Break Management** (Section 6.7.2)
   - Display last break start/end time
   - Next break due time (calculated from policy)
   - Alert badges for:
     - Overdue for break
     - Active beyond threshold
   - Manual break start/end buttons (if authorized)

3. **Workload & Fairness Indicators** (Section 6.7.3)
   - Per-crew metrics:
     - Tasks this shift (count)
     - Emergency vs routine ratio
     - Walking distance (if available)
   - Fairness alerts:
     - "Crew A handling 70% of emergencies"
     - Workload distribution chart

4. **Availability Toggles** (Section 6.7.4)
   - Toggle crew member unavailable/available
   - Reason dropdown (sick, other duty, etc.)
   - Trigger rebalancing suggestion (link to Optimizer)

**Acceptance Criteria:**
- ✅ Roster shows all crew with correct shift times
- ✅ Break management displays accurate break status
- ✅ Workload metrics calculate correctly
- ✅ Fairness alerts trigger appropriately
- ✅ Can toggle crew availability
- ✅ Changes persist in state

**Estimated Time:** 3-4 days

---

## Phase 6: Incidents & Alerts Tab

**Goal:** Dedicated view for emergencies and unhappy events.

**Deliverables:**

1. **Real-time Alerts List** (Section 6.6.1)
   - Active incidents table:
     - Type, washroom, detected at, severity, assigned crew, SLA timer
   - Filter by: type, severity, terminal
   - Sort by: detection time, severity, SLA urgency
   - Color coding by severity
   - Quick assign action

2. **Incident History** (Section 6.6.2)
   - Historical incidents table
   - Filters: type, severity, washroom, time range
   - Columns:
     - Detection time, source, first response time, resolution time
     - Crew member(s) involved
     - Root cause (if captured)
   - Export to CSV

3. **Recurring Incident Detection** (Section 6.6.3)
   - Highlight washrooms with repeated incidents
   - Badge: "5 emergencies in last 48 hours"
   - Link to washroom detail view

4. **Escalation Rules Display** (Section 6.6.4)
   - Read-only list of escalation conditions
   - Example: "Emergency unresolved >10 min → Ops Manager"

**Acceptance Criteria:**
- ✅ Active alerts list updates in real-time
- ✅ Can filter and sort incidents
- ✅ Incident history shows complete records
- ✅ Recurring incidents are highlighted
- ✅ Escalation rules display correctly

**Estimated Time:** 3-4 days

---

## Phase 7: Performance & SLAs Tab

**Goal:** Analytics and reporting on system and crew performance.

**Deliverables:**

1. **Time Range Selection** (Section 6.5.1)
   - Presets: last 24 hours, 7 days, 30 days
   - Custom date range picker
   - Apply button

2. **Key Performance Indicators** (Section 6.5.2)
   - **Service Quality:**
     - Avg happy score (card with trend)
     - % time above 85 threshold (gauge chart)
     - Complaints per 1k passengers (if data available)
   - **Response & Headway:**
     - Emergency response time distribution (histogram)
     - Avg/p50/p90 headway per washroom type (bar chart)
     - % tasks completed within SLA (gauge)
   - **Crew Productivity:**
     - Avg idle time per shift (line chart)
     - Utilization % (bar chart per crew)
     - Tasks completed per crew (table)

3. **Filtering** (Section 6.5.3)
   - Filter by: terminal, zone, washroom type, time-of-day, crew member
   - Multi-select filters
   - Clear filters button

4. **Export** (Section 6.5.4)
   - Export to CSV button
   - Export to PDF button (optional, use library like jsPDF)
   - Include current filters in export

**Acceptance Criteria:**
- ✅ Time range selection works correctly
- ✅ All KPIs display with correct calculations
- ✅ Charts render properly (use Recharts or Chart.js)
- ✅ Filters apply correctly to all metrics
- ✅ Export generates valid CSV files
- ✅ Data updates when time range changes

**Estimated Time:** 5-6 days

---

## Phase 8: Demand & Flights Tab

**Goal:** Understand how flight schedules translate into cleaning demand.

**Deliverables:**

1. **Demand Forecast** (Section 6.4.1)
   - Time-series chart (next 6-12 hours)
   - X-axis: time
   - Y-axis: predicted cleaning demand
   - Multiple series: by terminal, concourse, or washroom type
   - Visual peaks highlighting
   - Tooltip with exact values

2. **Flight Schedule** (Section 6.4.2)
   - Timeline or list view of flights
   - Columns: gate, arrival/departure time, airline, status
   - Highlight changes:
     - Delays (yellow badge)
     - Cancellations (red badge)
     - Gate changes (orange badge)
   - Impact indicator: "Gate 134 delayed 90 min → reduced demand now, spike later"

3. **Risk Forecast** (Section 6.4.3)
   - Risk level matrix (area × time window)
   - Color coding: low (green), medium (yellow), high (red)
   - Tooltip: probability of headway breach, probability of happy score < 85
   - Heatmap visualization

**Acceptance Criteria:**
- ✅ Demand forecast chart displays correctly
- ✅ Flight schedule shows relevant flights
- ✅ Changes are highlighted appropriately
- ✅ Risk forecast heatmap renders
- ✅ Data loads from flight data files (when available)
- ✅ Can toggle between different views (demand/flights/risk)

**Estimated Time:** 4-5 days

---

## Phase 9: Optimizer ("Craptimizer") Tab

**Goal:** Sandbox for generating and applying optimized assignment plans.

**Deliverables:**

1. **Scenario-based Optimization** (Section 6.3.1)
   - Trigger button: "Run Optimization"
   - Time window selector (e.g., next 2 hours)
   - Loading state while optimizing
   - Display proposed assignments when complete

2. **Current vs Proposed Comparison** (Section 6.3.2)
   - Side-by-side or toggle view:
     - Left: Current assignments
     - Right: Proposed optimized assignments
   - Indicators for improvements:
     - Fewer overdue tasks (green badge)
     - Reduced walking distance (green badge)
     - Improved response times (green badge)
   - Diff view: highlight changes

3. **Parameter Controls** (Section 6.3.3)
   - Sliders/inputs for weights:
     - Minimize walking distance (0-100)
     - Minimize emergency response time (0-100)
     - Maximize headway SLA adherence (0-100)
   - Presets dropdown: "Peak mode", "Overnight mode", "Custom"
   - Save preset button

4. **Apply or Discard** (Section 6.3.4)
   - "Apply All" button (with confirmation dialog)
   - "Apply Selected" (checkbox selection)
   - "Discard" button
   - Success/error notifications

**Acceptance Criteria:**
- ✅ Can trigger optimization run
- ✅ Proposed plan displays correctly
- ✅ Comparison view shows differences
- ✅ Parameter controls affect optimization results
- ✅ Can apply or discard proposals
- ✅ Changes are logged (Activity Log integration)

**Estimated Time:** 5-6 days

---

## Phase 10: Locations & Config Tab

**Goal:** Configure washrooms, rules, and system behavior.

**Deliverables:**

1. **Washroom Catalog** (Section 6.8.1)
   - Table of all washrooms
   - Columns: ID, name, terminal, zone, type, status
   - Actions: Add, Edit, Deactivate
   - Search/filter by terminal, type, status

2. **Washroom Detail Form**
   - Edit form fields:
     - ID, name, terminal, zone
     - Type dropdown (standard/family/accessible/staff-only)
     - Status toggle (active/inactive)
     - Coordinates (x, y, z)
   - Save/Cancel buttons
   - Validation

3. **Poop Profile Configuration** (Section 6.8.3)
   - Per-washroom demand label dropdown
   - Options: "Peak mornings", "Constant high traffic", etc.
   - Optional: demand curve editor (time-series input)

4. **Rules & Thresholds** (Section 6.8.4)
   - SLA configuration:
     - Max headway (minutes)
     - Emergency response target (minutes)
   - Happy score thresholds:
     - Alert threshold (default: 85)
     - Task generation threshold
   - Per-washroom or per-group rules

5. **Versioning & Audit** (Section 6.8.5)
   - Display change history per washroom
   - Who changed, when, old vs new values
   - Link to Activity Log

**Acceptance Criteria:**
- ✅ Washroom catalog displays all washrooms
- ✅ Can add/edit/deactivate washrooms
- ✅ Poop profile can be configured
- ✅ Rules and thresholds can be set
- ✅ Changes are logged and auditable
- ✅ Form validation works correctly

**Estimated Time:** 4-5 days

---

## Phase 11: Activity Log Tab

**Goal:** Traceability of operational decisions and system changes.

**Deliverables:**

1. **Log Entry List** (Section 6.9)
   - Table of log entries
   - Columns: timestamp, user, action type, affected entity (washroom/crew), details
   - Pagination or virtual scrolling (for large datasets)

2. **Search & Filter** (Section 6.9 UI requirements)
   - Search by: user, action type, date range, washroom, crew
   - Filter dropdowns for each field
   - Clear filters button

3. **Log Entry Detail View**
   - Expandable row or modal
   - Full details:
     - Timestamp, user, action type
     - Before/after values (for config changes)
     - Related entities (tasks, crew, washrooms)
   - Copy to clipboard button

4. **Log Types**
   - Manual overrides (task reassignment, cancellation)
   - Optimization runs (timestamp, user, parameters, summary)
   - Configuration changes (SLA updates, washroom changes)

**Acceptance Criteria:**
- ✅ Log entries display correctly
- ✅ Can search and filter logs
- ✅ Detail view shows complete information
- ✅ All action types are logged
- ✅ Pagination works for large datasets

**Estimated Time:** 2-3 days

---

## Phase 12: Help & Playbook Tab

**Goal:** Reduce training friction with SOPs and guidance.

**Deliverables:**

1. **High-level Guidance** (Section 6.10.1)
   - Accordion or tabs with articles:
     - "How to use Live Ops"
     - "What to do when there is a mass delay"
     - "How to handle multiple simultaneous emergencies"
   - Markdown or rich text rendering

2. **SOP Library** (Section 6.10.2)
   - List of procedure documents
   - Searchable
   - Categories: Emergency Response, Routine Operations, Troubleshooting
   - PDF viewer or markdown renderer

3. **Glossary** (Section 6.10.3)
   - Definitions for:
     - Happy score
     - Headway
     - Emergency event
     - SLA
     - Optimizer/Craptimizer
   - Searchable list or accordion

4. **Optional: Embedded Training** (Section 6.10.4)
   - Links to videos (if available)
   - Placeholder for future guided onboarding

**Acceptance Criteria:**
- ✅ Guidance articles are readable
- ✅ SOP library is searchable
- ✅ Glossary displays all terms
- ✅ Content is well-formatted
- ✅ Links work correctly

**Estimated Time:** 2-3 days

---

## Phase 13: Real Data Integration

**Goal:** Replace mock data with real data sources from Section 8.

**Deliverables:**

1. **GTAA Flight & Gate Data** (Section 8.1)
   - Load `gates_washrooms.csv`
   - Parse coordinates (x, y, z)
   - Map washroom IDs consistently
   - Load `Pax info YYZ.xlsx` (use library like `xlsx`)

2. **Happy or Not Data** (Section 8.2)
   - Load `Happy or Not Combined Data 2024.csv`
   - Parse semicolon-delimited format
   - Filter spam/profanity/harmful flags
   - Aggregate to Happy Score time series (rolling windows)
   - Map kiosk locations to washroom IDs

3. **lighthouse.io Data** (Section 8.3)
   - Load Tasks, Audits, Issues, Events from Excel files
   - Parse quarterly snapshots
   - Map location keys to washroom IDs
   - Map personnel IDs to crew IDs
   - Transform to task/incident structures

4. **Simulation Data** (Section 8.4)
   - Load `multi_od_results_2024-01-01.json`
   - Parse bathroom summaries and passenger traces
   - Extract queue_times for visualization
   - Map bathroom IDs consistently

5. **Data Normalization**
   - Single source of truth for washroom IDs
   - ETL pipeline to standardize IDs across sources
   - Caching layer for performance
   - Error handling for missing/malformed data

**Acceptance Criteria:**
- ✅ All data sources load correctly
- ✅ Data is normalized and consistent
- ✅ ID mapping works across all sources
- ✅ Performance is acceptable (loading times < 3s)
- ✅ Error handling graceful for missing data
- ✅ Dashboard works with real data end-to-end

**Estimated Time:** 5-7 days

---

## Phase 14: Real-time Updates & WebSockets

**Goal:** Implement real-time data updates instead of polling.

**Deliverables:**

1. **WebSocket Integration**
   - WebSocket client setup
   - Connection management (reconnect on disconnect)
   - Message handling (task updates, crew status, incidents)

2. **Real-time Updates per Tab**
   - Live Ops: auto-update KPIs, incoming demand, crew status
   - Assignments: real-time task state changes
   - Incidents & Alerts: new incidents appear immediately
   - Crew & Shifts: status changes propagate

3. **Optimistic Updates**
   - Update UI immediately on user actions
   - Rollback on error
   - Conflict resolution

4. **Connection Status Indicator**
   - Show connection status in header
   - Fallback to polling if WebSocket unavailable
   - Retry logic

**Acceptance Criteria:**
- ✅ WebSocket connects successfully
- ✅ Real-time updates work for all tabs
- ✅ Connection status is visible
- ✅ Fallback to polling works
- ✅ Optimistic updates feel responsive

**Estimated Time:** 3-4 days

---

## Phase 15: Polish & Performance

**Goal:** Improve UX, performance, and error handling.

**Deliverables:**

1. **Performance Optimization**
   - Code splitting (lazy load tabs)
   - Memoization of expensive calculations
   - Virtual scrolling for large lists
   - Image optimization
   - Bundle size optimization

2. **Error Handling**
   - Comprehensive error boundaries
   - User-friendly error messages
   - Retry mechanisms
   - Offline mode detection

3. **Accessibility**
   - Keyboard navigation
   - Screen reader support (ARIA labels)
   - Color contrast compliance
   - Focus management

4. **UI/UX Polish**
   - Loading skeletons
   - Smooth transitions/animations
   - Tooltips and help text
   - Consistent spacing and typography
   - Mobile responsiveness improvements

5. **Testing**
   - Unit tests for utilities and hooks
   - Integration tests for critical flows
   - E2E tests for key workflows (using Playwright or Cypress)

**Acceptance Criteria:**
- ✅ Page load time < 2s
- ✅ Smooth interactions (60fps)
- ✅ Error handling covers edge cases
   - ✅ Accessibility audit passes (WCAG 2.1 AA)
- ✅ Mobile experience is usable
- ✅ Test coverage > 60% for critical paths

**Estimated Time:** 5-7 days

---

## Phase 16: Advanced Features (Optional)

**Goal:** Nice-to-have features for future phases.

**Deliverables:**

1. **Gantt Chart View** (Section 6.2 Optional)
   - Timeline view per crew
   - Task sequence visualization
   - Drag-and-drop rescheduling

2. **Advanced Map Features**
   - Interactive map (SVG or Leaflet/Mapbox)
   - Path visualization between washrooms
   - Heatmap overlay for demand

3. **Export Enhancements**
   - PDF report generation with charts
   - Scheduled reports
   - Email notifications

4. **User Preferences**
   - Customizable dashboard layout
   - Saved filter presets
   - Theme selection (light/dark)

5. **Analytics Dashboard**
   - Advanced charts and visualizations
   - Predictive analytics
   - Trend analysis

**Acceptance Criteria:**
- ✅ Each feature works independently
- ✅ Does not break existing functionality
- ✅ Performance remains acceptable

**Estimated Time:** 10-15 days (varies by feature)

---

## Summary Timeline

**Core MVP (Phases 0-12):** ~50-65 days
**Real Data Integration (Phase 13):** ~5-7 days
**Real-time & Polish (Phases 14-15):** ~8-11 days
**Total MVP:** ~63-83 days (~12-16 weeks)

**Advanced Features (Phase 16):** ~10-15 days (optional)

---

## Development Principles

1. **One phase at a time:** Complete each phase fully before moving to the next
2. **Test as you go:** Write tests for critical functionality in each phase
3. **Document decisions:** Keep a `DECISIONS.md` file for architectural choices
4. **Code reviews:** Review each phase before proceeding
5. **User feedback:** Get dispatcher feedback after Phase 3 (Live Ops) and Phase 4 (Assignments)
6. **Iterate:** Be prepared to refine earlier phases based on later learnings

---

## Risk Mitigation

1. **Data complexity:** Start with mock data, integrate real data gradually
2. **Performance:** Monitor bundle size and render performance early
3. **Real-time:** Use polling first, upgrade to WebSockets later
4. **Map complexity:** Start with simple SVG, enhance later
5. **Optimizer integration:** May need backend API; mock responses initially

---

## Next Steps

1. Review and approve this plan
2. Set up project repository and tooling (Phase 0)
3. Begin Phase 1 (Data Layer & Mock Data)
4. Schedule regular check-ins to review progress

