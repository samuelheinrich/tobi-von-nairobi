import { expect, it } from 'vitest';
import { CharacterFacing } from './facing.js';
it('throws towards the character after walking in any direction and retains that heading at rest', () => {
  const facing = new CharacterFacing();
  for (const [x, z] of [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
    [1, -1],
  ]) {
    facing.update({ x: x!, z: z! });
    const length = Math.hypot(x!, z!);
    expect(Math.sin(facing.yaw)).toBeCloseTo(x! / length);
    expect(Math.cos(facing.yaw)).toBeCloseTo(z! / length);
    const yaw = facing.yaw;
    facing.update({ x: 0, z: 0 });
    expect(facing.yaw).toBe(yaw);
  }
});
