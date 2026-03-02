"use client";

import type { SimulationState } from "@/lib/types";

interface SecurityPanelProps {
  state: SimulationState | null;
  onScan: (uid: string, zone: string, secondUid?: string) => Promise<void>;
}

const UID_CHOICES = ["UID_8472", "UID_1193", "UID_5001", "UID_9000"];
const ZONE_CHOICES = ["MAIN_ENTRANCE", "OFFICE_FLOOR", "MECH_PLANT", "SERVER_ROOM"];

export function SecurityPanel({ state, onScan }: SecurityPanelProps) {
  const security = state?.security;

  const randomScan = async () => {
    const uid = UID_CHOICES[Math.floor(Math.random() * UID_CHOICES.length)] ?? "UID_1193";
    const zone = ZONE_CHOICES[Math.floor(Math.random() * ZONE_CHOICES.length)] ?? "MAIN_ENTRANCE";
    const secondUid = zone === "MECH_PLANT" || zone === "SERVER_ROOM" ? "UID_9000" : undefined;
    await onScan(uid, zone, secondUid);
  };

  return (
    <section className="panel security-panel">
      <h2 className="panel-header">Access & SEC</h2>

      <button className="brutalist-btn" type="button" onClick={randomScan}>
        SIMULATE RFID SCAN
      </button>

      <div className="cctv-feed">
        <div className="rec-indicator">
          <div className="rec-dot" /> REC
        </div>
        <div className="cctv-crosshair" />
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            color: "var(--accent-lime)",
            fontFamily: "var(--font-mono)",
            fontWeight: "bold"
          }}
        >
          CAM_04 // MAIN_ENTRANCE
        </div>
      </div>

      <div className="control-group mt-md" style={{ marginBottom: 0 }}>
        <div className="data-label">Latest Access Log</div>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
          {(security?.latestAccessLogs ?? []).slice(0, 3).map((entry) => (
            <div key={`${entry.timestamp}-${entry.uid}-${entry.zone}`}>
              [{entry.timestamp}] {entry.uid} {entry.granted ? "GRANTED" : "DENIED"}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}