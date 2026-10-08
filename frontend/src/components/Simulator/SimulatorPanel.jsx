export function SimulatorPanel({ hazard, onClose }) {
  return <section className="panel simulator-panel">
    <div className="panel-heading"><div><div className="panel-title"><span className="title-icon">◎</span><h2>What-if simulation</h2></div><p>Scenario input preview</p></div><button type="button" className="icon-button close-button" onClick={onClose} aria-label="Close simulation panel">×</button></div>
    <div className="simulator-intro"><span className="simulator-icon">⌁</span><div><b>Substation failure scenario</b><p>The project simulation evaluates dependent hospitals for a selected failed substation and hazard.</p></div></div>
    <div className="simulator-field"><span>HAZARD TYPE</span><b>{hazard}</b></div><div className="simulator-field"><span>SCENARIO INPUT</span><b>Failed substation name</b><small>Example in project scenario: 220kV BORIVALI</small></div>
    <div className="simulator-output"><span className="output-icon">i</span><span>Scenario execution is not connected in this dashboard preview. The repository currently generates cascade results from a local script.</span></div>
    <button type="button" className="simulate-button secondary-button" onClick={onClose}>Back to asset profile <i>↗</i></button><p className="panel-disclaimer">This panel previews existing simulation inputs; no simulation is run here.</p>
  </section>;
}
