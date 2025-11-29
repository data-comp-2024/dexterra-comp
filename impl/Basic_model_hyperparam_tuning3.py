import os
import csv
import json
import yaml
import joblib
import argparse
import numpy as np
import pandas as pd

from scipy.spatial import distance_matrix

from lightgbm import LGBMRegressor
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, r2_score

# ============================================================
# Parse command-line arguments
# ============================================================

parser = argparse.ArgumentParser(description="Hyperparameter tuning model")
parser.add_argument(
    "--data_folder",
    type=str,
    required=True,
    help="Path to the root data folder"
)
args = parser.parse_args()

DATA_ROOT = args.data_folder

# ============================================================
# 1. LOAD RAW DATA (one time only)
# ============================================================

# --- Happy or Not data ---

happy_path = os.path.join(
    DATA_ROOT,
    "OneDrive_2025-11-03 (1)",
    "Happy or Not 2024",
    "Happy or Not Combined Data 2024.csv"
)

happy_or_not = pd.read_csv(
    happy_path,
    sep=';',
    engine='python',           # more tolerant than the default C engine
    quoting=csv.QUOTE_NONE,    # don't treat quotes as special
    escapechar='\\',           # let backslash escape delimiters if present
    encoding='utf-8',          # adjust if your file uses a different encoding
    on_bad_lines='warn'        # read the file instead of throwing; logs any truly bad rows
)

# Remove all " marks from column names and data
happy_or_not.columns = happy_or_not.columns.str.replace('"', '')
for col in happy_or_not.select_dtypes(include=['object']).columns:
    happy_or_not[col] = happy_or_not[col].str.replace('"', '')

# Basic path parsing -> zone & washroom_code
happy_or_not['zone'] = (
    happy_or_not['path']
    .str.split('-')
    .str[-1]
    .str.strip()
    .str[:2]
)

happy_or_not['washroom_code'] = (
    happy_or_not['path']
    .str.split('-')
    .str[-1]
    .str.strip()
    .str[:6]
)

# Convert first two columns to datetime (kept consistent with original)
happy_or_not[happy_or_not.columns[0]] = pd.to_datetime(
    happy_or_not[happy_or_not.columns[0]], format='mixed'
)
happy_or_not[happy_or_not.columns[1]] = pd.to_datetime(
    happy_or_not[happy_or_not.columns[1]], format='mixed'
)

# Encode response_binary (same mapping as original)
happy_or_not['response_binary'] = np.where(
    happy_or_not['response'] == 'happy', 0,
    np.where(
        happy_or_not['response'] == 'veryHappy', 1,
        np.where(
            happy_or_not['response'] == 'unhappy', 0,
            np.where(
                happy_or_not['response'] == 'veryUnhappy', 0, np.nan
            )
        )
    )
)

zones_interest = ['FG', 'FE', 'FF']
happy_or_not_filtered = happy_or_not[happy_or_not['zone'].isin(zones_interest)]

# --- Tasks data ---

root_folder = os.path.join(DATA_ROOT, 'lighthouse.io', 'lighthouse.io')

all_files = []
tasks_2024_folder = os.path.join(root_folder, 'Tasks 2024')
for file in os.listdir(tasks_2024_folder):
    if file.endswith('.xlsx'):
        all_files.append(pd.read_excel(os.path.join(tasks_2024_folder, file)))
tasks = pd.concat(all_files, ignore_index=True)

tasks_washroom = tasks.loc[tasks['Title'] == 'Washroom Checklist'].copy()

# Combine Date and Time columns into a single datetime column
tasks_washroom['DateTime'] = pd.to_datetime(
    tasks_washroom['Date'].astype(str) + ' ' + tasks_washroom['Time'].astype(str)
)
tasks_washroom = tasks_washroom.sort_values('DateTime')

tasks_washroom['washroom_code'] = (
    tasks_washroom['Location 2']
    .str.split('-')
    .str[-1]
    .str.strip()
    .str[:6]
)
tasks_washroom['zone'] = tasks_washroom['washroom_code'].str[:2]
tasks_washroom_filtered = tasks_washroom[tasks_washroom['zone'].isin(zones_interest)].copy()

# Remove washrooms where '1' is the 3rd character in washroom_code
tasks_washroom_filtered = tasks_washroom_filtered[
    ~tasks_washroom_filtered['washroom_code'].str[2].eq('1')
].copy()

