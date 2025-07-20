"""
Multi-Floor Airport Restroom Simulator

A modular simulation framework for analyzing passenger flow and restroom usage
in multi-floor airport terminals with complex flight schedules.

Main Components:
- ConfigManager: Configuration file handling
- FlightManager: Flight scheduling and passenger flows
- MovementModel: 3D movement and travel time calculations
- AssignmentMethods: Passenger choice models
- QueueDynamics: M/M/1 queue modeling
- VisualizationManager: Plotting and analysis
- MultiFloorAirportRestroomSimulator: Main orchestrator
"""

from config_manager import ConfigManager
from flight_manager import FlightManager
from movement_model import MovementModel
from assignment_methods import AssignmentMethods
from queue_dynamics import QueueDynamics
from visualization import VisualizationManager
from simulator import MultiFloorAirportRestroomSimulator

__all__ = [
    'ConfigManager',
    'FlightManager', 
    'MovementModel',
    'AssignmentMethods',
    'QueueDynamics',
    'VisualizationManager',
    'MultiFloorAirportRestroomSimulator'
]

__version__ = "0.0.0"
__author__ = "Velaro Analytics Inc." 