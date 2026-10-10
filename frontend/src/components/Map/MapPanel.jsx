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

function MapSelectionController({ selectedAsset, markerRefs, markerClusterRef }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedAsset) return;
    const marker = markerRefs.current.get(selectedAsset.asset.Asset_ID);
    if (!marker) {
      map.flyTo([selectedAsset.latitude, selectedAsset.longitude], Math.max(map.getZoom(), 15), { duration: 0.8 });
      return;
    }
    markerClusterRef.current?.zoomToShowLayer(marker, () => {
      map.flyTo([selectedAsset.latitude, selectedAsset.longitude], Math.max(map.getZoom(), 15), { duration: 0.8 });
      map.once('moveend', () => marker.openPopup());
    });
  }, [map, markerRefs, markerClusterRef, selectedAsset]);

  return null;
}

function AssetSearch({ assets, onSelect }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const inputRef = useRef(null);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return assets.filter((asset) => (
      String(asset.Asset_Name ?? '').toLocaleLowerCase().includes(normalized)
      || String(asset.Asset_Type ?? '').toLocaleLowerCase().includes(normalized)
    )).slice(0, 7);
  }, [assets, query]);

  function choose(asset) {
    setQuery(asset.Asset_Name ?? '');
    setOpen(false);
    setActiveIndex(-1);
    const latitude = finiteCoordinate(asset.Latitude, -90, 90);
    const longitude = finiteCoordinate(asset.Longitude, -180, 180);
    if (latitude === null || longitude === null) {
      setNotice(`${asset.Asset_Name ?? 'This asset'} cannot be located on the map because its coordinates are unavailable.`);
      return;
    }
    setNotice('');
    onSelect(asset.Asset_ID);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') { setOpen(false); setActiveIndex(-1); return; }
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault(); setOpen(true); setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault(); setOpen(true); setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter' && open && results.length) {
      event.preventDefault(); choose(results[activeIndex >= 0 ? activeIndex : 0]);
    }
  }

  return <div className="asset-search" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
    <label className="asset-search-box">
      <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>
      <input ref={inputRef} type="search" value={query} placeholder="Search assets by name or type…" aria-label="Search infrastructure assets" aria-autocomplete="list" aria-controls="asset-search-results" aria-expanded={open && results.length > 0} onFocus={() => query.trim() && setOpen(true)} onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); setOpen(true); setNotice(''); }} onKeyDown={handleKeyDown} />
      {query && <button type="button" className="asset-search-clear" aria-label="Clear asset search" onClick={() => { setQuery(''); setOpen(false); setNotice(''); setActiveIndex(-1); inputRef.current?.focus(); }}>×</button>}
    </label>
    {open && query.trim() && <div className="asset-search-results" id="asset-search-results" role="listbox">
      {results.length ? results.map((asset, index) => <button type="button" className={`asset-search-result${index === activeIndex ? ' is-active' : ''}`} key={asset.Asset_ID} role="option" aria-selected={index === activeIndex} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(asset)}><span><b>{asset.Asset_Name || 'Unnamed asset'}</b><small>{asset.Asset_Type || 'Unknown type'}</small></span><i>↗</i></button>) : <div className="asset-search-empty" role="status">No matching assets found</div>}
    </div>}
    {notice && <div className="asset-search-notice" role="status">{notice}</div>}
  </div>;
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
  const markerRefs = useRef(new Map());
  const [navigationId, setNavigationId] = useState(null);

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
      <AssetSearch assets={assets} onSelect={(id) => { onSelect(id); setNavigationId(id); }} />
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
        <MapSelectionController selectedAsset={locatedAssets.find(({ asset }) => asset.Asset_ID === navigationId) ?? null} markerRefs={markerRefs} markerClusterRef={markerClusterRef} />
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
              ref={(marker) => { if (marker) markerRefs.current.set(asset.Asset_ID, marker); else markerRefs.current.delete(asset.Asset_ID); }}
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
