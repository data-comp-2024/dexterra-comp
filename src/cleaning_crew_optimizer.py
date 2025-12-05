"""
==============================================================
🚽 CLEANING CREW OPTIMIZER — MANDATORY INPUT/OUTPUT SPECS
==============================================================

📥 REQUIRED INPUTS (constructor)
--------------------------------

CleaningCrewOptimizer(
    restrooms: dict,
    travel_time_matrix: dict[str, dict[str, float]],
    simulation_duration: float,
    dt: float
)

1) restrooms : dict[str → dict]
   Format:
       {
         "WC_ID" : {
             "floor" : int,
             "capacity_M": float,   # optional
             "capacity_F": float    # optional
         }
       }
   - Used only for WC definition (not travel time).
   - Does NOT define distances — matrix below does.

2) travel_time_matrix : dict of dicts (MANDATORY)
      travel_time_matrix[A][B] = travel time in seconds
   This defines ALL movement between washrooms and bases.
   No fallback exists. If a pair is missing → the simulation stops.

   Expected shape example:
       travel_time_matrix = {
           "R1": {"R2": 180, "R3": 240},
           "R2": {"R1": 180, "R3": 120},
           "R3": {"R1": 240, "R2": 120}
       }

   ✔ Must include travel times for every crew location → WC needed
   ✔ Travel is directional (R1→R2 may differ from R2→R1)
   ✔ Units = seconds

3) simulation_duration : float
      Duration of simulation, in seconds.
      Example: 6h → 6*3600 = 21600

4) dt : float
      Simulation time-step, in seconds.
      Example: 1 min → 60


📥 REQUIRED INPUTS TO run_optimization()
---------------------------------------

run_optimization(
    waiting_time_data: dict[str → np.ndarray],
    cleaning_requirements: list[(str, int)]
)

A) waiting_time_data : dict of time-series (seconds)
     Keys required: "<WC_ID>-M", "<WC_ID>-F"
     Length = simulation_duration / dt

     Example:
        {"R1-M": array([...]), "R1-F": array([...])}

B) cleaning_requirements : list of tuples
        (wc_id, number_of_cleanings)

        Example:
            [("R1",3),("R2",2)]


📤 OUTPUT — run_optimization returns:
-------------------------------------

results = {
    "kpi_timeline"      : list,
    "crew_assignments"  : list,
    "task_completions"  : list,
    "final_kpis"        : dict,
    "cost_breakdown"    : dict,
    "crew_performance"  : dict,
    "task_summary"      : dict,
    "crew_schedules"    : dict[str → list[events]],
}

Each crew_schedules[crew_id] is a list of dicts:
    {
        "start": float,        # seconds
        "end": float,          # seconds
        "task_id": str | None,
        "restroom_id": str | None,
        "status": "cleaning" | "traveling" | ...
    }

==============================================================
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
import pdb


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
    passenger_impact_score: float = 0.0
    disruption_cost: float = 0.0
    capacity_reduction: float = 0.0


class CleaningCrewOptimizer:
    """Main cleaning crew optimization system (wait-time + cleaning-requirements version)."""
    
    def __init__(self,
                 restrooms: Dict,
                 travel_time_matrix: Dict[str, Dict[str, float]],
                 simulation_duration: float,
                 dt: float,
                 config_path: str = "crew_config.json"):
        """
        Args:
            restrooms: Dict like {'R1': {'floor': 1, 'capacity_M': 0.4, 'capacity_F': 0.4}, ...}
            travel_time_matrix: Dict of dicts (MANDATORY), giving travel times in seconds:
                travel_time_matrix[from_location][to_location] = time_in_seconds
                Must include all bases and all restrooms used by crews/supplies.
            simulation_duration: Total simulation time (seconds)
            dt: Time step (seconds)
            config_path: Path to crew configuration JSON file
        """
        self.restrooms = restrooms
        self.travel_time_matrix = travel_time_matrix  # 🔴 store the mandatory matrix
        self.simulation_duration = simulation_duration
        self.dt = dt
        self.time_steps = np.arange(0, simulation_duration, dt)
        
        # Load configuration
        self.config = self._load_config(config_path)
        
        # Crew / tasks
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
        self.active_cleanings = {}  # {restroom_id: [task_ids]}
        
        # Usage tracking placeholders (not really used now)
        self.restroom_usage_counts = {restroom_id: 0.0 for restroom_id in self.restrooms.keys()}
        self.last_cleaning_time = {restroom_id: 0.0 for restroom_id in self.restrooms.keys()}
        
        # Config & crew
        self._setup_from_config()
        self._setup_crew_base_locations()
        self._initialize_crew()
        
        # Initialize empty schedules dict (one list per crew)
        self.crew_schedules: Dict[str, List[Dict]] = {
            crew.crew_id: [] for crew in self.crew_members
        }
    
    # ---------------- CONFIG / SETUP ----------------
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file or use defaults."""
        if not os.path.isabs(config_path):
            try:
                root_path = os.path.join(
                    os.path.dirname(os.path.dirname(__file__)),
                    config_path
                )
                if os.path.exists(root_path):
                    config_path = root_path
            except NameError:
                # __file__ may not exist (e.g. in notebooks), just use as-is
                pass
        
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            print(f"Warning: using default crew config (could not read {config_path}).")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Default configuration if no config file is found."""
        return {
            "crew_management": {
                "crew_members": [
                    {"name": "Alice Johnson", "shift_start_hours": 0.0, "shift_end_hours": 8.0,
                     "skill_level": 1.8, "hourly_rate": 22.0, "base_location": "Base_1"},
                    {"name": "Bob Smith", "shift_start_hours": 0.5, "shift_end_hours": 8.5,
                     "skill_level": 1.5, "hourly_rate": 19.0, "base_location": "Base_2"},
                    {"name": "Henry Clark", "shift_start_hours": 0.0, "shift_end_hours": 5.0,
                     "skill_level": 2.0, "hourly_rate": 25.0, "base_location": "Base_2"}
                ]
            },
            "cleaning_operations": {
                "cleaning_durations": {
                    "routine": 15.0,
                    "emergency": 25.0,
                    "call_in": 20.0,
                    "deep_clean": 45.0
                }
            },
            "supply_management": {
                "supply_depot_location": "Base_2",
                "supplies_per_cleaning": 15.0,
                "restock_time_minutes": 10.0,
                "restock_cost": 25.0
            }
        }
    
    def _setup_from_config(self):
        """Set up parameters from configuration file."""
        # Supply management
        supply_config = self.config.get('supply_management', {})
        self.supply_depot_location = supply_config.get('supply_depot_location', 'Base_2')
        self.supplies_per_cleaning = supply_config.get('supplies_per_cleaning', 15.0)
        self.restock_time = supply_config.get('restock_time_minutes', 10.0) * 60
        self.restock_cost = supply_config.get('restock_cost', 25.0)
        
        # Cleaning parameters
        self._setup_cleaning_parameters_from_config()
    
    def _setup_cleaning_parameters_from_config(self):
        cleaning_config = self.config.get('cleaning_operations', {})
        
        durations = cleaning_config.get('cleaning_durations', {})
        self.cleaning_durations = {
            CleaningType.ROUTINE: durations.get('routine', 15.0),
            CleaningType.EMERGENCY: durations.get('emergency', 25.0),
            CleaningType.CALL_IN: durations.get('call_in', 20.0),
            CleaningType.DEEP_CLEAN: durations.get('deep_clean', 45.0),
            CleaningType.USAGE_BASED: durations.get('usage_based', 15.0)
        }
        
        # Cost parameters / coefficients
        cost_config = cleaning_config.get('cost_parameters', {})
        self.overtime_multiplier = cost_config.get('overtime_multiplier', 1.5)
        self.travel_cost_per_minute = cost_config.get('travel_cost_per_minute', 0.5)
        self.disruption_cost_multiplier = cost_config.get('disruption_cost_multiplier', 50.0)
        self.capacity_reduction_per_cleaner = cost_config.get('capacity_reduction_per_cleaner', 0.3)
        
        # Other cost parameters
        self.base_hourly_rate = 18.0
        self.emergency_cost_multiplier = 2.0
        self.supply_cost_per_cleaning = 3.50
        
        # Quality / satisfaction parameters (kept for KPIs)
        self.hygiene_decay_rate = 0.1
        self.passenger_tolerance_threshold = 0.6
    
    def _setup_crew_base_locations(self):
        """Set up crew base locations for travel time calculations."""
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
                shift_start=config.get('shift_start_hours', 0.0) * 3600,
                shift_end=config.get('shift_end_hours', 8.0) * 3600,
                hourly_rate=config.get('hourly_rate', 20.0),
                skill_level=config.get('skill_level', 1.5)
            )
            self.crew_members.append(crew_member)
    
    # ---------------- INPUT PROCESSING ----------------
    
    def process_waiting_time_profile(self, w_r: Dict):
        """
        Store waiting time profile for real-time dynamic cleaning decisions.
        
        Args:
            w_r: Dict of waiting times by restroom section,
                 e.g. {'R1-M': np.array([...]), 'R1-F': np.array([...]), ...}
        """
        self.waiting_time_data = w_r
        self.call_in_task_counter = 1000
        self.emergency_task_counter = 2000
    
    def _schedule_cleanings_from_requirements(self, cleaning_requirements: List[Tuple[str, int]]):
        """
        Schedule routine cleaning tasks from external requirements.
        
        Args:
            cleaning_requirements: List of (restroom_id, num_times) pairs.
        """
        # Remove existing ROUTINE tasks
        self.cleaning_tasks = [
            t for t in self.cleaning_tasks
            if not (isinstance(t.task_id, str) and t.task_id.startswith("ROUTINE_"))
        ]
        
        task_id = 1
        for restroom_id, num_times in cleaning_requirements:
            if num_times <= 0:
                continue
            if restroom_id not in self.restrooms:
                continue
            
            step = self.simulation_duration / (num_times + 1)
            for k in range(1, num_times + 1):
                current_time = k * step
                task = CleaningTask(
                    task_id=f"ROUTINE_{task_id:04d}",
                    restroom_id=restroom_id,
                    cleaning_type=CleaningType.ROUTINE,
                    priority=2,
                    estimated_duration=self.cleaning_durations[CleaningType.ROUTINE],
                    required_time=current_time,
                    deadline=current_time + 1800,
                    created_time=0.0,
                    assigned_crew=[]
                )
                self.cleaning_tasks.append(task)
                task_id += 1
    
    # ---------------- CORE SCORING / ASSIGNMENT ----------------
    
    def _calculate_passenger_impact(self, arrival_rate: float,
                                    queue_length: float,
                                    waiting_time: float) -> float:
        """
        Calculate passenger impact score (0–100).
        In this simplified version, we mostly care about waiting_time.
        """
        arrival_impact = min(arrival_rate / 0.2, 1.0)
        queue_impact = min(queue_length / 10.0, 1.0)
        wait_impact = min(waiting_time / 600.0, 1.0)
        return (0.3 * arrival_impact + 0.4 * queue_impact + 0.3 * wait_impact) * 100
    
    def _is_crew_available(self, crew: CleaningCrewMember, current_time: float) -> bool:
        """Check if crew member is available for assignment."""
        if current_time < crew.shift_start or current_time > crew.shift_end:
            return False
        if crew.status in [CrewStatus.CLEANING, CrewStatus.TRAVELING, CrewStatus.BREAK]:
            if crew.current_task_end_time > current_time:
                return False
        return True
    
    def _check_crew_supplies(self, crew: CleaningCrewMember, task: CleaningTask) -> bool:
        supplies_needed = self.supplies_per_cleaning
        if task.cleaning_type == CleaningType.DEEP_CLEAN:
            supplies_needed *= 2
        elif task.cleaning_type == CleaningType.EMERGENCY:
            supplies_needed *= 1.5
        return crew.supplies_remaining >= supplies_needed
    
    def _can_crew_handle_task(self, crew: CleaningCrewMember,
                              task: CleaningTask,
                              current_time: float) -> bool:
        """Check if crew member can handle specific task."""
        if task.cleaning_type == CleaningType.EMERGENCY and not crew.emergency_response_capable:
            return False
        
        if not self._check_crew_supplies(crew, task):
            return False
        
        travel_time = self._calculate_travel_time(crew.current_location, task.restroom_id)
        completion_time = current_time + travel_time + (task.estimated_duration * 60)
        
        if task.deadline and completion_time > task.deadline:
            if task.priority >= 4:
                flexible_deadline = task.deadline + 1800
                if completion_time > flexible_deadline:
                    return False
            else:
                return False
        
        return True
    
    def _calculate_assignment_score(self, crew: CleaningCrewMember,
                                    task: CleaningTask,
                                    current_time: float) -> float:
        """Score (higher is better) for assigning crew to task."""
        score = 0.0
        
        # Skill match bonus
        if task.cleaning_type == CleaningType.DEEP_CLEAN:
            score += crew.skill_level * 20
        elif task.priority >= 4:
            score += crew.skill_level * 15
        
        # Distance penalty
        travel_time = self._calculate_travel_time(crew.current_location, task.restroom_id)
        score -= travel_time * 2
        
        # Urgency bonus
        if task.deadline:
            time_until_deadline = task.deadline - current_time
            if time_until_deadline < 1800:
                score += 30
        
        # Cost penalty (expensive crew slightly penalised)
        task_duration_hours = task.estimated_duration / 60.0
        task_cost = crew.hourly_rate * task_duration_hours
        score -= task_cost * 0.5
        
        # Passenger impact
        score += task.passenger_impact_score * 0.3
        
        return score
    
    def _calculate_assignment_score_with_disruption(self, crew: CleaningCrewMember,
                                                   task: CleaningTask,
                                                   current_time: float) -> float:
        """Here we just reuse the base score (no demand model anymore)."""
        return self._calculate_assignment_score(crew, task, current_time)
    
    def _get_bathroom_max_cleaners(self, restroom_id: str) -> int:
        total_capacity = (self.restrooms[restroom_id]['capacity_M'] +
                          self.restrooms[restroom_id]['capacity_F'])
        if total_capacity > 0.5:
            return 3
        elif total_capacity > 0.35:
            return 2
        else:
            return 1
    
    def _get_current_active_cleaners(self, restroom_id: str) -> int:
        return len(self.active_cleanings.get(restroom_id, []))
    
    def _determine_optimal_cleaner_count(self, task: CleaningTask,
                                         current_time: float,
                                         max_available: int) -> int:
        """Simplified: use priority only."""
        if max_available <= 0:
            return 0
        if task.priority >= 4:
            return min(2, max_available)
        return min(1, max_available)
    
    def _calculate_team_score(self, crew_combo: List[CleaningCrewMember],
                              task: CleaningTask,
                              current_time: float) -> float:
        """Team score (no disruption term)."""
        if not crew_combo:
            return float('-inf')
        
        individual_scores = [
            self._calculate_assignment_score(crew, task, current_time)
            for crew in crew_combo
        ]
        base_score = sum(individual_scores) / len(individual_scores)
        
        efficiency_bonus = len(crew_combo) * 10
        avg_skill = sum(crew.skill_level for crew in crew_combo) / len(crew_combo)
        skill_bonus = avg_skill * 5
        
        return base_score + efficiency_bonus + skill_bonus
    
    def _find_best_crew_combination(self, task: CleaningTask,
                                    available_crew: List[CleaningCrewMember],
                                    target_cleaners: int,
                                    current_time: float) -> List[CleaningCrewMember]:
        if target_cleaners <= 0 or not available_crew:
            return []
        
        suitable_crew = [
            crew for crew in available_crew
            if self._can_crew_handle_task(crew, task, current_time)
        ]
        if not suitable_crew:
            return []
        
        if target_cleaners == 1:
            best_crew = None
            best_score = float('-inf')
            for crew in suitable_crew:
                score = self._calculate_assignment_score_with_disruption(crew, task, current_time)
                if score > best_score:
                    best_score = score
                    best_crew = crew
            return [best_crew] if best_crew else []
        
        from itertools import combinations
        
        best_combo = None
        best_score = float('-inf')
        for combo_size in range(1, min(target_cleaners + 1, len(suitable_crew) + 1)):
            for combo in combinations(suitable_crew, combo_size):
                score = self._calculate_team_score(list(combo), task, current_time)
                if score > best_score:
                    best_score = score
                    best_combo = list(combo)
        return best_combo if best_combo else []
    
    def optimize_crew_assignment(self, current_time: float) -> Dict[str, List[str]]:
        """Assigns crew to tasks that are ready."""
        assignments: Dict[str, List[str]] = {}
        
        available_crew = [
            crew for crew in self.crew_members
            if self._is_crew_available(crew, current_time)
        ]
        
        pending_tasks = [
            task for task in self.cleaning_tasks
            if (not task.assigned_crew) and (task.completion_time is None)
            and (task.required_time <= current_time + 1800)
        ]
        
        pending_tasks.sort(key=lambda t: (
            -t.priority,
            t.deadline - current_time if t.deadline else float('inf'),
            -t.passenger_impact_score
        ))
        
        for task in pending_tasks:
            restroom_id = task.restroom_id
            max_cleaners = self._get_bathroom_max_cleaners(restroom_id)
            current_cleaners = self._get_current_active_cleaners(restroom_id)
            available_slots = max_cleaners - current_cleaners
            if available_slots <= 0:
                continue
            
            optimal_cleaners = self._determine_optimal_cleaner_count(task, current_time, available_slots)
            best_combo = self._find_best_crew_combination(task, available_crew, optimal_cleaners, current_time)
            
            if best_combo:
                task.assigned_crew = [c.crew_id for c in best_combo]
                assignments[task.task_id] = task.assigned_crew
                for c in best_combo:
                    if c in available_crew:
                        available_crew.remove(c)
        
        return assignments
    
    # ---------------- TRAVEL / SCHEDULING ----------------
    
    def _calculate_travel_time(self, from_wc: str, to_wc: str) -> float:
        """
        Travel time between locations using the travel_time_matrix.

        Special case:
            - if from_wc == to_wc → 0 seconds (already there).
        """
        # No travel if origin == destination
        if from_wc == to_wc:
            return 0.0

        # Normal case: look up in matrix
        if from_wc not in self.travel_time_matrix:
            raise KeyError(f"Missing travel times for origin '{from_wc}' in travel_time_matrix")

        if to_wc not in self.travel_time_matrix[from_wc]:
            raise KeyError(f"Missing travel time {from_wc} → {to_wc} in travel_time_matrix")

        return self.travel_time_matrix[from_wc][to_wc]


    
    def _record_crew_event(self, crew: CleaningCrewMember,
                           start_time: float,
                           end_time: float,
                           task_id: Optional[str],
                           restroom_id: Optional[str],
                           status: CrewStatus):
        """Append an event to this crew member's schedule."""
        self.crew_schedules[crew.crew_id].append({
            "start": start_time,
            "end": end_time,
            "task_id": task_id,
            "restroom_id": restroom_id,
            "status": status.value
        })
    
    def execute_assignments(self, assignments: Dict[str, List[str]], current_time: float):
        """Execute crew assignments, update status, and log schedule events."""
        for task_id, crew_ids in assignments.items():
            task = next(t for t in self.cleaning_tasks if t.task_id == task_id)
            
            for crew_id in crew_ids:
                crew = next(c for c in self.crew_members if c.crew_id == crew_id)
                travel_time = self._calculate_travel_time(crew.current_location, task.restroom_id)
                
                num_cleaners = len(crew_ids)
                adjusted_duration = task.estimated_duration / (num_cleaners ** 0.7)
                
                end_time = current_time + travel_time + (adjusted_duration * 60)
                
                # Log the event (one block including travel+cleaning)
                self._record_crew_event(
                    crew=crew,
                    start_time=current_time,
                    end_time=end_time,
                    task_id=task.task_id,
                    restroom_id=task.restroom_id,
                    status=CrewStatus.CLEANING
                )
                
                crew.status = CrewStatus.TRAVELING if travel_time > 0 else CrewStatus.CLEANING
                crew.current_task_end_time = end_time
                crew.current_location = task.restroom_id
            
            # Track active cleaning for capacity
            if task.restroom_id not in self.active_cleanings:
                self.active_cleanings[task.restroom_id] = []
            self.active_cleanings[task.restroom_id].append(task_id)
            
            # No demand model → disruption_cost stays 0
            task.disruption_cost = 0.0
            task.capacity_reduction = min(len(crew_ids) * self.capacity_reduction_per_cleaner, 1.0)
    
    def update_crew_status(self, current_time: float):
        """Update crew status based on current time and finish tasks."""
        for crew in self.crew_members:
            if crew.current_task_end_time > 0 and current_time >= crew.current_task_end_time:
                completed_task = None
                for task in self.cleaning_tasks:
                    if (task.assigned_crew and crew.crew_id in task.assigned_crew
                        and task.completion_time is None):
                        completed_task = task
                        break
                
                if completed_task:
                    # Check if all crew on that task are done
                    all_finished = True
                    for cid in completed_task.assigned_crew:
                        c = next(x for x in self.crew_members if x.crew_id == cid)
                        if c.current_task_end_time > current_time:
                            all_finished = False
                            break
                    
                    if all_finished:
                        completed_task.completion_time = current_time
                        if completed_task not in self.completed_tasks:
                            self.completed_tasks.append(completed_task)
                        
                        if completed_task.restroom_id in self.active_cleanings:
                            if completed_task.task_id in self.active_cleanings[completed_task.restroom_id]:
                                self.active_cleanings[completed_task.restroom_id].remove(completed_task.task_id)
                            if not self.active_cleanings[completed_task.restroom_id]:
                                del self.active_cleanings[completed_task.restroom_id]
                
                crew.status = CrewStatus.IDLE
                crew.current_task_end_time = 0.0
                if completed_task:
                    adjusted_duration = completed_task.estimated_duration / len(completed_task.assigned_crew)
                    crew.total_work_time += adjusted_duration
                    self._consume_supplies(crew, completed_task)
                    self.last_cleaning_time[completed_task.restroom_id] = current_time
                    if crew.supplies_remaining < self.supplies_per_cleaning:
                        self._restock_crew_supplies(crew, current_time)
    
    # ---------------- EMERGENCIES / CALL-INS (WAIT-BASED) ----------------
    
    def _check_for_real_time_call_ins(self, current_time: float, t_idx: int) -> List[CleaningTask]:
        """
        Create call-in / emergency tasks based on waiting times only.
        """
        new_urgent_tasks: List[CleaningTask] = []
        if not hasattr(self, 'waiting_time_data'):
            return new_urgent_tasks
        
        w_r = self.waiting_time_data
        
        for restroom_id in self.restrooms.keys():
            max_waiting_time = 0.0
            for gender in ['M', 'F']:
                section_id = f"{restroom_id}-{gender}"
                if section_id in w_r and t_idx < len(w_r[section_id]):
                    max_waiting_time = max(max_waiting_time, w_r[section_id][t_idx])
            
            if max_waiting_time <= 0:
                continue
            
            emergency_triggered = False
            call_in_triggered = False
            priority = 1
            task_type = CleaningType.CALL_IN
            
            if max_waiting_time > 120:
                emergency_triggered = True
                priority = 5
                task_type = CleaningType.EMERGENCY
            elif max_waiting_time > 60:
                call_in_triggered = True
                priority = 4
            elif max_waiting_time > 30:
                call_in_triggered = True
                priority = 3
            
            if emergency_triggered or call_in_triggered:
                recent_urgent = [
                    t for t in self.cleaning_tasks
                    if (t.restroom_id == restroom_id and t.priority >= 3
                        and abs(t.created_time - current_time) < 1800
                        and t.completion_time is None)
                ]
                if recent_urgent:
                    continue
                
                if emergency_triggered:
                    task_id = f"EMERGENCY_{self.emergency_task_counter:04d}"
                    self.emergency_task_counter += 1
                else:
                    task_id = f"CALLIN_{self.call_in_task_counter:04d}"
                    self.call_in_task_counter += 1
                
                deadline = current_time + (1800 if emergency_triggered else 3600)
                
                urgent_task = CleaningTask(
                    task_id=task_id,
                    restroom_id=restroom_id,
                    cleaning_type=task_type,
                    priority=priority,
                    estimated_duration=self.cleaning_durations[task_type],
                    required_time=current_time,
                    deadline=deadline,
                    created_time=current_time,
                    assigned_crew=[],
                    passenger_impact_score=self._calculate_passenger_impact(
                        arrival_rate=0.0,
                        queue_length=0.0,
                        waiting_time=max_waiting_time
                    )
                )
                new_urgent_tasks.append(urgent_task)
                
                print(f"  URGENT: {task_type.value.title()} at {restroom_id} (Priority {priority}) - "
                      f"Wait: {max_waiting_time:.0f}s")
        
        return new_urgent_tasks
    
    def _find_preemptable_crew(self, urgent_task: CleaningTask,
                               current_time: float) -> Optional[CleaningCrewMember]:
        candidates = []
        for crew in self.crew_members:
            if crew.status not in [CrewStatus.CLEANING, CrewStatus.TRAVELING]:
                continue
            current_task = None
            for task in self.cleaning_tasks:
                if (task.assigned_crew and crew.crew_id in task.assigned_crew
                    and task.completion_time is None):
                    current_task = task
                    break
            if current_task and current_task.priority < urgent_task.priority:
                if self._can_crew_handle_task(crew, urgent_task, current_time):
                    candidates.append((crew, current_task))
        if candidates:
            return min(candidates, key=lambda x: x[1].priority)[0]
        return None
    
    def _preempt_crew_task(self, crew: CleaningCrewMember,
                           urgent_task: CleaningTask,
                           current_time: float):
        for task in self.cleaning_tasks:
            if (task.assigned_crew and crew.crew_id in task.assigned_crew
                and task.completion_time is None):
                task.assigned_crew.remove(crew.crew_id)
                if not task.assigned_crew:
                    task.assigned_crew = []
                    task.required_time = current_time + 1800
                    setattr(task, "_was_preempted", True)
                    print(f"      Rescheduled interrupted task: {task.task_id}")
                break
        
        urgent_task.assigned_crew = [crew.crew_id]
        self.execute_assignments({urgent_task.task_id: [crew.crew_id]}, current_time)
        print(f"      Successfully assigned {crew.name} to urgent task {urgent_task.task_id}")
    
    def _handle_crew_reassignment(self, urgent_tasks: List[CleaningTask],
                                  current_time: float):
        for urgent_task in urgent_tasks:
            print(f"    Handling urgent task: {urgent_task.task_id}")
            
            idle_crew = [
                crew for crew in self.crew_members
                if (crew.status == CrewStatus.IDLE
                    and self._is_crew_available(crew, current_time)
                    and self._can_crew_handle_task(crew, urgent_task, current_time))
            ]
            
            if idle_crew:
                best_idle = max(
                    idle_crew,
                    key=lambda c: self._calculate_assignment_score_with_disruption(c, urgent_task, current_time)
                )
                urgent_task.assigned_crew = [best_idle.crew_id]
                self.execute_assignments({urgent_task.task_id: [best_idle.crew_id]}, current_time)
                print(f"    Assigned to idle crew: {best_idle.name}")
                continue
            
            available_crew = [
                crew for crew in self.crew_members
                if (self._is_crew_available(crew, current_time)
                    and self._can_crew_handle_task(crew, urgent_task, current_time))
            ]
            
            if available_crew and urgent_task.priority >= 4:
                best_crew = max(
                    available_crew,
                    key=lambda c: self._calculate_assignment_score_with_disruption(c, urgent_task, current_time)
                )
                if best_crew.status != CrewStatus.IDLE:
                    self._preempt_crew_task(best_crew, urgent_task, current_time)
                    print(f"    Preempted {best_crew.name} for urgent task")
                else:
                    urgent_task.assigned_crew = [best_crew.crew_id]
                    self.execute_assignments({urgent_task.task_id: [best_crew.crew_id]}, current_time)
                    print(f"    Assigned to crew: {best_crew.name}")
                continue
            
            if urgent_task.priority >= 4:
                preemptable = self._find_preemptable_crew(urgent_task, current_time)
                if preemptable:
                    self._preempt_crew_task(preemptable, urgent_task, current_time)
                    print(f"    Preempted {preemptable.name} for urgent task")
                else:
                    print(f"    No available crew for urgent task: {urgent_task.task_id}")
            else:
                print(f"    No available crew for urgent task: {urgent_task.task_id}")
    
    # ---------------- SUPPLIES & COSTS ----------------
    
    def _calculate_restock_time(self, crew: CleaningCrewMember) -> float:
        travel_time = self._calculate_travel_time(crew.current_location, self.supply_depot_location)
        return_time = self._calculate_travel_time(self.supply_depot_location, crew.current_location)
        return travel_time + self.restock_time + return_time
    
    def _restock_crew_supplies(self, crew: CleaningCrewMember, current_time: float):
        restock_time = self._calculate_restock_time(crew)
        end_time = current_time + restock_time
        
        # Log restock as a TRAVELING event (neutral task_id/restroom)
        self._record_crew_event(
            crew=crew,
            start_time=current_time,
            end_time=end_time,
            task_id=None,
            restroom_id=None,
            status=CrewStatus.TRAVELING
        )
        
        crew.status = CrewStatus.TRAVELING
        crew.current_task_end_time = end_time
        crew.supplies_remaining = 100.0
        crew.last_restock_time = current_time
        
        if not hasattr(self, 'total_restock_cost'):
            self.total_restock_cost = 0.0
        self.total_restock_cost += self.restock_cost
    
    def _consume_supplies(self, crew: CleaningCrewMember, task: CleaningTask):
        supplies_used = self.supplies_per_cleaning
        if task.cleaning_type == CleaningType.DEEP_CLEAN:
            supplies_used *= 2.0
        elif task.cleaning_type == CleaningType.EMERGENCY:
            supplies_used *= 1.5
        crew.supplies_remaining = max(0.0, crew.supplies_remaining - supplies_used)
    
    # ---------------- KPIs & SUMMARIES ----------------
    
    def calculate_kpis(self, current_time: float) -> Dict[str, float]:
        kpis: Dict[str, float] = {}
        
        # 1. Cost
        total_cost = 0.0
        for crew in self.crew_members:
            hours_worked = crew.total_work_time / 60.0
            shift_duration = (crew.shift_end - crew.shift_start) / 3600.0
            if hours_worked <= shift_duration:
                total_cost += hours_worked * crew.hourly_rate
            else:
                regular_cost = shift_duration * crew.hourly_rate
                overtime_hours = hours_worked - shift_duration
                overtime_cost = overtime_hours * crew.hourly_rate * self.overtime_multiplier
                total_cost += regular_cost + overtime_cost
        
        total_cost += len(self.completed_tasks) * self.supply_cost_per_cleaning
        if hasattr(self, 'total_restock_cost'):
            total_cost += self.total_restock_cost
        kpis['total_cost'] = total_cost
        
        # 2. Avg response for urgent tasks
        urgent_tasks = [
            t for t in self.completed_tasks
            if t.cleaning_type in [CleaningType.CALL_IN, CleaningType.EMERGENCY]
            and t.created_time > 0 and t.completion_time is not None
            and t.completion_time >= t.created_time
        ]
        if urgent_tasks:
            response_times = [(t.completion_time - t.created_time) / 60.0 for t in urgent_tasks]
            kpis['avg_response_time'] = float(np.mean(response_times))
        else:
            kpis['avg_response_time'] = 0.0
        
        # 3. Passenger satisfaction
        satisfaction_scores = []
        for task in self.completed_tasks:
            base_satisfaction = 85.0
            if task.deadline and task.completion_time and task.completion_time > task.deadline:
                delay_minutes = (task.completion_time - task.deadline) / 60.0
                penalty = min(delay_minutes * 2.0, 40.0)
                base_satisfaction -= penalty
            if task.assigned_crew:
                skills = []
                for cid in task.assigned_crew:
                    c = next(x for x in self.crew_members if x.crew_id == cid)
                    skills.append(c.skill_level)
                avg_skill = sum(skills) / len(skills)
                base_satisfaction += (avg_skill - 1.0) * 10.0
            satisfaction_scores.append(max(0.0, min(100.0, base_satisfaction)))
        kpis['passenger_satisfaction'] = float(np.mean(satisfaction_scores)) if satisfaction_scores else 85.0
        
        # 4. Crew utilisation
        active_crew = sum(1 for c in self.crew_members if c.shift_start <= current_time <= c.shift_end)
        busy_crew = sum(1 for c in self.crew_members if c.status in [CrewStatus.CLEANING, CrewStatus.TRAVELING])
        kpis['crew_utilization'] = (busy_crew / active_crew * 100.0) if active_crew > 0 else 0.0
        
        # 5. Emergency response time
        emergency_tasks = [
            t for t in self.completed_tasks
            if t.cleaning_type == CleaningType.EMERGENCY
            and t.created_time > 0 and t.completion_time is not None
            and t.completion_time >= t.created_time
        ]
        if emergency_tasks:
            rts = [(t.completion_time - t.created_time) / 60.0 for t in emergency_tasks]
            kpis['emergency_response_time'] = float(np.mean(rts))
        else:
            kpis['emergency_response_time'] = 0.0
        
        # 6. Task completion rate
        total_tasks = len(self.cleaning_tasks)
        completed_tasks = len(self.completed_tasks)
        kpis['task_completion_rate'] = (completed_tasks / total_tasks * 100.0) if total_tasks > 0 else 100.0
        
        # 7. Overtime hours
        overtime_hours = 0.0
        for c in self.crew_members:
            shift_duration = (c.shift_end - c.shift_start) / 3600.0
            hours_worked = c.total_work_time / 60.0
            if hours_worked > shift_duration:
                overtime_hours += (hours_worked - shift_duration)
        kpis['overtime_hours'] = overtime_hours
        
        # 8. Cleaning quality score
        quality_scores = []
        for task in self.completed_tasks:
            if task.assigned_crew:
                skills = []
                for cid in task.assigned_crew:
                    c = next(x for x in self.crew_members if x.crew_id == cid)
                    skills.append(c.skill_level)
                avg_skill = sum(skills) / len(skills)
            else:
                avg_skill = 1.5
            base_quality = 60 + avg_skill * 20
            if task.cleaning_type == CleaningType.ROUTINE:
                expected = self.cleaning_durations[CleaningType.ROUTINE]
                if task.estimated_duration >= expected:
                    base_quality += 5
            quality_scores.append(min(100.0, base_quality))
        kpis['cleaning_quality_score'] = float(np.mean(quality_scores)) if quality_scores else 80.0
        
        # 9. Disruption cost (here always 0 unless you manually change task.disruption_cost)
        total_disruption_cost = sum(t.disruption_cost for t in self.completed_tasks)
        kpis['disruption_cost'] = total_disruption_cost
        
        # 10. Average capacity reduction
        if self.completed_tasks:
            avg_cap_red = np.mean([t.capacity_reduction * 100.0 for t in self.completed_tasks])
        else:
            avg_cap_red = 0.0
        kpis['avg_capacity_reduction'] = avg_cap_red
        
        return kpis
    
    def _calculate_cost_breakdown(self) -> Dict:
        breakdown = {
            'labor_cost': 0.0,
            'overtime_cost': 0.0,
            'supply_cost': 0.0,
            'emergency_cost': 0.0,
            'restock_cost': getattr(self, 'total_restock_cost', 0.0)
        }
        for c in self.crew_members:
            hours_worked = c.total_work_time / 60.0
            shift_duration = (c.shift_end - c.shift_start) / 3600.0
            if hours_worked <= shift_duration:
                breakdown['labor_cost'] += hours_worked * c.hourly_rate
            else:
                breakdown['labor_cost'] += shift_duration * c.hourly_rate
                overtime_hours = hours_worked - shift_duration
                breakdown['overtime_cost'] += overtime_hours * c.hourly_rate * self.overtime_multiplier
        
        breakdown['supply_cost'] = len(self.completed_tasks) * self.supply_cost_per_cleaning
        emergency_tasks = [t for t in self.completed_tasks if t.priority >= 4]
        breakdown['emergency_cost'] = len(emergency_tasks) * self.supply_cost_per_cleaning * self.emergency_cost_multiplier
        return breakdown
    
    def _calculate_efficiency_score(self, crew: CleaningCrewMember,
                                    tasks: List[CleaningTask]) -> float:
        if not tasks:
            return 0.0
        score = crew.skill_level * 30
        score += len(tasks) * 2
        emergency_tasks = [t for t in tasks if t.priority >= 4]
        score += len(emergency_tasks) * 5
        shift_duration = (crew.shift_end - crew.shift_start) / 3600.0
        hours_worked = crew.total_work_time / 60.0
        if hours_worked > shift_duration:
            penalty = (hours_worked - shift_duration) * 3.0
            score -= penalty
        return max(0.0, min(100.0, score))
    
    def _analyze_crew_performance(self) -> Dict:
        performance = {}
        for crew in self.crew_members:
            tasks_completed = [
                t for t in self.completed_tasks
                if t.assigned_crew and crew.crew_id in t.assigned_crew
            ]
            performance[crew.crew_id] = {
                'name': crew.name,
                'tasks_completed': len(tasks_completed),
                'total_work_time_hours': crew.total_work_time / 60.0,
                'avg_task_duration': float(np.mean([t.estimated_duration for t in tasks_completed])) if tasks_completed else 0.0,
                'emergency_tasks': len([t for t in tasks_completed if t.priority >= 4]),
                'efficiency_score': self._calculate_efficiency_score(crew, tasks_completed)
            }
        return performance
    
    def _summarize_tasks(self) -> Dict:
        total_tasks = len(self.cleaning_tasks)
        completed_tasks = len(self.completed_tasks)
        task_types = {}
        for task_type in CleaningType:
            type_tasks = [t for t in self.cleaning_tasks if t.cleaning_type == task_type]
            completed_type_tasks = [t for t in self.completed_tasks if t.cleaning_type == task_type]
            task_types[task_type.value] = {
                'total': len(type_tasks),
                'completed': len(completed_type_tasks),
                'completion_rate': (len(completed_type_tasks) / len(type_tasks) * 100.0) if type_tasks else 0.0
            }
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'overall_completion_rate': (completed_tasks / total_tasks * 100.0) if total_tasks > 0 else 0.0,
            'by_type': task_types,
            'avg_passenger_impact': float(np.mean([t.passenger_impact_score for t in self.completed_tasks])) if self.completed_tasks else 0.0,
            'usage_based_cleanings': len([t for t in self.completed_tasks if str(t.task_id).startswith('USAGE_')]),
            'real_time_call_ins': len([t for t in self.completed_tasks if str(t.task_id).startswith('CALLIN_')]),
            'emergency_responses': len([t for t in self.completed_tasks if str(t.task_id).startswith('EMERGENCY_')]),
            'preempted_tasks': len([t for t in self.cleaning_tasks if hasattr(t, '_was_preempted')]),
            'total_restroom_usage': float(sum(self.restroom_usage_counts.values())),
            'restrooms_needing_attention': len([
                r for r, count in self.restroom_usage_counts.items()
                if count > 0.8 * getattr(self, 'usage_threshold_for_cleaning', 15)
            ])
        }
    
    # ---------------- MAIN SIMULATION ----------------
    
    def run_optimization(self,
                         waiting_time_data: Dict[str, np.ndarray],
                         cleaning_requirements: List[Tuple[str, int]]) -> Dict:
        """
        Run the cleaning crew optimization simulation.
        
        Args:
            waiting_time_data: dict of section_id -> np.array of waiting times (sec)
            cleaning_requirements: list of (restroom_id, num_cleanings)
        
        Returns:
            results dict with KPIs, costs, crew performance, task summary,
            AND crew_schedules.
        """
        results = {
            'kpi_timeline': [],
            'crew_assignments': [],
            'task_completions': [],
            'final_kpis': {},
            'cost_breakdown': {},
            'crew_performance': {},
            'task_summary': {},
            'crew_schedules': {}   # will be filled at the end
        }
        
        # Inputs
        self.process_waiting_time_profile(waiting_time_data)
        self._schedule_cleanings_from_requirements(cleaning_requirements)
        
        print("Running cleaning crew optimization simulation...")
        
        for t_idx, current_time in enumerate(self.time_steps):
            if t_idx % max(1, len(self.time_steps) // 10) == 0:
                progress = (t_idx / len(self.time_steps)) * 100
                print(f"  Progress: {progress:.0f}% (t={current_time/3600:.1f} hours)")
            
            self.update_crew_status(current_time)
            
            urgent_tasks = self._check_for_real_time_call_ins(current_time, t_idx)
            if urgent_tasks:
                self.cleaning_tasks.extend(urgent_tasks)
                self._handle_crew_reassignment(urgent_tasks, current_time)
            
            assignments = self.optimize_crew_assignment(current_time)
            if assignments:
                self.execute_assignments(assignments, current_time)
                results['crew_assignments'].append({
                    'time': current_time,
                    'assignments': assignments.copy()
                })
            
            if t_idx % max(1, int(3600 // self.dt)) == 0:
                kpis = self.calculate_kpis(current_time)
                kpis['time'] = current_time
                results['kpi_timeline'].append(kpis)
                for key, value in kpis.items():
                    if key != 'time' and key in self.kpi_history:
                        self.kpi_history[key].append(value)
        
        final_kpis = self.calculate_kpis(self.simulation_duration)
        final_kpis['time'] = self.simulation_duration
        if (not results['kpi_timeline'] or
                results['kpi_timeline'][-1]['time'] < self.simulation_duration):
            results['kpi_timeline'].append(final_kpis)
        
        results['final_kpis'] = final_kpis
        results['cost_breakdown'] = self._calculate_cost_breakdown()
        results['crew_performance'] = self._analyze_crew_performance()
        results['task_summary'] = self._summarize_tasks()
        
        # include schedule in results
        results['crew_schedules'] = self.crew_schedules
        
        results['simulation_duration'] = self.simulation_duration
        results['simulation_dt'] = self.dt
        results['total_time_steps'] = len(self.time_steps)
        
        print("Cleaning crew optimization completed!")
        return results


### RESULTS INSPECTION & USAGE EXAMPLE ###

if __name__ == "__main__":
    # --- 1. Simple restroom layout ---
    restrooms_example = {
        "R1": {"floor": 1, "capacity_M": 0.4, "capacity_F": 0.4},
        "R2": {"floor": 1, "capacity_M": 0.3, "capacity_F": 0.3},
        "R3": {"floor": 2, "capacity_M": 0.5, "capacity_F": 0.4},
    }

    # --- 1b. Travel time matrix (seconds) ---
    # Must include all origins/destinations the crews will use:
    # Bases (Base_1, Base_2) and restrooms (R1, R2, R3).
    travel_time_matrix_example = {
        "Base_1": {
            "R1": 120, "R2": 180, "R3": 240,
            "Base_2": 60, "Base_3": 90
        },
        "Base_2": {
            "R1": 120, "R2": 90,  "R3": 180,
            "Base_1": 60, "Base_3": 60
        },
        "Base_3": {
            "R1": 150, "R2": 120, "R3": 60,
            "Base_1": 90, "Base_2": 60
        },
        "R1": {
            "Base_1": 120, "Base_2": 120, "Base_3": 150,
            "R2": 60,  "R3": 180
        },
        "R2": {
            "Base_1": 180, "Base_2": 90,  "Base_3": 120,
            "R1": 60,  "R3": 120
        },
        "R3": {
            "Base_1": 240, "Base_2": 180, "Base_3": 60,
            "R1": 180, "R2": 120
        },
    }


    # --- 2. Simulation parameters ---
    simulation_duration = 4 * 3600   # 4 hours
    dt = 300                         # 5 minutes

    # --- 3. Waiting time data (all zero except one spike to trigger a call-in) ---
    n_steps = int(simulation_duration / dt)
    waiting_time_data_example = {}

    for rid in restrooms_example.keys():
        for gender in ["M", "F"]:
            sec_id = f"{rid}-{gender}"
            arr = np.zeros(n_steps)
            # Put a spike in waiting time in the middle of the simulation
            spike_idx = n_steps // 2
            arr[spike_idx] = 90  # 90s -> call-in for that section
            waiting_time_data_example[sec_id] = arr

    # --- 4. Cleaning requirements ---
    # (restroom_id, number_of_routine_cleanings_over_the_horizon)
    cleaning_requirements_example = [
        ("R1", 3),
        ("R2", 2),
        ("R3", 1),
    ]

    # --- 5. Create optimizer and run ---
    optimizer = CleaningCrewOptimizer(
        restrooms=restrooms_example,
        travel_time_matrix=travel_time_matrix_example,
        simulation_duration=simulation_duration,
        dt=dt
    )

    results = optimizer.run_optimization(
        waiting_time_data=waiting_time_data_example,
        cleaning_requirements=cleaning_requirements_example
    )

    # --- 6. Inspect outputs ---
    print("\nFinal KPIs:")
    for k, v in results["final_kpis"].items():
        if k != "time":
            print(f"  {k}: {v}")

    print("\nCost breakdown:")
    for k, v in results["cost_breakdown"].items():
        print(f"  {k}: {v}")

    print("\nTask summary:")
    print(results["task_summary"])

    # --- 7. Inspect crew schedules ---
    crew_schedules = results["crew_schedules"]
    print("\nAvailable crew IDs:", list(crew_schedules.keys()))

    first_crew_id = list(crew_schedules.keys())[0]
    print(f"\nSchedule for {first_crew_id}:")
    print(crew_schedules)
