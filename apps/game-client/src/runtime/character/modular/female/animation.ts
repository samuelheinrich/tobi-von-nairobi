import { outwardArmAngle } from '../arm-pose.js';
import type { CharacterRig } from '../rig.js';

/** [sway, arm lift, stride, tempo, gesture]. One shared absolute-time animation pass. */
export const femalePoses = {
  idle_pose_01: [0.035, 0.12, 0.02, 1.1, 'rest'],
  idle_pose_02: [0.06, 0.25, 0.05, 0.9, 'hip'],
  hip_sway_01: [0.075, 0.25, 0.1, 2, 'hip'],
  hip_sway_02: [0.055, 0.5, 0.06, 2.4, 'rest'],
  club_dance_01: [0.07, 1.3, 0.25, 3.7, 'dance'],
  club_dance_02: [0.09, 0.8, 0.32, 3.1, 'dance'],
  club_dance_03: [0.05, 1.9, 0.2, 4.1, 'dance'],
  pole_dance_01: [0.07, 2.3, 0.13, 2.4, 'pole'],
  pole_dance_02: [0.09, 1.9, 0.2, 1.9, 'pole'],
  stage_pose_01: [0.025, 0.8, 0.03, 0.8, 'hip'],
  flirt_idle_01: [0.035, 0.4, 0.025, 1.3, 'hair'],
  bar_idle_01: [0.025, 0.15, 0.02, 1.1, 'rest'],
  seated_pose_01: [0.025, 0.15, 0, 1, 'sit'],
  beach_idle_01: [0.025, 0.12, 0.02, 0.8, 'rest'],
  beach_idle_02: [0.035, 0.2, 0.035, 1, 'hip'],
  relaxed_walk_01: [0.025, 0.2, 0.28, 3.4, 'walk'],
  relaxed_walk_02: [0.02, 0.15, 0.24, 3.1, 'walk'],
  hair_adjust_01: [0.025, 0.2, 0.02, 1, 'hair'],
  sunglasses_adjust_01: [0.025, 0.16, 0.02, 1.3, 'glasses'],
  drink_idle_01: [0.025, 0.12, 0.02, 0.8, 'drink'],
  beach_chat_01: [0.04, 0.3, 0.04, 1.6, 'chat'],
  sit_relaxed_01: [0.025, 0.16, 0, 0.8, 'sit'],
  selfie_pose_01: [0.025, 0.1, 0.02, 1, 'phone'],
} as const;
export type FemalePose = keyof typeof femalePoses;
export const dancePoses: FemalePose[] = [
  'idle_pose_01',
  'idle_pose_02',
  'hip_sway_01',
  'hip_sway_02',
  'club_dance_01',
  'club_dance_02',
  'club_dance_03',
  'pole_dance_01',
  'pole_dance_02',
  'stage_pose_01',
  'flirt_idle_01',
  'bar_idle_01',
  'seated_pose_01',
];
export const beachPoses: FemalePose[] = [
  'beach_idle_01',
  'beach_idle_02',
  'relaxed_walk_01',
  'relaxed_walk_02',
  'hair_adjust_01',
  'sunglasses_adjust_01',
  'drink_idle_01',
  'beach_chat_01',
  'sit_relaxed_01',
  'selfie_pose_01',
];
export function animateFemale(
  rig: CharacterRig,
  time: number,
  mode = 'ambient',
  forced?: FemalePose,
) {
  const a = rig.appearance,
    s = a.femaleStyle;
  if (!s) return;
  const beach = s.role === 'beach_female' || s.role === 'pool_party';
  // Ambient standing actors never suddenly sit or walk away from an authored anchor.
  const allowed: FemalePose[] =
    mode === 'pole'
      ? ['pole_dance_01', 'pole_dance_02']
      : mode === 'dance'
        ? ['hip_sway_01', 'hip_sway_02', 'club_dance_01', 'club_dance_02', 'club_dance_03']
        : beach
          ? [
              'beach_idle_01',
              'beach_idle_02',
              'hair_adjust_01',
              'sunglasses_adjust_01',
              'drink_idle_01',
              'beach_chat_01',
              'selfie_pose_01',
            ]
          : [
              'idle_pose_01',
              'idle_pose_02',
              'hip_sway_01',
              'flirt_idle_01',
              'stage_pose_01',
              'bar_idle_01',
            ];
  const pool = allowed.filter(
    (p) =>
      p !== 'sunglasses_adjust_01' || a.accessory === 'sunglasses' || a.accessory === 'glasses',
  );
  const clock = time * (0.9 + (a.seed % 7) * 0.035) + s.animation * 0.71,
    cycle = Math.floor(clock / 9);
  const name = forced ?? pool[(s.animation + cycle) % pool.length]!,
    [sway, lift, stride, tempo, gesture] = femalePoses[name];
  const phase = clock * tempo,
    beat = Math.sin(phase),
    rest = clock % 9 > 7.5 ? 0.22 : 1;
  rig.gesture(gesture === 'drink' ? 'drink' : gesture === 'phone' ? 'phone' : '');
  rig.action =
    mode === 'dance' || mode === 'pole'
      ? mode
      : gesture === 'sit'
        ? 'sit'
        : gesture === 'drink'
          ? 'drink'
          : gesture === 'phone'
            ? 'phone'
            : stride > 0
              ? 'walk'
              : 'idle';
  rig.visual.rotation.z = sway * beat * rest;
  rig.visual.position.x = 0.018 * Math.sin(phase * 0.7);
  rig.root.rotation.z = 0;
  rig.head.rotation.set(
    Math.sin(phase * 0.5) * 0.025,
    Math.sin(phase * 0.4) * 0.12,
    -sway * beat * 0.5,
  );
  for (const [i, arm] of rig.arms.entries()) {
    arm.rotation.set(
      gesture === 'walk' ? Math.sin(phase + i * Math.PI) * 0.18 : 0,
      0,
      outwardArmAngle(i, lift + beat * 0.06 * rest),
    );
  }
  for (const [i, leg] of rig.legs.entries())
    leg.rotation.set(
      gesture === 'sit' ? -1.35 : Math.sin(phase + i * Math.PI) * stride * rest,
      0,
      (i ? 1 : -1) * 0.018,
    );
  if (gesture === 'hip') {
    rig.arms[0]!.rotation.z = outwardArmAngle(0, 0.52);
    rig.arms[0]!.rotation.x = -0.22;
  }
  if (['hair', 'glasses'].includes(gesture)) {
    rig.arms[1]!.rotation.set(-2.05, 0, outwardArmAngle(1, 0.2));
  }
  if (gesture === 'phone') rig.arms[1]!.rotation.set(-1.45, 0, outwardArmAngle(1, 0.25));
  if (gesture === 'drink')
    rig.arms[1]!.rotation.set(-1.3 + Math.sin(phase) * 0.1, 0, outwardArmAngle(1, 0.18));
  if (gesture === 'chat') rig.arms[1]!.rotation.x = -0.65 + beat * 0.2;
  if (gesture === 'pole') {
    rig.arms[0]!.rotation.set(-0.2, 0, outwardArmAngle(0, 2.6));
    rig.arms[1]!.rotation.set(-0.1, 0, outwardArmAngle(1, 1.4 - beat * 0.2));
  }
}
