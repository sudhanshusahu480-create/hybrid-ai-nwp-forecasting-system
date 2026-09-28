"""
Uncertainty Estimation Module.

Provides forecast confidence through:
- Inter-model spread analysis
- Quantile regression for probabilistic forecasts
- Extreme weather detection and flagging
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from typing import Optional
from loguru import logger


class UncertaintyEstimator:
    """
    Estimates forecast uncertainty from multi-model ensemble spread
    and quantile regression.
    """

    CONFIDENCE_THRESHOLDS = {
        "high": 0.3,    # Normalized spread < 0.3 → high confidence
        "medium": 0.6,  # Normalized spread < 0.6 → medium confidence
        "low": 1.0,     # Everything else → low confidence
    }

    def __init__(self, quantiles: tuple = (0.1, 0.25, 0.5, 0.75, 0.9)):
        self.quantiles = quantiles
        self._quantile_models: dict[float, GradientBoostingRegressor] = {}
        self._is_fitted = False
        self._variable_ranges: dict[str, tuple[float, float]] = {}

    def compute_spread(self, model_forecasts: np.ndarray) -> dict:
        """
        Compute inter-model spread statistics.

        Args:
            model_forecasts: Array of shape (n_samples, n_models)

        Returns:
            Dictionary with spread metrics.
        """
        spread_std = np.nanstd(model_forecasts, axis=1)
        spread_range = np.nanmax(model_forecasts, axis=1) - np.nanmin(model_forecasts, axis=1)
        spread_iqr = np.nanpercentile(model_forecasts, 75, axis=1) - np.nanpercentile(
            model_forecasts, 25, axis=1
        )

        return {
            "std": spread_std,
            "range": spread_range,
            "iqr": spread_iqr,
            "mean": np.nanmean(model_forecasts, axis=1),
            "coefficient_of_variation": spread_std / (np.abs(np.nanmean(model_forecasts, axis=1)) + 1e-6),
        }

    def classify_confidence(
        self, model_forecasts: np.ndarray, variable: str = "default"
    ) -> np.ndarray:
        """
        Classify forecast confidence as 'high', 'medium', or 'low'
        based on normalized inter-model spread.

        Args:
            model_forecasts: Array of shape (n_samples, n_models)
            variable: Variable name for range normalization

        Returns:
            Array of confidence labels.
        """
        spread = self.compute_spread(model_forecasts)
        cv = spread["coefficient_of_variation"]

        confidence = np.full(len(cv), "low", dtype=object)
        confidence[cv < self.CONFIDENCE_THRESHOLDS["high"]] = "high"
        confidence[
            (cv >= self.CONFIDENCE_THRESHOLDS["high"])
            & (cv < self.CONFIDENCE_THRESHOLDS["medium"])
        ] = "medium"

        return confidence

    def fit_quantile_regression(
        self, features: np.ndarray, targets: np.ndarray
    ) -> "UncertaintyEstimator":
        """
        Train quantile regression models for probabilistic forecasts.

        Args:
            features: Feature matrix (model forecasts + metadata)
            targets: Observed values

        Returns:
            self
        """
        mask = ~np.isnan(targets)
        X = features[mask]
        y = targets[mask]

        if len(y) < 30:
            logger.warning("Too few samples for quantile regression")
            return self

        for q in self.quantiles:
            model = GradientBoostingRegressor(
                loss="quantile",
                alpha=q,
                n_estimators=200,
                max_depth=4,
                learning_rate=0.05,
                random_state=42,
            )
            model.fit(X, y)
            self._quantile_models[q] = model
            logger.debug(f"Fitted quantile regression for q={q}")

        self._is_fitted = True
        logger.info(f"Quantile regression fitted for quantiles: {self.quantiles}")
        return self

    def predict_quantiles(self, features: np.ndarray) -> dict[float, np.ndarray]:
        """
        Predict quantile forecasts.

        Returns:
            Dict mapping quantile → predicted values array
        """
        if not self._is_fitted:
            logger.warning("Quantile regression not fitted")
            return {}

        predictions = {}
        for q, model in self._quantile_models.items():
            predictions[q] = model.predict(features)

        return predictions

    def prediction_intervals(
        self, features: np.ndarray, level: float = 0.9
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Compute prediction intervals at a given confidence level.

        Args:
            features: Feature matrix
            level: Confidence level (e.g., 0.9 for 90%)

        Returns:
            (lower_bound, upper_bound)
        """
        lower_q = (1 - level) / 2
        upper_q = 1 - lower_q

        quantile_preds = self.predict_quantiles(features)

        # Find closest available quantiles
        available_q = sorted(quantile_preds.keys())
        lower_key = min(available_q, key=lambda q: abs(q - lower_q))
        upper_key = min(available_q, key=lambda q: abs(q - upper_q))

        return quantile_preds[lower_key], quantile_preds[upper_key]


