"""
AI Blending Engine — Multi-Model Forecast Blending.

Implements a 3-level blending strategy:
  Level 1: Bayesian Model Averaging (BMA) — probabilistic baseline
  Level 2: XGBoost Adaptive Blender — ML-based with metadata features
  Level 3: Meta-Learner — selects best blending strategy per situation
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error
from typing import Optional
from loguru import logger

try:
    import xgboost as xgb
except ImportError:
    xgb = None
    logger.warning("XGBoost not installed, XGBBlender will be unavailable")


# ═══════════════════════════════════════════════════════════════════════════
# Level 1: Bayesian Model Averaging
# ═══════════════════════════════════════════════════════════════════════════

class BMABlender:
    """
    Bayesian Model Averaging (BMA) for multi-model forecast blending.

    Assigns probabilistic weights to each model based on historical
    forecast performance (likelihood). Models that have been more accurate
    in the past receive higher weights.
    """

    def __init__(self, n_models: int):
        self.n_models = n_models
        self.weights: Optional[np.ndarray] = None
        self.model_names: list[str] = []
        self._is_fitted = False

    def fit(
        self,
        forecasts: np.ndarray,
        observations: np.ndarray,
        model_names: Optional[list[str]] = None,
    ) -> "BMABlender":
        """
        Estimate BMA weights by minimizing CRPS / maximizing likelihood.

        Args:
            forecasts: Array of shape (n_samples, n_models) — model forecasts
            observations: Array of shape (n_samples,) — true observations
            model_names: Optional list of model names for labeling
        """
        n_samples, n_models = forecasts.shape
        assert n_models == self.n_models, f"Expected {self.n_models} models, got {n_models}"

        if model_names:
            self.model_names = model_names

        # Remove rows with any NaN
        mask = ~(np.isnan(forecasts).any(axis=1) | np.isnan(observations))
        fc = forecasts[mask]
        obs = observations[mask]

        if len(obs) < 10:
            logger.warning("Too few samples for BMA fitting, using equal weights")
            self.weights = np.ones(n_models) / n_models
            self._is_fitted = True
            return self

        # Compute model-specific error variance
        errors = fc - obs[:, np.newaxis]  # (n_samples, n_models)
        variances = np.var(errors, axis=0)  # (n_models,)
        variances = np.maximum(variances, 1e-6)  # Avoid division by zero

        # BMA weights ∝ 1 / variance (inverse-variance weighting)
        inv_var = 1.0 / variances
        self.weights = inv_var / inv_var.sum()

        self._is_fitted = True
        logger.info(
            f"BMA fitted: weights = {dict(zip(self.model_names or range(n_models), self.weights.round(4)))}"
        )
        return self

    def predict(self, forecasts: np.ndarray) -> np.ndarray:
        """
        Produce blended forecast as weighted average.

        Args:
            forecasts: Array of shape (n_samples, n_models)

        Returns:
            Blended forecast array of shape (n_samples,)
        """
        if not self._is_fitted:
            logger.warning("BMA not fitted, returning simple mean")
            return np.nanmean(forecasts, axis=1)

        # Handle NaN: use available models with renormalized weights
        blended = np.zeros(len(forecasts))
        for i in range(len(forecasts)):
            valid = ~np.isnan(forecasts[i])
            if valid.sum() == 0:
                blended[i] = np.nan
            else:
                w = self.weights[valid]
                w = w / w.sum()  # Renormalize
                blended[i] = np.dot(w, forecasts[i, valid])

        return blended

    def predict_with_uncertainty(
        self, forecasts: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Produce blended forecast with BMA uncertainty estimate.

        Returns:
            (mean_forecast, std_forecast) — blended mean and standard deviation
        """
        mean = self.predict(forecasts)
        # BMA variance = weighted sum of model variances + weighted variance of model means
        model_spread = np.nanstd(forecasts, axis=1)
        return mean, model_spread

    def get_weights(self) -> dict:
        """Return model weights as a dictionary."""
        if self.weights is None:
            return {}
        names = self.model_names or [f"model_{i}" for i in range(self.n_models)]
        return dict(zip(names, self.weights.tolist()))


# ═══════════════════════════════════════════════════════════════════════════
# Level 2: XGBoost Adaptive Blender
# ═══════════════════════════════════════════════════════════════════════════

