import { useMemo, useState } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard.jsx';
import { HazardSelector } from './components/HazardSelector/HazardSelector.jsx';
import { MapPanel } from './components/Map/MapPanel.jsx';
import { RiskPanel } from './components/RiskPanel/RiskPanel.jsx';
import { SimulatorPanel } from './components/Simulator/SimulatorPanel.jsx';
import { assets, forHazard } from './utils/mockData.js';
import './styles.css';

export default function App() {
  const [hazard, setHazard] = useState('Flood');
  const [selectedId, setSelectedId] = useState('SUB_1');
  const [showSimulator, setShowSimulator] = useState(false);
  const selectedAsset = assets.find((asset) => asset.Asset_ID === selectedId) ?? assets[0];

  const filteredAssets = useMemo(
    () => assets.map((asset) => forHazard(asset, hazard)),
    [hazard],
  );

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
          <span className="live-indicator"><i /> Mock environment</span>
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

        <section className="hazard-row" aria-label="Hazard selection">
          <div className="section-kicker">ACTIVE HAZARD</div>
          <HazardSelector value={hazard} onChange={selectHazard} />
          <div className="hazard-note"><span className="sparkle">✦</span> Select a hazard to explore its risk profile</div>
          <span className="mock-tag">DEMO DATA</span>
        </section>

        <Dashboard hazard={hazard} items={filteredAssets} />

        <section className="workspace-grid">
          <MapPanel
            assets={filteredAssets}
            selectedId={selectedId}
            onSelect={setSelectedId}
            hazard={hazard}
          />
          <div className="side-column">
            {showSimulator ? (
              <SimulatorPanel hazard={hazard} onClose={() => setShowSimulator(false)} />
            ) : (
              <RiskPanel asset={selectedAsset} hazard={hazard} onSimulate={() => setShowSimulator(true)} />
            )}
          </div>
        </section>

        <footer className="page-footer"><span>RESILMAP <b>·</b> MUMBAI URBAN RESILIENCE</span><span>Stage 1 dashboard <i /> Mock data only</span></footer>
      </div>
    </main>
  );
}
