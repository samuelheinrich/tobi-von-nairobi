import { describe, expect, it } from 'vitest';
import { streetParade } from './index.js';
import { zurichLayout, zurichStations, zurichTrainRoute, zurichWorldBounds } from './zurich.js';

interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
const footprint = (block: { x: number; z: number; width: number; depth: number }): Rect => ({
  minX: block.x - block.width / 2,
  maxX: block.x + block.width / 2,
  minZ: block.z - block.depth / 2,
  maxZ: block.z + block.depth / 2,
});
const covers = (rect: Rect, point: { x: number; z: number }, margin = 0): boolean =>
  point.x >= rect.minX - margin &&
  point.x <= rect.maxX + margin &&
  point.z >= rect.minZ - margin &&
  point.z <= rect.maxZ + margin;

const solids = [
  ...zurichLayout.blocks.filter((block) => block.id !== 'hauptbahnhof').map(footprint),
  ...zurichLayout.towers.map(footprint),
  ...zurichLayout.loveMobiles.map(footprint),
];
const items = [
  ...streetParade.pickups.map((pickup) => ({ id: pickup.id, ...pickup.position })),
  ...streetParade.powerups.map((powerup) => ({ id: powerup.id, ...powerup.position })),
  { id: 'spawn', ...streetParade.spawn },
  { id: 'destination', ...streetParade.destination.position },
  ...(streetParade.policeSpawns ?? []).map((spawn, index) => ({ id: `police-${index}`, ...spawn })),
];

/** The city plate and the level file are authored separately; these keep them consistent. */
describe('Zurich street parade placement', () => {
  it('keeps every item, spawn and police post clear of buildings and love mobiles', () => {
    const blocked = items.filter((item) => solids.some((rect) => covers(rect, item, 1)));
    expect(blocked.map((item) => item.id)).toEqual([]);
  });

  it('keeps every item out of the lake and the Limmat unless it stands on a bridge', () => {
    const bridged = (point: { x: number; z: number }): boolean =>
      zurichLayout.bridges.some((bridge) => covers(bridge, point));
    const drowned = items.filter(
      (item) => !bridged(item) && zurichLayout.water.some((basin) => covers(basin, item, 1)),
    );
    expect(drowned.map((item) => item.id)).toEqual([]);
  });

  it('keeps the whole plate inside the navigation bounds the pursuit uses', () => {
    const bounds = streetParade.navigationBounds;
    expect(bounds).toBeDefined();
    expect(bounds!.minX).toBeGreaterThan(zurichWorldBounds.minX);
    expect(bounds!.maxX).toBeLessThan(zurichWorldBounds.maxX);
    expect(bounds!.minZ).toBeGreaterThan(zurichWorldBounds.minZ);
    expect(bounds!.maxZ).toBeLessThan(zurichWorldBounds.maxZ);
  });

  it('follows the documented parade order from Utoquai to the Hafendamm', () => {
    const route = zurichLayout.route;
    expect(route[0]).toEqual({ x: streetParade.spawn.x, z: streetParade.spawn.z });
    expect(route[route.length - 1]).toEqual({
      x: streetParade.destination.position.x,
      z: streetParade.destination.position.z,
    });
  });

  it('authors the promised HB tracks and a two-station train route', () => {
    expect(zurichStations.hb.surfaceTracks).toBe(12);
    expect(zurichStations.hb.undergroundTracks).toBe(4);
    expect(zurichTrainRoute.stops.map((stop) => stop.id)).toEqual(['zurich_hb', 'stadelhofen']);
    expect(zurichTrainRoute.points.length).toBeGreaterThanOrEqual(6);
  });

  it('distributes twelve additional bottles through HB and Stadelhofen', () => {
    expect(streetParade.pickups).toHaveLength(42);
    expect(streetParade.pickups.filter((pickup) => pickup.position.z > 40)).toHaveLength(12);
  });
});
