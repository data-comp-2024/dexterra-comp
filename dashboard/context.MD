Here’s an updated **`context.md`** with your data files integrated as a new, explicit “Data Inputs & File Layout” section. I’ve kept everything else intact and just appended Section 8.

---

# context.md – Pearson Washroom Cleaning Optimization Dashboard

## 1. Purpose of this document

This document defines the **product context and UX information architecture** for a dispatcher-facing dashboard used to optimize washroom cleaning operations at **Toronto Pearson Airport**.

The primary audience is **software engineers and designers**. The level of detail should be equivalent to what a **software engineer at Amazon** would expect when implementing or reviewing a feature:

* No ambiguous phrases like “make it simple” without examples.
* Explicit description of **inputs, outputs, states, edge cases, and constraints**.
* Clear separation of **must-have vs nice-to-have** for each area.
* Enough detail that an engineer unfamiliar with airports could implement the feature with minimal back-and-forth.

Any future edits to this document should keep that bar: **precision over fluff**.

---

## 2. Problem Statement

Pearson has a large number of washrooms spread across terminals, each experiencing demand driven by:

* Passenger traffic and flight schedules
* Time of day
* Special events and disruptions (flight delays, cancellations, weather, etc.)

Cleaning teams are dispatched to maintain hygiene and passenger satisfaction while:

* Minimizing emergency situations (e.g., overflowing toilets, unsanitary conditions).
* Meeting hygiene SLAs (e.g., maximum headway between cleanings).
* Managing crew constraints (shift hours, breaks, skills, walking distance).

The dashboard’s goal is to:

> Provide dispatchers with a **single control surface** to monitor washroom status, manage cleaning tasks, respond to emergencies, and adjust schedules based on real-time and forecasted demand, with clear performance and SLA visibility.

---

## 3. Primary User Persona

**Dispatcher (main user)**

* Monitors all washrooms in one or more terminals.
* Assigns and reassigns cleaning tasks to crews.
* Responds to emergencies or “unhappy” feedback events.
* Manages crew workload, breaks, and coverage.
* Reports performance to supervisors (on demand or at the end of shift/day).

Secondary personas (not primary for UI design but relevant):

* **Ops Manager / Supervisor**: cares about performance trends, SLAs, staffing adequacy.
* **System Admin / Config Owner**: sets up washroom metadata, SLAs, optimization parameters.

---

## 4. Core Concepts & Definitions

The following concepts should be treated as **shared domain language** across UI, API, and data models.

### 4.1 Washroom

* A physical location in an airport terminal where cleaning tasks occur.
* Has metadata:

  * Terminal, concourse, gate proximity.
  * Type: standard, family, accessible, staff-only, etc.
  * “Poop profile”: qualitative label describing typical demand pattern (e.g., “high traffic peak mornings”).
  * Configuration rules (e.g., minimum cleaning frequency, special supplies, restricted access).

### 4.2 Happy Score

* Numeric representation (e.g., 0–100) of passenger satisfaction for a washroom or area.
* Derived from:

  * Direct feedback (smiley face buttons, surveys).
  * Sensors/indirect metrics (odor sensors, door counts, consumables usage).
* **Threshold**:

  * “Less than happy” defined as **< 85**.
  * When happy score < 85 for a washroom, the system can:

    * Raise an **incident**.
    * Suggest or auto-generate a cleaning task.

### 4.3 Task

* A unit of work assigned to a crew member or team.
* Types:

  * Routine cleaning.
  * Emergency cleaning.
  * Inspection or quality check.
  * Consumable refill.
* States (at minimum):

  * `unassigned`, `assigned`, `in_progress`, `completed`, `cancelled`, `overdue`.
* Has attributes:

  * Associated washroom.
  * Created time.
  * Priority (e.g., normal, high, emergency).
  * SLA deadline (derived from rules).
  * Estimated duration.

### 4.4 Emergency Event

