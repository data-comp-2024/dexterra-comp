"""
Utility functions for distance calculations and entry time generation
"""

import pandas as pd
import numpy as np
from .config import (
    MALE_BATHROOMS,
    ARRIVAL_OFFSET_LOC,
    ARRIVAL_OFFSET_SCALE,
    ARRIVAL_OFFSET_MIN,
    ARRIVAL_OFFSET_MAX,
    DEPARTURE_OFFSET_LOC,
    DEPARTURE_OFFSET_SCALE,
    DEPARTURE_OFFSET_MIN,
    DEPARTURE_OFFSET_MAX,
    DEFAULT_WALK_SPEED_M_PER_MIN
)


def manhattan_dist(p1, p2):
    """Calculate Manhattan distance between two points."""
    return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1])


def generate_entry_times(flight_time, n, flow_type):
    """
    Generate entry times for passengers based on flight time and flow type.
    
    Parameters:
    -----------
    flight_time : pd.Timestamp
        Flight arrival/departure time
    n : int
        Number of passengers
    flow_type : str
        'arrivals' or 'departures'
        
    Returns:
    --------
    np.ndarray
        Array of Timestamp objects for passenger entry times
    """
    if flow_type == 'arrivals':
        # Tight 0–15 min after flight
        offsets_min = np.random.normal(
            loc=ARRIVAL_OFFSET_LOC,
            scale=ARRIVAL_OFFSET_SCALE,
            size=n
        )
        offsets_min = np.clip(
            offsets_min,
            ARRIVAL_OFFSET_MIN,
            ARRIVAL_OFFSET_MAX
        )
    else:  # 'departures'
        # Around 60 min before flight, say 30–90 min window
        offsets_min = np.random.normal(
            loc=DEPARTURE_OFFSET_LOC,
            scale=DEPARTURE_OFFSET_SCALE,
            size=n
        )
        offsets_min = np.clip(
            offsets_min,
            DEPARTURE_OFFSET_MIN,
            DEPARTURE_OFFSET_MAX
        )
    
    return flight_time + pd.to_timedelta(offsets_min, unit='m')


def precompute_bathroom_distances(origin_node, df_coords, walk_speed_m_per_min=None):
    """
    Precompute distances and walking times from an origin node to all bathrooms.
    
    Parameters:
    -----------
    origin_node : str
        Name of the origin node (e.g., gate name or 'Security')
    df_coords : pd.DataFrame
        DataFrame with columns: name, x, y
    walk_speed_m_per_min : float, optional
        Walking speed in meters per minute (default from config)
        
    Returns:
    --------
    dict
        Dictionary mapping bathroom name -> (distance_units, travel_time_minutes)
    """
    if walk_speed_m_per_min is None:
        walk_speed_m_per_min = DEFAULT_WALK_SPEED_M_PER_MIN
    
    coord_map = df_coords.set_index('name')[['x', 'y']].to_dict('index')
    
    if origin_node not in coord_map:
        raise ValueError(f"Origin node '{origin_node}' not found in coordinates")
    
    ox, oy = coord_map[origin_node]['x'], coord_map[origin_node]['y']
    
    distances = {}
    bathrooms = df_coords[df_coords['name'].str.startswith('F')]
    
    for _, row in bathrooms.iterrows():
        bx, by = row['x'], row['y']
        d = manhattan_dist((ox, oy), (bx, by))
        t_walk = d / walk_speed_m_per_min
        distances[row['name']] = (d, t_walk)
    
    return distances


def precompute_all_origin_bathroom_distances(df_coords, origins, bathrooms, walk_speed_m_per_min=None):
    """
    Precompute distances from all origin nodes to all bathrooms.
    
    Parameters:
    -----------
    df_coords : pd.DataFrame
        DataFrame with columns: name, x, y
    origins : list
        List of origin node names
    bathrooms : list
        List of bathroom names
    walk_speed_m_per_min : float, optional
        Walking speed in meters per minute (default from config)
        
    Returns:
    --------
    dict
        Dictionary mapping (origin, bathroom) -> (distance_units, walk_time_minutes)
    """
    if walk_speed_m_per_min is None:
        walk_speed_m_per_min = DEFAULT_WALK_SPEED_M_PER_MIN
    
    coord_map = df_coords.set_index('name')[['x', 'y']].to_dict('index')
    dist_map = {}
    
    for o in origins:
        if o not in coord_map:
            continue
        ox, oy = coord_map[o]['x'], coord_map[o]['y']
        for b in bathrooms:
            if b not in coord_map:
                continue
            bx, by = coord_map[b]['x'], coord_map[b]['y']
            d = abs(ox - bx) + abs(oy - by)
            t_walk = d / walk_speed_m_per_min
            dist_map[(o, b)] = (d, t_walk)
    
    return dist_map


def get_bathroom_lists(df_coords, selected_bathrooms=None):
    """
    Get lists of male and female bathrooms.
    
    Parameters:
    -----------
    df_coords : pd.DataFrame
        DataFrame with bathroom coordinates
    selected_bathrooms : list, optional
        If provided, only return bathrooms in this list
        
    Returns:
    --------
    all_bathrooms : list
        All bathroom names
    male_bathrooms : list
        Male bathroom names
    female_bathrooms : list
        Female bathroom names
    """
    all_bathrooms = df_coords[
        df_coords['name'].str.startswith('F')
    ]['name'].tolist()
    
    if selected_bathrooms is not None:
        all_bathrooms = [b for b in all_bathrooms if b in selected_bathrooms]
    
    male_bathrooms = [b for b in all_bathrooms if b in MALE_BATHROOMS]
    female_bathrooms = [b for b in all_bathrooms if b not in MALE_BATHROOMS]
    
    return all_bathrooms, male_bathrooms, female_bathrooms

