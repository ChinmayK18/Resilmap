import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, ScaleControl, TileLayer, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
const riskPriority = { low: 1, moderate: 2, high: 3, critical: 4, unknown: 0 };

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

function InvalidateMapSizeOnResize() {
  const map = useMap();

  useEffect(() => {
    let frame = 0;
    const invalidateSize = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true });
      });
    };

    const container = map.getContainer();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(invalidateSize);
    observer?.observe(container);
    if (container.parentElement) observer?.observe(container.parentElement);
    window.addEventListener('resize', invalidateSize);
    invalidateSize();

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', invalidateSize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

function makeRiskClusterIcon(cluster) {
  const childMarkers = cluster.getAllChildMarkers();
  const mostSevere = childMarkers.reduce((highest, marker) => {
    const iconHtml = marker.options.icon?.options?.html ?? '';
    const level = iconHtml.match(/level-(critical|high|moderate|low|unknown)/)?.[1] ?? 'unknown';
    return riskPriority[level] > riskPriority[highest] ? level : highest;
  }, 'unknown');

  return L.divIcon({
    className: 'resilmap-cluster-icon',
    html: `<span class="resilmap-cluster-bubble level-${mostSevere}">${cluster.getChildCount()}</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

export function MapPanel({ assets, riskByAssetId, selectedId, onSelect, hazard, assetStatus, riskStatus }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const [tileRetry, setTileRetry] = useState(0);
  const markerClusterRef = useRef(null);

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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => markerClusterRef.current?.refreshClusters());
    return () => window.cancelAnimationFrame(frame);
  }, [riskByAssetId, selectedId]);

  return <section className="panel map-panel">
    <div className="panel-heading map-heading">
      <div>
        <div className="panel-title"><span className="title-icon">⌖</span><h2>Infrastructure map</h2></div>
        <p>{new Intl.NumberFormat('en-IN').format(locatedAssets.length)} of {new Intl.NumberFormat('en-IN').format(assets.length)} assets with valid coordinates · {hazard} risk</p>
      </div>
      <span className="map-demo-badge"><i /> GEOGRAPHIC CONTEXT</span>
    </div>

    <div className="map-canvas leaflet-map-frame">
      {coordinates.length > 0 && <MapContainer
        className="resilmap-leaflet-map"
        center={coordinates[0]}
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
        <InvalidateMapSizeOnResize />
        <ScaleControl position="bottomleft" imperial={false} />
        <FitMapToAssets coordinates={coordinates} />
        <MarkerClusterGroup
          ref={markerClusterRef}
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={42}
          iconCreateFunction={makeRiskClusterIcon}
        >
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
              <Tooltip direction="top" offset={[0, -12]}>
                {risk?.Risk_Score != null ? `${risk.Risk_Level} · ${risk.Risk_Score}` : 'Risk result unavailable'}
              </Tooltip>
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
      </MapContainer>}

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
    <p className="map-context-note">Marker and cluster colors use the latest backend risk levels. Map tiles and coordinates provide geographic context only; they do not predict hazards or disasters. Cluster colors show the highest risk level in each cluster.</p>
  </section>;
}
