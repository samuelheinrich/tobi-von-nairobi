import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from '@tobi/contracts';
import { PrototypeSession } from './prototype-session.js';

const level: LevelDefinition = {
  schemaVersion: 1,
  id: 'fixture',
  worldId: 'bali',
  atmosphere: 'day',
  scenery: 'village',
  title: 'Fixture',
  subtitle: '',
  maxWanted: 0,
  chaosPerBottle: 16,
  policeSpeed: 4.6,
  spawn: { x: 0, y: 1, z: 0 },
  destination: { id: 'home', position: { x: 0, y: 0, z: 5 }, radius: 2 },
  pickups: [{ id: 'one', itemId: 'bottle', position: { x: 0, y: 0, z: 1 } }],
  objectives: [
    { id: 'collect', type: 'collect', itemId: 'bottle', amount: 1, after: [] },
    { id: 'reach', type: 'reach', targetId: 'home', after: ['collect'] },
  ],
};

describe('confirmed tutorial events', () => {
  it('requires an escape after collection before the destination can complete', () => {
    const escapeLevel: LevelDefinition = {
      ...level,
      maxWanted: 1,
      policeSpawns: [{ x: 4, y: 0, z: 0 }],
      objectives: [
        level.objectives[0]!,
        { id: 'escape', type: 'escapePolice', after: ['collect'] },
        { id: 'reach', type: 'reach', targetId: 'home', after: ['escape'] },
      ],
    };
    const session = new PrototypeSession(escapeLevel, { bottlePoints: 100, completionBonus: 500 });
    session.escaped();
    session.collect('one');
    expect(session.reach('home')).toBe(false);
    session.escaped();
    expect(session.reach('home')).toBe(true);
    expect(session.reach('home')).toBe(false);
    expect(session.score).toBe(600);
  });
  it('rejects unknown and repeated pickups without awarding points', () => {
    const session = new PrototypeSession(level, { bottlePoints: 100, completionBonus: 500 });
    expect(session.collect('unknown')).toBe(false);
    expect(session.collect('one')).toBe(true);
    expect(session.collect('one')).toBe(false);
    expect(session.score).toBe(100);
    expect(session.collected.size).toBe(1);
  });
  it('requires the collect objective before reaching home and awards completion once', () => {
    const session = new PrototypeSession(level, { bottlePoints: 100, completionBonus: 500 });
    expect(session.reach('home')).toBe(false);
    session.collect('one');
    expect(session.reach('wrong-home')).toBe(false);
    expect(session.reach('home')).toBe(true);
    expect(session.reach('home')).toBe(false);
    expect(session.score).toBe(600);
    expect(session.mission.isComplete).toBe(true);
  });
});
