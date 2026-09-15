import type { BodyShape } from './presets.js';

/** Arms are ordered by local X: index 0 is -X, index 1 is +X.
 * With the bind pose pointing down, outward Z rotation has the SAME sign as X.
 * Keep a small clearance at rest and stop before overhead poses fold inward.
 */
export function outwardArmAngle(index: number, lift: number, minimum = 0.12): number {
  return (index === 0 ? -1 : 1) * Math.min(2.65, Math.max(minimum, lift));
}
export function restingArmClearance(body: BodyShape): number {
  return Math.max(0.12, Math.atan2(Math.max(0, body.hips - body.shoulders) * 0.5 + 0.025, 0.58));
}
