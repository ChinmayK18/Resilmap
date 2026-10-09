import { useEffect, useRef, useState } from 'react';
import { getCascadeSubstations, postCascadeRun } from '../../services/api.js';
import { hazards } from '../../utils/hazards.js';

// These are known-valid dates from verified project data, not necessarily the complete history.
const eventDatesByHazard = {
  Heat: ['2015-03', '2016-03', '2017-03', '2017-04', '2018-03', '2018-04', '2019-03', '2019-04', '2020-04', '2021-03', '2022-04', '2023-04', '2024-04', '2025-04'],
  Flood: ['2026-09-07', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16'],
  Geomagnetic: ['2024-05-11'],
};
const defaultEventDateByHazard = {
  Heat: '2015-03',
  Flood: '2026-09-07',
  Geomagnetic: '2024-05-11',
};

function isEventDateValid(hazardType, eventDate) {
  return eventDatesByHazard[hazardType]?.includes(eventDate) ?? false;
}

function formatEventDateLabel(hazardType, eventDate) {
  if (hazardType !== 'Geomagnetic') return eventDate;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${eventDate}T00:00:00Z`));
}

function formatNumber(value, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function validateSubstationResponse(response) {
  if (!Array.isArray(response.substations)) {
    throw new Error('The cascade substations response did not contain a substations array.');
  }
  if (response.substations.some((item) => typeof item.name !== 'string')) {
    throw new Error('The cascade substations response contains an invalid substation entry.');
  }
  return response.substations;
}

function validateScenarioResponse(response) {
  if (!response.scenario || !response.summary || !Array.isArray(response.affected_hospitals)) {
    throw new Error('The cascade response is missing its documented scenario, summary, or affected_hospitals fields.');
  }
  return response;
}

export function SimulatorPanel({ hazard, onClose }) {
  const [hazardType, setHazardType] = useState(hazards.includes(hazard) ? hazard : 'Heat');
  const [eventDate, setEventDate] = useState(defaultEventDateByHazard[hazards.includes(hazard) ? hazard : 'Heat']);
  const [substations, setSubstations] = useState([]);
  const [selectedSubstation, setSelectedSubstation] = useState('');
  const [substationStatus, setSubstationStatus] = useState('loading');
  const [substationError, setSubstationError] = useState('');
  const [substationRetry, setSubstationRetry] = useState(0);
  const [result, setResult] = useState(null);
  const [runStatus, setRunStatus] = useState('idle');
  const [runError, setRunError] = useState('');
  const running = useRef(false);
  const runRequestId = useRef(0);
  const runController = useRef(null);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setSubstationStatus('loading');
    setSubstationError('');

    getCascadeSubstations({ signal: controller.signal })
      .then((response) => {
        if (!current) return;
        const available = validateSubstationResponse(response);
        setSubstations(available);
        setSelectedSubstation((selected) => (
          available.some((item) => item.name === selected) ? selected : ''
        ));
        setSubstationStatus('success');
      })
      .catch((error) => {
        if (!current || error.name === 'AbortError') return;
        setSubstations([]);
        setSelectedSubstation('');
        setSubstationStatus('error');
        setSubstationError(error.message || 'Unable to load available substations.');
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [substationRetry]);

  useEffect(() => () => {
    runRequestId.current += 1;
    runController.current?.abort();
  }, []);

  async function runSimulation() {
    if (running.current || !selectedSubstation || !hazards.includes(hazardType) || !isEventDateValid(hazardType, eventDate)) return;

    running.current = true;
    const requestId = ++runRequestId.current;
    const controller = new AbortController();
    runController.current = controller;
    setRunStatus('loading');
    setRunError('');
    setResult(null);

    try {
      const response = await postCascadeRun({
        failedSubstation: selectedSubstation,
        hazardType,
        eventDate,
        top: 50,
        signal: controller.signal,
      });
      if (requestId !== runRequestId.current) return;
      setResult(validateScenarioResponse(response));
      setRunStatus('success');
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== runRequestId.current) return;
      setRunError(error.message || 'Unable to run the cascade scenario.');
      setRunStatus('error');
    } finally {
      if (requestId === runRequestId.current) {
        running.current = false;
        runController.current = null;
      }
    }
  }

  function changeHazard(event) {
    const nextHazard = event.target.value;
    setHazardType(nextHazard);
    setEventDate(defaultEventDateByHazard[nextHazard]);
    setResult(null);
    setRunStatus('idle');
    setRunError('');
  }

  function changeEventDate(event) {
    setEventDate(event.target.value);
    setResult(null);
    setRunStatus('idle');
    setRunError('');
  }

  function changeSubstation(event) {
    setSelectedSubstation(event.target.value);
    setResult(null);
    setRunStatus('idle');
    setRunError('');
  }

  const summary = result?.summary;
  const actualScenario = result?.scenario;

  return <section className="panel simulator-panel">
    <div className="panel-heading"><div><div className="panel-title"><span className="title-icon">◎</span><h2>What-if simulation</h2></div><p>Backend substation-failure cascade</p></div><button type="button" className="icon-button close-button" onClick={onClose} aria-label="Close simulation panel">×</button></div>

    <div className="simulator-intro"><span className="simulator-icon">⌁</span><div><b>Run a cascade scenario</b><p>The backend evaluates hospitals linked to the failed substation using historical event-risk data.</p></div></div>

    <div className="cascade-inputs">
      <label className="cascade-field"><span>HAZARD TYPE</span><select value={hazardType} onChange={changeHazard} disabled={runStatus === 'loading'}>{hazards.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="cascade-field"><span>FAILED SUBSTATION</span><select value={selectedSubstation} onChange={changeSubstation} disabled={substationStatus !== 'success' || runStatus === 'loading'}><option value="">Select a backend substation</option>{substations.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.linked_hospitals} linked hospitals)</option>)}</select></label>
      <label className="cascade-field"><span>HISTORICAL EVENT DATE</span><select value={eventDate} onChange={changeEventDate} disabled={runStatus === 'loading'} required aria-describedby={hazardType === 'Geomagnetic' ? 'geomagnetic-date-help' : undefined}>{eventDatesByHazard[hazardType].map((date) => <option key={date} value={date}>{formatEventDateLabel(hazardType, date)}</option>)}</select>{hazardType === 'Geomagnetic' && <small id="geomagnetic-date-help">Only known-valid dates are listed; this is not necessarily the complete backend history.</small>}</label>
    </div>

    {substationStatus === 'loading' && <div className="simulator-state" role="status">Loading available substations…</div>}
    {substationStatus === 'error' && <div className="simulator-state simulator-error" role="alert"><span>{substationError}</span><button type="button" onClick={() => setSubstationRetry((retry) => retry + 1)}>Retry</button></div>}
    {substationStatus === 'success' && substations.length === 0 && <div className="simulator-state">The backend returned no linked substations.</div>}

    <p className="simulator-date-note">Results use historical, precomputed backend data. A date must match a record for the selected hazard; the backend does not substitute another date.</p>
    {runError && <div className="simulator-state simulator-error" role="alert"><span>Simulation failed: {runError} Check that historical data exists for the selected hazard and date, then retry.</span></div>}
    <button type="button" className="simulate-button" onClick={runSimulation} disabled={!selectedSubstation || !isEventDateValid(hazardType, eventDate) || substationStatus !== 'success' || runStatus === 'loading'} aria-busy={runStatus === 'loading'}><span>◎</span>{runStatus === 'loading' ? 'Running simulation…' : 'Run simulation'}<i>↗</i></button>

    {result && <section className="cascade-results" aria-label="Cascade simulation results">
      <div className="cascade-result-title"><div><small>BACKEND SCENARIO RESULT</small><b>{actualScenario.failed_substation}</b><span>{actualScenario.hazard_type}{actualScenario.event_date ? ` · ${actualScenario.event_date}` : ''}</span></div><span className={`risk-badge badge-${String(summary.level).toLowerCase()}`}><i />{summary.level}</span></div>
      <div className="cascade-summary-grid"><div><small>CASCADE SEVERITY</small><b>{formatNumber(summary.cascade_severity)}<span>/100</span></b></div><div><small>HOSPITALS AFFECTED</small><b>{summary.hospitals_affected}</b></div><div><small>TOTAL CASCADE IMPACT</small><b>{formatNumber(summary.total_cascade_impact)}</b></div><div><small>RETURNED ROWS</small><b>{result.affected_hospitals.length}</b></div></div>
      <div className="affected-heading"><b>Affected hospitals</b><span>Top returned by cascade impact</span></div>
      {result.affected_hospitals.length === 0 ? <div className="simulator-state">The backend returned no affected hospital records for this scenario.</div> : <div className="affected-list">{result.affected_hospitals.map((hospital, index) => <article className="affected-hospital" key={`${hospital.Asset_ID ?? hospital.Hospital_Name}-${index}`}>
        <div className="affected-hospital-top"><div><b>{hospital.Hospital_Name}</b><span>{hospital.Asset_ID}</span></div>{hospital.AI_Risk_Level && <span className={`risk-badge badge-${String(hospital.AI_Risk_Level).toLowerCase()}`}><i />{hospital.AI_Risk_Level}</span>}</div>
        <div className="affected-hospital-stats"><span>Distance <b>{formatNumber(hospital.Distance_km, 3)} km</b></span><span>Dependency <b>{formatNumber(hospital.Dependency_Strength, 2)}</b></span><span>AI event risk <b>{formatNumber(hospital.AI_Event_Risk)}</b></span><span>Cascade impact <b>{formatNumber(hospital.Cascade_Impact)}</b></span></div>
      </article>)}</div>}
    </section>}

    <div className="simulator-output"><span className="output-icon">i</span><span>These are results of the backend historical-event cascade simulation, not a live disaster prediction. Hazard sliders do not change this simulation.</span></div>
    <button type="button" className="simulate-button secondary-button" onClick={onClose}><span>‹</span> Back to asset profile <i>↗</i></button>
  </section>;
}
