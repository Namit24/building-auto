import type { SimulationState } from "@/lib/types";

interface HeaderProps {
  state: SimulationState | null;
  connected: boolean;
}

export function Header({ state, connected }: HeaderProps) {
  const statusText = connected ? `SYS: ${state?.status ?? "NORMAL"}` : "SYS: DISCONNECTED";
  const statusColor = !connected
    ? "var(--status-fault)"
    : state?.status === "FAULT"
      ? "var(--status-fault)"
      : state?.status === "WARNING"
        ? "var(--status-warning)"
        : "var(--status-normal)";

  return (
    <header className="panel main-header">
      <h1 className="header-title">SYS_CTRL // Digital Twin</h1>
      <div className="header-meta">
        <div className="status-badge" style={{ backgroundColor: statusColor }}>
          {statusText}
        </div>
        <div className="time-display">{state?.simTime ?? "T+ 00:00:00"}</div>
      </div>
    </header>
  );
}