"""
Cleaning Crew Optimization Module

Optimizes cleaning crew scheduling and assignment based on bathroom usage profiles.
Handles dynamic call-ins, cost optimization, response time minimization, and passenger satisfaction.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import random
from enum import Enum
import math
import os
import json


class CrewStatus(Enum):
    IDLE = "idle"
    CLEANING = "cleaning"
    TRAVELING = "traveling"
    BREAK = "break"
    EMERGENCY_RESPONSE = "emergency_response"


class CleaningType(Enum):
    ROUTINE = "routine"
    EMERGENCY = "emergency"
    CALL_IN = "call_in"
    DEEP_CLEAN = "deep_clean"
    USAGE_BASED = "usage_based"


@dataclass
class CleaningCrewMember:
    """Represents a cleaning crew member."""
    crew_id: str
    name: str
    status: CrewStatus
    current_location: str  # Current restroom or base location
    shift_start: float  # Start time in seconds
    shift_end: float    # End time in seconds
    hourly_rate: float  # USD per hour
    skill_level: float  # 1.0-2.0 multiplier for cleaning efficiency
    break_time_remaining: float = 0.0
    current_task_end_time: float = 0.0
    total_work_time: float = 0.0
    emergency_response_capable: bool = True
    supplies_remaining: float = 100.0  # Percentage of supplies remaining (0-100)
    last_restock_time: float = 0.0     # Last time supplies were restocked


@dataclass
class CleaningTask:
    """Represents a cleaning task."""
    task_id: str
    restroom_id: str
    cleaning_type: CleaningType
    priority: int  # 1-5, 5 being highest priority
    estimated_duration: float  # minutes
    required_time: float  # When task should start (seconds from sim start)
    deadline: float = None  # Hard deadline (seconds from sim start)
    created_time: float = 0.0
    assigned_crew: List[str] = None  # List of crew IDs (multiple cleaners possible)
    completion_time: float = None
    passenger_impact_score: float = 0.0  # How much this affects passengers
    disruption_cost: float = 0.0  # Cost of reducing bathroom capacity during cleaning
    capacity_reduction: float = 0.0  # Percentage of bathroom capacity lost during cleaning


class CleaningCrewOptimizer:
    """Main cleaning crew optimization system."""
    
    def __init__(self, restrooms: Dict, simulation_duration: float, dt: float, config_path: str = "crew_config.json"):
        """
        Initialize the cleaning crew optimizer.
        
        Args:
            restrooms: Restroom configuration from bathroom simulator
            simulation_duration: Total simulation time (seconds)
            dt: Time step (seconds)
            config_path: Path to crew configuration JSON file
        """
        self.restrooms = restrooms
        self.simulation_duration = simulation_duration
        self.dt = dt
        self.time_steps = np.arange(0, simulation_duration, dt)
        
        # Load configuration
        self.config = self._load_config(config_path)
        
        # Crew management
        self.crew_members: List[CleaningCrewMember] = []
        self.cleaning_tasks: List[CleaningTask] = []
        self.completed_tasks: List[CleaningTask] = []
        
        # KPI tracking
        self.kpi_history = {
            'total_cost': [],
            'avg_response_time': [],
            'passenger_satisfaction': [],
            'crew_utilization': [],
            'emergency_response_time': [],
            'task_completion_rate': [],
            'overtime_hours': [],
            'cleaning_quality_score': [],
            'disruption_cost': [],
            'avg_capacity_reduction': []
        }
        
        # Track active cleaning operations (for capacity reduction)
        self.active_cleanings = {}  # {restroom_id: [task_ids]} - currently being cleaned
        
        # Usage tracking for each restroom
        self.restroom_usage_counts = {restroom_id: 0 for restroom_id in self.restrooms.keys()}
        self.last_cleaning_time = {restroom_id: 0.0 for restroom_id in self.restrooms.keys()}
        
        # Configuration parameters
        self._setup_from_config()
        self._setup_crew_base_locations()
        
        # Initialize crew
        self._initialize_crew()
        
        # Schedule routine cleanings
        self._schedule_routine_cleanings()
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file."""
        # Handle both absolute and relative paths
        if not os.path.isabs(config_path):
            # Try relative to project root first
            root_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), config_path)
            if os.path.exists(root_path):
                config_path = root_path
            # Otherwise use as-is (relative to current working directory)
        
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: Config file {config_path} not found. Using default values.")
            return self._get_default_config()
        except json.JSONDecodeError as e:
            print(f"Warning: Error parsing config file {config_path}: {e}. Using default values.")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Get default configuration if config file is not available."""
        return {
            "crew_management": {
                "crew_members": [
                    {"name": "Alice Johnson", "shift_start_hours": 0.0, "shift_end_hours": 8.0, "skill_level": 1.8, "hourly_rate": 22.0, "base_location": "Base_1"},
                    {"name": "Bob Smith", "shift_start_hours": 0.5, "shift_end_hours": 8.5, "skill_level": 1.5, "hourly_rate": 19.0, "base_location": "Base_2"},
                    {"name": "Henry Clark", "shift_start_hours": 0.0, "shift_end_hours": 5.0, "skill_level": 2.0, "hourly_rate": 25.0, "base_location": "Base_2"}
                ]
            },
            "cleaning_operations": {"cleaning_durations": {"routine": 15.0, "emergency": 25.0, "call_in": 20.0, "deep_clean": 45.0}},
            "supply_management": {"supply_depot_location": "Base_2", "supplies_per_cleaning": 15.0, "restock_time_minutes": 10.0, "restock_cost": 25.0}
        }

    def _setup_from_config(self):
        """Set up parameters from configuration file."""
        # Supply management
        supply_config = self.config.get('supply_management', {})
        self.supply_depot_location = supply_config.get('supply_depot_location', 'Base_2')
        self.supplies_per_cleaning = supply_config.get('supplies_per_cleaning', 15.0)
        self.restock_time = supply_config.get('restock_time_minutes', 10.0) * 60  # Convert to seconds
        self.restock_cost = supply_config.get('restock_cost', 25.0)
        
        # Operational parameters
        ops_config = self.config.get('cleaning_operations', {}).get('operational_thresholds', {})
        self.usage_threshold_for_cleaning = ops_config.get('usage_threshold_for_cleaning', 15)
        
        # Load cleaning parameters
        self._setup_cleaning_parameters_from_config()
    
    def _setup_cleaning_parameters_from_config(self):
        """Set up cleaning operation parameters from configuration."""
        cleaning_config = self.config.get('cleaning_operations', {})
        
        # Cleaning durations
        durations = cleaning_config.get('cleaning_durations', {})
        self.cleaning_durations = {
            CleaningType.ROUTINE: durations.get('routine', 15.0),
            CleaningType.EMERGENCY: durations.get('emergency', 25.0),
            CleaningType.CALL_IN: durations.get('call_in', 20.0),
            CleaningType.DEEP_CLEAN: durations.get('deep_clean', 45.0),
            CleaningType.USAGE_BASED: durations.get('usage_based', 15.0)
        }
        
        # Cleaning intervals (convert hours to seconds)
        intervals = cleaning_config.get('cleaning_intervals', {})
        self.cleaning_intervals = {
            'high_traffic': intervals.get('high_traffic', 1.0) * 3600,
            'medium_traffic': intervals.get('medium_traffic', 1.5) * 3600,
            'low_traffic': intervals.get('low_traffic', 2.0) * 3600
        }
        
        # Cost parameters
        cost_config = cleaning_config.get('cost_parameters', {})
        self.overtime_multiplier = cost_config.get('overtime_multiplier', 1.5)
        self.travel_cost_per_minute = cost_config.get('travel_cost_per_minute', 0.5)
        self.disruption_cost_multiplier = cost_config.get('disruption_cost_multiplier', 50.0)
        self.capacity_reduction_per_cleaner = cost_config.get('capacity_reduction_per_cleaner', 0.3)
        
        # Operational thresholds
        thresholds = cleaning_config.get('operational_thresholds', {})
        self.peak_demand_threshold = thresholds.get('peak_demand_threshold', 0.05)
        
        # Other cost parameters (backwards compatibility)
        self.base_hourly_rate = 18.0  # USD per hour
        self.emergency_cost_multiplier = 2.0
        self.supply_cost_per_cleaning = 3.50  # USD
        
        # Quality and satisfaction parameters
        self.hygiene_decay_rate = 0.1  # Per hour without cleaning
        self.passenger_tolerance_threshold = 0.6  # Below this, satisfaction drops rapidly
        
        # Disruption parameters
        self.disruption_cost_multiplier = 50.0  # Cost per passenger affected by capacity reduction
        self.peak_demand_threshold = 0.05  # pax/s - avoid cleaning above this rate
        self.capacity_reduction_per_cleaner = 0.3  # 30% capacity reduction per cleaner
        
    def _setup_crew_base_locations(self):
        """Set up crew base locations for travel time calculations."""
        # Crew bases distributed across floors
        self.crew_bases = {
            'Base_1': {'floor': 1, 'x': 100, 'y': 10},
            'Base_2': {'floor': 2, 'x': 100, 'y': 15},
            'Base_3': {'floor': 3, 'x': 100, 'y': 12}
        }
        
    def _initialize_crew(self):
        """Initialize cleaning crew members from configuration."""
        crew_configs = self.config.get('crew_management', {}).get('crew_members', [])
        
        for i, config in enumerate(crew_configs):
            crew_member = CleaningCrewMember(
                crew_id=f"CREW_{i+1:03d}",
                name=config.get('name', f'Crew Member {i+1}'),
                status=CrewStatus.IDLE,
                current_location=config.get('base_location', f"Base_{((i % 3) + 1)}"),
                shift_start=config.get('shift_start_hours', 0.0) * 3600,  # Convert hours to seconds
                shift_end=config.get('shift_end_hours', 8.0) * 3600,      # Convert hours to seconds
                hourly_rate=config.get('hourly_rate', 20.0),
                skill_level=config.get('skill_level', 1.5)
            )
            self.crew_members.append(crew_member)
    
    def _schedule_routine_cleanings(self):
        """Schedule routine cleaning tasks based on expected traffic patterns."""
        task_id = 1
        
        for restroom_id in self.restrooms.keys():
            # Determine traffic level based on capacity
            total_capacity = self.restrooms[restroom_id]['capacity_M'] + self.restrooms[restroom_id]['capacity_F']
            
            if total_capacity > 0.5:
                interval = self.cleaning_intervals['high_traffic']
            elif total_capacity > 0.35:
                interval = self.cleaning_intervals['medium_traffic']
            else:
                interval = self.cleaning_intervals['low_traffic']
            
            # Schedule cleanings throughout the day
            current_time = interval  # Start after first interval
            while current_time < self.simulation_duration:
                task = CleaningTask(
                    task_id=f"ROUTINE_{task_id:04d}",
                    restroom_id=restroom_id,
                    cleaning_type=CleaningType.ROUTINE,
                    priority=2,
                    estimated_duration=self.cleaning_durations[CleaningType.ROUTINE],
                    required_time=current_time,
                    deadline=current_time + 1800,  # 30 minute flexibility
                    created_time=0.0,
                    assigned_crew=[]
                )
                self.cleaning_tasks.append(task)
                task_id += 1
                current_time += interval
    
    def process_bathroom_usage_profile(self, lambda_r: Dict, L_r: Dict, w_r: Dict):
        """
        Process bathroom usage profile for real-time dynamic cleaning decisions.
        
        Args:
            lambda_r: Arrival rates by restroom section
            L_r: Queue lengths by restroom section
            w_r: Waiting times by restroom section
        """
        # Store demand data for real-time analysis
        self.current_demand_data = {
            'lambda_r': lambda_r,
            'L_r': L_r,
            'w_r': w_r
        }
        
        # Initialize dynamic task tracking
        self.call_in_task_counter = 1000  # Start call-in IDs at 1000
        self.emergency_task_counter = 2000  # Start emergency IDs at 2000
    

    
    def _calculate_passenger_impact(self, arrival_rate: float, queue_length: float, waiting_time: float) -> float:
        """Calculate passenger impact score based on restroom conditions."""
        # Normalized impact factors
        arrival_impact = min(arrival_rate / 0.2, 1.0)  # Normalize to 0.2 pax/s max
        queue_impact = min(queue_length / 10.0, 1.0)   # Normalize to 10 people max
        wait_impact = min(waiting_time / 600.0, 1.0)   # Normalize to 10 minutes max
        
        # Weighted combination
        impact_score = (0.3 * arrival_impact + 0.4 * queue_impact + 0.3 * wait_impact) * 100
        return impact_score
    

    
    def optimize_crew_assignment(self, current_time: float) -> Dict[str, str]:
        """
        Optimize crew assignments for current time using dynamic programming approach.
        
        Args:
            current_time: Current simulation time (seconds)
            
        Returns:
            Dictionary mapping task_id to crew_id
        """
        assignments = {}
        
        # Get available crew members
        available_crew = [crew for crew in self.crew_members 
                         if self._is_crew_available(crew, current_time)]
        
        # Get pending tasks that need assignment
        pending_tasks = [task for task in self.cleaning_tasks 
                        if not task.assigned_crew  # Empty list means unassigned
                        and task.completion_time is None
                        and task.required_time <= current_time + 1800]  # Tasks needed within 30 min
        
        # Sort tasks by priority and urgency
        pending_tasks.sort(key=lambda t: (
            -t.priority,  # Higher priority first
            t.deadline - current_time if t.deadline else float('inf'),  # Closer deadline first
            -t.passenger_impact_score  # Higher impact first
        ))
        
        # Assignment algorithm with disruption-aware multi-cleaner assignment
        for task in pending_tasks:
            restroom_id = task.restroom_id
            max_cleaners = self._get_bathroom_max_cleaners(restroom_id)
            current_cleaners = self._get_current_active_cleaners(restroom_id)
            available_slots = max_cleaners - current_cleaners
            
            if available_slots <= 0:
                continue  # Restroom at capacity
            
            # Determine optimal number of cleaners for this task
            optimal_cleaners = self._determine_optimal_cleaner_count(task, current_time, available_slots)
            
            # Find best crew combination
            best_crew_combo = self._find_best_crew_combination(
                task, available_crew, optimal_cleaners, current_time
            )
            
            if best_crew_combo:
                task.assigned_crew = [crew.crew_id for crew in best_crew_combo]
                assignments[task.task_id] = task.assigned_crew
                
                # Remove assigned crew from available pool
                for crew in best_crew_combo:
                    if crew in available_crew:
                        available_crew.remove(crew)
        
        return assignments
    
    def _is_crew_available(self, crew: CleaningCrewMember, current_time: float) -> bool:
        """Check if crew member is available for assignment."""
        # Check if within shift hours
        if current_time < crew.shift_start or current_time > crew.shift_end:
            return False
        
        # Check if currently busy
        if crew.status in [CrewStatus.CLEANING, CrewStatus.TRAVELING, CrewStatus.BREAK]:
            if crew.current_task_end_time > current_time:
                return False
        
        return True
    
    def _can_crew_handle_task(self, crew: CleaningCrewMember, task: CleaningTask, current_time: float) -> bool:
        """Check if crew member can handle the specific task."""
        # Check emergency response capability
        if task.cleaning_type == CleaningType.EMERGENCY and not crew.emergency_response_capable:
            return False
        
        # Check if crew has enough supplies for the task
        if not self._check_crew_supplies(crew, task):
            return False
        
        # Check if crew can reach and complete task before deadline
        travel_time = self._calculate_travel_time(crew.current_location, task.restroom_id)
        completion_time = current_time + travel_time + (task.estimated_duration * 60)
        
        # For urgent tasks (emergencies and call-ins), be more lenient with deadlines
        if task.deadline and completion_time > task.deadline:
            # Allow some flexibility for urgent tasks
            if task.priority >= 4:  # High priority (emergencies and urgent call-ins)
                flexible_deadline = task.deadline + 1800  # Extra 30 minutes for urgent tasks
                if completion_time > flexible_deadline:
                    return False
            else:
                return False
        
        return True
    
    def _calculate_assignment_score(self, crew: CleaningCrewMember, task: CleaningTask, current_time: float) -> float:
        """Calculate assignment score for crew-task pairing."""
        score = 0.0
        
        # Skill match bonus
        if task.cleaning_type == CleaningType.DEEP_CLEAN:
            score += crew.skill_level * 20  # Prefer skilled crew for deep cleaning
        elif task.priority >= 4:
            score += crew.skill_level * 15  # Prefer skilled crew for high priority
        
        # Distance penalty
        travel_time = self._calculate_travel_time(crew.current_location, task.restroom_id)
        score -= travel_time * 2  # Penalty for longer travel
        
        # Urgency bonus
        if task.deadline:
            time_until_deadline = task.deadline - current_time
            if time_until_deadline < 1800:  # Less than 30 minutes
                score += 30
        
        # Cost efficiency
        task_duration_hours = task.estimated_duration / 60.0
        task_cost = crew.hourly_rate * task_duration_hours
        score -= task_cost * 0.5  # Slight penalty for expensive crew
        
        # Passenger impact
        score += task.passenger_impact_score * 0.3
        
        return score
    
    def _calculate_travel_time(self, from_location: str, to_location: str) -> float:
        """Calculate travel time between locations (simplified)."""
        # This is a simplified calculation - in reality would use the movement model
        base_travel_time = 180.0  # 3 minutes base travel time
        
        # Get floor for from_location
        if from_location.startswith('Base_'):
            from_floor = int(from_location.split('_')[1])
        else:
            from_floor = self.restrooms.get(from_location, {}).get('floor', 1)
        
        # Get floor for to_location
        if to_location.startswith('Base_'):
            to_floor = int(to_location.split('_')[1])
        else:
            to_floor = self.restrooms.get(to_location, {}).get('floor', 1)
        
        floor_diff = abs(to_floor - from_floor)
        
        travel_time = base_travel_time + (floor_diff * 60)  # 1 minute per floor
        return travel_time
    
    def execute_assignments(self, assignments: Dict[str, List[str]], current_time: float):
        """Execute crew assignments and update crew status."""
        for task_id, crew_ids in assignments.items():
            task = next(t for t in self.cleaning_tasks if t.task_id == task_id)
            
            # Handle multiple crew members
            for crew_id in crew_ids:
                crew = next(c for c in self.crew_members if c.crew_id == crew_id)
                
                # Calculate travel time
                travel_time = self._calculate_travel_time(crew.current_location, task.restroom_id)
                
                # Adjust task duration for multiple cleaners (diminishing returns)
                num_cleaners = len(crew_ids)
                adjusted_duration = task.estimated_duration / (num_cleaners ** 0.7)
                
                # Update crew status
                crew.status = CrewStatus.TRAVELING if travel_time > 0 else CrewStatus.CLEANING
                crew.current_task_end_time = current_time + travel_time + (adjusted_duration * 60)
                crew.current_location = task.restroom_id
            
            # Track active cleaning for capacity reduction
            if task.restroom_id not in self.active_cleanings:
                self.active_cleanings[task.restroom_id] = []
            self.active_cleanings[task.restroom_id].append(task_id)
            
            # Calculate and store disruption metrics
            if hasattr(self, 'current_demand_data'):
                lambda_r = self.current_demand_data['lambda_r']
                t_idx = int(current_time / self.dt)
                current_demand = self._calculate_current_demand(task.restroom_id, current_time, lambda_r, t_idx)
                
                task.disruption_cost = self._calculate_disruption_cost(
                    task.restroom_id, len(crew_ids), current_demand, task.estimated_duration
                )
                task.capacity_reduction = min(len(crew_ids) * self.capacity_reduction_per_cleaner, 1.0)
    
    def update_crew_status(self, current_time: float):
        """Update crew member status based on current time."""
        for crew in self.crew_members:
            # Check if current task is completed
            if crew.current_task_end_time > 0 and current_time >= crew.current_task_end_time:
                # Find completed task (handling multiple crew assignments)
                completed_task = None
                for task in self.cleaning_tasks:
                    if (task.assigned_crew and crew.crew_id in task.assigned_crew 
                        and task.completion_time is None):
                        completed_task = task
                        break
                
                if completed_task:
                    # Check if all crew members for this task are finished
                    all_crew_finished = True
                    for assigned_crew_id in completed_task.assigned_crew:
                        assigned_crew = next(c for c in self.crew_members if c.crew_id == assigned_crew_id)
                        if assigned_crew.current_task_end_time > current_time:
                            all_crew_finished = False
                            break
                    
                    # If all crew finished, mark task as completed
                    if all_crew_finished:
                        completed_task.completion_time = current_time
                        self.completed_tasks.append(completed_task)
                        
                        # Remove from active cleanings
                        if completed_task.restroom_id in self.active_cleanings:
                            if completed_task.task_id in self.active_cleanings[completed_task.restroom_id]:
                                self.active_cleanings[completed_task.restroom_id].remove(completed_task.task_id)
                            if not self.active_cleanings[completed_task.restroom_id]:
                                del self.active_cleanings[completed_task.restroom_id]
                
                # Reset crew status
                crew.status = CrewStatus.IDLE
                crew.current_task_end_time = 0.0
                if completed_task:
                    # Divide work time among team members
                    adjusted_duration = completed_task.estimated_duration / len(completed_task.assigned_crew)
                    crew.total_work_time += adjusted_duration
                    
                    # Consume supplies and update cleaning time
                    self._consume_supplies(crew, completed_task)
                    self.last_cleaning_time[completed_task.restroom_id] = current_time
                    
                    # Check if crew needs restocking
                    if crew.supplies_remaining < self.supplies_per_cleaning:
                        self._restock_crew_supplies(crew, current_time)
    
    def calculate_kpis(self, current_time: float) -> Dict[str, float]:
        """Calculate current KPI values."""
        kpis = {}
        
        # 1. Total Cost (USD)
        total_cost = 0.0
        for crew in self.crew_members:
            # Regular hours cost
            hours_worked = crew.total_work_time / 60.0
            shift_duration = (crew.shift_end - crew.shift_start) / 3600.0
            
            if hours_worked <= shift_duration:
                total_cost += hours_worked * crew.hourly_rate
            else:
                # Overtime calculation
                regular_cost = shift_duration * crew.hourly_rate
                overtime_hours = hours_worked - shift_duration
                overtime_cost = overtime_hours * crew.hourly_rate * self.overtime_multiplier
                total_cost += regular_cost + overtime_cost
        
        # Add supply costs
        total_cost += len(self.completed_tasks) * self.supply_cost_per_cleaning
        
        # Add restocking costs
        if hasattr(self, 'total_restock_cost'):
            total_cost += self.total_restock_cost
            
        kpis['total_cost'] = total_cost
        
        # 2. Average Response Time (minutes) - Only for call-in and emergency tasks
        urgent_tasks = [t for t in self.completed_tasks 
                       if t.cleaning_type in [CleaningType.CALL_IN, CleaningType.EMERGENCY]
                       and t.created_time > 0 and t.completion_time is not None
                       and t.completion_time >= t.created_time]  # Ensure valid times
        if urgent_tasks:
            response_times = [(t.completion_time - t.created_time) / 60.0 for t in urgent_tasks]
            kpis['avg_response_time'] = np.mean(response_times)
        else:
            kpis['avg_response_time'] = 0.0
        
        # 3. Passenger Satisfaction Score (0-100)
        satisfaction_scores = []
        for task in self.completed_tasks:
            # Base satisfaction
            base_satisfaction = 85.0
            
            # Penalty for delayed response
            if task.deadline and task.completion_time > task.deadline:
                delay_minutes = (task.completion_time - task.deadline) / 60.0
                satisfaction_penalty = min(delay_minutes * 2, 40)  # Max 40 point penalty
                base_satisfaction -= satisfaction_penalty
            
            # Bonus for high-skill crew (use average skill if multiple crew)
            if task.assigned_crew:
                crew_skills = []
                for crew_id in task.assigned_crew:
                    assigned_crew = next(c for c in self.crew_members if c.crew_id == crew_id)
                    crew_skills.append(assigned_crew.skill_level)
                avg_skill = sum(crew_skills) / len(crew_skills)
                skill_bonus = (avg_skill - 1.0) * 10  # Up to 10 point bonus
                base_satisfaction += skill_bonus
            
            satisfaction_scores.append(max(0, min(100, base_satisfaction)))
        
        kpis['passenger_satisfaction'] = np.mean(satisfaction_scores) if satisfaction_scores else 85.0
        
        # 4. Crew Utilization (%)
        active_crew = sum(1 for crew in self.crew_members 
                         if crew.shift_start <= current_time <= crew.shift_end)
        busy_crew = sum(1 for crew in self.crew_members 
                       if crew.status in [CrewStatus.CLEANING, CrewStatus.TRAVELING])
        
        kpis['crew_utilization'] = (busy_crew / active_crew * 100) if active_crew > 0 else 0.0
        
        # 5. Emergency Response Time (minutes) - Only for actual emergencies
        emergency_tasks = [t for t in self.completed_tasks 
                          if t.cleaning_type == CleaningType.EMERGENCY
                          and t.created_time > 0 and t.completion_time is not None
                          and t.completion_time >= t.created_time]  # Ensure valid times
        if emergency_tasks:
            emergency_response_times = [(t.completion_time - t.created_time) / 60.0 
                                      for t in emergency_tasks]
            kpis['emergency_response_time'] = np.mean(emergency_response_times)
        else:
            kpis['emergency_response_time'] = 0.0
        
        # 6. Task Completion Rate (%)
        total_tasks = len(self.cleaning_tasks)
        completed_count = len(self.completed_tasks)
        kpis['task_completion_rate'] = (completed_count / total_tasks * 100) if total_tasks > 0 else 100.0
        
        # 7. Overtime Hours
        overtime_hours = 0.0
        for crew in self.crew_members:
            shift_duration = (crew.shift_end - crew.shift_start) / 3600.0
            hours_worked = crew.total_work_time / 60.0
            if hours_worked > shift_duration:
                overtime_hours += hours_worked - shift_duration
        kpis['overtime_hours'] = overtime_hours
        
        # 8. Cleaning Quality Score (0-100)
        quality_scores = []
        for task in self.completed_tasks:
            if task.assigned_crew:
                # Use average skill if multiple crew assigned
                crew_skills = []
                for crew_id in task.assigned_crew:
                    assigned_crew = next(c for c in self.crew_members if c.crew_id == crew_id)
                    crew_skills.append(assigned_crew.skill_level)
                avg_skill = sum(crew_skills) / len(crew_skills)
            else:
                avg_skill = 1.5  # Default skill level
            
            # Base quality from crew skill
            base_quality = 60 + (avg_skill * 20)  # 60-100 range
            
            # Bonus for sufficient time
            if task.cleaning_type == CleaningType.ROUTINE:
                expected_duration = self.cleaning_durations[CleaningType.ROUTINE]
                if task.estimated_duration >= expected_duration:
                    base_quality += 5
            
            quality_scores.append(min(100, base_quality))
        
        kpis['cleaning_quality_score'] = np.mean(quality_scores) if quality_scores else 80.0
        
        # 9. Disruption Cost (USD)
        total_disruption_cost = sum(t.disruption_cost for t in self.completed_tasks)
        kpis['disruption_cost'] = total_disruption_cost
        
        # 10. Average Capacity Reduction (%)
        if self.completed_tasks:
            avg_capacity_reduction = np.mean([t.capacity_reduction * 100 for t in self.completed_tasks])
        else:
            avg_capacity_reduction = 0.0
        kpis['avg_capacity_reduction'] = avg_capacity_reduction
        
        return kpis
    
    def run_optimization(self, bathroom_usage_data: Dict) -> Dict:
        """
        Run the complete cleaning crew optimization simulation.
        
        Args:
            bathroom_usage_data: Dictionary containing lambda_r, L_r, w_r from bathroom simulator
            
        Returns:
            Dictionary containing optimization results and KPIs
        """
        results = {
            'kpi_timeline': [],
            'crew_assignments': [],
            'task_completions': [],
            'final_kpis': {},
            'cost_breakdown': {},
            'crew_performance': {}
        }
        
        lambda_r = bathroom_usage_data['lambda_r']
        L_r = bathroom_usage_data['L_r']
        w_r = bathroom_usage_data['w_r']
        
        # Process bathroom usage profile
        self.process_bathroom_usage_profile(lambda_r, L_r, w_r)
        
        print("Running cleaning crew optimization simulation...")
        
        # Simulation loop
        for t_idx, current_time in enumerate(self.time_steps):
            if t_idx % (len(self.time_steps) // 10) == 0:
                progress = (t_idx / len(self.time_steps)) * 100
                print(f"  Progress: {progress:.0f}% (t={current_time/3600:.1f} hours)")
            
            # Update crew status
            self.update_crew_status(current_time)
            
            # Update restroom usage tracking
            t_idx = int(current_time / self.dt)
            self._update_restroom_usage(lambda_r, t_idx, self.dt)
            
            # Check for usage-based cleaning needs
            self._check_usage_based_cleaning_needs(current_time)
            
            # REAL-TIME: Check for urgent call-ins and emergencies
            urgent_tasks = self._check_for_real_time_call_ins(current_time, t_idx)
            
            if urgent_tasks:
                # Add urgent tasks to task list
                self.cleaning_tasks.extend(urgent_tasks)
                
                # Handle immediate crew reassignment for urgent tasks
                self._handle_crew_reassignment(urgent_tasks, current_time)
            
            # Optimize assignments for remaining unassigned tasks
            assignments = self.optimize_crew_assignment(current_time)
            
            # Execute assignments
            if assignments:
                self.execute_assignments(assignments, current_time)
                results['crew_assignments'].append({
                    'time': current_time,
                    'assignments': assignments.copy()
                })
            
            # Calculate KPIs every hour
            if t_idx % (3600 // self.dt) == 0:
                kpis = self.calculate_kpis(current_time)
                kpis['time'] = current_time
                results['kpi_timeline'].append(kpis)
                
                # Update KPI history
                for key, value in kpis.items():
                    if key != 'time' and key in self.kpi_history:
                        self.kpi_history[key].append(value)
        
        # Calculate final KPIs at the very end (to capture the 6th hour)
        final_kpis_end = self.calculate_kpis(self.simulation_duration)
        final_kpis_end['time'] = self.simulation_duration
        if not results['kpi_timeline'] or results['kpi_timeline'][-1]['time'] < self.simulation_duration:
            results['kpi_timeline'].append(final_kpis_end)
        
        # Final calculations
        results['final_kpis'] = self.calculate_kpis(self.simulation_duration)
        results['cost_breakdown'] = self._calculate_cost_breakdown()
        results['crew_performance'] = self._analyze_crew_performance()
        results['task_summary'] = self._summarize_tasks()
        
        # Add simulation metadata
        results['simulation_duration'] = self.simulation_duration
        results['simulation_dt'] = self.dt
        results['total_time_steps'] = len(self.time_steps)
        
        print("Cleaning crew optimization completed!")
        return results
    
    def _calculate_cost_breakdown(self) -> Dict:
        """Calculate detailed cost breakdown."""
        breakdown = {
            'labor_cost': 0.0,
            'overtime_cost': 0.0,
            'supply_cost': 0.0,
            'emergency_cost': 0.0
        }
        
        for crew in self.crew_members:
            hours_worked = crew.total_work_time / 60.0
            shift_duration = (crew.shift_end - crew.shift_start) / 3600.0
            
            if hours_worked <= shift_duration:
                breakdown['labor_cost'] += hours_worked * crew.hourly_rate
            else:
                breakdown['labor_cost'] += shift_duration * crew.hourly_rate
                overtime_hours = hours_worked - shift_duration
                breakdown['overtime_cost'] += overtime_hours * crew.hourly_rate * self.overtime_multiplier
        
        breakdown['supply_cost'] = len(self.completed_tasks) * self.supply_cost_per_cleaning
        
        emergency_tasks = [t for t in self.completed_tasks if t.priority >= 4]
        breakdown['emergency_cost'] = len(emergency_tasks) * self.supply_cost_per_cleaning * self.emergency_cost_multiplier
        
        # Add restocking costs
        breakdown['restock_cost'] = getattr(self, 'total_restock_cost', 0.0)
        
        return breakdown
    
    def _analyze_crew_performance(self) -> Dict:
        """Analyze individual crew member performance."""
        performance = {}
        
        for crew in self.crew_members:
            tasks_completed = [t for t in self.completed_tasks 
                             if t.assigned_crew and crew.crew_id in t.assigned_crew]
            
            performance[crew.crew_id] = {
                'name': crew.name,
                'tasks_completed': len(tasks_completed),
                'total_work_time_hours': crew.total_work_time / 60.0,
                'avg_task_duration': np.mean([t.estimated_duration for t in tasks_completed]) if tasks_completed else 0,
                'emergency_tasks': len([t for t in tasks_completed if t.priority >= 4]),
                'efficiency_score': self._calculate_efficiency_score(crew, tasks_completed)
            }
        
        return performance
    
    def _calculate_efficiency_score(self, crew: CleaningCrewMember, tasks: List[CleaningTask]) -> float:
        """Calculate efficiency score for crew member."""
        if not tasks:
            return 0.0
        
        # Base score from skill level
        score = crew.skill_level * 30
        
        # Bonus for task completion
        score += len(tasks) * 2
        
        # Bonus for emergency response
        emergency_tasks = [t for t in tasks if t.priority >= 4]
        score += len(emergency_tasks) * 5
        
        # Penalty for overtime
        shift_duration = (crew.shift_end - crew.shift_start) / 3600.0
        hours_worked = crew.total_work_time / 60.0
        if hours_worked > shift_duration:
            overtime_penalty = (hours_worked - shift_duration) * 3
            score -= overtime_penalty
        
        return max(0, min(100, score))
    
    def _summarize_tasks(self) -> Dict:
        """Summarize task completion statistics."""
        total_tasks = len(self.cleaning_tasks)
        completed_tasks = len(self.completed_tasks)
        
        task_types = {}
        for task_type in CleaningType:
            type_tasks = [t for t in self.cleaning_tasks if t.cleaning_type == task_type]
            completed_type_tasks = [t for t in self.completed_tasks if t.cleaning_type == task_type]
            
            task_types[task_type.value] = {
                'total': len(type_tasks),
                'completed': len(completed_type_tasks),
                'completion_rate': (len(completed_type_tasks) / len(type_tasks) * 100) if type_tasks else 0
            }
        
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'overall_completion_rate': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
            'by_type': task_types,
            'avg_passenger_impact': np.mean([t.passenger_impact_score for t in self.completed_tasks]) if self.completed_tasks else 0,
            'usage_based_cleanings': len([t for t in self.completed_tasks if t.task_id.startswith('USAGE_')]),
            'real_time_call_ins': len([t for t in self.completed_tasks if t.task_id.startswith('CALLIN_')]),
            'emergency_responses': len([t for t in self.completed_tasks if t.task_id.startswith('EMERGENCY_')]),
            'preempted_tasks': len([t for t in self.cleaning_tasks if hasattr(t, '_was_preempted')]),
            'total_restroom_usage': sum(self.restroom_usage_counts.values()),
            'restrooms_needing_attention': len([r for r, count in self.restroom_usage_counts.items() 
                                             if count > self.usage_threshold_for_cleaning * 0.8])
        } 

    def _get_bathroom_max_cleaners(self, restroom_id: str) -> int:
        """
        Determine maximum number of cleaners that can work simultaneously in a bathroom.
        
        Args:
            restroom_id: Restroom identifier
            
        Returns:
            Maximum number of cleaners (1-3 based on bathroom size)
        """
        total_capacity = (self.restrooms[restroom_id]['capacity_M'] + 
                         self.restrooms[restroom_id]['capacity_F'])
        
        # Bathroom size categories
        if total_capacity > 0.5:      # Large bathroom
            return 3
        elif total_capacity > 0.35:   # Medium bathroom  
            return 2
        else:                        # Small bathroom
            return 1
    
    def _calculate_current_demand(self, restroom_id: str, current_time: float, 
                                 lambda_r: Dict, t_idx: int) -> float:
        """
        Calculate current demand for a specific restroom.
        
        Args:
            restroom_id: Restroom identifier
            current_time: Current simulation time
            lambda_r: Arrival rates data
            t_idx: Current time index
            
        Returns:
            Total current arrival rate for the restroom (pax/s)
        """
        total_demand = 0.0
        for gender in ['M', 'F']:
            section_id = f"{restroom_id}-{gender}"
            if section_id in lambda_r and t_idx < len(lambda_r[section_id]):
                total_demand += lambda_r[section_id][t_idx]
        return total_demand
    
    def _calculate_disruption_cost(self, restroom_id: str, num_cleaners: int, 
                                  current_demand: float, task_duration: float) -> float:
        """
        Calculate the disruption cost of assigning cleaners during current demand.
        
        Args:
            restroom_id: Restroom identifier
            num_cleaners: Number of cleaners to assign
            current_demand: Current arrival rate (pax/s)
            task_duration: Duration of cleaning task (minutes)
            
        Returns:
            Disruption cost in dollars
        """
        # Calculate capacity reduction
        capacity_reduction = min(num_cleaners * self.capacity_reduction_per_cleaner, 1.0)
        
        # Estimate passengers affected during cleaning
        affected_passengers = current_demand * (task_duration * 60) * capacity_reduction
        
        # Calculate disruption cost
        disruption_cost = affected_passengers * self.disruption_cost_multiplier
        
        # Extra penalty for cleaning during peak times
        if current_demand > self.peak_demand_threshold:
            peak_penalty = (current_demand / self.peak_demand_threshold) * 100
            disruption_cost += peak_penalty
        
        return disruption_cost
    
    def _is_peak_demand_period(self, restroom_id: str, current_time: float, 
                              lambda_r: Dict, t_idx: int) -> bool:
        """
        Check if current time is a peak demand period for the restroom.
        
        Args:
            restroom_id: Restroom identifier
            current_time: Current simulation time  
            lambda_r: Arrival rates data
            t_idx: Current time index
            
        Returns:
            True if peak demand period
        """
        current_demand = self._calculate_current_demand(restroom_id, current_time, lambda_r, t_idx)
        return current_demand > self.peak_demand_threshold
    
    def _get_current_active_cleaners(self, restroom_id: str) -> int:
        """
        Get number of cleaners currently active in a restroom.
        
        Args:
            restroom_id: Restroom identifier
            
        Returns:
            Number of active cleaners
        """
        return len(self.active_cleanings.get(restroom_id, []))
    
    def _can_add_cleaner_to_restroom(self, restroom_id: str) -> bool:
        """
        Check if another cleaner can be added to the restroom.
        
        Args:
            restroom_id: Restroom identifier
            
        Returns:
            True if can add another cleaner
        """
        max_cleaners = self._get_bathroom_max_cleaners(restroom_id)
        current_cleaners = self._get_current_active_cleaners(restroom_id)
        return current_cleaners < max_cleaners 

    def _determine_optimal_cleaner_count(self, task: CleaningTask, current_time: float, 
                                        max_available: int) -> int:
        """
        Determine optimal number of cleaners for a task considering disruption.
        
        Args:
            task: Cleaning task
            current_time: Current simulation time
            max_available: Maximum cleaners available for this restroom
            
        Returns:
            Optimal number of cleaners (1 to max_available)
        """
        if not hasattr(self, 'current_demand_data'):
            return min(1, max_available)  # Default to 1 if no demand data
        
        lambda_r = self.current_demand_data['lambda_r']
        t_idx = int(current_time / self.dt)
        
        # Get current demand
        current_demand = self._calculate_current_demand(task.restroom_id, current_time, lambda_r, t_idx)
        
        # For emergency tasks, prioritize speed over disruption
        if task.priority >= 4:
            return min(max_available, 2)  # Use up to 2 cleaners for emergencies
        
        # For routine tasks during low demand, use fewer cleaners
        if current_demand < self.peak_demand_threshold * 0.5:
            return 1  # Single cleaner during low demand
        
        # For high demand periods, avoid cleaning if possible (return 0)
        # But if urgent, use minimal crew
        if current_demand > self.peak_demand_threshold:
            if task.priority >= 3:
                return 1  # Minimal crew for urgent tasks during peak
            else:
                return 0  # Defer non-urgent tasks during peak
        
        # Normal demand - use optimal crew size
        return min(2, max_available)
    
    def _find_best_crew_combination(self, task: CleaningTask, available_crew: List, 
                                   target_cleaners: int, current_time: float) -> List:
        """
        Find the best combination of crew members for a task.
        
        Args:
            task: Cleaning task
            available_crew: List of available crew members
            target_cleaners: Target number of cleaners
            current_time: Current simulation time
            
        Returns:
            List of best crew members for the task
        """
        if target_cleaners <= 0 or not available_crew:
            return []
        
        # Filter crew that can handle this task
        suitable_crew = [crew for crew in available_crew 
                        if self._can_crew_handle_task(crew, task, current_time)]
        
        if not suitable_crew:
            return []
        
        # For single cleaner, use existing scoring
        if target_cleaners == 1:
            best_crew = None
            best_score = float('-inf')
            
            for crew in suitable_crew:
                score = self._calculate_assignment_score_with_disruption(crew, task, current_time)
                if score > best_score:
                    best_score = score
                    best_crew = crew
            
            return [best_crew] if best_crew else []
        
        # For multiple cleaners, find best combination
        from itertools import combinations
        
        best_combo = None
        best_combo_score = float('-inf')
        
        # Try all combinations up to target_cleaners
        for combo_size in range(1, min(target_cleaners + 1, len(suitable_crew) + 1)):
            for combo in combinations(suitable_crew, combo_size):
                combo_score = self._calculate_team_score(combo, task, current_time)
                if combo_score > best_combo_score:
                    best_combo_score = combo_score
                    best_combo = list(combo)
        
        return best_combo if best_combo else []
    
    def _calculate_assignment_score_with_disruption(self, crew: CleaningCrewMember, 
                                                   task: CleaningTask, current_time: float) -> float:
        """
        Calculate assignment score including disruption costs.
        
        Args:
            crew: Crew member
            task: Cleaning task
            current_time: Current simulation time
            
        Returns:
            Assignment score (higher is better)
        """
        # Base score from original method
        score = self._calculate_assignment_score(crew, task, current_time)
        
        # Calculate disruption penalty
        if hasattr(self, 'current_demand_data'):
            lambda_r = self.current_demand_data['lambda_r']
            t_idx = int(current_time / self.dt)
            current_demand = self._calculate_current_demand(task.restroom_id, current_time, lambda_r, t_idx)
            
            disruption_cost = self._calculate_disruption_cost(
                task.restroom_id, 1, current_demand, task.estimated_duration
            )
            
            # Convert disruption cost to score penalty
            disruption_penalty = disruption_cost / 10.0  # Scale down for scoring
            score -= disruption_penalty
        
        return score
    
    def _calculate_team_score(self, crew_combo: List[CleaningCrewMember], 
                             task: CleaningTask, current_time: float) -> float:
        """
        Calculate score for a team of cleaners.
        
        Args:
            crew_combo: List of crew members
            task: Cleaning task
            current_time: Current simulation time
            
        Returns:
            Team score (higher is better)
        """
        if not crew_combo:
            return float('-inf')
        
        # Base team score (average individual scores)
        individual_scores = [self._calculate_assignment_score(crew, task, current_time) 
                           for crew in crew_combo]
        base_score = sum(individual_scores) / len(individual_scores)
        
        # Team efficiency bonus (more cleaners = faster completion)
        efficiency_bonus = len(crew_combo) * 10
        
        # Skill synergy bonus
        avg_skill = sum(crew.skill_level for crew in crew_combo) / len(crew_combo)
        skill_bonus = avg_skill * 5
        
        # Calculate disruption penalty for the team
        disruption_penalty = 0
        if hasattr(self, 'current_demand_data'):
            lambda_r = self.current_demand_data['lambda_r']
            t_idx = int(current_time / self.dt)
            current_demand = self._calculate_current_demand(task.restroom_id, current_time, lambda_r, t_idx)
            
            # Reduced task duration due to multiple cleaners
            adjusted_duration = task.estimated_duration / (len(crew_combo) ** 0.7)  # Diminishing returns
            
            disruption_cost = self._calculate_disruption_cost(
                task.restroom_id, len(crew_combo), current_demand, adjusted_duration
            )
            
            disruption_penalty = disruption_cost / 5.0  # Scale for scoring
        
        total_score = base_score + efficiency_bonus + skill_bonus - disruption_penalty
        return total_score 

    def _update_restroom_usage(self, lambda_r: Dict, t_idx: int, dt: float):
        """
        Update restroom usage counts based on arrival rates.
        
        Args:
            lambda_r: Arrival rates by restroom section
            t_idx: Current time index
            dt: Time step size
        """
        for section_id, arrival_rates in lambda_r.items():
            if t_idx < len(arrival_rates):
                # Convert section_id to restroom_id
                restroom_id = section_id.rsplit('-', 1)[0]
                
                # Add usage count (passengers entering in this time step)
                passengers_this_step = arrival_rates[t_idx] * dt
                self.restroom_usage_counts[restroom_id] += passengers_this_step
    
    def _check_usage_based_cleaning_needs(self, current_time: float):
        """
        Check if any restrooms need cleaning based on usage thresholds.
        
        Args:
            current_time: Current simulation time
        """
        task_id = len(self.cleaning_tasks) + 1
        
        for restroom_id, usage_count in self.restroom_usage_counts.items():
            # Check if cleaning needed based on usage
            if usage_count >= self.usage_threshold_for_cleaning:
                # Check if enough time has passed since last cleaning
                time_since_cleaning = current_time - self.last_cleaning_time[restroom_id]
                
                if time_since_cleaning > 1800:  # At least 30 minutes since last cleaning
                    # Create usage-based cleaning task
                    task = CleaningTask(
                        task_id=f"USAGE_{task_id:04d}",
                        restroom_id=restroom_id,
                        cleaning_type=CleaningType.USAGE_BASED,
                        priority=2,
                        estimated_duration=self.cleaning_durations[CleaningType.ROUTINE],
                        required_time=current_time,
                        deadline=current_time + 3600,  # 1 hour flexibility
                        created_time=current_time,
                        assigned_crew=[],
                        passenger_impact_score=min(usage_count / self.usage_threshold_for_cleaning * 20, 50)
                    )
                    self.cleaning_tasks.append(task)
                    
                    # Reset usage count after scheduling cleaning
                    self.restroom_usage_counts[restroom_id] = 0
                    task_id += 1
    
    def _check_for_real_time_call_ins(self, current_time: float, t_idx: int) -> List[CleaningTask]:
        """
        Check for real-time call-ins and emergencies based on current conditions.
        
        Args:
            current_time: Current simulation time
            t_idx: Current time index
            
        Returns:
            List of new urgent tasks that need immediate attention
        """
        new_urgent_tasks = []
        
        if not hasattr(self, 'current_demand_data'):
            return new_urgent_tasks
        
        lambda_r = self.current_demand_data['lambda_r']
        L_r = self.current_demand_data['L_r']
        w_r = self.current_demand_data['w_r']
        
        for restroom_id in self.restrooms.keys():
            # Aggregate current conditions
            total_arrival_rate = 0
            total_queue_length = 0
            max_waiting_time = 0
            
            for gender in ['M', 'F']:
                section_id = f"{restroom_id}-{gender}"
                if section_id in lambda_r and t_idx < len(lambda_r[section_id]):
                    total_arrival_rate += lambda_r[section_id][t_idx]
                    total_queue_length += L_r[section_id][t_idx]
                    max_waiting_time = max(max_waiting_time, w_r[section_id][t_idx])
            
            # Check for emergency conditions (highest priority)
            emergency_triggered = False
            call_in_triggered = False
            priority = 1
            task_type = CleaningType.CALL_IN
            
            # Critical emergency conditions
            if total_queue_length > 1.5 or max_waiting_time > 120:  # 2+ minute waits
                emergency_triggered = True
                priority = 5
                task_type = CleaningType.EMERGENCY
            
            # Random critical failures (pipe bursts, equipment failures)
            elif random.random() < 0.0003:  # 0.03% chance per time step
                emergency_triggered = True
                priority = 5
                task_type = CleaningType.EMERGENCY
            
            # High demand call-ins  
            elif total_queue_length > 0.8 or max_waiting_time > 60:  # 1+ minute waits
                call_in_triggered = True
                priority = 4
            
            # Moderate demand call-ins
            elif total_arrival_rate > 0.08:  # High traffic
                call_in_triggered = True
                priority = 3
            
            if emergency_triggered or call_in_triggered:
                # Check if we already have a recent urgent task for this restroom
                recent_urgent_tasks = [
                    t for t in self.cleaning_tasks 
                    if (t.restroom_id == restroom_id 
                        and t.priority >= 3
                        and abs(t.created_time - current_time) < 1800  # Within 30 minutes
                        and t.completion_time is None)
                ]
                
                if not recent_urgent_tasks:  # No recent urgent task
                    # Determine task ID and type
                    if emergency_triggered:
                        task_id = f"EMERGENCY_{self.emergency_task_counter:04d}"
                        self.emergency_task_counter += 1
                    else:
                        task_id = f"CALLIN_{self.call_in_task_counter:04d}"
                        self.call_in_task_counter += 1
                    
                    # Create urgent task with REALISTIC deadlines
                    if emergency_triggered:
                        # Emergency: 30 minutes is realistic considering crew availability  
                        deadline = current_time + 1800  # 30 minutes
                    else:
                        # Call-in: 1 hour is reasonable for urgent but not critical tasks
                        deadline = current_time + 3600  # 1 hour
                    
                    urgent_task = CleaningTask(
                        task_id=task_id,
                        restroom_id=restroom_id,
                        cleaning_type=task_type,
                        priority=priority,
                        estimated_duration=self.cleaning_durations[task_type],
                        required_time=current_time,  # Immediate
                        deadline=deadline,
                        created_time=current_time,
                        assigned_crew=[],
                        passenger_impact_score=self._calculate_passenger_impact(
                            total_arrival_rate, total_queue_length, max_waiting_time
                        )
                    )
                    
                    new_urgent_tasks.append(urgent_task)
                    
                    print(f"  URGENT: {task_type.value.title()} at {restroom_id} (Priority {priority}) - "
                          f"Queue: {total_queue_length:.1f}, Wait: {max_waiting_time:.0f}s")
        
        return new_urgent_tasks
    
    def _handle_crew_reassignment(self, urgent_tasks: List[CleaningTask], current_time: float):
        """
        Handle crew reassignment for urgent tasks, potentially interrupting lower-priority work.
        
        Args:
            urgent_tasks: List of urgent tasks needing immediate attention
            current_time: Current simulation time
        """
        for urgent_task in urgent_tasks:
            print(f"    Handling urgent task: {urgent_task.task_id}")
            
            # First, try to find idle crew
            idle_crew = [crew for crew in self.crew_members 
                        if (crew.status == CrewStatus.IDLE 
                            and self._is_crew_available(crew, current_time)
                            and self._can_crew_handle_task(crew, urgent_task, current_time))]
            
            if idle_crew:
                # Assign to best idle crew
                best_idle_crew = max(idle_crew, 
                                   key=lambda c: self._calculate_assignment_score_with_disruption(c, urgent_task, current_time))
                urgent_task.assigned_crew = [best_idle_crew.crew_id]
                
                # CRITICAL: Actually execute the assignment immediately
                self.execute_assignments({urgent_task.task_id: [best_idle_crew.crew_id]}, current_time)
                
                print(f"    Assigned to idle crew: {best_idle_crew.name}")
                continue
            
            # Debug: Check crew availability
            available_crew_count = 0
            idle_crew_count = 0
            for crew in self.crew_members:
                if self._is_crew_available(crew, current_time):
                    available_crew_count += 1
                    if crew.status == CrewStatus.IDLE:
                        idle_crew_count += 1
            
            print(f"    Debug: {available_crew_count} available crew, {idle_crew_count} idle crew")
            
            # Try to find ANY available crew, even if busy with lower priority
            available_crew = [crew for crew in self.crew_members 
                            if (self._is_crew_available(crew, current_time)
                                and self._can_crew_handle_task(crew, urgent_task, current_time))]
            
            if available_crew:
                # For emergencies, force assignment even if crew is busy
                if urgent_task.priority >= 4:  # Emergency
                    best_crew = max(available_crew, 
                                  key=lambda c: self._calculate_assignment_score_with_disruption(c, urgent_task, current_time))
                    
                    # Preempt if necessary
                    if best_crew.status != CrewStatus.IDLE:
                        self._preempt_crew_task(best_crew, urgent_task, current_time)
                        print(f"    Preempted {best_crew.name} for urgent task")
                    else:
                        urgent_task.assigned_crew = [best_crew.crew_id]
                        self.execute_assignments({urgent_task.task_id: [best_crew.crew_id]}, current_time)
                        print(f"    Assigned to crew: {best_crew.name}")
                    continue
            
            # If no crew can be found, check for preemption opportunities
            if urgent_task.priority >= 4:  # Only high-priority tasks can preempt
                preemptable_crew = self._find_preemptable_crew(urgent_task, current_time)
                
                if preemptable_crew:
                    self._preempt_crew_task(preemptable_crew, urgent_task, current_time)
                    print(f"    Preempted {preemptable_crew.name} for urgent task")
                else:
                    print(f"    No available crew for urgent task: {urgent_task.task_id}")
                    print(f"    Available crew details:")
                    for i, crew in enumerate(self.crew_members):
                        shift_active = crew.shift_start <= current_time <= crew.shift_end
                        can_handle = self._can_crew_handle_task(crew, urgent_task, current_time) if shift_active else False
                        print(f"      {crew.name}: Status={crew.status.value}, InShift={shift_active}, CanHandle={can_handle}")
            else:
                print(f"    No available crew for urgent task: {urgent_task.task_id}")
    
    def _find_preemptable_crew(self, urgent_task: CleaningTask, current_time: float) -> Optional[CleaningCrewMember]:
        """
        Find crew member working on lower-priority task that can be preempted.
        
        Args:
            urgent_task: Urgent task needing crew
            current_time: Current simulation time
            
        Returns:
            Crew member that can be preempted, or None
        """
        candidates = []
        
        for crew in self.crew_members:
            if crew.status not in [CrewStatus.CLEANING, CrewStatus.TRAVELING]:
                continue
            
            # Find current task
            current_task = None
            for task in self.cleaning_tasks:
                if (task.assigned_crew and crew.crew_id in task.assigned_crew 
                    and task.completion_time is None):
                    current_task = task
                    break
            
            if current_task and current_task.priority < urgent_task.priority:
                # Check if crew can handle urgent task
                if self._can_crew_handle_task(crew, urgent_task, current_time):
                    candidates.append((crew, current_task))
        
        if candidates:
            # Choose crew working on lowest priority task
            return min(candidates, key=lambda x: x[1].priority)[0]
        
        return None
    
    def _preempt_crew_task(self, crew: CleaningCrewMember, urgent_task: CleaningTask, current_time: float):
        """
        Preempt crew member's current task for urgent task.
        
        Args:
            crew: Crew member to preempt
            urgent_task: Urgent task to assign
            current_time: Current simulation time
        """
        # Find and interrupt current task
        for task in self.cleaning_tasks:
            if (task.assigned_crew and crew.crew_id in task.assigned_crew 
                and task.completion_time is None):
                
                # Remove crew from current task
                task.assigned_crew.remove(crew.crew_id)
                
                # If no crew left on task, reschedule it
                if not task.assigned_crew:
                    task.assigned_crew = []  # Reset for reassignment
                    task.required_time = current_time + 1800  # Reschedule for 30 min later
                    print(f"      Rescheduled interrupted task: {task.task_id}")
                
                break
        
        # Assign crew to urgent task
        urgent_task.assigned_crew = [crew.crew_id]
        
        # CRITICAL: Execute the assignment immediately
        self.execute_assignments({urgent_task.task_id: [crew.crew_id]}, current_time)
        
        print(f"      Successfully assigned {crew.name} to urgent task {urgent_task.task_id}")
    
    def _check_crew_supplies(self, crew: CleaningCrewMember, task: CleaningTask) -> bool:
        """
        Check if crew has enough supplies for the task.
        
        Args:
            crew: Crew member
            task: Cleaning task
            
        Returns:
            True if crew has sufficient supplies
        """
        supplies_needed = self.supplies_per_cleaning
        if task.cleaning_type == CleaningType.DEEP_CLEAN:
            supplies_needed *= 2  # Deep cleaning uses more supplies
        elif task.cleaning_type == CleaningType.EMERGENCY:
            supplies_needed *= 1.5  # Emergency cleaning uses extra supplies
        
        return crew.supplies_remaining >= supplies_needed
    
    def _calculate_restock_time(self, crew: CleaningCrewMember) -> float:
        """
        Calculate time needed for crew to restock supplies.
        
        Args:
            crew: Crew member
            
        Returns:
            Time needed to restock (seconds)
        """
        # Travel time to supply depot
        travel_time = self._calculate_travel_time(crew.current_location, self.supply_depot_location)
        
        # Travel back to current location  
        return_time = self._calculate_travel_time(self.supply_depot_location, crew.current_location)
        
        # Total restock time
        return travel_time + self.restock_time + return_time
    
    def _restock_crew_supplies(self, crew: CleaningCrewMember, current_time: float):
        """
        Send crew to restock supplies.
        
        Args:
            crew: Crew member to restock
            current_time: Current simulation time
        """
        restock_time = self._calculate_restock_time(crew)
        
        # Update crew status
        crew.status = CrewStatus.TRAVELING
        crew.current_task_end_time = current_time + restock_time
        crew.supplies_remaining = 100.0  # Full restock
        crew.last_restock_time = current_time
        
        # Add restock cost to total cost tracking
        if not hasattr(self, 'total_restock_cost'):
            self.total_restock_cost = 0.0
        self.total_restock_cost += self.restock_cost
    
    def _consume_supplies(self, crew: CleaningCrewMember, task: CleaningTask):
        """
        Consume supplies when completing a task.
        
        Args:
            crew: Crew member
            task: Completed task
        """
        supplies_used = self.supplies_per_cleaning
        
        if task.cleaning_type == CleaningType.DEEP_CLEAN:
            supplies_used *= 2
        elif task.cleaning_type == CleaningType.EMERGENCY:
            supplies_used *= 1.5
        
        crew.supplies_remaining = max(0, crew.supplies_remaining - supplies_used) 