name_value_counts = tasks_washroom_filtered['Name'].value_counts().to_frame('name_value_counts')
tasks_washroom_filtered_merged = tasks_washroom_filtered.merge(
    name_value_counts,
    left_on='Name',
    right_index=True
)
tasks_washroom_filtered_merged['Name_or_other'] = np.where(
    tasks_washroom_filtered_merged['name_value_counts'] < 400,
    'Other',
    tasks_washroom_filtered_merged['Name']
)

# --- Flight info data ---

flight_info_path = os.path.join(
    DATA_ROOT,
    'OneDrive_2025-11-03',
    'GTAA flights arrival departure data 2024',
    'Pax info YYZ.xlsx'
)
flight_info = pd.read_excel(flight_info_path)
flight_info['Arr Gate'] = flight_info['Arr Gate'].astype(str)

airport_gates_path = os.path.join(DATA_ROOT, 'airport_gates2.yml')
with open(airport_gates_path, 'r') as file:
    airport_gates = yaml.safe_load(file)

zone_mapping = {}
for zone, gates in airport_gates.items():
    for gate in gates:
        zone_mapping[gate] = zone

flight_info['zone'] = flight_info['Arr Gate'].map(zone_mapping)
flight_info['Arr Actual Arrival Time'] = pd.to_datetime(flight_info['Arr Actual Arrival Time'])

# --- Coordinates and distance tables ---

coordinates_path = os.path.join(DATA_ROOT, 'gates_washrooms.csv')
coordinates = pd.read_csv(coordinates_path)

# Centering coordinates (as in original)
centroid = coordinates[['x', 'y']].mean()
coordinates[['x', 'y']] = coordinates[['x', 'y']] - centroid

washrooms_coords = coordinates.loc[24:, :].rename(columns={'name': 'washroom_name'})
gates_coords = coordinates.loc[0:23, :].rename(columns={'name': 'gate_name'})

# Euclidean distances
distances = distance_matrix(washrooms_coords[['x', 'y']], gates_coords[['x', 'y']])
distances_df = pd.DataFrame(
    distances,
    index=washrooms_coords['washroom_name'],
    columns=gates_coords['gate_name']
).unstack().to_frame('distance').reset_index()
distances_df = distances_df.rename(columns={'level_0': 'gate_name', 'level_1': 'washroom_name'})

# Path distances
path_distances_path = os.path.join(
    DATA_ROOT,
    'full_repo',
    'dexterra-comp',
    'maps',
    'gate_shortest_paths.csv'
)
path_distances = pd.read_csv(path_distances_path)
path_distances[['origin_label', 'dest_label']] = path_distances[['origin_label', 'dest_label']].apply(
    lambda x: x.str.replace('gate_', '')
)
path_distances = path_distances.rename(
    columns={
        'origin_label': 'gate_name',
        'dest_label': 'washroom_name',
        'path_distance': 'distance'
    }
)

# Ensure we only keep washrooms & gates that appear in coordinates
washroom_names = washrooms_coords['washroom_name'].unique().tolist()
gate_names = gates_coords['gate_name'].unique().tolist()

path_distances = path_distances[
    (path_distances['washroom_name'].isin(washroom_names)) &
    (path_distances['gate_name'].isin(gate_names))
].copy()

# --- Downstream washrooms filter (apply to both distance tables) ---

downstream_path = os.path.join(DATA_ROOT, 'downstream_washrooms.xlsx')
downstream_washrooms = pd.read_excel(downstream_path)
downstream_washrooms['Downstream_washrooms'] = downstream_washrooms['Downstream_washrooms'].apply(
    lambda x: [item.strip() for item in str(x).split(',')]
)
downstream_washrooms['Gate'] = downstream_washrooms['Gate'].astype(str)

# Apply downstream filter to path distances
path_distances_down = path_distances.merge(
    downstream_washrooms,
    left_on='gate_name',
    right_on='Gate',
    how='inner',
    validate='many_to_many'
)
path_distances_down['washroom_downstream'] = path_distances_down.apply(
    lambda row: row['washroom_name'] in row['Downstream_washrooms'],
    axis=1
)
path_distances_down = path_distances_down[path_distances_down['washroom_downstream']].copy()

