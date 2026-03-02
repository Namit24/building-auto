import type { FaultPatch } from "../types";

export interface FaultEvaluationInputs {
  coolingValvePct: number;
  temperatureTrend: number;
}

export interface FaultEvaluationResult {
  status: "NORMAL" | "WARNING" | "FAULT";
  activeAlerts: string[];
  log: string[];
}

export class FaultEngine {
  private toggles: Required<FaultPatch> = {
    tempSensorDrift: false,
    damperStuck: false,
    coolingCoilFailure: false,
    filterClog: false
  };

  private log: string[] = [
    "> SYS_INIT: OK",
    "> POLLING FIELD DEVICES...",
    "> AHU-01: ONLINE",
    "> CHILLER-1: ONLINE",
    "> WRN: VAV-14 COMM DELAY",
    "> SYNC COMPLETED.",
    "> WAITING FOR INJECTION..."
  ];

  setToggles(patch: FaultPatch): void {
    const keys = Object.keys(patch) as (keyof FaultPatch)[];
    for (const key of keys) {
      const value = patch[key];
      if (typeof value === "boolean") {
        this.toggles[key] = value;
        this.appendLog(`> FAULT_${String(key).toUpperCase()}: ${value ? "ENABLED" : "DISABLED"}`);
      }
    }
  }

  getToggles(): Required<FaultPatch> {
    return { ...this.toggles };
  }

  evaluate(inputs: FaultEvaluationInputs): FaultEvaluationResult {
    const activeAlerts: string[] = [];

    if (this.toggles.tempSensorDrift) {
      activeAlerts.push("TEMP SENSOR DRIFT ACTIVE");
    }
    if (this.toggles.damperStuck) {
      activeAlerts.push("OUTDOOR DAMPER STUCK");
    }
    if (this.toggles.coolingCoilFailure) {
      activeAlerts.push("COOLING COIL FAILURE");
    }
    if (this.toggles.filterClog) {
      activeAlerts.push("FILTER CLOG INCREASED STATIC");
    }

    if (inputs.coolingValvePct >= 99 && inputs.temperatureTrend > 0.01) {
      activeAlerts.push("AUTO-DETECT: COOLING FAULT (VALVE 100%, TEMP RISING)");
    }

    if (activeAlerts.length > 0) {
      this.appendLog(`> ALERT: ${activeAlerts[0]}`);
    }

    const status = activeAlerts.length === 0 ? "NORMAL" : activeAlerts.some((alert) => alert.includes("AUTO-DETECT")) ? "FAULT" : "WARNING";

    return {
      status,
      activeAlerts,
      log: [...this.log]
    };
  }

  private appendLog(entry: string): void {
    const timestamp = new Date().toISOString().slice(11, 19);
    this.log.push(`[${timestamp}] ${entry}`);
    if (this.log.length > 80) {
      this.log = this.log.slice(-80);
    }
  }
}