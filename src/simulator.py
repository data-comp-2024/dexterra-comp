"""
Main Simulator Module

Coordinates all components of the multi-floor airport restroom simulator.
"""

from typing import Dict, List, Optional
import numpy as np
from config_manager import ConfigManager
from flight_manager import FlightManager
from movement_model import MovementModel
from assignment_methods import AssignmentMethods
from queue_dynamics import QueueDynamics
from visualization import VisualizationManager


class MultiFloorAirportRestroomSimulator:
    """Main simulator class that orchestrates all components."""
    
    def __init__(self, config_path: str = None, config_dict: Dict = None):
        """
        Initialize the multi-floor airport restroom simulator.
        
        Args:
            config_path: Path to JSON configuration file
            config_dict: Configuration dictionary (alternative to file)
        """
        print("🏗️  Initializing Multi-Floor Airport Restroom Simulator...")
        
        # Load and validate configuration
        self.config_manager = ConfigManager(config_path=config_path, config_dict=config_dict)
        print("  Configuration loaded and validated")
        
        # Extract configuration components
        self.floors = self.config_manager.get_floors()
        self.restrooms = self.config_manager.get_restrooms()
        self.entry_points = self.config_manager.get_entry_points()
        self.flights = self.config_manager.get_flights()
        self.gate_mappings = self.config_manager.get_gate_mappings()
        
        # Get simulation parameters
        sim_params = self.config_manager.get_simulation_params()
        self.dt = sim_params['dt']
        self.T = sim_params['T']
        self.alpha_arr = sim_params['alpha_arr']
        self.alpha_dep = sim_params['alpha_dep']
        
        # Set up time steps
        self.n_steps = int(self.T / self.dt)
        self.time_steps = np.arange(0, self.T, self.dt)
        
        # Generate restroom sections (restroom_id-gender)
        self.restroom_sections = []
        for restroom_id in self.restrooms.keys():
            self.restroom_sections.extend([f"{restroom_id}-M", f"{restroom_id}-F"])
        
        # Initialize all components
        self._initialize_components()
        
        print(f"  Simulator initialized with {len(self.floors)} floors, "
              f"{len(self.restrooms)} restrooms, {len(self.flights)} flights")
        print(f"  Simulation: {self.T/60:.1f} minutes, {self.dt:.1f}s steps")
    
    def _initialize_components(self):
        """Initialize all simulator components."""
        # Flight management
        self.flight_manager = FlightManager(
            self.flights, self.gate_mappings, self.entry_points
        )
        
        # Movement modeling
        movement_params = self.config_manager.get_movement_params()
        self.movement_model = MovementModel(
            self.entry_points, self.restrooms, movement_params
        )
        
        # Assignment methods
        choice_params = self.config_manager.get_choice_params()
        self.assignment_methods = AssignmentMethods(
            choice_params, self.movement_model, self.restrooms
        )
        
        # Queue dynamics
        self.queue_dynamics = QueueDynamics(
            self.restroom_sections, self.restrooms, self.n_steps
        )
        
        # Visualization manager
        self.visualization = VisualizationManager(
            self.time_steps, self.restroom_sections, self.restrooms,
            self.floors, self.flight_manager.flight_flows
        )
    
    def run_simulation(self, assignment_method: str = 'logit', verbose: bool = True):
        """
        Run the complete simulation.
        
        Args:
            assignment_method: Choice model ('logit', 'deterministic', 'proportional')
            verbose: Print progress messages
        """
        if verbose:
            print(f"\n Running simulation with {assignment_method} assignment...")
        
        # Main simulation loop
        for t_idx in range(self.n_steps):
            current_time = self.time_steps[t_idx]
            
            # Progress reporting
            if verbose and t_idx % (self.n_steps // 10) == 0:
                progress = (t_idx / self.n_steps) * 100
                print(f"  Progress: {progress:.0f}% (t={current_time/60:.1f} min)")
            
            # Step 1: Compute flight-based inflows at entry points
            entry_inflows = self.flight_manager.compute_flight_inflows(
                current_time, self.alpha_arr, self.alpha_dep
            )
            
            # Step 2: Iterative flow assignment with dynamic utility updates
            self._assign_flows_iteratively(entry_inflows, t_idx, assignment_method)
            
            # Step 3: Update queue states for next time step
            self.queue_dynamics.update_queue_states(t_idx, self.dt)
            
            # Step 4: Update waiting times based on final queue states
            self.queue_dynamics.update_waiting_times(t_idx)
        
        if verbose:
            print(" Simulation completed!")
            self._print_summary()
    
    def _assign_flows_iteratively(self, entry_inflows: Dict[str, float], t_idx: int, assignment_method: str):
        """
        Iteratively assign flows with dynamic utility updates within a time step.
        
        Args:
            entry_inflows: Dictionary of inflow rates by entry point
            t_idx: Current time step index
            assignment_method: Assignment method to use
        """
        max_iterations = 5  # Limit iterations to prevent infinite loops
        convergence_threshold = 0.001  # Convergence criterion for flow changes
        
        # Initialize all section flows to zero for this time step
        for section_id in self.restroom_sections:
            self.queue_dynamics.set_arrival_rate(section_id, t_idx, 0.0)
        
        # Store previous flows for convergence checking
        prev_flows = {section_id: 0.0 for section_id in self.restroom_sections}
        
        for iteration in range(max_iterations):
            # Get current waiting times based on current queue states and flows
            waiting_times = self.queue_dynamics.get_current_waiting_times(t_idx)
            
            # Reset flows for this iteration
            new_flows = {section_id: 0.0 for section_id in self.restroom_sections}
            
            # Assign flows from each entry point
            for entry_id, total_inflow in entry_inflows.items():
                if total_inflow > 0:
                    # Split by gender (assume 50/50 for simplicity)
                    male_flow = total_inflow * 0.5
                    female_flow = total_inflow * 0.5
                    
                    for gender, flow in [('M', male_flow), ('F', female_flow)]:
                        if flow > 0:
                            # Compute costs to all relevant restroom sections
                            gender_sections = [s for s in self.restroom_sections if s.endswith(f'-{gender}')]
                            costs = {}
                            
                            for section_id in gender_sections:
                                waiting_time = waiting_times.get(section_id, 0)
                                cost = self.assignment_methods.compute_generalized_cost(
                                    entry_id, section_id, waiting_time
                                )
                                costs[section_id] = cost
                            
                            # Assign flows based on choice model
                            section_flows = self.assignment_methods.assign_flows(
                                flow, costs, assignment_method
                            )
                            
                            # Accumulate flows
                            for section_id, section_flow in section_flows.items():
                                new_flows[section_id] += section_flow
            
            # Update arrival rates in queue dynamics
            for section_id, flow in new_flows.items():
                self.queue_dynamics.set_arrival_rate(section_id, t_idx, flow)
            
            # Check for convergence
            max_change = max(abs(new_flows[s] - prev_flows[s]) for s in self.restroom_sections)
            if max_change < convergence_threshold:
                break
            
            # Store flows for next iteration
            prev_flows = new_flows.copy()
    
    def _print_summary(self):
        """Print simulation summary statistics."""
        print("\n SIMULATION SUMMARY:")
        
        # Flight summary
        flight_summary = self.flight_manager.get_flight_summary()
        print(f"  Flights: {flight_summary['total_flights']} total "
              f"({flight_summary['deplaning_flights']} arrivals, "
              f"{flight_summary['boarding_flights']} departures)")
        print(f"  Passengers: {flight_summary['total_passengers']} total")
        
        # Movement summary
        movement_summary = self.movement_model.get_movement_summary()
        print(f"  Movement: {movement_summary['avg_travel_time_s']:.1f}s avg travel time, "
              f"{movement_summary['vertical_movement_percentage']:.1f}% cross-floor trips")
        
        # Queue summary
        queue_stats = self.queue_dynamics.get_all_statistics(self.dt)
        total_served = sum(stats['total_passengers_served'] for stats in queue_stats.values())
        avg_wait = np.mean([stats['avg_waiting_time_s'] for stats in queue_stats.values()])
        max_wait = max(stats['max_waiting_time_s'] for stats in queue_stats.values())
        
        print(f"  Service: {total_served:.0f} passengers served, "
              f"{avg_wait:.1f}s avg wait, {max_wait:.1f}s max wait")
        
        # Stability check
        stability = self.queue_dynamics.check_system_stability()
        if stability['unstable_sections']:
            print(f"  {len(stability['unstable_sections'])} sections over capacity!")
        elif stability['high_utilization_sections']:
            print(f"  {len(stability['high_utilization_sections'])} sections >90% utilized")
        else:
            print("  All sections stable")
    
    def plot_results(self, group_by: str = 'floor', save_plot: str = None):
        """
        Plot simulation results.
        
        Args:
            group_by: Grouping method ('floor', 'restroom', 'section')
            save_plot: Path to save plot
        """
        self.visualization.plot_results(
            self.queue_dynamics.lambda_r,
            self.queue_dynamics.L_r,
            self.queue_dynamics.w_r,
            group_by=group_by,
            save_plot=save_plot
        )
    
    def create_dashboard(self, save_plot: str = None):
        """Create comprehensive visualization dashboard."""
        self.visualization.create_summary_dashboard(
            self.queue_dynamics.lambda_r,
            self.queue_dynamics.L_r,
            self.queue_dynamics.w_r,
            self.queue_dynamics,
            save_plot=save_plot
        )
    
    def plot_capacity_utilization(self, save_plot: str = None):
        """Plot capacity utilization analysis."""
        self.visualization.plot_capacity_utilization(
            self.queue_dynamics, save_plot=save_plot
        )
    
    def plot_flight_impact(self, save_plot: str = None):
        """Plot flight impact on restroom usage."""
        self.visualization.plot_flight_impact(
            self.queue_dynamics.lambda_r, save_plot=save_plot
        )
    
    def get_statistics(self) -> Dict:
        """Get comprehensive simulation statistics."""
        return {
            'flight_summary': self.flight_manager.get_flight_summary(),
            'movement_summary': self.movement_model.get_movement_summary(),
            'queue_statistics': self.queue_dynamics.get_all_statistics(self.dt),
            'stability_analysis': self.queue_dynamics.check_system_stability(),
            'capacity_utilization': self.queue_dynamics.get_capacity_utilization(),
            'simulation_parameters': {
                'duration_minutes': self.T / 60,
                'time_step_s': self.dt,
                'assignment_method': 'logit',  # Default
                'floors': self.floors,
                'restroom_count': len(self.restrooms),
                'flight_count': len(self.flights)
            }
        }
    
    # Expose internal data for compatibility
    @property
    def lambda_r(self):
        """Access arrival rate data."""
        return self.queue_dynamics.lambda_r
    
    @property
    def L_r(self):
        """Access queue length data."""
        return self.queue_dynamics.L_r
    
    @property
    def w_r(self):
        """Access waiting time data."""
        return self.queue_dynamics.w_r 