/** Heat measures recent disruption, independently of an ongoing pursuit. */
export class ChaosSystem {
  public value = 0;
  private quietSeconds = 0;
  public constructor(
    private readonly decayDelay: number,
    private readonly decayRate: number,
  ) {}
  public add(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.value = Math.min(100, this.value + amount);
    this.quietSeconds = 0;
  }
  public step(delta: number, observed: boolean): void {
    if (observed) {
      this.quietSeconds = 0;
      return;
    }
    const before = Math.max(0, this.quietSeconds - this.decayDelay);
    this.quietSeconds += delta;
    const decayTime = Math.max(0, this.quietSeconds - this.decayDelay) - before;
    this.value = Math.max(0, this.value - decayTime * this.decayRate);
  }
  public coolDown(): void {
    this.value = Math.min(20, this.value);
    this.quietSeconds = 0;
  }
}
