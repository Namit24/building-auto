export interface CO2Inputs {
  dtSeconds: number;
  currentCo2: number;
  outdoorCo2: number;
  occupants: number;
  generationRatePpmPerSecondPerPerson: number;
  volumeM3: number;
  ventilationRateM3PerSecond: number;
}

export class CO2Model {
  step(inputs: CO2Inputs): number {
    const generationTerm = (inputs.occupants * inputs.generationRatePpmPerSecondPerPerson) / Math.max(1, inputs.volumeM3);
    const ventilationTerm = (inputs.ventilationRateM3PerSecond * (inputs.currentCo2 - inputs.outdoorCo2)) / Math.max(1, inputs.volumeM3);

    const delta = inputs.dtSeconds * (generationTerm - ventilationTerm);
    const next = inputs.currentCo2 + delta;

    return Math.max(inputs.outdoorCo2, next);
  }
}