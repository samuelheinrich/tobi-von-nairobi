import type { BoneMap, CharacterConfig } from '../humanoid/schema.js';
import { mixamoBones } from './dancers.js';
import { tobiBones } from './tobi.js';

/** The rigged models available to cast NPCs, and which role each one stands in for.
 *
 * Everything here arrived already rigged; nothing was auto-rigged for it. Where a model brought
 * its own clips they are used, otherwise `idle` and `walk` come from the shared motion library and
 * the dances are borrowed from the Mixamo dancers — the runtime retargets across skeletons.
 *
 * Most entries are **placeholders**. They stand in so a level can be populated and looked at; the
 * intent is to replace them with models that actually fit the part.
 */

/** Character Creator rigs (`CC_Base_*`). Names carry the numeric suffix the glTF round-trip adds;
 * the adapter also matches without it, but keeping the real names makes the source obvious. */
const ccBones: BoneMap = {
  hips: 'CC_Base_Hip_02',
  spine: 'CC_Base_Waist_033',
  chest: 'CC_Base_Spine02_035',
  neck: 'CC_Base_NeckTwist01_036',
  head: 'CC_Base_Head_038',
  leftUpperArm: 'CC_Base_L_Upperarm_050',
  leftLowerArm: 'CC_Base_L_Forearm_051',
  leftHand: 'CC_Base_L_Hand_055',
  rightUpperArm: 'CC_Base_R_Upperarm_078',
  rightLowerArm: 'CC_Base_R_Forearm_079',
  rightHand: 'CC_Base_R_Hand_083',
  leftUpperLeg: 'CC_Base_L_Thigh_04',
  leftLowerLeg: 'CC_Base_L_Calf_05',
  leftFoot: 'CC_Base_L_Foot_06',
  rightUpperLeg: 'CC_Base_R_Thigh_018',
  rightLowerLeg: 'CC_Base_R_Calf_019',
  rightFoot: 'CC_Base_R_Foot_021',
};

/** A rig whose spine runs Spine02 → Spine01 → Spine from the hips up, against the usual order. */
const fitnessBones: BoneMap = {
  hips: 'Hips_00',
  spine: 'Spine01_010',
  chest: 'Spine02_09',
  neck: 'neck_020',
  head: 'Head_021',
  leftUpperArm: 'LeftArm_013',
  leftLowerArm: 'LeftForeArm_014',
  leftHand: 'LeftHand_015',
  rightUpperArm: 'RightArm_017',
  rightLowerArm: 'RightForeArm_018',
  rightHand: 'RightHand_019',
  leftUpperLeg: 'LeftUpLeg_01',
  leftLowerLeg: 'LeftLeg_02',
  leftFoot: 'LeftFoot_03',
  rightUpperLeg: 'RightUpLeg_05',
  rightLowerLeg: 'RightLeg_06',
  rightFoot: 'RightFoot_07',
};

const dance = (file: string, action: 'dance' | 'celebrate') => ({
  model: `/characters/animations/${file}.glb`,
  bones: mixamoBones,
  animations: { [action]: 'dance' },
});

/** Fourteen dances from one showcase download, each in its own geometry-free file.
 *
 * The pack held fifteen copies of the same body, one per dance, in a single 36,6 MiB file.
 * `split-characters.py` separated them, one body is kept and the dances are shared — 2,2 MiB of
 * clips instead of 26 MiB of near-identical girls. Any Mixamo-rigged figure can use them.
 */
export const poseDance = (index: number, action: 'dance' | 'celebrate' | 'taunt' = 'dance') => ({
  model: `/characters/animations/dance-pose-${String(index).padStart(2, '0')}.glb`,
  bones: mixamoBones,
  animations: { [action]: 'dance' },
});
const POSE_SECONDS = 9.33;

const shared = {
  mouthOffset: [0, 0.02, 0.08] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
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
};

/** Uniformed officer. The only model in the set that brought its own walk. */
export const copConfig: CharacterConfig = {
  ...shared,
  id: 'cop',
  model: '/characters/cast/cop.glb',
  height: 1.85,
  bones: mixamoBones,
  animations: { idle: 'Idle', walk: 'Walking' },
  motionDurations: { walk: 1 },
};

export const valeryConfig: CharacterConfig = {
  ...shared,
  id: 'valery',
  model: '/characters/cast/valery.glb',
  height: 1.72,
  bones: mixamoBones,
  clipSources: [poseDance(7, 'dance'), poseDance(11, 'celebrate')],
  motionDurations: { dance: 9.33, celebrate: 9.33 },
};

export const ladyboyConfig: CharacterConfig = {
  ...shared,
  id: 'ladyboy',
  model: '/characters/cast/ladyboy.glb',
  height: 1.76,
  bones: ccBones,
  clipSources: [dance('dance-tut', 'dance'), dance('dance-belly', 'celebrate')],
  motionDurations: { dance: 16.9, celebrate: 19.6 },
};

