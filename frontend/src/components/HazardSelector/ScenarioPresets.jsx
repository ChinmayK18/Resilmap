const scenarioLabels = {
  normal: 'Normal Conditions',
  severe_solar_storm: 'Severe Solar Storm',
  compound_disaster: 'Compound Disaster',
};

const requiredHazards = ['heat', 'flood', 'geomagnetic'];

function formatScenarioValues(values) {
  return `Heat ${values.heat} · Flood ${values.flood} · Geomagnetic ${values.geomagnetic}`;
}

export function validateScenarioResponse(response) {
  const scenarios = Object.entries(scenarioLabels).map(([key, label]) => {
    const values = response?.[key];
    if (!values || requiredHazards.some((hazard) => (
      typeof values[hazard] !== 'number'
      || !Number.isFinite(values[hazard])
      || values[hazard] < 0
      || values[hazard] > 100
    ))) {
      throw new Error(`The scenarios response is missing valid values for "${key}".`);
    }
    return { key, label, values };
  });
  return scenarios;
}

export function ScenarioPresets({ scenarios, status, error, selectedKey, onSelect, onRetry }) {
  return <section className="scenario-presets" aria-label="Hazard scenario presets">
    <div className="scenario-heading">
      <div><b>Scenario presets</b><span>Backend-provided slider inputs</span></div>
      <p>Presets are scenarios, not live environmental measurements.</p>
    </div>
    {status === 'loading' && <div className="scenario-state" role="status">Loading scenarios from the backend…</div>}
    {status === 'error' && <div className="scenario-state scenario-error" role="alert"><span>{error}</span><button type="button" onClick={onRetry}>Retry scenarios</button></div>}
    {status === 'success' && <div className="scenario-buttons">
      {scenarios.map((scenario) => <button
        type="button"
        key={scenario.key}
        className={`scenario-button ${selectedKey === scenario.key ? 'is-selected' : ''}`}
        aria-pressed={selectedKey === scenario.key}
        onClick={() => onSelect(scenario)}
      >
        <span className="scenario-button-title">{scenario.label}</span>
        <span className="scenario-button-values">{formatScenarioValues(scenario.values)}</span>
      </button>)}
    </div>}
  </section>;
}
