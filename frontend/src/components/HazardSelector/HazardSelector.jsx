import { hazards, hazardKeyByName } from '../../utils/hazards.js';

const symbols = { Heat: '☼', Flood: '≈', Geomagnetic: '⌁' };

export function HazardSelector({ value, onChange, severities, onSeverityChange, onCommit }) {
  return (
    <div className="hazard-control-group">
      <div className="hazard-tabs" role="tablist" aria-label="Selected hazard">
        {hazards.map((hazard) => (
          <button className={`hazard-tab hazard-${hazard.toLowerCase()} ${value === hazard ? 'is-active' : ''}`} key={hazard} onClick={() => onChange(hazard)} role="tab" aria-selected={value === hazard}>
            <span className="hazard-symbol">{symbols[hazard]}</span>{hazard}{value === hazard && <span className="tab-active-dot" />}
          </button>
        ))}
      </div>
      <div className="severity-controls" aria-label="Hazard severity inputs">
        {hazards.map((hazard) => {
          const key = hazardKeyByName[hazard];
          const commitValue = (event) => onCommit({ ...severities, [key]: Number(event.currentTarget.value) });
          return (
            <label className={`severity-control severity-${key}`} key={key}>
              <span>{hazard}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={severities[key]}
                aria-label={`${hazard} severity`}
                aria-valuetext={`${severities[key]} out of 100`}
                onChange={(event) => onSeverityChange({ ...severities, [key]: Number(event.currentTarget.value) })}
                onPointerUp={commitValue}
                onKeyUp={commitValue}
              />
              <output>{severities[key]}</output>
            </label>
          );
        })}
      </div>
    </div>
  );
}
