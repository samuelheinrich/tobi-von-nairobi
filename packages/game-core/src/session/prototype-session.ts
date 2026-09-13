import type { LevelDefinition } from '@tobi/contracts';
import { collectHandler, Mission, reachHandler } from '../missions/mission.js';

/** Authoritative in-memory tutorial progress, never advertised as a persistent savegame. */
export class PrototypeSession {
  public readonly mission: Mission;
  public readonly collected = new Set<string>();
  public score = 0;
  public elapsedSeconds = 0;
  private awardedCompletion = false;

  public constructor(
    public readonly level: LevelDefinition,
    private readonly points: { bottlePoints: number; completionBonus: number },
  ) {
    this.mission = new Mission(level.objectives, [collectHandler, reachHandler]);
  }

  public collect(pickupId: string): boolean {
    const pickup = this.level.pickups.find((entry) => entry.id === pickupId);
    if (!pickup || this.collected.has(pickupId) || this.mission.isComplete) return false;
    this.collected.add(pickupId);
    this.score += this.points.bottlePoints;
    this.mission.onEvent({ type: 'itemCollected', itemId: pickup.itemId, pickupId });
    return true;
  }

  public reach(targetId: string): boolean {
    this.mission.onEvent({ type: 'zoneReached', targetId });
    if (this.mission.isComplete && !this.awardedCompletion) {
      this.score += this.points.completionBonus;
      this.awardedCompletion = true;
      return true;
    }
    return false;
  }
}
