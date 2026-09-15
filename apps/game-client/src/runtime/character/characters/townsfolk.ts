import type { BoneMap, CharacterConfig } from '../humanoid/schema.js';
import { mixamoBones } from './dancers.js';

/** Extras built from the Quaternius Universal Base Characters kit (CC0).
 *
 * The kit ships two base bodies and a set of head pieces on one shared 65-joint Unreal-style
 * skeleton, so any hairstyle fits any body. `tools/characters/build-quaternius.py` picks a
 * combination and writes a single GLB; these four are the first of them.
 *
 * It ships no animations and, in the free edition, no clothing. Movement therefore comes entirely
 * from the shared motion library plus the Mixamo dance clips, which retarget cleanly because the
 * runtime maps both skeletons onto the same humanoid vocabulary. The bare bodies suit beach and
 * club roles; a uniformed part needs a dressed model.
 */
export const quaterniusBones: BoneMap = {
  hips: 'pelvis',
  spine: 'spine_01',
  chest: 'spine_03',
  neck: 'neck_01',
  head: 'Head',
  leftUpperArm: 'upperarm_l',
  leftLowerArm: 'lowerarm_l',
  leftHand: 'hand_l',
  rightUpperArm: 'upperarm_r',
  rightLowerArm: 'lowerarm_r',
  rightHand: 'hand_r',
  leftUpperLeg: 'thigh_l',
  leftLowerLeg: 'calf_l',
  leftFoot: 'foot_l',
  rightUpperLeg: 'thigh_r',
  rightLowerLeg: 'calf_r',
  rightFoot: 'foot_r',
};

/** Dances borrowed from the Mixamo dancers; the runtime retargets between the two skeletons. */
const borrowedDance = (file: string, action: 'dance' | 'celebrate') => ({
  model: `/characters/animations/${file}.glb`,
  bones: mixamoBones,
  animations: { [action]: 'dance' },
});

const townsfolkBase = {
  height: 1.8,
  mouthOffset: [0, 0.02, 0.08] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  bones: quaterniusBones,
  animations: {},
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
  clipSources: [borrowedDance('dance-wave', 'dance'), borrowedDance('dance-basic', 'celebrate')],
  motionDurations: { dance: 16, celebrate: 15.3 },
};

const build = (id: string, file: string, height: number): CharacterConfig => ({
  ...townsfolkBase,
  id,
  model: `/characters/townsfolk/${file}.glb`,
  height,
});

export const townsfolkConfigs: CharacterConfig[] = [
  build('townsfolk-woman-long', 'woman-long-light', 1.72),
  build('townsfolk-woman-buns', 'woman-buns-dark', 1.7),
  build('townsfolk-man-beard', 'man-parted-beard', 1.83),
  build('townsfolk-man-buzzed', 'man-buzzed-dark', 1.8),
];