* A high-priority incident requiring immediate attention, e.g.:

  * Overflowing toilet.
  * Bodily fluids.
  * Slip hazard.
  * Odor threshold exceeded.
* Must be tracked with:

  * Detection timestamp.
  * Source (sensor, staff report, passenger report).
  * Response time (time from detection to first crew “in_progress” state).
  * Resolution time (time to `completed`).

### 4.5 Crew and Crew Status

* **Crew member**:

  * Identified by ID, name, role, skills, and shift information.
* **Status**:

  * At minimum: `off_shift`, `on_shift`, `on_break`, `available`, `busy`, `unavailable`.
* **Metrics**:

  * Current task + next task (if any).
  * Time since shift start.
  * Time since last break.
  * Cumulative walking distance (optional).
  * Idle time vs productive time per shift.

### 4.6 Headway

* Time between the end of one completed cleaning and the start of the next cleaning for a given washroom.
* SLA example: “No washroom should exceed 45 minutes of headway during peak hours.”
* System-level and washroom-level headway should be measurable and reportable.

---

## 5. High-level User Workflows (Dispatcher)

These workflows drive the tab design.

1. **Monitor Live Status**

   * See which washrooms are currently clean, dirty, or in emergency.
   * See which crew is where and what they’re doing.
   * See key KPIs in real time.

2. **Respond to Emergencies**

   * Receive alerts when incidents occur (e.g., happy score < 85, sensor alarm).
   * Quickly assign or reassign the nearest/most suitable crew.
   * Track response time and resolution status.

3. **Manage Assignments**

   * Review all upcoming and active tasks.
   * Run the optimizer (“Craptimizer”) to generate a more efficient plan.
   * Apply or reject optimizer recommendations.
   * Manually override assignments.

4. **Forecast & Adjust for Demand**

   * Understand upcoming demand peaks based on flight schedules and historical patterns.
   * Identify high-risk time windows or washrooms.
   * Adjust staffing and task planning proactively.

5. **Track Performance & SLAs**

   * For given date ranges (e.g., last shift, last 7 days).
   * View metrics like avg happy score, response times, headway, crew idle time.
   * Export data for reporting.

6. **Manage Crew & Shifts**

   * See whose shift is active, who is on break, who is due for a break.
   * Track fairness of workload distribution.
   * Mark crew unavailable and re-balance.

7. **Configure Locations & Rules**

   * Add / edit washrooms and their metadata.
   * Set SLAs and thresholds.
   * Adjust optimizer parameters.

8. **Audit & Post-mortem**

   * See a log of overrides, config changes, and major optimization decisions.
   * Reconstruct what happened during specific incidents.

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

   * Stream of new tasks and incidents:

     * Routine tasks triggered by rules.
     * Emergency events.
     * Manual requests (e.g., supervisor-created tasks).
   * Sortable by time, priority, location.
   * Quick actions:

     * Assign to crew.
     * Acknowledge.
     * Snooze/defer (if allowed by policy).

2. **Airport map with washroom status**

   * Visual map of terminals with washrooms as clickable nodes.
   * Status by color/icon (e.g., clean, due soon, overdue, emergency, closed).
   * Tooltip / side panel on click:

     * Last cleaned time.
     * Headway vs SLA.
     * Current happy score.
     * Active tasks for the washroom.

3. **Crew strip / roster overview**

   * Horizontal or vertical list of all on-shift crew.
   * For each crew member:

     * Name, current status (`available`, `busy`, `on_break`).
     * Current task (with location and ETA to completion).
     * Next task (if assigned).
     * Time since last break.
     * Shift start/end times.

4. **Mini KPI panel**

   * System-level real-time indicators:

     * Current avg happy score (system-wide or filtered).
     * Number of active emergencies.
     * Number of overdue tasks.
     * Avg response time to emergencies (rolling window, e.g., last 2 hours).
     * Avg headway vs SLA (recent period).

**Behavior requirements:**

