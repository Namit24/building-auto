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
let mockTimer: ReturnType<typeof setInterval> | null = null;
let mockSeconds = 0;

const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const createInitialMockState = (): SimulationState => ({
  simTime: "T+ 00:00:00",
  status: "NORMAL",
  weather: {
    outdoorTemp: 24.5,
    outdoorHumidity: 60,
    outdoorCO2: 410,
    solarEnabled: true,
    solarLoadKw: 16
  },
  indoor: {
    temperature: 22.1,
    humidity: 45,
    co2: 420,
    dewPoint: 9.5,
    occupants: 24,
    comfortIndex: "OPTIMAL"
  },
  ahu: {
    mode: "cool",
    oadPositionPct: 20,
    returnAirPct: 80,
    mixedAirTemp: 22.4,
    coolingValvePct: 65,
    heatingValvePct: 0,
    supplyFanPct: 80,
    fanPowerKw: 15.36,
    airflowM3s: 6.4
  },
  energy: {
    fanPowerKw: 15.36,
    coolingLoadKw: 42.25,
    heatingLoadKw: 0,
    lightingLoadKw: 10,
    totalKw: 67.61,
    dailyKwh: 0,
    demandResponse: false
  },
  faults: {
    tempSensorDrift: false,
    damperStuck: false,
    coolingCoilFailure: false,
    filterClog: false,
    activeAlerts: [],
    log: [
      "> SYS_INIT: OK",
      "> POLLING FIELD DEVICES...",
      "> AHU-01: ONLINE",
      "> CHILLER-1: ONLINE",
      "> WRN: VAV-14 COMM DELAY",
      "> SYNC COMPLETED.",
      "> WAITING FOR INJECTION..."
    ]
  },
  security: {
    twoManRule: true,
    elevatorRestrictedFloors: [7, 8, 9],
    latestAccessLogs: [
      { timestamp: "14:28:11", uid: "UID_8472", zone: "MAIN_ENTRANCE", granted: true, reason: "GRANTED", role: "EMPLOYEE" },
      { timestamp: "14:15:02", uid: "UID_1193", zone: "SERVER_ROOM", granted: false, reason: "DENIED_ZONE_RESTRICTION", role: "VISITOR" },
      { timestamp: "13:59:44", uid: "UID_8472", zone: "OFFICE_FLOOR", granted: true, reason: "GRANTED", role: "EMPLOYEE" }
    ]
  },
  history: {
    temperature: [],
    co2: [],
    energy: []
  }
});

