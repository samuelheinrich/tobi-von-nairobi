/** Compressed, rotated Bangkok block. Metres; y is floor elevation, not capsule centre. */
export const nanaWorld = {
  bounds: { minX: -74, maxX: 74, minZ: -90, maxZ: 86 },
  floorHeight: 4.8,
  courtyard: { minX: -16, maxX: 16, minZ: 4, maxZ: 52 },
  bts: { x: 22, y: 8, z: -49, cycle: 44 },
  entrance: { x: 0, y: 0, z: 2 },
  sectors: [
    { id: 'nana-bts', x: 26, y: 8, z: -52, radius: 55 },
    { id: 'sukhumvit-road', x: 0, y: 0, z: -62, radius: 100 },
    { id: 'soi-4', x: 0, y: 0, z: -25, radius: 60 },
    { id: 'nana-entrance', x: 0, y: 0, z: 0, radius: 45 },
    { id: 'nana-courtyard', x: 0, y: 0, z: 28, radius: 65 },
    { id: 'nana-floor-2', x: 0, y: 4.8, z: 32, radius: 65 },
    { id: 'nana-floor-3', x: 0, y: 9.6, z: 32, radius: 65 },
  ],
} as const;

/** Tour route for authoring and real-motor browser verification, never runtime teleportation. */
export const nanaTour = [
  { x: 32, y: 8, z: -49 },
  { x: 60, y: 0, z: -49 },
  { x: 64, y: 0, z: -49 },
  { x: 64, y: 0, z: -44 },
  { x: 0, y: 0, z: -44 },
  { x: 0, y: 0, z: 12 },
  { x: 0, y: 0, z: 62 },
  { x: 3, y: 0, z: 67 },
  { x: 3, y: 2.4, z: 81 },
  { x: -3, y: 2.4, z: 81 },
  { x: -3, y: 4.8, z: 67 },
  { x: 0, y: 4.8, z: 62 },
  { x: 3, y: 4.8, z: 67 },
  { x: 3, y: 7.2, z: 81 },
  { x: -3, y: 7.2, z: 81 },
  { x: -3, y: 9.6, z: 67 },
  { x: 0, y: 9.6, z: 58 },
  { x: -19, y: 9.6, z: 58 },
  { x: -19, y: 9.6, z: 10 },
  { x: -26, y: 9.6, z: 12 },
] as const;
