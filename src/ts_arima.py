import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
import sys
import os
from ts_forecasting_metamodel import MLModel

class ARIMAModel(MLModel):
    def __init__(
        self,
        order: tuple[int, int, int] = (1, 1, 1),
        model_kwargs: dict | None = None,
    ):
        """
        A wrapper for statsmodels ARIMA that preserves your series’ original name.
        
        Parameters
        ----------
        order : (p, d, q)
            The ARIMA order.
        model_kwargs : dict, optional
            Extra kwargs passed to ARIMA(...), e.g. seasonal_order, trend, etc.
        """
        self.order = order
        self.model_kwargs = model_kwargs or {}
        self._fitted_model = None
        self._endog_name = None

    def train(
        self, X,
        y: pd.Series,
        fit_kwargs: dict | None = None,
    ) -> None:
        """
        Fit the ARIMA to your observed series.

        Parameters
        ----------
        y : pd.Series
            The univariate time series with its datetime index.
        fit_kwargs : dict, optional
            Extra kwargs passed to .fit(), e.g. method_kwargs.
        """
        fit_kwargs = fit_kwargs or {}
        # Remember the series name for future forecasts
        self._endog_name = y.name if y.name is not None else "forecast"
        # Fit
        if not X.dtype == 'datetime64[ns]':
            X = pd.to_datetime(X)  # Ensure X is datetime
        y = y.to_frame().set_index(X)  # Ensure y is indexed by X
        model = ARIMA(endog=y, order=self.order, **self.model_kwargs)
        self._fitted_model = model.fit(**fit_kwargs)

    def predict(
        self,
        X: pd.Series | pd.DataFrame,
        predict_kwargs: dict | None = None,
    ) -> pd.Series:
        """
        Produce out‐of‐sample forecasts.

        Parameters
        ----------
        X : pd.Series or pd.DataFrame
            Future datetimes (as index of X); values are ignored.
        predict_kwargs : dict, optional
            Passed directly to self._fitted_model.forecast(...)

        Returns
        -------
        pd.Series
            Forecasted values, indexed by X’s index, named after the original series.
        """
        if self._fitted_model is None:
            raise RuntimeError("Model must be trained before calling predict().")
        predict_kwargs = predict_kwargs or {}

        # Determine future index
        if isinstance(X, pd.Series):
            future_index = X.index
        else:
            future_index = X.index

        # Forecast
        steps = len(future_index)
        preds = self._fitted_model.forecast(steps=steps, **predict_kwargs)

        # Return as Series with preserved name
        return pd.Series(preds.values, index=future_index, name=self._endog_name)
