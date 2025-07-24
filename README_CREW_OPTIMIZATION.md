# Cleaning Crew Optimization System

A cleaning crew optimization system that uses real bathroom usage profiles to optimize cleaning schedules, handle dynamic call-ins, and minimize costs while maximizing passenger satisfaction.

## Overview

This system builds on top of the existing bathroom usage profiling system to provide:

- **Dynamic crew assignment optimization** based on real usage patterns
- **Real-time call-in handling** for emergency situations
- **Multi-objective optimization** balancing cost, response time, and passenger satisfaction
- **Comprehensive visualization** of crew operations and performance
- **Practical implementation** ready for real-world airport environments

## Key Performance Indicators (KPIs)

### Cost Metrics
- **Total Cost ($)**: Sum of labour, overtime, supplies, and emergency response costs
- **Overtime Hours**: Hours worked beyond regular shifts (target: <5 hours/day)
- **Labor Cost Efficiency**: Cost per task completed

### Response Metrics  
- **Average Response Time (minutes)**: Time from call-in to task completion (target: <30 min)
- **Emergency Response Time (minutes)**: Response time for high-priority issues (target: <10 min)
- **Task Assignment Speed**: Time to assign crew to new tasks

### Quality Metrics
- **Passenger Satisfaction Score (0-100)**: Based on cleanliness, wait times, and service quality (target: >85)
- **Cleaning Quality Score (0-100)**: Based on crew skill level and task completion thoroughness (target: >85)
- **Service Level Consistency**: Variance in service quality across locations

### Efficiency Metrics
- **Crew Utilization (%)**: Percentage of shift time spent on productive tasks (target: 70-80%)
- **Task Completion Rate (%)**: Percentage of scheduled tasks completed on time (target: >95%)
- **Resource Allocation Efficiency**: Optimal distribution of crew across locations

## System Components

### 1. Cleaning Crew Optimizer (`src/cleaning_crew_optimizer.py`)
- **CleaningCrewMember**: Represents individual crew members with skills, schedules, and performance tracking
- **CleaningTask**: Represents cleaning tasks with priorities, types, and requirements
- **CleaningCrewOptimizer**: Main optimization engine that:
  - Schedules routine cleaning tasks based on expected traffic
  - Generates dynamic call-in tasks based on real usage patterns
  - Optimizes crew assignments using multi-objective scoring
  - Tracks comprehensive KPIs and performance metrics

### 2. Crew Visualization (`src/crew_visualization.py`)
- **CrewVisualizationManager**: Comprehensive visualization suite including:
  - Real-time crew status dashboard
  - Gantt charts showing crew assignments over time
  - KPI trend analysis and performance heatmaps
  - Call-in pattern analysis and response time distributions
  - Cost breakdown and efficiency metrics visualization

### 3. Main Execution Script (`main_crew.py`)
- **Independent execution**: Runs separately from bathroom simulation
- **Integrated workflow**: Bathroom simulation → Usage analysis → Crew optimization
- **Comprehensive reporting**: KPIs, recommendations, and detailed analysis
- **Multiple output formats**: Terminal reports, visualizations, and JSON summaries

## Usage

### Quick Start
```bash
python main_crew.py
```

### System Requirements
- Python 3.7+
- All dependencies from `requirements.txt`
- Configuration file: `multi_floor_config.json`

### Output Files
The system generates comprehensive results in the `crew_results/` directory:

1. **crew_optimization_dashboard.png**: Main performance dashboard
2. **crew_gantt_chart.png**: Crew assignment timeline
3. **call_in_analysis.png**: Emergency response analysis
4. **real_time_status_snapshot.png**: System status visualization
5. **bathroom_usage_dashboard.png**: Original usage profile for comparison
6. **optimization_summary.json**: Complete results in JSON format

## Crew Management Features

### Dynamic Crew Scheduling
- **8 crew members** with different shifts optimized for traffic patterns:
  - Day shift (5-15h): Handles morning arrival rush
  - Mid-day shift (10-19h): Manages lunch period and maintenance
  - Evening shift (14-23h): Covers departure rush
  - Part-time emergency response specialist

### Task Types and Priorities
1. **Routine Cleaning** (Priority 2): Scheduled based on traffic levels
2. **Call-in Tasks** (Priority 3-4): Generated from usage patterns
3. **Emergency Response** (Priority 5): Critical issues requiring immediate attention
4. **Deep Cleaning** (Priority 1): Scheduled maintenance during low-traffic periods

### Call-in Generation Logic
The system automatically generates call-in tasks based on:
- **High queue lengths** (>8 people waiting)
- **Excessive wait times** (>5 minutes)
- **Overload conditions** (>9 passengers/minute arrival rate)
- **Random service issues** (0.05% chance per time step for spills, equipment failures)

### Assignment Optimization Algorithm
Multi-objective scoring considers:
- **Crew skill matching** for task requirements
- **Travel time minimization** for efficient routing
- **Deadline urgency** for time-critical tasks
- **Cost efficiency** balancing quality and expense
- **Passenger impact** prioritizing high-traffic situations

## Practical Implementation Features

### Real-World Considerations
- **Shift overlap management** to ensure 24/7 coverage
- **Break time scheduling** to maintain crew well-being
- **Skill level differentiation** for task-specific assignments
- **Emergency response capability** for critical situations
- **Overtime cost management** with automatic optimization

### Performance Monitoring
- **Real-time KPI tracking** with hourly updates
- **Crew performance analytics** including efficiency scoring
- **Cost breakdown analysis** by category and time period
- **Passenger satisfaction modeling** based on service quality

### System Recommendations
The system provides actionable recommendations for:
- **Staffing adjustments** based on utilization patterns
- **Schedule optimization** for peak traffic periods
- **Training needs** identified through performance analysis
- **Cost reduction opportunities** through efficiency improvements
- **Quality enhancement** strategies for passenger satisfaction
