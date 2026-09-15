/** Public vocabulary; asset names belong only in a character configuration. */
export const boneAliases = {
  hips: ['Hips', 'pelvis', 'CC_Base_Hip'],
  spine: ['Spine', 'spine_01', 'CC_Base_Waist', 'Spine01'],
  chest: ['Spine2', 'chest', 'spine_03', 'CC_Base_Spine02', 'Spine02'],
  neck: ['Neck', 'neck_01', 'CC_Base_NeckTwist01'],
  head: ['Head', 'CC_Base_Head'],
  leftUpperArm: ['LeftArm', 'upper_arm.L', 'upperarm_l', 'CC_Base_L_Upperarm'],
  leftLowerArm: ['LeftForeArm', 'forearm.L', 'lowerarm_l', 'CC_Base_L_Forearm'],
  leftHand: ['LeftHand', 'hand.L', 'hand_l', 'CC_Base_L_Hand'],
  rightUpperArm: ['RightArm', 'upper_arm.R', 'upperarm_r', 'CC_Base_R_Upperarm'],
  rightLowerArm: ['RightForeArm', 'forearm.R', 'lowerarm_r', 'CC_Base_R_Forearm'],
  rightHand: ['RightHand', 'hand.R', 'hand_r', 'CC_Base_R_Hand'],
  leftUpperLeg: ['LeftUpLeg', 'thigh.L', 'thigh_l', 'CC_Base_L_Thigh'],
  leftLowerLeg: ['LeftLeg', 'shin.L', 'calf_l', 'CC_Base_L_Calf'],
  leftFoot: ['LeftFoot', 'foot.L', 'foot_l', 'CC_Base_L_Foot'],
  rightUpperLeg: ['RightUpLeg', 'thigh.R', 'thigh_r', 'CC_Base_R_Thigh'],
  rightLowerLeg: ['RightLeg', 'shin.R', 'calf_r', 'CC_Base_R_Calf'],
  rightFoot: ['RightFoot', 'foot.R', 'foot_r', 'CC_Base_R_Foot'],
} as const;
export type HumanoidBone = keyof typeof boneAliases;
export const actions = [
  'idle',
  'walk',
  'run',
  'jump_start',
  'jump_loop',
  'jump_land',
  'sit_down',
  'sit_idle',
  'stand_up',
  'throw_bottle',
  'taunt',
  'dance',
  'drink',
  'pickup',
  'hit_reaction',
  'celebrate',
] as const;
export type HumanoidAction = (typeof actions)[number];
export type Tuple3 = [number, number, number];
export type BoneMap = Record<HumanoidBone, string>;
export interface PropAttachmentPreset {
  socket: 'right_hand' | 'left_hand';
  /** Metres in the source model's bone space (scaled with the character). */
  position: Tuple3;
  rotation: Tuple3;
  scale: Tuple3;
}
export interface ClipSource {
  model: string;
  bones: BoneMap;
  animations: Partial<Record<HumanoidAction, string>>;
}
export interface CharacterConfig {
  id: string;
  model: string;
  height: number;
  mouthOffset: Tuple3;
  rotation: Tuple3;
  bones: BoneMap;
  /** Source clips are sampled in-place. Missing actions use the shared humanoid library. */
  animations: Partial<Record<HumanoidAction, string>>;
  clipSources?: ClipSource[];
  attachments: Record<string, PropAttachmentPreset>;
  armClearance: number;
  walkSpeed: number;
  runSpeed: number;
  cycleSpeeds: { walk: number; run: number };
  crossfade: number;
  throwReleaseTime: number;
  motionDurations?: Partial<Record<HumanoidAction, number>>;
  /** Normalized source-clip windows; retain the complete source asset for the studio. */
  clipRanges?: Partial<Record<HumanoidAction, [number, number]>>;
}
export interface AnimationState {
  speed: number;
  grounded: boolean;
  sitting: boolean;
  drinking: boolean;
  holding: boolean;
  victory?: boolean;
  /** Seat surface above the character origin, in game metres. */
  seatHeight?: number;
}
/** Compares bone names across the exporters that produced them.
 *
 * Drops any namespace up to `|` or `:`, and the numeric suffix a glTF round-trip appends when it
 * has to make joint names unique — a Mixamo rig that went through FBX comes back as
 * `mixamorig:Hips_32`, which is the same bone as `Hips`.
 */
export function normaliseBoneName(name: string): string {
  return name
    .replace(/^.*[|:]/, '')
    .replace(/_\d+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
export function suggestBoneMap(names: readonly string[]): Partial<BoneMap> {
  const normalise = normaliseBoneName;
  return Object.fromEntries(
    Object.entries(boneAliases).flatMap(([key, aliases]) => {
      const match = names.find((name) =>
        aliases.some((alias) => normalise(alias) === normalise(name)),
      );
      return match ? [[key, match]] : [];
    }),
  );
}
