import { describe, expect, it } from 'vitest';
import {
  Casting,
  cast,
  type CastRole,
} from '../../../apps/game-client/src/runtime/character/characters/casting.js';
import {
  normaliseBoneName,
  suggestBoneMap,
} from '../../../apps/game-client/src/runtime/character/humanoid/schema.js';

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

  it('keeps an alias intact: spine_03 is a bone name, not spine with a suffix', () => {
    expect(normaliseBoneName('spine_03', false)).toBe('spine03');
    expect(normaliseBoneName('spine_03')).toBe('spine');
  });

  it('gives chest the upper spine even when a lower one reads like another rig alias', () => {
    // A Mixamo rig that went through FBX: Spine_02 is the lower bone, Spine2_04 the chest.
    const map = suggestBoneMap([
      'mixamorig:Hips_01',
      'mixamorig:Spine_02',
      'mixamorig:Spine1_03',
      'mixamorig:Spine2_04',
      'mixamorig:Neck_05',
    ]);
    expect(map.spine).toBe('mixamorig:Spine_02');
    expect(map.chest).toBe('mixamorig:Spine2_04');
  });

  it('gives the Unreal rig its own numbering', () => {
    const map = suggestBoneMap(['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head']);
    expect(map.spine).toBe('spine_01');
    expect(map.chest).toBe('spine_03');
  });
});
