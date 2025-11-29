"""
Visualization functions for airport maps and demand patterns
"""

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch
from matplotlib.dates import DateFormatter
from itertools import combinations
import pandas as pd
import numpy as np
from .od_generator import get_daily_flows, attach_coordinates


def plot_airport_map(df_gate_washroom_coords):
    """
    Plot the airport map showing gates and bathrooms.
    
    Parameters:
    -----------
    df_gate_washroom_coords : pd.DataFrame
        DataFrame with columns: name, x, y
    """
    # Separate gates and bathrooms
    df_gates = df_gate_washroom_coords[
        ~df_gate_washroom_coords['name'].str.startswith('F')
    ]
    df_bathrooms = df_gate_washroom_coords[
        df_gate_washroom_coords['name'].str.startswith('F')
    ]
    
    # Plot the points
    plt.figure(figsize=(8, 8))
    plt.scatter(df_gates['x'], df_gates['y'], c='blue', label='Gates')
    plt.scatter(df_bathrooms['x'], df_bathrooms['y'], c='green', label='Bathrooms')
    
    # Annotate the points with their names
    annotations = []
    for _, row in df_gates.iterrows():
        annotation = plt.text(
            row['x'], row['y'] + 10,
            row['name'],
            fontsize=8, ha='center', color='blue'
        )
        annotations.append((row['x'], row['y'], annotation))
    
    for _, row in df_bathrooms.iterrows():
        annotation = plt.text(
            row['x'], row['y'] - 10,
            row['name'],
            fontsize=8, ha='center', color='red'
        )
        annotations.append((row['x'], row['y'], annotation))
    
    # Check for overlapping labels and adjust
    for (x1, y1, ann1), (x2, y2, ann2) in combinations(annotations, 2):
        bbox1 = ann1.get_window_extent(renderer=plt.gcf().canvas.get_renderer())
        bbox2 = ann2.get_window_extent(renderer=plt.gcf().canvas.get_renderer())
        if bbox1.overlaps(bbox2):
            ann2.set_position((x2, y2 - 20))
            plt.plot(
                [x2, x2], [y2, y2 - 20],
                color='gray', linestyle='--', linewidth=0.5
            )
    
    # Add labels and title
    plt.xlabel('X Coordinate')
    plt.ylabel('Y Coordinate')
    plt.title('Airport Map with Gates and Bathrooms')
    plt.legend()
    plt.grid(True)
    plt.show()


def draw_base_map(ax, df_gate_washroom_coords):
    """
    Draw the base airport map on a given axes.
    
    Parameters:
    -----------
    ax : matplotlib.axes.Axes
        Axes to draw on
    df_gate_washroom_coords : pd.DataFrame
        DataFrame with columns: name, x, y
    """
    df_gates = df_gate_washroom_coords[
        ~df_gate_washroom_coords['name'].str.startswith('F')
    ]
    df_bathrooms = df_gate_washroom_coords[
        df_gate_washroom_coords['name'].str.startswith('F')
    ]
    
    # Gates & bathrooms
    ax.scatter(df_gates['x'], df_gates['y'], c='blue', label='Gates')
    ax.scatter(df_bathrooms['x'], df_bathrooms['y'], c='green', label='Bathrooms')
    
    # Labels
    annotations = []
    for _, row in df_gates.iterrows():
        ann = ax.text(
            row['x'], row['y'] + 10,
            row['name'],
            fontsize=8, ha='center', color='blue'
        )
        annotations.append((row['x'], row['y'], ann))
    
    for _, row in df_bathrooms.iterrows():
        ann = ax.text(
            row['x'], row['y'] - 10,
            row['name'],
            fontsize=8, ha='center', color='red'
        )
        annotations.append((row['x'], row['y'], ann))
    
    # De-overlap labels
    renderer = ax.figure.canvas.get_renderer()
    for (x1, y1, ann1), (x2, y2, ann2) in combinations(annotations, 2):
        bbox1 = ann1.get_window_extent(renderer=renderer)
        bbox2 = ann2.get_window_extent(renderer=renderer)
        if bbox1.overlaps(bbox2):
            ann2.set_position((x2, y2 - 20))
            ax.plot(
                [x2, x2], [y2, y2 - 20],
                color='gray', linestyle='--', linewidth=0.5
            )
    
    ax.set_xlabel('X Coordinate')
    ax.set_ylabel('Y Coordinate')
    ax.grid(True)


