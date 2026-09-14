import { expect, it } from 'vitest';
import { ReactiveCrowd } from './reactive-crowd.js';

it('taunts nearby visible people individually, moves them away and respects blocked routes', () => {
  const crowd = new ReactiveCrowd([
    { x: 3, z: 0 },
    { x: -3, z: 0 },
    { x: 20, z: 0 },
  ]);
  expect(crowd.taunt({ x: 0, z: 0 }, (_a, b) => b.x > 0)).toBe(1);
  crowd.step(1, () => true);
  expect(crowd.people[0]!.position.x).toBeGreaterThan(3);
  expect(crowd.people[1]!.frightened).toBe(0);
  const before = crowd.people[0]!.position.x;
  crowd.step(1, () => false);
  expect(crowd.people[0]!.position.x).toBe(before);
  expect(crowd.taunted.size).toBe(1);
});
