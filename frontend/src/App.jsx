import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard.jsx';
import { LiveWeatherPanel } from './components/Dashboard/LiveWeatherPanel.jsx';
import { MlInsights } from './components/Dashboard/MlInsights.jsx';
import { HazardSelector } from './components/HazardSelector/HazardSelector.jsx';
import { ScenarioPresets, validateScenarioResponse } from './components/HazardSelector/ScenarioPresets.jsx';
import { MapPanel } from './components/Map/MapPanel.jsx';
import { RiskPanel } from './components/RiskPanel/RiskPanel.jsx';
import { SimulatorPanel } from './components/Simulator/SimulatorPanel.jsx';
import { getAssets, getHazardScenarios, getMlAnomalies, getMlEvents, getMlRisk, postRisk } from './services/api.js';
import { initialHazardSeverities } from './utils/hazards.js';
import './styles.css';

function sameSeverities(left, right) {
  return left.heat === right.heat
    && left.flood === right.flood
    && left.geomagnetic === right.geomagnetic;
}

function readMlRecords(response, endpointName) {
  if (!Array.isArray(response.records) || typeof response.count !== 'number') {
    throw new Error(`${endpointName} did not return the documented count and records fields.`);
  }
  return { records: response.records, count: response.count };
}

function initialMlState() {
  return { status: 'loading', records: [], count: null, error: '' };
}