export const miaConfig: CharacterConfig = {
  ...shared,
  id: 'mia',
  model: '/characters/cast/mia.glb',
  height: 1.7,
  bones: mixamoBones,
  clipSources: [poseDance(2, 'dance'), poseDance(6, 'celebrate')],
  motionDurations: { dance: 9.33, celebrate: 9.33 },
};

export const fitnessConfig: CharacterConfig = {
  ...shared,
  id: 'fitness',
  model: '/characters/cast/fitness.glb',
  height: 1.74,
  bones: fitnessBones,
  clipSources: [dance('dance-wave', 'dance'), dance('dance-tut', 'celebrate')],
  motionDurations: { dance: 16, celebrate: 16.9 },
};

/** Club dancer that came back from Mixamo with its own hip-hop clip, so it needs no borrowed one.
 *
 * The suffixed bone names are the ones the FBX round-trip produced. `chest` deliberately names
 * `Spine2_04` and not `Spine_02`: this rig carries both, and they are two different bones.
 */
export const hipHopConfig: CharacterConfig = {
  ...shared,
  id: 'dancer-hiphop',
  model: '/characters/cast/dancer-hiphop.glb',
  height: 1.74,
  bones: {
    ...mixamoBones,
    chest: 'mixamorig:Spine2_04',
  },
  animations: { dance: 'mixamo.com' },
  motionDurations: { dance: 4.4666666984558105 },
};

/** Ravers for the Street Parade: 90s Dutch gabbers, all on Mixamo rigs.
 *
 * Three brought a clip of their own; the fourth borrows one. They are the detailed figures near
 * the camera — the route itself stays on thin instances.
 */
const gabber = (
  id: string,
  file: string,
  height: number,
  seconds: number | null,
): CharacterConfig => ({
  ...shared,
  id,
  model: `/characters/party/${file}.glb`,
  height,
  bones: mixamoBones,
  ...(seconds === null
    ? {
        animations: {},
        clipSources: [dance('dance-club', 'dance')],
        motionDurations: { dance: 10.83 },
      }
    : { animations: { dance: 'Animation' }, motionDurations: { dance: seconds } }),
});
export const gabberAnitaConfig = gabber('gabber-anita', 'gabber-anita', 1.7, 10.97);
export const gabberFemaleConfig = gabber('gabber-female', 'gabber-female', 1.72, 8.3);
export const gabberSjonnieConfig = gabber('gabber-sjonnie', 'gabber-sjonnie', 1.84, 8.3);
export const gabberDutchConfig = gabber('gabber-dutch', 'gabber-dutch', 1.86, null);

/** Bar dancer that arrived with twelve Mixamo clips; three of them are used directly. */
export const elyConfig: CharacterConfig = {
  ...shared,
  id: 'dancer-ely',
  model: '/characters/cast/dancer-ely.glb',
  height: 1.73,
  bones: mixamoBones,
  animations: {
    dance: 'Armature.010|mixamo.com|Layer0',
    celebrate: 'Armature.003|mixamo.com|Layer0',
    taunt: 'Armature.004|mixamo.com|Layer0',
  },
  motionDurations: { dance: 25.57, celebrate: 15.27, taunt: 3.23 },
};

/** The body that came with those dances. */
export const poleConfig: CharacterConfig = {
  ...shared,
  id: 'dancer-pole',
  model: '/characters/cast/dancer-pole.glb',
  height: 1.71,
  bones: mixamoBones,
  clipSources: [poseDance(1, 'dance'), poseDance(4, 'celebrate'), poseDance(10, 'taunt')],
  motionDurations: { dance: POSE_SECONDS, celebrate: POSE_SECONDS, taunt: POSE_SECONDS },
};

/** Avaturn avatars of real people. One each per level, never a crowd of them. */
export const samConfig: CharacterConfig = {
  ...shared,
  id: 'sam',
  model: '/characters/cast/sam.glb',
  height: 1.8,
  bones: tobiBones,
  animations: { idle: 'IdleV4.2(maya_head)' },
  clipSources: [dance('dance-basic', 'dance')],
  motionDurations: { dance: 15.3 },
};

export const chrisConfig: CharacterConfig = {
  ...shared,
  id: 'chris',
  model: '/characters/cast/chris.glb',
  height: 1.82,
  bones: tobiBones,
  animations: { idle: 'IdleV4.2(maya_head)' },
  clipSources: [dance('dance-wave', 'dance')],
  motionDurations: { dance: 16 },
};

export const castConfigs = [
  copConfig,
  hipHopConfig,
  elyConfig,
  poleConfig,
  gabberAnitaConfig,
  gabberFemaleConfig,
  gabberSjonnieConfig,
  gabberDutchConfig,
  valeryConfig,
  ladyboyConfig,
  miaConfig,
  fitnessConfig,
  samConfig,
  chrisConfig,
];
