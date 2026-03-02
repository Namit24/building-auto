"use client";

import { useEffect } from "react";
import { AHUPanel } from "@/components/AHUPanel";
import { EnergyPanel } from "@/components/EnergyPanel";
import { FaultPanel } from "@/components/FaultPanel";
import { Header } from "@/components/Header";
import { IndoorPanel } from "@/components/IndoorPanel";
import { SecurityPanel } from "@/components/SecurityPanel";
import { WeatherPanel } from "@/components/WeatherPanel";
import type { ControlPatch, FaultPatch } from "@/lib/types";
import { useSimulationStore } from "@/store/useSimulationStore";

export default function Page() {
  const state = useSimulationStore((store) => store.state);
  const connected = useSimulationStore((store) => store.connected);
  const connect = useSimulationStore((store) => store.connect);
  const disconnect = useSimulationStore((store) => store.disconnect);
  const sendControlUpdate = useSimulationStore((store) => store.sendControlUpdate);
  const sendFaultToggle = useSimulationStore((store) => store.sendFaultToggle);
  const triggerRFIDScan = useSimulationStore((store) => store.triggerRFIDScan);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <div className="dashboard-container">
      <Header state={state} connected={connected} />

      <main className="grid-layout">
        <WeatherPanel state={state} onControlUpdate={(patch) => sendControlUpdate(patch as ControlPatch)} />
        <IndoorPanel state={state} />
        <AHUPanel state={state} onControlUpdate={(patch) => sendControlUpdate(patch as ControlPatch)} />
        <EnergyPanel state={state} onControlUpdate={(patch) => sendControlUpdate(patch as ControlPatch)} />
        <FaultPanel state={state} onFaultToggle={(patch) => sendFaultToggle(patch as FaultPatch)} />
        <SecurityPanel state={state} onScan={triggerRFIDScan} />
      </main>
    </div>
  );
}