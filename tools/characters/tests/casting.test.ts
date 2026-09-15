import { describe, expect, it } from 'vitest';
import {
  Casting,
  cast,
  type CastRole,
} from '../../../apps/game-client/src/runtime/character/characters/casting.js';
import { normaliseBoneName } from '../../../apps/game-client/src/runtime/character/humanoid/schema.js';

describe('casting', () => {
  it('hands out a one-per-level model only once', () => {
    const casting = new Casting();
    // Seed 2 lands on Chris, the unique member of the tourist row.
    expect(casting.pick('tourist', 2)?.id).toBe('chris');
    expect(casting.spentOn('chris')).toBe(true);
    // Every later seed, including the one that chose him, now falls back to the others.
    for (let seed = 0; seed < 30; seed++) {
      expect(casting.pick('tourist', seed)?.id).not.toBe('chris');
    }
  });

  it('keeps Sam and Chris apart: spending one leaves the other available', () => {
    const casting = new Casting();
    expect(casting.pick('expat', 2)?.id).toBe('sam');
    expect(casting.pick('tourist', 2)?.id).toBe('chris');
  });

  it('starts over for the next level', () => {
    const casting = new Casting();
    casting.pick('tourist', 2);
    casting.reset();
    expect(casting.pick('tourist', 2)?.id).toBe('chris');
  });

  it('is deterministic for a given seed', () => {
    const a = new Casting();
    const b = new Casting();
    for (const role of Object.keys(cast) as CastRole[]) {
      expect(a.pick(role, 7)?.id).toBe(b.pick(role, 7)?.id);
    }
  });

  it('casts every role with something', () => {
    const casting = new Casting();
    for (const role of Object.keys(cast) as CastRole[]) {
      expect(casting.pick(role, 1), role).not.toBeNull();
    }
  });
});

describe('bone names across exporters', () => {
  it('ignores the numeric suffix a glTF round-trip adds', () => {
    expect(normaliseBoneName('mixamorig:Hips_32')).toBe(normaliseBoneName('Hips'));
    expect(normaliseBoneName('CC_Base_L_Thigh_04')).toBe(normaliseBoneName('CC_Base_L_Thigh'));
    expect(normaliseBoneName('Armature|Armature|Head')).toBe(normaliseBoneName('Head'));
  });

  it('does not collapse bones that only differ by a meaningful number', () => {
    expect(normaliseBoneName('Spine01_010')).not.toBe(normaliseBoneName('Spine02_09'));
  });
});