* Auto-refresh at a defined interval (e.g., every 15–30 seconds) or via websockets.
* User-controllable filters:

  * By terminal, zone, or washroom type.
  * By crew group or shift.
* Should not require navigation away from this tab for common workflows:

  * Handling new tasks.
  * Viewing status of key washrooms.
  * Finding a crew to assign.

---

## 6.2 Assignments

**Goal:** Detailed task management and manual override capabilities.

**Must show:**

1. **Task list / board**

   * Tabular or board-style layout of:

     * All current and upcoming tasks within a time horizon (e.g., next 4–6 hours).
   * Columns/fields:

     * Task ID, type, washroom, priority.
     * State (unassigned, assigned, in_progress, completed, etc.).
     * Assigned crew (if any).
     * SLA deadline and countdown (e.g., time remaining).
   * Ability to:

     * Filter by state, priority, terminal, crew.
     * Sort by SLA urgency, creation time, etc.

2. **Manual assignment controls**

   * Assign a task to a crew member.
   * Reassign a task to a different crew member.
   * Unassign a task (returns to unassigned pool).
   * Cancel a task (with reason codes).

3. **Conflict/overload indicators**

   * Highlight crew with:

     * Overlapping tasks.
     * Excessive future load (e.g., more than N tasks queued).
   * Warnings when assigning tasks that violate rules (e.g., assigning a crew to a location they’re not authorized for).

**Optional (future phase):**

* Timeline/Gantt view per crew, showing sequence of tasks through the shift.

---

## 6.3 Optimizer (“Craptimizer”)

**Goal:** Provide a sandbox for generating, inspecting, and applying optimized assignment plans.

**Must support:**

1. **Scenario-based optimization**

   * User can trigger an optimization run:

     * For a specified time window (e.g., next 2 hours).
     * With current constraints (crew, SLAs, washroom states).
   * System generates:

     * Proposed assignments.
     * Proposed task ordering and routing per crew.

2. **Current vs proposed plan comparison**

   * Side-by-side or toggle between:

     * “Current assignments”.
     * “Proposed optimized assignments”.
   * Indicators for:

     * SLA improvements (e.g., fewer overdue tasks).
     * Reduced walking distance.
     * Improved emergency response times.

3. **Parameter controls**

   * Adjustable weights (with sensible defaults), e.g.:

     * Minimize total walking distance.
     * Minimize emergency response time.
     * Maximize adherence to headway SLAs.
   * Ability to save and reuse parameter presets (e.g., “Peak mode”, “Overnight mode”).

4. **Apply or discard**

   * User can:

     * Apply entire proposed plan (with confirmation).
     * Apply only selected parts (e.g., only reassign unassigned tasks).
     * Discard proposals.

**Requirements on auditability:**

* Each optimization run should be logged (see Activity Log) with:

  * Timestamp, user, parameters, and summary of changes applied.

---

## 6.4 Demand & Flights

**Goal:** Understand how flight schedules translate into cleaning demand and risk, to anticipate rather than react.

**Must show:**

1. **Demand forecast**

   * Time-series view (e.g., next 6–12 hours) of predicted cleaning demand:

     * By terminal, concourse, and/or washroom type.
   * Visual indications of demand peaks.

2. **Flight schedule and changes**

   * List or timeline of relevant flights:

     * Gate, arrival/departure time, airline.
   * Highlighted **changes**:

     * Delays, cancellations, gate changes.
   * Indication of how these changes impact cleaning demand:

     * E.g., “Gate 134 arrival delayed 90 min → reduced demand now, spike later.”

3. **Risk forecast**

   * Risk level (low/medium/high) per area/time window indicating:

     * Probability of headway breaches.
     * Probability of happy score dropping below 85.
   * Use color or simple icons to signal risk level.

---

## 6.5 Performance & SLAs

**Goal:** Provide analytics and reporting on system and crew performance.

**Must support:**

