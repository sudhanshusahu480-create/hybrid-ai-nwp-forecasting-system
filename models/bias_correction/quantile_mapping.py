"""
Bias Correction Module — Quantile Mapping & Adaptive Correction.

Implements statistical bias correction methods to remove systematic
errors from NWP model outputs before they enter the blending engine.
"""

import numpy as np
import pandas as pd
from scipy import interpolate, stats
from typing import Optional
from loguru import logger


class QuantileMapper:
    """
    Quantile Mapping bias correction.

    Maps the CDF of model forecasts to the CDF of observations,
    correcting systematic biases while preserving the forecast signal.
    """

    def __init__(self, n_quantiles: int = 100):
        self.n_quantiles = n_quantiles
        self.quantiles = np.linspace(0, 1, n_quantiles)
        self._model_quantiles: Optional[np.ndarray] = None
        self._obs_quantiles: Optional[np.ndarray] = None
        self._is_fitted = False

    def fit(self, model_data: np.ndarray, observed_data: np.ndarray) -> "QuantileMapper":
        """
        Fit the quantile mapper on historical model forecasts and observations.

        Args:
            model_data: 1D array of historical model forecasts
            observed_data: 1D array of corresponding observations
        """
        # Remove NaNs
        mask = ~(np.isnan(model_data) | np.isnan(observed_data))
        model_clean = model_data[mask]
        obs_clean = observed_data[mask]

        if len(model_clean) < 10:
            logger.warning("Too few samples for quantile mapping, skipping fit")
            return self

        self._model_quantiles = np.quantile(model_clean, self.quantiles)
        self._obs_quantiles = np.quantile(obs_clean, self.quantiles)
        self._is_fitted = True

        logger.info(
            f"QuantileMapper fitted on {len(model_clean)} samples, "
            f"model range: [{model_clean.min():.2f}, {model_clean.max():.2f}], "
            f"obs range: [{obs_clean.min():.2f}, {obs_clean.max():.2f}]"
        )
        return self

    def transform(self, model_data: np.ndarray) -> np.ndarray:
        """
        Apply quantile mapping correction to new model forecasts.

        Args:
            model_data: 1D array of model forecasts to correct

        Returns:
            Bias-corrected forecast array.
        """
        if not self._is_fitted:
            logger.warning("QuantileMapper not fitted, returning uncorrected data")
            return model_data.copy()

        # Interpolate: map model CDF → observation CDF
        corrected = np.interp(
            model_data,
            self._model_quantiles,
            self._obs_quantiles,
        )
        return corrected

    def fit_transform(
        self, model_data: np.ndarray, observed_data: np.ndarray
    ) -> np.ndarray:
        """Fit on historical data and transform in one step."""
        self.fit(model_data, observed_data)
        return self.transform(model_data)

    def get_bias_stats(self) -> dict:
        """Return summary bias statistics."""
        if not self._is_fitted:
            return {}
        return {
            "median_model": float(np.median(self._model_quantiles)),
            "median_obs": float(np.median(self._obs_quantiles)),
            "median_bias": float(
                np.median(self._model_quantiles) - np.median(self._obs_quantiles)
            ),
            "mean_abs_correction": float(
                np.mean(np.abs(self._model_quantiles - self._obs_quantiles))
            ),
        }


