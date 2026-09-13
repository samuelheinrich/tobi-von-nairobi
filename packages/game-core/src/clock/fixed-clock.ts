/** Bounded fixed-step clock. Dropped time is measured; pause clears the accumulator. */
export class FixedClock {
  private accumulator = 0;
  public droppedSeconds = 0;

  public constructor(
    private readonly stepSeconds = 1 / 60,
    private readonly maxSteps = 5,
  ) {}

  public advance(deltaSeconds: number, step: (delta: number) => void): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return;
    this.accumulator += deltaSeconds;
    let count = 0;
    while (this.accumulator >= this.stepSeconds && count < this.maxSteps) {
      step(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      count++;
    }
    if (this.accumulator >= this.stepSeconds) {
      const retained = this.accumulator % this.stepSeconds;
      this.droppedSeconds += this.accumulator - retained;
      this.accumulator = retained;
    }
  }

  public reset(): void {
    this.accumulator = 0;
  }
}
