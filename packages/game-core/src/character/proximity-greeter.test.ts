import { describe, expect, it } from 'vitest';
import { ProximityGreeter } from './proximity-greeter.js';

const config = {
  range: 3,
  perSpeakerSeconds: 20,
  betweenSeconds: 4,
  sameFloorWithin: 2,
};
const people = [
  { id: 0, x: 0, z: 0 },
  { id: 1, x: 1.5, z: 0 },
  { id: 2, x: 30, z: 30 },
];
const at = (x: number, z: number, y = 0) => ({ x, y, z });

describe('proximity greetings', () => {
  it('greets when Tobi arrives and stays quiet while he loiters', () => {
    const greeter = new ProximityGreeter(config);
    expect(greeter.step(0.1, at(20, 20), people)).toBeNull();
    // Walking up to someone triggers exactly one greeting.
    expect(greeter.step(0.1, at(0.5, 0), people)).toBe(0);
    for (let i = 0; i < 100; i++) expect(greeter.step(0.1, at(0.5, 0), people)).toBeNull();
  });

  it('never greets from out of range', () => {
    const greeter = new ProximityGreeter(config);
    for (let i = 0; i < 50; i++) expect(greeter.step(0.1, at(10, 10), people)).toBeNull();
  });

  it('spaces out greetings so a crowd does not all speak at once', () => {
    const greeter = new ProximityGreeter(config);
    // Both neighbours are in range on the same tick; only the nearest speaks.
    expect(greeter.step(0.1, at(0.4, 0), people)).toBe(0);
    expect(greeter.step(0.1, at(0.4, 0), people)).toBeNull();
  });

  it('lets the second person greet once the shared cooldown has passed', () => {
    const greeter = new ProximityGreeter(config);
    expect(greeter.step(0.1, at(0.4, 0), people)).toBe(0);
    // Step away so person 1 is re-armed, wait out the shared gap, then walk back.
    for (let i = 0; i < 10; i++) greeter.step(0.5, at(20, 20), people);
    expect(greeter.step(0.1, at(1.4, 0), people)).toBe(1);
  });

  it('makes the same person wait a long time before greeting again', () => {
    const greeter = new ProximityGreeter(config);
    const alone = [people[0]!];
    expect(greeter.step(0.1, at(0.4, 0), alone)).toBe(0);
    // Leaving and returning is not enough on its own; the per-speaker cooldown still applies.
    for (let i = 0; i < 10; i++) greeter.step(0.5, at(20, 20), alone);
    expect(greeter.step(0.1, at(0.4, 0), alone)).toBeNull();
    // After the full cooldown they greet again.
    for (let i = 0; i < 40; i++) greeter.step(0.5, at(20, 20), alone);
    expect(greeter.step(0.1, at(0.4, 0), alone)).toBe(0);
  });

  it('ignores somebody standing one storey up', () => {
    const greeter = new ProximityGreeter(config);
    const upstairs = [{ id: 7, x: 0, z: 0, y: 4.5 }];
    expect(greeter.step(0.1, at(0.2, 0, 0), upstairs)).toBeNull();
    // On their floor they do greet.
    expect(greeter.step(0.1, at(0.2, 0, 4.5), upstairs)).toBe(7);
  });
});
