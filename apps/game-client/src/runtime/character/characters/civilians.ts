import type { BoneMap, CharacterConfig, ClipSource, HumanoidAction } from '../humanoid/schema.js';

const bones = (namespace: string): BoneMap => ({
  hips: `${namespace}Hips`,
  spine: `${namespace}Spine`,
  chest: `${namespace}Spine2`,
  neck: `${namespace}Neck`,
  head: `${namespace}Head`,
  leftUpperArm: `${namespace}LeftArm`,
  leftLowerArm: `${namespace}LeftForeArm`,
  leftHand: `${namespace}LeftHand`,
  rightUpperArm: `${namespace}RightArm`,
  rightLowerArm: `${namespace}RightForeArm`,
  rightHand: `${namespace}RightHand`,
  leftUpperLeg: `${namespace}LeftUpLeg`,
  leftLowerLeg: `${namespace}LeftLeg`,
  leftFoot: `${namespace}LeftFoot`,
  rightUpperLeg: `${namespace}RightUpLeg`,
  rightLowerLeg: `${namespace}RightLeg`,
  rightFoot: `${namespace}RightFoot`,
});

export const civilianBones = {
  joe: bones('mixamorig7:'),
  josh: bones('mixamorig:'),
  woman: bones('mixamorig2:'),
  avaturn: bones(''),
} as const;

const clip = (file: string, sourceBones: BoneMap, action: HumanoidAction): ClipSource => ({
  model: `/characters/animations/civilians/${file}.glb`,
  bones: sourceBones,
  animations: { [action]: action },
  rootMotion: 'ignore',
});

/** Shared clips remain independent of the visible body. Any configured humanoid can therefore
 * walk, sit, flee or dance with the same download instead of shipping its body eight times. */
export const civilianMotionLibrary: ClipSource[] = [
  clip('walking', civilianBones.josh, 'walk'),
  clip('walking2', civilianBones.woman, 'walk_alt'),
  clip('walking3', civilianBones.woman, 'walk_alt_2'),
  clip('walking-backwards', civilianBones.woman, 'walk_backward'),
  clip('run-away', civilianBones.joe, 'run_away'),
  clip('sitting', civilianBones.josh, 'sit_idle'),
  clip('dance-hard', civilianBones.joe, 'dance_hard'),
  clip('dance-medium', civilianBones.joe, 'dance_medium'),
];

const shared = {
  mouthOffset: [0, 0.02, 0.08] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  animations: {},
  clipSources: civilianMotionLibrary,
  attachments: {
    bottle_right_hand: {
      socket: 'right_hand' as const,
      position: [0, 0.06, 0.02] as [number, number, number],
      rotation: [0, 0, Math.PI] as [number, number, number],
      scale: [0.55, 0.55, 0.55] as [number, number, number],
    },
  },
  armClearance: 0.22,
  walkSpeed: 5,
  runSpeed: 9,
  cycleSpeeds: { walk: 2.3, run: 4.6 },
  crossfade: 0.18,
  throwReleaseTime: 0.4,
  motionDurations: {
    walk: 1.17,
    walk_alt: 1.03,
    walk_alt_2: 1,
    walk_backward: 1.5,
    run_away: 1.83,
    sit_idle: 5.93,
    dance_hard: 10.83,
    dance_medium: 2.33,
  },
};

export const joeConfig: CharacterConfig = {
  ...shared,
  id: 'civilian-joe',
  model: '/characters/civilians/joe.glb',
  height: 1.82,
  bones: civilianBones.joe,
  actionOverrides: {
    walk: 'walk',
    run: 'run_away',
    dance: 'dance_hard',
    celebrate: 'dance_medium',
  },
};

export const joshConfig: CharacterConfig = {
  ...shared,
  id: 'civilian-josh',
  model: '/characters/civilians/josh.glb',
  height: 1.84,
  bones: civilianBones.josh,
  actionOverrides: {
    walk: 'walk_alt',
    run: 'run_away',
    dance: 'dance_medium',
    celebrate: 'dance_hard',
  },
};

export const womanConfig: CharacterConfig = {
  ...shared,
  id: 'civilian-woman',
  model: '/characters/civilians/woman.glb',
  height: 1.72,
  bones: civilianBones.woman,
  actionOverrides: {
    walk: 'walk_alt_2',
    run: 'run_away',
    dance: 'dance_medium',
    celebrate: 'dance_hard',
  },
};

/** Named portrait character. Dynamic V2 keeps the separate eye/facial meshes and its native idle;
 * `Casting` guarantees that this configuration can be handed out only once per level. */
export const glanzmannConfig: CharacterConfig = {
  ...shared,
  id: 'glanzmann',
  model: '/characters/special/glanzmann.glb',
  height: 1.81,
  bones: civilianBones.avaturn,
  animations: { idle: 'avaturn_animation' },
  actionOverrides: {
    walk: 'walk',
    run: 'run_away',
    dance: 'dance_medium',
    celebrate: 'dance_hard',
  },
  motionDurations: { ...shared.motionDurations, idle: 8.08 },
};

export const civilianConfigs = [joeConfig, joshConfig, womanConfig, glanzmannConfig];
