import { expect, it } from 'vitest';
import { BottleHands } from './bottle-hands.js';
import { ColorTrip } from './color-trip.js';

it('drinks queued bottles once and retains empties with throw cooldown', () => {
  const hands = new BottleHands();
  hands.collect();
  hands.collect();
  expect(hands.throw()).toBe(false);
  expect(hands.step(0.9)).toBe(1);
  expect(hands.empties).toBe(1);
  expect(hands.step(0.9)).toBe(1);
  expect(hands.holding).toBe(true);
  expect(hands.throw()).toBe(true);
  expect(hands.throw()).toBe(false);
  hands.step(0.5);
  expect(hands.throw()).toBe(true);
  expect(hands.throw()).toBe(false);
  expect(hands.holding).toBe(false);
  expect(hands.step(10)).toBe(0);
});
it('deduplicates pills, caps duration and clears the effect in simulation time', () => {
  const trip = new ColorTrip();
  expect(trip.collect('a')).toBe(true);
  expect(trip.collect('a')).toBe(false);
  trip.collect('b');
  trip.collect('c');
  expect(trip.remaining).toBe(24);
  trip.step(23);
  expect(trip.intensity).toBe(0.5);
  trip.step(2);
  expect(trip.intensity).toBe(0);
});
