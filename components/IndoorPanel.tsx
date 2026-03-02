import type { SimulationState } from "@/lib/types";

interface IndoorPanelProps {
  state: SimulationState | null;
}

export function IndoorPanel({ state }: IndoorPanelProps) {
  const indoor = state?.indoor;

  return (
    <section className="panel indoor-panel">
      <h2 className="panel-header">Zone Comfort</h2>

      <div className="data-grid">
        <div className="data-box yellow">
          <div className="data-label">Temperature</div>
          <div className="data-value">
            {indoor?.temperature.toFixed(1) ?? "22.1"}
            <span className="data-unit">°C</span>
          </div>
        </div>
        <div className="data-box cyan">
          <div className="data-label">Relative Hum.</div>
          <div className="data-value">
            {indoor?.humidity.toFixed(0) ?? "45"}
            <span className="data-unit">%</span>
          </div>
        </div>
        <div className="data-box lime">
          <div className="data-label">CO2 Level</div>
          <div className="data-value">
            {indoor?.co2.toFixed(0) ?? "420"}
            <span className="data-unit">ppm</span>
          </div>
        </div>
        <div className="data-box pink">
          <div className="data-label">Dew Point</div>
          <div className="data-value">
            {indoor?.dewPoint.toFixed(1) ?? "9.5"}
            <span className="data-unit">°C</span>
          </div>
        </div>
      </div>

      <div className="comfort-status">INDEX: {indoor?.comfortIndex ?? "OPTIMAL"}</div>
    </section>
  );
}