# Apply downstream filter to euclidean distances as well
distances_df_down = distances_df.merge(
    downstream_washrooms,
    left_on='gate_name',
    right_on='Gate',
    how='inner',
    validate='many_to_many'
)
distances_df_down['washroom_downstream'] = distances_df_down.apply(
    lambda row: row['washroom_name'] in row['Downstream_washrooms'],
    axis=1
)
distances_df_down = distances_df_down[distances_df_down['washroom_downstream']].copy()

# Consolidate distance sources
DISTANCE_TABLES = {
    'path': path_distances_down[['gate_name', 'washroom_name', 'distance']],
    'euclidean': distances_df_down[['gate_name', 'washroom_name', 'distance']]
}

# --- Avg wait times JSON (global raw DF, to be resampled per dataset) ---

wait_json_path = os.path.join(
    DATA_ROOT,
    'OneDrive_2025-11-03',
    'GTAA flights arrival departure data 2024',
    'all_wait_times.json'
)
demand_json = json.load(open(wait_json_path))

wait_rows = []
for date_str, bathrooms in demand_json.items():
    for washroom, intervals in bathrooms.items():
        for dt_str, metrics in intervals.items():
            wait_rows.append({
                "datetime": pd.to_datetime(dt_str),
                "washroom": washroom,
                "avg_wait_minutes": metrics["avg_wait_minutes"]
            })

df_wait_raw = pd.DataFrame(wait_rows)
df_wait_raw['datetime'] = pd.to_datetime(df_wait_raw['datetime'])

# Name of the UTC datetime column from Happy or Not dataset
UTC_DATETIME_COL = happy_or_not_filtered.columns[0]      # matches original usage
LOCAL_DATETIME_COL = "local_datetime"                    # second datetime column in original


# ============================================================
# HELPER: time-of-day segments
# ============================================================

def get_segment_from_hour(hour: int) -> str:
    """
    Map hour of day (0-23) to a time-of-day segment:
    - 7 <= h < 15  -> '7_15'   (7am–3pm)
    - 15 <= h < 21 -> '15_21'  (3pm–9pm)
    - else         -> '21_7'   (9pm–7am)
    """
    if 7 <= hour < 15:
        return '7_15'
    elif 15 <= hour < 21:
        return '15_21'
    else:
        return '21_7'


# ============================================================
# 2. FUNCTION TO BUILD FEATURES FOR GIVEN DATASET HYPERPARAMS
# ============================================================

