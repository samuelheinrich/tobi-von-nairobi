import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { baliBuildings, baliVehicles, baliSectors, baliGroundAt } from '@tobi/game-data';
import type { HavokWorld } from '../../physics/havok-world.js';
import { baliBuilder } from './builder.js';
import { buildTerrain } from './terrain.js';
import { buildRoads } from './roads.js';
import { buildBuilding } from '../../world/buildings.js';
import { buildLandmarks } from './landmarks.js';
import { buildAtmosphere } from './atmosphere.js';
import { destinationRing } from '../scene-kit.js';
export function createBaliWorld(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const b = baliBuilder(scene, world),
    waves = buildTerrain(b);
  buildRoads(b);
  const buildings = baliBuildings.map((d) => {
    const sector = [...baliSectors].sort(
      (a, c) =>
        Math.hypot(a.x - d.position.x, a.z - d.position.z) -
        Math.hypot(c.x - d.position.x, c.z - d.position.z),
    )[0]!;
    return buildBuilding(b, d, sector.id);
  });
  buildLandmarks(b);
  const audioZones = buildAtmosphere(b);
  b.sectors.update(level.spawn);
  let time = 0;
  return {
    ...b,
    destination: destinationRing(scene, level),
    restSpots: buildings.flatMap((b) => b.restSpots),
    audioZones,
    vehicles: baliVehicles,
    worldLabel(position: Position3) {
      const s = [...baliSectors].sort(
        (a, c) =>
          Math.hypot(a.x - position.x, a.z - position.z) -
          Math.hypot(c.x - position.x, c.z - position.z),
      )[0]!;
      return s.id.replaceAll('_', ' ').toUpperCase();
    },
    safeGround(position: Position3) {
      return position.y > -0.45 || baliGroundAt(position.x, position.z);
    },
    focus(position: Position3) {
      b.sectors.update(position);
      for (const building of buildings) building.focus(position.x, position.y, position.z);
      scene.metadata = { ...scene.metadata, sectors: b.sectors.stats };
    },
    update(delta: number) {
      time += delta;
      waves(time);
    },
  };
}
