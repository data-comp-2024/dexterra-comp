import pandas as pd
import numpy as np
from prophet import Prophet

import sys
import os
from ts_forecasting_metamodel import MLModel

class ProphetModel(MLModel):
    def __init__(self, init_kwargs: dict | None = None):
        """
        init_kwargs: passed directly to Prophet(...)
        """
        init_kwargs = init_kwargs or {}
        self.m = Prophet(**init_kwargs)

    def train(self, X, y, fit_kwargs: dict | None = None):
        """
        X:        pd.Series or pd.DataFrame with a single datetime column
        y:        pd.Series or array-like with target values
        fit_kwargs: passed directly to self.m.fit(...)
        """
        fit_kwargs = fit_kwargs or {}

        # build the prophet dataframe
        if isinstance(X, pd.Series):
            df = X.to_frame(name="ds")
        else:
            df = X.rename(columns={X.columns[0]: "ds"}).copy()

        # add the y column
        if isinstance(y, pd.Series):
            df["y"] = y.values
        else:
            df["y"] = pd.Series(y).values

        # fit the model with any extra args
        self.m.fit(df, **fit_kwargs)

    def predict(self, X, predict_kwargs: dict | None = None):
        """
        X:              pd.Series or pd.DataFrame of future ds values
        predict_kwargs: passed directly to self.m.predict(...)
        """
        predict_kwargs = predict_kwargs or {}

        if isinstance(X, pd.Series):
            future = X.to_frame(name="ds")
        else:
            future = X.rename(columns={X.columns[0]: "ds"}).copy()

        return self.m.predict(future, **predict_kwargs)

