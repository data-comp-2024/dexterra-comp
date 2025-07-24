# Algorithm Description for Airport Cleaning Crew Optimization System

This algorithm implements a cleaning crew optimization system that dynamically assigns cleaning personnel to airport restrooms based on real-time demand profiles, emergency call-ins, and multi-objective optimization criteria (cost, response time, passenger satisfaction, and operational disruption).

---

## Inputs
- **Bathroom Usage Data**: Time-series demand profiles λ_r(t), queue lengths L_r(t), and waiting times w_r(t) from restroom simulation.
- **Crew Configuration**: Crew members with attributes (name, shift_start, shift_end, skill_level, hourly_rate, base_location, emergency_capability).
- **Restroom Layout**: Restroom coordinates, floor assignments, capacities, and traffic classifications (high/medium/low).
- **Cleaning Parameters**: Task durations by type (routine, emergency, call_in, deep_clean, usage_based), cleaning intervals by traffic level.
- **Cost Parameters**: Overtime multiplier, travel cost per minute, disruption cost multiplier, supply costs.
- **Supply Management**: Supply depot location, consumption per cleaning, restock thresholds, restock time and cost.
- **Emergency Thresholds**: Queue length limits, wait time limits, arrival rate thresholds for triggering call-ins and emergencies.
- **Simulation Parameters**: Time step Δt (s), simulation duration T (s), crew base locations.

---

## Outputs
- **Crew Assignments**: Time-series crew-to-task assignments with start/end times, travel times, and multi-cleaner coordination.
- **Task Completion Status**: Completion rates by task type (routine, emergency, call_in, usage-based), response times, and quality scores.
- **Key Performance Indicators (KPIs)**:
  - Cost Metrics: Total cost, overtime hours, labor cost efficiency
  - Response Metrics: Average response time, emergency response time, task assignment speed
  - Quality Metrics: Passenger satisfaction score, cleaning quality score, service level consistency
  - Efficiency Metrics: Crew utilization, task completion rate, resource allocation efficiency
  - Disruption Metrics: Disruption cost, average capacity reduction during cleaning
- **Real-time Status**: Current crew status, active cleanings, supply levels, system recommendations.

---

## Algorithm Steps

1. **Initialization**:
   - Load crew configuration from JSON (crew_config.json) including shift schedules, skill levels, hourly rates, and base locations.
   - Initialize restroom usage tracking counters and last cleaning timestamps for each restroom.
   - Set up supply management: assign initial supply levels, define depot location, configure restock parameters.
   - Schedule routine cleaning tasks based on traffic patterns and cleaning intervals.
   - Initialize KPI tracking arrays and crew status (all crews start IDLE at their base locations).

2. **Bathroom Usage Profile Processing**:
   - Ingest time-series data (λ_r(t), L_r(t), w_r(t)) from bathroom simulation.
   - Calculate passenger impact scores based on queue lengths and waiting times.
   - Store demand data for real-time disruption cost calculations during cleaning operations.

