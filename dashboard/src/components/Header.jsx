export default function Header({
  onRefresh,
  loading,
  selectedVariable,
  onVariableChange,
  variables,
  lastUpdated,
  sidebarExpanded,
  toggleSidebar,
  forecastData,
}) {
  const formatTime = (iso) => {
    if (!iso) {
      const now = new Date()
      return now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
        now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
    }
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  }

  const isDemo = forecastData?.metadata?.demo_mode

  return (
    <header className="app-header">
      {/* Brand & System Title */}
      <div className="app-header__brand">
        <button
          className="header-sidebar-toggle-btn"
          onClick={toggleSidebar}
          title="Toggle Navigation Menu"
        >
          ☰
        </button>

        <div className="header-logo-wrap">
          <span className="header-logo-icon">⛅</span>
        </div>

        <div>
          <div className="app-header__title">
            HYBRID AI–NWP FORECASTING SYSTEM
          </div>
          <div className="app-header__subtitle">
            Intelligent Multi-Model Weather Forecast & Extreme Event Monitoring · MoES / NCMRWF
          </div>
        </div>
      </div>

      {/* Right Operational Status Group */}
      <div className="app-header__controls">
        {/* Last Updated Pill */}
        <div className="header-pill header-pill--time">
          <span className="header-pill__icon">🕒</span>
          <div className="header-pill__text">
            <span className="header-pill__label">Last Updated</span>
            <span className="header-pill__val">{formatTime(lastUpdated)}</span>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="header-pill header-pill--status">
          <span className="header-pill__label">System Status</span>
          <span className="status-badge status-badge--operational">
            <span className="status-dot status-dot--live"></span>
            {loading ? 'Processing' : 'Operational'}
          </span>
        </div>

        {/* Data Status Pill */}
        <div className="header-pill header-pill--data">
          <span className="header-pill__label">Data Status</span>
          <span className="status-badge status-badge--live">
            <span className="status-dot status-dot--live"></span>
            {isDemo ? 'Demo/Cache' : 'Live'}
          </span>
        </div>

        {/* User / Forecaster Badge */}
        <div className="header-user-badge">
          <div className="header-user-badge__avatar">👤</div>
          <div className="header-user-badge__info">
            <div className="header-user-badge__name">Aaditya</div>
            <div className="header-user-badge__role">Operational Forecaster</div>
          </div>
        </div>

        {/* Refresh Action */}
        <button
          className="btn btn--primary btn--sm"
          onClick={onRefresh}
          disabled={loading}
          id="refresh-btn"
          title="Trigger model recalculation & sync"
        >
          <span className={loading ? 'spin' : ''}>{loading ? '⟳' : '↻'}</span>
          <span>Refresh</span>
        </button>
      </div>
    </header>
  )
}
