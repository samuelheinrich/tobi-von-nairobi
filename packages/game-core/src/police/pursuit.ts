import type { PursuitView } from '@tobi/contracts';
import { ChaosSystem } from '../chaos/chaos.js';
import { WantedSystem } from '../wanted/wanted.js';
import { distance2, type Point2 } from '../navigation/navigation-grid.js';
import { PoliceAgent, type PoliceRules } from './police-agent.js';

export interface PursuitRules extends PoliceRules {
  chaosPerBottle: number;
  provokeChaos: number;
  provokeCooldown: number;
  chaosDecayDelay: number;
  chaosDecayPerSecond: number;
  wantedThresholds: readonly number[];
  escapeDuration: number;
  sightRange: number;
  captureRadius: number;
  captureDuration: number;
  aiInterval: number;
  repathInterval: number;
}
export interface PursuitNavigation {
  clear(from: Point2, to: Point2): boolean;
  canSee(from: Point2, to: Point2): boolean;
  path(from: Point2, to: Point2): Point2[];
}

/** Coordinates a bounded squad; perception/pathfinding tick slowly, movement ticks with physics. */
export class PursuitSystem {
  public readonly chaos: ChaosSystem;
  public readonly wanted: WantedSystem;
  public readonly agents: PoliceAgent[];
  public caught = false;
  public escapes = 0;
  private readonly staggered = new Map<number, number>();
  public stagger(id: number): void {
    if (!this.activeAgents.some((a) => a.id === id)) return;
    this.staggered.set(id, 2.5);
    this.captureSeconds = 0;
    this.provoke();
  }
  public isStaggered(id: number): boolean {
    return (this.staggered.get(id) ?? 0) > 0;
  }
  private visible = false;
  private provokeSeconds = 0;
  private captureSeconds = 0;
  private aiTime = 0;
  private routeTime = 0;
  private routes = new Map<number, Point2[]>();
  public constructor(
    cap: number,
    spawns: readonly Point2[],
    private readonly rules: PursuitRules,
    private readonly nav: PursuitNavigation,
  ) {
    this.chaos = new ChaosSystem(rules.chaosDecayDelay, rules.chaosDecayPerSecond);
    this.wanted = new WantedSystem(cap, rules.wantedThresholds, rules.escapeDuration);
    this.agents = spawns.slice(0, cap).map((p, i) => new PoliceAgent(i, p, rules));
  }
  public disrupt(): void {
    if (!this.caught) {
      this.chaos.add(this.rules.chaosPerBottle);
      this.wanted.report(this.chaos.value);
    }
  }
  public provoke(): boolean {
    if (this.caught || this.provokeSeconds > 0) return false;
    this.chaos.add(this.rules.provokeChaos);
    this.wanted.report(this.chaos.value);
    this.provokeSeconds = this.rules.provokeCooldown;
    return true;
  }
  public get activeAgents(): PoliceAgent[] {
    return this.agents.slice(0, this.wanted.maximum);
  }
  public step(delta: number, player: Point2 & { y: number }): 'escaped' | 'caught' | null {
    if (this.caught) return null;
    for (const [id, remaining] of this.staggered) {
      if (remaining <= delta) this.staggered.delete(id);
      else this.staggered.set(id, remaining - delta);
    }
    this.provokeSeconds = Math.max(0, this.provokeSeconds - delta);
    this.aiTime += delta;
    this.routeTime += delta;
    if (this.aiTime >= this.rules.aiInterval) {
      this.visible = false;
      for (const agent of this.activeAgents) {
        const sees =
          this.wanted.level > 0 &&
          player.y < 2.5 &&
          distance2(agent.position, player) <= this.rules.sightRange &&
          this.nav.canSee(agent.position, player);
        this.visible ||= sees;
        agent.perceive(this.aiTime, this.wanted.level > 0, sees ? player : null);
        if (this.routeTime >= this.rules.repathInterval || !this.routes.has(agent.id))
          this.routes.set(agent.id, this.nav.path(agent.position, agent.target));
      }
      this.aiTime = 0;
      if (this.routeTime >= this.rules.repathInterval) this.routeTime = 0;
    }
    for (const agent of this.activeAgents) {
      if (agent.state === 'SUSPICIOUS' || this.isStaggered(agent.id)) continue;
      const route = this.routes.get(agent.id);
      const next = route?.[0];
      if (!next) continue;
      const length = distance2(agent.position, next);
      const amount = Math.min(length, agent.speed * delta);
      if (length > 0) {
        const candidate = {
          x: agent.position.x + ((next.x - agent.position.x) * amount) / length,
          z: agent.position.z + ((next.z - agent.position.z) * amount) / length,
        };
        if (this.nav.clear(agent.position, candidate)) agent.position = candidate;
      }
      if (length <= amount + 0.01) route?.shift();
    }
    const touching =
      this.wanted.level > 0 &&
      player.y < 2 &&
      this.activeAgents.some(
        (a) =>
          a.state === 'CHASE' &&
          !this.isStaggered(a.id) &&
          distance2(a.position, player) < this.rules.captureRadius &&
          this.nav.canSee(a.position, player),
      );
    this.captureSeconds = touching
      ? Math.min(this.rules.captureDuration, this.captureSeconds + delta)
      : Math.max(0, this.captureSeconds - delta * 2);
    if (this.captureSeconds >= this.rules.captureDuration) {
      this.caught = true;
      return 'caught';
    }
    this.chaos.step(delta, this.visible);
    if (this.wanted.step(delta, this.visible)) {
      this.escapes++;
      this.captureSeconds = 0;
      this.chaos.coolDown();
      for (const agent of this.activeAgents) agent.perceive(0, false, null);
      this.routes.clear();
      return 'escaped';
    }
    return null;
  }
  public snapshot(): PursuitView {
    return {
      chaos: Math.round(this.chaos.value),
      wanted: this.wanted.level,
      maxWanted: this.wanted.maximum,
      status: this.caught
        ? 'caught'
        : this.wanted.level === 0
          ? this.escapes
            ? 'escaped'
            : 'quiet'
          : this.visible
            ? 'chase'
            : 'search',
      escapeSeconds:
        this.wanted.level > 0 && this.wanted.hadContact && !this.visible
          ? Math.max(1, Math.ceil(this.rules.escapeDuration - this.wanted.unseenSeconds - 1e-8))
          : null,
      capturePercent: Math.round((this.captureSeconds / this.rules.captureDuration) * 100),
      escapes: this.escapes,
    };
  }
}
