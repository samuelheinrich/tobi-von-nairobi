/** Connected L/T-shaped coastal district. Rectangles are ground, not separate loading zones. */
export const baliAdventureLayout = {
  ground: [
    { minX: -40, maxX: 16, minZ: -48, maxZ: -16 },
    { minX: -8, maxX: 16, minZ: -16, maxZ: 8 },
    { minX: -8, maxX: 56, minZ: 8, maxZ: 40 },
    { minX: 24, maxX: 56, minZ: 40, maxZ: 64 },
    { minX: -8, maxX: 56, minZ: 64, maxZ: 88 },
  ],
  route: [
    [-28, -32],
    [-20, -32],
    [-12, -32],
    [-4, -32],
    [4, -24],
    [0, -16],
    [0, -8],
    [0, 2],
    [4, 12],
    [12, 12],
    [20, 12],
    [28, 12],
    [36, 20],
    [40, 30],
    [40, 40],
    [40, 48],
    [40, 60],
    [32, 66],
    [16, 68],
    [0, 72],
  ],
  buildings: [
    { x: 29, z: 48, w: 6, d: 10 },
    { x: 48, z: 59, w: 8, d: 6 },
    { x: 26, z: 75, w: 10, d: 8 },
    { x: 14, z: 79, w: 6, d: 8 },
    { x: 45, z: 78, w: 10, d: 8 },
  ],
} as const;
export function baliGroundAt(x: number, z: number): boolean {
  return baliAdventureLayout.ground.some(
    (r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ,
  );
}
