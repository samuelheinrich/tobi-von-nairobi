import { describe, expect, it } from 'vitest';
import { ChaosSystem } from '../chaos/chaos.js';
import { WantedSystem } from '../wanted/wanted.js';
import { NavigationGrid, distance2 } from '../navigation/navigation-grid.js';
import { PoliceAgent } from './police-agent.js';
import { PursuitSystem, type PursuitRules } from './pursuit.js';

const rules: PursuitRules = {
  chaosPerBottle: 16,
  provokeChaos: 20,
  provokeCooldown: 3,
  chaosDecayDelay: 10,
  chaosDecayPerSecond: 1.5,
  wantedThresholds: [41, 61, 71, 81, 95],
  escapeDuration: 12,
  sightRange: 15,
  suspicionDuration: 0.8,
  chaseSpeed: 4.6,
  patrolSpeed: 2,
  captureRadius: 1.25,
  captureDuration: 1.6,
  searchDuration: 12,
  aiInterval: 0.1,
  repathInterval: 0.6,
};
const bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };

describe('independent heat and wanted rules', () => {
  it('clamps heat, delays decay, and measures only the part after the delay', () => {
    const heat = new ChaosSystem(10, 1.5);
    heat.add(120);
    heat.add(NaN);
    heat.add(-20);
    expect(heat.value).toBe(100);
    heat.step(9, false);
    expect(heat.value).toBe(100);
    heat.step(3, false);
    expect(heat.value).toBe(97);
    heat.step(1, true);
    heat.step(10, false);
    expect(heat.value).toBe(97);
    heat.step(100, false);
    expect(heat.value).toBe(0);
  });
  it('caps dispatch, retains wanted as heat drops, and requires contact before an escape', () => {
    const wanted = new WantedSystem(3, rules.wantedThresholds, 12);
    wanted.report(100);
    expect(wanted.level).toBe(3);
    wanted.report(0);
    expect(wanted.level).toBe(3);
    expect(wanted.step(20, false)).toBe(false);
    wanted.step(0.1, true);
    expect(wanted.step(11, false)).toBe(false);
    wanted.step(0.1, true);
    expect(wanted.unseenSeconds).toBe(0);
    expect(wanted.step(11, false)).toBe(false);
    expect(wanted.step(1, false)).toBe(true);
    expect(wanted.level).toBe(0);
    expect(wanted.maximum).toBe(3);
    expect(wanted.step(20, false)).toBe(false);
    const tutorial = new WantedSystem(0, rules.wantedThresholds, 12);
    tutorial.report(100);
    expect(tutorial.level).toBe(0);
  });
});

describe('navigation and guard perception', () => {
  it('routes around inflated walls without cutting corners and rejects sealed routes', () => {
    const nav = new NavigationGrid(bounds, [{ minX: -1, maxX: 1, minZ: -5, maxZ: 5 }]);
    const start = { x: -4, z: 0 },
      goal = { x: 4, z: 0 };
    expect(nav.clear(start, goal, 0)).toBe(false);
    const route = nav.path(start, goal);
    expect(route.length).toBeGreaterThan(10);
    let previous = start;
    for (const point of route) {
      expect(nav.clear(previous, point)).toBe(true);
      previous = point;
    }
    expect(distance2(previous, goal)).toBeLessThan(1);
    const sealed = new NavigationGrid(bounds, [{ minX: -1, maxX: 1, minZ: -30, maxZ: 30 }]);
    expect(sealed.path(start, goal)).toEqual([]);
  });
  it('detects a thin wall between grid nodes', () => {
    const nav = new NavigationGrid(bounds, [{ minX: 0.05, maxX: 0.06, minZ: -2, maxZ: 2 }], 0);
    expect(nav.clear({ x: 0, z: 0 }, { x: 1, z: 0 })).toBe(false);
    const path = nav.path({ x: -1, z: 0 }, { x: 1, z: 0 });
    expect(path.some((p) => Math.abs(p.z) > 2)).toBe(true);
  });
  it('copies coordinates from getter-backed engine positions without leaking engine fields', () => {
    class EnginePoint {
      get x() {
        return 6;
      }
      get z() {
        return 3;
      }
    }
    const target = new EnginePoint();
    const agent = new PoliceAgent(0, { x: 0, z: 0 }, rules);
    agent.perceive(0.1, true, target);
    agent.perceive(1, true, target);
    expect(agent.target).toEqual({ x: 6, z: 3 });
    const nav = new NavigationGrid(bounds, []);
    expect(nav.path({ x: 0, z: 0 }, target)).toEqual([{ x: 6, z: 3 }]);
  });
  it('searches the last sighting rather than following an invisible target', () => {
    const agent = new PoliceAgent(0, { x: 0, z: 0 }, rules);
    agent.perceive(0.1, true, { x: 5, z: 0 });
    expect(agent.state).toBe('SUSPICIOUS');
    agent.perceive(1, true, { x: 6, z: 0 });
    expect(agent.state).toBe('CHASE');
    agent.perceive(0.1, true, null);
    expect(agent.state).toBe('SEARCH');
    expect(agent.target).toEqual({ x: 6, z: 0 });
    agent.perceive(0.1, true, { x: 7, z: 0 });
    expect(agent.state).toBe('CHASE');
    agent.position = { x: 3, z: 0 };
    agent.perceive(0.1, false, null);
    expect(agent.state).toBe('RETURN_TO_PATROL');
    agent.position = { x: 0, z: 0 };
    agent.perceive(0.1, false, null);
    expect(agent.state).toBe('PATROL');
  });
});

