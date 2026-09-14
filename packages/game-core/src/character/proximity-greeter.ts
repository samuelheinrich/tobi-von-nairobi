export interface GreetCandidate {
  id: number;
  x: number;
  z: number;
  /** Floor height, so somebody one storey up does not greet through the ceiling. */
  y?: number;
}

export interface GreeterConfig {
  /** Metres at which somebody notices Tobi. */
  range: number;
  /** Seconds before the same person greets again. */
  perSpeakerSeconds: number;
  /** Seconds between any two greetings, so a crowd does not become a wall of noise. */
  betweenSeconds: number;
  /** Vertical tolerance in metres. */
  sameFloorWithin: number;
}

/** Decides who says hello when Tobi wanders into their personal space.
 *
 * Kept free of any engine type so it can be shared by the train, the WG, the bar and the street,
 * and tested without a scene. Callers supply positions and apply the result.
 *
 * The rules that matter: a person greets once and then stays quiet for a long while, only one
 * greeting happens at a time, and someone has to actually *arrive* — standing still next to a
 * group never re-triggers it.
 */
export class ProximityGreeter {
  private readonly lastGreeted = new Map<number, number>();
  private readonly inRange = new Set<number>();
  private clock = 0;
  private nextAllowed = 0;

  public constructor(private readonly config: GreeterConfig) {}

  /** Advances time and returns who should greet on this tick, or null. */
  public step(
    delta: number,
    player: { x: number; y: number; z: number },
    candidates: readonly GreetCandidate[],
  ): number | null {
    this.clock += delta;
    let chosen: number | null = null;
    let nearest = this.config.range;
    for (const candidate of candidates) {
      const distance = Math.hypot(candidate.x - player.x, candidate.z - player.z);
      const sameFloor =
        candidate.y === undefined ||
        Math.abs(candidate.y - player.y) <= this.config.sameFloorWithin;
      if (distance > this.config.range || !sameFloor) {
        // Leaving and coming back is what arms the next greeting.
        this.inRange.delete(candidate.id);
        continue;
      }
      if (this.inRange.has(candidate.id)) continue;
      this.inRange.add(candidate.id);
      const last = this.lastGreeted.get(candidate.id);
      if (last !== undefined && this.clock - last < this.config.perSpeakerSeconds) continue;
      if (this.clock < this.nextAllowed) continue;
      if (distance < nearest) {
        nearest = distance;
        chosen = candidate.id;
      }
    }
    if (chosen !== null) {
      this.lastGreeted.set(chosen, this.clock);
      this.nextAllowed = this.clock + this.config.betweenSeconds;
    }
    return chosen;
  }

  public reset(): void {
    this.lastGreeted.clear();
    this.inRange.clear();
    this.clock = 0;
    this.nextAllowed = 0;
  }
}
