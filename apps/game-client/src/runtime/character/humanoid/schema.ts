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
 * Always drops a namespace up to `|` or `:`. `stripIndex` additionally drops the numeric suffix a
 * glTF round-trip appends to make joint names unique: `mixamorig:Hips_32` is the same bone as
 * `Hips`.
 *
 * That suffix rule must never be applied to an alias. `spine_03` is a real Unreal bone name whose
 * `_03` carries meaning — stripping it would turn the alias into `spine` and let `chest` match a
 * rig's plain `Spine`, which is a different bone one level down.
 */
export function normaliseBoneName(name: string, stripIndex = true): string {
  const bare = name.replace(/^.*[|:]/, '');
  return (stripIndex ? bare.replace(/_\d+$/, '') : bare).toLowerCase().replace(/[^a-z0-9]/g, '');
}
export function suggestBoneMap(names: readonly string[]): Partial<BoneMap> {
  // Aliases are tried in order, most canonical first, and each one looks for an exact match before
  // it will accept a suffix-stripped one. Letting the candidate list drive the search instead
  // mixes the two up: a rig with both `Spine_02` and `Spine2_04` would hand `chest` the lower
  // bone, because `Spine_02` happens to read like the alias `Spine02` of a different rig.
  const wanted = (alias: string) => normaliseBoneName(alias, false);
  return Object.fromEntries(
    Object.entries(boneAliases).flatMap(([key, aliases]) => {
      for (const alias of aliases) {
        const target = wanted(alias);
        const match =
          names.find((name) => normaliseBoneName(name, false) === target) ??
          names.find((name) => normaliseBoneName(name, true) === target);
        if (match) return [[key, match]];
      }
      return [];
    }),
  );
}
