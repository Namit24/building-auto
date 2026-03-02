export interface ThermalInputs {
  dtSeconds: number;
  currentTemp: number;
  outdoorTemp: number;
  thermalCapacitance: number;
  occupancyCount: number;
  occupancyHeatKwPerPerson: number;
  solarEnabled: boolean;
  solarLoadKw: number;
  airflowRate: number;
  exchangeCoeffKwPerC: number;
  coolingPowerKw: number;
  heatingPowerKw: number;
}

export class ThermalModel {
  step(inputs: ThermalInputs): number {
    const dtHours = inputs.dtSeconds / 3600;
    const qInternal = inputs.occupancyCount * inputs.occupancyHeatKwPerPerson + (inputs.solarEnabled ? inputs.solarLoadKw : 0);
    const outdoorExchange = inputs.airflowRate * inputs.exchangeCoeffKwPerC * (inputs.outdoorTemp - inputs.currentTemp);

    const delta = (dtHours / inputs.thermalCapacitance) * (qInternal + outdoorExchange - inputs.coolingPowerKw + inputs.heatingPowerKw);
    const next = inputs.currentTemp + delta;

    return Math.min(50, Math.max(-20, next));
  }
}