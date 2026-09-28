const API_BASE = 'http://localhost:8000'

export async function fetchCities() {
  const res = await fetch(`${API_BASE}/api/cities`)
  if (!res.ok) throw new Error('Failed to fetch cities')
  return res.json()
}

export async function fetchCitiesOverview(variable = 'precipitation') {
  const res = await fetch(`${API_BASE}/api/cities/overview?variable=${encodeURIComponent(variable)}`)
  if (!res.ok) throw new Error('Failed to fetch cities overview')
  return res.json()
}

export async function fetchForecast(cityName, variable = 'temperature_2m') {
  const res = await fetch(
    `${API_BASE}/api/forecast/${encodeURIComponent(cityName)}?variable=${variable}`
  )
  if (!res.ok) throw new Error(`Failed to fetch forecast for ${cityName}`)
  return res.json()
}

export async function fetchComparison(cityName, variable = 'temperature_2m') {
  const res = await fetch(
    `${API_BASE}/api/comparison/${encodeURIComponent(cityName)}?variable=${variable}`
  )
  if (!res.ok) throw new Error('Failed to fetch comparison')
  return res.json()
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/api/alerts`)
  if (!res.ok) throw new Error('Failed to fetch alerts')
  return res.json()
}

export async function fetchVerification(cityName, variable = 'temperature_2m') {
  const res = await fetch(
    `${API_BASE}/api/verify/${encodeURIComponent(cityName)}?variable=${variable}`
  )
  if (!res.ok) throw new Error('Failed to fetch verification')
  return res.json()
}

export async function fetchForecastByLocation(lat, lon, variable = 'temperature_2m') {
  const res = await fetch(
    `${API_BASE}/api/forecast/location/${lat}/${lon}?variable=${variable}`
  )
  if (!res.ok) throw new Error('Failed to fetch location forecast')
  return res.json()
}
