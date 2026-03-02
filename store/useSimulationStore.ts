"use client";

import { create } from "zustand";
import type { ControlPatch, FaultPatch, OutgoingWSMessage, SimulationState } from "@/lib/types";

interface SimulationStore {
  state: SimulationState | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendControlUpdate: (patch: ControlPatch) => void;
  sendFaultToggle: (patch: FaultPatch) => void;
  triggerRFIDScan: (uid: string, zone: string, secondUid?: string) => Promise<void>;
}

let socket: WebSocket | null = null;

const wsUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SIM_SERVER;
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    return `ws://${window.location.hostname}:3001/ws`;
  }
  return "ws://localhost:3001/ws";
};

const httpUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SIM_HTTP;
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:3001`;
  }
  return "http://localhost:3001";
};

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  state: null,
  connected: false,
  connect: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    socket = new WebSocket(wsUrl());

    socket.onopen = () => {
      set({ connected: true });
    };

    socket.onclose = () => {
      set({ connected: false });
    };

    socket.onerror = () => {
      set({ connected: false });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as OutgoingWSMessage;
        if (message.type === "state") {
          set({ state: message.payload });
        }
      } catch {
        set({ connected: false });
      }
    };
  },
  disconnect: () => {
    if (socket) {
      socket.close();
      socket = null;
    }
    set({ connected: false });
  },
  sendControlUpdate: (patch) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({ type: "control_update", payload: patch }));
  },
  sendFaultToggle: (patch) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({ type: "fault_toggle", payload: patch }));
  },
  triggerRFIDScan: async (uid, zone, secondUid) => {
    await fetch(`${httpUrl()}/api/rfid-scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ uid, zone, secondUid })
    });

    const latest = get().state;
    if (latest) {
      get().sendControlUpdate({});
    }
  }
}));