"use client";

import { useState } from "react";
import type { SimulationState } from "@/lib/types";

interface WeatherPanelProps {
  state: SimulationState | null;
  onControlUpdate: (patch: { weather: Partial<SimulationState["weather"]> }) => void;
}

export function WeatherPanel({ state, onControlUpdate }: WeatherPanelProps) {
  const weather = state?.weather;
  const [outdoorTemp, setOutdoorTemp] = useState<number>(weather?.outdoorTemp ?? 24.5);
  const [outdoorHumidity, setOutdoorHumidity] = useState<number>(weather?.outdoorHumidity ?? 60);
  const [solarEnabled, setSolarEnabled] = useState<boolean>(weather?.solarEnabled ?? true);

  const apply = () => {
    onControlUpdate({
      weather: {
        outdoorTemp,
        outdoorHumidity,
        solarEnabled
      }
    });
  };

  return (
    <section className="panel weather-panel">
      <h2 className="panel-header">Weather Ctrl</h2>

      <div className="control-group">
        <div className="control-label">
          <span>Ext_Temp</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{outdoorTemp.toFixed(1)}°C</span>
        </div>
        <input
          type="range"
          min={-10}
          max={50}
          value={outdoorTemp}
          onChange={(event) => setOutdoorTemp(Number(event.target.value))}
        />
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>Ext_Humidity</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{outdoorHumidity.toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={outdoorHumidity}
          onChange={(event) => setOutdoorHumidity(Number(event.target.value))}
        />
      </div>

      <label className="toggle-container">
        <span className="toggle-label">Solar Radiation</span>
        <input
          type="checkbox"
          className="toggle-input"
          checked={solarEnabled}
          onChange={(event) => setSolarEnabled(event.target.checked)}
        />
        <div className="toggle-switch" />
      </label>

      <button className="brutalist-btn mt-md" onClick={apply} type="button">
        Apply Weather Data
      </button>
    </section>
  );
}