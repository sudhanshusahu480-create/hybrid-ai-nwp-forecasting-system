import { useState } from 'react'

export default function RegionalModelReliability({ selectedCity }) {
  const [selectedRegion, setSelectedRegion] = useState('Central India')

  const regionsData = {
    'Central India': {
      dominant: 'AI/ML',
      leadTime: '24h',
      season: 'Monsoon',
      nwp: '30%',
      aiml: '50%',
      ensemble: '20%',
      bias: '-0.12 mm',
      topModel: 'ECMWF + AI Blended',
    },
    'Northern Plains': {
      dominant: 'NWP',
      leadTime: '24h',
      season: 'Monsoon',
      nwp: '45%',
      aiml: '35%',
      ensemble: '20%',
      bias: '+0.25 mm',
      topModel: 'GFS + NCMRWF',
    },
    'Western Region': {
      dominant: 'AI/ML',
      leadTime: '24h',
      season: 'Monsoon',
      nwp: '25%',
      aiml: '55%',
      ensemble: '20%',
      bias: '-0.08 mm',
      topModel: 'ECMWF IFS',
    },
    'Peninsular India': {
      dominant: 'Ensemble',
      leadTime: '24h',
      season: 'Monsoon',
      nwp: '30%',
      aiml: '30%',
      ensemble: '40%',
      bias: '+0.10 mm',
      topModel: 'Ensemble Mean (BMA)',
    },
    'Eastern & NE India': {
      dominant: 'AI/ML',
      leadTime: '24h',
      season: 'Monsoon',
      nwp: '28%',
      aiml: '48%',
      ensemble: '24%',
      bias: '-0.15 mm',
      topModel: 'ICON + AI Proxy',
    },
  }

  const cur = regionsData[selectedRegion] || regionsData['Central India']

  return (
    <div className="card operational-panel animate-fade-in">
      <div className="card__header">
        <div className="operational-panel__title-group">
          <span className="operational-panel__title">Model Reliability by Region</span>
          <span className="card__badge">Spatial Skill</span>
        </div>
      </div>

      <div className="regional-reliability-content">
        {/* Region selector pills */}
        <div className="region-pills-list">
          {Object.keys(regionsData).map((reg) => (
            <button
              key={reg}
              className={`region-pill-btn ${selectedRegion === reg ? 'region-pill-btn--active' : ''}`}
              onClick={() => setSelectedRegion(reg)}
            >
              <span className={`dominant-dot dominant-dot--${regionsData[reg].dominant.toLowerCase().replace('/', '')}`}></span>
              {reg}
            </button>
          ))}
        </div>

        {/* Region stats card */}
        <div className="region-detail-card">
          <div className="region-detail-card__header">
            <div>
              <div className="region-detail-card__name">{selectedRegion}</div>
              <div className="region-detail-card__meta">
                Lead Time: <strong>{cur.leadTime}</strong> · Season: <strong>{cur.season}</strong>
              </div>
            </div>
            <div className="dominant-badge">
              <span className="dominant-badge__label">Dominant</span>
              <span className="dominant-badge__val">{cur.dominant}</span>
            </div>
          </div>

          <div className="region-weight-bars">
            <div className="region-weight-bar">
              <div className="region-weight-bar__label-group">
                <span>NWP</span>
                <span className="text-amber">{cur.nwp}</span>
              </div>
              <div className="region-weight-bar__track">
                <div className="region-weight-bar__fill bg-amber" style={{ width: cur.nwp }}></div>
              </div>
            </div>

            <div className="region-weight-bar">
              <div className="region-weight-bar__label-group">
                <span>AI/ML</span>
                <span className="text-gold">{cur.aiml}</span>
              </div>
              <div className="region-weight-bar__track">
                <div className="region-weight-bar__fill bg-gold" style={{ width: cur.aiml }}></div>
              </div>
            </div>

            <div className="region-weight-bar">
              <div className="region-weight-bar__label-group">
                <span>Ensemble</span>
                <span className="text-orange">{cur.ensemble}</span>
              </div>
              <div className="region-weight-bar__track">
                <div className="region-weight-bar__fill bg-orange" style={{ width: cur.ensemble }}></div>
              </div>
            </div>
          </div>

          <div className="region-detail-card__footer">
            <span>Optimal Source: <strong>{cur.topModel}</strong></span>
            <span className="text-muted">Bias: {cur.bias}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
