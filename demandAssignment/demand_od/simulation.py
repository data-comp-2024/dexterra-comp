"""
Simulation functions for single and multiple OD bathroom assignments
"""

import pandas as pd
import numpy as np
from .utils import (
    generate_entry_times,
    precompute_bathroom_distances,
    precompute_all_origin_bathroom_distances,
    get_bathroom_lists
)
from .config import (
    MALE_BATHROOMS,
    DEFAULT_NUM_SERVERS,
    DEFAULT_MEAN_SERVICE_MIN,
    DEFAULT_BATCH_MINUTES
)


def build_passenger_df_for_od(
    df_unified,
    date_str,
    origin_node,
    dest_node,
    flow_type='departures',
    p_bathroom=None,
    male_share=None
):
    """
    Build passenger-level dataframe for a single OD pair on a given day.
    
    Parameters:
    -----------
    df_unified : pd.DataFrame
        Unified OD dataframe
    date_str : str
        Date string in format 'YYYY-MM-DD'
    origin_node : str
        Origin node name (e.g., gate number or 'Security')
    dest_node : str
        Destination node name
    flow_type : str
        'arrivals' or 'departures'
    p_bathroom : float, optional
        Probability of using bathroom (default from config)
    male_share : float, optional
        Share of male passengers (default from config)
        
    Returns:
    --------
    df_pass : pd.DataFrame
        Passenger-level dataframe with columns: entry_time, origin, destination,
        uses_bathroom, is_male
    """
    from .config import DEFAULT_P_BATHROOM, DEFAULT_MALE_SHARE
    
    if p_bathroom is None:
        p_bathroom = DEFAULT_P_BATHROOM
    if male_share is None:
        male_share = DEFAULT_MALE_SHARE
    
    selected_date = pd.to_datetime(date_str).date()
    mask = (
        (df_unified['Actual Arrival Time'].dt.date == selected_date) &
        (df_unified['Origin'] == origin_node) &
        (df_unified['Destination'] == dest_node)
    )
    df_od = df_unified[mask].copy()
    
    passengers = []
    
    for _, row in df_od.iterrows():
        pax = int(row['Pax'])
        if pax <= 0:
            continue
        
        entry_times = generate_entry_times(row['Actual Arrival Time'], pax, flow_type)
        
        # Bathroom usage flag
        uses_bathroom = np.random.rand(pax) < p_bathroom
        # Gender
        is_male = np.random.rand(pax) < male_share
        
        for i in range(pax):
            passengers.append({
                'entry_time': entry_times[i],
                'origin': row['Origin'],
                'destination': row['Destination'],
                'uses_bathroom': uses_bathroom[i],
                'is_male': is_male[i]
            })
    
    df_pass = pd.DataFrame(passengers)
    if df_pass.empty:
        raise ValueError("No passengers found for this day/OD.")
    
    df_pass.sort_values('entry_time', inplace=True)
    df_pass.reset_index(drop=True, inplace=True)
    
    return df_pass


def build_passenger_df_for_day(
    df_unified,
    date_str,
    p_bathroom=None,
    male_share=None
):
    """
    Build passenger-level dataframe for ALL OD pairs on a given day.
    Automatically detects arrivals (from Security) and departures (to Security)
    and uses appropriate entry time generation for each.
    
    Parameters:
    -----------
    df_unified : pd.DataFrame
        Unified OD dataframe
    date_str : str
        Date string in format 'YYYY-MM-DD'
    p_bathroom : float, optional
        Probability of using bathroom (default from config)
    male_share : float, optional
        Share of male passengers (default from config)
        
    Returns:
    --------
    df_pass : pd.DataFrame
        Passenger-level dataframe with columns: entry_time, origin, destination,
        uses_bathroom, is_male
    """
    from .config import DEFAULT_P_BATHROOM, DEFAULT_MALE_SHARE
    
    if p_bathroom is None:
        p_bathroom = DEFAULT_P_BATHROOM
    if male_share is None:
        male_share = DEFAULT_MALE_SHARE
    
    selected_date = pd.to_datetime(date_str).date()
    df_day = df_unified[df_unified['Actual Arrival Time'].dt.date == selected_date].copy()
    
    passengers = []
    
    for _, row in df_day.iterrows():
        pax = int(row['Pax'])
        if pax <= 0:
            continue
        
        # Determine flow type based on Origin/Destination
        # Arrivals: Origin = 'Security' -> flow_type = 'arrivals'
        # Departures: Destination = 'Security' -> flow_type = 'departures'
        if row['Origin'] == 'Security':
            flow_type = 'arrivals'
        elif row['Destination'] == 'Security':
            flow_type = 'departures'
        else:
            # Fallback: assume departures if neither matches
            flow_type = 'departures'
        
        entry_times = generate_entry_times(row['Actual Arrival Time'], pax, flow_type)
        uses_bathroom = np.random.rand(pax) < p_bathroom
        is_male = np.random.rand(pax) < male_share
        
        for i in range(pax):
            passengers.append({
                'entry_time': entry_times[i],
                'origin': row['Origin'],
                'destination': row['Destination'],
                'uses_bathroom': uses_bathroom[i],
                'is_male': is_male[i]
            })
    
    df_pass = pd.DataFrame(passengers)
    if df_pass.empty:
        raise ValueError("No passengers found for this day.")
    
    df_pass.sort_values('entry_time', inplace=True)
    df_pass.reset_index(drop=True, inplace=True)
    
    return df_pass


