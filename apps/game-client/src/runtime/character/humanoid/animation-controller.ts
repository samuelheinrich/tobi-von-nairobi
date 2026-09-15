import type { AnimationState, HumanoidAction } from './schema.js';
import { motionTiming } from './motion-library.js';

export interface AnimationMarker {
  action: HumanoidAction;
  name: string;
  normalizedTime: number;
}
/** Gameplay-only state machine. Time advances explicitly, so pause never releases a prop. */
export class CharacterAnimationController {
  action: HumanoidAction = 'idle';
  time = 0;
  serial = 0;
  playbackSpeed = 1;
  private lastGrounded = true;
  private lastSitting = false;
  private lastDrinking = false;
  private emitted = new Set<string>();
  private override: HumanoidAction | null = null;
  private sequence: HumanoidAction[] = [];
  private oneShot = false;
  constructor(
    releaseTime = 0.58,
    private readonly markers: readonly AnimationMarker[] = [
      { action: 'throw_bottle', name: 'release', normalizedTime: releaseTime },
    ],
    private readonly durations: Partial<Record<HumanoidAction, number>> = {},
  ) {
    if (markers.some((m) => m.normalizedTime <= 0 || m.normalizedTime >= 1))
      throw new Error('Animation marker must be inside the clip');
  }
  timing(action = this.action) {
    return {
      ...motionTiming[action],
      loop: motionTiming[action].loop && !(action === this.action && this.oneShot),
      duration: this.durations[action] ?? motionTiming[action].duration,
    };
  }
  get busy(): boolean {
    return this.action === 'throw_bottle' && this.time < this.timing('throw_bottle').duration;
  }
  play(action: HumanoidAction, once = false): boolean {
    if (this.busy) return false;
    this.sequence = [];
    this.change(action, true);
    this.oneShot = once;
    return true;
  }
  playSequence(actions: readonly HumanoidAction[]): boolean {
    if (!actions[0] || !this.play(actions[0])) return false;
    this.sequence = actions.slice(1);
    return true;
  }
  preview(action: HumanoidAction | null): void {
    this.sequence = [];
    this.override = action;
    if (action) this.change(action, true);
  }
  private change(action: HumanoidAction, force = false): void {
    if (action === this.action && !force) return;
    this.action = action;
    this.oneShot = false;
    this.time = 0;
    this.serial++;
    this.emitted.clear();
  }
  step(
    delta: number,
    state: AnimationState,
    walkSpeed: number,
    runSpeed: number,
    cycleSpeeds = { walk: walkSpeed, run: runSpeed },
  ): AnimationMarker[] {
    const events: AnimationMarker[] = [];
    const landed = !this.lastGrounded && state.grounded;
    const jumped = this.lastGrounded && !state.grounded;
    const sat = !this.lastSitting && state.sitting,
      stood = this.lastSitting && !state.sitting;
    const drink = !this.lastDrinking && state.drinking;
    this.lastGrounded = state.grounded;
    this.lastSitting = state.sitting;
    this.lastDrinking = state.drinking;
    if (!this.override && !this.busy) {
      // A manual dance gives movement priority; the level-complete dance still loops.
      if (this.action === 'celebrate' && this.oneShot && state.speed > 0.12) this.change('idle');
      if (sat || stood || landed || jumped) this.sequence = [];
      if (sat) this.change('sit_down');
      else if (stood) this.change('stand_up');
      else if (
        !state.sitting &&
        !(this.action === 'stand_up' && this.time < this.timing('stand_up').duration)
      ) {
        if (landed) this.change('jump_land');
        else if (jumped) this.change('jump_start');
        else if (drink && this.action !== 'pickup') this.change('drink', true);
      } else if (drink && this.action !== 'sit_down' && this.action !== 'pickup')
        this.change('drink', true);
    }
    const rate =
      this.action === 'walk'
        ? Math.max(0.45, Math.min(2.4, state.speed / cycleSpeeds.walk))
        : this.action === 'run'
          ? Math.max(0.65, Math.min(2.2, state.speed / cycleSpeeds.run))
          : 1;
    const before = this.time;
    this.time += Math.max(0, delta) * this.playbackSpeed * (this.override ? 1 : rate);
    for (const marker of this.markers) {
      if (marker.action !== this.action || this.emitted.has(marker.name)) continue;
      const at = this.timing().duration * marker.normalizedTime;
      if (before < at && this.time >= at) {
        this.emitted.add(marker.name);
        events.push(marker);
      }
    }
    if (!this.override) {
      const timing = this.timing();
      const done = !timing.loop && this.time >= timing.duration;
      if (done) this.oneShot = false;
      const locomotion =
        (this.action === 'celebrate' && timing.loop) ||
        this.action === 'idle' ||
        this.action === 'walk' ||
        this.action === 'run' ||
        this.action === 'sit_idle' ||
        this.action === 'jump_loop';
      if (done && this.sequence.length) this.change(this.sequence.shift()!, true);
      else if (done && state.drinking && (state.grounded || state.sitting))
        this.change('drink', true);
      else if (done || locomotion) {
        this.change(
          state.victory
            ? 'celebrate'
            : state.sitting
              ? 'sit_idle'
              : !state.grounded
                ? 'jump_loop'
                : state.speed < 0.12
                  ? 'idle'
                  : state.speed > (walkSpeed + runSpeed) * 0.5
                    ? 'run'
                    : 'walk',
        );
      }
    }
    return events;
  }
}
