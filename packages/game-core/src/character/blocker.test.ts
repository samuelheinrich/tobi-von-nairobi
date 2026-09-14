import { describe, expect, it } from 'vitest';
import { Blocker, type BlockerConfig } from './blocker.js';

const config: BlockerConfig = {
  patrolMin: -10,
  patrolMax: 10,
  laneMin: -1.2,
  laneMax: 1.2,
  patrolSpeed: 2,
  interceptSpeed: 4,
  noticeRange: 6,
  bodyRadius: 1,
  shoutSeconds: 3,
  relentSeconds: 5,
  standAsideSeconds: 7,
  asideX: 2.9,
  blockSide: 1,
};

const far = { x: 0, y: 1, z: -40 };

describe('corridor blocker', () => {
  it('stays inside its patrol corridor when nobody is near', () => {
    const blocker = new Blocker(config, { x: 0, z: 0 });
    for (let i = 0; i < 400; i++) {
      blocker.step(0.1, far);
      expect(blocker.position.z).toBeGreaterThanOrEqual(config.patrolMin - 1e-9);
      expect(blocker.position.z).toBeLessThanOrEqual(config.patrolMax + 1e-9);
    }
  });

  it('moves between the player and the front of the train and spaces out its complaints', () => {
    const blocker = new Blocker(config, { x: 0, z: 5 });
    const player = { x: 0.4, y: 1, z: 0 };
    const shouts: number[] = [];
    // Stay inside the patience window so this case is about complaining, not about giving up.
    for (let i = 0; i < 45; i++) if (blocker.step(0.1, player)) shouts.push((i + 1) * 0.1);
    expect(blocker.state).toBe('BLOCK');
    // It plants itself between Tobi and the front of the train, inside its own lane.
    expect(blocker.position.z).toBeGreaterThan(player.z);
    expect(blocker.position.x).toBeLessThanOrEqual(config.laneMax);
    expect(shouts.length).toBeGreaterThan(1);
    for (let i = 1; i < shouts.length; i++)
      expect(shouts[i]! - shouts[i - 1]!).toBeGreaterThanOrEqual(config.shoutSeconds);
  });

  it('ignores a player who is still further away than its notice range', () => {
    const blocker = new Blocker(config, { x: 0, z: 9 });
    expect(blocker.step(0.1, { x: 0, y: 1, z: 0 })).toBe(false);
    expect(blocker.state).toBe('PATROL');
  });

  it('pushes an overlapping player out to the edge of its body and leaves others alone', () => {
    const blocker = new Blocker(config, { x: 0, z: 0 });
    const pushed = blocker.resolve({ x: 0.3, z: 0.2 });
    expect(pushed).not.toBeNull();
    expect(Math.hypot(pushed!.x - blocker.position.x, pushed!.z - blocker.position.z)).toBeCloseTo(
      config.bodyRadius,
      6,
    );
    expect(blocker.resolve({ x: 3, z: 0 })).toBeNull();
  });

  it('always gives up after its patience runs out, so a corridor never stays sealed', () => {
    const blocker = new Blocker(config, { x: 0, z: 2 });
    const player = { x: 0, y: 1, z: 0 };
    for (let i = 0; i < Math.ceil(config.relentSeconds / 0.1) + 1; i++) blocker.step(0.1, player);
    expect(blocker.state).toBe('ASIDE');
    expect(blocker.yielding).toBe(true);
    for (let i = 0; i < 20; i++) blocker.step(0.1, player);
    // It has pressed itself against the seats, out of the walking lane.
    expect(blocker.position.x).toBeCloseTo(config.asideX, 1);
  });

  it('yields at once when Tobi answers back', () => {
    const blocker = new Blocker(config, { x: 0, z: 2 });
    blocker.step(0.1, { x: 0, y: 1, z: 0 });
    expect(blocker.state).toBe('BLOCK');
    blocker.relent();
    blocker.step(0.1, { x: 0, y: 1, z: 0 });
    expect(blocker.state).toBe('ASIDE');
  });

  it('never reacts to a player on another storey', () => {
    const blocker = new Blocker(config, { x: 0, z: 0 });
    blocker.step(0.1, { x: 0, y: 9, z: 0.5 });
    expect(blocker.state).toBe('PATROL');
  });
});
