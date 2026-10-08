import { forHazard } from '../../utils/mockData.js';

const pointPosition = {
  SUB_1: { left: '18%', top: '37%' }, SUB_2: { left: '72%', top: '76%' },
  SUB_3: { left: '78%', top: '32%' }, SUB_4: { left: '66%', top: '39%' }, HOS_3: { left: '25%', top: '32%' },
};

export function MapPanel({ assets, selectedId, onSelect, hazard }) {
  const locatableAssets = assets.filter((asset) => asset.Latitude != null && asset.Longitude != null);
  return <section className="panel map-panel">
    <div className="panel-heading map-heading"><div><div className="panel-title"><span className="title-icon">⌖</span><h2>Infrastructure map</h2></div><p>Asset locations and {hazard.toLowerCase()} risk levels</p></div><div className="map-tools"><span className="map-demo-badge"><i /> MAP PREVIEW</span><button type="button" className="icon-button" aria-label="Map layers">▤</button></div></div>
    <div className="map-canvas" role="group" aria-label={`Illustrative Mumbai map preview with ${locatableAssets.length} located assets`}>
      <div className="map-grid" />
      <svg className="map-river" viewBox="0 0 900 500" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 360 C100 290 95 380 208 322 S340 234 410 272 S510 220 561 247 S656 128 712 180 S790 88 930 100" /><path className="river-highlight" d="M-20 360 C100 290 95 380 208 322 S340 234 410 272 S510 220 561 247 S656 128 712 180 S790 88 930 100" /><path className="road road-one" d="M30 460 C190 385 260 400 365 320 S515 294 620 214 S760 220 920 125" /><path className="road road-two" d="M110 50 C185 130 242 180 310 227 S425 312 506 360 S690 398 820 470" /><path className="road road-three" d="M-10 210 C190 205 250 245 400 185 S642 111 910 232" /></svg>
      <span className="map-label label-borivali">BORIVALI</span><span className="map-label label-bandra">BANDRA</span><span className="map-label label-fort">FORT</span><span className="map-label label-thane">MULUND</span><span className="map-label label-trombay">TROMBAY</span><span className="map-label label-sea">ARABIAN SEA</span><div className="north-marker">N <span>↑</span></div>
      {locatableAssets.map((asset, index) => {
        const item = forHazard(asset, hazard);
        const position = pointPosition[asset.Asset_ID] ?? { left: `${35 + (index * 13) % 50}%`, top: `${25 + (index * 17) % 52}%` };
        return <button type="button" className={`map-marker marker-${asset.Asset_Type.toLowerCase().replace(' ', '-')} risk-${item.risk.Risk_Level.toLowerCase()} ${selectedId === asset.Asset_ID ? 'selected' : ''}`} style={position} key={asset.Asset_ID} onClick={() => onSelect(asset.Asset_ID)} aria-label={`${asset.Asset_Name}, ${item.risk.Risk_Level} risk`}><span /></button>;
      })}
      <div className="map-scale"><span /> 2 km</div><div className="map-overlay-note"><span>✦</span> Illustrative map preview · demo coordinates</div>
    </div>
    <div className="map-legend"><span className="legend-title">ASSET TYPE</span><span><i className="legend-dot dot-substation" />Substation</span><span><i className="legend-dot dot-hospital" />Hospital</span><span><i className="legend-dot dot-power" />Power station</span><span className="legend-spacer" /><span className="legend-title">RISK</span><span><i className="legend-dot risk-critical" />Critical</span><span><i className="legend-dot risk-moderate" />Moderate</span></div>
  </section>;
}
