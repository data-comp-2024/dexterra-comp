# context.md – Pearson Washroom Cleaning Optimization Dashboard

## 1. Purpose of this document

This document defines the **product context and UX information architecture** for a dispatcher-facing dashboard used to optimize washroom cleaning operations at **Toronto Pearson Airport**.

The primary audience is **software engineers and designers**. The level of detail should be equivalent to what a **software engineer at Amazon** would expect when implementing or reviewing a feature:

- No ambiguous phrases like “make it simple” without examples.
- Explicit description of **inputs, outputs, states, edge cases, and constraints**.
- Clear separation of **must-have vs nice-to-have** for each area.
- Enough detail that an engineer unfamiliar with airports could implement the feature with minimal back-and-forth.

Any future edits to this document should keep that bar: **precision over fluff**.

---

## 2. Problem Statement

Pearson has a large number of washrooms spread across terminals, each experiencing demand driven by:

- Passenger traffic and flight schedules
- Time of day
- Special events and disruptions (flight delays, cancellations, weather, etc.)

Cleaning teams are dispatched to maintain hygiene and passenger satisfaction while:

- Minimizing emergency situations (e.g., overflowing toilets, unsanitary conditions).
- Meeting hygiene SLAs (e.g., maximum headway between cleanings).
- Managing crew constraints (shift hours, breaks, skills, walking distance).

The dashboard’s goal is to:

> Provide dispatchers with a **single control surface** to monitor washroom status, manage cleaning tasks, respond to emergencies, and adjust schedules based on real-time and forecasted demand, with clear performance and SLA visibility.

---

## 3. Primary User Persona

**Dispatcher (main user)**

- Monitors all washrooms in one or more terminals.
- Assigns and reassigns cleaning tasks to crews.
- Responds to emergencies or “unhappy” feedback events.
- Manages crew workload, breaks, and coverage.
- Reports performance to supervisors (on demand or at the end of shift/day).

Secondary personas (not primary for UI design but relevant):

- **Ops Manager / Supervisor**: cares about performance trends, SLAs, staffing adequacy.
- **System Admin / Config Owner**: sets up washroom metadata, SLAs, optimization parameters.

---

## 4. Core Concepts & Definitions

The following concepts should be treated as **shared domain language** across UI, API, and data models.

### 4.1 Washroom

- A physical location in an airport terminal where cleaning tasks occur.
- Has metadata:
  - Terminal, concourse, gate proximity.
  - Type: standard, family, accessible, staff-only, etc.
  - “Poop profile”: qualitative label describing typical demand pattern (e.g., “high traffic peak mornings”).
  - Configuration rules (e.g., minimum cleaning frequency, special supplies, restricted access).

### 4.2 Happy Score

- Numeric representation (e.g., 0–100) of passenger satisfaction for a washroom or area.
- Derived from:
  - Direct feedback (smiley face buttons, surveys).
  - Sensors/indirect metrics (odor sensors, door counts, consumables usage).
- **Threshold**:
  - “Less than happy” defined as **< 85**.
  - When happy score < 85 for a washroom, the system can:
    - Raise an **incident**.
    - Suggest or auto-generate a cleaning task.

### 4.3 Task

- A unit of work assigned to a crew member or team.
- Types:
  - Routine cleaning.
  - Emergency cleaning.
  - Inspection or quality check.
  - Consumable refill.
- States (at minimum):
  - `unassigned`, `assigned`, `in_progress`, `completed`, `cancelled`, `overdue`.
- Has attributes:
  - Associated washroom.
  - Created time.
  - Priority (e.g., normal, high, emergency).
  - SLA deadline (derived from rules).
  - Estimated duration.

### 4.4 Emergency Event

- A high-priority incident requiring immediate attention, e.g.:
  - Overflowing toilet.
  - Bodily fluids.
  - Slip hazard.
  - Odor threshold exceeded.
- Must be tracked with:
  - Detection timestamp.
  - Source (sensor, staff report, passenger report).
  - Response time (time from detection to first crew “in_progress” state).
  - Resolution time (time to `completed`).

### 4.5 Crew and Crew Status

- **Crew member**:
  - Identified by ID, name, role, skills, and shift information.
- **Status**:
  - At minimum: `off_shift`, `on_shift`, `on_break`, `available`, `busy`, `unavailable`.
- **Metrics**:
  - Current task + next task (if any).
  - Time since shift start.
  - Time since last break.
  - Cumulative walking distance (optional).
  - Idle time vs productive time per shift.

### 4.6 Headway

- Time between the end of one completed cleaning and the start of the next cleaning for a given washroom.
- SLA example: “No washroom should exceed 45 minutes of headway during peak hours.”
- System-level and washroom-level headway should be measurable and reportable.

