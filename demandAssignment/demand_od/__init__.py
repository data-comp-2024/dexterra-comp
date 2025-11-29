"""
Demand OD Package - Generate Origin-Destination demand matrices and simulate bathroom assignments
"""

__version__ = "1.0.0"

from .config import MALE_BATHROOMS
from .data_loader import load_data, preprocess_data
from .od_generator import create_unified_od_dataframe, get_daily_flows, attach_coordinates
from .simulation import (
    build_passenger_df_for_od,
    build_passenger_df_for_day,
    simulate_bathroom_assignment,
    simulate_bathroom_assignment_all_ods
)
from .visualization import (
    plot_airport_map,
    plot_security_flows_for_day,
    plot_queue_profiles,
    plot_system_profiles
)
from .json_export import (
    export_multi_od_results_to_json,
    export_wait_times_by_interval
)

__all__ = [
    'MALE_BATHROOMS',
    'load_data',
    'preprocess_data',
    'create_unified_od_dataframe',
    'get_daily_flows',
    'attach_coordinates',
    'build_passenger_df_for_od',
    'build_passenger_df_for_day',
    'simulate_bathroom_assignment',
    'simulate_bathroom_assignment_all_ods',
    'plot_airport_map',
    'plot_security_flows_for_day',
    'plot_queue_profiles',
    'plot_system_profiles',
    'export_multi_od_results_to_json',
    'export_wait_times_by_interval',
]

