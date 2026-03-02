export type AHUMode = "cool" | "heat" | "auto";

export interface HistoryPoint {
  t: string;
  v: number;
}

export interface AccessLogEntry {
  timestamp: string;
  uid: string;
  zone: string;
  granted: boolean;
  reason: string;
  role: string;
}

export interface SimulationState {
  simTime: string;
  status: "NORMAL" | "WARNING" | "FAULT";
  weather: {
    outdoorTemp: number;
    outdoorHumidity: number;
    outdoorCO2: number;
    solarEnabled: boolean;
    solarLoadKw: number;
  };
  indoor: {
    temperature: number;
    humidity: number;
    co2: number;
    dewPoint: number;
    occupants: number;
    comfortIndex: string;
  };
  ahu: {
    mode: AHUMode;
    oadPositionPct: number;
    returnAirPct: number;
    mixedAirTemp: number;
    coolingValvePct: number;
    heatingValvePct: number;
    supplyFanPct: number;
    fanPowerKw: number;
    airflowM3s: number;
  };
  energy: {
    fanPowerKw: number;
    coolingLoadKw: number;
    heatingLoadKw: number;
    lightingLoadKw: number;
    totalKw: number;
    dailyKwh: number;
    demandResponse: boolean;
  };
  faults: {
    tempSensorDrift: boolean;
    damperStuck: boolean;
    coolingCoilFailure: boolean;
    filterClog: boolean;
    activeAlerts: string[];
    log: string[];
  };
  security: {
    twoManRule: boolean;
    elevatorRestrictedFloors: number[];
    latestAccessLogs: AccessLogEntry[];
  };
  history: {
    temperature: HistoryPoint[];
    co2: HistoryPoint[];
    energy: HistoryPoint[];
  };
}

export interface ControlPatch {
  weather?: Partial<SimulationState["weather"]>;
  ahu?: Partial<Pick<SimulationState["ahu"], "mode" | "oadPositionPct" | "coolingValvePct" | "heatingValvePct" | "supplyFanPct">>;
  energy?: Partial<Pick<SimulationState["energy"], "demandResponse">>;
}

export interface FaultPatch {
  tempSensorDrift?: boolean;
  damperStuck?: boolean;
  coolingCoilFailure?: boolean;
  filterClog?: boolean;
}

export type IncomingWSMessage =
  | { type: "control_update"; payload: ControlPatch }
  | { type: "fault_toggle"; payload: FaultPatch }
  | { type: "rfid_scan"; payload: { uid: string; zone: string; secondUid?: string } };

export type OutgoingWSMessage =
  | { type: "state"; payload: SimulationState }
  | { type: "ack"; payload: { message: string } }
  | { type: "error"; payload: { message: string } };