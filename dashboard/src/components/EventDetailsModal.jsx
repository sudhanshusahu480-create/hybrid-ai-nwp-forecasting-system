export default function EventDetailsModal({ isOpen, onClose, selectedCity, forecastData }) {
  if (!isOpen) return null

  const alerts = forecastData?.alerts || []

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <div className="modal-card__title-wrap">
            <span className="modal-card__icon">⚠️</span>
            <div>
              <div className="modal-card__title">Extreme Weather Bulletins & Event Intelligence</div>
              <div className="modal-card__subtitle">
                Target Zone: {selectedCity?.name || 'National Overview'} · Regional Early Warning System
              </div>
            </div>
          </div>
          <button className="modal-card__close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-card__body">
          {/* Active alerts breakdown */}
          <div className="modal-section-title">Active Meteorological Warnings</div>

          <div className="modal-alerts-grid">
            <div className="modal-alert-item modal-alert-item--red">
              <div className="modal-alert-item__header">
                <span className="modal-alert-item__badge bg-danger">HIGH RISK</span>
                <span className="modal-alert-item__time">Valid: Next 24 Hours</span>
              </div>
              <div className="modal-alert-item__title">Extreme Heavy Precipitation (80 – 140 mm)</div>
              <p className="modal-alert-item__desc">
                High probability of intense localized convective spells over Central & Western India. High risk of localized water-logging, urban runoff, and river catchment swell.
              </p>
              <div className="modal-alert-item__footer">
                <span>Confidence: <strong>88% (High)</strong></span>
                <span>Source: <strong>BMA Neural Blend</strong></span>
              </div>
            </div>

            <div className="modal-alert-item modal-alert-item--orange">
              <div className="modal-alert-item__header">
                <span className="modal-alert-item__badge bg-warning">MODERATE RISK</span>
                <span className="modal-alert-item__time">Valid: 12 – 36 Hours</span>
              </div>
              <div className="modal-alert-item__title">Squally Surface Winds (40 – 60 km/h)</div>
              <p className="modal-alert-item__desc">
                Strong pressure gradient across coastal sectors causing elevated gust activity. Marine advisory issued for offshore operations.
              </p>
              <div className="modal-alert-item__footer">
                <span>Confidence: <strong>76% (Moderate)</strong></span>
                <span>Source: <strong>ECMWF IFS + GFS</strong></span>
              </div>
            </div>

            <div className="modal-alert-item modal-alert-item--green">
              <div className="modal-alert-item__header">
                <span className="modal-alert-item__badge bg-success">LOW RISK</span>
                <span className="modal-alert-item__time">Valid: 48 Hours</span>
              </div>
              <div className="modal-alert-item__title">Thermal Regime & Heat Wave Assessment</div>
              <p className="modal-alert-item__desc">
                Maximum daytime temperatures are within 1.0°C to 1.5°C of historical climatological normals. No heat-wave advisory in effect for this forecast window.
              </p>
              <div className="modal-alert-item__footer">
                <span>Confidence: <strong>94% (High)</strong></span>
                <span>Source: <strong>Multi-Model Consensus</strong></span>
              </div>
            </div>
          </div>

          {/* Action guidance */}
          <div className="modal-guidance-card">
            <div className="modal-guidance-card__title">🛡️ Standard Operating Guidance</div>
            <ul className="modal-guidance-card__list">
              <li>Deploy high-frequency radar verification for convective cell tracking.</li>
              <li>Issue localized district-level advisory updates every 3 hours.</li>
              <li>Maintain automated sync with IMD automatic weather stations.</li>
            </ul>
          </div>
        </div>

        <div className="modal-card__footer">
          <button className="btn btn--primary" onClick={onClose}>
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  )
}
