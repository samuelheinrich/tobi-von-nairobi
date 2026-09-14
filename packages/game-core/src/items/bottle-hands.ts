/** Each pickup is consumed once, then becomes one throwable empty. Simulated time pauses naturally. */
export class BottleHands {
  private queued = 0;
  private remaining = 0;
  private cooldown = 0;
  public empties = 0;
  public readonly drinkDuration = 0.85;
  public collect(): void {
    this.queued++;
    if (this.remaining === 0) this.remaining = this.drinkDuration;
  }
  public get drinking(): boolean {
    return this.queued > 0;
  }
  public get drinkPose(): number {
    return this.drinking ? Math.sin(Math.PI * (1 - this.remaining / this.drinkDuration)) : 0;
  }
  public get holding(): boolean {
    return this.drinking || this.empties > 0;
  }
  public step(delta: number): number {
    this.cooldown = Math.max(0, this.cooldown - delta);
    let finished = 0;
    if (this.drinking) {
      this.remaining -= delta;
      while (this.queued > 0 && this.remaining <= 0) {
        this.queued--;
        this.empties++;
        finished++;
        this.remaining += this.drinkDuration;
      }
      if (!this.queued) this.remaining = 0;
    }
    return finished;
  }
  public throw(): boolean {
    if (this.drinking || this.empties === 0 || this.cooldown > 0) return false;
    this.empties--;
    this.cooldown = 0.45;
    return true;
  }
}
