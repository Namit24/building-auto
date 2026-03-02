export interface EnergyInputs {
  dtSeconds: number;
  fanPowerKw: number;
  coolingLoadKw: number;
  heatingLoadKw: number;
  lightingLoadKw: number;
}

export interface EnergyOutputs {
  fanPowerKw: number;
  coolingLoadKw: number;
  heatingLoadKw: number;
  lightingLoadKw: number;
  totalKw: number;
  dailyKwh: number;
}

export class EnergyModel {
  private dailyKwh = 0;
  private dayKey = new Date().toISOString().slice(0, 10);

  step(inputs: EnergyInputs): EnergyOutputs {
    const currentDay = new Date().toISOString().slice(0, 10);
    if (currentDay !== this.dayKey) {
      this.dayKey = currentDay;
      this.dailyKwh = 0;
    }

    const totalKw = inputs.fanPowerKw + inputs.coolingLoadKw + inputs.heatingLoadKw + inputs.lightingLoadKw;
    this.dailyKwh += totalKw * (inputs.dtSeconds / 3600);

    return {
      fanPowerKw: inputs.fanPowerKw,
      coolingLoadKw: inputs.coolingLoadKw,
      heatingLoadKw: inputs.heatingLoadKw,
      lightingLoadKw: inputs.lightingLoadKw,
      totalKw,
      dailyKwh: this.dailyKwh
    };
  }
}