1. **Time range selection**

   * Common presets: last 24 hours, last 7 days, last 30 days.
   * Custom date range.

2. **Key performance indicators**

   * **Service quality:**

     * Avg happy score.
     * % of time washrooms were above the 85 happy threshold.
     * Number of complaints per 1k passengers (if data available).
   * **Response & headway:**

     * Distribution of emergency response times.
     * Avg and percentile (p50/p90) headway per washroom type or area.
     * % of tasks completed within SLA.
   * **Crew productivity:**

     * Avg idle time per shift.
     * Utilization % (time on tasks vs total shift time).
     * Tasks completed per crew member per shift.

3. **Filtering**

   * By terminal or zone.
   * By washroom type.
   * By time-of-day buckets (e.g., morning/afternoon/evening/night).
   * By crew member or crew group (for supervisors).

4. **Export**

   * Ability to export data or reports (CSV and/or PDF) for:

     * Supervisors.
     * Airport stakeholders.

---

## 6.6 Incidents & Alerts

**Goal:** Dedicated view for emergencies, unhappy events, and their handling.

**Must show:**

1. **Real-time alerts list**

   * All active incidents:

     * Emergency events (flooding, biohazards, etc.).
     * Washrooms with happy score < 85.
     * Sensor anomalies (e.g., repeated door openings with no cleaning).
   * Fields:

     * Type, washroom, detected at, severity, assigned crew, SLA timer.

2. **Incident history**

   * Historical view with filters:

     * By incident type, severity, washroom, time range.
   * For each incident:

     * Detection time.
     * Source (sensor/report).
     * First response time.
     * Resolution time.
     * Crew member(s) involved.
     * Root cause (if captured).

3. **Recurring incident detection**

   * Highlight washrooms or locations with repeated incidents:

     * E.g., “Washroom T1-134 had 5 emergencies in the last 48 hours.”

4. **Escalation rules (read-only in v1)**

   * Display which conditions trigger escalations (e.g., SMS or phone call to supervisor).
   * Example: “Any emergency unresolved for >10 minutes escalates to Ops Manager.”

---

## 6.7 Crew & Shifts

**Goal:** Manage crew availability, workload, and fairness.

**Must show:**

1. **Roster view**

   * For the current day:

     * Crew members.
     * Shift start/end.
     * Current status (`on_shift`, `off_shift`, `on_break`, etc.).
   * Indication of who is currently active vs upcoming.

2. **Break management**

   * Track:

     * Last break start and end.
     * Next break due time (based on policy).
   * Alerts if:

     * A crew member is overdue for break.
     * A member has been active continually beyond allowed thresholds.

3. **Workload and fairness indicators**

   * Per-crew metrics:

     * Number of tasks this shift.
     * Emergency vs routine task ratio.
     * Walking distance (if modeled).
   * Surface potential fairness issues:

     * E.g., “Crew A is handling 70% of emergencies this shift.”

4. **Availability toggles**

   * Ability to mark a crew member:

     * Temporarily unavailable (sick, pulled to another duty).
     * Back to available.
   * Trigger rebalancing suggestions (from Optimizer) when availability changes.

---

## 6.8 Locations & Config (“Poop Profile” / Config Input)

**Goal:** Configure washrooms, rules, and system behavior.

**Must support:**

1. **Washroom catalog**

   * List of all washrooms with:

     * ID, name/label, terminal, zone.
     * Type (standard, family, accessible, etc.).
     * Status (active, inactive).
   * Ability to:

     * Add new washroom.
     * Edit metadata.
     * Deactivate temporarily (e.g., under renovation).

2. **Map configuration**

   * Define location coordinates or map references.
   * Define walking paths / travel times between key points.
   * Define no-go zones or restricted areas.

3. **Poop profile configuration**

   * For each washroom:

     * Qualitative demand label (e.g., “Peak mornings”, “Constant high traffic”).
     * Optional parameters:

       * Typical demand curve by hour/day.
       * Special rules for events (e.g., near common meeting points).

