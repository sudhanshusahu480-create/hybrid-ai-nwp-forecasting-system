"""
Data Ingestion Module — Fetch multi-model weather forecasts.

Uses Open-Meteo API to fetch GFS, ECMWF (IFS), JMA, ICON, and other
NWP model outputs for Indian cities. This is the primary data source
for the MVP; in production, direct GRIB downloads would supplement this.
"""

import httpx
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
from loguru import logger

# ─── Constants ───────────────────────────────────────────────────────────

# Open-Meteo forecast API endpoints (one per model)
MODEL_ENDPOINTS = {
    "gfs": "https://api.open-meteo.com/v1/gfs",
    "ecmwf_ifs": "https://api.open-meteo.com/v1/ecmwf",
    "jma": "https://api.open-meteo.com/v1/jma",
    "icon": "https://api.open-meteo.com/v1/dwd-icon",
    "gem": "https://api.open-meteo.com/v1/gem",
}

# Weather variables to fetch (hourly)
HOURLY_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "cloud_cover",
    "dew_point_2m",
]

# Key Indian cities for MVP (lat, lon, name, state)
INDIAN_CITIES = [
    {"name": "Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090},
    {"name": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777},
    {"name": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
    {"name": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639},
    {"name": "Bangalore", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
    {"name": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
    {"name": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714},
    {"name": "Pune", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567},
    {"name": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873},
    {"name": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462},
    {"name": "Guwahati", "state": "Assam", "lat": 26.1445, "lon": 91.7362},
    {"name": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126},
    {"name": "Thiruvananthapuram", "state": "Kerala", "lat": 8.5241, "lon": 76.9366},
    {"name": "Chandigarh", "state": "Chandigarh", "lat": 30.7333, "lon": 76.7794},
    {"name": "Patna", "state": "Bihar", "lat": 25.6093, "lon": 85.1376},
]

# Dense grid for spatial blending (0.5° grid over India)
INDIA_GRID = {
    "lat_range": (6.0, 37.0),
    "lon_range": (68.0, 98.0),
    "step": 0.5,
}


def generate_india_grid() -> list[dict]:
    """Generate a 0.5° lat/lon grid covering India."""
    lats = np.arange(
        INDIA_GRID["lat_range"][0],
        INDIA_GRID["lat_range"][1] + INDIA_GRID["step"],
        INDIA_GRID["step"],
    )
    lons = np.arange(
        INDIA_GRID["lon_range"][0],
        INDIA_GRID["lon_range"][1] + INDIA_GRID["step"],
        INDIA_GRID["step"],
    )
    grid_points = []
    for lat in lats:
        for lon in lons:
            grid_points.append({"lat": round(lat, 2), "lon": round(lon, 2)})
    return grid_points


async def fetch_model_forecast(
    model_name: str,
    lat: float,
    lon: float,
    forecast_days: int = 7,
    past_days: int = 5,
) -> Optional[pd.DataFrame]:
    """
    Fetch hourly forecast data from a single NWP model via Open-Meteo.

    Args:
        model_name: Key from MODEL_ENDPOINTS (e.g., 'gfs', 'ecmwf_ifs')
        lat: Latitude
        lon: Longitude
        forecast_days: Number of days to forecast ahead
        past_days: Number of past days to include (for verification)

    Returns:
        DataFrame with datetime index and weather variables, or None on error.
    """
    url = MODEL_ENDPOINTS.get(model_name)
    if not url:
        logger.error(f"Unknown model: {model_name}")
        return None

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(HOURLY_VARIABLES),
        "forecast_days": forecast_days,
        "past_days": past_days,
        "timezone": "Asia/Kolkata",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        hourly = data.get("hourly", {})
        if not hourly or "time" not in hourly:
            logger.warning(f"No hourly data from {model_name} for ({lat}, {lon})")
            return None

        df = pd.DataFrame(hourly)
        df["time"] = pd.to_datetime(df["time"])
        df = df.set_index("time")
        df["model"] = model_name
        df["latitude"] = lat
        df["longitude"] = lon

        logger.info(
            f"Fetched {len(df)} hours from {model_name} for ({lat:.2f}, {lon:.2f})"
        )
        return df

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching {model_name}: {e.response.status_code}")
        return None
    except Exception as e:
        logger.error(f"Error fetching {model_name} for ({lat}, {lon}): {e}")
        return None


async def fetch_all_models_for_location(
    lat: float,
    lon: float,
    models: Optional[list[str]] = None,
    forecast_days: int = 7,
    past_days: int = 5,
) -> dict[str, pd.DataFrame]:
    """
    Fetch forecasts from all (or specified) NWP models for a single location.

    Returns:
        Dictionary mapping model_name → DataFrame
    """
    if models is None:
        models = list(MODEL_ENDPOINTS.keys())

    results = {}
    for model_name in models:
        df = await fetch_model_forecast(
            model_name, lat, lon, forecast_days, past_days
        )
        if df is not None:
            results[model_name] = df

    logger.info(
        f"Successfully fetched {len(results)}/{len(models)} models for ({lat:.2f}, {lon:.2f})"
    )
    return results


async def fetch_all_cities(
    models: Optional[list[str]] = None,
    forecast_days: int = 7,
    past_days: int = 5,
) -> dict[str, dict[str, pd.DataFrame]]:
    """
    Fetch forecasts from all models for all Indian cities.

    Returns:
        Nested dict: city_name → model_name → DataFrame
    """
    all_data = {}
    for city in INDIAN_CITIES:
        logger.info(f"Fetching forecasts for {city['name']}...")
        city_data = await fetch_all_models_for_location(
            city["lat"], city["lon"], models, forecast_days, past_days
        )
        all_data[city["name"]] = city_data

    return all_data


def merge_model_forecasts(
    model_data: dict[str, pd.DataFrame],
    variable: str = "temperature_2m",
) -> pd.DataFrame:
    """
    Merge forecasts from multiple models into a single DataFrame
    with one column per model for a given variable.

    Args:
        model_data: Dict mapping model_name → forecast DataFrame
        variable: The weather variable to extract

    Returns:
        DataFrame with datetime index and one column per model.
    """
    merged = pd.DataFrame()
    for model_name, df in model_data.items():
        if variable in df.columns:
            merged[model_name] = df[variable]

    merged = merged.dropna(how="all")
    return merged


# ─── CLI Entry Point ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import asyncio

    async def main():
        logger.info("Starting multi-model data fetch for Indian cities...")
        all_data = await fetch_all_cities(forecast_days=3, past_days=2)

        for city, models in all_data.items():
            print(f"\n{'='*50}")
            print(f"📍 {city}: {len(models)} models fetched")
            for model_name, df in models.items():
                print(f"  └── {model_name}: {len(df)} hours, columns: {list(df.columns[:4])}...")

    asyncio.run(main())
