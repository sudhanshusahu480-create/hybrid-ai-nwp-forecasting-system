import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar,
  Legend, ReferenceLine,
} from 'recharts'

// Model colors (Yellow AMOLED Theme)
const MODEL_COLORS = {
  gfs: '#fde047',
  ecmwf_ifs: '#facc15',
  jma: '#eab308',
  icon: '#ca8a04',
  gem: '#a16207',
  bma: '#fef08a',
  mean: '#a8b2c1',
}

function getUnit(variable) {
  const units = {
    temperature_2m: '°C',
    precipitation: 'mm',
    wind_speed_10m: 'km/h',
    relative_humidity_2m: '%',
    surface_pressure: 'hPa',
    cloud_cover: '%',
  }
  return units[variable] || ''
}

// Custom tooltip
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 8,
      padding: 12,
      fontSize: 12,
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
        {label}
      </div>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: entry.color, fontWeight: 500 }}>
            {entry.name?.toUpperCase()}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {entry.value?.toFixed(1)} {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function BottomPanel({
  expanded,
  onToggle,
  forecastData,
  selectedCity,
  variable,
  variables,
}) {
  const unit = getUnit(variable)
  const currentVarInfo = variables?.find(v => v.id === variable)

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!forecastData?.timestamps) return []
    return forecastData.timestamps.map((t, i) => {
      const date = new Date(t)
      const entry = {
        time: date.toLocaleString('en-IN', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        hour: date.getHours(),
      }
      // Individual models
      if (forecastData.models) {
        Object.entries(forecastData.models).forEach(([model, values]) => {
          entry[model] = values[i]
        })
      }
      // Blended
      if (forecastData.blended) {
        entry.bma = forecastData.blended.bma?.[i]
        entry.mean = forecastData.blended.mean?.[i]
      }
      // Uncertainty
      if (forecastData.uncertainty) {
        entry.uncertainty = forecastData.uncertainty.std?.[i]
        entry.confidence = forecastData.uncertainty.confidence?.[i]

        // Compute ± band around BMA
        const bmaVal = forecastData.blended?.bma?.[i]
        const std = forecastData.uncertainty.std?.[i]
        if (bmaVal != null && std != null) {
          entry.bma_upper = bmaVal + 2 * std
          entry.bma_lower = bmaVal - 2 * std
        }
      }
      return entry
    })
  }, [forecastData])

  // Model weight data for bar chart
  const weightData = useMemo(() => {
    if (!forecastData?.bma_weights) return []
    return Object.entries(forecastData.bma_weights).map(([model, weight]) => ({
      model: model.replace('_ifs', '').toUpperCase(),
      weight: +(weight * 100).toFixed(1),
      fill: MODEL_COLORS[model] || '#64748b',
    }))
  }, [forecastData])

  const modelNames = forecastData?.metadata?.model_names || []

  return (
    <div className={`bottom-panel ${expanded ? 'bottom-panel--expanded' : 'bottom-panel--collapsed'}`}>
      <div className="bottom-panel__toggle" onClick={onToggle}>
        <span>{expanded ? '▼' : '▲'}</span>
        <span>
          {expanded ? 'Collapse' : 'Expand'} — {currentVarInfo?.icon} {currentVarInfo?.label} Forecast for {selectedCity?.name || '...'}
        </span>
      </div>

      {expanded && (
        <div className="bottom-panel__content animate-fade-in">
          {/* Main forecast chart */}
          <div className="chart-container">
            <div className="chart-container__header">
              <span className="chart-container__title">
                Multi-Model Forecast Comparison
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {forecastData?.metadata?.n_timestamps || 0} hours · {modelNames.length} models + blended
              </span>
            </div>
            <div className="chart-container__body">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="bmaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fef08a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#fef08a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval="preserveStartEnd"
                    tickCount={8}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    domain={['auto', 'auto']}
                    label={{ value: unit, angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
                  />
                  <Tooltip content={<CustomTooltip unit={unit} />} />

                  {/* Uncertainty band */}
                  <Area
                    type="monotone"
                    dataKey="bma_upper"
                    stroke="none"
                    fill="rgba(254, 240, 138, 0.08)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="bma_lower"
                    stroke="none"
                    fill="rgba(254, 240, 138, 0.08)"
                    dot={false}
                  />

                  {/* Individual model lines */}
                  {modelNames.map((model) => (
                    <Line
                      key={model}
                      type="monotone"
                      dataKey={model}
                      stroke={MODEL_COLORS[model] || '#64748b'}
                      strokeWidth={1}
                      strokeOpacity={0.5}
                      dot={false}
                      name={model}
                    />
                  ))}

                  {/* Blended BMA — prominent */}
                  <Area
                    type="monotone"
                    dataKey="bma"
                    stroke="#fef08a"
                    strokeWidth={2.5}
                    fill="url(#bmaGradient)"
                    dot={false}
                    name="BMA Blended"
                  />

                  {/* Now line */}
                  <ReferenceLine
                    x={chartData.length > 24 ? chartData[24]?.time : undefined}
                    stroke="rgba(255,255,255,0.2)"
                    strokeDasharray="4 4"
                    label={{ value: 'NOW', fill: '#94a3b8', fontSize: 10, position: 'top' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weights bar chart */}
          <div className="chart-container">
            <div className="chart-container__header">
              <span className="chart-container__title">Model Weights</span>
            </div>
            <div className="chart-container__body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weightData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    domain={[0, 'auto']}
                    unit="%"
                  />
                  <YAxis
                    type="category"
                    dataKey="model"
                    tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'var(--font-mono)' }}
                    width={60}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value}%`, 'Weight']}
                  />
                  <Bar
                    dataKey="weight"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  >
                    {weightData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