4. **Rules & thresholds**

   * SLAs per washroom or washroom group:

     * Max headway.
     * Emergency response targets.
   * Happy score thresholds and associated actions:

     * At what score to generate an alert or a task.

5. **Versioning and audit**

   * Each change must be:

     * Attributed to a user.
     * Timestamped.
     * Logged with old vs new values (see Activity Log).

---

## 6.9 Activity Log

**Goal:** Ensure traceability of important operational decisions and system changes.

**Must log at minimum:**

1. **Manual overrides**

   * Task reassignment, cancellation, priority changes.
   * Who performed the action, when, and what changed.

2. **Optimization runs**

   * User, timestamp.
   * Parameters used.
   * High-level summary of changes approved (e.g., “Reassigned 10 tasks, changed 3 routes”).

3. **Configuration changes**

   * SLAs updated.
   * Washroom metadata changes (added, removed, deactivated).
   * Poop profile changes.
   * Map/path changes.

**UI requirements:**

* Search and filter by:

  * User, action type, date range, affected washroom or crew.
* Detail view for each log entry:

  * Provide enough detail to reconstruct what happened during an incident or shift.

---

## 6.10 Help & Playbook

**Goal:** Reduce training friction and provide standard operating procedures (SOPs).

**Should include:**

1. **High-level guidance**

   * “How to use Live Ops.”
   * “What to do when there is a mass delay.”
   * “How to handle multiple simultaneous emergencies.”

2. **SOP library**

   * Short, clear procedure documents:

     * Response to emergency event.
     * Protocol when a washroom is repeatedly unhappy (<85).
     * Handling crew shortages.

3. **Glossary**

   * Definitions for:

     * Happy score.
     * Headway.
     * Emergency event.
     * SLA.
     * Optimizer/Craptimizer.

4. **Optional: Embedded training**

   * Links to short videos or walkthroughs (if available).
   * Tooltips or guided onboarding (out of scope for v1, but keep in mind).

---

## 7. Expectations for Detail (Amazon-level)

When extending or refining this `context.md`, treat it with the same rigor expected of an **Amazon SDE design doc** or PR/FAQ:

* For each new feature:

  * Define **user**, **goal**, and **non-goals**.
  * Enumerate **states**, **inputs**, **outputs**, and **error cases**.
  * Provide **examples** of typical and edge-case scenarios.
* Avoid hand-wavy language like “smart”, “intuitive”, or “optimize” without specifying:

  * What metric we’re optimizing.
  * How success is measured.
* When adding new metrics or events:

  * Include precise definitions, units, and how they are derived.

The intent is that a new engineer joining the team can read this file and **understand exactly what needs to be built and why**, without having to reconstruct the domain from scratch.

---

## 8. Data Inputs & File Layout

This section documents the **concrete datasets** backing the dashboard, how they relate to the domain concepts in Section 4, and where engineers should expect to read them from.

> **Convention:** In code, treat the root data directory as a configurable environment variable (e.g., `DATA_ROOT`).
> Example local layout:
> `DATA_ROOT/GTAA flights arrival departure data 2024/...`
> `DATA_ROOT/Happy or Not 2024/...`
> `DATA_ROOT/lighthouse.io/...`
> `DATA_ROOT/multi_od_results_2024-01-01.json`

Unless otherwise noted, **2024** is the reference year for the prototype.

---

### 8.1 GTAA Flight & Gate Data (2024)

**Purpose:** Provide the **structural link** between flights, passenger volumes, and physical locations (gates / washrooms) so the dashboard can map demand to specific washrooms and time windows.

**Location (relative):**

* `DATA_ROOT/GTAA flights arrival departure data 2024/`

**Files:**

#### 8.1.1 `gates_washrooms.csv`

* **Format:** CSV; one row per gate or washroom location.
* **Key columns (as provided):**

  * `name`: string, unique identifier for a gate or washroom (e.g., `T1-134-MEN`, `FE2097`).
  * `x`, `y`, `z`: numeric coordinates (3D) used for spatial mapping / distance calculations.