---

## 5. High-level User Workflows (Dispatcher)

These workflows drive the tab design.

1. **Monitor Live Status**
   - See which washrooms are currently clean, dirty, or in emergency.
   - See which crew is where and what they’re doing.
   - See key KPIs in real time.

2. **Respond to Emergencies**
   - Receive alerts when incidents occur (e.g., happy score < 85, sensor alarm).
   - Quickly assign or reassign the nearest/most suitable crew.
   - Track response time and resolution status.

3. **Manage Assignments**
   - Review all upcoming and active tasks.
   - Run the optimizer (“Craptimizer”) to generate a more efficient plan.
   - Apply or reject optimizer recommendations.
   - Manually override assignments.

4. **Forecast & Adjust for Demand**
   - Understand upcoming demand peaks based on flight schedules and historical patterns.
   - Identify high-risk time windows or washrooms.
   - Adjust staffing and task planning proactively.

5. **Track Performance & SLAs**
   - For given date ranges (e.g., last shift, last 7 days).
   - View metrics like avg happy score, response times, headway, crew idle time.
   - Export data for reporting.

6. **Manage Crew & Shifts**
   - See whose shift is active, who is on break, who is due for a break.
   - Track fairness of workload distribution.
   - Mark crew unavailable and re-balance.

7. **Configure Locations & Rules**
   - Add / edit washrooms and their metadata.
   - Set SLAs and thresholds.
   - Adjust optimizer parameters.

8. **Audit & Post-mortem**
   - See a log of overrides, config changes, and major optimization decisions.
   - Reconstruct what happened during specific incidents.

---

## 6. Information Architecture: Tabs

Below is the proposed top-level tab structure, with requirements for each tab. Names are suggestions; actual UI labels can be finalized later.

**Tab list (high level):**

1. Live Ops  
2. Assignments  
3. Optimizer (“Craptimizer”)  
4. Demand & Flights  
5. Performance & SLAs  
6. Incidents & Alerts  
7. Crew & Shifts  
8. Locations & Config (“Poop Profile”)  
9. Activity Log  
10. Help & Playbook  

Each tab description below should be read as a **set of functional requirements**.

---

## 6.1 Live Ops

**Goal:** Single-screen operational view where dispatchers spend ~80% of their time.

**Must show:**

1. **Incoming demand panel**
   - Stream of new tasks and incidents:
     - Routine tasks triggered by rules.
     - Emergency events.
     - Manual requests (e.g., supervisor-created tasks).
   - Sortable by time, priority, location.
   - Quick actions:
     - Assign to crew.
     - Acknowledge.
     - Snooze/defer (if allowed by policy).

2. **Airport map with washroom status**
   - Visual map of terminals with washrooms as clickable nodes.
   - Status by color/icon (e.g., clean, due soon, overdue, emergency, closed).
   - Tooltip / side panel on click:
     - Last cleaned time.
     - Headway vs SLA.
     - Current happy score.
     - Active tasks for the washroom.

3. **Crew strip / roster overview**
   - Horizontal or vertical list of all on-shift crew.
   - For each crew member:
     - Name, current status (`available`, `busy`, `on_break`).
     - Current task (with location and ETA to completion).
     - Next task (if assigned).
     - Time since last break.
     - Shift start/end times.

4. **Mini KPI panel**
   - System-level real-time indicators:
     - Current avg happy score (system-wide or filtered).
     - Number of active emergencies.
     - Number of overdue tasks.
     - Avg response time to emergencies (rolling window, e.g., last 2 hours).
     - Avg headway vs SLA (recent period).

**Behavior requirements:**

- Auto-refresh at a defined interval (e.g., every 15–30 seconds) or via websockets.
- User-controllable filters:
  - By terminal, zone, or washroom type.
  - By crew group or shift.
- Should not require navigation away from this tab for common workflows:
  - Handling new tasks.
  - Viewing status of key washrooms.
  - Finding a crew to assign.

---

## 6.2 Assignments

**Goal:** Detailed task management and manual override capabilities.

**Must show:**

1. **Task list / board**
   - Tabular or board-style layout of:
     - All current and upcoming tasks within a time horizon (e.g., next 4–6 hours).
   - Columns/fields:
     - Task ID, type, washroom, priority.
     - State (unassigned, assigned, in_progress, completed, etc.).
     - Assigned crew (if any).
     - SLA deadline and countdown (e.g., time remaining).
   - Ability to:
     - Filter by state, priority, terminal, crew.
     - Sort by SLA urgency, creation time, etc.

2. **Manual assignment controls**
   - Assign a task to a crew member.
   - Reassign a task to a different crew member.
   - Unassign a task (returns to unassigned pool).
   - Cancel a task (with reason codes).

