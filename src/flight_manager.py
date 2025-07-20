"""
Flight Management Module

Handles flight scheduling, passenger flow generation, and deplaning/boarding logic
for the multi-floor airport restroom simulator.
"""

from typing import Dict, List, Tuple
import numpy as np


class FlightManager:
    """Manages flight schedules and passenger flows."""
    
    def __init__(self, flights_config: Dict, gate_mappings: Dict, entry_points: Dict):
        """
        Initialize flight manager.
        
        Args:
            flights_config: Flight configuration dictionary
            gate_mappings: Gate to entry point mapping
            entry_points: Entry point configuration
        """
        self.flights_config = flights_config
        self.gate_mappings = gate_mappings
        self.entry_points = entry_points
        self.flight_flows = {}
        
        self.process_flight_schedule()
    
    def process_flight_schedule(self):
        """Process flight schedule and create time-based passenger flows."""
        for flight_id, flight in self.flights_config.items():
            arrival_time = flight['arrival_time']  # seconds from simulation start
            passengers = flight['passengers']
            aircraft_type = flight['aircraft_type']
            flow_type = flight['flow_type']
            
            # Calculate flow parameters based on aircraft type and flow pattern
            if flow_type == 'deplaning':
                # Passengers exit aircraft over time
                deplaning_duration = self.get_deplaning_duration(aircraft_type)
                flow_rate = passengers / deplaning_duration  # (pax/s)
                flow_start = arrival_time
                flow_end = arrival_time + deplaning_duration
                
            elif flow_type == 'boarding':
                # Passengers arrive for departure flight
                # For boarding flights, arrival_time represents departure time
                departure_time = arrival_time
                boarding_start_offset = flight.get('boarding_start', 60*60)   # 1 hour before departure
                boarding_duration = flight.get('boarding_duration', 45*60)    # 45 minutes
                flow_rate = passengers / boarding_duration
                flow_start = max(0, departure_time - boarding_start_offset)  # Don't allow negative start times
                flow_end = flow_start + boarding_duration
                
            else:
                raise ValueError(f"Unknown flow_type: {flow_type}")
            
            self.flight_flows[flight_id] = {
                'rate': flow_rate,
                'start': flow_start, 
                'end': flow_end,
                'passengers': passengers,
                'gate': flight['gate'],
                'type': flow_type
            }
        
        print(f"  Flight schedule processed: {len(self.flight_flows)} flows")
    
    def get_deplaning_duration(self, aircraft_type: str) -> float:
        """Get deplaning duration based on aircraft type."""
        aircraft_durations = {
            'small': 300,      # 5 minutes (pax < 100)
            'medium': 600,     # 10 minutes (pax 100-200)
            'large': 900,      # 15 minutes (pax 200-300)
            'wide_body': 1200, # 20 minutes (pax > 300)
            'default': 600
        }
        return aircraft_durations.get(aircraft_type, aircraft_durations['default'])
    
    def get_entry_point_for_gate(self, gate: str) -> str:
        """Map gate to appropriate entry point."""
        return self.gate_mappings.get(gate, list(self.entry_points.keys())[0])
    
    def compute_flight_inflows(self, t: float, alpha_arr: float, alpha_dep: float) -> Dict[str, float]:
        """
        Compute passenger inflows from all active flights at time t.
        
        Args:
            t: Current time (s)
            alpha_arr: Arrival restroom usage fraction
            alpha_dep: Departure restroom usage fraction
        
        Returns:
            Dictionary of inflow rates by entry point (pax/s)
        """
        entry_inflows = {entry_id: 0.0 for entry_id in self.entry_points.keys()}
        
        for flight_id, flow in self.flight_flows.items():
            if flow['start'] <= t <= flow['end']:
                # Flight is active, passengers are flowing
                base_rate = flow['rate']  # (pax/s)
                
                # Apply restroom usage fraction
                if flow['type'] == 'deplaning':
                    usage_rate = base_rate * alpha_arr
                else:  # boarding
                    usage_rate = base_rate * alpha_dep
                
                # Route to appropriate entry point based on gate
                gate = flow['gate']
                entry_point = self.get_entry_point_for_gate(gate)
                
                if entry_point in entry_inflows:
                    entry_inflows[entry_point] += usage_rate
        
        return entry_inflows
    
    def get_flight_summary(self) -> Dict:
        """Get summary of flight schedule."""
        summary = {
            'total_flights': len(self.flights_config),
            'total_passengers': sum(f['passengers'] for f in self.flights_config.values()),
            'deplaning_flights': len([f for f in self.flights_config.values() if f['flow_type'] == 'deplaning']),
            'boarding_flights': len([f for f in self.flights_config.values() if f['flow_type'] == 'boarding']),
            'aircraft_types': {},
            'gates_used': set(f['gate'] for f in self.flights_config.values())
        }
        
        # Count aircraft types
        for flight in self.flights_config.values():
            aircraft_type = flight['aircraft_type']
            if aircraft_type not in summary['aircraft_types']:
                summary['aircraft_types'][aircraft_type] = 0
            summary['aircraft_types'][aircraft_type] += 1
        
        return summary 