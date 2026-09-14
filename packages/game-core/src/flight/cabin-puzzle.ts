import type { Position3 } from '@tobi/contracts';
import type { RestSpot } from '../character/seating.js';

export interface CrewRoute {
  id: string;
  x: number;
  floor: number;
  minZ: number;
  maxZ: number;
  speed: number;
  start: number;
  direction: 1 | -1;
}
export interface CabinCrew {
  route: CrewRoute;
  position: Position3;
  direction: number;
}
export interface CabinPuzzleConfig {
  routes: readonly CrewRoute[];
  hidingSequence: readonly { spotId: string; crewId: string; hint: string }[];
  upperFloor: number;
  finishZ: number;
  consoleWaypoint: Position3;
}
export type CabinOutcome = 'caught' | 'disruptive' | null;

/** Timed cabin puzzle: wait for actual crew passes while hidden, then use cover upstairs.
 * Sight is injected by the renderer's real collision rays. No police/chaos coupling.
 */
export class CabinPuzzle {
  public readonly crew: CabinCrew[];
  public stage = 0;
  public strikes = 0;
  public returns = 0;
  public ready = false;
  public consoleVisited = false;
  private grace = 2;
  private pending: CabinOutcome = null;
  private observed = false;
  public constructor(public readonly config: CabinPuzzleConfig) {
    this.crew = config.routes.map((route) => ({
      route,
      position: { x: route.x, y: route.floor + 1.1, z: route.start },
      direction: route.direction,
    }));
  }
  public taunt(): void {
    this.strikes++;
    if (this.strikes >= 3) this.pending = 'disruptive';
  }
  public step(
    delta: number,
    player: Position3,
    hiding: RestSpot | null,
    visible: (from: Position3, to: Position3) => boolean,
  ): CabinOutcome {
    this.grace = Math.max(0, this.grace - delta);
    for (const member of this.crew) {
      member.position.z += member.direction * member.route.speed * delta;
      if (member.position.z >= member.route.maxZ) {
        member.position.z = member.route.maxZ;
        member.direction = -1;
      } else if (member.position.z <= member.route.minZ) {
        member.position.z = member.route.minZ;
        member.direction = 1;
      }
      if (hiding || this.grace > 0 || Math.abs(player.y - member.position.y) > 1.8) continue;
      const dx = player.x - member.position.x;
      const dz = player.z - member.position.z;
      const distance = Math.hypot(dx, dz);
      const inCone = dz * member.direction > distance * 0.55;
      if ((distance < 1.15 || (distance < 6.5 && inCone)) && visible(member.position, player))
        this.pending = 'caught';
    }
    if (this.pending) {
      const reason = this.pending;
      this.pending = null;
      this.stage = this.strikes = 0;
      this.ready = this.observed = this.consoleVisited = false;
      this.grace = 3;
      this.returns++;
      return reason;
    }
    const task = this.config.hidingSequence[this.stage];
    if (task && hiding?.id === task.spotId) {
      const member = this.crew.find((entry) => entry.route.id === task.crewId)!;
      const relative = (hiding.position.z - member.position.z) * member.direction;
      if (Math.abs(relative) < 1.6) this.observed = true;
      if (this.observed && relative < -2) {
        this.stage++;
        this.observed = false;
      }
    } else this.observed = false;
    const waypoint = this.config.consoleWaypoint;
    if (
      !task &&
      Math.hypot(player.x - waypoint.x, player.y - waypoint.y, player.z - waypoint.z) < 1.8
    )
      this.consoleVisited = true;
    if (
      !task &&
      this.consoleVisited &&
      player.y > this.config.upperFloor &&
      player.z > this.config.finishZ
    )
      this.ready = true;
    return null;
  }
  public get hint(): string {
    return (
      this.config.hidingSequence[this.stage]?.hint ??
      (this.ready
        ? 'Vorne an der Lounge mit E abschliessen.'
        : this.consoleVisited
          ? '3/3 · Karte dabei! Um die Mittelkonsole zur vorderen Lounge.'
          : '3/3 · Treppe hoch. Hol Karls Lounge-Karte hinter der Mittelkonsole.')
    );
  }
}
