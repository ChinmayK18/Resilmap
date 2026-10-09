function Meter({ label, value, max = 1 }) {
  const width = Math.max(3, Math.min((Number(value) / max) * 100, 100));
  return <div className="factor-row"><div className="factor-label"><span>{label}</span><b>{value}</b></div><div className="factor-track"><i style={{ width: `${width}%` }} /></div></div>;
}

export function RiskPanel({ asset, risk, hazard, severity, riskStatus, mlDemo, onSimulate }) {
  if (!asset) {
    return <section className="panel risk-panel"><div className="panel-heading"><div><div className="panel-title"><span className="title-icon">◉</span><h2>Selected asset</h2></div><p>Asset risk profile</p></div></div><div className="risk-state">Choose a located asset marker to inspect its backend record.</div></section>;
  }

  const level = risk?.Risk_Level;
  const category = level?.toLowerCase() ?? 'unknown';
  const hazardRisk = risk?.Hazard_Risks?.[hazard];

  return <section className="panel risk-panel">
    <div className="panel-heading"><div><div className="panel-title"><span className="title-icon">◉</span><h2>Selected asset</h2></div><p>Live backend asset and risk record</p></div>{level && <span className={`risk-badge badge-${category}`}><i />{level}</span>}</div>
    <div className="selected-asset"><span className={`asset-glyph glyph-${asset.Asset_Type.toLowerCase().replace(' ', '-')}`}>{asset.Asset_Type === 'Substation' ? 'ϟ' : asset.Asset_Type === 'Hospital' ? '+' : '▥'}</span><div className="selected-asset-name"><small>{asset.Asset_Type.toUpperCase()} <span>·</span> {asset.Asset_ID}</small><b>{asset.Asset_Name}</b></div></div>

    {(riskStatus === 'idle' || riskStatus === 'loading') && <div className="risk-state" role="status">Waiting for live risk response…</div>}
    {riskStatus === 'error' && <div className="risk-state risk-state-error" role="alert">Live risk data is unavailable. No mock risk values are shown.</div>}
    {riskStatus === 'success' && !risk && <div className="risk-state">The risk response did not include this asset.</div>}

    {riskStatus === 'success' && risk && <>
      <div className={`score-block score-${category}`}><div><small>COMBINED RISK SCORE</small><div className="score-number">{risk.Risk_Score}<span>/100</span></div></div>{level && <div className="score-ring" style={{ '--score': `${risk.Risk_Score}%` }}><span>{level}</span></div>}</div>
      <div className="risk-details">
        <div className="detail-row"><span>{hazard} risk component</span><b>{hazardRisk ?? 'Not returned'}</b></div>
        <div className="detail-row"><span>{hazard} severity input</span><b>{severity}</b></div>
        <div className="detail-row"><span>Capacity (source value)</span><b>{asset.Capacity ?? '—'}</b></div>
        <div className="factor-heading">LIVE RISK FACTORS <span>FROM POST /API/RISK</span></div>
        {risk.Exposure != null ? <Meter label="Exposure" value={risk.Exposure} /> : <div className="detail-row"><span>Exposure</span><b>Not returned</b></div>}
        {risk.Dependency_Factor != null ? <Meter label="Dependency factor" value={risk.Dependency_Factor} max={1.5} /> : <div className="detail-row"><span>Dependency factor</span><b>Not returned</b></div>}
        {risk.Vulnerability != null ? <Meter label="Vulnerability" value={risk.Vulnerability} /> : <div className="detail-row"><span>Vulnerability</span><b>Not included in live risk response</b></div>}
      </div>
    </>}

    <div className="ml-summary"><span className="ml-orb">✦</span><div><small>ML ANALYSIS · DEMO ONLY</small>{mlDemo ? <><b>{mlDemo.ML_Anomaly === 1 ? 'Demo anomaly flagged' : 'Demo sample not flagged'}</b><span>Demo anomaly score <strong>{mlDemo.ML_Anomaly_Score.toFixed(3)}</strong></span></> : <><b>ML endpoint not connected</b><span>No demo sample for this asset</span></>}</div><span className="ml-flag demo-flag">DEMO</span></div>
    <button type="button" className="simulate-button" onClick={onSimulate}><span>◎</span> Explore what-if scenario <i>↗</i></button>
    <p className="panel-disclaimer">Risk values are from the live API. ML sample, when shown, is hardcoded demo data only.</p>
  </section>;
}
