import type { Position3 } from '@tobi/contracts';
import { arlesheimVehicles } from '@tobi/game-data';
import type { WorldBuilder } from '../../world/scene-builder.js';
import { neighbourhoodHouses } from './houses.js';
import { neighbourhoodStreets } from './streets.js';
import { wgGarden } from './garden.js';
import { villageLandmarks } from './village.js';
import type { AmbientZone } from '../../audio/spatial-ambience.js';
export function buildNeighbourhood(b: WorldBuilder) {
  neighbourhoodStreets(b);
  const buildings = neighbourhoodHouses(b),
    seats = wgGarden(b);
  villageLandmarks(b);
  const audioZones: AmbientZone[] = [
    {
      id: 'wg-garden',
      kind: 'nature',
      x: -35,
      y: 1,
      z: 10,
      radius: 35,
      volume: 0.16,
      tempo: 2.7,
      note: 460,
    },
    {
      id: 'arlesheim-cafe',
      kind: 'voices',
      x: 47,
      y: 1,
      z: 24,
      radius: 22,
      volume: 0.12,
      tempo: 1.8,
      note: 220,
    },
  ];
  return {
    restSpots: [...seats, ...buildings.flatMap((h) => h.restSpots)],
    vehicles: arlesheimVehicles,
    audioZones,
    focus(p: Position3) {
      b.sectors.update(p);
      for (const h of buildings) h.focus(p.x, p.y, p.z);
    },
  };
}