class ExtremeWeatherDetector:
    """
    Detects and flags extreme weather events from blended forecasts.
    """

    # Default thresholds for India
    THRESHOLDS = {
        "precipitation": {
            "yellow": 64.5,    # mm/day — IMD Yellow alert
            "orange": 115.5,   # mm/day — IMD Orange alert
            "red": 204.5,      # mm/day — IMD Red alert
        },
        "temperature_2m": {
            "heat_wave": 45.0,         # °C — Severe heat wave
            "heat_alert": 42.0,        # °C — Heat alert
            "cold_wave": 4.0,          # °C — Cold wave (plains)
        },
        "wind_speed_10m": {
            "gale": 62.0,              # km/h — Gale force
            "storm": 88.0,             # km/h — Storm
            "severe_cyclone": 118.0,   # km/h — Severe cyclonic storm
        },
    }

    @staticmethod
    def detect_extremes(
        forecast_data: dict[str, np.ndarray],
        confidence: Optional[np.ndarray] = None,
    ) -> list[dict]:
        """
        Scan forecast data for extreme weather conditions.

        Args:
            forecast_data: Dict mapping variable_name → forecast values
            confidence: Optional array of confidence levels

        Returns:
            List of alert dictionaries.
        """
        alerts = []

        for variable, values in forecast_data.items():
            thresholds = ExtremeWeatherDetector.THRESHOLDS.get(variable, {})

            for severity, threshold in thresholds.items():
                if variable == "temperature_2m" and "cold" in severity:
                    # Cold thresholds are "below" type
                    extreme_mask = values < threshold
                else:
                    extreme_mask = values > threshold

                if extreme_mask.any():
                    extreme_indices = np.where(extreme_mask)[0]
                    extreme_values = values[extreme_mask]

                    alerts.append({
                        "variable": variable,
                        "severity": severity,
                        "threshold": threshold,
                        "count": int(extreme_mask.sum()),
                        "max_value": float(np.max(extreme_values)),
                        "min_value": float(np.min(extreme_values)),
                        "indices": extreme_indices.tolist()[:10],  # First 10
                        "confidence": (
                            confidence[extreme_indices].tolist()[:10]
                            if confidence is not None
                            else None
                        ),
                    })

        # Sort by severity
        severity_order = {"red": 0, "severe_cyclone": 0, "heat_wave": 0,
                          "orange": 1, "storm": 1, "heat_alert": 1,
                          "yellow": 2, "gale": 2, "cold_wave": 2}
        alerts.sort(key=lambda a: severity_order.get(a["severity"], 99))

        return alerts

    @staticmethod
    def generate_alert_message(alert: dict, location: str = "Unknown") -> str:
        """Generate a human-readable alert message."""
        severity_emoji = {
            "red": "🔴", "severe_cyclone": "🔴", "heat_wave": "🔴",
            "orange": "🟠", "storm": "🟠", "heat_alert": "🟠",
            "yellow": "🟡", "gale": "🟡", "cold_wave": "🟡",
        }
        emoji = severity_emoji.get(alert["severity"], "⚠️")
        var_name = alert["variable"].replace("_", " ").title()

        return (
            f"{emoji} WEATHER ALERT — {location}\n"
            f"Severity: {alert['severity'].upper().replace('_', ' ')}\n"
            f"Variable: {var_name}\n"
            f"Peak Value: {alert['max_value']:.1f}\n"
            f"Threshold: {alert['threshold']:.1f}\n"
            f"Affected Hours: {alert['count']}\n"
            f"---\n"
            f"Hybrid AI-NWP Blending System | MoES"
        )
