import { describe, expect, it } from 'vitest';
import type { InputActions } from '@tobi/contracts';
import { Locomotion } from './locomotion.js';

const config = {
  walkSpeed: 4,
  sprintSpeed: 8,
  acceleration: 100,
  gravity: -20,
  jumpSpeed: 8,
  coyoteSeconds: 0.1,
  jumpBufferSeconds: 0.12,
  maxStamina: 100,
  staminaDrainPerSecond: 25,
  staminaRegenPerSecond: 20,
  staminaRegenDelay: 0.8,
  staminaRestartThreshold: 20,
};
const idle: InputActions = {
  moveX: 0,
  moveZ: 0,
  lookX: 0,
  lookY: 0,
  jumpPressed: false,
  sprintHeld: false,
  interactPressed: false,
  specialPressed: false,
  celebratePressed: false,
  throwPressed: false,
  flirtPressed: false,
};

describe('Locomotion', () => {
  it('normalizes diagonal motion and rotates movement with camera yaw', () => {
    const player = new Locomotion(config);
    const velocity = player.step({ ...idle, moveX: 1, moveZ: 1 }, 0, true, 0.1);
    expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(4);
    const rotated = new Locomotion(config).step({ ...idle, moveZ: 1 }, Math.PI / 2, true, 0.1);
    expect(rotated.x).toBeCloseTo(4);
    expect(rotated.z).toBeCloseTo(0);
  });
  it('requires recovery after exhaustion and never permits negative stamina', () => {
    const player = new Locomotion(config);
    for (let i = 0; i < 240; i++)
      player.step({ ...idle, moveZ: 1, sprintHeld: true }, 0, true, 1 / 60);
    expect(player.stamina).toBeCloseTo(0);
    player.step({ ...idle, moveZ: 1, sprintHeld: true }, 0, true, 1 / 60);
    expect(player.sprinting).toBe(false);
    expect(player.stamina).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < 180; i++) player.step(idle, 0, true, 1 / 60);
    expect(player.stamina).toBeGreaterThan(20);
    player.step({ ...idle, moveZ: 1, sprintHeld: true }, 0, true, 1 / 60);
    expect(player.sprinting).toBe(true);
  });
  it('supports coyote jumps but prevents another airborne jump', () => {
    const player = new Locomotion(config);
    player.step(idle, 0, true, 1 / 60);
    const first = player.step({ ...idle, jumpPressed: true }, 0, false, 1 / 60);
    expect(first.y).toBe(8);
    const second = player.step({ ...idle, jumpPressed: true }, 0, false, 1 / 60);
    expect(second.y).toBeLessThan(8);
  });
  it('does not consume stamina for stationary sprint input', () => {
    const player = new Locomotion(config);
    player.step({ ...idle, sprintHeld: true }, 0, true, 1);
    expect(player.stamina).toBe(100);
  });
});
