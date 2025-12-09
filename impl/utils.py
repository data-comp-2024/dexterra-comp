import numpy as np
import pandas as pd
import pdb

def build_dataset(resampling_period: str,
                  decay_param: float,
                  distance_source: str,
                  *,
                  happy_or_not_filtered,
                  UTC_DATETIME_COL,
                  LOCAL_DATETIME_COL,
                  tasks_washroom_filtered_merged,
                  flight_info,
                  flight_info_departures,
                  DISTANCE_TABLES_ARRIVALS,
                  DISTANCE_TABLES_DEPARTURES,
                  df_wait_raw):
    """
    Build the modeling dataset (X, y) for given:
    - resampling_period: e.g. '1H', '2H', '4H', '8H', '12H', '24H'
    - decay_param: exponential distance decay parameter
    - distance_source: 'path' or 'euclidean'
    """

    # ---------- All code is IDENTICAL to the original function ----------
    # (Nothing changed inside this function)

    number_of_hourly_ratings = (
        happy_or_not_filtered
        .set_index(UTC_DATETIME_COL)
        .groupby('washroom_code')
        .resample(resampling_period)
        .size()
        .rename("count")
        .reset_index()
    )

    hourly_values = (
        happy_or_not_filtered
        .set_index(LOCAL_DATETIME_COL)
        .resample(resampling_period)[['response_binary', 'washroom_code']]
        .value_counts()
        .unstack()
    )

    hourly_values_unstacked = hourly_values.unstack()

    outer_cols = hourly_values_unstacked.columns.get_level_values(0).unique()
    percentage_happy = pd.DataFrame(index=hourly_values_unstacked.index)

    for col in outer_cols:
        if (col, 1.0) not in hourly_values_unstacked.columns:
            num = pd.Series(0.0, index=hourly_values_unstacked.index)
        else:
            num = hourly_values_unstacked[(col, 1.0)]

        den = hourly_values_unstacked[col].sum(axis=1)
        percentage_happy[col] = np.where(den > 0, (num / den) * 100, np.nan)

    percentage_happy = percentage_happy.interpolate(method='linear', limit_direction='both')
    percentage_happy = percentage_happy.fillna(percentage_happy.median())

    washrooms_hourly = (
        tasks_washroom_filtered_merged
        .set_index('DateTime')
        .resample(resampling_period)[['washroom_code', 'Name_or_other']]
        .value_counts()
        .unstack()
    )

    washrooms_hourly_unstacked = washrooms_hourly.unstack()
    washrooms_hourly_unstacked.columns = [
        f"{col[0]}_{col[1]}" for col in washrooms_hourly_unstacked.columns
    ]

    percentage_happy_tasks_merged = percentage_happy.merge(
        washrooms_hourly_unstacked,
        left_index=True,
        right_index=True,
        how='inner'
    )

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

    washrooms_hourly_reset = washrooms_hourly.reset_index().fillna(0)
    percentage_happy_with_dummies_merged = percentage_happy_with_dummies.merge(
        washrooms_hourly_reset,
        left_on=['DateTime', 'washroom_code'],
        right_on=['DateTime', 'washroom_code'],
        how='inner'
    )

    hourly_arrivals = (
        flight_info
        .set_index('Arr Actual Arrival Time')
        .groupby('Arr Gate')['Arr Pax']
        .resample(resampling_period)
        .sum()
        .unstack('Arr Gate')
        .fillna(0)
    )

    hourly_arrivals_stacked = hourly_arrivals.stack().to_frame('arrivals').reset_index()

    distance_df_arrivals = DISTANCE_TABLES_ARRIVALS[distance_source]

    arrivals_merged = hourly_arrivals_stacked.merge(
        distance_df_arrivals,
        left_on='Arr Gate',
        right_on='gate_name',
        how='inner',
        validate='many_to_many'
    )

    arrivals_merged['decayed_arrivals'] = (
        arrivals_merged['arrivals'] *
        np.exp(-decay_param * arrivals_merged['distance'])
    )

    hourly_arrivals_grouped = (
        arrivals_merged
        .groupby(['Arr Actual Arrival Time', 'washroom_name'])['decayed_arrivals']
        .sum()
        .reset_index()
    )

    distance_df_departures = DISTANCE_TABLES_DEPARTURES[distance_source]

    hourly_departures = (
        flight_info_departures
        .set_index('Dep Actual Arrival Time')
        .groupby('Dep Gate')['Dep Pax']
        .resample(resampling_period)
        .sum()
        .unstack('Dep Gate')
        .fillna(0)
    )

    hourly_departures_stacked = hourly_departures.stack().to_frame('departures').reset_index()

    departures_merged = hourly_departures_stacked.merge(
        distance_df_departures,
        left_on='Dep Gate',
        right_on='gate_name',
        how='inner',
        validate='many_to_many'
    )

    departures_merged['decayed_departures'] = (
        departures_merged['departures'] *
        np.exp(-decay_param * departures_merged['distance'])
    )

    hourly_departures_grouped = (
        departures_merged
        .groupby(['Dep Actual Arrival Time', 'washroom_name'])['decayed_departures']
        .sum()
        .reset_index()
    )

    df = percentage_happy_with_dummies.merge(
        hourly_arrivals_grouped,
        left_on=['DateTime', 'washroom_code'],
        right_on=['Arr Actual Arrival Time', 'washroom_name'],
        how='inner'
    )

    df = df.merge(
        hourly_departures_grouped[['Dep Actual Arrival Time', 'washroom_name', 'decayed_departures']],
        left_on=['DateTime', 'washroom_code'],
        right_on=['Dep Actual Arrival Time', 'washroom_name'],
        how='left'
    )

    washrooms_hourly_no_names = (
        tasks_washroom_filtered_merged
        .set_index('DateTime')
        .resample(resampling_period)['washroom_code']
        .value_counts()
        .unstack()
    )

    washrooms_hourly_no_names_stacked = (
        washrooms_hourly_no_names
        .stack()
        .to_frame('task_counts')
        .rename_axis(['DateTime', 'washroom_code'])
        .reset_index()
    )

    df = df.merge(
        washrooms_hourly_no_names_stacked,
        on=['DateTime', 'washroom_code'],
        how='inner'
    )

    df = df.merge(
        number_of_hourly_ratings,
        left_on=['DateTime', 'washroom_code'],
        right_on=[UTC_DATETIME_COL, 'washroom_code'],
        how='inner'
    )

    df_wide = (
        df_wait_raw
        .pivot(index="datetime", columns="washroom", values="avg_wait_minutes")
        .sort_index()
    )

    df_wait_resampled = df_wide.resample(resampling_period).mean().interpolate(method='linear')

    df_wait_long = (
        df_wait_resampled.stack()
        .to_frame('avg_wait_minutes')
        .rename_axis(['DateTime', 'washroom_code'])
        .reset_index()
        .fillna(0)
    )

    df = df.merge(
        df_wait_long,
        on=['DateTime', 'washroom_code'],
        how='inner'
    )

    df['hour_of_day'] = df['DateTime'].dt.hour
    df['day_of_week'] = df['DateTime'].dt.dayofweek

    df['lagged_score'] = (
        df.groupby('washroom_code')['percentage_happy']
        .shift(1)
    )

    df = df.sort_values('DateTime').reset_index(drop=True)

    target_col = 'percentage_happy'
    drop_cols = [
        'DateTime', 'washroom_code', target_col,
        'Arr Actual Arrival Time', 'Dep Actual Arrival Time',
        'washroom_name_x', 'washroom_name_y',
        'count', UTC_DATETIME_COL
    ]
    drop_cols = [c for c in drop_cols if c in df.columns]

    X = df.drop(columns=drop_cols)
    y = df[target_col]
    datetimes = df['DateTime']

    return X, y, datetimes, hourly_arrivals_stacked, hourly_departures_stacked
