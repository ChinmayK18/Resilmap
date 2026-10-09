const DEFAULT_API_URL = 'http://127.0.0.1:8000';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { status = null, cause = undefined } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
  }
}

async function requestJson(path, { method = 'GET', body, signal } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body === undefined ? { Accept: 'application/json' } : {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(`Could not connect to the ResilMap API at ${API_BASE_URL}.`, { cause: error });
  }

  let text;
  try {
    text = await response.text();
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(`Could not read the API response (HTTP ${response.status}).`, {
      status: response.status,
      cause: error,
    });
  }

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    if (!response.ok) {
      throw new ApiError(`API request failed (HTTP ${response.status}): ${text || response.statusText}`, {
        status: response.status,
        cause: error,
      });
    }
    throw new ApiError(`The API returned invalid JSON (HTTP ${response.status}).`, {
      status: response.status,
      cause: error,
    });
  }

  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === 'string'
      ? detail
      : detail == null
        ? `API request failed (HTTP ${response.status}).`
        : JSON.stringify(detail);
    throw new ApiError(message, { status: response.status });
  }

  if (data === null || typeof data !== 'object') {
    throw new ApiError(`The API returned an unexpected JSON response (HTTP ${response.status}).`, {
      status: response.status,
    });
  }

  return data;
}

export function getHealth({ signal } = {}) {
  return requestJson('/health', { signal });
}

export function getAssets({ assetType, signal } = {}) {
  const query = new URLSearchParams();
  if (assetType) query.set('asset_type', assetType);
  const encodedQuery = query.toString();
  const suffix = encodedQuery ? `?${encodedQuery}` : '';
  return requestJson(`/api/assets${suffix}`, { signal });
}

export function getHazardScenarios({ signal } = {}) {
  return requestJson('/api/hazards/scenarios', { signal });
}

export function getMlAnomalies({ top = 50, signal } = {}) {
  const query = new URLSearchParams({ top: String(top) });
  return requestJson(`/api/ml/anomalies?${query.toString()}`, { signal });
}

export function getMlRisk({ top = 50, hazardType, assetType, signal } = {}) {
  const query = new URLSearchParams({ top: String(top) });
  if (hazardType) query.set('hazard_type', hazardType);
  if (assetType) query.set('asset_type', assetType);
  return requestJson(`/api/ml/risk?${query.toString()}`, { signal });
}

export function getMlEvents({ top = 50, hazardType, signal } = {}) {
  const query = new URLSearchParams({ top: String(top) });
  if (hazardType) query.set('hazard_type', hazardType);
  return requestJson(`/api/ml/events?${query.toString()}`, { signal });
}

export function postRisk(hazards, { assetType = null, signal } = {}) {
  return requestJson('/api/risk', {
    method: 'POST',
    body: { hazards, asset_type: assetType },
    signal,
  });
}
