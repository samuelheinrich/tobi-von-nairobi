import type { WorldSectorDefinition, VehicleDefinition } from '@tobi/contracts';
export const baliSectors: readonly WorldSectorDefinition[] = [
  { id: 'beach', x: -60, z: -80, radius: 65 },
  { id: 'town', x: 30, z: 10, radius: 65 },
  { id: 'market', x: 45, z: 70, radius: 45 },
  { id: 'roads', x: 50, z: 110, radius: 95 },
  { id: 'jungle', x: 90, z: 165, radius: 65 },
  { id: 'temple', x: 80, z: 215, radius: 50 },
  { id: 'rice_terraces', x: -20, z: 155, radius: 50 },
  { id: 'harbour', x: -95, z: 35, radius: 35 },
  { id: 'island_1', x: -235, z: 70, radius: 45 },
  { id: 'island_2', x: -350, z: 220, radius: 50 },
  { id: 'island_3', x: 240, z: -220, radius: 65 },
];
export const baliSeaLevel = -0.65;
/** Continuous coastal heightfield. Interior is gently sloped, shore falls below the sea. */
export function baliTerrainHeight(x: number, z: number): number {
  const angle = Math.atan2((z - 45) / 225, (x - 40) / 165);
  const radius = Math.hypot((x - 40) / 165, (z - 45) / 225);
  const coast = 1 + 0.035 * Math.sin(angle * 5) + 0.025 * Math.cos(angle * 3);
  const mainland = Math.min(1, (coast - radius) / 0.08) * 12;
  const river =
    x > 68 && x < 95 && z > 153 && z < 165 ? 1.5 * Math.sin((Math.PI * (z - 153)) / 12) : 0;
  const inland = Math.max(0, Math.min(8, (z - 95) * 0.055)) - river;
  const islandRadius = Math.hypot((x + 235) / 43, (z - 70) / 48);
  const island = Math.min(0, (0.9 - islandRadius) * 20);
  return Math.max(-12, Math.min(inland, mainland), island);
}
export function baliGroundAt(x: number, z: number): boolean {
  return baliTerrainHeight(x, z) > -0.15;
}
export const baliRoads = [
  {
    id: 'coast-road',
    kind: 'asphalt',
    width: 7,
    points: [
      [-60, -88],
      [-35, -65],
      [-15, -25],
      [0, 10],
      [15, 45],
      [25, 80],
      [50, 115],
      [80, 160],
      [80, 202],
    ],
  },
  {
    id: 'harbour-road',
    kind: 'asphalt',
    width: 6,
    points: [
      [0, 10],
      [-35, 20],
      [-72, 35],
      [-99, 35],
    ],
  },
  {
    id: 'terrace-road',
    kind: 'dirt',
    width: 5,
    points: [
      [25, 80],
      [0, 105],
      [-30, 120],
      [-40, 155],
      [-20, 195],
      [45, 210],
      [80, 202],
    ],
  },
  {
    id: 'market-lane',
    kind: 'asphalt',
    width: 6,
    points: [
      [15, 45],
      [45, 45],
      [60, 80],
      [50, 115],
    ],
  },
] as const;
export const baliLandingZones = [
  {
    id: 'harbour-dock',
    mooring: { x: -128, y: 0, z: 35 },
    exit: { x: -121, y: 1.25, z: 35 },
    radius: 10,
  },
  {
    id: 'island-dock',
    mooring: { x: -184, y: 0, z: 70 },
    exit: { x: -191, y: 1.25, z: 70 },
    radius: 10,
  },
] as const;
export const baliVehicles = [
  {
    id: 'beach-scooter',
    kind: 'scooter',
    label: 'KARLS SCOOTER',
    position: { x: -55, y: 0.85, z: -82 },
    yaw: 0.5,
    maxSpeed: 23,
    acceleration: 7,
    braking: 12,
    steering: 1.5,
  },
  {
    id: 'town-scooter',
    kind: 'scooter',
    label: 'MARKT-SCOOTER',
    position: { x: 5, y: 0.85, z: 16 },
    yaw: 0,
    maxSpeed: 23,
    acceleration: 7,
    braking: 12,
    steering: 1.5,
  },
  {
    id: 'harbour-boat',
    kind: 'boat',
    label: 'KARLS INSEL-EXPRESS',
    position: { x: -128, y: 0, z: 35 },
    yaw: -Math.PI / 2,
    maxSpeed: 16,
    acceleration: 4,
    braking: 6,
    steering: 1.1,
    landingZones: baliLandingZones,
  },
] satisfies readonly VehicleDefinition[];
export const baliTerraces = [0, 1, 2, 3].map((i) => ({
  x: -16,
  z: 137 + i * 10,
  y: baliTerrainHeight(-16, 137 + i * 10) + 0.6 + i * 0.65,
  width: 30,
  depth: 10,
}));