const toClock = (seconds: number): string => {
  const hh = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const mm = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

const pushHistory = (array: { t: string; v: number }[], point: { t: string; v: number }) => {
  array.push(point);
  if (array.length > 180) {
    array.shift();
  }
};

const stepMockState = (state: SimulationState): SimulationState => {
  mockSeconds += 1;
  const t = toClock(mockSeconds);

  const temperatureWave = Math.sin(mockSeconds / 40) * 0.08;
  const co2Wave = Math.sin(mockSeconds / 28) * 4;
  const energyWave = Math.sin(mockSeconds / 18) * 1.2;

  const drift = state.faults.tempSensorDrift ? 0.4 : 0;
  const coolingPenalty = state.faults.coolingCoilFailure ? 0.08 : 0;

  const temperature = state.indoor.temperature + temperatureWave + drift + coolingPenalty;
  const humidity = Math.max(25, Math.min(75, state.indoor.humidity + Math.sin(mockSeconds / 60) * 0.2));
  const co2 = Math.max(380, state.indoor.co2 + co2Wave + state.ahu.oadPositionPct * -0.03);
  const dewPoint = temperature - ((100 - humidity) / 5);

  const fanPowerKw = Math.max(2, 30 * Math.pow(state.ahu.supplyFanPct / 100, 3) * (state.faults.filterClog ? 1.35 : 1));
  const coolingLoadKw = state.faults.coolingCoilFailure ? 0 : (state.ahu.coolingValvePct / 100) * 65 * (state.energy.demandResponse ? 0.85 : 1);
  const heatingLoadKw = (state.ahu.heatingValvePct / 100) * 45;
  const lightingLoadKw = 10;
  const totalKw = fanPowerKw + coolingLoadKw + heatingLoadKw + lightingLoadKw + energyWave;
  const dailyKwh = state.energy.dailyKwh + totalKw / 3600;

  const next: SimulationState = {
    ...state,
    simTime: `T+ ${t}`,
    indoor: {
      ...state.indoor,
      temperature: Number(temperature.toFixed(2)),
      humidity: Number(humidity.toFixed(1)),
      co2: Number(co2.toFixed(0)),
      dewPoint: Number(dewPoint.toFixed(1)),
      comfortIndex: co2 > 1000 || temperature > 25.5 || temperature < 20 ? "MODERATE" : "OPTIMAL"
    },
    ahu: {
      ...state.ahu,
      returnAirPct: Number((100 - state.ahu.oadPositionPct).toFixed(0)),
      mixedAirTemp: Number(((state.ahu.oadPositionPct / 100) * state.weather.outdoorTemp + ((100 - state.ahu.oadPositionPct) / 100) * temperature).toFixed(2)),
      fanPowerKw: Number(fanPowerKw.toFixed(2)),
      airflowM3s: Number(((state.ahu.supplyFanPct / 100) * 8).toFixed(2))
    },
    energy: {
      ...state.energy,
      fanPowerKw: Number(fanPowerKw.toFixed(2)),
      coolingLoadKw: Number(coolingLoadKw.toFixed(2)),
      heatingLoadKw: Number(heatingLoadKw.toFixed(2)),
      lightingLoadKw,
      totalKw: Number(totalKw.toFixed(2)),
      dailyKwh: Number(dailyKwh.toFixed(3))
    },
    history: {
      temperature: [...state.history.temperature],
      co2: [...state.history.co2],
      energy: [...state.history.energy]
    }
  };

  pushHistory(next.history.temperature, { t, v: next.indoor.temperature });
  pushHistory(next.history.co2, { t, v: next.indoor.co2 });
  pushHistory(next.history.energy, { t, v: next.energy.totalKw });

  const activeAlerts: string[] = [];
  if (next.faults.tempSensorDrift) {
    activeAlerts.push("TEMP SENSOR DRIFT ACTIVE");
  }
  if (next.faults.damperStuck) {
    activeAlerts.push("OUTDOOR DAMPER STUCK");
  }
  if (next.faults.coolingCoilFailure) {
    activeAlerts.push("COOLING COIL FAILURE");
  }
  if (next.faults.filterClog) {
    activeAlerts.push("FILTER CLOG INCREASED STATIC");
  }

  next.faults.activeAlerts = activeAlerts;
  next.status = activeAlerts.length === 0 ? "NORMAL" : "WARNING";

  return next;
};

const wsUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SIM_SERVER;
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.hostname}:3001/ws`;
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
  state: createInitialMockState(),
  connected: false,
  connect: () => {
    if (useMock) {
      if (!mockTimer) {
        mockTimer = setInterval(() => {
          const current = get().state ?? createInitialMockState();
          set({ state: stepMockState(current), connected: true });
        }, 1000);
      }
      set({ connected: true });
      return;
    }

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    socket = new WebSocket(wsUrl());

    socket.onopen = () => {
      set({ connected: true });
    };

    socket.onclose = () => {
      set({ connected: false });
      if (!useMock) {
        set({ connected: false });
      }
    };

    socket.onerror = () => {
      set({ connected: false });
      if (socket) {
        socket.close();
        socket = null;
      }
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
    if (mockTimer) {
      clearInterval(mockTimer);
      mockTimer = null;
    }
    if (socket) {
      socket.close();
      socket = null;
    }
    set({ connected: false });
  },
  sendControlUpdate: (patch) => {
    if (useMock) {
      const state = get().state;
      if (!state) {
        return;
      }
      const next: SimulationState = {
        ...state,
        weather: { ...state.weather, ...(patch.weather ?? {}) },
        ahu: { ...state.ahu, ...(patch.ahu ?? {}) },
        energy: { ...state.energy, ...(patch.energy ?? {}) }
      };
      set({ state: next });
      return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({ type: "control_update", payload: patch }));
  },
  sendFaultToggle: (patch) => {
    if (useMock) {
      const state = get().state;
      if (!state) {
        return;
      }

      const next: SimulationState = {
        ...state,
        faults: {
          ...state.faults,
          ...patch,
          log: [
            ...state.faults.log,
            `[${toClock(mockSeconds)}] > FAULT_UPDATE: ${JSON.stringify(patch)}`
          ].slice(-80)
        }
      };
      set({ state: next });
      return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({ type: "fault_toggle", payload: patch }));
  },
  triggerRFIDScan: async (uid, zone, secondUid) => {
    if (useMock) {
      const state = get().state;
      if (!state) {
        return;
      }

      const granted = zone === "MAIN_ENTRANCE" || uid === "UID_9000" || (zone === "MECH_PLANT" && !!secondUid);
      const role = uid === "UID_9000" ? "ADMIN" : uid === "UID_5001" ? "ENGINEER" : uid === "UID_8472" ? "EMPLOYEE" : "VISITOR";
      const newLog = {
        timestamp: toClock(mockSeconds),
        uid,
        zone,
        granted,
        reason: granted ? "GRANTED" : "DENIED_ZONE_RESTRICTION",
        role
      };

      set({
        state: {
          ...state,
          security: {
            ...state.security,
            latestAccessLogs: [newLog, ...state.security.latestAccessLogs].slice(0, 60)
          }
        }
      });
      return;
    }

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