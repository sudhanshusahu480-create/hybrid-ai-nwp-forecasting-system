import { useMemo } from 'react'

export default function ExtremeWeatherIntelligence({
  forecastData,
  selectedCity,
  onOpenEventDetails,
}) {
  const intel = useMemo(() => {
    if (forecastData?.station_summary) {
      const s = forecastData.station_summary
      const rainLvl = (s.rainfall?.risk_level || 'Low').toLowerCase()
      const heatLvl = (s.risk?.heat_wave || 'Low').toLowerCase()
      const windLvl = (s.risk?.high_wind || 'Low').toLowerCase()
      const thunderLvl = (s.risk?.thunderstorm || 'Low').toLowerCase()

      return {
        rainfall: {
          risk: `${s.rainfall?.risk_level?.toUpperCase() || 'LOW'} RISK`,
          level: rainLvl === 'high' ? 'high' : rainLvl === 'moderate' ? 'moderate' : 'low',
          prob: s.rainfall?.probability ?? 0,
          exp: `${s.rainfall?.total_24h ?? 0} mm (24h Total)`,
        },
        heat: {
          risk: `${s.risk?.heat_wave?.toUpperCase() || 'LOW'} RISK`,
          level: heatLvl === 'high' ? 'high' : heatLvl === 'moderate' ? 'moderate' : 'low',
          prob: heatLvl === 'high' ? 85 : heatLvl === 'moderate' ? 45 : 12,
          exp: s.temperature?.max_24h ? `Max: ${s.temperature.max_24h} °C` : 'No thermal alert',
        },
        wind: {
          risk: `${s.risk?.high_wind?.toUpperCase() || 'LOW'} RISK`,
          level: windLvl === 'high' ? 'high' : windLvl === 'moderate' ? 'moderate' : 'low',
          prob: windLvl === 'high' ? 80 : windLvl === 'moderate' ? 42 : 15,
          exp: s.wind?.speed ? `Speed: ${s.wind.speed} km/h (${s.wind.direction})` : 'Normal vector',
        },
        thunder: {
          risk: `${s.risk?.thunderstorm?.toUpperCase() || 'LOW'} RISK`,
          level: thunderLvl === 'high' ? 'high' : thunderLvl === 'moderate' ? 'moderate' : 'low',
          prob: thunderLvl === 'moderate' ? 51 : 18,
          exp: thunderLvl === 'moderate' ? 'Possible in next 24h' : 'No convective activity',
        },
      }
    }

    // Dynamic location-based fallback
    const lat = selectedCity?.lat || 28.61
    const lon = selectedCity?.lon || 77.20
    const isCoastal = lon < 74 || lon > 84 || lat < 14

    return {
      rainfall: {
        risk: isCoastal ? 'MODERATE RISK' : 'LOW RISK',
        level: isCoastal ? 'moderate' : 'low',
        prob: isCoastal ? 58 : 22,
        exp: isCoastal ? '15 – 35 mm' : '0 – 5 mm',
      },
      heat: {
        risk: lat > 24 ? 'MODERATE RISK' : 'LOW RISK',
        level: lat > 24 ? 'moderate' : 'low',
        prob: lat > 24 ? 40 : 15,
        exp: lat > 24 ? 'Max: 38.5 °C' : 'Normal',
      },
      wind: {
        risk: isCoastal ? 'MODERATE' : 'LOW',
        level: isCoastal ? 'moderate' : 'low',
        prob: isCoastal ? 45 : 18,
        exp: isCoastal ? 'Expected gust: 38 km/h' : 'Calm / Gentle',
      },
      thunder: {
        risk: isCoastal ? 'MODERATE' : 'LOW',
        level: isCoastal ? 'moderate' : 'low',
        prob: isCoastal ? 48 : 12,
        exp: isCoastal ? 'Possible near coast' : 'Low probability',
      },
    }
  }, [forecastData, selectedCity])

  return (
    <div className="card operational-panel animate-fade-in">
      <div className="card__header">
        <div className="operational-panel__title-group">
          <span className="operational-panel__title">Extreme Weather Intelligence</span>
          <span className="card__badge">Early Warning</span>
        </div>
        <button
          className="btn btn--sm text-gold"
          style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}
          onClick={onOpenEventDetails}
        >
          View Event Details →
        </button>
      </div>

      <div className="extreme-intel-grid">
        {/* 1. Heavy Rainfall */}
        <div className={`extreme-intel-card extreme-intel-card--${intel.rainfall.level}`}>
          <div className="extreme-intel-card__header">
            <span className="extreme-intel-card__icon">🌧️</span>
            <div>
              <div className="extreme-intel-card__name">Heavy Rainfall</div>
              <span className={`intel-risk-pill intel-risk-pill--${intel.rainfall.level}`}>
                {intel.rainfall.risk}
              </span>
            </div>
          </div>
          <div className="extreme-intel-card__body">
            <div className="extreme-intel-card__row">
              <span className="extreme-intel-card__label">Probability:</span>
              <span className="extreme-intel-card__val text-gold">{intel.rainfall.prob}%</span>
            </div>
            <div className="extreme-intel-card__row">
              <span className="extreme-intel-card__label">Expected:</span>
              <span className="extreme-intel-card__val">{intel.rainfall.exp}</span>
            </div>
          </div>
        </div>

        {/* 2. Heat Wave */}
        <div className={`extreme-intel-card extreme-intel-card--${intel.heat.level}`}>
          <div className="extreme-intel-card__header">
            <span className="extreme-intel-card__icon">🌡️</span>
            <div>
              <div className="extreme-intel-card__name">Heat Wave</div>
              <span className={`intel-risk-pill intel-risk-pill--${intel.heat.level}`}>
                {intel.heat.risk}
              </span>
            </div>
          </div>
          <div className="extreme-intel-card__body">
            <div className="extreme-intel-card__row">
              <span className="extreme-intel-card__label">Probability:</span>
              <span className="extreme-intel-card__val">{intel.heat.prob}%</span>
            </div>
            <div className="extreme-intel-card__row">
              <span className="extreme-intel-card__label">Status:</span>
              <span className="extreme-intel-card__val text-muted">{intel.heat.exp}</span>
            </div>
          </div>
        </div>

        {/* 3. High Wind */}
        <div className={`extreme-intel-card extreme-intel-card--${intel.wind.level}`}>
          <div className="extreme-intel-card__header">
            <span className="extreme-intel-card__icon">💨</span>
            <div>
              <div className="extreme-intel-card__name">High Wind</div>
              <span className={`intel-risk-pill intel-risk-pill--${intel.wind.level}`}>
                {intel.wind.risk}
              </span>
            </div>
          </div>
          <div className="extreme-intel-card__body">
            <div className="extreme-intel-card__row">
              <span className="extreme-intel-card__label">Probability:</span>
              <span className="extreme-intel-card__val">{intel.wind.prob}%</span>
            </div>
            <div className="extreme-intel-card__row">
              <span className="extreme-intel-card__label">Expected:</span>
              <span className="extreme-intel-card__val">{intel.wind.exp}</span>
            </div>
          </div>
        </div>

        {/* 4. Thunderstorm */}
        <div className={`extreme-intel-card extreme-intel-card--${intel.thunder.level}`}>
          <div className="extreme-intel-card__header">
            <span className="extreme-intel-card__icon">⚡</span>
            <div>
              <div className="extreme-intel-card__name">Thunderstorm</div>
              <span className={`intel-risk-pill intel-risk-pill--${intel.thunder.level}`}>
                {intel.thunder.risk}
              </span>
            </div>
          </div>
          <div className="extreme-intel-card__body">
            <div className="extreme-intel-card__row">
              <span className="extreme-intel-card__label">Probability:</span>
              <span className="extreme-intel-card__val">{intel.thunder.prob}%</span>
            </div>
            <div className="extreme-intel-card__row">
              <span className="extreme-intel-card__label">Window:</span>
              <span className="extreme-intel-card__val">{intel.thunder.exp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
