import type { AHUMode } from "../types";

export interface AHUControls {
  mode: AHUMode;
  oadPositionPct: number;
  coolingValvePct: number;
  heatingValvePct: number;
  supplyFanPct: number;
}

export interface AHUFaultFlags {
  damperStuck: boolean;
  coolingCoilFailure: boolean;
  filterClog: boolean;
}

export interface AHUOutputs {
  mode: AHUMode;
  oadPositionPct: number;
  returnAirPct: number;
  mixedAirTemp: number;
  coolingValvePct: number;
  heatingValvePct: number;
  supplyFanPct: number;
  coolingPowerKw: number;
  heatingPowerKw: number;
  airflowM3s: number;
  fanPowerKw: number;
}

export class AHUModel {
  constructor(
    private readonly maxCoolingKw = 65,
    private readonly maxHeatingKw = 45,
    private readonly maxAirflowM3s = 8,
    private readonly fanPowerCoeffKw = 30
  ) {}

  compute(outdoorTemp: number, returnTemp: number, controls: AHUControls, faults: AHUFaultFlags): AHUOutputs {
    const requestedOad = this.clamp(controls.oadPositionPct, 0, 100);
    const oadPositionPct = faults.damperStuck ? 15 : requestedOad;
    const returnAirPct = 100 - oadPositionPct;

    const mixedAirTemp = (oadPositionPct / 100) * outdoorTemp + (returnAirPct / 100) * returnTemp;

    const coolingValvePct = this.clamp(controls.coolingValvePct, 0, 100);
    const heatingValvePct = this.clamp(controls.heatingValvePct, 0, 100);
    const supplyFanPct = this.clamp(controls.supplyFanPct, 0, 100);

    const coolingPowerKw = faults.coolingCoilFailure ? 0 : (coolingValvePct / 100) * this.maxCoolingKw;
    const heatingPowerKw = (heatingValvePct / 100) * this.maxHeatingKw;

    const airflowFraction = supplyFanPct / 100;
    const airflowM3s = airflowFraction * this.maxAirflowM3s;

    let fanPowerKw = this.fanPowerCoeffKw * Math.pow(airflowFraction, 3);
    if (faults.filterClog) {
      fanPowerKw *= 1.35;
    }

    return {
      mode: controls.mode,
      oadPositionPct,
      returnAirPct,
      mixedAirTemp,
      coolingValvePct,
      heatingValvePct,
      supplyFanPct,
      coolingPowerKw,
      heatingPowerKw,
      airflowM3s,
      fanPowerKw
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}