describe('coordinated pursuit', () => {
  it('lets a player provoke a new pursuit after an early escape without spamming heat', () => {
    const chase = new PursuitSystem(1, [{ x: 0, z: 0 }], rules, new NavigationGrid(bounds, []));
    for (let i = 0; i < 3; i++) chase.disrupt();
    chase.step(0.1, { x: 0, y: 1, z: 5 });
    for (let i = 0; i < 130; i++) chase.step(0.1, { x: -29, y: 1, z: -29 });
    expect(chase.escapes).toBe(1);
    expect(chase.provoke()).toBe(true);
    const heat = chase.chaos.value;
    expect(chase.provoke()).toBe(false);
    expect(chase.chaos.value).toBe(heat);
    for (let i = 0; i < 31; i++) chase.step(0.1, { x: -29, y: 1, z: -29 });
    expect(chase.provoke()).toBe(true);
    expect(chase.wanted.level).toBe(1);
  });
  it('resets countdown on any guard sighting and emits one escape with capped heat', () => {
    const nav = new NavigationGrid(bounds, []);
    const chase = new PursuitSystem(
      3,
      [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: 20, z: 0 },
      ],
      rules,
      nav,
    );
    for (let i = 0; i < 5; i++) chase.disrupt();
    chase.step(0.1, { x: 0, y: 1, z: 8 });
    expect(chase.snapshot().status).toBe('chase');
    expect(chase.wanted.level).toBe(3);
    // Out of sight and range; the squad continues towards last-seen locations.
    for (let i = 0; i < 100; i++) expect(chase.step(0.1, { x: -29, y: 1, z: -29 })).toBeNull();
    expect(chase.snapshot().escapeSeconds).toBe(2);
    chase.step(0.1, { x: 20, y: 1, z: 0 });
    expect(chase.wanted.unseenSeconds).toBe(0);
    const events = [];
    for (let i = 0; i < 130; i++) events.push(chase.step(0.1, { x: -29, y: 1, z: -29 }));
    expect(events.filter((e) => e === 'escaped')).toHaveLength(1);
    expect(chase.snapshot()).toMatchObject({ wanted: 0, escapes: 1, status: 'escaped' });
    expect(chase.chaos.value).toBeLessThanOrEqual(20);
  });
  it('catches after sustained contact, emits once, and never catches through a wall', () => {
    const nav = new NavigationGrid(bounds, []);
    const chase = new PursuitSystem(1, [{ x: 0, z: 0 }], rules, nav);
    for (let i = 0; i < 3; i++) chase.disrupt();
    const results = [];
    for (let i = 0; i < 40; i++) results.push(chase.step(0.1, { x: 0, y: 1, z: 0 }));
    expect(results.filter((e) => e === 'caught')).toHaveLength(1);
    expect(chase.caught).toBe(true);
    const wall = new NavigationGrid(bounds, [{ minX: -30, maxX: 30, minZ: 0, maxZ: 0.1 }], 0.1);
    const protectedPlayer = new PursuitSystem(1, [{ x: 0, z: -0.4 }], rules, wall);
    for (let i = 0; i < 3; i++) protectedPlayer.disrupt();
    for (let i = 0; i < 200; i++) protectedPlayer.step(0.1, { x: 0, y: 1, z: 0.4 });
    expect(protectedPlayer.caught).toBe(false);
    expect(protectedPlayer.escapes).toBe(0);
  });
});
