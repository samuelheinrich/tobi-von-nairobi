import { describe, it, expect } from 'vitest';
import { CharacterAnimationController } from '../../../apps/game-client/src/runtime/character/humanoid/animation-controller.js';
import {
  suggestBoneMap,
  boneAliases,
  type AnimationState,
} from '../../../apps/game-client/src/runtime/character/humanoid/schema.js';
const idle: AnimationState = {
  speed: 0,
  grounded: true,
  sitting: false,
  drinking: false,
  holding: false,
};
describe('humanoid animation clock', () => {
  it('tracks real movement and comes back to idle', () => {
    const c = new CharacterAnimationController();
    c.step(0.1, { ...idle, speed: 5.8 }, 5.8, 10.2);
    expect(c.action).toBe('walk');
    c.step(0.1, { ...idle, speed: 10.2 }, 5.8, 10.2);
    expect(c.action).toBe('run');
    c.step(0.1, idle, 5.8, 10.2);
    expect(c.action).toBe('idle');
  });
  it('sequences takeoff, air and landing', () => {
    const c = new CharacterAnimationController();
    c.step(0.02, { ...idle, grounded: false }, 5.8, 10.2);
    expect(c.action).toBe('jump_start');
    c.step(0.17, { ...idle, grounded: false }, 5.8, 10.2);
    expect(c.action).toBe('jump_loop');
    c.step(0.02, idle, 5.8, 10.2);
    expect(c.action).toBe('jump_land');
    c.step(0.25, idle, 5.8, 10.2);
    expect(c.action).toBe('idle');
  });
  it('sequences seat entry and exit', () => {
    const c = new CharacterAnimationController();
    c.step(0.01, { ...idle, sitting: true }, 5.8, 10.2);
    expect(c.action).toBe('sit_down');
    c.step(0.6, { ...idle, sitting: true }, 5.8, 10.2);
    expect(c.action).toBe('sit_idle');
    c.step(0.01, idle, 5.8, 10.2);
    expect(c.action).toBe('stand_up');
    c.step(0.6, idle, 5.8, 10.2);
    expect(c.action).toBe('idle');
  });
  it('releases exactly once at .58 and never advances while paused', () => {
    const c = new CharacterAnimationController(0.58);
    c.play('throw_bottle');
    expect(c.play('taunt')).toBe(false);
    expect(c.step(0.37, idle, 5.8, 10.2)).toEqual([]);
    for (let i = 0; i < 3; i++) expect(c.step(0, idle, 5.8, 10.2)).toEqual([]);
    expect(c.step(0.01, idle, 5.8, 10.2)).toEqual([
      { action: 'throw_bottle', name: 'release', normalizedTime: 0.58 },
    ]);
    expect(c.step(0.5, idle, 5.8, 10.2)).toEqual([]);
    expect(c.action).toBe('idle');
  });
  it('handles prefix aliases without guessing missing bones', () => {
    const names = Object.values(boneAliases).map((a) => 'mixamorig:' + a[0]);
    expect(Object.keys(suggestBoneMap(names))).toHaveLength(17);
    expect(suggestBoneMap(['prop', 'camera'])).toEqual({});
  });
  it('uses the imported throw duration and release marker', () => {
    const c = new CharacterAnimationController(0.4, undefined, { throw_bottle: 2.2 });
    c.play('throw_bottle');
    expect(c.step(0.87, idle, 5.8, 10.2)).toEqual([]);
    expect(c.step(0, idle, 5.8, 10.2)).toEqual([]);
    expect(c.step(0.02, idle, 5.8, 10.2)).toEqual([
      { action: 'throw_bottle', name: 'release', normalizedTime: 0.4 },
    ]);
    expect(c.busy).toBe(true);
    expect(c.step(1.32, idle, 5.8, 10.2)).toEqual([]);
    expect(c.action).toBe('idle');
  });
  it('finishes taking before drinking and cancels queued actions on an explicit throw', () => {
    const c = new CharacterAnimationController(0.4, undefined, { pickup: 0.35, drink: 0.5 });
    c.playSequence(['pickup', 'drink']);
    c.step(0.1, { ...idle, drinking: true }, 5.8, 10.2);
    expect(c.action).toBe('pickup');
    c.step(0.26, { ...idle, drinking: true }, 5.8, 10.2);
    expect(c.action).toBe('drink');
    c.step(0.51, idle, 5.8, 10.2);
    expect(c.action).toBe('idle');
    c.playSequence(['pickup', 'drink']);
    c.play('throw_bottle');
    c.step(0.7, idle, 5.8, 10.2);
    expect(c.action).toBe('idle');
  });
  it('loops the victory dance only while the level is won', () => {
    const c = new CharacterAnimationController();
    c.step(0.1, { ...idle, victory: true }, 5.8, 10.2);
    expect(c.action).toBe('celebrate');
    c.step(10, { ...idle, victory: true }, 5.8, 10.2);
    expect(c.action).toBe('celebrate');
    c.step(0.1, idle, 5.8, 10.2);
    expect(c.action).toBe('idle');
    c.play('celebrate', true);
    c.step(1, idle, 5.8, 10.2);
    expect(c.action).toBe('celebrate');
    c.step(4, idle, 5.8, 10.2);
    expect(c.action).toBe('idle');
    c.play('celebrate', true);
    c.step(0.1, { ...idle, speed: 5.8 }, 5.8, 10.2);
    expect(c.action).toBe('walk');
    c.play('throw_bottle');
    expect(c.play('celebrate', true)).toBe(false);
  });
});