* **Primary keys & joins:**

  * `name` is the **canonical key** for:

    * Joining to washroom metadata (Section 6.8).
    * Joining to simulation output (`bathrooms` keys and `origin`/`destination` labels in `multi_od_results_2024-01-01.json`).
    * Mapping Happy-or-Not kiosks and lighthouse.io events to precise locations once they are tagged with consistent IDs.
* **Used by:**

  * **Live Ops map:** to position washrooms on the terminal map.
  * **Optimizer (“Craptimizer”):** to estimate walking distances / travel times between locations.
  * **Demand & Flights:** to spatially align gates with nearby washrooms for demand forecasting.

#### 8.1.2 `Pax info YYZ.xlsx`

* **Format:** Excel workbook; aggregated passenger metrics for GTAA.
* **Content (conceptual):**

  * Passenger counts (arrivals, departures, transfers).
  * Temporal resolution (e.g., by hour/day) aligned with flight schedules.
  * Mappings from gates/zones to passenger volumes.
* **Primary keys & joins:**

  * Gate or zone identifiers that can be linked to `gates_washrooms.csv` via `name` or a derived mapping (e.g., “Gate 134 → nearby washrooms T1-134-MEN / T1-134-WOMEN”).
* **Used by:**

  * **Demand & Flights** tab, to convert flight schedules into:

    * Predicted **cleaning demand curves** by terminal/zone.
    * Risk levels for potential headway/Happy Score breaches.
  * **Performance & SLAs**, to normalize metrics like:

    * Complaints per 1k passengers.
    * Cleanings per 1k passengers.

---

### 8.2 Happy or Not (Passenger Satisfaction) Data – 2024

**Purpose:** Provide the **ground truth for Happy Score** derived from passenger feedback kiosks placed near washrooms and gates.

**Location (relative):**

* `DATA_ROOT/Happy or Not 2024/`

**Files:**

#### 8.2.1 `Happy or Not Combined Data 2024.csv`

* **Format:** Semicolon-delimited CSV (`;`).
* **Granularity:** One row per **feedback event** (button press).
* **Key fields (as provided):**

  * **Time:**

    * UTC timestamp.
    * Local timestamp (YYZ time).
  * **Location:**

    * `path`: hierarchical string describing terminal, zone, and physical location.
    * `group` / experiment (`exp.`) identifiers for grouping kiosks.
  * **Device/UI metadata:**

    * `response_ui` (which UI was shown).
    * `feedback_scale` (e.g., 4-button scale).
  * **Sentiment:**

    * `response` (coded sentiment, e.g., 1–4 from “very unhappy” to “very happy”).
  * **QA flags:**

    * `spam`, `profanity`, `harmful`, etc., used to filter out invalid events.
* **Derived structures (expected in our pipeline):**

  * **Happy Score time series** per washroom or washroom group:

    * Aggregated over rolling windows (e.g., 15 min, 60 min).
    * Converted to 0–100 scale, with the **<85** threshold as defined in Section 4.2.
* **Primary keys & joins:**

  * Location fields (`path`, `group`, and kiosk ID derived from file name/device metadata) must be mapped to **washroom IDs** consistent with:

    * `gates_washrooms.csv.name`.
    * Washroom catalog in the **Locations & Config** tab.
* **Used by:**

  * **Live Ops:**

    * Real-time Happy Score and alerts when a washroom drops below 85.
  * **Incidents & Alerts:**

    * Triggers for “unhappy events” (Happy Score < 85).
    * Incident history based on aggregated unhappy streaks.
  * **Performance & SLAs:**

    * Avg Happy Score per washroom/zone/time-of-day.
    * % of time washrooms stayed above threshold.
    * Complaints/unhappy events per passenger.

#### 8.2.2 Individual kiosk exports – `*.xls`

