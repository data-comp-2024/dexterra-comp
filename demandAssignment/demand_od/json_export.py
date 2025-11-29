"""
JSON export functions for simulation results
"""

import json
import pandas as pd
from datetime import datetime


def export_multi_od_results_to_json(results, date_str, output_path=None):
    """
    Export multi-OD simulation results to JSON format.
    
    Parameters:
    -----------
    results : dict
        Dictionary mapping bathroom name -> {
            'df_passengers': DataFrame,
            'queue_times': Series
        }
    date_str : str
        Date string for metadata
    output_path : str, optional
        Path to save JSON file (if None, returns JSON string)
        
    Returns:
    --------
    dict or None
        If output_path is None, returns dict. Otherwise saves to file and returns None.
    """
    export_data = {
        'metadata': {
            'date': date_str,
            'export_timestamp': datetime.now().isoformat(),
            'num_bathrooms': len(results)
        },
        'bathrooms': {}
    }
    
    for bathroom, data in results.items():
        df_passengers = data['df_passengers']
        
        # Convert DataFrame to list of dicts
        passengers_list = []
        for _, row in df_passengers.iterrows():
            passenger_dict = {
                'entry_time': row['entry_time'].isoformat() if pd.notna(row['entry_time']) else None,
                'arrival_bath_time': row['arrival_bath_time'].isoformat() if pd.notna(row['arrival_bath_time']) else None,
                'start_service': row['start_service'].isoformat() if pd.notna(row['start_service']) else None,
                'finish_service': row['finish_service'].isoformat() if pd.notna(row['finish_service']) else None,
                'wait_minutes': float(row['wait_min']) if pd.notna(row['wait_min']) else None,
                'service_minutes': float(row['service_min']) if pd.notna(row['service_min']) else None,
                'is_male': bool(row['is_male']) if pd.notna(row['is_male']) else None
            }
            
            # Add origin and destination if present
            if 'origin' in row:
                passenger_dict['origin'] = str(row['origin'])
            if 'destination' in row:
                passenger_dict['destination'] = str(row['destination'])
            
            passengers_list.append(passenger_dict)
        
        # Convert queue_times Series to list of (time, queue_length) pairs
        queue_times_list = []
        if not data['queue_times'].empty:
            for time, queue_len in data['queue_times'].items():
                queue_times_list.append({
                    'time': time.isoformat() if pd.notna(time) else None,
                    'queue_length': int(queue_len) if pd.notna(queue_len) else 0
                })
        
        # Calculate summary statistics
        summary = {
            'total_users': len(df_passengers),
            'avg_wait_minutes': float(df_passengers['wait_min'].mean()) if len(df_passengers) > 0 else 0.0,
            'max_wait_minutes': float(df_passengers['wait_min'].max()) if len(df_passengers) > 0 else 0.0,
            'avg_service_minutes': float(df_passengers['service_min'].mean()) if len(df_passengers) > 0 else 0.0,
            'max_queue_length': int(data['queue_times'].max()) if not data['queue_times'].empty else 0
        }
        
        export_data['bathrooms'][bathroom] = {
            'summary': summary,
            'passengers': passengers_list,
            'queue_times': queue_times_list
        }
    
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        return None
    else:
        return export_data


def export_wait_times_by_interval(results, date_str, interval_minutes=15, output_path=None):
    """
    Export wait times aggregated by time intervals (default 15 minutes).
    
    Parameters:
    -----------
    results : dict
        Dictionary mapping bathroom name -> {
            'df_passengers': DataFrame,
            'queue_times': Series
        }
    date_str : str
        Date string for metadata
    interval_minutes : int
        Interval size in minutes (default: 15)
    output_path : str, optional
        Path to save JSON file (if None, returns JSON string)
        
    Returns:
    --------
    dict or None
        If output_path is None, returns dict. Otherwise saves to file and returns None.
    """
    # Determine the time range for the day
    all_times = []
    for bathroom, data in results.items():
        df_passengers = data['df_passengers']
        if not df_passengers.empty:
            all_times.extend(df_passengers['arrival_bath_time'].tolist())
    
    if not all_times:
        # No data available
        export_data = {
            'metadata': {
                'date': date_str,
                'export_timestamp': datetime.now().isoformat(),
                'interval_minutes': interval_minutes,
                'note': 'No passenger data available'
            },
            'wait_times': {}
        }
    else:
        start_time = pd.Timestamp(min(all_times)).normalize()  # Start of day
        end_time = pd.Timestamp(max(all_times)).ceil(freq=f'{interval_minutes}T')  # Round up to next interval
        
        # Create time intervals
        intervals = pd.date_range(start=start_time, end=end_time, freq=f'{interval_minutes}T')
        
        export_data = {
            'metadata': {
                'date': date_str,
                'export_timestamp': datetime.now().isoformat(),
                'interval_minutes': interval_minutes,
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'num_intervals': len(intervals) - 1
            },
            'wait_times': {}
        }
        
        # Process each bathroom
        for bathroom, data in results.items():
            df_passengers = data['df_passengers']
            
            if df_passengers.empty:
                export_data['wait_times'][bathroom] = {}
                continue
            
            # Create intervals for this bathroom
            bathroom_intervals = {}
            
            for i in range(len(intervals) - 1):
                interval_start = intervals[i]
                interval_end = intervals[i + 1]
                
                # Filter passengers who arrived in this interval
                mask = (
                    (df_passengers['arrival_bath_time'] >= interval_start) &
                    (df_passengers['arrival_bath_time'] < interval_end)
                )
                df_interval = df_passengers[mask]
                
                if len(df_interval) > 0:
                    avg_wait = float(df_interval['wait_min'].mean())
                    max_wait = float(df_interval['wait_min'].max())
                    min_wait = float(df_interval['wait_min'].min())
                    count = len(df_interval)
                else:
                    avg_wait = None
                    max_wait = None
                    min_wait = None
                    count = 0
                
                interval_key = interval_start.strftime('%H:%M')
                bathroom_intervals[interval_key] = {
                    'interval_start': interval_start.isoformat(),
                    'interval_end': interval_end.isoformat(),
                    'passenger_count': count,
                    'avg_wait_minutes': avg_wait,
                    'min_wait_minutes': min_wait,
                    'max_wait_minutes': max_wait
                }
            
            export_data['wait_times'][bathroom] = bathroom_intervals
    
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        return None
    else:
        return export_data