def simulate_bathroom_assignment(
    df_pass,
    df_coords,
    origin_node,
    selected_bathrooms=None,
    num_servers=None,
    mean_service_min=None,
    batch_minutes=None
):
    """
    Simulate bathroom assignment for a single OD pair using M/M/k queuing.
    
    Parameters:
    -----------
    df_pass : pd.DataFrame
        Passenger-level dataframe from build_passenger_df_for_od
    df_coords : pd.DataFrame
        Coordinates dataframe with columns: name, x, y
    origin_node : str
        Origin node name
    selected_bathrooms : list, optional
        List of bathroom names to consider (None = all)
    num_servers : int, optional
        Number of servers k in M/M/k (default from config)
    mean_service_min : float, optional
        Mean service time in minutes (default from config)
    batch_minutes : float, optional
        Batch size in minutes for assignment (default from config)
        
    Returns:
    --------
    results : dict
        Dictionary mapping bathroom name -> {
            'df_passengers': DataFrame,
            'queue_times': Series
        }
    """
    if num_servers is None:
        num_servers = DEFAULT_NUM_SERVERS
    if mean_service_min is None:
        mean_service_min = DEFAULT_MEAN_SERVICE_MIN
    if batch_minutes is None:
        batch_minutes = DEFAULT_BATCH_MINUTES
    
    # Precompute walking times
    dist_info = precompute_bathroom_distances(origin_node, df_coords)
    
    # Candidate bathrooms by gender (match notebook logic: get from dist_info.keys())
    all_baths = list(dist_info.keys())
    if selected_bathrooms is not None:
        all_baths = [b for b in all_baths if b in selected_bathrooms]
    
    male_baths = [b for b in all_baths if b in MALE_BATHROOMS]
    female_baths = [b for b in all_baths if b not in MALE_BATHROOMS]
    
    # Initialize server state
    global_start_min = df_pass['entry_time'].min().timestamp() / 60.0
    servers_free_time = {b: np.full(num_servers, global_start_min) for b in all_baths}
    
    records = []
    
    # Batching for MSA-style single-shot assignment
    start_time = df_pass['entry_time'].min()
    end_time = df_pass['entry_time'].max()
    batch_delta = pd.to_timedelta(batch_minutes, unit='m')
    current_t = start_time
    
    while current_t <= end_time:
        next_t = current_t + batch_delta
        
        mask_batch = (df_pass['entry_time'] >= current_t) & (df_pass['entry_time'] < next_t)
        df_batch = df_pass[mask_batch & df_pass['uses_bathroom']].copy()
        if df_batch.empty:
            current_t = next_t
            continue
        
        # Predicted waits per bathroom at batch start
        predicted_wait = {}
        current_min = current_t.timestamp() / 60.0
        for b in all_baths:
            earliest_free_min = servers_free_time[b].min()
            wait_min = max(0.0, earliest_free_min - current_min)
            predicted_wait[b] = wait_min
        
        # Assign and simulate passengers in this batch
        for _, row in df_batch.iterrows():
            is_male = row['is_male']
            entry_t = row['entry_time']
            
            candidates = male_baths if is_male else female_baths
            if not candidates:
                continue
            
            # Choose bathroom using generalized cost = walk + predicted_wait
            best_b = None
            best_cost = np.inf
            best_walk_t = None
            
            for b in candidates:
                _, walk_t = dist_info[b]
                cost = walk_t + 30*predicted_wait[b]
                if cost < best_cost:
                    best_cost = cost
                    best_b = b
                    best_walk_t = walk_t
            
            chosen_b = best_b
            walk_t = best_walk_t
            
            # Arrival to chosen bathroom
            arrival_bath_time = entry_t + pd.to_timedelta(walk_t, unit='m')
            arrival_min = arrival_bath_time.timestamp() / 60.0
            
            # M/M/k service logic at chosen bathroom
            free_times = servers_free_time[chosen_b]
            server_idx = np.argmin(free_times)
            earliest_free_min = free_times[server_idx]
            
            if arrival_min >= earliest_free_min:
                start_min = arrival_min
                wait_min = 0.0
            else:
                start_min = earliest_free_min
                wait_min = earliest_free_min - arrival_min
            
            # Exponential service time
            service_time_min = np.random.exponential(mean_service_min)
            finish_min = start_min + service_time_min
            
            # Update server's next free time
            servers_free_time[chosen_b][server_idx] = finish_min
            
            records.append({
                'entry_time': entry_t,
                'arrival_bath_time': arrival_bath_time,
                'bathroom': chosen_b,
                'start_service': pd.to_datetime(start_min * 60, unit='s'),
                'finish_service': pd.to_datetime(finish_min * 60, unit='s'),
                'wait_min': wait_min,
                'service_min': service_time_min,
                'is_male': is_male
            })
        
        current_t = next_t
    
    df_rec = pd.DataFrame(records)
    if df_rec.empty:
        raise ValueError("No bathroom users were simulated.")
    
    # Build queue length (WAITING ONLY) over time
    results = {}
    for b in all_baths:
        df_b = df_rec[df_rec['bathroom'] == b].copy()
        if df_b.empty:
            continue
        
        # Events: +1 when someone arrives, -1 when they finish
        events = []
        for _, r in df_b.iterrows():
            events.append((r['arrival_bath_time'], +1))
            events.append((r['finish_service'], -1))
        
        events = sorted(events, key=lambda x: x[0])
        
        times = []
        q_len = []
        n_system = 0
        
        for t, delta in events:
            n_system += delta
            q = max(0, n_system - num_servers)
            times.append(t)
            q_len.append(q)
        
        s_queue = pd.Series(q_len, index=pd.to_datetime(times)).sort_index()
        
        results[b] = {
            'df_passengers': df_b,
            'queue_times': s_queue
        }
    
    return results