def build_dataset(
    resampling_period_7_15: str,
    resampling_period_15_21: str,
    resampling_period_21_7: str,
    decay_param: float,
    distance_source: str
) -> tuple[pd.DataFrame, pd.Series]:
    """
    Build the modeling dataset (X, y) for given:
    - resampling_period_7_15: resampling for 07:00–15:00
    - resampling_period_15_21: resampling for 15:00–21:00
    - resampling_period_21_7:  resampling for 21:00–07:00
    - decay_param: exponential distance decay parameter
    - distance_source: 'path' or 'euclidean'
    """

    segment_periods = {
        '7_15': resampling_period_7_15,
        '15_21': resampling_period_15_21,
        '21_7': resampling_period_21_7
    }

    # --- 2.1. Number of Happy or Not ratings per (time, washroom) ---

    hon_for_counts = happy_or_not_filtered.copy()
    hon_for_counts['segment'] = hon_for_counts[UTC_DATETIME_COL].dt.hour.apply(get_segment_from_hour)

    count_frames = []
    for seg_key, freq in segment_periods.items():
        seg_df = hon_for_counts[hon_for_counts['segment'] == seg_key].copy()
        if seg_df.empty:
            continue
        seg_counts = (
            seg_df
            .set_index(UTC_DATETIME_COL)
            .groupby('washroom_code')
            .resample(freq)
            .size()
            .rename("count")
            .reset_index()
        )
        count_frames.append(seg_counts)

    if count_frames:
        number_of_hourly_ratings = pd.concat(count_frames, ignore_index=True)
    else:
        number_of_hourly_ratings = pd.DataFrame(columns=[UTC_DATETIME_COL, 'washroom_code', 'count'])

    # --- 2.2. Percentage happy per washroom over time ---

    hon_for_ph = happy_or_not_filtered.copy()
    hon_for_ph['segment'] = hon_for_ph[LOCAL_DATETIME_COL].dt.hour.apply(get_segment_from_hour)

    hourly_values_frames = []
    for seg_key, freq in segment_periods.items():
        seg_df = hon_for_ph[hon_for_ph['segment'] == seg_key].copy()
        if seg_df.empty:
            continue
        seg_values = (
            seg_df
            .set_index(seg_df[LOCAL_DATETIME_COL])
            .resample(freq)[['response_binary', 'washroom_code']]
            .value_counts()
        )
        hourly_values_frames.append(seg_values)

    if hourly_values_frames:
        hourly_values = pd.concat(hourly_values_frames).sort_index()
    else:
        hourly_values = pd.Series(dtype='int64')

    # If empty, bail early
    if hourly_values.empty:
        return pd.DataFrame(), pd.Series(dtype=float)

    # Unstack to have MultiIndex columns: outer (washroom_code), inner (response_binary)
    hourly_values = hourly_values.unstack()
    hourly_values_unstacked = hourly_values.unstack()

    # Compute percentage happy per washroom
    outer_cols = hourly_values_unstacked.columns.get_level_values(0).unique()
    percentage_happy = pd.DataFrame(index=hourly_values_unstacked.index)

    for col in outer_cols:
        if (col, 1.0) not in hourly_values_unstacked.columns:
            num = pd.Series(0.0, index=hourly_values_unstacked.index)
        else:
            num = hourly_values_unstacked[(col, 1.0)]

        den = hourly_values_unstacked[col].sum(axis=1)
        percentage_happy[col] = np.where(den > 0, (num / den) * 100, np.nan)

    # Interpolate & fill NA
    percentage_happy = percentage_happy.interpolate(
        method='linear',
        limit_direction='both'
    )
    percentage_happy = percentage_happy.fillna(percentage_happy.median())

    # --- 2.3. Tasks per washroom / staff (segment-wise resampling) ---

    tasks_for_staff = tasks_washroom_filtered_merged.copy()
    tasks_for_staff['segment'] = tasks_for_staff['DateTime'].dt.hour.apply(get_segment_from_hour)

    staff_frames = []
    for seg_key, freq in segment_periods.items():
        seg_df = tasks_for_staff[tasks_for_staff['segment'] == seg_key].copy()
        if seg_df.empty:
            continue
        seg_washrooms = (
            seg_df
            .set_index('DateTime')
            .resample(freq)[['washroom_code', 'Name_or_other']]
            .value_counts()
        )
        staff_frames.append(seg_washrooms)

    if staff_frames:
        washrooms_hourly = pd.concat(staff_frames).sort_index()
    else:
        washrooms_hourly = pd.Series(dtype='int64')

    washrooms_hourly_unstacked = washrooms_hourly.unstack().unstack()
    washrooms_hourly_unstacked.columns = [
        f"{col[0]}_{col[1]}" for col in washrooms_hourly_unstacked.columns
    ]

    # Merge percentage_happy with tasks (wide)
    percentage_happy_tasks_merged = percentage_happy.merge(
        washrooms_hourly_unstacked,
        left_index=True,
        right_index=True,
        how='inner'
    )

    # --- 2.4. Add washroom dummies (one-hot on washroom_code) ---

    percentage_happy_stacked = (
        percentage_happy
        .stack()
        .to_frame('percentage_happy')
        .rename_axis(['DateTime', 'washroom_code'])
        .reset_index()
    )

    percentage_happy_dummies = pd.get_dummies(
        percentage_happy_stacked['washroom_code']
    ).astype(int)

    percentage_happy_with_dummies = pd.concat(
        [percentage_happy_stacked, percentage_happy_dummies],
        axis=1
    )

    # Merge tasks (long)
    washrooms_hourly_reset = washrooms_hourly.reset_index().fillna(0)
    percentage_happy_with_dummies_merged = percentage_happy_with_dummies.merge(
        washrooms_hourly_reset,
        left_on=['DateTime', 'washroom_code'],
        right_on=['DateTime', 'washroom_code'],
        how='inner'
    )

    # --- 2.5. Flight arrivals aggregated by gate and time (segment-wise) ---

    flights_for_arrivals = flight_info.copy()
    flights_for_arrivals['segment'] = flights_for_arrivals['Arr Actual Arrival Time'].dt.hour.apply(get_segment_from_hour)

    flight_frames = []
    for seg_key, freq in segment_periods.items():
        seg_df = flights_for_arrivals[flights_for_arrivals['segment'] == seg_key].copy()
        if seg_df.empty:
            continue
        seg_hourly_arrivals = (
            seg_df
            .set_index('Arr Actual Arrival Time')
            .groupby('Arr Gate')['Arr Pax']
            .resample(freq)
            .sum()
        )
        flight_frames.append(seg_hourly_arrivals)

    if flight_frames:
        hourly_arrivals = pd.concat(flight_frames).unstack('Arr Gate').fillna(0).sort_index()
    else:
        hourly_arrivals = pd.DataFrame()

    if hourly_arrivals.empty:
        return pd.DataFrame(), pd.Series(dtype=float)

    hourly_arrivals_stacked = hourly_arrivals.stack().to_frame('arrivals').reset_index()
    # Columns: ['Arr Actual Arrival Time', 'Arr Gate', 'arrivals']

    # --- 2.6. Distance-decayed arrivals per washroom ---

    if distance_source not in DISTANCE_TABLES:
        raise ValueError(f"distance_source must be one of {list(DISTANCE_TABLES.keys())}")

    distance_df = DISTANCE_TABLES[distance_source]

    hourly_arrivals_stacked_with_distances = hourly_arrivals_stacked.merge(
        distance_df,
        left_on='Arr Gate',
        right_on='gate_name',
        how='inner',
        validate='many_to_many'
    )

    hourly_arrivals_stacked_with_distances['decayed_arrivals'] = (
        hourly_arrivals_stacked_with_distances['arrivals'] *
        np.exp(-decay_param * hourly_arrivals_stacked_with_distances['distance'])
    )

    hourly_arrivals_stacked_decayed_grouped = (
        hourly_arrivals_stacked_with_distances
        .groupby(['Arr Actual Arrival Time', 'washroom_name'])['decayed_arrivals']
        .sum()
        .reset_index()
    )

    # --- 2.7. Merge with percentage_happy & tasks & washroom-only tasks & ratings ---

    percentage_happy_tasks_flights_merged_decayed = percentage_happy_with_dummies.merge(
        hourly_arrivals_stacked_decayed_grouped,
        left_on=['DateTime', 'washroom_code'],
        right_on=['Arr Actual Arrival Time', 'washroom_name'],
        how='inner'
    )

    # Task counts per (time, washroom) without staff names (segment-wise)

    tasks_for_counts = tasks_washroom_filtered_merged.copy()
    tasks_for_counts['segment'] = tasks_for_counts['DateTime'].dt.hour.apply(get_segment_from_hour)

    counts_frames = []
    for seg_key, freq in segment_periods.items():
        seg_df = tasks_for_counts[tasks_for_counts['segment'] == seg_key].copy()
        if seg_df.empty:
            continue
        seg_counts = (
            seg_df
            .set_index('DateTime')
            .resample(freq)['washroom_code']
            .value_counts()
        )
        counts_frames.append(seg_counts)

    if counts_frames:
        washrooms_hourly_no_names = pd.concat(counts_frames).unstack()
    else:
        washrooms_hourly_no_names = pd.DataFrame()

    washrooms_hourly_no_names_stacked = (
        washrooms_hourly_no_names
        .stack()
        .to_frame('task_counts')
        .rename_axis(['DateTime', 'washroom_code'])
        .reset_index()
    )

    percentage_happy_tasks_flights_merged_decayed_washrooms = (
        percentage_happy_tasks_flights_merged_decayed.merge(
            washrooms_hourly_no_names_stacked,
            left_on=['DateTime', 'washroom_code'],
            right_on=['DateTime', 'washroom_code'],
            how='inner'
        )
    )

    percentage_happy_tasks_flights_merged_decayed_ratings = (
        percentage_happy_tasks_flights_merged_decayed_washrooms.merge(
            number_of_hourly_ratings,
            left_on=['DateTime', 'washroom_code'],
            right_on=[UTC_DATETIME_COL, 'washroom_code'],
            how='inner'
        )
    )

    # --- 2.8. Avg wait times: segment-wise resample and merge ---

    wait_for_resample = df_wait_raw.copy()
    wait_for_resample['segment'] = wait_for_resample['datetime'].dt.hour.apply(get_segment_from_hour)

    wait_frames = []
    for seg_key, freq in segment_periods.items():
        seg_df = wait_for_resample[wait_for_resample['segment'] == seg_key].copy()
        if seg_df.empty:
            continue
        seg_wide = (
            seg_df
            .pivot(index='datetime', columns='washroom', values='avg_wait_minutes')
            .sort_index()
        )
        seg_wide_resampled = (
            seg_wide
            .resample(freq)
            .mean()
            .interpolate(method='linear', limit_direction='both')
        )
        wait_frames.append(seg_wide_resampled)

    if wait_frames:
        df_wide_resampled = pd.concat(wait_frames).sort_index()
    else:
        df_wide_resampled = pd.DataFrame()

    if df_wide_resampled.empty:
        return pd.DataFrame(), pd.Series(dtype=float)

    df_long_resampled = (
        df_wide_resampled
        .stack()
        .to_frame('avg_wait_minutes')
        .rename_axis(['DateTime', 'washroom_code'])
        .reset_index()
        .fillna(0)
    )

    percentage_happy_tasks_flights_merged_decayed_ratings_waittimes = (
        percentage_happy_tasks_flights_merged_decayed_ratings.merge(
            df_long_resampled,
            left_on=['DateTime', 'washroom_code'],
            right_on=['DateTime', 'washroom_code'],
            how='inner'
        )
    )

    # Hour of day feature
    percentage_happy_tasks_flights_merged_decayed_ratings_waittimes['hour_of_day'] = (
        percentage_happy_tasks_flights_merged_decayed_ratings_waittimes['DateTime'].dt.hour
    )
    # Day of week feature
    percentage_happy_tasks_flights_merged_decayed_ratings_waittimes['day_of_week'] = (
        percentage_happy_tasks_flights_merged_decayed_ratings_waittimes['DateTime'].dt.dayofweek
    )
    # Lagged score
    percentage_happy_tasks_flights_merged_decayed_ratings_waittimes['lagged_score'] = (
        percentage_happy_tasks_flights_merged_decayed_ratings_waittimes
        .groupby('washroom_code')['percentage_happy']
        .shift(1)
    )

    # --- 2.9. Final X, y for modeling (ensure chronological order) ---

    df_model = percentage_happy_tasks_flights_merged_decayed_ratings_waittimes.copy()

    # Sort chronologically before dropping time columns
    sort_col = 'DateTime' if 'DateTime' in df_model.columns else UTC_DATETIME_COL
    df_model = df_model.sort_values(sort_col).reset_index(drop=True)

    target_col = 'percentage_happy'
    drop_cols = [
        'DateTime',
        'washroom_code',
        target_col,
        'Arr Actual Arrival Time',
        'washroom_name',
        'delayed_arrivals',
        'count',
        'is_weekend',
        UTC_DATETIME_COL,
        'segment'  # if any segment column leaked through
    ]
    drop_cols = [c for c in drop_cols if c in df_model.columns]

    X = df_model.drop(columns=drop_cols)
    y = df_model[target_col]

    return X, y


