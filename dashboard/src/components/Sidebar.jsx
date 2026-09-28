import { useState } from 'react'

export default function Sidebar({
  cities,
  selectedCity,
  onCitySelect,
  forecastData,
  cityForecasts,
  variable,
  activeTab = 'Dashboard',
  onTabSelect,
}) {
  const [citySearch, setCitySearch] = useState('')

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'Live Forecast', label: 'Live Forecast', icon: '🌦️' },
    { id: 'Forecast Maps', label: 'Forecast Maps', icon: '🗺️' },
    { id: 'Model Weights', label: 'Model Weights', icon: '📊' },
    { id: 'Model Performance', label: 'Model Performance', icon: '📈' },
    { id: 'Extreme Events', label: 'Extreme Events', icon: '⚠️' },
    { id: 'Historical Analysis', label: 'Historical Analysis', icon: '⏱️' },
    { id: 'Data Sources', label: 'Data Sources', icon: '🌐' },
    { id: 'System Monitoring', label: 'System Monitoring', icon: '⚡' },
    { id: 'Settings', label: 'Settings', icon: '⚙️' },
  ]

  // Get current value for city
  const getCurrentValue = (cityName) => {
    const data = cityForecasts[cityName]
    if (!data) return null
    if (data.value !== undefined && data.value !== null) {
      return { val: Number(data.value), unit: data.unit || getUnit() }
    }
    if (data.blended?.bma && data.blended.bma.length > 0) {
      const now = new Date()
      const timestamps = data.timestamps ? data.timestamps.map(t => new Date(t)) : []
      let closestIdx = 0
      let minDiff = Infinity
      timestamps.forEach((t, i) => {
        const diff = Math.abs(t - now)
        if (diff < minDiff) {
          minDiff = diff
          closestIdx = i
        }
      })
      const val = data.blended.bma[closestIdx]
      if (val !== undefined && val !== null) {
        return { val: Number(val), unit: getUnit() }
      }
    }
    return null
  }

  const getUnit = () => {
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

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.state.toLowerCase().includes(citySearch.toLowerCase())
  )

  return (
    <aside className="sidebar-operational">
      {/* Navigation Group */}
      <div className="sidebar-nav-section">
        <div className="sidebar-section-title">Operational Navigation</div>
        <nav className="sidebar-nav-list">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
                onClick={() => onTabSelect && onTabSelect(item.id)}
              >
                <span className="sidebar-nav-item__icon">{item.icon}</span>
                <span className="sidebar-nav-item__label">{item.label}</span>
                {isActive && <span className="sidebar-nav-item__active-indicator"></span>}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="sidebar-divider"></div>

      {/* Target Station / City Selector */}
      <div className="sidebar-cities-section">
        <div className="sidebar-cities-header">
          <span className="sidebar-section-title">Observational Stations</span>
          <span className="card__badge">{cities.length}</span>
        </div>

        <div className="sidebar-search-wrap">
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Filter station/city..."
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
          />
        </div>

        <div className="city-list-scroll">
          {filteredCities.map((city) => {
            const res = getCurrentValue(city.name)
            const isSelected = selectedCity?.name === city.name
            return (
              <div
                key={city.name}
                className={`city-item ${isSelected ? 'city-item--active' : ''}`}
                onClick={() => onCitySelect(city)}
                id={`city-${city.name.toLowerCase()}`}
              >
                <div className="city-item__info">
                  <div className="city-item__name">{city.name}</div>
                  <div className="city-item__state">{city.state}</div>
                </div>
                <span className="city-item__temp">
                  {res ? `${res.val.toFixed(1)} ${res.unit}` : 'N/A'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sidebar Footer Branding Card */}
      <div className="sidebar-branding-card">
        <div className="sidebar-branding-card__icon">🌏</div>
        <div className="sidebar-branding-card__title">Better Forecasts, Safer Communities</div>
        <div className="sidebar-branding-card__sub">SIH PS-26081 · NCMRWF / MoES</div>
      </div>
    </aside>
  )
}
