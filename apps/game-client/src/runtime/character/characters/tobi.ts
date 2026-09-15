import type { CharacterConfig } from '../humanoid/schema.js';
export const tobiBones = {
  hips: 'Hips',
  spine: 'Spine',
  chest: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  leftUpperArm: 'LeftArm',
  leftLowerArm: 'LeftForeArm',
  leftHand: 'LeftHand',
  rightUpperArm: 'RightArm',
  rightLowerArm: 'RightForeArm',
  rightHand: 'RightHand',
  leftUpperLeg: 'LeftUpLeg',
  leftLowerLeg: 'LeftLeg',
  leftFoot: 'LeftFoot',
  rightUpperLeg: 'RightUpLeg',
  rightLowerLeg: 'RightLeg',
  rightFoot: 'RightFoot',
};
export const tobiConfig: CharacterConfig = {
  id: 'tobi',
  model: '/characters/tobi.glb',
  height: 2.17,
  mouthOffset: [0, 0.015, 0.09],
  rotation: [0, 0, 0],
  bones: tobiBones,
  animations: { idle: 'IdleV4.2(maya_head)' },
  clipSources: [
    {
      model: '/characters/animations/chicken-dance.glb',
      bones: tobiBones,
      animations: { celebrate: 'celebrate' },
    },
    {
      model: '/characters/animations/fight-dance.glb',
      bones: tobiBones,
      animations: { taunt: 'taunt' },
    },
    {
      model: '/characters/animations/pickup-bottle.glb',
      bones: tobiBones,
      animations: { pickup: 'pickup' },
    },
    {
      model: '/characters/animations/throw-bottle.glb',
      bones: tobiBones,
      animations: { throw_bottle: 'throw_bottle' },
    },
  ],
  // Short pickup + drink fit the existing 0.85-second automatic consumption cycle.
  motionDurations: {
    celebrate: 4.7666666667,
    taunt: 3.3,
    pickup: 0.35,
    drink: 0.5,
    throw_bottle: 2.2,
  },
  clipRanges: { pickup: [0.2, 0.4] },
  attachments: {
    bottle_right_hand: {
      socket: 'right_hand',
      position: [0, 0.065, 0.025],
      rotation: [0, 0, Math.PI],
      scale: [0.55, 0.55, 0.55],
    },
    phone_right_hand: {
      socket: 'right_hand',
      position: [0, 0.075, 0.025],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    cigarette_right_hand: {
      socket: 'right_hand',
      position: [0.025, 0.1, 0.01],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },
  armClearance: 0.23,
  walkSpeed: 5.8,
  runSpeed: 10.2,
  cycleSpeeds: { walk: 2.4, run: 4.8 },
  crossfade: 0.16,
  // Forward arm extension, approximately source frame 27 at 30 fps.
  throwReleaseTime: 0.4,
};
export const tobiDrunkConfig: CharacterConfig = {
  ...tobiConfig,
  id: 'tobi-drunk',
  model: '/characters/tobi-drunk.glb',
  animations: { idle: 'avaturn_animation' },
};
