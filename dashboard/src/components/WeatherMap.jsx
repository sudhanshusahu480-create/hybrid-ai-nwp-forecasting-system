import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Fly to selected city
function FlyToCity({ city }) {
  const map = useMap()
  useEffect(() => {
    if (city) {
      map.flyTo([city.lat, city.lon], 6, { duration: 1.2 })
    }
  }, [city, map])
  return null
}

// Color scale for variables
function getColor(value, variable) {
  if (value == null) return '#64748b'

  const scales = {
    temperature_2m: [
      { max: 15, color: '#38bdf8' },
      { max: 25, color: '#22c55e' },
      { max: 32, color: '#facc15' },
      { max: 38, color: '#f97316' },
      { max: 50, color: '#ef4444' },
    ],
    precipitation: [
      { max: 2, color: '#475569' },
      { max: 10, color: '#38bdf8' },
      { max: 30, color: '#22c55e' },
      { max: 65, color: '#facc15' },
      { max: 115, color: '#f97316' },
      { max: 300, color: '#ef4444' },
    ],
    wind_speed_10m: [
      { max: 10, color: '#22c55e' },
      { max: 25, color: '#38bdf8' },
      { max: 40, color: '#facc15' },
      { max: 60, color: '#f97316' },
      { max: 120, color: '#ef4444' },
    ],
    relative_humidity_2m: [
      { max: 30, color: '#f97316' },
      { max: 60, color: '#facc15' },
      { max: 80, color: '#38bdf8' },
      { max: 100, color: '#2563eb' },
    ],
  }

  const scale = scales[variable] || scales.temperature_2m
  for (const { max, color } of scale) {
    if (value <= max) return color
  }
  return scale[scale.length - 1].color
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

export default function WeatherMap({
  cities,
  selectedCity,
  onCitySelect,
  cityForecasts,
  variable,
  variables,
  onVariableChange,
}) {
  const [selectedLayer, setSelectedLayer] = useState('hybrid')
  const [leadTime, setLeadTime] = useState('24h')
  const [weatherRegime, setWeatherRegime] = useState('Monsoon')
  const [layerOptions, setLayerOptions] = useState({
    boundaries: true,
    cityLabels: true,
    stations: true,
  })

  // Get current value for each city
  const cityValues = useMemo(() => {
    const values = {}
    cities.forEach((city) => {
      const data = cityForecasts[city.name]
      if (!data?.blended?.bma) return
      const now = new Date()
      const timestamps = data.timestamps.map(t => new Date(t))
      let closestIdx = 0
      let minDiff = Infinity
      timestamps.forEach((t, i) => {
        const diff = Math.abs(t - now)
        if (diff < minDiff) {
          minDiff = diff
          closestIdx = i
        }
      })

      // Layer value based on selected forecast layer
      let displayVal = data.blended.bma[closestIdx]
      if (selectedLayer === 'nwp') {
        displayVal = data.models?.gfs?.[closestIdx] || displayVal
      } else if (selectedLayer === 'aiml') {
        displayVal = data.models?.ecmwf_ifs?.[closestIdx] || displayVal
      } else if (selectedLayer === 'ensemble') {
        displayVal = data.blended?.mean?.[closestIdx] || displayVal
      }

      values[city.name] = {
        blended: data.blended.bma[closestIdx],
        displayVal,
        models: {},
        confidence: data.uncertainty?.confidence?.[closestIdx] || 'medium',
      }
      Object.keys(data.models || {}).forEach((m) => {
        values[city.name].models[m] = data.models[m][closestIdx]
      })
    })
    return values
  }, [cities, cityForecasts, selectedLayer])

  const curVar = variables?.find(v => v.id === variable) || { label: 'Temperature', unit: '°C' }
  const unit = getUnit(variable)

  // Legend levels based on variable
  const legendLevels = useMemo(() => {
    if (variable === 'precipitation') {
      return [
        { label: '200+', color: '#ef4444' },
        { label: '100', color: '#f97316' },
        { label: '50', color: '#facc15' },
        { label: '20', color: '#22c55e' },
        { label: '10', color: '#06b6d4' },
        { label: '5', color: '#38bdf8' },
        { label: '1', color: '#64748b' },
        { label: '0', color: '#334155' },
      ]
    }
    if (variable === 'temperature_2m') {
      return [
        { label: '45 °C', color: '#ef4444' },
        { label: '40 °C', color: '#f97316' },
        { label: '35 °C', color: '#facc15' },
        { label: '30 °C', color: '#84cc16' },
        { label: '25 °C', color: '#22c55e' },
        { label: '20 °C', color: '#06b6d4' },
        { label: '10 °C', color: '#38bdf8' },
      ]
    }
    return [
      { label: 'Extreme', color: '#ef4444' },
      { label: 'High', color: '#f97316' },
      { label: 'Moderate', color: '#facc15' },
      { label: 'Low', color: '#22c55e' },
      { label: 'Calm', color: '#38bdf8' },
    ]
  }, [variable])

  return (
    <div className="card operational-map-card">
      {/* Top Map Control Bar */}
      <div className="map-control-bar">
        <div className="map-control-bar__title-group">
          <span className="map-control-bar__title">Forecast Map</span>
          <span className="map-control-bar__layer-tag">
            {selectedLayer === 'hybrid' ? 'Hybrid AI-NWP Blend' : selectedLayer.toUpperCase()}
          </span>
        </div>

        <div className="map-control-bar__filters">
          {/* Variable Dropdown */}
          <div className="map-filter-item">
            <span className="map-filter-item__label">Variable</span>
            <select
              className="map-filter-select"
              value={variable}
              onChange={(e) => onVariableChange(e.target.value)}
            >
              {variables?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({v.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Region / City */}
          <div className="map-filter-item">
            <span className="map-filter-item__label">Region</span>
            <select
              className="map-filter-select"
              value={selectedCity?.name || 'All India'}
              onChange={(e) => {
                const targetCity = cities.find(c => c.name === e.target.value)
                if (targetCity) onCitySelect(targetCity)
              }}
            >
              <option value="All India">India (Overview)</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          {/* Lead Time */}
          <div className="map-filter-item">
            <span className="map-filter-item__label">Lead Time</span>
            <select
              className="map-filter-select"
              value={leadTime}
              onChange={(e) => setLeadTime(e.target.value)}
            >
              <option value="24h">24 Hours</option>
              <option value="48h">48 Hours</option>
              <option value="72h">72 Hours</option>
            </select>
          </div>

          {/* Weather Regime */}
          <div className="map-filter-item">
            <span className="map-filter-item__label">Regime</span>
            <select
              className="map-filter-select"
              value={weatherRegime}
              onChange={(e) => setWeatherRegime(e.target.value)}
            >
              <option value="Monsoon">Monsoon</option>
              <option value="Convective">Convective</option>
              <option value="Tropical">Tropical</option>
              <option value="Winter">Winter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map Body Container */}
      <div className="operational-map-body">
        <MapContainer
          center={[22.5, 82.5]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            attribution='&copy; Stadia Maps &copy; OpenMapTiles &copy; OSM'
          />

          <FlyToCity city={selectedCity} />

          {cities.map((city) => {
            const val = cityValues[city.name]
            const isSelected = selectedCity?.name === city.name
            const currentVal = val?.displayVal ?? val?.blended
            const color = getColor(currentVal, variable)

            return (
              <CircleMarker
                key={city.name}
                center={[city.lat, city.lon]}
                radius={isSelected ? 13 : 8}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: isSelected ? 0.95 : 0.75,
                  color: isSelected ? '#facc15' : '#ffffff',
                  weight: isSelected ? 2.5 : 1,
                  opacity: 1,
                }}
                eventHandlers={{
                  click: () => onCitySelect(city),
                }}
              >
                <Popup>
                  <div className="map-popup">
                    <div className="map-popup__city-row">
                      <span className="map-popup__city">{city.name}</span>
                      <span className="map-popup__state">{city.state}</span>
                    </div>

                    {val && (
                      <>
                        <div className="map-popup__main-metric">
                          <span className="map-popup__label">Hybrid Forecast</span>
                          <span className="map-popup__val text-gold">
                            {val.blended?.toFixed(1)} {unit}
                          </span>
                        </div>

                        <div className="map-popup__models-grid">
                          {Object.entries(val.models).map(([model, value]) => (
                            <div key={model} className="map-popup__model-cell">
                              <span className="map-popup__model-name">
                                {model.replace('_ifs', '').toUpperCase()}
                              </span>
                              <span className="map-popup__model-val">
                                {value?.toFixed(1)} {unit}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="map-popup__confidence-row">
                          <span>Confidence:</span>
                          <span className={`confidence-badge confidence-badge--${val.confidence}`}>
                            {val.confidence.toUpperCase()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>

        {/* Floating Map Controls Panel (Right Top) */}
        <div className="map-overlay-layer-card">
          <div className="map-overlay-layer-card__header">
            <span className="map-overlay-layer-card__title">Forecast Layer</span>
          </div>
          <div className="map-overlay-layer-radios">
            <label className="layer-radio-label">
              <input
                type="radio"
                name="forecastLayer"
                value="nwp"
                checked={selectedLayer === 'nwp'}
                onChange={() => setSelectedLayer('nwp')}
              />
              <span>NWP Models</span>
            </label>
            <label className="layer-radio-label">
              <input
                type="radio"
                name="forecastLayer"
                value="aiml"
                checked={selectedLayer === 'aiml'}
                onChange={() => setSelectedLayer('aiml')}
              />
              <span>AI/ML Model</span>
            </label>
            <label className="layer-radio-label">
              <input
                type="radio"
                name="forecastLayer"
                value="ensemble"
                checked={selectedLayer === 'ensemble'}
                onChange={() => setSelectedLayer('ensemble')}
              />
              <span>Ensemble</span>
            </label>
            <label className="layer-radio-label layer-radio-label--hybrid">
              <input
                type="radio"
                name="forecastLayer"
                value="hybrid"
                checked={selectedLayer === 'hybrid'}
                onChange={() => setSelectedLayer('hybrid')}
              />
              <span className="text-gold font-semibold">Hybrid Forecast (Blend)</span>
            </label>
          </div>

          <div className="map-overlay-divider"></div>

          <div className="map-overlay-checkboxes">
            <label className="layer-check-label">
              <input
                type="checkbox"
                checked={layerOptions.boundaries}
                onChange={(e) => setLayerOptions({ ...layerOptions, boundaries: e.target.checked })}
              />
              <span>State Boundaries</span>
            </label>
            <label className="layer-check-label">
              <input
                type="checkbox"
                checked={layerOptions.cityLabels}
                onChange={(e) => setLayerOptions({ ...layerOptions, cityLabels: e.target.checked })}
              />
              <span>City Labels</span>
            </label>
            <label className="layer-check-label">
              <input
                type="checkbox"
                checked={layerOptions.stations}
                onChange={(e) => setLayerOptions({ ...layerOptions, stations: e.target.checked })}
              />
              <span>Weather Stations</span>
            </label>
          </div>
        </div>

        {/* Floating Compass Rose */}
        <div className="map-compass-rose">
          <span className="compass-arrow">▲</span>
          <span className="compass-n">N</span>
        </div>

        {/* Floating Vertical Legend (Right Bottom) */}
        <div className="map-vertical-legend">
          <div className="map-vertical-legend__title">
            {curVar.label} ({unit})
          </div>
          <div className="map-vertical-legend__bar">
            {legendLevels.map((lvl) => (
              <div key={lvl.label} className="map-vertical-legend__step">
                <span className="map-vertical-legend__color" style={{ background: lvl.color }}></span>
                <span className="map-vertical-legend__val">{lvl.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
