import type { BoneMap, CharacterConfig, ClipSource } from '../humanoid/schema.js';

/** Mixamo auto-rigged dancers for Nana Plaza.
 *
 * All three came back from Mixamo on the standard `mixamorig:` skeleton, so one bone map serves
 * every one of them — and so do the dance clips, which is why the clips live in their own files
 * and are shared rather than baked into each body.
 *
 * Only the dances came from Mixamo. `idle`, `walk` and everything else fall through to the shared
 * motion library, which is authored against humanoid bones and needs no clip of its own.
 */
export const mixamoBones: BoneMap = {
  hips: 'mixamorig:Hips',
  spine: 'mixamorig:Spine',
  chest: 'mixamorig:Spine2',
  neck: 'mixamorig:Neck',
  head: 'mixamorig:Head',
  leftUpperArm: 'mixamorig:LeftArm',
  leftLowerArm: 'mixamorig:LeftForeArm',
  leftHand: 'mixamorig:LeftHand',
  rightUpperArm: 'mixamorig:RightArm',
  rightLowerArm: 'mixamorig:RightForeArm',
  rightHand: 'mixamorig:RightHand',
  leftUpperLeg: 'mixamorig:LeftUpLeg',
  leftLowerLeg: 'mixamorig:LeftLeg',
  leftFoot: 'mixamorig:LeftFoot',
  rightUpperLeg: 'mixamorig:RightUpLeg',
  rightLowerLeg: 'mixamorig:RightLeg',
  rightFoot: 'mixamorig:RightFoot',
};

/** The four Mixamo dances, each in its own geometry-free file. */
const clip = (file: string, action: 'dance' | 'celebrate' | 'taunt'): ClipSource => ({
  model: `/characters/animations/${file}.glb`,
  bones: mixamoBones,
  animations: { [action]: 'dance' },
});

/** Shared settings; the dancers differ only in body, dance and height. */
const dancerBase = {
  height: 1.75,
  mouthOffset: [0, 0.02, 0.08] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  bones: mixamoBones,
  animations: {},
  attachments: {
    bottle_right_hand: {
      socket: 'right_hand' as const,
      position: [0, 0.06, 0.02] as [number, number, number],
      rotation: [0, 0, Math.PI] as [number, number, number],
      scale: [0.55, 0.55, 0.55] as [number, number, number],
    },
  },
  armClearance: 0.2,
  walkSpeed: 4.6,
  runSpeed: 8,
  cycleSpeeds: { walk: 2.2, run: 4.4 },
  crossfade: 0.2,
  throwReleaseTime: 0.4,
};

/** Dressed dancer for the bar floor. */
export const dancerBeachConfig: CharacterConfig = {
  ...dancerBase,
  id: 'dancer-beach',
  model: '/characters/dancer-beach.glb',
  clipSources: [clip('dance-basic', 'dance'), clip('dance-wave', 'celebrate')],
  motionDurations: { dance: 15.3, celebrate: 16 },
};

/** Club dancer, 18+ cast. */
export const dancerClubConfig: CharacterConfig = {
  ...dancerBase,
  id: 'dancer-club',
  model: '/characters/dancer-club.glb',
  clipSources: [clip('dance-belly', 'dance'), clip('dance-tut', 'celebrate')],
  motionDurations: { dance: 19.6, celebrate: 16.9 },
};

/** Second club dancer; the cheapest of the three at 25'553 triangles. */
export const dancerSlipConfig: CharacterConfig = {
  ...dancerBase,
  id: 'dancer-slip',
  model: '/characters/dancer-slip.glb',
  clipSources: [clip('dance-tut', 'dance'), clip('dance-belly', 'celebrate')],
  motionDurations: { dance: 16.9, celebrate: 19.6 },
};

export const dancerConfigs = [dancerBeachConfig, dancerClubConfig, dancerSlipConfig];
