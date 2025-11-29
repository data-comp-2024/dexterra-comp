"""
OD (Origin-Destination) dataframe generation functions
"""

import pandas as pd


def create_unified_od_dataframe(df_arrivals, df_departures):
    """
    Create a unified OD dataframe from arrivals and departures.
    
    Parameters:
    -----------
    df_arrivals : pd.DataFrame
        Arrival flight data with columns: Arr Actual Arrival Time, Arr Flight Id,
        Arr Gate, Arr Pax
    df_departures : pd.DataFrame
        Departure flight data with columns: Dep Actual Arrival Time, Dep Flight Id,
        Dep Gate, Dep Pax
        
    Returns:
    --------
    df_unified : pd.DataFrame
        Unified dataframe with columns: Actual Arrival Time, Flight Id, Origin,
        Destination, Pax
    """
    # Create unified dataframe for arrivals
    df_arrivals_unified = df_arrivals.rename(columns={
        'Arr Actual Arrival Time': 'Actual Arrival Time',
        'Arr Flight Id': 'Flight Id',
        'Arr Gate': 'Destination',
        'Arr Pax': 'Pax'
    })
    df_arrivals_unified['Origin'] = 'Security'
    
    # Create unified dataframe for departures
    df_departures_unified = df_departures.rename(columns={
        'Dep Actual Arrival Time': 'Actual Arrival Time',
        'Dep Flight Id': 'Flight Id',
        'Dep Gate': 'Origin',
        'Dep Pax': 'Pax'
    })
    df_departures_unified['Destination'] = 'Security'
    
    # Combine both dataframes
    df_unified = pd.concat(
        [df_arrivals_unified, df_departures_unified],
        ignore_index=True
    )
    
    # Ensure datetime column
    df_unified['Actual Arrival Time'] = pd.to_datetime(df_unified['Actual Arrival Time'])
    
    return df_unified


def get_daily_flows(df_unified, date_str):
    """
    Get daily flows (OD pairs with passenger counts) for a specific date.
    
    Parameters:
    -----------
    df_unified : pd.DataFrame
        Unified OD dataframe
    date_str : str
        Date string in format 'YYYY-MM-DD', e.g. '2024-01-01'
        
    Returns:
    --------
    df_flows : pd.DataFrame
        DataFrame with columns: Origin, Destination, Pax
    """
    selected_date = pd.to_datetime(date_str).date()
    mask = df_unified['Actual Arrival Time'].dt.date == selected_date
    df_day = df_unified[mask]
    
    df_flows = (
        df_day
        .groupby(['Origin', 'Destination'], as_index=False)['Pax']
        .sum()
    )
    
    return df_flows


def attach_coordinates(df_flows, df_coords):
    """
    Attach coordinates to OD flows dataframe.
    
    Parameters:
    -----------
    df_flows : pd.DataFrame
        DataFrame with columns: Origin, Destination, Pax
    df_coords : pd.DataFrame
        DataFrame with columns: name, x, y
        
    Returns:
    --------
    df_flows_coords : pd.DataFrame
        DataFrame with columns: Origin, Destination, Pax, x_o, y_o, x_d, y_d
    """
    coords = df_coords[['name', 'x', 'y']]
    
    df_flows_coords = (
        df_flows
        .merge(coords, left_on='Origin', right_on='name')
        .rename(columns={'x': 'x_o', 'y': 'y_o'})
        .drop(columns='name')
        .merge(coords, left_on='Destination', right_on='name')
        .rename(columns={'x': 'x_d', 'y': 'y_d'})
        .drop(columns='name')
    )
    
    return df_flows_coords

