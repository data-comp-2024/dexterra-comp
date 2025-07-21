import pandas as pd
import sys
import os
from ts_forecasting_metamodel import MLModel

class DayOfYearStatisticModel(MLModel):
    """
    Predicts for each date the chosen summary statistic of all historical values 
    on that month/day (or month-only if the day never occurs in train).

    how: one of 'mean', 'median', '25th_percentile', '75th_percentile'
    """
    VALID_HOW = {'mean', 'median', '25th_percentile', '75th_percentile'}

    def __init__(self, how: str = 'mean'):
        if how not in self.VALID_HOW:
            raise ValueError(f"how must be one of {self.VALID_HOW}")
        self.how = how
        self._day_stats: pd.Series = pd.Series(dtype=float)
        self._month_stats: pd.Series = pd.Series(dtype=float)

    def train(self, X, y, fit_kwargs: dict | None = None):
        # Build DataFrame like ProphetModel.train()
        if isinstance(X, pd.Series):
            df = X.to_frame(name="ds")
        else:
            df = X.rename(columns={X.columns[0]: "ds"}).copy()
        df["y"] = pd.Series(y).values

        # Extract month/day
        df["month"] = df["ds"].dt.month
        df["day"]   = df["ds"].dt.day

        # Choose aggregation
        if self.how == "mean":
            aggfunc = "mean"
            self._day_stats   = df.groupby(["month","day"])["y"].agg(aggfunc)
            self._month_stats = df.groupby("month")["y"].agg(aggfunc)
        elif self.how == "median":
            aggfunc = "median"
            self._day_stats   = df.groupby(["month","day"])["y"].agg(aggfunc)
            self._month_stats = df.groupby("month")["y"].agg(aggfunc)
        else:
            # percentiles
            q = 0.25 if self.how=="25th_percentile" else 0.75
            self._day_stats   = df.groupby(["month","day"])["y"].quantile(q)
            self._month_stats = df.groupby("month")["y"].quantile(q)

    def predict(self, X, predict_kwargs: dict | None = None):
        # Build future DataFrame
        if isinstance(X, pd.Series):
            future = X.to_frame(name="ds")
        else:
            future = X.rename(columns={X.columns[0]: "ds"}).copy()

        future["month"] = future["ds"].dt.month
        future["day"]   = future["ds"].dt.day

        # Lookup with month fallback
        def _lookup(row):
            key = (row["month"], row["day"])
            if key in self._day_stats.index:
                return self._day_stats.loc[key]
            else:
                return self._month_stats.loc[row["month"]]

        future["yhat"] = future.apply(_lookup, axis=1)
        return future[["ds", "yhat"]]
