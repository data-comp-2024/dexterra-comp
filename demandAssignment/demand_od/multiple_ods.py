#!/usr/bin/env python3
"""
Entry point script for multiple ODs demand assignment simulation.

Usage:
    python multiple_ods.py --date 2024-01-01
"""

import argparse
import sys
import os
from .data_loader import load_data, preprocess_data
from .od_generator import create_unified_od_dataframe
from .simulation import build_passenger_df_for_day, simulate_bathroom_assignment_all_ods
from .visualization import plot_queue_profiles, plot_system_profiles
from .json_export import export_multi_od_results_to_json, export_wait_times_by_interval
from .config import DEFAULT_P_BATHROOM, DEFAULT_MALE_SHARE


def main():
    parser = argparse.ArgumentParser(
        description='Simulate bathroom assignment for all OD pairs on a given day'
    )
    parser.add_argument(
        '--date',
        type=str,
        required=True,
        help='Date in YYYY-MM-DD format (e.g., 2024-01-01)'
    )
    parser.add_argument(
        '--data-dir',
        type=str,
        default='/Users/hesamrashidi/UofT/PhD/Semester 7/Craptimizer/data/GTAA flights arrival departure data 2024',
        help='Path to data directory'
    )
    parser.add_argument(
        '--flow-type',
        type=str,
        choices=['arrivals', 'departures'],
        default=None,
        help='[DEPRECATED] Flow type is now automatically detected from Origin/Destination. This parameter is ignored.'
    )
    parser.add_argument(
        '--p-bathroom',
        type=float,
        default=DEFAULT_P_BATHROOM,
        help=f'Probability of using bathroom (default: {DEFAULT_P_BATHROOM})'
    )
    parser.add_argument(
        '--male-share',
        type=float,
        default=DEFAULT_MALE_SHARE,
        help=f'Share of male passengers (default: {DEFAULT_MALE_SHARE})'
    )
    parser.add_argument(
        '--num-servers',
        type=int,
        default=10,
        help='Number of servers in M/M/k queue (default: 10)'
    )
    parser.add_argument(
        '--mean-service-min',
        type=float,
        default=3.0,
        help='Mean service time in minutes (default: 3.0)'
    )
    parser.add_argument(
        '--batch-minutes',
        type=float,
        default=5,
        help='Batch size in minutes for assignment (default: 5)'
    )
    parser.add_argument(
        '--bathrooms',
        type=str,
        nargs='+',
        default=None,
        help='Specific bathrooms to analyze (default: all)'
    )
    parser.add_argument(
        '--no-plots',
        action='store_true',
        help='Skip generating plots'
    )
    parser.add_argument(
        '--export-results-json',
        type=str,
        default=None,
        help='Path to export multi-OD results JSON file (e.g., results_2024-01-01.json)'
    )
    parser.add_argument(
        '--export-wait-times-json',
        type=str,
        default=None,
        help='Path to export wait times by interval JSON file (e.g., wait_times_2024-01-01.json)'
    )
    parser.add_argument(
        '--wait-interval-minutes',
        type=int,
        default=15,
        help='Interval size in minutes for wait times export (default: 15)'
    )
    
    args = parser.parse_args()
    
    # Load and preprocess data
    print(f"Loading data from {args.data_dir}...")
    df_arrivals, df_departures, df_gate_washroom_coords = load_data(args.data_dir)
    df_arrivals, df_departures, df_gate_washroom_coords = preprocess_data(
        df_arrivals, df_departures, df_gate_washroom_coords
    )
    
    # Create unified OD dataframe
    print("Creating unified OD dataframe...")
    df_unified = create_unified_od_dataframe(df_arrivals, df_departures)
    
    # Build passenger-level data for all ODs (automatically handles both arrivals and departures)
    print(f"Building passenger-level data for all ODs on {args.date}...")
    print("(Automatically detecting arrivals from Security and departures to Security)")
    try:
        df_pass_all = build_passenger_df_for_day(
            df_unified,
            date_str=args.date,
            p_bathroom=args.p_bathroom,
            male_share=args.male_share
        )
        print(f"Generated {len(df_pass_all)} passengers")
        arrivals_count = len(df_pass_all[df_pass_all['origin'] == 'Security'])
        departures_count = len(df_pass_all[df_pass_all['destination'] == 'Security'])
        print(f"  - Arrivals (from Security): {arrivals_count}")
        print(f"  - Departures (to Security): {departures_count}")
        print(f"Unique origins: {df_pass_all['origin'].nunique()}")
        print(f"Unique destinations: {df_pass_all['destination'].nunique()}")
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Simulate bathroom assignment
    print("Simulating bathroom assignment for all ODs...")
    try:
        results_all = simulate_bathroom_assignment_all_ods(
            df_pass_all,
            df_gate_washroom_coords,
            selected_bathrooms=args.bathrooms,
            num_servers=args.num_servers,
            mean_service_min=args.mean_service_min,
            batch_minutes=args.batch_minutes
        )
        print(f"Simulated assignments for {len(results_all)} bathrooms")
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Generate plots
    if not args.no_plots:
        print("Generating plots...")
        plot_queue_profiles(results_all, args.date, bathrooms_to_plot=args.bathrooms)
        plot_system_profiles(results_all, args.date, bathrooms_to_plot=args.bathrooms)
    
    # Print summary statistics
    print("\n=== Summary Statistics ===")
    for bathroom, data in results_all.items():
        df_b = data['df_passengers']
        print(f"\nBathroom: {bathroom}")
        print(f"  Total users: {len(df_b)}")
        print(f"  Average wait time: {df_b['wait_min'].mean():.2f} minutes")
        print(f"  Max wait time: {df_b['wait_min'].max():.2f} minutes")
        print(f"  Average service time: {df_b['service_min'].mean():.2f} minutes")
        print(f"  Max queue length: {data['queue_times'].max()}")
        if 'origin' in df_b.columns:
            print(f"  Unique origins: {df_b['origin'].nunique()}")
    
    # Export JSON files if requested
    if args.export_results_json:
        print(f"\nExporting multi-OD results to {args.export_results_json}...")
        export_multi_od_results_to_json(
            results_all,
            args.date,
            output_path=args.export_results_json
        )
        print(f"✓ Results exported successfully")
    
    if args.export_wait_times_json:
        print(f"\nExporting wait times by {args.wait_interval_minutes}-minute intervals to {args.export_wait_times_json}...")
        export_wait_times_by_interval(
            results_all,
            args.date,
            interval_minutes=args.wait_interval_minutes,
            output_path=args.export_wait_times_json
        )
        print(f"✓ Wait times exported successfully")
    
    return results_all


if __name__ == '__main__':
    main()

