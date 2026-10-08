import { hazards } from '../../utils/mockData.js';

const symbols = { Heat: '☼', Flood: '≈', Geomagnetic: '⌁' };

export function HazardSelector({ value, onChange }) {
  return (
    <div className="hazard-tabs" role="tablist" aria-label="Hazard type">
      {hazards.map((hazard) => (
        <button className={`hazard-tab hazard-${hazard.toLowerCase()} ${value === hazard ? 'is-active' : ''}`} key={hazard} onClick={() => onChange(hazard)} role="tab" aria-selected={value === hazard}>
          <span className="hazard-symbol">{symbols[hazard]}</span>{hazard}{value === hazard && <span className="tab-active-dot" />}
        </button>
      ))}
    </div>
  );
}