class AdaptiveBiasCorrector:
    """
    Adaptive bias correction with rolling windows.

    Maintains a per-model, per-variable, per-location QuantileMapper
    that is retrained on a rolling window of recent data. This ensures
    the correction adapts to seasonal shifts and model updates.
    """

    def __init__(self, window_days: int = 30, n_quantiles: int = 100):
        self.window_days = window_days
        self.n_quantiles = n_quantiles
        # Storage: (model, variable, lat, lon) → QuantileMapper
        self._mappers: dict[tuple, QuantileMapper] = {}
        # Historical data buffer: (model, variable, lat, lon) → list of (timestamp, model_val, obs_val)
        self._history: dict[tuple, list] = {}

    def _key(self, model: str, variable: str, lat: float, lon: float) -> tuple:
        return (model, variable, round(lat, 2), round(lon, 2))

    def add_observation(
        self,
        model: str,
        variable: str,
        lat: float,
        lon: float,
        timestamp: pd.Timestamp,
        model_value: float,
        observed_value: float,
    ):
        """Add a forecast-observation pair to the history buffer."""
        key = self._key(model, variable, lat, lon)
        if key not in self._history:
            self._history[key] = []
        self._history[key].append((timestamp, model_value, observed_value))

    def update_mapper(self, model: str, variable: str, lat: float, lon: float):
        """
        Retrain the QuantileMapper using the rolling window of recent data.
        """
        key = self._key(model, variable, lat, lon)
        history = self._history.get(key, [])

        if not history:
            return

        # Filter to rolling window
        cutoff = pd.Timestamp.now() - pd.Timedelta(days=self.window_days)
        recent = [(t, m, o) for t, m, o in history if t >= cutoff]

        if len(recent) < 20:
            logger.debug(f"Insufficient data for bias update: {key}, {len(recent)} samples")
            return

        model_vals = np.array([m for _, m, _ in recent])
        obs_vals = np.array([o for _, _, o in recent])

        mapper = QuantileMapper(n_quantiles=self.n_quantiles)
        mapper.fit(model_vals, obs_vals)
        self._mappers[key] = mapper

        logger.info(f"Updated bias corrector for {key} with {len(recent)} samples")

    def correct(
        self,
        model: str,
        variable: str,
        lat: float,
        lon: float,
        forecast_values: np.ndarray,
    ) -> np.ndarray:
        """
        Apply bias correction to forecast values.

        Falls back to uncorrected values if no mapper is available.
        """
        key = self._key(model, variable, lat, lon)
        mapper = self._mappers.get(key)

        if mapper is None or not mapper._is_fitted:
            return forecast_values.copy()

        return mapper.transform(forecast_values)

    def get_all_bias_stats(self) -> dict:
        """Return bias statistics for all fitted mappers."""
        stats = {}
        for key, mapper in self._mappers.items():
            if mapper._is_fitted:
                model, variable, lat, lon = key
                stats[f"{model}/{variable}@({lat},{lon})"] = mapper.get_bias_stats()
        return stats


class ConditionalBiasAnalyzer:
    """
    Analyzes bias conditioned on meteorological regimes.

    Breaks down model bias by:
    - Season (DJF, MAM, JJA, SON)
    - Lead time (T+6h, T+12h, ..., T+168h)
    - Weather regime (heavy rain, clear sky, moderate)
    """

    SEASONS = {
        "DJF": [12, 1, 2],   # Winter
        "MAM": [3, 4, 5],    # Pre-monsoon
        "JJA": [6, 7, 8],    # Monsoon
        "SON": [9, 10, 11],  # Post-monsoon
    }

    @staticmethod
    def analyze_seasonal_bias(
        forecasts: pd.Series,
        observations: pd.Series,
    ) -> dict[str, dict]:
        """
        Compute bias statistics broken down by season.

        Returns:
            Dict mapping season → {mean_bias, rmse, mae, count}
        """
        results = {}
        for season, months in ConditionalBiasAnalyzer.SEASONS.items():
            mask = forecasts.index.month.isin(months)
            fc = forecasts[mask]
            obs = observations[mask]

            if len(fc) < 5:
                continue

            errors = fc.values - obs.values
            results[season] = {
                "mean_bias": float(np.nanmean(errors)),
                "rmse": float(np.sqrt(np.nanmean(errors**2))),
                "mae": float(np.nanmean(np.abs(errors))),
                "count": int(mask.sum()),
            }

        return results

    @staticmethod
    def analyze_lead_time_bias(
        forecasts: pd.DataFrame,
        observations: pd.Series,
        lead_time_col: str = "lead_time_hours",
    ) -> dict[int, dict]:
        """
        Compute bias as a function of forecast lead time.

        Args:
            forecasts: DataFrame with a lead_time column and forecast values
            observations: Corresponding observation values
            lead_time_col: Column name for lead time in hours

        Returns:
            Dict mapping lead_time_hours → {mean_bias, rmse, mae}
        """
        results = {}
        for lt in sorted(forecasts[lead_time_col].unique()):
            mask = forecasts[lead_time_col] == lt
            fc = forecasts.loc[mask, "forecast"].values
            obs = observations[mask].values

            if len(fc) < 5:
                continue

            errors = fc - obs
            results[int(lt)] = {
                "mean_bias": float(np.nanmean(errors)),
                "rmse": float(np.sqrt(np.nanmean(errors**2))),
                "mae": float(np.nanmean(np.abs(errors))),
            }

        return results

    @staticmethod
    def detect_weather_regime(
        precipitation: np.ndarray,
        wind_speed: np.ndarray,
    ) -> np.ndarray:
        """
        Simple weather regime classifier based on precipitation and wind.

        Returns:
            Array of regime labels: 'heavy_rain', 'moderate', 'clear', 'windy'
        """
        regimes = np.full(len(precipitation), "clear", dtype=object)
        regimes[precipitation > 50] = "heavy_rain"
        regimes[(precipitation > 5) & (precipitation <= 50)] = "moderate"
        regimes[(wind_speed > 40) & (precipitation <= 5)] = "windy"
        return regimes
