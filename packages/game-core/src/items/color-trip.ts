/** Fictional visual power-up, without real drug modelling or score/physics side effects. */
export class ColorTrip {
  public remaining = 0;
  private readonly seen = new Set<string>();
  public collect(id: string): boolean {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    this.remaining = Math.min(24, this.remaining + 10);
    return true;
  }
  public step(delta: number): void {
    this.remaining = Math.max(0, this.remaining - delta);
  }
  public get intensity(): number {
    return Math.min(1, this.remaining / 2);
  }
}
