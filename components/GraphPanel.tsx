"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SimulationState } from "@/lib/types";

interface GraphPanelProps {
  state: SimulationState | null;
}

export function GraphPanel({ state }: GraphPanelProps) {
  const temperature = state?.history.temperature ?? [];
  const co2 = state?.history.co2 ?? [];
  const energy = state?.history.energy ?? [];

  const maxLen = Math.max(temperature.length, co2.length, energy.length);
  const chartData = Array.from({ length: maxLen }).map((_, index) => ({
    t: temperature[index]?.t ?? co2[index]?.t ?? energy[index]?.t ?? "00:00:00",
    temperature: temperature[index]?.v,
    co2: co2[index]?.v,
    energy: energy[index]?.v
  }));

  return (
    <>
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-dot temp" /> TEMP
        </span>
        <span className="legend-item">
          <span className="legend-dot co2" /> CO2
        </span>
        <span className="legend-item">
          <span className="legend-dot energy" /> ENERGY
        </span>
      </div>

      <div className="graph-placeholder">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 14, left: 0, bottom: 8 }}>
              <XAxis hide dataKey="t" />
              <YAxis hide yAxisId="left" domain={[15, 35]} />
              <YAxis hide yAxisId="right" orientation="right" domain={[0, "dataMax + 100"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--white)",
                  border: "var(--border-medium)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "bold"
                }}
                formatter={(value: number | string, key: string) => {
                  if (key === "temperature") {
                    return [`${Number(value).toFixed(2)} °C`, "TEMP"];
                  }
                  if (key === "co2") {
                    return [`${Number(value).toFixed(0)} ppm`, "CO2"];
                  }
                  return [`${Number(value).toFixed(2)} kW`, "ENERGY"];
                }}
                labelFormatter={(label: string) => `T+ ${label}`}
              />
              <Line type="monotone" yAxisId="left" dataKey="temperature" stroke="var(--accent-pink)" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line type="monotone" yAxisId="right" dataKey="co2" stroke="var(--accent-purple)" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line type="monotone" yAxisId="right" dataKey="energy" stroke="var(--accent-orange)" strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="graph-line" />
        )}
      </div>
    </>
  );
}