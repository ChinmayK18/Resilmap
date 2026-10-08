import { getRiskCounts } from '../../utils/mockData.js';

const numberFormat = new Intl.NumberFormat('en-IN');

function SummaryCard({ label, value, detail, tone, icon, trend }) {
  return <article className={`summary-card tone-${tone}`}><div className="summary-card-top"><span className="summary-label">{label}</span><span className="summary-icon">{icon}</span></div><div className="summary-value-row"><strong>{value}</strong>{trend && <span className={`summary-trend ${trend.tone}`}>{trend.label}</span>}</div><div className="summary-detail">{detail}</div><span className="card-accent" /></article>;
}

export function Dashboard({ hazard, items }) {
  const counts = getRiskCounts(items);
  const averageRisk = items.length ? Math.round(items.reduce((total, item) => total + item.risk.Risk_Score, 0) / items.length) : 0;
  const anomalies = items.filter((item) => item.ml.ML_Anomaly === 1).length;
  const typeCounts = items.reduce((result, item) => { result[item.Asset_Type] = (result[item.Asset_Type] ?? 0) + 1; return result; }, {});
  return <>
    <section className="summary-grid" aria-label={`${hazard} risk summary`}>
      <SummaryCard label="AVERAGE RISK SCORE" value={averageRisk} detail="Out of 100 · selected hazard" tone="amber" icon="◌" trend={{ label: hazard.toUpperCase(), tone: 'trend-neutral' }} />
      <SummaryCard label="CRITICAL ASSETS" value={numberFormat.format(counts.Critical)} detail="Risk score above 75" tone="coral" icon="△" />
      <SummaryCard label="ML ANOMALIES" value={numberFormat.format(anomalies)} detail="Flagged in demo model output" tone="violet" icon="⌁" />
      <SummaryCard label="MONITORED ASSETS" value={numberFormat.format(items.length)} detail="Assets in this demo view" tone="teal" icon="◈" />
    </section>
    <section className="infra-strip" aria-label="Infrastructure summary">
      <div className="infra-intro"><span className="infra-icon">▦</span><span><b>Infrastructure</b><small>Asset coverage in current view</small></span></div>
      <div className="infra-stats"><div className="infra-stat"><span className="type-dot dot-substation" /><b>{typeCounts.Substation ?? 0}</b><span>Substations</span></div><div className="infra-stat"><span className="type-dot dot-hospital" /><b>{typeCounts.Hospital ?? 0}</b><span>Hospitals</span></div><div className="infra-stat"><span className="type-dot dot-power" /><b>{typeCounts['Power Station'] ?? 0}</b><span>Power stations</span></div></div>
      <span className="coverage-label"><i /> {items.filter((asset) => asset.Latitude != null && asset.Longitude != null).length} with location</span>
    </section>
  </>;
}
