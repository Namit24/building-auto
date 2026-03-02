import { AHUModel } from "./AHUModel";
import { CO2Model } from "./CO2Model";
import { EnergyModel } from "./EnergyModel";
import { FaultEngine } from "./FaultEngine";
import { PIDController } from "./PIDController";
import { SecurityEngine } from "./SecurityEngine";
import { ThermalModel } from "./ThermalModel";
import type { ControlPatch, FaultPatch, IncomingWSMessage, SimulationState } from "../types";

interface InternalControls {
  weather: {
    outdoorTemp: number;
    outdoorHumidity: number;
    outdoorCO2: number;
    solarEnabled: boolean;
    solarLoadKw: number;
  };
  ahu: {
    mode: SimulationState["ahu"]["mode"];
    oadPositionPct: number;
    coolingValvePct: number;
    heatingValvePct: number;
    supplyFanPct: number;
  };
  energy: {
    demandResponse: boolean;
  };
}

export class SimulationEngine {
  private readonly thermalModel = new ThermalModel();
  private readonly co2Model = new CO2Model();
  private readonly ahuModel = new AHUModel();
  private readonly energyModel = new EnergyModel();
  private readonly faultEngine = new FaultEngine();
  private readonly securityEngine = new SecurityEngine();

  private readonly temperaturePID = new PIDController(8, 0.025, 1.2, 0, 100);
  private readonly co2PID = new PIDController(0.2, 0.001, 0.02, 10, 100);

  private simSeconds = 0;

  private controls: InternalControls = {
    weather: {
      outdoorTemp: 24.5,
      outdoorHumidity: 60,
      outdoorCO2: 410,
      solarEnabled: true,
      solarLoadKw: 16
    },
    ahu: {
      mode: "cool",
      oadPositionPct: 20,
      coolingValvePct: 65,
      heatingValvePct: 0,
      supplyFanPct: 80
    },
    energy: {
      demandResponse: false
    }
  };

