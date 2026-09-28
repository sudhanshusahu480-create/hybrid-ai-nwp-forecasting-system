import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function AdaptiveModelWeights({ forecastData, selectedCity, regime = 'Monsoon' }) {
  const weights = forecastData?.bma_weights || {
    gfs: 0.25,
    ecmwf_ifs: 0.30,
    jma: 0.15,
    icon: 0.18,
    gem: 0.12,
  }

  // Model color palette in dark/gold AMOLED theme
  const modelThemeColors = {
    ecmwf_ifs: '#facc15', // Bright gold
    gfs: '#eab308',       // Amber gold
    icon: '#ca8a04',      // Deep gold
    jma: '#fef08a',       // Soft lemon
    gem: '#a16207',       // Bronze gold
    aiml: '#38bdf8',      // Cyan highlight for AI
    nwp: '#fbbf24',       // Warm yellow for NWP
    ensemble: '#f59e0b',  // Orange amber
  }

  // Category rollup (NWP vs AI/ML vs Ensemble)
  const categoryData = useMemo(() => {
    // If individual NWP weights
    const ecmwf = weights.ecmwf_ifs || 0.30
    const gfs = weights.gfs || 0.25
    const icon = weights.icon || 0.18
    const jma = weights.jma || 0.15
    const gem = weights.gem || 0.12

    // Grouping: ECMWF + GFS (NWP), AI-blended/ICON (AI/ML), JMA+GEM (Ensemble)
    const aimlPct = Math.round((ecmwf + icon * 0.5) * 100)
    const nwpPct = Math.round((gfs + gem) * 100)
    const ensPct = 100 - aimlPct - nwpPct

    return [
      { name: 'AI/ML', value: aimlPct, color: '#facc15' },
      { name: 'NWP', value: nwpPct, color: '#eab308' },
      { name: 'Ensemble', value: ensPct > 0 ? ensPct : 20, color: '#a16207' },
    ]
  }, [weights])

  // Sorted model entries
  const modelEntries = useMemo(() => {
    return Object.entries(weights)
      .map(([m, w]) => ({
        name: m.replace('_ifs', '').toUpperCase(),
        rawKey: m,
        weight: +(w * 100).toFixed(1),
        val: w,
        color: modelThemeColors[m] || '#facc15',
      }))
      .sort((a, b) => b.weight - a.weight)
  }, [weights])

  const topModel = modelEntries[0]?.name || 'ECMWF'

  return (
    <div className="card operational-panel animate-fade-in">
      <div className="card__header">
        <div className="operational-panel__title-group">
          <span className="operational-panel__title">Adaptive Model Weights</span>
          <span className="card__badge">BMA Engine</span>
        </div>
        <span className="live-status-pill">
          <span className="status-dot status-dot--live"></span>
          Adaptive
        </span>
      </div>

      {/* Donut & Category Summary */}
      <div className="weights-donut-row">
        <div className="weights-donut-container">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={categoryData}
                innerRadius={36}
                outerRadius={52}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(val) => [`${val}%`, 'Share']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="weights-donut-center">
            <span className="weights-donut-center__label">Total</span>
            <span className="weights-donut-center__val">100%</span>
          </div>
        </div>

        <div className="weights-legend-list">
          {categoryData.map((cat) => (
            <div key={cat.name} className="weights-legend-item">
              <span className="weights-legend-item__dot" style={{ background: cat.color }}></span>
              <span className="weights-legend-item__label">{cat.name}</span>
              <span className="weights-legend-item__value">{cat.value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Model Bars */}
      <div className="model-weight-bars-section">
        <div className="section-mini-header">Individual Model Contributions</div>
        <div className="weight-bar">
          {modelEntries.map((m) => (
            <div key={m.rawKey} className="weight-bar__item">
              <span className="weight-bar__label">{m.name}</span>
              <div className="weight-bar__track">
                <div
                  className="weight-bar__fill"
                  style={{
                    width: `${m.weight}%`,
                    background: `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                  }}
                />
              </div>
              <span className="weight-bar__value">{m.weight}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Why these weights? */}
      <div className="why-weights-section">
        <div className="section-mini-header">Why these weights?</div>
        <div className="why-weights-grid">
          <div className="why-weights-row">
            <span className="why-weights-row__label">Historical Skill</span>
            <div className="why-weights-row__bar-track">
              <div className="why-weights-row__bar-fill" style={{ width: '35%' }}></div>
            </div>
            <span className="why-weights-row__val">35%</span>
          </div>
          <div className="why-weights-row">
            <span className="why-weights-row__label">Region</span>
            <div className="why-weights-row__bar-track">
              <div className="why-weights-row__bar-fill" style={{ width: '20%' }}></div>
            </div>
            <span className="why-weights-row__val">20%</span>
          </div>
          <div className="why-weights-row">
            <span className="why-weights-row__label">Season</span>
            <div className="why-weights-row__bar-track">
              <div className="why-weights-row__bar-fill" style={{ width: '15%' }}></div>
            </div>
            <span className="why-weights-row__val">15%</span>
          </div>
          <div className="why-weights-row">
            <span className="why-weights-row__label">Lead Time</span>
            <div className="why-weights-row__bar-track">
              <div className="why-weights-row__bar-fill" style={{ width: '15%' }}></div>
            </div>
            <span className="why-weights-row__val">15%</span>
          </div>
          <div className="why-weights-row">
            <span className="why-weights-row__label">Weather Regime</span>
            <div className="why-weights-row__bar-track">
              <div className="why-weights-row__bar-fill" style={{ width: '15%' }}></div>
            </div>
            <span className="why-weights-row__val">15%</span>
          </div>
        </div>
      </div>

      {/* Intelligence Context Box */}
      <div className="context-callout-box">
        <span className="context-callout-box__icon">💡</span>
        <div className="context-callout-box__text">
          <span>Current regime: <strong>{regime} + Heavy Rainfall</strong></span>
          <span className="context-callout-box__sub">Most reliable source: <strong className="text-gold">{topModel} & AI/ML</strong></span>
        </div>
      </div>
    </div>
  )
}
