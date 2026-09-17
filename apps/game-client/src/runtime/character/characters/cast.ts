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

/** No borrowed clips: this rig cannot take them.
 *
 * Its Character Creator bones roll differently from the Mixamo skeletons the clips were authored
 * on, and Babylon's retargeter does not correct for it. The knee then turns sideways instead of
 * back — measured as a swing of 1.12 rad on Z against 0.33 on X for `dance`, and 0.43 against 0.20
 * for `celebrate`. The same knee under the shared motion library moves 0.65 on X and nothing else,
 * because those poses are written in humanoid space and applied relative to each joint's rest
 * frame rather than as raw local rotations.
 *
 * Correcting that belongs in the retargeter and would touch every character that currently looks
 * right, so both clips are blocked here instead. `dance` falls through to the procedural one.
 */
export const ladyboyConfig: CharacterConfig = {
  ...shared,
  id: 'ladyboy',
  model: '/characters/cast/ladyboy.glb',
  height: 1.76,
  bones: ccBones,
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

/** Detailed Street-Parade gabbers extracted as one standing skin per source showcase.
 *
 * The downloads contain several complete people, including a flat animated copy. Loading the
 * complete scene therefore produced overlapping bodies and exposed the rig. The game copies keep
 * only one standing skinned figure. Their source height runs along +Z, which the generic character
 * loader rotates to world Y before applying procedural humanoid motion.
 */
const standingGabber = (id: string, file: string, height: number): CharacterConfig => ({
  ...shared,
  id,
  model: `/characters/party/${file}.glb`,
  height,
  bones: mixamoBones,
  animations: {},
  sourceHeightAxis: 'z',
  rotation: [-Math.PI / 2, 0, 0],
});
export const gabberAnitaConfig = standingGabber('gabber-anita', 'gabber-anita', 1.7);
export const gabberFemaleConfig = standingGabber('gabber-female', 'gabber-female', 1.72);
export const gabberSjonnieConfig = standingGabber('gabber-sjonnie', 'gabber-sjonnie', 1.84);
export const gabberDutchConfig = standingGabber('gabber-dutch', 'gabber-dutch', 1.86);

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

/** Character Creator rigs without the numeric suffix a round-trip adds.
 *
 * Each of these files numbers its joints differently — `CC_Base_Hip_99`, `_101`, `_02` — so the
 * plain names are written once and the adapter's normalised lookup finds the rest.
 */
const ccBonesPlain: BoneMap = {
  hips: 'CC_Base_Hip',
  spine: 'CC_Base_Waist',
  chest: 'CC_Base_Spine02',
  neck: 'CC_Base_NeckTwist01',
  head: 'CC_Base_Head',
  leftUpperArm: 'CC_Base_L_Upperarm',
  leftLowerArm: 'CC_Base_L_Forearm',
  leftHand: 'CC_Base_L_Hand',
  rightUpperArm: 'CC_Base_R_Upperarm',
  rightLowerArm: 'CC_Base_R_Forearm',
  rightHand: 'CC_Base_R_Hand',
  leftUpperLeg: 'CC_Base_L_Thigh',
  leftLowerLeg: 'CC_Base_L_Calf',
  leftFoot: 'CC_Base_L_Foot',
  rightUpperLeg: 'CC_Base_R_Thigh',
  rightLowerLeg: 'CC_Base_R_Calf',
  rightFoot: 'CC_Base_R_Foot',
};

/** Bar staff for Nana, each with the dance it arrived with. No clip is borrowed here — they all
 * brought their own, which is why they read as different people rather than the same routine. */
const barDancer = (
  id: string,
  file: string,
  height: number,
  clip: string,
  seconds: number,
  action: 'dance' | 'walk' = 'dance',
): CharacterConfig => ({
  ...shared,
  id,
  model: `/characters/nana/${file}.glb`,
  height,
  bones: ccBonesPlain,
  animations: { [action]: clip },
  motionDurations: { [action]: seconds },
  animationMetadata: {
    [action]:
      action === 'walk'
        ? {
            loopMode: 'repeat',
            rootMotion: true,
            inPlace: false,
            crossfadeDuration: 0.1,
          }
        : {
            // Source dances contain metres of accidental root/hips travel and must stay on stage.
            loopMode: id === 'bar-dancer-hard' ? 'pingpong' : 'repeat',
            rootMotion: false,
            inPlace: true,
            crossfadeDuration: id === 'bar-dancer-naked' ? 0.35 : 0.2,
            reverseAllowed: id === 'bar-dancer-hard',
          },
  },
});

export const barHardConfig = barDancer(
  'bar-dancer-hard',
  'bar-dancer-hard',
  1.72,
  'allmot|FBXExportClip_0',
  18.5,
);
export const barNakedConfig = barDancer(
  'bar-dancer-naked',
  'bar-dancer-naked',
  1.7,
  'Armature|1746722837904_TempMotion',
  24.2,
);
export const barHeelsConfig = barDancer(
  'bar-dancer-heels',
  'bar-dancer-heels',
  1.76,
  'Animation',
  22.5,
);
/** Walks rather than dances: she works the floor between the tables. */
export const barWalkerConfig = barDancer('bar-walker', 'bar-walker', 1.73, 'Animation', 13, 'walk');

/** The hippie house's witch. One of a kind, and she keeps her own dance.
 *
 * Her rig mixes an Unreal pelvis with Character Creator limbs, which the adapter resolves through
 * the plain names below. At 137'627 triangles she is the heaviest figure in the game — the mesh is
 * split into many small shells, so the simplifier stops early. She is a single fixture in one
 * room, never a crowd, which is the only reason that is acceptable.
 */
export const witchConfig: CharacterConfig = {
  ...shared,
  id: 'hippie-witch',
  model: '/characters/arlesheim/hippie-witch.glb',
  height: 1.74,
  bones: { ...ccBonesPlain, hips: 'pelvis' },
  animations: { dance: 'Animation' },
  motionDurations: { dance: 9.1 },
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
  barHardConfig,
  barNakedConfig,
  barHeelsConfig,
  barWalkerConfig,
  witchConfig,
  hipHopConfig,
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
