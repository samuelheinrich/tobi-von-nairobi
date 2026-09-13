import { describe, expect, it } from 'vitest';
import { FixedClock } from './fixed-clock.js';

describe('FixedClock', () => {
  it('caps catch-up work and records discarded background time', () => {
    const clock = new FixedClock(1 / 60, 5);
    const steps: number[] = [];
    clock.advance(2, (delta) => steps.push(delta));
    expect(steps).toHaveLength(5);
    expect(steps.every((delta) => delta === 1 / 60)).toBe(true);
    expect(clock.droppedSeconds).toBeGreaterThan(1.8);
  });
  it('does not carry partially accumulated time across pause', () => {
    const clock = new FixedClock(0.1);
    let steps = 0;
    clock.advance(0.09, () => steps++);
    clock.reset();
    clock.advance(0.02, () => steps++);
    expect(steps).toBe(0);
  });
  it('rejects invalid elapsed time', () => {
    const clock = new FixedClock();
    let steps = 0;
    for (const delta of [-1, NaN, Infinity]) clock.advance(delta, () => steps++);
    expect(steps).toBe(0);
  });
});
