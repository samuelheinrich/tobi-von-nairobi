import { describe, expect, it } from 'vitest';
import { CabinPuzzle, type CabinPuzzleConfig } from './cabin-puzzle.js';
import type { RestSpot } from '../character/seating.js';
const config: CabinPuzzleConfig = {
  routes: [{ id: 'crew', x: 0, floor: 0, minZ: -10, maxZ: 10, speed: 2, start: -6, direction: 1 }],
  hidingSequence: [
    { spotId: 'seat', crewId: 'crew', hint: 'sit' },
    { spotId: 'wc', crewId: 'crew', hint: 'wc' },
  ],
  upperFloor: 4.4,
  finishZ: 20,
  consoleWaypoint: { x: 0, y: 5.5, z: 12 },
};
const seat: RestSpot = {
  id: 'seat',
  label: 'seat',
  kind: 'seat',
  position: { x: 1, y: 1.1, z: 0 },
  exit: { x: 0, y: 1.1, z: 0 },
  yaw: 0,
};
const toilet: RestSpot = { ...seat, id: 'wc', kind: 'toilet' };
const seen = () => true;
function wait(p: CabinPuzzle, spot: RestSpot, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) p.step(1 / 60, spot.position, spot, seen);
}
describe('cabin puzzle', () => {
  it('requires the ordered hiding places and an actual passing crew member', () => {
    const p = new CabinPuzzle(config);
    wait(p, toilet, 12);
    expect(p.stage).toBe(0);
    wait(p, seat, 22);
    expect(p.stage).toBe(1);
    expect(p.ready).toBe(false);
    wait(p, toilet, 22);
    expect(p.stage).toBe(2);
    p.step(0.1, { x: 0, y: 1.1, z: 30 }, null, seen);
    expect(p.ready).toBe(false);
    p.step(0.1, { x: 0, y: 5.3, z: 30 }, null, seen);
    expect(p.ready).toBe(false);
    p.step(0.1, { x: 0, y: 5.3, z: 12 }, null, seen);
    p.step(0.1, { x: 0, y: 5.3, z: 30 }, null, seen);
    expect(p.ready).toBe(true);
  });
  it('does not give hiding credit for immediately leaving the seat', () => {
    const p = new CabinPuzzle(config);
    p.step(0.01, seat.position, seat, seen);
    for (let i = 0; i < 600; i++) p.step(1 / 60, { x: 30, y: 1.1, z: 0 }, null, seen);
    expect(p.stage).toBe(0);
  });
  it('catches visible Tobi, respects cover and separates the decks', () => {
    const p = new CabinPuzzle(config);
    wait(p, toilet, 3);
    const at = () => ({ ...p.crew[0]!.position, z: p.crew[0]!.position.z + 2 });
    expect(p.step(0.01, at(), null, () => false)).toBeNull();
    expect(p.step(0.01, { ...at(), y: 5.5 }, null, seen)).toBeNull();
    expect(p.step(0.01, at(), null, seen)).toBe('caught');
    expect(p.returns).toBe(1);
  });
  it('three taunts reset progress even while hidden, then a fresh attempt is possible', () => {
    const p = new CabinPuzzle(config);
    wait(p, seat, 8);
    expect(p.stage).toBe(1);
    p.taunt();
    p.taunt();
    expect(p.step(0.01, seat.position, seat, seen)).toBeNull();
    p.taunt();
    expect(p.step(0.01, seat.position, seat, seen)).toBe('disruptive');
    expect(p.stage).toBe(0);
    expect(p.strikes).toBe(0);
    wait(p, seat, 22);
    expect(p.stage).toBe(1);
  });
});
