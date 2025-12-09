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

from utils import build_dataset

# ============================================================
# NEW: ARGUMENT FOR BASE DATA DIRECTORY (ONLY CHANGE REQUESTED)
# ============================================================

parser = argparse.ArgumentParser()
parser.add_argument("--data_dir", type=str, required=True,
    help="Path to Dexterra Competition Data folder.")
args = parser.parse_args()

BASE = args.data_dir  # This replaces the previously hard-coded base folder


# ============================================================
# 1. LOAD RAW DATA (one time only)
# ============================================================

# --- Happy or Not data ---

happy_or_not = pd.read_csv(
    os.path.join(BASE,
        r"OneDrive_2025-11-03 (1)\Happy or Not 2024\Happy or Not Combined Data 2024.csv"
    ),
    sep=';',
    engine='python',
    quoting=csv.QUOTE_NONE,
    escapechar='\\',
    encoding='utf-8',
    on_bad_lines='warn'
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

# response_binary (same mapping as original)
happy_or_not['response_binary'] = np.where(
    happy_or_not['response'] == 'happy', 1,
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

root_folder = os.path.join(BASE, r"lighthouse.io\lighthouse.io")

all_files = []
for file in os.listdir(os.path.join(root_folder, 'Tasks 2024')):
    if file.endswith('.xlsx'):
        all_files.append(pd.read_excel(os.path.join(root_folder, 'Tasks 2024', file)))
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

# --- Flight info data (Arrivals) ---

flight_info = pd.read_excel(
    os.path.join(BASE,
        r"OneDrive_2025-11-03\GTAA flights arrival departure data 2024\Pax info YYZ.xlsx"
    )
)
flight_info['Arr Gate'] = flight_info['Arr Gate'].astype(str)

with open(os.path.join(BASE, 'airport_gates2.yml'), 'r') as file:
    airport_gates = yaml.safe_load(file)

zone_mapping = {}
for zone, gates in airport_gates.items():
    for gate in gates:
        zone_mapping[gate] = zone

flight_info['zone'] = flight_info['Arr Gate'].map(zone_mapping)
flight_info['Arr Actual Arrival Time'] = pd.to_datetime(flight_info['Arr Actual Arrival Time'])


flight_info_departures = pd.read_excel(
    os.path.join(BASE,
        r"OneDrive_2025-11-03\GTAA flights arrival departure data 2024\Pax info YYZ.xlsx"
    ),
    sheet_name='Departures'
)
flight_info_departures['Dep Gate'] = flight_info_departures['Dep Gate'].astype(str)
flight_info_departures['Dep Actual Arrival Time'] = pd.to_datetime(
    flight_info_departures['Dep Actual Arrival Time']
)
flight_info_departures['zone'] = flight_info_departures['Dep Gate'].map(zone_mapping)

# --- Coordinates and distance tables ---

coordinates = pd.read_csv(os.path.join(BASE, 'gates_washrooms.csv'))

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
path_distances = pd.read_csv(os.path.join(BASE, 'gate_shortest_paths.csv'))
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

downstream_washrooms = pd.read_excel(os.path.join(BASE, 'downstream_washrooms.xlsx'))
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
# For arrivals: use downstream-filtered distances
DISTANCE_TABLES_ARRIVALS = {
    'path': path_distances_down[['gate_name', 'washroom_name', 'distance']],
    'euclidean': distances_df_down[['gate_name', 'washroom_name', 'distance']]
}

# For departures: use full (unfiltered) distances
DISTANCE_TABLES_DEPARTURES = {
    'path': path_distances[['gate_name', 'washroom_name', 'distance']],
    'euclidean': distances_df[['gate_name', 'washroom_name', 'distance']]
}

# --- Avg wait times JSON (global raw DF, to be resampled per dataset) ---

demand_json = json.load(open(
    os.path.join(BASE,
        r"OneDrive_2025-11-03\GTAA flights arrival departure data 2024\all_wait_times.json"
    )
))

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
UTC_DATETIME_COL = happy_or_not_filtered.columns[0]
LOCAL_DATETIME_COL = "local_datetime"

# ============================================================
# 3. HYPERPARAMETER TUNING WITH TIME SERIES SPLIT
# ============================================================

if __name__ == "__main__":

    # Dataset-specific hyperparameters
    resampling_period_grid = ['1H', '2H', '4H', '8H', '12H', '24H']
    decay_param_grid = np.linspace(0.0, 0.03, 11)   # 0.00, 0.003, ..., 0.03
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

    for resampling_period in resampling_period_grid:
        for distance_source in distance_source_grid:
            for decay_param in decay_param_grid:

                print(
                    f"\n=== Dataset config: "
                    f"resampling_period={resampling_period}, "
                    f"distance_source={distance_source}, "
                    f"decay_param={decay_param:.3f} ==="
                )

                # Build dataset for this config
                try:
                    X, y, _, _, _ = build_dataset(
                        resampling_period=resampling_period,
                        decay_param=decay_param,
                        distance_source=distance_source,
                        happy_or_not_filtered=happy_or_not_filtered,
                        UTC_DATETIME_COL=UTC_DATETIME_COL,
                        LOCAL_DATETIME_COL=LOCAL_DATETIME_COL,
                        tasks_washroom_filtered_merged=tasks_washroom_filtered_merged,
                        flight_info=flight_info,
                        flight_info_departures=flight_info_departures,
                        DISTANCE_TABLES_ARRIVALS=DISTANCE_TABLES_ARRIVALS,
                        DISTANCE_TABLES_DEPARTURES=DISTANCE_TABLES_DEPARTURES,
                        df_wait_raw=df_wait_raw
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
                        'resampling_period': resampling_period,
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
