const numberFormat = new Intl.NumberFormat('en-IN');

function SummaryCard({ label, value, detail, tone, icon, trend }) {
  return <article className={`summary-card tone-${tone}`}><div className="summary-card-top"><span className="summary-label">{label}</span><span className="summary-icon">{icon}</span></div><div className="summary-value-row"><strong>{value}</strong>{trend && <span className={`summary-trend ${trend.tone}`}>{trend.label}</span>}</div><div className="summary-detail">{detail}</div><span className="card-accent" /></article>;
}

export function Dashboard({ hazard, assets, summary, alerts, assetStatus, riskStatus }) {
  const typeCounts = assets.reduce((result, asset) => {
    result[asset.Asset_Type] = (result[asset.Asset_Type] ?? 0) + 1;
    return result;
  }, {});
  const locatedCount = assets.filter((asset) => asset.Latitude != null && asset.Longitude != null).length;
  const totalRisk = summary?.overall?.score;
  const criticalCount = summary?.levels?.Critical;
  const criticalDisplay = riskStatus === 'loading'
    ? '…'
    : riskStatus === 'success' && summary?.levels
      ? numberFormat.format(criticalCount ?? 0)
      : '—';
  const assetCountDisplay = assetStatus === 'loading'
    ? '…'
    : assetStatus === 'success'
      ? numberFormat.format(assets.length)
      : '—';
  const locatedCountDisplay = assetStatus === 'loading'
    ? '…'
    : assetStatus === 'success'
      ? numberFormat.format(locatedCount)
      : '—';

  return <>
    <section className="summary-grid" aria-label={`${hazard} live risk summary`}>
      <SummaryCard label="OVERALL RISK SCORE" value={riskStatus === 'loading' ? '…' : totalRisk ?? '—'} detail={summary?.overall?.level ? `Combined live risk · ${summary.overall.level}` : 'Live risk summary'} tone="amber" icon="◌" trend={{ label: hazard.toUpperCase(), tone: 'trend-neutral' }} />
      <SummaryCard label="CRITICAL ASSETS" value={criticalDisplay} detail="From backend risk-level counts" tone="coral" icon="△" />
      <SummaryCard label="ML ANOMALIES" value="DEMO" detail="ML API integration not included" tone="violet" icon="⌁" />
      <SummaryCard label="MONITORED ASSETS" value={assetCountDisplay} detail="Assets returned by backend" tone="teal" icon="◈" />
    </section>

    <section className="infra-strip" aria-label="Infrastructure summary">
      <div className="infra-intro"><span className="infra-icon">▦</span><span><b>Infrastructure</b><small>Counts from the backend assets response</small></span></div>
      <div className="infra-stats">
        <div className="infra-stat"><span className="type-dot dot-substation" /><b>{numberFormat.format(typeCounts.Substation ?? 0)}</b><span>Substations</span></div>
        <div className="infra-stat"><span className="type-dot dot-hospital" /><b>{numberFormat.format(typeCounts.Hospital ?? 0)}</b><span>Hospitals</span></div>
        <div className="infra-stat"><span className="type-dot dot-power" /><b>{numberFormat.format(typeCounts['Power Station'] ?? 0)}</b><span>Power stations</span></div>
      </div>
      <span className="coverage-label"><i /> {locatedCountDisplay} with coordinates</span>
    </section>

    {riskStatus === 'success' && (
      <section className="alerts-strip" aria-label="Backend risk alerts">
        <div className="alerts-heading"><span className="alert-mark">!</span><span><b>Risk alerts</b><small>Backend High and Critical assets</small></span><strong>{alerts.length}</strong></div>
        {alerts.length > 0 ? <div className="alerts-list">{alerts.slice(0, 3).map((alert) => <div className="alert-item" key={alert.asset_id}><span className={`alert-level alert-${alert.risk_level.toLowerCase()}`} /><span>{alert.message}</span></div>)}</div> : <p className="alerts-empty">No High or Critical assets in the current risk response.</p>}
      </section>
    )}

    {assetStatus === 'success' && assets.length === 0 && <div className="api-state" role="status">The backend returned no infrastructure assets.</div>}
  </>;
}
