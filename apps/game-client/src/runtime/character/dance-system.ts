import { outwardArmAngle } from './modular/arm-pose.js';
import type { DanceName } from '@tobi/game-data';
import type { NpcRig } from '../levels/npc-kit.js';

/** Shared procedural dance library: no timers/observers per dancer, absolute time avoids LOD drift. */
const profiles: Record<DanceName, readonly [number, number, number, number]> = {
  dance_idle_01: [0.12, 0.15, 0.06, 1.5],
  dance_idle_02: [0.25, 0.2, 0.09, 1.9],
  dance_slow_01: [0.5, 0.4, 0.12, 2],
  dance_slow_02: [0.35, 0.65, 0.15, 1.7],
  dance_pole_01: [2.4, 0.7, 0.3, 2.7],
  dance_pole_02: [1.8, 1.1, 0.4, 3.1],
  dance_club_01: [1.3, 0.8, 0.35, 3.8],
  dance_club_02: [0.9, 1.4, 0.45, 4.2],
};
export function animateDance(
  rig: NpcRig,
  name: DanceName,
  time: number,
  seed: number,
  detailed: boolean,
): void {
  const [lift, swing, stride, tempo] = profiles[name];
  const phase = time * tempo * (0.86 + (seed % 7) * 0.045) + seed * 2.399;
  const beat = Math.sin(phase);
  rig.root.rotation.z = beat * 0.055;
  rig.head.rotation.z = Math.sin(phase + 0.7) * 0.12;
  for (const [i, arm] of rig.arms.entries())
    arm.rotation.set(0, 0, outwardArmAngle(i, lift + Math.sin(phase + i * 1.8) * swing));
  if (detailed)
    for (const [i, leg] of rig.legs.entries())
      leg.rotation.x = Math.sin(phase + i * Math.PI) * stride;
}
