import { forHazard } from '../../utils/mockData.js';

function Meter({ label, value, display }) {
  return <div className="factor-row"><div className="factor-label"><span>{label}</span><b>{display}</b></div><div className="factor-track"><i style={{ width: `${Math.max(3, Math.min(value * 100, 100))}%` }} /></div></div>;
}

export function RiskPanel({ asset, hazard, onSimulate }) {
  const selected = forHazard(asset, hazard);
  const { risk, ml } = selected;
  const category = risk.Risk_Level.toLowerCase();
  return <section className="panel risk-panel">
    <div className="panel-heading"><div><div className="panel-title"><span className="title-icon">◉</span><h2>Selected asset</h2></div><p>Asset risk profile</p></div><span className={`risk-badge badge-${category}`}><i />{risk.Risk_Level}</span></div>
    <div className="selected-asset"><span className={`asset-glyph glyph-${asset.Asset_Type.toLowerCase().replace(' ', '-')}`}>{asset.Asset_Type === 'Substation' ? 'ϟ' : asset.Asset_Type === 'Hospital' ? '+' : '▥'}</span><div className="selected-asset-name"><small>{asset.Asset_Type.toUpperCase()} <span>·</span> {asset.Asset_ID}</small><b>{asset.Asset_Name}</b></div></div>
    <div className={`score-block score-${category}`}><div><small>{hazard.toUpperCase()} RISK SCORE</small><div className="score-number">{risk.Risk_Score}<span>/100</span></div></div><div className="score-ring" style={{ '--score': `${risk.Risk_Score}%` }}><span>{risk.Risk_Level}</span></div></div>
    <div className="risk-details"><div className="detail-row"><span>Hazard severity</span><b>{risk.Hazard_Severity}</b></div><div className="detail-row"><span>Asset capacity</span><b>{asset.Capacity ? `${asset.Capacity} MW` : '—'}</b></div><div className="factor-heading">RISK FACTORS <span>PROJECT MODEL INPUTS</span></div><Meter label="Exposure" value={risk.Exposure} display={risk.Exposure.toFixed(2)} /><Meter label="Vulnerability" value={risk.Vulnerability} display={risk.Vulnerability.toFixed(2)} /><Meter label="Dependency factor" value={risk.Dependency_Factor / 1.5} display={risk.Dependency_Factor.toFixed(2)} /></div>
    <div className="ml-summary"><span className="ml-orb">✦</span><div><small>AI / ML MODEL OUTPUT</small><b>{ml.ML_Anomaly === 1 ? 'Anomaly flagged' : 'No anomaly flagged'}</b><span>Anomaly score <strong>{ml.ML_Anomaly_Score.toFixed(3)}</strong></span></div><span className={`ml-flag ${ml.ML_Anomaly === 1 ? 'flagged' : ''}`}>{ml.ML_Anomaly === 1 ? 'FLAG' : 'CLEAR'}</span></div>
    <button type="button" className="simulate-button" onClick={onSimulate}><span>◎</span> Explore what-if scenario <i>↗</i></button><p className="panel-disclaimer">Demo values for UI preview. Risk and ML results are precomputed project fields.</p>
  </section>;
}
