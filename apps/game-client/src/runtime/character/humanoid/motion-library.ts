import { Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import type { HumanoidAction, HumanoidBone, Tuple3 } from './schema.js';

export const motionTiming: Record<HumanoidAction, { duration: number; loop: boolean }> = {
  celebrate: { duration: 4.7666666667, loop: true },
  idle: { duration: 3, loop: true },
  walk: { duration: 0.86, loop: true },
  run: { duration: 0.62, loop: true },
  jump_start: { duration: 0.16, loop: false },
  jump_loop: { duration: 0.8, loop: true },
  jump_land: { duration: 0.2, loop: false },
  sit_down: { duration: 0.55, loop: false },
  sit_idle: { duration: 3, loop: true },
  stand_up: { duration: 0.5, loop: false },
  throw_bottle: { duration: 0.65, loop: false },
  taunt: { duration: 1.05, loop: false },
  dance: { duration: 4, loop: true },
  drink: { duration: 0.85, loop: false },
  pickup: { duration: 0.35, loop: false },
  hit_reaction: { duration: 0.35, loop: false },
};
export interface MotionPose {
  rotations: Partial<Record<HumanoidBone, Quaternion>>;
  hipOffset: number;
}
/** Shared authored in-place motions in Y-up/+Z-forward character space, not asset bone axes.
 * Sampling these curves has no dependency on Tobi or a particular skeleton. */
export function sampleMotion(action: HumanoidAction, t: number, clearance: number): MotionPose {
  const p = Math.min(1, t / motionTiming[action].duration),
    wave = Math.sin(p * Math.PI * 2);
  const r: Partial<Record<HumanoidBone, Tuple3>> = { chest: [0.018 * Math.sin(t * 3), 0, 0] };
  let hipOffset = 0;
  const set = (k: HumanoidBone, x = 0, y = 0, z = 0) => {
    r[k] = [x, y, z];
  };
  const arms = (left: number, right: number, bend = 0.16) => {
    set('leftUpperArm', left, 0, 0);
    set('rightUpperArm', right, 0, 0);
    set('leftLowerArm', -bend);
    set('rightLowerArm', -bend);
  };
  arms(0, 0);
  if (action === 'walk' || action === 'run') {
    const run = action === 'run',
      amplitude = run ? 0.9 : 0.55;
    set('leftUpperLeg', wave * amplitude);
    set('rightUpperLeg', -wave * amplitude);
    set('leftLowerLeg', Math.max(0, wave) * (run ? 1.2 : 0.65));
    set('rightLowerLeg', Math.max(0, -wave) * (run ? 1.2 : 0.65));
    set('leftFoot', Math.max(0, wave) * 0.2);
    set('rightFoot', Math.max(0, -wave) * 0.2);
    arms(wave * (run ? 0.7 : 0.38), -wave * (run ? 0.7 : 0.38), run ? 0.95 : 0.25);
    set('hips', 0, wave * 0.045, 0);
    set('chest', run ? 0.09 : 0.025, -wave * 0.055);
    hipOffset = (1 - Math.cos(p * Math.PI * 4)) * (run ? 0.025 : 0.012);
  }
  if (action === 'dance') {
    // Fallback for a character that has no dance clip of its own: weight shift, hip sway and a
    // loose upper body. Deliberately small — a real clip should always win where one exists.
    const beat = Math.sin(p * Math.PI * 4);
    set('hips', 0, wave * 0.22, wave * 0.1);
    set('spine', 0.04 * beat, -wave * 0.12, 0);
    set('chest', 0.05 * beat, wave * 0.1, 0);
    set('neck', -0.03 * beat, wave * 0.08, 0);
    set('head', 0.04 * beat, wave * 0.12, 0);
    set('leftUpperLeg', 0.12 * Math.max(0, beat));
    set('rightUpperLeg', 0.12 * Math.max(0, -beat));
    set('leftLowerLeg', 0.2 * Math.max(0, beat));
    set('rightLowerLeg', 0.2 * Math.max(0, -beat));
    arms(-0.55 + 0.25 * beat, -0.55 - 0.25 * beat, 0.9);
    hipOffset = -0.03 * Math.abs(beat);
  }
  if (action.startsWith('jump_')) {
    const crouch = action === 'jump_loop' ? 0.22 : Math.sin(p * Math.PI) * 0.4;
    set('leftUpperLeg', -crouch);
    set('rightUpperLeg', -crouch * 0.8);
    set('leftLowerLeg', crouch * 1.6);
    set('rightLowerLeg', crouch * 1.6);
    arms(-0.5, -0.5, 0.65);
    set('chest', 0.08);
    hipOffset = action === 'jump_loop' ? 0 : -crouch * 0.25;
  }
  if (action === 'sit_down' || action === 'sit_idle' || action === 'stand_up') {
    const smooth = (x: number) => x * x * (3 - 2 * x);
    const amount = action === 'sit_idle' ? 1 : action === 'stand_up' ? 1 - smooth(p) : smooth(p);
    set('leftUpperLeg', (-Math.PI / 2) * amount);
    set('rightUpperLeg', (-Math.PI / 2) * amount);
    set('leftLowerLeg', (Math.PI / 2) * amount);
    set('rightLowerLeg', (Math.PI / 2) * amount);
    arms(-0.35 * amount, -0.35 * amount, 0.45);
    hipOffset = -0.5 * amount;
    set('chest', 0.08 * Math.sin(p * Math.PI));
  }
  if (action === 'throw_bottle') {
    // Wind-up, release at .58, then follow through. Both hand and shoulder travel together.
    const pitch =
      p < 0.42
        ? -2.5 * (p / 0.42)
        : p < 0.65
          ? -2.5 + 2 * ((p - 0.42) / 0.23)
          : -0.5 * (1 - (p - 0.65) / 0.35);
    set('rightUpperArm', pitch, 0, -0.1);
    set('rightLowerArm', p < 0.58 ? -1.15 : -0.16);
    set('chest', 0.12 * Math.sin(p * Math.PI), -0.18 * Math.sin(p * Math.PI));
  }
  if (action === 'drink') {
    const lift = Math.sin(p * Math.PI);
    set('rightUpperArm', -0.95 * lift, 0, Math.min(0.45, clearance + 0.2) * lift);
    set('rightLowerArm', -1.45 * lift);
    set('rightHand', -0.35 * lift);
    set('head', -0.15 * lift);
  }
  if (action === 'taunt') {
    const f = Math.sin(p * Math.PI);
    arms(-0.8 * f, -0.95 * f, 0.8);
    set('rightLowerArm', -0.85 - 0.28 * Math.sin(p * Math.PI * 6));
    set('chest', 0.16 * f, 0, 0.045 * Math.sin(p * Math.PI * 4));
    set('head', 0.08 * f);
  }
  if (action === 'pickup') {
    const f = Math.sin(p * Math.PI);
    set('chest', 0.3 * f);
    arms(-0.3, -0.45, 0.18);
    hipOffset = -0.06 * f;
  }
  if (action === 'hit_reaction') {
    const f = Math.sin(p * Math.PI);
    set('chest', -0.2 * f, 0, 0.09 * f);
    arms(-0.25, -0.25, 0.6);
  }
  return {
    rotations: Object.fromEntries(
      Object.entries(r).map(([key, v]) => [key, Quaternion.FromEulerAngles(...v)]),
    ),
    hipOffset,
  };
}