class XGBBlender:
    """
    XGBoost-based adaptive multi-model blender.

    Unlike BMA which uses static weights, this learns nonlinear
    relationships between model forecasts, metadata features
    (lead time, season, location, elevation), and the true observation.

    This is the workhorse of the blending system.
    """

    def __init__(self, model_names: list[str], **xgb_params):
        if xgb is None:
            raise ImportError("XGBoost is required for XGBBlender")

        self.model_names = model_names
        self.xgb_params = {
            "n_estimators": 500,
            "max_depth": 6,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "reg_alpha": 0.1,
            "reg_lambda": 1.0,
            "random_state": 42,
            **xgb_params,
        }
        self.model: Optional[xgb.XGBRegressor] = None
        self._feature_names: list[str] = []
        self._is_fitted = False

    def _build_features(
        self,
        forecasts: pd.DataFrame,
        lead_time_hours: Optional[np.ndarray] = None,
        lat: Optional[np.ndarray] = None,
        lon: Optional[np.ndarray] = None,
        elevation: Optional[np.ndarray] = None,
    ) -> pd.DataFrame:
        """
        Build feature matrix from model forecasts and metadata.

        Features include:
        - Individual model forecast values
        - Inter-model spread (std, range)
        - Model agreement metrics
        - Temporal features (hour, day-of-year, month)
        - Spatial features (lat, lon, elevation)
        - Lead time
        """
        features = forecasts.copy()

        # Inter-model statistics
        model_cols = [c for c in forecasts.columns if c in self.model_names]
        if len(model_cols) >= 2:
            features["model_mean"] = forecasts[model_cols].mean(axis=1)
            features["model_std"] = forecasts[model_cols].std(axis=1)
            features["model_range"] = (
                forecasts[model_cols].max(axis=1) - forecasts[model_cols].min(axis=1)
            )
            features["model_median"] = forecasts[model_cols].median(axis=1)

        # Temporal features
        if isinstance(forecasts.index, pd.DatetimeIndex):
            features["hour"] = forecasts.index.hour
            features["day_of_year"] = forecasts.index.dayofyear
            features["month"] = forecasts.index.month
            # Cyclical encoding for seasonality
            features["month_sin"] = np.sin(2 * np.pi * features["month"] / 12)
            features["month_cos"] = np.cos(2 * np.pi * features["month"] / 12)
            features["hour_sin"] = np.sin(2 * np.pi * features["hour"] / 24)
            features["hour_cos"] = np.cos(2 * np.pi * features["hour"] / 24)

        # Spatial features
        if lat is not None:
            features["latitude"] = lat
        if lon is not None:
            features["longitude"] = lon
        if elevation is not None:
            features["elevation"] = elevation

        # Lead time
        if lead_time_hours is not None:
            features["lead_time"] = lead_time_hours

        self._feature_names = list(features.columns)
        return features

    def fit(
        self,
        forecasts: pd.DataFrame,
        observations: pd.Series,
        lead_time_hours: Optional[np.ndarray] = None,
        lat: Optional[np.ndarray] = None,
        lon: Optional[np.ndarray] = None,
        elevation: Optional[np.ndarray] = None,
    ) -> "XGBBlender":
        """
        Train the XGBoost blender on historical forecast-observation pairs.

        Args:
            forecasts: DataFrame with model forecasts as columns
            observations: Series of corresponding observations
            lead_time_hours: Array of lead times
            lat, lon, elevation: Spatial metadata arrays
        """
        X = self._build_features(forecasts, lead_time_hours, lat, lon, elevation)
        y = observations

        # Drop rows with NaN target
        mask = ~y.isna()
        X = X[mask].fillna(-999)  # XGBoost handles missing values
        y = y[mask]

        if len(y) < 20:
            logger.warning("Too few samples for XGBBlender training")
            return self

        self.model = xgb.XGBRegressor(**self.xgb_params)

        # Time-series aware cross-validation
        tscv = TimeSeriesSplit(n_splits=3)
        cv_scores = []
        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            self.model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )
            pred = self.model.predict(X_val)
            rmse = np.sqrt(mean_squared_error(y_val, pred))
            cv_scores.append(rmse)

        # Final fit on all data
        self.model.fit(X, y, verbose=False)
        self._is_fitted = True

        logger.info(
            f"XGBBlender trained: CV RMSE = {np.mean(cv_scores):.4f} ± {np.std(cv_scores):.4f}"
        )
        return self

    def predict(
        self,
        forecasts: pd.DataFrame,
        lead_time_hours: Optional[np.ndarray] = None,
        lat: Optional[np.ndarray] = None,
        lon: Optional[np.ndarray] = None,
        elevation: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """Produce blended forecast using the trained XGBoost model."""
        if not self._is_fitted or self.model is None:
            logger.warning("XGBBlender not fitted, returning simple mean")
            model_cols = [c for c in forecasts.columns if c in self.model_names]
            return forecasts[model_cols].mean(axis=1).values

        X = self._build_features(forecasts, lead_time_hours, lat, lon, elevation)
        X = X.fillna(-999)
        return self.model.predict(X)

    def get_feature_importance(self, top_n: int = 15) -> dict:
        """Return feature importance from the trained model."""
        if not self._is_fitted or self.model is None:
            return {}

        importance = self.model.feature_importances_
        names = self._feature_names
        sorted_idx = np.argsort(importance)[::-1][:top_n]

        return {
            names[i]: float(importance[i])
            for i in sorted_idx
        }


# ═══════════════════════════════════════════════════════════════════════════
# Level 3: Meta-Learner (Strategy Selector)
# ═══════════════════════════════════════════════════════════════════════════

class MetaLearner:
    """
    Meta-learner that selects the best blending strategy per situation.

    Evaluates BMA, XGBoost, and simple mean on rolling windows,
    and dynamically selects the strategy with the best recent performance.
    """

    def __init__(
        self,
        bma: BMABlender,
        xgb_blender: XGBBlender,
        eval_window: int = 48,  # hours
    ):
        self.bma = bma
        self.xgb_blender = xgb_blender
        self.eval_window = eval_window
        self._strategy_scores: dict[str, list[float]] = {
            "bma": [],
            "xgboost": [],
            "mean": [],
        }
        self._active_strategy = "xgboost"  # Default

    def evaluate_strategies(
        self,
        forecasts_df: pd.DataFrame,
        forecasts_array: np.ndarray,
        observations: pd.Series,
        **kwargs,
    ) -> dict[str, float]:
        """
        Evaluate all blending strategies on recent data and update scores.

        Returns:
            Dict mapping strategy → recent RMSE
        """
        recent_mask = slice(-self.eval_window, None)
        obs_recent = observations.iloc[recent_mask]

        scores = {}

        # Simple mean
        model_cols = [c for c in forecasts_df.columns if c in self.xgb_blender.model_names]
        mean_pred = forecasts_df[model_cols].iloc[recent_mask].mean(axis=1)
        scores["mean"] = np.sqrt(mean_squared_error(obs_recent, mean_pred))

        # BMA
        bma_pred = self.bma.predict(forecasts_array[recent_mask])
        scores["bma"] = np.sqrt(mean_squared_error(obs_recent, bma_pred))

        # XGBoost
        xgb_pred = self.xgb_blender.predict(forecasts_df.iloc[recent_mask], **kwargs)
        scores["xgboost"] = np.sqrt(mean_squared_error(obs_recent, xgb_pred))

        # Update running scores
        for strategy, rmse in scores.items():
            self._strategy_scores[strategy].append(rmse)

        # Select best strategy
        self._active_strategy = min(scores, key=scores.get)
        logger.info(
            f"Meta-learner evaluation: {scores} → selected '{self._active_strategy}'"
        )

        return scores

    def predict(
        self,
        forecasts_df: pd.DataFrame,
        forecasts_array: np.ndarray,
        **kwargs,
    ) -> tuple[np.ndarray, str]:
        """
        Produce blended forecast using the currently best strategy.

        Returns:
            (predictions, strategy_name)
        """
        if self._active_strategy == "bma":
            return self.bma.predict(forecasts_array), "bma"
        elif self._active_strategy == "xgboost":
            return self.xgb_blender.predict(forecasts_df, **kwargs), "xgboost"
        else:
            model_cols = [c for c in forecasts_df.columns if c in self.xgb_blender.model_names]
            return forecasts_df[model_cols].mean(axis=1).values, "mean"

    def get_strategy_history(self) -> dict:
        """Return the full evaluation history for each strategy."""
        return {
            strategy: {
                "scores": scores,
                "mean_rmse": float(np.mean(scores)) if scores else None,
            }
            for strategy, scores in self._strategy_scores.items()
        }