def plot_security_flows_direction(df_flows_coords, direction, date_str, df_gate_washroom_coords):
    """
    Plot flows from or to Security.
    
    Parameters:
    -----------
    df_flows_coords : pd.DataFrame
        DataFrame with flow data and coordinates
    direction : str
        'from_security' or 'to_security'
    date_str : str
        Date string for title
    df_gate_washroom_coords : pd.DataFrame
        Coordinates dataframe
    """
    fig, ax = plt.subplots(figsize=(8, 8))
    draw_base_map(ax, df_gate_washroom_coords)
    
    # Filter for Security as origin or destination
    if direction == 'from_security':
        df_dir = df_flows_coords[df_flows_coords['Origin'] == 'Security'].copy()
        title = f'Flows FROM Security on {date_str}'
        cmap = plt.cm.Blues
    else:
        df_dir = df_flows_coords[df_flows_coords['Destination'] == 'Security'].copy()
        title = f'Flows TO Security on {date_str}'
        cmap = plt.cm.Reds
    
    if df_dir.empty:
        ax.set_title(title + ' (no flows)')
        plt.show()
        return
    
    pax_min, pax_max = df_dir['Pax'].min(), df_dir['Pax'].max()
    norm = plt.Normalize(vmin=pax_min, vmax=pax_max)
    
    # Assign different curvature per edge to reduce overlap
    n = len(df_dir)
    rads = np.linspace(-0.5, 0.5, n)
    
    for (rad, (_, row)) in zip(rads, df_dir.iterrows()):
        if direction == 'from_security':
            x_start, y_start = row['x_o'], row['y_o']  # Security
            x_end, y_end = row['x_d'], row['y_d']  # gates/bathrooms
        else:
            x_start, y_start = row['x_o'], row['y_o']  # gates/bathrooms
            x_end, y_end = row['x_d'], row['y_d']  # Security
        
        color = cmap(norm(row['Pax']))
        lw = 0.5 + 4 * (row['Pax'] - pax_min) / (pax_max - pax_min + 1e-9)
        
        arrow = FancyArrowPatch(
            (x_start, y_start),
            (x_end, y_end),
            connectionstyle=f"arc3,rad={rad}",
            arrowstyle='-|>',
            linewidth=lw,
            alpha=0.8,
            color=color,
        )
        ax.add_patch(arrow)
    
    # Highlight Security node
    sec_row = df_gate_washroom_coords[
        df_gate_washroom_coords['name'] == 'Security'
    ].iloc[0]
    ax.scatter(
        sec_row['x'], sec_row['y'],
        s=80, edgecolor='black', facecolor='yellow', zorder=5
    )
    
    ax.set_title(title)
    ax.legend(loc='lower right')
    
    # Colorbar for Pax
    sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    cbar = fig.colorbar(sm, ax=ax, pad=0.02)
    cbar.set_label('Total Pax')
    
    plt.tight_layout()
    plt.show()


def plot_security_flows_for_day(df_unified, date_str, df_gate_washroom_coords):
    """
    Plot flows from and to Security for a given day.
    
    Parameters:
    -----------
    df_unified : pd.DataFrame
        Unified OD dataframe
    date_str : str
        Date string in format 'YYYY-MM-DD'
    df_gate_washroom_coords : pd.DataFrame
        Coordinates dataframe
    """
    df_flows = get_daily_flows(df_unified, date_str)
    df_flows_coords = attach_coordinates(df_flows, df_gate_washroom_coords)
    
    # Plot two separate figures
    plot_security_flows_direction(
        df_flows_coords, 'from_security', date_str, df_gate_washroom_coords
    )
    plot_security_flows_direction(
        df_flows_coords, 'to_security', date_str, df_gate_washroom_coords
    )


def plot_queue_profiles(results, date_str, bathrooms_to_plot=None):
    """
    Plot queue length profiles over time for selected bathrooms.
    
    Parameters:
    -----------
    results : dict
        Dictionary mapping bathroom name -> {'df_passengers': df, 'queue_times': Series}
    date_str : str
        Date string for title
    bathrooms_to_plot : list, optional
        List of bathroom names to plot (None = all)
    """
    if bathrooms_to_plot is None:
        bathrooms_to_plot = list(results.keys())
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    for b in bathrooms_to_plot:
        if b not in results:
            continue
        s = results[b]['queue_times'].sort_index()
        ax.step(s.index, s.values, where='post', label=b)
    
    ax.set_xlabel('Time')
    ax.set_ylabel('Queue length (people)')
    ax.set_title(f'Bathroom Queue Profiles on {date_str}')
    ax.legend()
    ax.xaxis.set_major_formatter(DateFormatter('%H:%M'))
    plt.grid(True)
    plt.tight_layout()
    plt.show()


def _compute_system_process(df_b):
    """
    Compute number of people in system (waiting + in service) over time.
    
    Parameters:
    -----------
    df_b : pd.DataFrame
        DataFrame with columns: arrival_bath_time, finish_service
        
    Returns:
    --------
    pd.Series
        Series with datetime index and system occupancy values
    """
    events = []
    for _, r in df_b.iterrows():
        events.append((r['arrival_bath_time'], +1))  # enters system
        events.append((r['finish_service'], -1))  # leaves system
    
    events = sorted(events, key=lambda x: x[0])
    
    times = []
    n_system = []
    cur = 0
    for t, delta in events:
        cur += delta
        times.append(t)
        n_system.append(cur)
    
    return pd.Series(n_system, index=pd.to_datetime(times)).sort_index()


def plot_system_profiles(results, date_str, bathrooms_to_plot=None):
    """
    Plot system occupancy (queue + in service) profiles over time.
    
    Parameters:
    -----------
    results : dict
        Dictionary mapping bathroom name -> {'df_passengers': df, 'queue_times': Series}
    date_str : str
        Date string for title
    bathrooms_to_plot : list, optional
        List of bathroom names to plot (None = all)
    """
    if bathrooms_to_plot is None:
        bathrooms_to_plot = list(results.keys())
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    for b in bathrooms_to_plot:
        if b not in results:
            continue
        df_b = results[b]['df_passengers']
        s_sys = _compute_system_process(df_b)
        ax.step(s_sys.index, s_sys.values, where='post', label=b)
    
    ax.set_xlabel('Time')
    ax.set_ylabel('Number in system (queue + in service)')
    ax.set_title(f'Bathroom System Profiles on {date_str}')
    ax.legend()
    ax.xaxis.set_major_formatter(DateFormatter('%H:%M'))
    ax.grid(True)
    plt.tight_layout()
    plt.show()