3. **Conflict/overload indicators**
   - Highlight crew with:
     - Overlapping tasks.
     - Excessive future load (e.g., more than N tasks queued).
   - Warnings when assigning tasks that violate rules (e.g., assigning a crew to a location they’re not authorized for).

**Optional (future phase):**

- Timeline/Gantt view per crew, showing sequence of tasks through the shift.

---

## 6.3 Optimizer (“Craptimizer”)

**Goal:** Provide a sandbox for generating, inspecting, and applying optimized assignment plans.

**Must support:**

1. **Scenario-based optimization**
   - User can trigger an optimization run:
     - For a specified time window (e.g., next 2 hours).
     - With current constraints (crew, SLAs, washroom states).
   - System generates:
     - Proposed assignments.
     - Proposed task ordering and routing per crew.

2. **Current vs proposed plan comparison**
   - Side-by-side or toggle between:
     - “Current assignments”.
     - “Proposed optimized assignments”.
   - Indicators for:
     - SLA improvements (e.g., fewer overdue tasks).
     - Reduced walking distance.
     - Improved emergency response times.

3. **Parameter controls**
   - Adjustable weights (with sensible defaults), e.g.:
     - Minimize total walking distance.
     - Minimize emergency response time.
     - Maximize adherence to headway SLAs.
   - Ability to save and reuse parameter presets (e.g., “Peak mode”, “Overnight mode”).

4. **Apply or discard**
   - User can:
     - Apply entire proposed plan (with confirmation).
     - Apply only selected parts (e.g., only reassign unassigned tasks).
     - Discard proposals.

**Requirements on auditability:**

- Each optimization run should be logged (see Activity Log) with:
  - Timestamp, user, parameters, and summary of changes applied.

---

## 6.4 Demand & Flights

**Goal:** Understand how flight schedules translate into cleaning demand and risk, to anticipate rather than react.

**Must show:**

1. **Demand forecast**
   - Time-series view (e.g., next 6–12 hours) of predicted cleaning demand:
     - By terminal, concourse, and/or washroom type.
   - Visual indications of demand peaks.

2. **Flight schedule and changes**
   - List or timeline of relevant flights:
     - Gate, arrival/departure time, airline.
   - Highlighted **changes**:
     - Delays, cancellations, gate changes.
   - Indication of how these changes impact cleaning demand:
     - E.g., “Gate 134 arrival delayed 90 min → reduced demand now, spike later.”

3. **Risk forecast**
   - Risk level (low/medium/high) per area/time window indicating:
     - Probability of headway breaches.
     - Probability of happy score dropping below 85.
   - Use color or simple icons to signal risk level.

---

## 6.5 Performance & SLAs

**Goal:** Provide analytics and reporting on system and crew performance.

**Must support:**

1. **Time range selection**
   - Common presets: last 24 hours, last 7 days, last 30 days.
   - Custom date range.

2. **Key performance indicators**
   - **Service quality:**
     - Avg happy score.
     - % of time washrooms were above the 85 happy threshold.
     - Number of complaints per 1k passengers (if data available).
   - **Response & headway:**
     - Distribution of emergency response times.
     - Avg and percentile (p50/p90) headway per washroom type or area.
     - % of tasks completed within SLA.
   - **Crew productivity:**
     - Avg idle time per shift.
     - Utilization % (time on tasks vs total shift time).
     - Tasks completed per crew member per shift.

3. **Filtering**
   - By terminal or zone.
   - By washroom type.
   - By time-of-day buckets (e.g., morning/afternoon/evening/night).
   - By crew member or crew group (for supervisors).

4. **Export**
   - Ability to export data or reports (CSV and/or PDF) for:
     - Supervisors.
     - Airport stakeholders.

---

## 6.6 Incidents & Alerts

**Goal:** Dedicated view for emergencies, unhappy events, and their handling.

**Must show:**

1. **Real-time alerts list**
   - All active incidents:
     - Emergency events (flooding, biohazards, etc.).
     - Washrooms with happy score < 85.
     - Sensor anomalies (e.g., repeated door openings with no cleaning).
   - Fields:
     - Type, washroom, detected at, severity, assigned crew, SLA timer.

2. **Incident history**
   - Historical view with filters:
     - By incident type, severity, washroom, time range.
   - For each incident:
     - Detection time.
     - Source (sensor/report).
     - First response time.
     - Resolution time.
     - Crew member(s) involved.
     - Root cause (if captured).

3. **Recurring incident detection**
   - Highlight washrooms or locations with repeated incidents:
     - E.g., “Washroom T1-134 had 5 emergencies in the last 48 hours.”

