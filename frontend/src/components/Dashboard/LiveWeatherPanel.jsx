import { useEffect, useRef, useState } from 'react';
import { getLiveWeatherHazardScore } from '../../services/api.js';

const weatherConditions = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function formatValue(value, suffix = '') {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}${suffix}` : '—';
}

function formatObservationTime(value) {
  if (typeof value !== 'string' || !value.trim()) return '—';
  // The backend returns a timezone-naive local timestamp and documents it as Asia/Kolkata.
  return `${value.replace('T', ' ')} IST`;
}

function formatFetchedTime(value) {
  if (typeof value !== 'string' || !value.trim()) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)} UTC`;
}

function isScore(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function severityLabel(score) {
  if (score <= 25) return 'Low';
  if (score <= 50) return 'Moderate';
  if (score <= 75) return 'High';
  return 'Critical';
}

function validateEnvelope(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('The live weather API returned a malformed response.');
  }
  const weather = response.weather ?? (response.data_status ? response : null);
  if (!weather || typeof weather !== 'object' || Array.isArray(weather) || typeof weather.data_status !== 'string') {
    throw new Error('The live weather API response is missing its weather data status.');
  }
  return { weather, hazards: response.hazards };
}

function SeverityCard({ title, score }) {
  const available = isScore(score);
  const label = available ? severityLabel(score) : null;
  return <article className="live-severity-card">
    <div className="live-severity-title"><b>{title}</b>{label && <span className={`live-severity-label severity-${label.toLowerCase()}`}>{label}</span>}</div>
    <div className="live-severity-score">{available ? score : '—'}<span>/100</span></div>
    <div className="live-severity-track" role="progressbar" aria-label={`${title} live weather severity`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={available ? score : undefined}>
      <span className={label ? `severity-fill severity-${label.toLowerCase()}` : ''} style={{ width: available ? `${score}%` : '0%' }} />
    </div>
    <small>Calculated from current live weather</small>
  </article>;
}

function WeatherReading({ label, value }) {
  return <div className="live-weather-reading"><span>{label}</span><b>{value}</b></div>;
}

export function LiveWeatherPanel() {
  const [state, setState] = useState({ status: 'loading', data: null, error: '', stale: false });
  const requestController = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    requestController.current = controller;

    async function loadInitial() {
      try {
        const response = await getLiveWeatherHazardScore({ signal: controller.signal });
        const { weather, hazards } = validateEnvelope(response);
        if (weather.data_status === 'unavailable') {
          setState({ status: 'unavailable', data: null, error: '', stale: false });
          return;
        }
        if (weather.data_status !== 'live_api_response') {
          throw new Error('The live weather API returned an unrecognized data status.');
        }
        const liveData = {
          weather,
          heat: isScore(hazards?.heat) ? hazards.heat : null,
          flood: isScore(hazards?.flood) ? hazards.flood : null,
        };
        const missingSeverity = liveData.heat === null || liveData.flood === null;
        setState({
          status: 'success',
          data: liveData,
          error: missingSeverity ? 'Live weather was returned, but one or more hazard severity scores are missing or invalid.' : '',
          stale: false,
        });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setState((current) => ({ status: 'error', data: null, error: error.message || 'Unable to load live weather.', stale: false }));
      }
    }

    loadInitial();
    return () => {
      controller.abort();
      if (requestController.current === controller) requestController.current = null;
    };
  }, []);

  async function refreshLiveData() {
    if (state.status === 'loading' || state.status === 'refreshing') return;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setState((current) => ({
      ...current,
      status: current.data ? 'refreshing' : 'loading',
      error: '',
      stale: Boolean(current.data),
    }));

    try {
      const response = await getLiveWeatherHazardScore({ signal: controller.signal });
      const { weather, hazards } = validateEnvelope(response);
      if (weather.data_status === 'unavailable') {
        setState((current) => current.data
          ? { ...current, status: 'success', stale: true, error: 'Refresh reports live weather unavailable. Showing the last successful reading as stale.' }
          : { status: 'unavailable', data: null, error: '', stale: false });
        return;
      }
      if (weather.data_status !== 'live_api_response') {
        throw new Error('The live weather API returned an unrecognized data status.');
      }
      const liveData = {
        weather,
        heat: isScore(hazards?.heat) ? hazards.heat : null,
        flood: isScore(hazards?.flood) ? hazards.flood : null,
      };
      const missingSeverity = liveData.heat === null || liveData.flood === null;
      setState({
        status: 'success',
        data: liveData,
        error: missingSeverity ? 'Live weather was returned, but one or more hazard severity scores are missing or invalid.' : '',
        stale: false,
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      setState((current) => ({
        ...current,
        status: current.data ? 'success' : 'error',
        error: error.message || 'Unable to refresh live weather.',
        stale: Boolean(current.data),
      }));
    } finally {
      if (requestController.current === controller) requestController.current = null;
    }
  }

  const busy = state.status === 'loading' || state.status === 'refreshing';
  const weather = state.data?.weather;
  const condition = Number.isInteger(weather?.weather_code) ? weatherConditions[weather.weather_code] ?? `Unknown (WMO ${weather.weather_code})` : '—';

  return <section className="panel live-weather-panel" aria-labelledby="live-weather-title">
    <div className="live-weather-heading">
      <div>
        <div className="panel-title"><span className="title-icon">☼</span><h2 id="live-weather-title">LIVE WEATHER &amp; HAZARD SEVERITY</h2></div>
        <p>Current Mumbai weather and severity calculated from live conditions</p>
      </div>
      <div className="live-weather-actions">
        {weather && <span className={`live-weather-status ${state.stale ? 'is-stale' : ''}`}><i />{state.stale ? 'STALE' : 'LIVE API DATA'}</span>}
        <button type="button" className="ml-refresh-button live-weather-refresh" onClick={refreshLiveData} disabled={busy} aria-busy={busy}>{busy ? 'Refreshing…' : 'Refresh live data'}</button>
      </div>
    </div>

    {state.status === 'loading' && <div className="live-weather-state" role="status">Loading current Mumbai weather and hazard severity…</div>}
    {state.status === 'unavailable' && <div className="live-weather-state live-weather-error" role="status">Live weather is temporarily unavailable from the backend. No current weather readings or hazard scores are shown.</div>}
    {state.status === 'error' && <div className="live-weather-state live-weather-error" role="alert">Unable to load live weather: {state.error}</div>}
    {state.status === 'refreshing' && <div className="live-weather-state" role="status">Refreshing live data; showing the last successful reading as stale until the request completes.</div>}
    {state.error && state.data && <div className="live-weather-state live-weather-error" role="alert">{state.error}{state.stale ? ' Previous values are visibly marked stale.' : ''}</div>}
    {!weather && <div className="live-geomagnetic-status live-geomagnetic-unavailable"><span className="geomagnetic-mark">◎</span><span><b>GEOMAGNETIC</b><small>Live geomagnetic severity is unavailable — no live space-weather feed is connected.</small></span></div>}

    {weather && <>
      <div className="live-weather-content">
        <section className="live-weather-block" aria-label="Current live weather">
          <div className="live-weather-block-heading"><div><b>LIVE WEATHER</b><span>{typeof weather.location === 'string' ? weather.location : 'Mumbai, Maharashtra'}</span></div><span className="live-weather-provider">{typeof weather.source === 'string' ? weather.source : 'Provider unavailable'}</span></div>
          <div className="live-weather-condition">{condition}</div>
          <div className="live-weather-readings">
            <WeatherReading label="Temperature" value={formatValue(weather.temperature_c, ' °C')} />
            <WeatherReading label="Humidity" value={formatValue(weather.humidity_percent, ' %')} />
            <WeatherReading label="Rain" value={formatValue(weather.rain_mm, ' mm')} />
            <WeatherReading label="Precipitation" value={formatValue(weather.precipitation_mm, ' mm')} />
            <WeatherReading label="Wind speed" value={formatValue(weather.wind_speed_kmh, ' km/h')} />
            <WeatherReading label="Weather code" value={formatValue(weather.weather_code)} />
          </div>
          <div className="live-weather-times"><span>Observation <b>{formatObservationTime(weather.observation_time)}</b></span><span>Fetched <b>{formatFetchedTime(weather.fetched_at_utc)}</b></span></div>
          <p className="live-weather-model-note">Modelled weather conditions from Open-Meteo, not readings from local ground sensors.</p>
        </section>

        <section className="live-severity-block" aria-label="Live weather hazard severity">
          <div className="live-weather-block-heading"><div><b>LIVE HAZARD SEVERITY</b><span>Backend scores from current weather</span></div></div>
          <div className="live-severity-cards"><SeverityCard title="Heat" score={state.data.heat} /><SeverityCard title="Flood" score={state.data.flood} /></div>
          {(state.data.heat === null || state.data.flood === null) && <p className="live-severity-missing">One or more live severity values were not returned by the API.</p>}
          <div className="live-geomagnetic-status"><span className="geomagnetic-mark">◎</span><span><b>GEOMAGNETIC</b><small>Live geomagnetic severity is unavailable — no live space-weather feed is connected.</small></span></div>
          <p className="live-weather-independence">Separate from the dashboard scenario controls, asset risk scores, map colours, and precomputed ML results.</p>
        </section>
      </div>
      {state.stale && <p className="live-weather-stale-note">Showing last successful data, not current live data.</p>}
    </>}
  </section>;
}
