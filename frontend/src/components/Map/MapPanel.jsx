import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, ScaleControl, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const INITIAL_MUMBAI_VIEW = [19.076, 72.8777];

const assetTypeClass = {
  Hospital: 'hospital',
  Substation: 'substation',
  'Power Station': 'power-station',
};

const assetGlyph = {
  Hospital: '+',
  Substation: 'ϟ',
  'Power Station': '▥',
};

const riskLevelClass = {
  Low: 'low',
  Moderate: 'moderate',
  High: 'high',
  Critical: 'critical',
};

function finiteCoordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

function makeAssetIcon(assetType, riskLevel, selected) {
  const type = assetTypeClass[assetType] ?? 'other';
  const level = riskLevelClass[riskLevel] ?? 'unknown';
  const selectedClass = selected ? ' is-selected' : '';
  const glyph = assetGlyph[assetType] ?? '•';

  return L.divIcon({
    className: 'resilmap-leaflet-icon',
    html: `<span class="resilmap-asset-marker type-${type} level-${level}${selectedClass}"><span>${glyph}</span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -13],
  });
}

function FitMapToAssets({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length === 0) return;
    if (coordinates.length === 1) {
      map.setView(coordinates[0], 13);
      return;
    }

    map.fitBounds(L.latLngBounds(coordinates), { padding: [28, 28], maxZoom: 12 });
  }, [coordinates, map]);

  return null;
}

export function MapPanel({ assets, riskByAssetId, selectedId, onSelect, hazard, assetStatus, riskStatus }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const [tileRetry, setTileRetry] = useState(0);

  const locatedAssets = useMemo(() => assets.flatMap((asset) => {
    const latitude = finiteCoordinate(asset.Latitude, -90, 90);
    const longitude = finiteCoordinate(asset.Longitude, -180, 180);
    if (latitude === null || longitude === null) return [];

    return [{ asset, latitude, longitude }];
  }), [assets]);

  const coordinates = useMemo(
    () => locatedAssets.map(({ latitude, longitude }) => [latitude, longitude]),
    [locatedAssets],
  );

  const tileEvents = useMemo(() => ({
    tileerror: () => setTilesFailed(true),
  }), []);

  return <section className="panel map-panel">
    <div className="panel-heading map-heading">
      <div>
        <div className="panel-title"><span className="title-icon">⌖</span><h2>Infrastructure map</h2></div>
        <p>{new Intl.NumberFormat('en-IN').format(locatedAssets.length)} of {new Intl.NumberFormat('en-IN').format(assets.length)} assets with valid coordinates · {hazard} risk</p>
      </div>
      <span className="map-demo-badge"><i /> GEOGRAPHIC CONTEXT</span>
    </div>

    <div className="map-canvas leaflet-map-frame">
      <MapContainer
        className="resilmap-leaflet-map"
        center={INITIAL_MUMBAI_VIEW}
        zoom={11}
        minZoom={8}
        maxZoom={18}
        scrollWheelZoom
        preferCanvas
      >
        <TileLayer
          key={tileRetry}
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          eventHandlers={tileEvents}
        />
        <ScaleControl position="bottomleft" imperial={false} />
        <FitMapToAssets coordinates={coordinates} />
        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={42}>
          {locatedAssets.map(({ asset, latitude, longitude }) => {
            const risk = riskByAssetId.get(asset.Asset_ID);
            const riskLevel = risk?.Risk_Level;
            return <Marker
              key={asset.Asset_ID}
              position={[latitude, longitude]}
              title={asset.Asset_Name}
              icon={makeAssetIcon(asset.Asset_Type, riskLevel, selectedId === asset.Asset_ID)}
              eventHandlers={{ click: () => onSelect(asset.Asset_ID) }}
            >
              <Popup>
                <div className="asset-popup">
                  <b>{asset.Asset_Name}</b>
                  <span>{asset.Asset_Type} · {asset.Asset_ID}</span>
                  <span>{riskLevel ? `${riskLevel} combined risk · ${risk.Risk_Score}` : 'Risk result unavailable'}</span>
                  {risk?.Hazard_Risks?.[hazard] != null && <span>{hazard} component · {risk.Hazard_Risks[hazard]}</span>}
                </div>
              </Popup>
            </Marker>;
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {assetStatus === 'loading' && <div className="map-empty-state" role="status">Loading asset records…</div>}
      {assetStatus === 'error' && <div className="map-empty-state" role="alert">Infrastructure assets are unavailable. Retry the asset request above.</div>}
      {assetStatus === 'success' && locatedAssets.length === 0 && <div className="map-empty-state" role="status">No assets with valid coordinates were returned.</div>}
      {riskStatus === 'loading' && <div className="map-status-note" role="status">Updating risk colors…</div>}
      {riskStatus === 'error' && <div className="map-status-note map-risk-note" role="status">Risk colors unavailable; asset locations remain available.</div>}
      {tilesFailed && <div className="tile-error-note" role="alert"><span>Map tiles could not be loaded. Asset markers remain available.</span><button type="button" onClick={() => { setTilesFailed(false); setTileRetry((retry) => retry + 1); }}>Retry tiles</button></div>}
    </div>

    <div className="map-legend">
      <span className="legend-title">ASSET TYPE</span>
      <span><i className="legend-dot dot-substation" />Substation</span>
      <span><i className="legend-dot dot-hospital" />Hospital</span>
      <span><i className="legend-dot dot-power" />Power station</span>
      <span className="legend-spacer" />
      <span className="legend-title">COMBINED RISK</span>
      <span><i className="legend-dot risk-critical" />Critical</span>
      <span><i className="legend-dot risk-high" />High</span>
      <span><i className="legend-dot risk-moderate" />Moderate</span>
      <span><i className="legend-dot risk-low" />Low</span>
      <span><i className="legend-dot risk-unknown" />Unavailable</span>
    </div>
    <p className="map-context-note">Map tiles and backend coordinates provide geographic context only; the map does not predict hazards or disasters.</p>
  </section>;
}
