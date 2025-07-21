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

Additionally, some time series forecasting models are included:
- ARIMAModel: Wrapper for statsmodels ARIMA
- ProphetModel: Wrapper for Facebook Prophet
- DayOfYearStatisticModel: Fallback option, a simple model that predicts based on historical statistics of the day of the year.
"""
import sys
import os
current_file_dir = os.path.dirname(os.path.abspath(__file__))

# Add the directory to sys.path
sys.path.append(current_file_dir)


from config_manager import ConfigManager
from flight_manager import FlightManager
from movement_model import MovementModel
from assignment_methods import AssignmentMethods
from queue_dynamics import QueueDynamics
from visualization import VisualizationManager
from simulator import MultiFloorAirportRestroomSimulator
from src.ts_arima import ARIMAModel
from src.ts_day_of_year_statistic_model import DayOfYearStatisticModel
from src.ts_prophet import ProphetModel

__all__ = [
    'ConfigManager',
    'FlightManager', 
    'MovementModel',
    'AssignmentMethods',
    'QueueDynamics',
    'VisualizationManager',
    'MultiFloorAirportRestroomSimulator',
    'ARIMAModel',
    'DayOfYearStatisticModel',
    'ProphetModel'
]

__version__ = "0.0.0"
__author__ = "Velaro Analytics Inc." 