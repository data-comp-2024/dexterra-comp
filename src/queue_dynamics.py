"""
Queue Dynamics Module

Handles M/M/1 queue modeling, waiting time calculations, and queue state updates
for restroom sections.
"""

from typing import Dict, List
import numpy as np
import warnings


class QueueDynamics:
    """Manages queue dynamics for all restroom sections."""
    
    def __init__(self, restroom_sections: List[str], restrooms: Dict, n_steps: int):
        """
        Initialize queue dynamics.
        
        Args:
            restroom_sections: List of all restroom section IDs
            restrooms: Restroom configuration
            n_steps: Number of simulation time steps
        """
        self.restroom_sections = restroom_sections
        self.restrooms = restrooms
        self.n_steps = n_steps
        
        # Initialize arrays for queue state tracking
        self.lambda_r = {section: np.zeros(n_steps) for section in restroom_sections}  # Arrival rates (pax/s)
        self.L_r = {section: np.zeros(n_steps) for section in restroom_sections}       # Queue lengths (pax)
        self.w_r = {section: np.zeros(n_steps) for section in restroom_sections}       # Waiting times (s)
    
    def get_section_capacity(self, section_id: str) -> float:
        """
        Get service capacity for a restroom section.
        
        Args:
            section_id: Section identifier (e.g., 'R1A-M')
        
        Returns:
            Service capacity (pax/s)
        """
        restroom_id, gender = section_id.rsplit('-', 1)
        return self.restrooms[restroom_id][f'capacity_{gender}']
    
    def compute_waiting_time(self, lambda_r: float, capacity: float, current_queue: float = 0) -> float:
        """
        Compute waiting time using enhanced M/M/1 queue model with current queue state.
        
        Args:
            lambda_r: Arrival rate to restroom section (pax/s)
            capacity: Service capacity of restroom section (pax/s)
            current_queue: Current queue length (pax)
        
        Returns:
            Expected waiting time (s)
        """
        if lambda_r <= 0:
            return current_queue / capacity if capacity > 0 and current_queue > 0 else 0.0
        
        # Cap arrival rate to prevent instability
        if lambda_r >= capacity * 0.99:
            lambda_r = capacity * 0.95
        
        # Enhanced waiting time calculation accounting for current queue
        if current_queue > 0:
            # Queue already exists - calculate drain time plus M/M/1 steady state
            queue_drain_time = current_queue / capacity
            
            # Steady state M/M/1 component
            rho = lambda_r / capacity
            if rho < 0.99:  # Stable system
                steady_state_wait = rho / (capacity * (1 - rho))
            else:
                steady_state_wait = current_queue / capacity  # Linear approximation for high utilization
            
            return queue_drain_time + steady_state_wait
        else:
            # No existing queue - standard M/M/1
            rho = lambda_r / capacity
            if rho < 0.99:
                P_wait = rho / (1 + rho)
                waiting_time = P_wait / (capacity - lambda_r)
                return max(0, waiting_time)
            else:
                # High utilization - use approximation
                return lambda_r / (capacity * capacity) * 10  # Penalty for near-capacity
    
    def update_waiting_times(self, time_step: int):
        """
        Update waiting times for all sections at current time step using current queue states.
        
        Args:
            time_step: Current simulation time step
        """
        waiting_times = {}
        
        for section_id in self.restroom_sections:
            capacity = self.get_section_capacity(section_id)
            current_arrival_rate = self.lambda_r[section_id][time_step]
            current_queue = self.L_r[section_id][time_step]
            
            waiting_time = self.compute_waiting_time(current_arrival_rate, capacity, current_queue)
            self.w_r[section_id][time_step] = waiting_time
            waiting_times[section_id] = waiting_time
        
        return waiting_times
    
    def update_queue_states(self, time_step: int, dt: float):
        """
        Update queue states using improved continuous flow integration.
        
        Args:
            time_step: Current simulation time step
            dt: Time step size (s)
        """
        if time_step >= self.n_steps - 1:
            return  # Don't update for last time step
        
        for section_id in self.restroom_sections:
            capacity = self.get_section_capacity(section_id)
            
            current_queue = self.L_r[section_id][time_step]
            arrival_rate = self.lambda_r[section_id][time_step]
            
            # Continuous service rate model
            if current_queue <= 0:
                service_rate = 0  # No one to serve
            else:
                # Service rate approaches capacity as queue builds
                utilization_factor = min(1.0, current_queue / 2.0)  # Smooth ramp-up
                service_rate = capacity * utilization_factor
            
            # Enhanced Forward Euler with smoothing
            net_flow = arrival_rate - service_rate
            queue_change = dt * net_flow
            
            # Apply smoothing for small queue values to prevent oscillation
            new_queue = current_queue + queue_change
            if new_queue < 0.01:  # Small threshold to prevent tiny negative values
                new_queue = 0.0
            
            self.L_r[section_id][time_step + 1] = new_queue
    
    def add_arrivals(self, section_id: str, time_step: int, arrival_rate: float):
        """
        Add arrivals to a specific section at a time step.
        
        Args:
            section_id: Section identifier
            time_step: Time step index
            arrival_rate: Additional arrival rate (pax/s)
        """
        self.lambda_r[section_id][time_step] += arrival_rate
    
    def set_arrival_rate(self, section_id: str, time_step: int, arrival_rate: float):
        """
        Set (replace) arrival rate for a specific section at a time step.
        
        Args:
            section_id: Section identifier
            time_step: Time step index
            arrival_rate: New arrival rate (pax/s)
        """
        self.lambda_r[section_id][time_step] = arrival_rate
    
    def get_current_waiting_times(self, time_step: int) -> Dict[str, float]:
        """
        Get current waiting times for all sections based on current state.
        
        Args:
            time_step: Current time step
        
        Returns:
            Dictionary of waiting times by section
        """
        waiting_times = {}
        
        for section_id in self.restroom_sections:
            capacity = self.get_section_capacity(section_id)
            current_arrival_rate = self.lambda_r[section_id][time_step]
            current_queue = self.L_r[section_id][time_step]
            
            waiting_times[section_id] = self.compute_waiting_time(
                current_arrival_rate, capacity, current_queue
            )
        
        return waiting_times
    
    def get_section_statistics(self, section_id: str, dt: float) -> Dict:
        """
        Get statistics for a specific section.
        
        Args:
            section_id: Section identifier
            dt: Time step size (s)
        
        Returns:
            Dictionary with section statistics
        """
        return {
            'max_queue_length_pax': np.max(self.L_r[section_id]),
            'avg_queue_length_pax': np.mean(self.L_r[section_id]),
            'avg_waiting_time_s': np.mean(self.w_r[section_id]),
            'max_waiting_time_s': np.max(self.w_r[section_id]),
            'peak_arrival_rate_pax_per_s': np.max(self.lambda_r[section_id]),
            'avg_arrival_rate_pax_per_s': np.mean(self.lambda_r[section_id]),
            'total_passengers_served': np.sum(self.lambda_r[section_id]) * dt,
            'capacity_pax_per_s': self.get_section_capacity(section_id)
        }
    
    def get_all_statistics(self, dt: float) -> Dict:
        """
        Get statistics for all sections.
        
        Args:
            dt: Time step size (s)
        
        Returns:
            Dictionary with all section statistics
        """
        stats = {}
        for section_id in self.restroom_sections:
            stats[section_id] = self.get_section_statistics(section_id, dt)
        return stats
    
    def get_capacity_utilization(self, time_step: int = None) -> Dict[str, float]:
        """
        Get capacity utilization for all sections.
        
        Args:
            time_step: Specific time step (None for peak utilization)
        
        Returns:
            Dictionary of utilization percentages
        """
        utilization = {}
        
        for section_id in self.restroom_sections:
            capacity = self.get_section_capacity(section_id)
            
            if time_step is not None:
                arrival_rate = self.lambda_r[section_id][time_step]
            else:
                arrival_rate = np.max(self.lambda_r[section_id])  # Peak utilization
            
            utilization[section_id] = (arrival_rate / capacity) * 100 if capacity > 0 else 0
        
        return utilization
    
    def check_system_stability(self) -> Dict:
        """
        Check system stability and identify potential issues.
        
        Returns:
            Dictionary with stability analysis
        """
        stability_info = {
            'stable_sections': [],
            'unstable_sections': [],
            'high_utilization_sections': [],
            'warnings': []
        }
        
        for section_id in self.restroom_sections:
            capacity = self.get_section_capacity(section_id)
            peak_arrival = np.max(self.lambda_r[section_id])
            utilization = (peak_arrival / capacity) * 100
            
            if peak_arrival >= capacity * 0.99:
                stability_info['unstable_sections'].append({
                    'section': section_id,
                    'peak_arrival': peak_arrival,
                    'capacity': capacity,
                    'utilization': utilization
                })
                stability_info['warnings'].append(f"{section_id}: Arrival rate {peak_arrival:.3f} exceeds capacity {capacity:.3f}")
            elif utilization > 90:
                stability_info['high_utilization_sections'].append({
                    'section': section_id,
                    'utilization': utilization
                })
            else:
                stability_info['stable_sections'].append(section_id)
        
        return stability_info 