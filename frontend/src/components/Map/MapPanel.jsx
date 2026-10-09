const schematicPosition = {
  SUB_1: { left: '18%', top: '37%' }, SUB_2: { left: '72%', top: '76%' },
  SUB_3: { left: '78%', top: '32%' }, SUB_4: { left: '66%', top: '39%' },
};

export function MapPanel({ assets, riskByAssetId, selectedId, onSelect, hazard, assetStatus, riskStatus }) {
  const locatedAssets = assets.filter((asset) => asset.Latitude != null && asset.Longitude != null);
  return <section className="panel map-panel">
    <div className="panel-heading map-heading"><div><div className="panel-title"><span className="title-icon">⌖</span><h2>Infrastructure map</h2></div><p>{numberLabel(locatedAssets.length)} assets with coordinates · marker colors use combined risk</p></div><div className="map-tools"><span className="map-demo-badge"><i /> ILLUSTRATIVE · NOT TO SCALE</span><button type="button" className="icon-button" aria-label="Map layer preview only" title="Map layer controls are not connected">▤</button></div></div>
    <div className="map-canvas" role="group" aria-label={`Illustrative schematic showing ${locatedAssets.length} assets that have coordinates. Marker positions are not geographic.`}>
      <div className="map-grid" />
      <svg className="map-river" viewBox="0 0 900 500" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 360 C100 290 95 380 208 322 S340 234 410 272 S510 220 561 247 S656 128 712 180 S790 88 930 100" /><path className="river-highlight" d="M-20 360 C100 290 95 380 208 322 S340 234 410 272 S510 220 561 247 S656 128 712 180 S790 88 930 100" /><path className="road road-one" d="M30 460 C190 385 260 400 365 320 S515 294 620 214 S760 220 920 125" /><path className="road road-two" d="M110 50 C185 130 242 180 310 227 S425 312 506 360 S690 398 820 470" /><path className="road road-three" d="M-10 210 C190 205 250 245 400 185 S642 111 910 232" /></svg>
      <span className="map-label label-borivali">BORIVALI</span><span className="map-label label-bandra">BANDRA</span><span className="map-label label-fort">FORT</span><span className="map-label label-thane">MULUND</span><span className="map-label label-trombay">TROMBAY</span><span className="map-label label-sea">ARABIAN SEA</span><div className="north-marker">N <span>↑</span></div>
      {locatedAssets.map((asset, index) => {
        const risk = riskByAssetId.get(asset.Asset_ID);
        const position = schematicPosition[asset.Asset_ID] ?? { left: `${8 + (index * 37) % 84}%`, top: `${12 + (index * 53) % 75}%` };
        const level = risk?.Risk_Level;
        return <button
          type="button"
          className={`map-marker marker-${asset.Asset_Type.toLowerCase().replace(' ', '-')} ${level ? `risk-${level.toLowerCase()}` : 'risk-unknown'} ${selectedId === asset.Asset_ID ? 'selected' : ''}`}
          style={position}
          key={asset.Asset_ID}
          onClick={() => onSelect(asset.Asset_ID)}
          aria-label={`${asset.Asset_Name}${level ? `, ${level} combined risk` : ', risk unavailable'}`}
          title={`${asset.Asset_Name}${level ? ` · ${level}` : ''}`}
        ><span /></button>;
      })}
      {assetStatus === 'loading' && <div className="map-empty-state">Loading asset records…</div>}
      {assetStatus === 'success' && locatedAssets.length === 0 && <div className="map-empty-state">No assets with coordinates were returned.</div>}
      {riskStatus === 'error' && <div className="map-risk-note">Risk colors unavailable until the API request succeeds.</div>}
      <div className="map-scale"><span /> Schematic only</div><div className="map-overlay-note"><span>i</span> Markers indicate located assets; placement is illustrative, not based on latitude / longitude.</div>
    </div>
    <div className="map-legend"><span className="legend-title">ASSET TYPE</span><span><i className="legend-dot dot-substation" />Substation</span><span><i className="legend-dot dot-hospital" />Hospital</span><span><i className="legend-dot dot-power" />Power station</span><span className="legend-spacer" /><span className="legend-title">COMBINED RISK</span><span><i className="legend-dot risk-critical" />Critical</span><span><i className="legend-dot risk-moderate" />Moderate</span><span><i className="legend-dot risk-unknown" />Unavailable</span></div>
  </section>;
}

function numberLabel(value) {
  return new Intl.NumberFormat('en-IN').format(value);
}
