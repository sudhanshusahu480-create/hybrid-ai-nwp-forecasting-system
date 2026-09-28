export default function LiveDataSources({ forecastData }) {
  const isOnline = !forecastData?.metadata?.demo_mode

  const sources = [
    {
      id: 'nwp',
      name: 'NWP Global Models',
      icon: '🌐',
      status: 'Connected',
      sub: 'Latest Run: 12:00 UTC',
      detail: 'GFS, ECMWF IFS, JMA, ICON, GEM',
    },
    {
      id: 'aiml',
      name: 'AI/ML Neural Blend',
      icon: '⚡',
      status: 'Connected',
      sub: 'Inference: 12:15 UTC',
      detail: 'Spatial BMA & Non-Linear Regression',
    },
    {
      id: 'ensemble',
      name: 'Ensemble Members',
      icon: '🧬',
      status: 'Connected',
      sub: 'Members: 20 Active',
      detail: 'Multi-physics spread & variance',
    },
    {
      id: 'obs',
      name: 'IMD AWS & Radar',
      icon: '📍',
      status: 'Connected',
      sub: 'Stations: 1,250+ Live',
      detail: 'Real-time observation sync',
    },
  ]

  return (
    <div className="card operational-panel animate-fade-in">
      <div className="card__header">
        <div className="operational-panel__title-group">
          <span className="operational-panel__title">Live Data Sources</span>
          <span className="card__badge">4 Feeds</span>
        </div>
        <span className="live-status-pill">
          <span className="status-dot status-dot--live"></span>
          Ingestion Active
        </span>
      </div>

      <div className="live-sources-list">
        {sources.map((s) => (
          <div key={s.id} className="live-source-item">
            <div className="live-source-item__icon-wrap">
              <span>{s.icon}</span>
            </div>
            <div className="live-source-item__info">
              <div className="live-source-item__top">
                <span className="live-source-item__name">{s.name}</span>
                <span className="status-tag status-tag--connected">
                  ● {s.status}
                </span>
              </div>
              <div className="live-source-item__bottom">
                <span className="live-source-item__sub">{s.sub}</span>
                <span className="live-source-item__detail">{s.detail}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