  private state: SimulationState = {
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
      latestAccessLogs: []
    },
    history: {
      temperature: [],
      co2: [],
      energy: []
    }
  };

  tick(dtSeconds = 1): SimulationState {
    this.simSeconds += dtSeconds;

    const occupants = this.occupancySchedule(this.simSeconds);
    const measuredTemp = this.state.indoor.temperature + (this.faultEngine.getToggles().tempSensorDrift ? 1.2 : 0);

    const tempSetpoint = 22;
    const co2Setpoint = 800;

    const tempPidOutput = this.temperaturePID.update(tempSetpoint, measuredTemp, dtSeconds);
    const co2PidOutput = this.co2PID.update(co2Setpoint, this.state.indoor.co2, dtSeconds);

    const mode = this.controls.ahu.mode;
    const coolingValvePct = mode === "heat" ? this.controls.ahu.coolingValvePct : mode === "auto" ? tempPidOutput : this.controls.ahu.coolingValvePct;
    const heatingValvePct = mode === "cool" ? this.controls.ahu.heatingValvePct : mode === "auto" ? Math.max(0, 100 - tempPidOutput) : this.controls.ahu.heatingValvePct;
    const oadPositionPct = mode === "auto" ? co2PidOutput : this.controls.ahu.oadPositionPct;

    const ahu = this.ahuModel.compute(
      this.controls.weather.outdoorTemp,
      this.state.indoor.temperature,
      {
        mode,
        oadPositionPct,
        coolingValvePct,
        heatingValvePct,
        supplyFanPct: this.controls.ahu.supplyFanPct
      },
      {
        damperStuck: this.faultEngine.getToggles().damperStuck,
        coolingCoilFailure: this.faultEngine.getToggles().coolingCoilFailure,
        filterClog: this.faultEngine.getToggles().filterClog
      }
    );

    const temperatureNext = this.thermalModel.step({
      dtSeconds,
      currentTemp: this.state.indoor.temperature,
      outdoorTemp: this.controls.weather.outdoorTemp,
      thermalCapacitance: 420,
      occupancyCount: occupants,
      occupancyHeatKwPerPerson: 0.12,
      solarEnabled: this.controls.weather.solarEnabled,
      solarLoadKw: this.controls.weather.solarLoadKw,
      airflowRate: ahu.airflowM3s,
      exchangeCoeffKwPerC: 0.08,
      coolingPowerKw: ahu.coolingPowerKw,
      heatingPowerKw: ahu.heatingPowerKw
    });

    const ventilationRateM3PerSecond = ahu.airflowM3s * (ahu.oadPositionPct / 100);
    const co2Next = this.co2Model.step({
      dtSeconds,
      currentCo2: this.state.indoor.co2,
      outdoorCo2: this.controls.weather.outdoorCO2,
      occupants,
      generationRatePpmPerSecondPerPerson: 2.1,
      volumeM3: 7000,
      ventilationRateM3PerSecond
    });

    const humidityTarget = Math.min(80, Math.max(25, this.controls.weather.outdoorHumidity - (ahu.coolingValvePct * 0.12)));
    const humidityNext = this.state.indoor.humidity + (humidityTarget - this.state.indoor.humidity) * 0.03;
    const dewPoint = temperatureNext - ((100 - humidityNext) / 5);

    const demandResponseMultiplier = this.controls.energy.demandResponse ? 0.85 : 1;
    const coolingLoadKw = ahu.coolingPowerKw * demandResponseMultiplier;
    const heatingLoadKw = ahu.heatingPowerKw;
    const lightingLoadKw = 8 + occupants * 0.15;

    const energy = this.energyModel.step({
      dtSeconds,
      fanPowerKw: ahu.fanPowerKw,
      coolingLoadKw,
      heatingLoadKw,
      lightingLoadKw
    });

    const faultEval = this.faultEngine.evaluate({
      coolingValvePct: ahu.coolingValvePct,
      temperatureTrend: temperatureNext - this.state.indoor.temperature
    });

    const comfortIndex = this.computeComfortIndex(temperatureNext, humidityNext, co2Next);

    const timeLabel = this.toElapsedLabel(this.simSeconds);
    this.pushHistory(this.state.history.temperature, { t: timeLabel, v: Number(temperatureNext.toFixed(2)) });
    this.pushHistory(this.state.history.co2, { t: timeLabel, v: Number(co2Next.toFixed(0)) });
    this.pushHistory(this.state.history.energy, { t: timeLabel, v: Number(energy.totalKw.toFixed(2)) });

    this.state = {
      simTime: `T+ ${timeLabel}`,
      status: faultEval.status,
      weather: { ...this.controls.weather },
      indoor: {
        temperature: Number(temperatureNext.toFixed(2)),
        humidity: Number(humidityNext.toFixed(1)),
        co2: Number(co2Next.toFixed(0)),
        dewPoint: Number(dewPoint.toFixed(1)),
        occupants,
        comfortIndex
      },
      ahu: {
        mode: ahu.mode,
        oadPositionPct: Number(ahu.oadPositionPct.toFixed(0)),
        returnAirPct: Number(ahu.returnAirPct.toFixed(0)),
        mixedAirTemp: Number(ahu.mixedAirTemp.toFixed(2)),
        coolingValvePct: Number(ahu.coolingValvePct.toFixed(0)),
        heatingValvePct: Number(ahu.heatingValvePct.toFixed(0)),
        supplyFanPct: Number(ahu.supplyFanPct.toFixed(0)),
        fanPowerKw: Number(ahu.fanPowerKw.toFixed(2)),
        airflowM3s: Number(ahu.airflowM3s.toFixed(2))
      },
      energy: {
        fanPowerKw: Number(energy.fanPowerKw.toFixed(2)),
        coolingLoadKw: Number(energy.coolingLoadKw.toFixed(2)),
        heatingLoadKw: Number(energy.heatingLoadKw.toFixed(2)),
        lightingLoadKw: Number(energy.lightingLoadKw.toFixed(2)),
        totalKw: Number(energy.totalKw.toFixed(2)),
        dailyKwh: Number(energy.dailyKwh.toFixed(2)),
        demandResponse: this.controls.energy.demandResponse
      },
      faults: {
        ...this.faultEngine.getToggles(),
        activeAlerts: faultEval.activeAlerts,
        log: faultEval.log
      },
      security: {
        ...this.securityEngine.getSecurityState()
      },
      history: {
        temperature: [...this.state.history.temperature],
        co2: [...this.state.history.co2],
        energy: [...this.state.history.energy]
      }
    };

    return this.state;
  }

  getState(): SimulationState {
    return this.state;
  }

  updateControls(patch: ControlPatch): SimulationState {
    this.controls = {
      weather: { ...this.controls.weather, ...(patch.weather ?? {}) },
      ahu: { ...this.controls.ahu, ...(patch.ahu ?? {}) },
      energy: { ...this.controls.energy, ...(patch.energy ?? {}) }
    };
    return this.state;
  }

  updateFaults(patch: FaultPatch): SimulationState {
    this.faultEngine.setToggles(patch);
    return this.state;
  }

  scanRFID(uid: string, zone: string, secondUid?: string): SimulationState {
    this.securityEngine.scanRFID(uid, zone, secondUid);
    this.state = {
      ...this.state,
      security: {
        ...this.securityEngine.getSecurityState()
      }
    };
    return this.state;
  }

  processMessage(message: IncomingWSMessage): void {
    if (message.type === "control_update") {
      this.updateControls(message.payload);
      return;
    }

    if (message.type === "fault_toggle") {
      this.updateFaults(message.payload);
      return;
    }

    if (message.type === "rfid_scan") {
      this.scanRFID(message.payload.uid, message.payload.zone, message.payload.secondUid);
    }
  }

  private pushHistory(array: { t: string; v: number }[], point: { t: string; v: number }): void {
    array.push(point);
    if (array.length > 180) {
      array.shift();
    }
  }

  private toElapsedLabel(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  private occupancySchedule(seconds: number): number {
    const hour = (seconds / 3600) % 24;
    if (hour < 6 || hour > 21) {
      return 8;
    }
    if (hour < 8) {
      return 20;
    }
    if (hour < 17) {
      return 45;
    }
    return 28;
  }

  private computeComfortIndex(temp: number, humidity: number, co2: number): string {
    const tempGood = temp >= 21 && temp <= 24;
    const humidityGood = humidity >= 35 && humidity <= 55;
    const co2Good = co2 <= 900;

    if (tempGood && humidityGood && co2Good) {
      return "OPTIMAL";
    }
    if (co2 > 1200 || temp < 19 || temp > 26) {
      return "POOR";
    }
    return "MODERATE";
  }
}