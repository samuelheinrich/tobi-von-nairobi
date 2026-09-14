import type { Point2 } from '../navigation/navigation-grid.js';

export interface BlockerConfig {
  /** Corridor the blocker owns, in metres along the level's main axis. */
  patrolMin: number;
  patrolMax: number;
  laneMin: number;
  laneMax: number;
  patrolSpeed: number;
  interceptSpeed: number;
  noticeRange: number;
  bodyRadius: number;
  shoutSeconds: number;
  /** How long it keeps the aisle before it grudgingly steps aside. */
  relentSeconds: number;
  standAsideSeconds: number;
  /** Lane position it retreats to while standing aside. */
  asideX: number;
  /** Side of the player the blocker keeps, +1 towards rising z. */
  blockSide: 1 | -1;
}

/** A nuisance NPC: it shouts and occupies space, but it never reports anything to the police.
 * It always yields in the end — after `relentSeconds`, or at once when Tobi shouts back — so a
 * corridor level can never become unwinnable. Movement is pure; the level adapter owns the mesh
 * and applies the physical push-out.
 */
export class Blocker {
  public position: Point2;
  public facing = 0;
  public state: 'PATROL' | 'BLOCK' | 'ASIDE' = 'PATROL';
  private direction: 1 | -1 = 1;
  private cooldown = 0;
  private blocking = 0;
  private aside = 0;

  public constructor(
    private readonly config: BlockerConfig,
    start: Point2,
  ) {
    this.position = { x: start.x, z: start.z };
  }

  /** Returns true on the tick the blocker starts a new complaint. */
  public step(delta: number, player: Point2 & { y: number }, active = true): boolean {
    const c = this.config;
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.aside = Math.max(0, this.aside - delta);
    const reach = Math.hypot(player.x - this.position.x, player.z - this.position.z);
    const engaged =
      active && this.aside === 0 && reach <= c.noticeRange && Math.abs(player.y - 1) < 3;
    if (engaged) this.blocking += delta;
    else if (this.aside === 0) this.blocking = 0;
    if (this.blocking >= c.relentSeconds) this.relent();
    this.state = this.aside > 0 ? 'ASIDE' : engaged ? 'BLOCK' : 'PATROL';
    let shouting = false;
    if (this.state === 'ASIDE') {
      // Pressed against the seats, arms crossed, letting the tourist through.
      this.approach({ x: c.asideX, z: this.position.z }, c.interceptSpeed * delta);
      this.facing = Math.atan2(player.x - this.position.x, player.z - this.position.z);
    } else if (engaged) {
      // Plant itself one body length ahead of Tobi, between him and the front of the train.
      const target = {
        x: Math.min(c.laneMax, Math.max(c.laneMin, player.x)),
        z: Math.min(
          c.patrolMax,
          Math.max(c.patrolMin, player.z + c.blockSide * (c.bodyRadius + 0.35)),
        ),
      };
      this.approach(target, c.interceptSpeed * delta);
      this.facing = Math.atan2(player.x - this.position.x, player.z - this.position.z);
      if (reach <= c.bodyRadius + 1.2 && this.cooldown === 0) {
        this.cooldown = c.shoutSeconds;
        shouting = true;
      }
    } else {
      const target = { x: this.position.x, z: this.direction > 0 ? c.patrolMax : c.patrolMin };
      this.approach(target, c.patrolSpeed * delta);
      if (Math.abs(this.position.z - target.z) < 0.05) this.direction = this.direction > 0 ? -1 : 1;
      this.facing = this.direction > 0 ? 0 : Math.PI;
    }
    return shouting;
  }

  /** Makes the blocker give up at once, for example when Tobi shouts back or lands a bottle. */
  public relent(): void {
    if (this.aside > 0) return;
    this.aside = this.config.standAsideSeconds;
    this.blocking = 0;
  }

  /** True while the blocker is deliberately out of the way. */
  public get yielding(): boolean {
    return this.aside > 0;
  }

  /** Depenetrates an overlapping player; returns the corrected ground position or null. */
  public resolve(player: Point2): Point2 | null {
    const dx = player.x - this.position.x,
      dz = player.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance >= this.config.bodyRadius) return null;
    if (distance < 1e-4) return { x: player.x, z: this.position.z - this.config.bodyRadius };
    const scale = this.config.bodyRadius / distance;
    return { x: this.position.x + dx * scale, z: this.position.z + dz * scale };
  }

  private approach(target: Point2, amount: number): void {
    const dx = target.x - this.position.x,
      dz = target.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= amount || distance === 0) {
      this.position = { x: target.x, z: target.z };
      return;
    }
    this.position = {
      x: this.position.x + (dx / distance) * amount,
      z: this.position.z + (dz / distance) * amount,
    };
  }
}
