# 🌦️ SIH26081 — Hybrid AI-NWP Multi-Model Forecast Blending System

> Smart India Hackathon 2026 | Ministry of Earth Sciences (MoES)

An intelligent weather forecasting system that blends multiple NWP model outputs using AI/ML to produce superior, bias-corrected forecasts with uncertainty estimation and real-time GIS visualization.

## 🏗️ Architecture

```
Data Sources (GFS, ECMWF, IMD) 
    → Data Pipeline (Fetch, Regrid, Standardize)
    → Bias Correction (Quantile Mapping)
    → AI Blending Engine (BMA → XGBoost → U-Net)
    → Uncertainty Estimation (Quantile Regression)
    → GIS Dashboard + REST API + Alerts
```

## 🚀 Quick Start

### Backend
```bash
cd api
pip install -r ../requirements.txt
cp ../.env.example ../.env
python main.py
```

### Frontend Dashboard
```bash
cd dashboard
npm install
npm run dev
```

### Fetch Weather Data
```bash
python -m data.fetch_forecasts
```

## 📁 Project Structure

```
├── api/              # FastAPI backend
├── data/             # Data ingestion & processing
├── models/           # ML models (bias correction, blending)
├── dashboard/        # React + Leaflet frontend
├── alerts/           # Alert dispatch system
├── notebooks/        # Jupyter exploration
└── tests/            # Test suite
```

## 🔑 Key Features

- **Multi-model ingestion** from GFS, ECMWF, IMD via Open-Meteo
- **Adaptive bias correction** using quantile mapping
- **3-level blending**: BMA → XGBoost → U-Net spatial blending
- **Uncertainty estimation** with confidence maps
- **Interactive GIS dashboard** with model comparison
- **Automated alerts** for extreme weather events

## 📊 Evaluation

The blended forecast is evaluated against ERA5 reanalysis and IMD observations using RMSE, MAE, CRPS, and Brier Skill Score.

## 🛠️ Tech Stack

Python | FastAPI | PyTorch | XGBoost | React | Leaflet.js | PostgreSQL | Redis

---

**Team:** SIH 2026 | **Organization:** Ministry of Earth Sciences
