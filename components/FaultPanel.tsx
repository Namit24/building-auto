"use client";

import type { SimulationState } from "@/lib/types";

interface FaultPanelProps {
  state: SimulationState | null;
  onFaultToggle: (patch: Partial<SimulationState["faults"]>) => void;
}

export function FaultPanel({ state, onFaultToggle }: FaultPanelProps) {
  const faults = state?.faults;

  return (
    <section className="panel faults-panel">
      <h2 className="panel-header">Fault Injector</h2>

      <label className="toggle-container">
        <span className="toggle-label">Drift: Temp Sensor</span>
        <input
          type="checkbox"
          className="toggle-input"
          checked={faults?.tempSensorDrift ?? false}
          onChange={(event) => onFaultToggle({ tempSensorDrift: event.target.checked })}
        />
        <div className="toggle-switch" />
      </label>

      <label className="toggle-container">
        <span className="toggle-label">Stuck: Out Damper</span>
        <input
          type="checkbox"
          className="toggle-input"
          checked={faults?.damperStuck ?? false}
          onChange={(event) => onFaultToggle({ damperStuck: event.target.checked })}
        />
        <div className="toggle-switch" />
      </label>

      <label className="toggle-container">
        <span className="toggle-label">Fail: Cooling Coil</span>
        <input
          type="checkbox"
          className="toggle-input"
          checked={faults?.coolingCoilFailure ?? false}
          onChange={(event) => onFaultToggle({ coolingCoilFailure: event.target.checked })}
        />
        <div className="toggle-switch" />
      </label>

      <label className="toggle-container">
        <span className="toggle-label">Clog: Pre-Filter</span>
        <input
          type="checkbox"
          className="toggle-input"
          checked={faults?.filterClog ?? false}
          onChange={(event) => onFaultToggle({ filterClog: event.target.checked })}
        />
        <div className="toggle-switch" />
      </label>

      <div className="fault-log">
        {(faults?.log ?? []).slice(-10).map((entry, index) => {
          const className = entry.includes("ALERT") ? "error" : entry.includes("WRN") ? "warn" : "";
          return (
            <p key={`${entry}-${index}`} className={className}>
              {entry}
            </p>
          );
        })}
      </div>
    </section>
  );
}