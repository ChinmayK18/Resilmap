function DataState({ status, error, hasRecords, empty, children }) {
  if (status === 'loading') return <div className="ml-data-state" role="status">Loading backend ML results…</div>;
  if (status === 'error') return <div className="ml-data-state ml-data-error" role="alert">{error}</div>;
  if (!hasRecords) return <div className="ml-data-state">{empty}</div>;
  return children;
}

function riskClass(level) {
  return typeof level === 'string' ? `badge-${level.toLowerCase()}` : '';
}

export function MlInsights({ anomalyState, aiRiskState, eventState, hazard, onRefresh }) {
  const anomalyRecords = anomalyState.records ?? [];
  const aiRiskRecords = aiRiskState.records ?? [];
  const eventRecords = eventState.records ?? [];
  const isLoading = [anomalyState, aiRiskState, eventState].some((state) => state.status === 'loading');

  return <section className="panel ml-insights" aria-label="Backend machine learning analysis">
    <div className="panel-heading ml-insights-heading">
      <div><div className="panel-title"><span className="title-icon">✦</span><h2>AI / ML analysis</h2></div><p>Precomputed backend outputs · anomaly scores are not failure probabilities</p></div>
      <button type="button" className="ml-refresh-button" onClick={onRefresh} disabled={isLoading}>Refresh results</button>
    </div>

    <div className="ml-insight-grid">
      <section className="ml-result-section" aria-label="Flagged anomalies">
        <div className="ml-result-heading"><div><b>Flagged anomalies</b><small>Isolation Forest flagged records</small></div><strong>{anomalyState.status === 'success' ? anomalyState.count : '—'}</strong></div>
        <DataState status={anomalyState.status} error={anomalyState.error} hasRecords={anomalyRecords.length > 0} empty="No flagged anomaly records were returned.">
          {anomalyRecords.length === 0 ? <div className="ml-data-state">No flagged anomaly records were returned.</div> : <>
            <div className="ml-record-list">{anomalyRecords.slice(0, 4).map((record, index) => <article className="ml-record" key={`${record.Asset_ID}-${record.Hazard_Type}-${index}`}>
              <div className="ml-record-main"><b>{record.Asset_Name ?? record.Asset_ID}</b><span>{record.Asset_ID} · {record.Hazard_Type}</span></div>
              <div className="ml-record-value"><small>ANOMALY SCORE</small><b>{formatValue(record.ML_Anomaly_Score)}</b>{record.Risk_Level && <span className={`risk-badge ${riskClass(record.Risk_Level)}`}>Rule {record.Risk_Level}</span>}</div>
            </article>)}</div>
            <p className="ml-list-note">Showing up to 4 records from the endpoint’s top 50. Absence from this flagged-only list does not mean an asset is normal.</p>
          </>}
        </DataState>
      </section>

      <section className="ml-result-section" aria-label="AI infrastructure risk rankings">
        <div className="ml-result-heading"><div><b>AI risk rankings</b><small>Selected hazard · {hazard}</small></div><span className="ml-definition">AI_Risk_Score</span></div>
        <p className="ml-measure-note">AI_Risk_Score is separate from the rule-based Risk_Score above.</p>
        <DataState status={aiRiskState.status} error={aiRiskState.error} hasRecords={aiRiskRecords.length > 0} empty="No AI risk records were returned for this hazard.">
          {aiRiskRecords.length === 0 ? <div className="ml-data-state">No AI risk records were returned for this hazard.</div> : <div className="ml-record-list">{aiRiskRecords.slice(0, 5).map((record, index) => <article className="ml-record ranking-record" key={`${record.Asset_ID}-${record.Hazard_Type}-${index}`}>
            <span className="ranking-index">{String(index + 1).padStart(2, '0')}</span><div className="ml-record-main"><b>{record.Asset_Name ?? record.Asset_ID}</b><span>{record.Asset_ID} · {record.Asset_Type}</span></div><div className="ml-record-value"><small>AI SCORE</small><b>{formatValue(record.AI_Risk_Score)}</b>{record.Risk_Level && <span className={`risk-badge ${riskClass(record.Risk_Level)}`}>AI {record.Risk_Level}</span>}</div>
          </article>)}</div>}
        </DataState>
      </section>

      <section className="ml-result-section historical-section" aria-label="Historical event risk">
        <div className="ml-result-heading"><div><b>Historical event risk</b><small>Precomputed historical records · {hazard}</small></div><span className="ml-definition">AI_Event_Risk</span></div>
        <DataState status={eventState.status} error={eventState.error} hasRecords={eventRecords.length > 0} empty="No historical event records were returned for this hazard.">
          {eventRecords.length === 0 ? <div className="ml-data-state">No historical event records were returned for this hazard.</div> : <div className="ml-record-list">{eventRecords.slice(0, 4).map((record, index) => <article className="ml-record ranking-record" key={`${record.Asset_ID}-${record.Event_Date}-${index}`}>
            <div className="ml-record-main"><b>{record.Asset_Name ?? record.Asset_ID}</b><span>{record.Asset_ID} · {record.Hazard_Type} · {record.Event_Date}</span></div><div className="ml-record-value"><small>EVENT RISK</small><b>{formatValue(record.AI_Event_Risk)}</b>{record.AI_Risk_Level && <span className={`risk-badge ${riskClass(record.AI_Risk_Level)}`}>AI {record.AI_Risk_Level}</span>}</div>
          </article>)}</div>}
        </DataState>
        <p className="ml-list-note">Historical event analysis only; these records are not live observations or guaranteed future predictions.</p>
      </section>
    </div>
  </section>;
}

function formatValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';
}