* **Format:** Excel workbooks; typically one file per **terminal-zone demographic combination**.
* **File naming convention examples:**

  * `T1 - DEP - LVL 2 - Post Security - Women - Gate 137 - EF2011.xls`
* **Semantics encoded in filename:**

  * Terminal (e.g., `T1`).
  * Flow (`ARR`/`DEP`).
  * Level (e.g., `LVL 2`).
  * Security status (`Pre Security` / `Post Security`).
  * Demographic segment (e.g., `Women`).
  * Physical location (e.g., `Gate 137`).
  * Kiosk ID (e.g., `EF2011`).
* **Role in system:**

  * **Not required** for normal runtime operations once `Happy or Not Combined Data 2024.csv` exists.
  * Used for:

    * Backfilling / rebuilding the combined CSV.
    * Data validation and debugging of particular kiosks or zones.
    * More granular demographic analysis in offline analytics.

---

### 8.3 lighthouse.io Operational Data – 2024

**Purpose:** Provide **operational ground truth** for **tasks, audits, issues, and events** logged by staff, used to calibrate and evaluate the Craptimizer and crew behavior.

**Location (relative):**

* `DATA_ROOT/lighthouse.io/`

  * `Audit 2024/`
  * `Events 2024/`
  * `Issue 2024/`
  * `Tasks 2024/`

Each subfolder contains four **quarterly** Excel snapshots (e.g., `Supervisor Audits Data Apr to Jun 2024.xlsx`, `Bluetooth Beacon Data Jan 2024.xlsx`).

**Common patterns:**

* **Granularity:** One row per **recorded entity**:

  * Audit → supervisor inspection.
  * Event → beacon or sensor event.
  * Issue → reported problem.
  * Task → operational cleaning or maintenance task.
* **Common fields (conceptual; exact names may differ):**

  * Timestamp (creation / detection / completion).
  * Location (washroom ID, zone, or beacon ID).
  * Responsible staff / crew member.
  * Status or outcome (e.g., pass/fail, resolved/unresolved).
  * Severity / priority where applicable.

**Subfolders & usage:**

#### 8.3.1 `Audit 2024/`

* **Content:** Supervisor audits and quality checks.
* **Used by:**

  * **Performance & SLAs:**

    * Audit frequency and outcomes per washroom.
    * Correlation between frequent audits and higher Happy Scores.
  * **Incidents & Alerts:**

    * Post-incident audits to confirm resolution quality.

#### 8.3.2 `Events 2024/`

* **Content:** Beacon/sensor-level events (e.g., BLE beacons detecting staff presence).
* **Used by:**

  * **Crew & Shifts:**

    * Actual on-site presence at washrooms.
    * Estimation of walking paths and real travel time.
  * **Optimizer calibration:**

    * Calibrating walking speed and route assumptions.

#### 8.3.3 `Issue 2024/`

* **Content:** Logged problems (e.g., complaints, equipment malfunction, hazards).
* **Used by:**

  * **Incidents & Alerts:**

    * Historical incident dataset (type, severity, resolution time).
  * **Activity Log / Post-mortem:**

    * Joining issues with tasks and audits to reconstruct what happened.

#### 8.3.4 `Tasks 2024/`

* **Content:** Operational tasks recorded in lighthouse.io (cleanings, refills, etc.).
* **Used by:**

  * **Assignments:** Historical task volumes and patterns by washroom/time-of-day.
  * **Crew & Shifts:** Actual workload per crew member.
  * **Performance & SLAs:**

    * Empirical headway (time between completed tasks for each washroom).
    * % of tasks completed within SLA (based on timestamps and SLA rules configured in the app).

**Primary keys & joins (for lighthouse.io):**

* Location keys (washroom IDs, beacon IDs, or textual locations) must be mapped to:

  * The washroom catalog in **Locations & Config**.
  * Gate/washroom coordinates in `gates_washrooms.csv`.
