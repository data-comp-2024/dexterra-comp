#!/usr/bin/env python3
"""
Entry point script for single OD demand assignment simulation.

Usage:
    python single_od.py --date 2024-01-01 --origin 161 --destination Security
"""

import argparse
import sys
import pandas as pd
from .data_loader import load_data, preprocess_data
from .od_generator import create_unified_od_dataframe
from .simulation import build_passenger_df_for_od, simulate_bathroom_assignment
from .visualization import plot_queue_profiles, plot_system_profiles
from .config import MALE_BATHROOMS, DEFAULT_P_BATHROOM, DEFAULT_MALE_SHARE
from .utils import get_bathroom_lists


def main():
    parser = argparse.ArgumentParser(
        description='Simulate bathroom assignment for a single OD pair'
    )
    parser.add_argument(
        '--date',
        type=str,
        required=True,
        help='Date in YYYY-MM-DD format (e.g., 2024-01-01)'
    )
    parser.add_argument(
        '--origin',
        type=str,
        required=True,
        help='Origin node (e.g., gate number or "Security")'
    )
    parser.add_argument(
        '--destination',
        type=str,
        required=True,
        help='Destination node (e.g., gate number or "Security")'
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
        default='departures',
        help='Flow type: arrivals or departures'
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
        default=5,
        help='Number of servers in M/M/k queue (default: 5)'
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
        default=10,
        help='Batch size in minutes for assignment (default: 10)'
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
    
    # Build passenger-level data
    print(f"Building passenger-level data for OD: {args.origin} -> {args.destination}...")
    try:
        df_pass = build_passenger_df_for_od(
            df_unified,
            date_str=args.date,
            origin_node=args.origin,
            dest_node=args.destination,
            flow_type=args.flow_type,
            p_bathroom=args.p_bathroom,
            male_share=args.male_share
        )
        print(f"Generated {len(df_pass)} passengers")
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Get bathroom list
    all_baths, _, _ = get_bathroom_lists(df_gate_washroom_coords, args.bathrooms)
    
    # Simulate bathroom assignment
    print("Simulating bathroom assignment...")
    try:
        results = simulate_bathroom_assignment(
            df_pass,
            df_gate_washroom_coords,
            origin_node=args.origin,
            selected_bathrooms=args.bathrooms,
            num_servers=args.num_servers,
            mean_service_min=args.mean_service_min,
            batch_minutes=args.batch_minutes
        )
        print(f"Simulated assignments for {len(results)} bathrooms")
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Generate plots
    if not args.no_plots:
        print("Generating plots...")
        plot_queue_profiles(results, args.date, bathrooms_to_plot=args.bathrooms)
        plot_system_profiles(results, args.date, bathrooms_to_plot=args.bathrooms)
    
    # Print summary statistics
    print("\n=== Summary Statistics ===")
    for bathroom, data in results.items():
        df_b = data['df_passengers']
        print(f"\nBathroom: {bathroom}")
        print(f"  Total users: {len(df_b)}")
        print(f"  Average wait time: {df_b['wait_min'].mean():.2f} minutes")
        print(f"  Max wait time: {df_b['wait_min'].max():.2f} minutes")
        print(f"  Average service time: {df_b['service_min'].mean():.2f} minutes")
        print(f"  Max queue length: {data['queue_times'].max()}")
    
    return results


if __name__ == '__main__':
    main()

