# Demand OD Package

A Python package for generating Origin-Destination (OD) demand matrices and simulating bathroom assignments for airport passenger flows.

## Structure

```
demand_od/
├── __init__.py          # Package initialization and exports
├── config.py            # Configuration constants
├── data_loader.py       # Data loading and preprocessing
├── od_generator.py      # OD dataframe generation
├── utils.py             # Utility functions (distances, entry times)
├── visualization.py    # Plotting functions
├── simulation.py        # Single and multiple OD simulations
├── single_od.py         # Entry point for single OD simulation
└── multiple_ods.py      # Entry point for multiple ODs simulation
```

## Installation

No special installation required. Just ensure you have the required dependencies:

```bash
pip install pandas numpy matplotlib openpyxl
```

## Usage

### Single OD Simulation

Simulate bathroom assignment for a single Origin-Destination pair:

```bash
python -m demand_od.single_od \
    --date 2024-01-01 \
    --origin 161 \
    --destination Security \
    --flow-type departures \
    --p-bathroom 0.3 \
    --num-servers 5
```

**Parameters:**
- `--date`: Date in YYYY-MM-DD format (required)
- `--origin`: Origin node (gate number or "Security") (required)
- `--destination`: Destination node (required)
- `--data-dir`: Path to data directory (optional, has default)
- `--flow-type`: 'arrivals' or 'departures' (default: departures)
- `--p-bathroom`: Probability of using bathroom (default: 0.4)
- `--male-share`: Share of male passengers (default: 0.5)
- `--num-servers`: Number of servers in M/M/k queue (default: 5)
- `--mean-service-min`: Mean service time in minutes (default: 3.0)
- `--batch-minutes`: Batch size for assignment (default: 10)
- `--bathrooms`: Specific bathrooms to analyze (default: all)
- `--no-plots`: Skip generating plots

### Multiple ODs Simulation

Simulate bathroom assignment for all OD pairs on a given day:

```bash
python -m demand_od.multiple_ods \
    --date 2024-01-01 \
    --flow-type departures \
    --p-bathroom 0.4 \
    --num-servers 10
```

**Parameters:**
- `--date`: Date in YYYY-MM-DD format (required)
- `--data-dir`: Path to data directory (optional, has default)
- `--flow-type`: 'arrivals' or 'departures' (default: departures)
- `--p-bathroom`: Probability of using bathroom (default: 0.4)
- `--male-share`: Share of male passengers (default: 0.5)
- `--num-servers`: Number of servers in M/M/k queue (default: 10)
- `--mean-service-min`: Mean service time in minutes (default: 3.0)
- `--batch-minutes`: Batch size for assignment (default: 5)
- `--bathrooms`: Specific bathrooms to analyze (default: all)
- `--no-plots`: Skip generating plots
- `--export-results-json`: Path to export multi-OD results JSON file
- `--export-wait-times-json`: Path to export wait times by interval JSON file
- `--wait-interval-minutes`: Interval size in minutes for wait times (default: 15)

**Example with JSON export:**
```bash
python -m demand_od.multiple_ods \
    --date 2024-01-01 \
    --export-results-json results_2024-01-01.json \
    --export-wait-times-json wait_times_2024-01-01.json \
    --wait-interval-minutes 15
```

## Programmatic Usage

You can also use the package programmatically:

```python
from demand_od import (
    load_data, preprocess_data,
    create_unified_od_dataframe,
    build_passenger_df_for_od,
    simulate_bathroom_assignment,
    plot_queue_profiles, plot_system_profiles
)

# Load data
data_dir = '/path/to/data'
df_arrivals, df_departures, df_coords = load_data(data_dir)
df_arrivals, df_departures, df_coords = preprocess_data(
    df_arrivals, df_departures, df_coords
)

# Create unified OD dataframe
df_unified = create_unified_od_dataframe(df_arrivals, df_departures)

# Build passenger-level data for single OD
df_pass = build_passenger_df_for_od(
    df_unified,
    date_str='2024-01-01',
    origin_node='161',
    dest_node='Security',
    flow_type='departures',
    p_bathroom=0.3,
    male_share=0.6
)

# Simulate bathroom assignment
results = simulate_bathroom_assignment(
    df_pass,
    df_coords,
    origin_node='161',
    num_servers=5,
    mean_service_min=3.0
)

# Visualize results
plot_queue_profiles(results, '2024-01-01')
plot_system_profiles(results, '2024-01-01')
```

## Features

1. **Data Loading**: Load and preprocess arrival/departure flight data and gate/washroom coordinates
2. **OD Generation**: Create unified Origin-Destination dataframes from flight data
3. **Passenger Simulation**: Generate passenger-level data with entry times, gender, and bathroom usage
4. **Bathroom Assignment**: Simulate bathroom assignment using M/M/k queuing theory
5. **Visualization**: Plot airport maps, flow patterns, queue profiles, and system occupancy
6. **JSON Export**: Export simulation results and wait times by time intervals to JSON format

## Simulation Model

The simulation uses:
- **M/M/k queuing model**: Multiple servers with exponential service times
- **Generalized cost assignment**: Passengers choose bathrooms based on walking time + predicted wait time
- **Batch-based assignment**: Uses Method of Successive Averages (MSA) style assignment
- **Gender-based filtering**: Male and female passengers are assigned to appropriate bathrooms

## JSON Export

The package includes functions to export simulation results to JSON format:

### Multi-OD Results JSON

Exports complete simulation results including:
- Metadata (date, export timestamp, number of bathrooms)
- For each bathroom:
  - Summary statistics (total users, avg/max wait times, etc.)
  - Passenger-level data (entry times, wait times, service times, etc.)
  - Queue length over time

### Wait Times by Interval JSON

Exports wait times aggregated by time intervals (default 15 minutes):
- Metadata (date, interval size, time range)
- For each bathroom and time interval:
  - Passenger count
  - Average, minimum, and maximum wait times

**Example usage:**
```python
from demand_od import (
    export_multi_od_results_to_json,
    export_wait_times_by_interval
)

# Export multi-OD results
export_multi_od_results_to_json(
    results,
    date_str='2024-01-01',
    output_path='results_2024-01-01.json'
)

# Export wait times by 15-minute intervals
export_wait_times_by_interval(
    results,
    date_str='2024-01-01',
    interval_minutes=15,
    output_path='wait_times_2024-01-01.json'
)
```

## Configuration

Default parameters can be modified in `config.py`:
- Walk speed: 80 m/min
- Default number of servers: 10
- Default mean service time: 3 minutes
- Default batch size: 5 minutes
- Default bathroom usage probability: 0.4
- Default male share: 0.5