4. **Escalation rules (read-only in v1)**
   - Display which conditions trigger escalations (e.g., SMS or phone call to supervisor).
   - Example: “Any emergency unresolved for >10 minutes escalates to Ops Manager.”

---

## 6.7 Crew & Shifts

**Goal:** Manage crew availability, workload, and fairness.

**Must show:**

1. **Roster view**
   - For the current day:
     - Crew members.
     - Shift start/end.
     - Current status (`on_shift`, `off_shift`, `on_break`, etc.).
   - Indication of who is currently active vs upcoming.

2. **Break management**
   - Track:
     - Last break start and end.
     - Next break due time (based on policy).
   - Alerts if:
     - A crew member is overdue for break.
     - A member has been active continually beyond allowed thresholds.

3. **Workload and fairness indicators**
   - Per-crew metrics:
     - Number of tasks this shift.
     - Emergency vs routine task ratio.
     - Walking distance (if modeled).
   - Surface potential fairness issues:
     - E.g., “Crew A is handling 70% of emergencies this shift.”

4. **Availability toggles**
   - Ability to mark a crew member:
     - Temporarily unavailable (sick, pulled to another duty).
     - Back to available.
   - Trigger rebalancing suggestions (from Optimizer) when availability changes.

---

## 6.8 Locations & Config (“Poop Profile” / Config Input)

**Goal:** Configure washrooms, rules, and system behavior.

**Must support:**

1. **Washroom catalog**
   - List of all washrooms with:
     - ID, name/label, terminal, zone.
     - Type (standard, family, accessible, etc.).
     - Status (active, inactive).
   - Ability to:
     - Add new washroom.
     - Edit metadata.
     - Deactivate temporarily (e.g., under renovation).

2. **Map configuration**
   - Define location coordinates or map references.
   - Define walking paths / travel times between key points.
   - Define no-go zones or restricted areas.

3. **Poop profile configuration**
   - For each washroom:
     - Qualitative demand label (e.g., “Peak mornings”, “Constant high traffic”).
     - Optional parameters:
       - Typical demand curve by hour/day.
       - Special rules for events (e.g., near common meeting points).

4. **Rules & thresholds**
   - SLAs per washroom or washroom group:
     - Max headway.
     - Emergency response targets.
   - Happy score thresholds and associated actions:
     - At what score to generate an alert or a task.

5. **Versioning and audit**
   - Each change must be:
     - Attributed to a user.
     - Timestamped.
     - Logged with old vs new values (see Activity Log).

---

## 6.9 Activity Log

**Goal:** Ensure traceability of important operational decisions and system changes.

**Must log at minimum:**

1. **Manual overrides**
   - Task reassignment, cancellation, priority changes.
   - Who performed the action, when, and what changed.

2. **Optimization runs**
   - User, timestamp.
   - Parameters used.
   - High-level summary of changes approved (e.g., “Reassigned 10 tasks, changed 3 routes”).

3. **Configuration changes**
   - SLAs updated.
   - Washroom metadata changes (added, removed, deactivated).
   - Poop profile changes.
   - Map/path changes.

**UI requirements:**

- Search and filter by:
  - User, action type, date range, affected washroom or crew.
- Detail view for each log entry:
  - Provide enough detail to reconstruct what happened during an incident or shift.

---

## 6.10 Help & Playbook

**Goal:** Reduce training friction and provide standard operating procedures (SOPs).

**Should include:**

1. **High-level guidance**
   - “How to use Live Ops.”
   - “What to do when there is a mass delay.”
   - “How to handle multiple simultaneous emergencies.”

2. **SOP library**
   - Short, clear procedure documents:
     - Response to emergency event.
     - Protocol when a washroom is repeatedly unhappy (<85).
     - Handling crew shortages.

3. **Glossary**
   - Definitions for:
     - Happy score.
     - Headway.
     - Emergency event.
     - SLA.
     - Optimizer/Craptimizer.

4. **Optional: Embedded training**
   - Links to short videos or walkthroughs (if available).
   - Tooltips or guided onboarding (out of scope for v1, but keep in mind).

---

## 7. Expectations for Detail (Amazon-level)

When extending or refining this `context.md`, treat it with the same rigor expected of an **Amazon SDE design doc** or PR/FAQ:

- For each new feature:
  - Define **user**, **goal**, and **non-goals**.
  - Enumerate **states**, **inputs**, **outputs**, and **error cases**.
  - Provide **examples** of typical and edge-case scenarios.
- Avoid hand-wavy language like “smart”, “intuitive”, or “optimize” without specifying:
  - What metric we’re optimizing.
  - How success is measured.
- When adding new metrics or events:
  - Include precise definitions, units, and how they are derived.

The intent is that a new engineer joining the team can read this file and **understand exactly what needs to be built and why**, without having to reconstruct the domain from scratch.
