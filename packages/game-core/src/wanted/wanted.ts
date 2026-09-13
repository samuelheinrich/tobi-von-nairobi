/** Wanted persists after heat drops. An escape requires actual contact before losing sight. */
export class WantedSystem {
  public level = 0;
  public maximum = 0;
  public unseenSeconds = 0;
  public hadContact = false;
  public constructor(
    private readonly cap: number,
    private readonly thresholds: readonly number[],
    public readonly duration: number,
  ) {}
  public report(chaos: number): void {
    this.level = Math.max(
      this.level,
      Math.min(this.cap, this.thresholds.filter((t) => chaos >= t).length),
    );
    this.maximum = Math.max(this.maximum, this.level);
  }
  public step(delta: number, visible: boolean): boolean {
    if (this.level === 0) return false;
    if (visible) {
      this.hadContact = true;
      this.unseenSeconds = 0;
      return false;
    }
    if (!this.hadContact) return false;
    this.unseenSeconds = Math.min(this.duration, this.unseenSeconds + delta);
    if (this.unseenSeconds + 1e-8 < this.duration) return false;
    this.level = 0;
    this.hadContact = false;
    this.unseenSeconds = 0;
    return true;
  }
}
