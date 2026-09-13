import { describe, expect, it } from 'vitest';
import { levelSchema } from './content.js';

const data = {
  schemaVersion: 1,
  id: 'test',
  worldId: 'bali',
  title: 'Test',
  subtitle: '',
  maxWanted: 0,
  spawn: { x: 0, y: 1, z: 0 },
  destination: { id: 'home', position: { x: 0, y: 0, z: 1 }, radius: 2 },
  pickups: [{ id: 'one', itemId: 'bottle', position: { x: 0, y: 0, z: 0 } }],
  objectives: [
    { id: 'a', type: 'collect', itemId: 'bottle', amount: 1, after: [] },
    { id: 'b', type: 'reach', targetId: 'home', after: ['a'] },
  ],
};

describe('Level schema', () => {
  it('accepts a resolvable level', () => {
    expect(levelSchema.safeParse(data).success).toBe(true);
  });
  it('rejects duplicate pickup IDs and impossible collection amounts', () => {
    expect(
      levelSchema.safeParse({ ...data, pickups: [data.pickups[0], data.pickups[0]] }).success,
    ).toBe(false);
    expect(
      levelSchema.safeParse({ ...data, objectives: [{ ...data.objectives[0], amount: 2 }] })
        .success,
    ).toBe(false);
  });
  it('rejects dependency cycles and missing targets before scene loading', () => {
    expect(
      levelSchema.safeParse({
        ...data,
        objectives: [{ ...data.objectives[0], after: ['b'] }, data.objectives[1]],
      }).success,
    ).toBe(false);
    expect(
      levelSchema.safeParse({
        ...data,
        objectives: [{ ...data.objectives[1], targetId: 'missing' }],
      }).success,
    ).toBe(false);
  });
});
