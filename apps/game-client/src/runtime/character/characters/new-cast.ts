import type { BoneMap, CharacterConfig, HumanoidAction } from '../humanoid/schema.js';
import { civilianMotionLibrary } from './civilians.js';
import { mixamoBones } from './dancers.js';

const ccBones: BoneMap = {
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

const xanderBones: BoneMap = {
  hips: 'Hips_51',
  spine: 'Spine_46',
  chest: 'Spine2_44',
  neck: 'Neck_5',
  head: 'Head_4',
  leftUpperArm: 'LeftArm_23',
  leftLowerArm: 'LeftForeArm_22',
  leftHand: 'LeftHand_21',
  rightUpperArm: 'RightArm_42',
  rightLowerArm: 'RightForeArm_41',
  rightHand: 'RightHand_40',
  leftUpperLeg: 'LeftUpLeg_3',
  leftLowerLeg: 'LeftLeg_2',
  leftFoot: 'LeftFoot_1',
  rightUpperLeg: 'RightUpLeg_50',
  rightLowerLeg: 'RightLeg_49',
  rightFoot: 'RightFoot_48',
};

const unrealBones: BoneMap = {
  hips: 'pelvis_02',
  spine: 'spine_01_015',
  chest: 'spine_03_017',
  neck: 'neck_01_062',
  head: 'head_063',
  leftUpperArm: 'upperarm_l_019',
  leftLowerArm: 'lowerarm_l_021',
  leftHand: 'hand_l_023',
  rightUpperArm: 'upperarm_r_040',
  rightLowerArm: 'lowerarm_r_042',
  rightHand: 'hand_r_044',
  leftUpperLeg: 'thigh_l_03',
  leftLowerLeg: 'calf_l_05',
  leftFoot: 'foot_l_07',
  rightUpperLeg: 'thigh_r_09',
  rightLowerLeg: 'calf_r_011',
  rightFoot: 'foot_r_013',
};

/** Yinn uses a Blender segmented rig rather than Mixamo. The gameplay vocabulary deliberately
 * targets the first segment in every limb and the central root above the two pelvis branches. */
const yinnBones: BoneMap = {
  hips: 'root_136',
  spine: 'spine01_117',
  chest: 'spine03_119',
  neck: 'neck01_116',
  head: 'head_113',
  leftUpperArm: 'upperarm01.L_25',
  leftLowerArm: 'lowerarm01.L_23',
  leftHand: 'wrist.L_21',
  rightUpperArm: 'upperarm01.R_51',
  rightLowerArm: 'lowerarm01.R_49',
  rightHand: 'wrist.R_47',
  leftUpperLeg: 'upperleg01.L_127',
  leftLowerLeg: 'lowerleg01.L_125',
  leftFoot: 'foot.L_123',
  rightUpperLeg: 'upperleg01.R_134',
  rightLowerLeg: 'lowerleg01.R_132',
  rightFoot: 'foot.R_130',
};

const cyberpunkBones: BoneMap = {
  hips: 'spine_02',
  spine: 'spine.001_03',
  chest: 'spine.003_05',
  neck: 'spine.005_07',
  head: 'spine.006_08',
  leftUpperArm: 'upper_arm.L_031',
  leftLowerArm: 'lower_arm.L_032',
  leftHand: 'Hand.L_033',
  rightUpperArm: 'upper_arm.R_054',
  rightLowerArm: 'lower_arm.R_055',
  rightHand: 'Hand.R_056',
  leftUpperLeg: 'thigh.L_086',
  leftLowerLeg: 'shin.L_087',
  leftFoot: 'foot.L_088',
  rightUpperLeg: 'thigh.R_00',
  rightLowerLeg: 'shin.R_01',
  rightFoot: 'foot.R_091',
};

const clips = (...actions: HumanoidAction[]) =>
  civilianMotionLibrary.filter((source) =>
    actions.some((action) => Object.hasOwn(source.animations, action)),
  );

const base = (
  id: string,
  model: string,
  height: number,
  bones: BoneMap,
  actions: HumanoidAction[],
  actionOverrides: CharacterConfig['actionOverrides'] = {},
): CharacterConfig => ({
  id,
  model,
  height,
  bones,
  mouthOffset: [0, 0.02, 0.08],
  rotation: [0, 0, 0],
  animations: {},
  clipSources: clips(...actions),
  actionOverrides,
  attachments: {
    bottle_right_hand: {
      socket: 'right_hand',
      position: [0, 0.06, 0.02],
      rotation: [0, 0, Math.PI],
      scale: [0.55, 0.55, 0.55],
    },
  },
  armClearance: 0.22,
  walkSpeed: 5,
  runSpeed: 9,
  cycleSpeeds: { walk: 2.3, run: 4.6 },
  crossfade: 0.18,
  throwReleaseTime: 0.4,
});

const everydayActions: HumanoidAction[] = [
  'walk',
  'walk_alt',
  'run_away',
  'sit_idle',
  'sit_idle_alt',
  'sit_talk',
  'walk_circle',
];
const nightlifeActions: HumanoidAction[] = [
  'walk',
  'drunk_walk',
  'drunk_walk_alt',
  'sit_idle_alt',
  'sit_talk',
  'dance_hard',
  'dance_medium',
];

export const casualManConfig = base(
  'casual-man',
  '/characters/civilians/casual-man.glb',
  1.81,
  ccBones,
  everydayActions,
  { walk: 'walk_alt', run: 'run_away', sit_idle: 'sit_talk' },
);

export const xanderConfig = base(
  'xander',
  '/characters/civilians/xander.glb',
  1.84,
  xanderBones,
  everydayActions,
  { walk: 'walk', run: 'run_away', sit_idle: 'sit_idle_alt' },
);

export const hippieWorkerConfig = base(
  'hippie-worker',
  '/characters/arlesheim/hippie-worker.glb',
  1.79,
  mixamoBones,
  [...everydayActions, 'dance_medium'],
  { walk: 'walk_circle', run: 'run_away', sit_idle: 'sit_talk', dance: 'dance_medium' },
);

export const indianOfficerConfig = base(
  'indian-officer',
  '/characters/police/indian-officer.glb',
  1.84,
  mixamoBones,
  ['walk'],
  { walk: 'walk' },
);

export const partyWomanConfig = base(
  'party-woman',
  '/characters/party/party-woman.glb',
  1.71,
  ccBones,
  nightlifeActions,
  {
    walk: 'drunk_walk_alt',
    sit_idle: 'sit_idle_alt',
    dance: 'dance_hard',
    celebrate: 'dance_medium',
  },
);

export const blackSuitWomanConfig = base(
  'black-suit-woman',
  '/characters/party/black-suit-woman.glb',
  1.73,
  unrealBones,
  nightlifeActions,
  { walk: 'drunk_walk', sit_idle: 'sit_talk', dance: 'dance_medium', celebrate: 'dance_hard' },
);

export const sciFiManConfig = base(
  'sci-fi-man',
  '/characters/party/sci-fi-man.glb',
  1.85,
  mixamoBones,
  nightlifeActions,
  { walk: 'drunk_walk', sit_idle: 'sit_idle_alt', dance: 'dance_hard' },
);

export const cyberpunkGirlConfig: CharacterConfig = {
  ...base('cyberpunk-girl', '/characters/party/cyberpunk-girl.glb', 1.72, cyberpunkBones, []),
  animations: { walk: 'Walk' },
  motionDurations: { walk: 2.67 },
  animationMetadata: {
    walk: {
      loopMode: 'repeat',
      rootMotion: false,
      inPlace: true,
      crossfadeDuration: 0.14,
    },
  },
};

export const yinnConfig = base(
  'yinn',
  '/characters/nana/yinn.glb',
  1.69,
  yinnBones,
  nightlifeActions,
  { walk: 'drunk_walk_alt', sit_idle: 'sit_talk', dance: 'dance_medium' },
);

export const ruffleDressConfig: CharacterConfig = {
  ...base(
    'ruffle-dress',
    '/characters/nana/ruffle-dress.glb',
    1.72,
    mixamoBones,
    nightlifeActions,
    { walk: 'drunk_walk', sit_idle: 'sit_idle_alt' },
  ),
  animations: { dance: 'mixamo.com' },
  motionDurations: { dance: 16.63 },
  animationMetadata: {
    dance: {
      loopMode: 'repeat',
      rootMotion: false,
      inPlace: true,
      crossfadeDuration: 0.25,
    },
  },
};

export const newCastConfigs = [
  casualManConfig,
  xanderConfig,
  hippieWorkerConfig,
  indianOfficerConfig,
  partyWomanConfig,
  blackSuitWomanConfig,
  sciFiManConfig,
  cyberpunkGirlConfig,
  yinnConfig,
  ruffleDressConfig,
];
