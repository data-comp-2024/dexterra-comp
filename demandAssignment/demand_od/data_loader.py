"""
Data loading and preprocessing functions
"""

import pandas as pd
from .config import GATE_EXCEPTIONS, SECURITY_COORDS


def load_data(data_dir):
    """
    Load arrival, departure, and gate/washroom coordinate data.
    
    Parameters:
    -----------
    data_dir : str
        Path to directory containing the data files
        
    Returns:
    --------
    df_arrivals : pd.DataFrame
        Arrival flight data
    df_departures : pd.DataFrame
        Departure flight data
    df_gate_washroom_coords : pd.DataFrame
        Gate and washroom coordinates
    """
    df_arrivals = pd.read_excel(
        f'{data_dir}/Pax info YYZ.xlsx',
        sheet_name='Arrivals'
    )
    df_departures = pd.read_excel(
        f'{data_dir}/Pax info YYZ.xlsx',
        sheet_name='Departures'
    )
    df_gate_washroom_coords = pd.read_csv(
        f'{data_dir}/gates_washrooms.csv'
    )
    
    return df_arrivals, df_departures, df_gate_washroom_coords


def preprocess_data(df_arrivals, df_departures, df_gate_washroom_coords):
    """
    Preprocess the loaded data:
    - Normalize gate names
    - Add Security gate coordinates
    
    Parameters:
    -----------
    df_arrivals : pd.DataFrame
        Arrival flight data
    df_departures : pd.DataFrame
        Departure flight data
    df_gate_washroom_coords : pd.DataFrame
        Gate and washroom coordinates
        
    Returns:
    --------
    df_arrivals : pd.DataFrame
        Preprocessed arrival data
    df_departures : pd.DataFrame
        Preprocessed departure data
    df_gate_washroom_coords : pd.DataFrame
        Preprocessed coordinates with Security added
    """
    # Ensure gate columns are strings
    df_arrivals['Arr Gate'] = df_arrivals['Arr Gate'].astype(str)
    df_departures['Dep Gate'] = df_departures['Dep Gate'].astype(str)
    
    # Normalize gate names (truncate to 3 chars except exceptions)
    df_arrivals['Arr Gate'] = df_arrivals['Arr Gate'].apply(
        lambda x: x if x in GATE_EXCEPTIONS else x[:3]
    )
    df_departures['Dep Gate'] = df_departures['Dep Gate'].apply(
        lambda x: x if x in GATE_EXCEPTIONS else x[:3]
    )
    
    # Add Security gate coordinates
    df_gate_washroom_coords = pd.concat(
        [
            df_gate_washroom_coords,
            pd.DataFrame([SECURITY_COORDS])
        ],
        ignore_index=True
    )
    
    return df_arrivals, df_departures, df_gate_washroom_coords

