export default function SystemWorkflow() {
  const steps = [
    {
      num: 1,
      title: 'Forecast Sources',
      desc: 'NWP / AI / Ensemble',
      icon: '🌐',
    },
    {
      num: 2,
      title: 'Data Validation',
      desc: 'QC & Preprocessing',
      icon: '⚡',
    },
    {
      num: 3,
      title: 'Historical Skill',
      desc: 'Region / Season / Lead Time',
      icon: '📊',
    },
    {
      num: 4,
      title: 'Adaptive Weight Engine',
      desc: 'Bayesian Model Averaging',
      icon: '🧠',
    },
    {
      num: 5,
      title: 'Hybrid Forecast',
      desc: 'Calibrated Blend & Spread',
      icon: '✨',
    },
    {
      num: 6,
      title: 'Extreme Event Detection',
      desc: 'Risk Thresholds & Alerts',
      icon: '⚠️',
    },
    {
      num: 7,
      title: 'Operational Delivery',
      desc: 'GIS Map & Bulletins',
      icon: '🖥️',
    },
  ]

  return (
    <div className="card operational-panel system-workflow-panel animate-fade-in">
      <div className="card__header">
        <div className="operational-panel__title-group">
          <span className="operational-panel__title">AI-NWP Forecast Pipeline Workflow</span>
          <span className="card__badge">End-to-End Architecture</span>
        </div>
        <span className="live-status-pill">
          <span className="status-dot status-dot--live"></span>
          Pipeline Continuous
        </span>
      </div>

      <div className="workflow-stepper">
        {steps.map((step, idx) => (
          <div key={step.num} className="workflow-step-item">
            <div className="workflow-step-item__node">
              <div className="workflow-step-item__circle">
                <span className="workflow-step-item__icon">{step.icon}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="workflow-step-item__connector">
                  <div className="workflow-step-item__connector-line"></div>
                  <span className="workflow-step-item__arrow">›</span>
                </div>
              )}
            </div>
            <div className="workflow-step-item__text">
              <div className="workflow-step-item__title">{step.title}</div>
              <div className="workflow-step-item__desc">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