* Personnel identifiers must be mapped to:

  * Crew IDs in **Crew & Shifts**.

---

### 8.4 Simulated Demand Output – `multi_od_results_2024-01-01.json`

**Purpose:** Provide **high-resolution simulation output** of washroom demand and queueing behavior for a specific service date, used to:

* Prototype and benchmark the Craptimizer.
* Provide scenario-based demand patterns when live data is incomplete.
* Show **what-if overlays** in Demand & Flights and Live Ops.

**Location (relative):**

* `DATA_ROOT/multi_od_results_2024-01-01.json`

**Top-level structure:**

* Root object with:

  * `metadata`
  * `bathrooms`

#### 8.4.1 `metadata`

* Fields (as provided):

  * `date`: simulated **service date** (e.g., `"2024-01-01"`).
  * `export_timestamp`: when this JSON was generated.
  * `num_bathrooms`: number of modeled washrooms.
* **Usage:**

  * Ensures the frontend and backend know which **simulation date** is being visualized.
  * Allows versioning and audit of which simulation snapshot was used for analysis.

#### 8.4.2 `bathrooms`

* **Type:** Dictionary keyed by **bathroom/washroom ID**, e.g., `"FE2097"`.

  * Each key corresponds to a washroom mapped in:

    * `gates_washrooms.csv.name`.
    * Washroom catalog in **Locations & Config**.
* **Per-bathroom structure:**

  * `summary`:

    * Aggregate metrics over the simulation horizon:

      * `total_users`
      * `avg_wait_minutes`
      * `max_wait_minutes`
      * `avg_service_minutes`
      * `max_service_minutes` (if present)
      * `max_queue_length`
    * **Used by:**

      * **Performance & SLAs** (simulation mode) for queueing KPIs.
      * Calibration of headway rules and cleaning frequencies in **Locations & Config**.
  * `passengers`:

    * Array of per-user traces with:

      * Timestamps:

        * `entry_time`
        * `arrival_bath_time`
        * `start_service`
        * `finish_service`
      * Performance metrics:

        * `wait_minutes`
        * `service_minutes`
      * Demographics:

        * `is_male` (and potentially other attributes as the model evolves).
      * OD labels:

        * `origin`: gate/washroom ID where the passenger journey segment starts.
        * `destination`: gate/washroom ID of the modeled bathroom.
    * **Used by:**

      * **Demand & Flights:**

        * Deriving temporal demand curves per washroom.
        * Understanding flows from gates to specific washrooms.
      * **Optimizer (“Craptimizer”):**

        * Building demand-driven cleaning schedules (e.g., scheduling cleaning between bursts).
  * `queue_times`:

    * Array of regularly sampled queue snapshots:

      * Each entry has:

        * `time`
        * `queue_length`
    * **Used by:**

      * **Live Ops (simulation overlays):**

        * Displaying expected vs actual queue lengths.
      * **Demand & Flights:**

        * Identifying high-risk periods where queues are likely to exceed thresholds.

**Primary keys & joins:**

* Bathroom IDs (e.g., `FE2097`) must match:

  * `gates_washrooms.csv.name`.
  * Washroom IDs in **Locations & Config**.
* `origin` and `destination` IDs may correspond to:

  * Gates.
  * Other washrooms.
* All must map through the **same location namespace** (single source-of-truth for IDs).

**Runtime usage patterns:**

* In production, the simulation file is expected to be:

  * Loaded by backend services for:

    * Demand forecasting.
    * Queue length predictions.
  * Exposed via API endpoints consumed by:

    * **Demand & Flights** (time series).
    * **Live Ops** (expected demand overlays).
    * **Optimizer** (objective weighting based on predicted demand/wait).

---

If you’d like, next step I can:

* Add a short “Data dependencies per tab” matrix (tab vs datasets used), or
* Sketch how the ETL pipeline should standardize IDs across `gates_washrooms`, Happy or Not, lighthouse, and `multi_od_results`.
