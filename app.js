// app.js - Vanilla JS to fetch geocoding + weather from Open-Meteo
// Uses async/await and fetch. Two API calls:
// 1) Geocoding API -> convert city name to latitude/longitude
// 2) Weather API -> fetch current weather + hourly humidity and match by time

const $ = id => document.getElementById(id);

const searchBtn = $('searchBtn');
const cityInput = $('cityInput');
const loadingEl = $('loading');
const errorEl = $('error');
const weatherCard = $('weatherCard');
const cityNameEl = $('cityName');
const tempEl = $('temperature');
const descEl = $('description');
const humidityEl = $('humidity');
const windEl = $('wind');
const unitToggle = $('unitToggle');

let currentTempC = null; // store temperature in Celsius

const weatherCodeMap = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Drizzle: Light',
  53: 'Drizzle: Moderate',
  55: 'Drizzle: Dense',
  56: 'Freezing Drizzle: Light',
  57: 'Freezing Drizzle: Dense',
  61: 'Rain: Slight',
  63: 'Rain: Moderate',
  65: 'Rain: Heavy',
  71: 'Snow fall: Slight',
  73: 'Snow fall: Moderate',
  75: 'Snow fall: Heavy',
  80: 'Rain showers: Slight',
  81: 'Rain showers: Moderate',
  82: 'Rain showers: Violent',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

const showLoading = show => { loadingEl.hidden = !show; };
const showError = (msg=null) => {
  if(!msg){ errorEl.hidden = true; errorEl.textContent = ''; return; }
  errorEl.hidden = false; errorEl.textContent = msg; weatherCard.hidden = true;
};

const toF = c => (c * 9/5) + 32;

// 1) Geocoding call to Open-Meteo Geocoding API
const geocode = async (city) => {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if(!data || !data.results || data.results.length === 0) throw new Error('City not found');
  return data.results[0]; // return first match (has latitude, longitude, name, country)
};

// 2) Weather call to Open-Meteo Weather API (current + hourly humidity)
const fetchWeather = async (lat, lon) => {
  // Request current_weather plus hourly relative humidity so we can show humidity at current time
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current_weather: 'true',
    hourly: 'relativehumidity_2m',
    timezone: 'auto'
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Weather request failed');
  const data = await res.json();
  return data;
};

const displayWeather = (place, weatherData) => {
  // Extract current weather
  const cw = weatherData.current_weather;
  if(!cw) throw new Error('No current weather available');

  currentTempC = cw.temperature; // Celsius
  const displayF = unitToggle.checked;

  cityNameEl.textContent = `${place.name}, ${place.country ?? ''}`;
  tempEl.textContent = displayF ? `${Math.round(toF(currentTempC))}°F` : `${Math.round(currentTempC)}°C`;
  descEl.textContent = weatherCodeMap[cw.weathercode] || 'Weather';
  windEl.textContent = `${Math.round(cw.windspeed)} m/s`;

  // Find humidity value by matching current time to hourly.time index
  let humidity = '—';
  if(weatherData.hourly && weatherData.hourly.relativehumidity_2m && weatherData.hourly.time){
    const times = weatherData.hourly.time;
    const hums = weatherData.hourly.relativehumidity_2m;
    const idx = times.indexOf(cw.time);
    if(idx !== -1 && hums[idx] !== undefined) humidity = `${hums[idx]}%`;
  }
  humidityEl.textContent = humidity;

  weatherCard.hidden = false;
  showError(null);
};

const handleSearch = async () => {
  const city = cityInput.value.trim();
  if(!city) { showError('Please enter a city name.'); return; }
  showError(null);
  showLoading(true);
  try{
    // Convert city -> {latitude, longitude}
    const place = await geocode(city);
    // Fetch weather using coordinates
    const weatherData = await fetchWeather(place.latitude, place.longitude);
    displayWeather(place, weatherData);
  }catch(err){
    console.error(err);
    showError(err.message || 'Unable to fetch weather.');
  }finally{
    showLoading(false);
  }
};

searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keydown', e => { if(e.key === 'Enter') handleSearch(); });

unitToggle.addEventListener('change', () => {
  if(currentTempC === null) return;
  tempEl.textContent = unitToggle.checked ? `${Math.round(toF(currentTempC))}°F` : `${Math.round(currentTempC)}°C`;
});

// Optional: prefill with a sample city
cityInput.value = 'New York';
