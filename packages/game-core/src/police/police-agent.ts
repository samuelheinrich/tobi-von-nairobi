import type { PoliceState } from '@tobi/contracts';
import type { Point2 } from '../navigation/navigation-grid.js';
import { distance2 } from '../navigation/navigation-grid.js';

export interface PoliceRules {
  suspicionDuration: number;
  searchDuration: number;
  chaseSpeed: number;
  patrolSpeed: number;
}

/** One guard's perception state. No level IDs, mesh types or global player tracking. */
export class PoliceAgent {
  public state: PoliceState = 'PATROL';
  public position: Point2;
  public target: Point2;
  private lastSeen: Point2;
  private stateSeconds = 0;
  public constructor(
    public readonly id: number,
    public readonly home: Point2,
    private readonly rules: PoliceRules,
  ) {
    this.position = { x: home.x, z: home.z };
    this.target = { x: home.x, z: home.z };
    this.lastSeen = { x: home.x, z: home.z };
  }
  private transition(next: PoliceState): void {
    if (this.state !== next) {
      this.state = next;
      this.stateSeconds = 0;
    }
  }
  public perceive(delta: number, wanted: boolean, visibleTarget: Point2 | null): void {
    this.stateSeconds += delta;
    if (!wanted) {
      this.transition(distance2(this.position, this.home) > 0.3 ? 'RETURN_TO_PATROL' : 'PATROL');
      this.target = this.home;
      return;
    }
    if (visibleTarget) {
      this.lastSeen = { x: visibleTarget.x, z: visibleTarget.z };
      if (this.state === 'PATROL' || this.state === 'RETURN_TO_PATROL')
        this.transition('SUSPICIOUS');
      else if (
        this.state === 'SEARCH' ||
        (this.state === 'SUSPICIOUS' && this.stateSeconds >= this.rules.suspicionDuration)
      )
        this.transition('CHASE');
      this.target = this.state === 'CHASE' ? this.lastSeen : this.position;
      return;
    }
    if (this.state === 'CHASE' || this.state === 'SUSPICIOUS') this.transition('SEARCH');
    if (this.state === 'SEARCH') {
      this.target = this.lastSeen;
      if (this.stateSeconds >= this.rules.searchDuration) this.transition('RETURN_TO_PATROL');
    }
    if (this.state === 'RETURN_TO_PATROL' || this.state === 'PATROL') this.target = this.home;
  }
  public get speed(): number {
    return this.state === 'CHASE' ? this.rules.chaseSpeed : this.rules.patrolSpeed;
  }
}
