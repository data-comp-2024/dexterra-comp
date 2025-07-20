"""
Configuration Management Module

Handles loading, validating, and processing JSON configuration files
for the multi-floor airport restroom simulator.
"""

import json
from typing import Dict, Any


class ConfigManager:
    """Manages configuration loading and validation for the simulator."""
    
    def __init__(self, config_path: str = None, config_dict: Dict = None):
        """
        Initialize configuration manager.
        
        Args:
            config_path: Path to JSON configuration file
            config_dict: Configuration dictionary (alternative to file)
        """
        if config_path:
            self.config = self.load_from_file(config_path)
        elif config_dict:
            self.config = config_dict
        else:
            raise ValueError("Either config_path or config_dict must be provided")
        
        self.validate_config()
    
    def load_from_file(self, config_path: str) -> Dict:
        """Load configuration from JSON file."""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Configuration file {config_path} not found")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in configuration file {config_path}: {e}")
    
    def validate_config(self):
        """Validate configuration parameters for multi-floor setup."""
        required_keys = ['floors', 'flights', 'restrooms', 'entry_points', 
                        'movement_speeds', 'choice_params', 'simulation']
        
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"Missing required configuration key: {key}")
        
        # Validate floors
        if not isinstance(self.config['floors'], list):
            raise ValueError("floors must be a list of floor numbers")
        
        # Validate flights
        for flight_id, flight in self.config['flights'].items():
            required_flight_keys = ['arrival_time', 'passengers', 'aircraft_type', 'gate', 'flow_type']
            for key in required_flight_keys:
                if key not in flight:
                    raise ValueError(f"Flight {flight_id} missing required key: {key}")
        
        # Validate restrooms
        for restroom_id, restroom in self.config['restrooms'].items():
            required_restroom_keys = ['floor', 'x', 'y', 'capacity_M', 'capacity_F']
            for key in required_restroom_keys:
                if key not in restroom:
                    raise ValueError(f"Restroom {restroom_id} missing required key: {key}")
        
        # Validate entry points
        for entry_id, entry in self.config['entry_points'].items():
            required_entry_keys = ['floor', 'x', 'y']
            for key in required_entry_keys:
                if key not in entry:
                    raise ValueError(f"Entry point {entry_id} missing required key: {key}")
    
    def get_movement_params(self) -> Dict:
        """Extract movement-related parameters."""
        return {
            'v_walk': self.config['movement_speeds']['walking'],
            'v_elevator': self.config['movement_speeds']['elevator'],
            'v_stairs': self.config['movement_speeds']['stairs'],
            'elevator_wait': self.config['movement_speeds'].get('elevator_wait', 30)
        }
    
    def get_choice_params(self) -> Dict:
        """Extract choice model parameters."""
        choice_params = self.config['choice_params']
        return {
            'beta_walk': choice_params['beta_walk'],
            'beta_wait': choice_params['beta_wait'],
            'beta_vertical': choice_params.get('beta_vertical', 2.0),
            'theta': choice_params['theta']
        }
    
    def get_simulation_params(self) -> Dict:
        """Extract simulation parameters."""
        sim_params = self.config['simulation']
        return {
            'dt': sim_params['time_step'],
            'T': sim_params['duration'],
            'alpha_arr': sim_params.get('alpha_arrival', 0.5),
            'alpha_dep': sim_params.get('alpha_departure', 0.3)
        }
    
    def get_floors(self) -> list:
        """Get sorted list of floors."""
        return sorted(self.config['floors'])
    
    def get_restrooms(self) -> Dict:
        """Get restroom configuration."""
        return self.config['restrooms']
    
    def get_entry_points(self) -> Dict:
        """Get entry point configuration."""
        return self.config['entry_points']
    
    def get_flights(self) -> Dict:
        """Get flight configuration."""
        return self.config['flights']
    
    def get_gate_mappings(self) -> Dict:
        """Get gate to entry point mappings."""
        return self.config.get('gate_mappings', {}) 