# ============================================================
# 3. HYPERPARAMETER TUNING WITH TIME SERIES SPLIT
# ============================================================

if __name__ == "__main__":

    # Dataset-specific hyperparameters
    # Now we have THREE independent resampling-period hyperparameters:
    resampling_period_grid_7_15 = ['1H', '2H', '4H', '8H', '12H', '24H']
    resampling_period_grid_15_21 = ['1H', '2H', '4H', '8H', '12H', '24H']
    resampling_period_grid_21_7 = ['1H', '2H', '4H', '8H', '12H', '24H']

    decay_param_grid = np.linspace(0.0, 0.5, 11)   # 0.00, 0.05, ..., 0.50
    distance_source_grid = ['path', 'euclidean']

    # LightGBM hyperparameter distributions (reasonable defaults; tweak as needed)
    lgbm_param_distributions = {
        'num_leaves': [31, 63, 127],
        'learning_rate': [0.01, 0.05, 0.1],
        'n_estimators': [100, 300, 500],
        'max_depth': [-1, 5, 10],
        'min_child_samples': [20, 50, 100],
        'subsample': [0.7, 0.85, 1.0],
        'colsample_bytree': [0.7, 0.85, 1.0],
        'reg_alpha': [0.0, 0.1, 0.5],
        'reg_lambda': [0.0, 0.1, 0.5],
    }

    best_overall_model = None
    best_overall_params = None
    best_overall_r2 = -np.inf
    best_overall_mse = np.inf

    # You can reduce n_iters to keep runtime manageable
    n_iters_lgbm = 20

    for resampling_period_7_15 in resampling_period_grid_7_15:
        for resampling_period_15_21 in resampling_period_grid_15_21:
            for resampling_period_21_7 in resampling_period_grid_21_7:
                for distance_source in distance_source_grid:
                    for decay_param in decay_param_grid:

                        print(
                            f"\n=== Dataset config: "
                            f"resampling_period_7_15={resampling_period_7_15}, "
                            f"resampling_period_15_21={resampling_period_15_21}, "
                            f"resampling_period_21_7={resampling_period_21_7}, "
                            f"distance_source={distance_source}, "
                            f"decay_param={decay_param:.3f} ==="
                        )

                        # Build dataset for this config
                        try:
                            X, y = build_dataset(
                                resampling_period_7_15=resampling_period_7_15,
                                resampling_period_15_21=resampling_period_15_21,
                                resampling_period_21_7=resampling_period_21_7,
                                decay_param=decay_param,
                                distance_source=distance_source
                            )
                        except Exception as e:
                            print(f"Skipping config due to error during dataset build: {e}")
                            continue

                        if X.empty or y.empty:
                            print("Skipping config (empty X or y).")
                            continue

                        # Ensure X and y are aligned and ordered in time (already sorted in build_dataset)
                        n_samples = len(X)
                        if n_samples < 10:
                            print("Skipping config (too few samples for time series split).")
                            continue

                        # Chronological train/test split: last 20% as held-out test set
                        test_size = max(1, int(0.2 * n_samples))

                        X_train = X.iloc[:-test_size, :]
                        y_train = y.iloc[:-test_size]
                        X_test = X.iloc[-test_size:, :]
                        y_test = y.iloc[-test_size:]

                        # TimeSeriesSplit for walk-forward CV on the training set (expanding window)
                        tscv = TimeSeriesSplit(n_splits=3)

                        base_estimator = LGBMRegressor(
                            objective='regression',
                            random_state=42,
                            n_jobs=-1
                        )

                        search = RandomizedSearchCV(
                            estimator=base_estimator,
                            param_distributions=lgbm_param_distributions,
                            n_iter=n_iters_lgbm,
                            scoring='r2',       # optimize R²
                            cv=tscv,            # TimeSeriesSplit cross-validation
                            random_state=42,
                            n_jobs=-1,
                            verbose=1
                        )

                        try:
                            search.fit(X_train, y_train)
                        except Exception as e:
                            print(f"Skipping config due to error during tuning: {e}")
                            continue

                        best_model_for_config = search.best_estimator_
                        y_pred = best_model_for_config.predict(X_test)

                        mse = mean_squared_error(y_test, y_pred)
                        r2 = r2_score(y_test, y_pred)

                        print(f"Config R2: {r2:.4f}, MSE: {mse:.4f}")
                        print(f"Best CV R2 (TimeSeriesSplit) for this config: {search.best_score_:.4f}")

                        if r2 > best_overall_r2:
                            best_overall_r2 = r2
                            best_overall_mse = mse

                            # Record both model hyperparams and dataset hyperparams
                            best_overall_params = {
                                **search.best_params_,
                                'resampling_period_7_15': resampling_period_7_15,
                                'resampling_period_15_21': resampling_period_15_21,
                                'resampling_period_21_7': resampling_period_21_7,
                                'decay_param': float(decay_param),
                                'distance_source': distance_source
                            }

                            best_overall_model = best_model_for_config

                            print(">>> New best overall model found!")
                            print(f"    Best R2:  {best_overall_r2:.4f}")
                            print(f"    Best MSE: {best_overall_mse:.4f}")
                            print(f"    Best params: {best_overall_params}")

    # ========================================================
    # 4. SAVE BEST MODEL, HYPERPARAMS, AND SCORES
    # ========================================================

    if best_overall_model is not None:
        # Save model
        joblib.dump(best_overall_model, "best_lgbm_model.pkl")

        # Save hyperparameters
        with open("best_hyperparameters.json", "w") as f:
            json.dump(best_overall_params, f, indent=4)

        # Save metrics
        best_scores = {
            "best_r2": best_overall_r2,
            "best_mse": best_overall_mse
        }
        with open("best_scores.json", "w") as f:
            json.dump(best_scores, f, indent=4)

        print("\n=== Tuning complete ===")
        print(f"Best R2:  {best_overall_r2:.4f}")
        print(f"Best MSE: {best_overall_mse:.4f}")
        print("Best hyperparameters saved to best_hyperparameters.json")
        print("Best model saved to best_lgbm_model.pkl")
        print("Best scores saved to best_scores.json")
    else:
        print("No valid model was found during tuning.")
