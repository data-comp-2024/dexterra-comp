#!/usr/bin/env python3
"""
Example script demonstrating JSON export functionality for multi-OD simulation results.

Usage:
    python export_json_example.py --date 2024-01-01
"""

import sys
import os
from demand_od import (
    load_data, preprocess_data,
    create_unified_od_dataframe,
    build_passenger_df_for_day,
    simulate_bathroom_assignment_all_ods,
    export_multi_od_results_to_json,
    export_wait_times_by_interval
)

# Configuration
DATA_DIR = '/Users/hesamrashidi/UofT/PhD/Semester 7/Craptimizer/data/GTAA flights arrival departure data 2024'
DATE_STR = '2024-01-01'

def main():
    print("=" * 60)
    print("Multi-OD Simulation with JSON Export")
    print("=" * 60)
    
    # Load and preprocess data
    print("\n1. Loading data...")
    df_arrivals, df_departures, df_gate_washroom_coords = load_data(DATA_DIR)
    df_arrivals, df_departures, df_gate_washroom_coords = preprocess_data(
        df_arrivals, df_departures, df_gate_washroom_coords
    )
    
    # Create unified OD dataframe
    print("\n2. Creating unified OD dataframe...")
    df_unified = create_unified_od_dataframe(df_arrivals, df_departures)
    
    # Build passenger-level data
    print(f"\n3. Building passenger-level data for {DATE_STR}...")
    df_pass_all = build_passenger_df_for_day(
        df_unified,
        date_str=DATE_STR,
        flow_type='departures',
        p_bathroom=0.4,
        male_share=0.5
    )
    print(f"   Generated {len(df_pass_all)} passengers")
    
    # Simulate bathroom assignment
    print("\n4. Simulating bathroom assignment...")
    results_all = simulate_bathroom_assignment_all_ods(
        df_pass_all,
        df_gate_washroom_coords,
        num_servers=10,
        mean_service_min=3.0,
        batch_minutes=5
    )
    print(f"   Simulated assignments for {len(results_all)} bathrooms")
    
    # Export multi-OD results JSON
    results_json_path = f'multi_od_results_{DATE_STR}.json'
    print(f"\n5. Exporting multi-OD results to {results_json_path}...")
    export_multi_od_results_to_json(
        results_all,
        DATE_STR,
        output_path=results_json_path
    )
    print(f"   ✓ Exported successfully")
    
    # Export wait times by 15-minute intervals JSON
    wait_times_json_path = f'wait_times_{DATE_STR}.json'
    print(f"\n6. Exporting wait times by 15-minute intervals to {wait_times_json_path}...")
    export_wait_times_by_interval(
        results_all,
        DATE_STR,
        interval_minutes=15,
        output_path=wait_times_json_path
    )
    print(f"   ✓ Exported successfully")
    
    print("\n" + "=" * 60)
    print("Export complete!")
    print(f"  - Results JSON: {results_json_path}")
    print(f"  - Wait times JSON: {wait_times_json_path}")
    print("=" * 60)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        DATE_STR = sys.argv[1]
    main()

