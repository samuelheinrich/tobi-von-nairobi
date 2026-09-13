import { expect, it } from 'vitest';
import { BottleMood, characterPose } from './bottle-mood.js';

it('increases cartoon intoxication, caps it, and starts a new run sober', () => {
  const mood = new BottleMood();
  expect(mood.amount).toBe(0);
  mood.collect();
  expect(mood.amount).toBeCloseTo(1 / 12);
  for (let i = 0; i < 50; i++) mood.collect();
  expect(mood.amount).toBe(1);
  expect(mood.label).toBe('VOLLE SCHLAGSEITE');
  expect(new BottleMood().amount).toBe(0);
});

it('adds visible sway and asymmetric steps while keeping animation finite at rest and airborne', () => {
  const base = {
    time: 0.6,
    gait: 1,
    speed: 4.2,
    grounded: true,
    mood: 0,
    stamina: 100,
    pickup: 0,
    stumble: 0,
    victory: false,
  };
  const sober = characterPose(base),
    drunk = characterPose({ ...base, mood: 1 });
  expect(Math.abs(drunk.bodyRoll)).toBeGreaterThan(Math.abs(sober.bodyRoll));
  expect(Math.abs(drunk.leftLeg)).not.toBe(Math.abs(drunk.rightLeg));
  for (const pose of [
    drunk,
    characterPose({ ...base, speed: 0, mood: 1 }),
    characterPose({ ...base, grounded: false }),
  ])
    expect(Object.values(pose).every(Number.isFinite)).toBe(true);
});