3. **Simulation Loop** (for each time step t = 0, Δt, 2Δt, ..., T):
   
   - **Step 3.1: Update Crew Status**:
     - For each crew member, check if current task is completed (current_time ≥ current_task_end_time).
     - Update crew status (IDLE, TRAVELING, CLEANING, BREAK) and current location.
     - Track total work time and supply consumption for completed tasks.
     - Move completed tasks to completed_tasks list and calculate completion metrics.

   - **Step 3.2: Supply Management Check**:
     - For each crew member, verify supply levels against task requirements.
     - If supplies < low_supply_threshold, schedule restocking:
       - Calculate travel time to supply depot
       - Update crew status to TRAVELING/RESTOCKING
       - Apply restock time and cost
       - Reset supply levels to maximum

   - **Step 3.3: Update Restroom Usage Tracking**:
     - Increment usage counters based on λ_r(t) × Δt for each restroom.
     - Check if any restroom exceeds usage_threshold_for_cleaning.
     - Generate USAGE_BASED cleaning tasks for restrooms requiring attention.

   - **Step 3.4: Real-time Emergency Detection**:
     - For each restroom section, evaluate emergency conditions:
       - High queue: L_r(t) > high_queue_threshold
       - Long wait: w_r(t) > long_wait_threshold_seconds  
       - High arrival rate: λ_r(t) > high_arrival_rate_threshold
       - Critical conditions: L_r(t) > critical_queue_threshold OR w_r(t) > critical_wait_threshold
       - Random events: probability-based service issues
     - Generate CALL_IN (priority 3-4) or EMERGENCY (priority 5) tasks with realistic deadlines.
     - Prevent duplicate urgent tasks for the same restroom within 30-minute windows.

   - **Step 3.5: Crew Assignment Optimization**:
     - **Availability Check**: Filter crews within shift hours and not currently busy.
     - **Task Prioritization**: Sort pending tasks by:
       - Priority level (5=Emergency, 4=Urgent Call-in, 3=Call-in, 2=Usage-based, 1=Routine)
       - Deadline urgency (deadline - current_time)
       - Passenger impact score
     - **Multi-cleaner Assignment Logic**:
       - Determine optimal cleaner count based on restroom size and current demand
       - Check restroom capacity: max_cleaners_per_bathroom and current active cleaners
       - For high-priority tasks, allow up to 3 cleaners with diminishing returns (duration ∝ 1/cleaners^0.7)
     - **Assignment Scoring**: For each crew-task combination, calculate score based on:
       - Skill match (higher skill for emergencies and deep cleaning)
       - Travel time penalty (distance × travel_cost_per_minute)
       - Cost efficiency (hourly_rate consideration)
       - Disruption impact (current demand × capacity_reduction_per_cleaner)
       - Peak demand avoidance (avoid cleaning during λ_r(t) > peak_demand_threshold)

   - **Step 3.6: Urgent Task Reassignment**:
     - For unassigned urgent tasks (priority ≥ 4):
       - **Phase 1**: Attempt assignment to idle crews
       - **Phase 2**: If no idle crews and priority ≥ 4, find preemptable crews:
         - Identify crews working on lower-priority tasks
         - Calculate preemption feasibility and impact
         - Interrupt lower-priority task, reassign crew to urgent task
         - Reschedule interrupted task if no other crew assigned

   - **Step 3.7: Execute Assignments**:
     - For each task-crew assignment:
       - Calculate travel time from crew.current_location to task.restroom_id
       - Adjust task duration for multiple cleaners: duration = base_duration / num_cleaners^0.7
       - Update crew status to TRAVELING or CLEANING
       - Set crew.current_task_end_time = current_time + travel_time + adjusted_duration
       - Track active cleanings for capacity reduction calculations
       - Calculate and store disruption cost: current_demand × num_cleaners × capacity_reduction_per_cleaner × duration

   - **Step 3.8: KPI Calculation** (every hour):
     - **Cost Metrics**: 
       - Total cost = Σ(crew hours × hourly_rate) + overtime_cost + supply_cost + restock_cost
       - Overtime hours for crews exceeding shift duration
     - **Response Metrics**:
       - avg_response_time = mean(completion_time - created_time) for CALL_IN and EMERGENCY tasks
       - emergency_response_time = mean(response_time) for EMERGENCY tasks only
     - **Quality Metrics**:
       - passenger_satisfaction = 85 - delay_penalty + skill_bonus (0-100 scale)
       - cleaning_quality_score = 60 + (avg_crew_skill × 20) + time_bonus (0-100 scale)
     - **Efficiency Metrics**:
       - crew_utilization = (busy_crew / active_crew) × 100
       - task_completion_rate = (completed_tasks / total_tasks) × 100
     - **Disruption Metrics**:
       - disruption_cost = Σ(disruption_cost) for all completed tasks
       - avg_capacity_reduction = mean(capacity_reduction) × 100

   - **Step 3.9: Advance Time**:
     - Increment t by Δt
     - Update progress indicators every 10% of simulation

4. **Final Calculations**:
   - Generate comprehensive task summary by type (routine, emergency, call_in, usage_based, deep_clean)
   - Analyze crew performance: tasks completed, work hours, emergency responses, efficiency scores
   - Calculate cost breakdown: labor, overtime, supplies, emergency premiums, restocking
   - Compile final KPI report with recommendations for operational improvements

5. **Output Generation**:
   - Save crew assignment timeline with Gantt chart visualization
   - Generate comprehensive dashboard with KPI trends, utilization patterns, and response time analysis
   - Create call-in analysis showing temporal patterns and response distributions
   - Export optimization summary to JSON for integration with airport management systems
   - Generate actionable recommendations based on performance metrics and identified bottlenecks

---

## Edge Cases

### System Stability
- **Queue Explosion Prevention**: Emergency task generation prevents catastrophic queue buildup
- **Crew Overload Protection**: Maximum tasks per crew and mandatory break periods
- **Supply Shortage Handling**: Automatic restocking prevents task failures due to supply depletion

### Error Recovery
- **Failed Task Reassignment**: Incomplete tasks automatically rescheduled with higher priority
- **Crew Unavailability**: Illness/absence handled through dynamic workload redistribution  
- **Equipment Failure**: Alternative cleaning methods and extended task durations

### Performance Optimization
- **Deadline Flexibility**: Emergency tasks get deadline extensions (30 min) to ensure assignability
- **Skill Matching**: Emergency-capable crews prioritized for high-priority tasks
- **Travel Optimization**: Minimize total system travel time through intelligent base location assignment

### Data Validation
- **Timestamp Consistency**: Ensure completion_time ≥ created_time for valid response time calculations
- **Capacity Constraints**: Prevent more cleaners than maximum allowed per restroom
- **Resource Bounds**: Validate supply consumption doesn't exceed available inventory