export default function App() {
  const [hazard, setHazard] = useState('Flood');
  const [draftSeverities, setDraftSeverities] = useState(initialHazardSeverities);
  const [committedSeverities, setCommittedSeverities] = useState(initialHazardSeverities);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioStatus, setScenarioStatus] = useState('loading');
  const [scenarioError, setScenarioError] = useState('');
  const [scenarioRetry, setScenarioRetry] = useState(0);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState(null);
  const [assets, setAssets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [assetStatus, setAssetStatus] = useState('loading');
  const [assetError, setAssetError] = useState('');
  const [assetReload, setAssetReload] = useState(0);
  const [riskResult, setRiskResult] = useState(null);
  const [riskStatus, setRiskStatus] = useState('idle');
  const [riskError, setRiskError] = useState('');
  const [riskRetry, setRiskRetry] = useState(0);
  const [riskRequestRevision, setRiskRequestRevision] = useState(0);
  const [mlRefresh, setMlRefresh] = useState(0);
  const [anomalyState, setAnomalyState] = useState(initialMlState);
  const [aiRiskState, setAiRiskState] = useState(initialMlState);
  const [eventRiskState, setEventRiskState] = useState(initialMlState);
  const [showSimulator, setShowSimulator] = useState(false);
  const latestRiskRequest = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setScenarioStatus('loading');
    setScenarioError('');

    getHazardScenarios({ signal: controller.signal })
      .then((response) => {
        setScenarios(validateScenarioResponse(response));
        setScenarioStatus('success');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setScenarios([]);
        setSelectedScenarioKey(null);
        setScenarioStatus('error');
        setScenarioError(error.message || 'Unable to load backend hazard scenarios.');
      });

    return () => controller.abort();
  }, [scenarioRetry]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setAnomalyState({ status: 'loading', records: [], count: null, error: '' });

    getMlAnomalies({ top: 50, signal: controller.signal })
      .then((response) => {
        if (!current) return;
        setAnomalyState({ status: 'success', ...readMlRecords(response, 'ML anomalies'), error: '' });
      })
      .catch((error) => {
        if (!current || error.name === 'AbortError') return;
        setAnomalyState({ status: 'error', records: [], count: null, error: error.message || 'Unable to load ML anomalies.' });
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [mlRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setAiRiskState({ status: 'loading', records: [], count: null, error: '' });

    getMlRisk({ top: 50, hazardType: hazard, signal: controller.signal })
      .then((response) => {
        if (!current) return;
        setAiRiskState({ status: 'success', ...readMlRecords(response, 'AI risk rankings'), error: '' });
      })
      .catch((error) => {
        if (!current || error.name === 'AbortError') return;
        setAiRiskState({ status: 'error', records: [], count: null, error: error.message || 'Unable to load AI risk rankings.' });
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [hazard, mlRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setEventRiskState({ status: 'loading', records: [], count: null, error: '' });

    getMlEvents({ top: 50, hazardType: hazard, signal: controller.signal })
      .then((response) => {
        if (!current) return;
        setEventRiskState({ status: 'success', ...readMlRecords(response, 'Historical event risk'), error: '' });
      })
      .catch((error) => {
        if (!current || error.name === 'AbortError') return;
        setEventRiskState({ status: 'error', records: [], count: null, error: error.message || 'Unable to load historical event risk.' });
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [hazard, mlRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    setAssetStatus('loading');
    setAssetError('');

    getAssets({ signal: controller.signal })
      .then((response) => {
        if (!Array.isArray(response.assets)) {
          throw new Error('The assets response did not contain an assets array.');
        }
        setAssets(response.assets);
        setSelectedId((currentId) => (
          response.assets.some((asset) => asset.Asset_ID === currentId)
            ? currentId
            : response.assets.find((asset) => asset.Latitude != null && asset.Longitude != null)?.Asset_ID
              ?? response.assets[0]?.Asset_ID
              ?? null
        ));
        setAssetStatus('success');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setAssets([]);
        setSelectedId(null);
        setAssetStatus('error');
        setAssetError(error.message || 'Unable to load infrastructure assets.');
      });

    return () => controller.abort();
  }, [assetReload]);

  useEffect(() => {
    if (assetStatus !== 'success') return undefined;

    const controller = new AbortController();
    const requestId = ++latestRiskRequest.current;
    setRiskStatus('loading');
    setRiskError('');
    setRiskResult(null);

    postRisk(committedSeverities, { signal: controller.signal })
      .then((result) => {
        if (requestId !== latestRiskRequest.current) return;
        if (!Array.isArray(result.assets)) {
          throw new Error('The risk response did not contain an assets array.');
        }
        if (!result.summary?.overall || !result.summary?.levels || !Array.isArray(result.alerts)) {
          throw new Error('The risk response is missing its documented summary or alerts data.');
        }
        setRiskResult(result);
        setRiskStatus('success');
      })
      .catch((error) => {
        if (error.name === 'AbortError' || requestId !== latestRiskRequest.current) return;
        setRiskResult(null);
        setRiskStatus('error');
        setRiskError(error.message || 'Unable to calculate live risk.');
      });

    return () => {
      controller.abort();
      if (requestId === latestRiskRequest.current) latestRiskRequest.current += 1;
    };
  }, [assetStatus, committedSeverities, riskRequestRevision, riskRetry]);

  const riskByAssetId = useMemo(
    () => new Map((riskResult?.assets ?? []).map((record) => [record.Asset_ID, record])),
    [riskResult],
  );

  const selectedAsset = assets.find((asset) => asset.Asset_ID === selectedId) ?? null;
  const selectedRisk = selectedId ? riskByAssetId.get(selectedId) ?? null : null;
  const selectedAnomaly = selectedId
    ? anomalyState.records.find((record) => record.Asset_ID === selectedId && record.Hazard_Type === hazard) ?? null
    : null;

  const commitSeverities = useCallback((nextSeverities) => {
    setDraftSeverities(nextSeverities);
    const matchingScenario = scenarios.find((scenario) => sameSeverities(scenario.values, nextSeverities));
    setSelectedScenarioKey(matchingScenario?.key ?? null);
    setCommittedSeverities((current) => (
      sameSeverities(current, nextSeverities) ? current : nextSeverities
    ));
  }, [scenarios]);

  const updateDraftSeverities = useCallback((nextSeverities) => {
    setDraftSeverities(nextSeverities);
    const matchingScenario = scenarios.find((scenario) => sameSeverities(scenario.values, nextSeverities));
    setSelectedScenarioKey(matchingScenario?.key ?? null);
  }, [scenarios]);

  function selectScenario(scenario) {
    setDraftSeverities(scenario.values);
    setCommittedSeverities(scenario.values);
    setSelectedScenarioKey(scenario.key);
    setRiskRequestRevision((revision) => revision + 1);
  }

  function selectHazard(nextHazard) {
    setHazard(nextHazard);
    setShowSimulator(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#dashboard" aria-label="ResilMap home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="brand-name">resil<span>map</span></span>
          <span className="brand-divider" />
          <span className="brand-caption">Urban resilience intelligence</span>
        </a>
        <div className="topbar-right">
          <span className={`live-indicator ${assetStatus === 'error' || riskStatus === 'error' ? 'is-offline' : ''}`}>
            <i /> {assetStatus === 'error' || riskStatus === 'error' ? 'API unavailable' : 'Live API data'}
          </span>
          <div className="user-avatar" aria-label="Resilience team">RT</div>
        </div>
      </header>

      <div className="dashboard-wrap" id="dashboard">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> RESILIENCE OVERVIEW</div>
            <h1>Mumbai <span className="heading-period">/</span> City view</h1>
            <p className="page-subtitle">Infrastructure risk overview across Greater Mumbai</p>
          </div>
          <div className="region-pill"><span className="pin-icon">⌖</span><span><small>MONITORING REGION</small><b>Mumbai, Maharashtra</b></span><span className="chevron">⌄</span></div>
        </div>

        {assetStatus === 'error' && <div className="api-state api-error" role="alert"><span>{assetError}</span><button type="button" onClick={() => setAssetReload((reload) => reload + 1)}>Retry asset request</button></div>}
        {assetStatus === 'loading' && <div className="api-state" role="status">Loading infrastructure assets from the ResilMap API…</div>}

        <section className="hazard-row" aria-label="Hazard selection">
          <div className="section-kicker">SELECTED HAZARD</div>
          <div className="hazard-note"><span className="sparkle">✦</span> Scenario inputs are not live environmental measurements</div>
        </section>
        <ScenarioPresets
          scenarios={scenarios}
          status={scenarioStatus}
          error={scenarioError}
          selectedKey={selectedScenarioKey}
          onSelect={selectScenario}
          onRetry={() => setScenarioRetry((retry) => retry + 1)}
        />
        <HazardSelector
          value={hazard}
          onChange={selectHazard}
          severities={draftSeverities}
          onSeverityChange={updateDraftSeverities}
          onCommit={commitSeverities}
        />

        {riskStatus === 'error' && <div className="api-state api-error" role="alert"><span>{riskError}</span><button type="button" onClick={() => setRiskRetry((retry) => retry + 1)}>Retry risk request</button></div>}
        {riskStatus === 'loading' && <div className="api-state" role="status">Updating live risk results…</div>}

        <Dashboard
          hazard={hazard}
          assets={assets}
          summary={riskResult?.summary ?? null}
          alerts={riskResult?.alerts ?? []}
          assetStatus={assetStatus}
          riskStatus={riskStatus}
          anomalyState={anomalyState}
        />
        <LiveWeatherPanel />
        <MlInsights
          anomalyState={anomalyState}
          aiRiskState={aiRiskState}
          eventState={eventRiskState}
          hazard={hazard}
          onRefresh={() => setMlRefresh((refresh) => refresh + 1)}
        />

        <section className="workspace-grid">
          <MapPanel
            assets={assets}
            riskByAssetId={riskByAssetId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            hazard={hazard}
            assetStatus={assetStatus}
            riskStatus={riskStatus}
          />
          <div className="side-column">
            {showSimulator ? (
              <SimulatorPanel hazard={hazard} onClose={() => setShowSimulator(false)} />
            ) : (
              <RiskPanel
                asset={selectedAsset}
                risk={selectedRisk}
                hazard={hazard}
                severity={committedSeverities[hazard.toLowerCase()]}
                riskStatus={riskStatus}
                mlRecord={selectedAnomaly}
                mlStatus={anomalyState.status}
                mlError={anomalyState.error}
                onSimulate={() => setShowSimulator(true)}
              />
            )}
          </div>
        </section>

        <footer className="page-footer"><span>RESILMAP <b>·</b> MUMBAI URBAN RESILIENCE</span><span>Backend assets, live risk + precomputed ML <i /> Historical results</span></footer>
      </div>
    </main>
  );
}
