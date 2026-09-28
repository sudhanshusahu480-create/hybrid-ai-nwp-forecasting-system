export default function OperationalFooter({ lastUpdated, modelCount = 5, isDemo = false }) {
  const formatTime = (iso) => {
    if (!iso) return '14:15 UTC'
    const d = new Date(iso)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  }

  const getNextUpdate = () => {
    const next = new Date(Date.now() + 45 * 60 * 1000)
    return next.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  }

  return (
    <footer className="operational-footer">
      <div className="operational-footer__left">
        <div className="footer-status-pill">
          <span className="footer-status-pill__label">Data Pipeline:</span>
          <span className="footer-status-pill__val status-text--operational">
            <span className="status-dot status-dot--live"></span>
            Operational
          </span>
        </div>

        <div className="footer-status-pill">
          <span className="footer-status-pill__label">Models:</span>
          <span className="footer-status-pill__val status-text--models">
            <span className="status-dot status-dot--live"></span>
            {modelCount}/5 Online
          </span>
        </div>

        <div className="footer-status-pill">
          <span className="footer-status-pill__label">Observations:</span>
          <span className="footer-status-pill__val status-text--obs">
            <span className="status-dot status-dot--live"></span>
            Live (1,250+ AWS)
          </span>
        </div>
      </div>

      <div className="operational-footer__right">
        <div className="footer-time-stat">
          <span className="footer-time-stat__label">Last Forecast Run:</span>
          <span className="footer-time-stat__val font-mono">{formatTime(lastUpdated)}</span>
        </div>

        <div className="footer-time-stat">
          <span className="footer-time-stat__label">Next Update:</span>
          <span className="footer-time-stat__val font-mono text-gold">{getNextUpdate()}</span>
        </div>
      </div>
    </footer>
  )
}
