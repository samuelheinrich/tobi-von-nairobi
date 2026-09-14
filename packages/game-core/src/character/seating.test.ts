import { describe, expect, it } from 'vitest';
import { Seating, type RestSpot } from './seating.js';
const spot: RestSpot = {
  id: 'seat',
  label: 'Seat',
  kind: 'seat',
  yaw: 0,
  position: { x: 2, y: 1.45, z: 0 },
  exit: { x: 0, y: 1.1, z: 0 },
};
describe('reusable seating', () => {
  it('interacts from the aisle but never from another deck or a distant aisle', () => {
    const s = new Seating();
    expect(s.nearest({ x: 0, y: 1, z: 0 }, [spot])).toBe(spot);
    expect(s.nearest({ x: 0, y: 5, z: 0 }, [spot])).toBeNull();
    expect(s.nearest({ x: 0, y: 1, z: 3 }, [spot])).toBeNull();
  });
  it('returns a stable authored aisle exit and clears the hiding state', () => {
    const s = new Seating();
    const entered = s.enter(spot);
    entered.x = 999;
    expect(s.active?.position.x).toBe(2);
    expect(s.leave()).toEqual(spot.exit);
    expect(s.active).toBeNull();
    expect(s.leave()).toBeNull();
  });
});
