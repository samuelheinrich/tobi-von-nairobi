import type { VehicleDefinition, WorldSectorDefinition } from '@tobi/contracts';
import { keepClear, rectFrom, roadRect, type Rect2 } from './spawn-safety.js';

export const phuketSectors = [
  { id: 'station', x: -25, z: 38, radius: 28, visibilityMargin: 30 },
  { id: 'old-town', x: -70, z: 0, radius: 42, visibilityMargin: 35 },
  { id: 'nightlife', x: -125, z: 23, radius: 48, visibilityMargin: 40 },
  { id: 'night-market', x: -112, z: -52, radius: 38, visibilityMargin: 30 },
  { id: 'patong-beach', x: -183, z: 0, radius: 50, visibilityMargin: 45 },
] as const satisfies readonly WorldSectorDefinition[];

export const phuketVehicles = [
  {
    id: 'phuket-scooter-1',
    kind: 'scooter',
    label: 'HOTEL-SCOOTER',
    position: { x: -60, y: 0.8, z: -7 },
    yaw: Math.PI / 2,
    maxSpeed: 18,
    acceleration: 10,
    braking: 18,
    steering: 1.65,
  },
  {
    id: 'phuket-scooter-2',
    kind: 'scooter',
    label: 'MARKT-SCOOTER',
    position: { x: -103, y: 0.8, z: -43 },
    yaw: 0.2,
    maxSpeed: 18,
    acceleration: 10,
    braking: 18,
    steering: 1.65,
  },
  {
    id: 'phuket-tuktuk-1',
    kind: 'tuk-tuk',
    label: 'PHUKET TUK-TUK',
    position: { x: -84, y: 1.1, z: 7 },
    yaw: -Math.PI / 2,
    maxSpeed: 13,
    acceleration: 6.2,
    braking: 12,
    steering: 1.15,
  },
  {
    id: 'phuket-tuktuk-2',
    kind: 'tuk-tuk',
    label: 'PATONG NIGHT TAXI',
    position: { x: -151, y: 1.1, z: 8 },
    yaw: Math.PI / 2,
    maxSpeed: 13,
    acceleration: 6.2,
    braking: 12,
    steering: 1.15,
  },
] as const satisfies readonly VehicleDefinition[];

export type PhuketResidentRole =
  'tourist' | 'local' | 'vendor' | 'bartender' | 'dancer' | 'cabaret' | 'security' | 'beach_guest';

export interface PhuketResident {
  id: number;
  x: number;
  z: number;
  role: PhuketResidentRole;
  action: 'idle' | 'walk' | 'dance' | 'phone' | 'drink' | 'sit';
  female?: boolean;
}

const roles: readonly PhuketResidentRole[] = [
  'tourist',
  'local',
  'vendor',
  'bartender',
  'dancer',
  'cabaret',
  'security',
  'beach_guest',
];
const actions = ['idle', 'walk', 'phone', 'drink'] as const;

/** The carriageways, and the shophouse row, as areas nobody should be standing in.
 *
 * Kept next to the residents on purpose: the moment a road moves, the spawns move with it. The
 * numbers mirror `phuket/world.ts`, which builds the roads and the sixteen shophouses.
 */
/** The sixteen shophouses of the old town, as the single source both the scene builder and the
 * validator read. The south row sat underneath the party road until 17.09.2026; scooters and
 * tuk-tuks drove through three of the houses. */
export const phuketShophouses = Array.from({ length: 16 }, (_, i) => {
  const x = -50 - i * 8.2;
  const side = i % 2 ? -1 : 1;
  const z = side > 0 ? 34 + (i % 3) * 2.2 : -(18 + (i % 3) * 2.2);
  return { id: `shophouse-${i}`, x, z, side, width: 7.2, depth: 10, enterable: i % 4 === 0 };
});

/** Carriageways, as rectangles. Mirrors the roads laid in `phuket/world.ts`. */
export const phuketRoads = [
  { id: 'hauptstrasse', from: { x: -192, z: 0 }, to: { x: -18, z: 0 }, width: 15 },
  { id: 'partystrasse', from: { x: -165, z: 21 }, to: { x: -87, z: 21 }, width: 14 },
  { id: 'marktstrasse', from: { x: -142, z: -47 }, to: { x: -80, z: -47 }, width: 10 },
] as const;

export const phuketNoSpawnAreas: readonly Rect2[] = [
  ...phuketRoads.map((r) => roadRect(r.from, r.to, r.width, 1)),
  ...phuketShophouses.map((h) => rectFrom(h.x, h.z, h.width, h.depth)),
];

const rawResidents: readonly PhuketResident[] = Array.from({ length: 62 }, (_, id) => {
  const area = id % 4;
  const nightlife = area === 1;
  const beach = area === 2;
  const market = area === 3;
  const role: PhuketResidentRole = nightlife
    ? id % 5 === 0
      ? 'security'
      : id % 3 === 0
        ? 'cabaret'
        : id % 2
          ? 'dancer'
          : 'bartender'
    : beach
      ? 'beach_guest'
      : market
        ? id % 3 === 0
          ? 'vendor'
          : 'local'
        : roles[id % 2]!;
  const centre = nightlife
    ? { x: -126, z: 23 }
    : beach
      ? { x: -181, z: 0 }
      : market
        ? { x: -112, z: -52 }
        : { x: -68, z: 1 };
  return {
    id,
    x: centre.x + ((id * 17) % 31) - 15,
    z: centre.z + ((id * 11) % 25) - 12,
    role,
    action:
      nightlife && role !== 'security'
        ? 'dance'
        : market && role === 'vendor'
          ? 'idle'
          : actions[id % actions.length]!,
    female: role === 'dancer' || role === 'cabaret' || (role === 'beach_guest' && id % 3 !== 0),
  };
});

/** The formula above scatters people around four centres and knows nothing about the world it
 * scatters them into. This pushes them off the carriageways and out of the shophouses. */
export const phuketResidents: readonly PhuketResident[] = keepClear(
  rawResidents,
  phuketNoSpawnAreas,
);