def simulate_bathroom_assignment_all_ods(
    df_pass,
    df_coords,
    selected_bathrooms=None,
    num_servers=None,
    mean_service_min=None,
    batch_minutes=None
):
    """
    Simulate bathroom assignment for multiple ODs using M/M/k queuing.
    
    Parameters:
    -----------
    df_pass : pd.DataFrame
        Passenger-level dataframe from build_passenger_df_for_day
    df_coords : pd.DataFrame
        Coordinates dataframe with columns: name, x, y
    selected_bathrooms : list, optional
        List of bathroom names to consider (None = all)
    num_servers : int, optional
        Number of servers k in M/M/k (default from config)
    mean_service_min : float, optional
        Mean service time in minutes (default from config)
    batch_minutes : float, optional
        Batch size in minutes for assignment (default from config)
        
    Returns:
    --------
    results : dict
        Dictionary mapping bathroom name -> {
            'df_passengers': DataFrame,
            'queue_times': Series
        }
    """
    if num_servers is None:
        num_servers = DEFAULT_NUM_SERVERS
    if mean_service_min is None:
        mean_service_min = DEFAULT_MEAN_SERVICE_MIN
    if batch_minutes is None:
        batch_minutes = DEFAULT_BATCH_MINUTES
    
    # Nodes & bathrooms (match notebook logic)
    coord_map = df_coords.set_index('name')[['x', 'y']].to_dict('index')
    
    origins = df_pass['origin'].unique()
    all_baths = [name for name in coord_map.keys() if name.startswith('F')]
    if selected_bathrooms is not None:
        all_baths = [b for b in all_baths if b in selected_bathrooms]
    
    male_baths = [b for b in all_baths if b in MALE_BATHROOMS]
    female_baths = [b for b in all_baths if b not in MALE_BATHROOMS]
    
    # Precompute origin->bathroom distances
    dist_map = precompute_all_origin_bathroom_distances(df_coords, origins, all_baths)
    
    # Initialize server state
    start_time = df_pass['entry_time'].min()
    global_start_min = start_time.timestamp() / 60.0
    servers_free_time = {b: np.full(num_servers, global_start_min) for b in all_baths}
    
    records = []
    
    batch_delta = pd.to_timedelta(batch_minutes, unit='m')
    current_t = start_time
    end_time = df_pass['entry_time'].max()
    
    while current_t <= end_time:
        next_t = current_t + batch_delta
        
        mask_batch = (df_pass['entry_time'] >= current_t) & (df_pass['entry_time'] < next_t)
        df_batch = df_pass[mask_batch & df_pass['uses_bathroom']].copy()
        if df_batch.empty:
            current_t = next_t
            continue
        
        # Predicted waits at batch start
        current_min = current_t.timestamp() / 60.0
        predicted_wait = {}
        for b in all_baths:
            earliest_free_min = servers_free_time[b].min()
            predicted_wait[b] = max(0.0, earliest_free_min - current_min)
        
        # Assign and simulate this batch
        for _, row in df_batch.iterrows():
            origin = row['origin']
            is_male = row['is_male']
            entry_t = row['entry_time']
            
            candidates = male_baths if is_male else female_baths
            if not candidates:
                continue
            
            # Choose bathroom with min (walk + predicted_wait)
            best_b = None
            best_cost = np.inf
            best_walk_t = None
            
            for b in candidates:
                key = (origin, b)
                if key not in dist_map:
                    continue
                _, walk_t = dist_map[key]
                cost = walk_t + predicted_wait[b]
                if cost < best_cost:
                    best_cost = cost
                    best_b = b
                    best_walk_t = walk_t
            
            if best_b is None:
                continue
            
            chosen_b = best_b
            walk_t = best_walk_t
            
            # Arrival at bathroom
            arrival_bath_time = entry_t + pd.to_timedelta(walk_t, unit='m')
            arrival_min = arrival_bath_time.timestamp() / 60.0
            
            # M/M/k service logic
            free_times = servers_free_time[chosen_b]
            server_idx = np.argmin(free_times)
            earliest_free_min = free_times[server_idx]
            
            if arrival_min >= earliest_free_min:
                start_min = arrival_min
                wait_min = 0.0
            else:
                start_min = earliest_free_min
                wait_min = earliest_free_min - arrival_min
            
            service_time_min = np.random.exponential(mean_service_min)
            finish_min = start_min + service_time_min
            
            servers_free_time[chosen_b][server_idx] = finish_min
            
            records.append({
                'entry_time': entry_t,
                'origin': origin,
                'destination': row['destination'],
                'arrival_bath_time': arrival_bath_time,
                'bathroom': chosen_b,
                'start_service': pd.to_datetime(start_min * 60, unit='s'),
                'finish_service': pd.to_datetime(finish_min * 60, unit='s'),
                'wait_min': wait_min,
                'service_min': service_time_min,
                'is_male': is_male
            })
        
        current_t = next_t
    
    df_rec = pd.DataFrame(records)
    if df_rec.empty:
        raise ValueError("No bathroom users were simulated.")
    
    # Build queue length (WAITING ONLY) over time
    results = {}
    for b in all_baths:
        df_b = df_rec[df_rec['bathroom'] == b].copy()
        if df_b.empty:
            continue
        
        events = []
        for _, r in df_b.iterrows():
            events.append((r['arrival_bath_time'], +1))
            events.append((r['finish_service'], -1))
        
        events = sorted(events, key=lambda x: x[0])
        
        times = []
        q_len = []
        n_system = 0
        for t, delta in events:
            n_system += delta
            q = max(0, n_system - num_servers)
            times.append(t)
            q_len.append(q)
        
        s_queue = pd.Series(q_len, index=pd.to_datetime(times)).sort_index()
        results[b] = {
            'df_passengers': df_b,
            'queue_times': s_queue
        }
    
    return results

