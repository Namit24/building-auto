"use client";

import type { SimulationState } from "@/lib/types";
import { GraphPanel } from "@/components/GraphPanel";

interface EnergyPanelProps {
  state: SimulationState | null;
  onControlUpdate: (patch: { energy: { demandResponse: boolean } }) => void;
}

export function EnergyPanel({ state, onControlUpdate }: EnergyPanelProps) {
  const energy = state?.energy;

  return (
    <section className="panel energy-panel">
      <h2 className="panel-header">Energy Grid</h2>

      <div className="power-usage">
        <div className="data-label" style={{ borderBottomColor: "#333" }}>
          Total Active Power
        </div>
        <div className="data-value">
          {energy?.totalKw.toFixed(1) ?? "145.2"} <span className="data-unit" style={{ fontSize: "1.5rem" }}>kW</span>
        </div>
      </div>

      <GraphPanel state={state} />

      <label className="toggle-container">
        <span className="toggle-label">Demand Response</span>
        <input
          type="checkbox"
          className="toggle-input"
          checked={energy?.demandResponse ?? false}
          onChange={(event) => onControlUpdate({ energy: { demandResponse: event.target.checked } })}
        />
        <div className="toggle-switch" />
      </label>
    </section>
  );
}