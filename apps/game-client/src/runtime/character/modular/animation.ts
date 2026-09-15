import { outwardArmAngle } from './arm-pose.js';
import { animateFemale } from './female/animation.js';
import type { CharacterRig } from './rig.js';
import { animateDance } from '../dance-system.js';

export type CharacterAction =
  | 'idle'
  | 'walk'
  | 'run'
  | 'talk'
  | 'sit'
  | 'drink'
  | 'phone'
  | 'smoke'
  | 'dance'
  | 'club'
  | 'pole'
  | 'cheer'
  | 'angry'
  | 'chase'
  | 'arrest';
/** Absolute time + identity offset: a shared procedural rig, without per-character clocks. */
export function animateCharacter(
  rig: CharacterRig,
  action: CharacterAction,
  time: number,
  seed: number,
): void {
  if (
    rig.appearance.femaleStyle &&
    ['idle', 'dance', 'club', 'pole', 'sit', 'drink', 'phone', 'talk', 'walk'].includes(action)
  ) {
    const forced =
      action === 'sit'
        ? 'sit_relaxed_01'
        : action === 'drink'
          ? 'drink_idle_01'
          : action === 'phone'
            ? 'selfie_pose_01'
            : action === 'talk'
              ? 'beach_chat_01'
              : action === 'walk'
                ? 'relaxed_walk_01'
                : undefined;
    animateFemale(
      rig,
      time,
      action === 'pole' ? 'pole' : action === 'dance' || action === 'club' ? 'dance' : 'ambient',
      forced,
    );
    return;
  }
  rig.visual.rotation.z = 0;
  rig.visual.position.x = 0;
  const phase = time * (0.9 + (seed % 5) * 0.045) + seed * 2.399;
  rig.gesture(action);
  rig.root.rotation.z = 0;
  rig.head.rotation.set(0, Math.sin(phase * 0.7) * 0.09, 0);
  for (const [i, arm] of rig.arms.entries())
    arm.rotation.set(0, 0, outwardArmAngle(i, 0.09 + Math.sin(phase) * 0.025));
  for (const leg of rig.legs) leg.rotation.set(0, 0, 0);
  if (action === 'dance' || action === 'club' || action === 'pole') {
    const dance =
      action === 'pole'
        ? seed % 2
          ? 'dance_pole_01'
          : 'dance_pole_02'
        : action === 'club'
          ? seed % 2
            ? 'dance_club_01'
            : 'dance_club_02'
          : seed % 2
            ? 'dance_slow_01'
            : 'dance_slow_02';
    animateDance(rig, dance, time, seed, true);
    return;
  }
  if (action === 'walk' || action === 'run' || action === 'chase') {
    const fast = action !== 'walk';
    for (const [i, leg] of rig.legs.entries())
      leg.rotation.x = Math.sin(phase * (fast ? 8 : 4.5) + i * Math.PI) * (fast ? 0.7 : 0.35);
    for (const [i, arm] of rig.arms.entries()) arm.rotation.x = -rig.legs[i]!.rotation.x;
  }
  if (action === 'sit') for (const leg of rig.legs) leg.rotation.x = -1.35;
  if (['drink', 'phone', 'smoke'].includes(action)) {
    rig.arms[1]!.rotation.x = action === 'phone' ? -1.55 : -1.35 + Math.sin(phase * 0.6) * 0.1;
    rig.arms[1]!.rotation.z = outwardArmAngle(1, 0.22);
  }
  if (action === 'talk' || action === 'angry' || action === 'arrest') {
    rig.arms[1]!.rotation.x = -0.7 + Math.sin(phase * 3) * 0.2;
    rig.head.rotation.x = Math.sin(phase * 2) * 0.07;
  }
  if (action === 'cheer')
    for (const [i, arm] of rig.arms.entries())
      arm.rotation.z = outwardArmAngle(i, 2.3 + Math.sin(phase * 4) * 0.2);
}
