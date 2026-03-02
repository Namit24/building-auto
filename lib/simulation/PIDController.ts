export class PIDController {
  private integral = 0;
  private previousError = 0;
  private smoothedDerivative = 0;

  constructor(
    private readonly kp: number,
    private readonly ki: number,
    private readonly kd: number,
    private readonly outputMin: number,
    private readonly outputMax: number,
    private readonly derivativeAlpha = 0.35
  ) {}

  reset(): void {
    this.integral = 0;
    this.previousError = 0;
    this.smoothedDerivative = 0;
  }

  update(setpoint: number, measured: number, dtSeconds: number): number {
    const dt = Math.max(0.001, dtSeconds);
    const error = setpoint - measured;

    this.integral += error * dt;
    if (this.ki !== 0) {
      const integralMin = (this.outputMin - this.kp * error) / this.ki;
      const integralMax = (this.outputMax - this.kp * error) / this.ki;
      this.integral = Math.min(Math.max(this.integral, Math.min(integralMin, integralMax)), Math.max(integralMin, integralMax));
    }

    const derivative = (error - this.previousError) / dt;
    this.smoothedDerivative = this.derivativeAlpha * derivative + (1 - this.derivativeAlpha) * this.smoothedDerivative;

    const output = this.kp * error + this.ki * this.integral + this.kd * this.smoothedDerivative;
    this.previousError = error;

    return Math.min(this.outputMax, Math.max(this.outputMin, output));
  }
}