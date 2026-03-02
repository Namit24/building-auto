"use client";

import type { SimulationState } from "@/lib/types";

interface AHUPanelProps {
  state: SimulationState | null;
  onControlUpdate: (patch: { ahu: Partial<SimulationState["ahu"]> }) => void;
}

export function AHUPanel({ state, onControlUpdate }: AHUPanelProps) {
  const ahu = state?.ahu;

  const update = (key: "oadPositionPct" | "coolingValvePct" | "heatingValvePct" | "supplyFanPct", value: number) => {
    onControlUpdate({ ahu: { [key]: value } });
  };

  return (
    <section className="panel ahu-panel">
      <h2 className="panel-header">AHU-01 Override</h2>

      <div className="control-group">
        <div className="control-label">
          <span>OAD Position</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{ahu?.oadPositionPct.toFixed(0) ?? "20"}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={ahu?.oadPositionPct ?? 20}
          onChange={(event) => update("oadPositionPct", Number(event.target.value))}
        />
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>CHW Valve</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{ahu?.coolingValvePct.toFixed(0) ?? "65"}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={ahu?.coolingValvePct ?? 65}
          onChange={(event) => update("coolingValvePct", Number(event.target.value))}
        />
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>HW Valve</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{ahu?.heatingValvePct.toFixed(0) ?? "0"}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={ahu?.heatingValvePct ?? 0}
          onChange={(event) => update("heatingValvePct", Number(event.target.value))}
        />
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>SF Speed</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{ahu?.supplyFanPct.toFixed(0) ?? "80"}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={ahu?.supplyFanPct ?? 80}
          onChange={(event) => update("supplyFanPct", Number(event.target.value))}
        />
      </div>

      <div className="radio-group mt-md">
        <input
          type="radio"
          name="mode"
          id="mode-cool"
          className="radio-input"
          checked={(ahu?.mode ?? "cool") === "cool"}
          onChange={() => onControlUpdate({ ahu: { mode: "cool" } })}
        />
        <label htmlFor="mode-cool" className="radio-label">
          Cool
        </label>

        <input
          type="radio"
          name="mode"
          id="mode-heat"
          className="radio-input"
          checked={ahu?.mode === "heat"}
          onChange={() => onControlUpdate({ ahu: { mode: "heat" } })}
        />
        <label htmlFor="mode-heat" className="radio-label">
          Heat
        </label>

        <input
          type="radio"
          name="mode"
          id="mode-auto"
          className="radio-input"
          checked={ahu?.mode === "auto"}
          onChange={() => onControlUpdate({ ahu: { mode: "auto" } })}
        />
        <label htmlFor="mode-auto" className="radio-label">
          Auto
        </label>
      </div>
    </section>
  );
}