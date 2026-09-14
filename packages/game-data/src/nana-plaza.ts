/** Authoring dimensions in metres for the courtyard venue; the entrance soi lies at falling z. */
export const nanaPlazaLayout = {
  courtyard: { minX: -14, maxX: 14, minZ: -14, maxZ: 18 },
  wingDepth: 8,
  storeys: 3,
  storeyHeight: 4,
  danceFloor: { x: 0, z: 4, radius: 9 },
  /** Podium positions for the pole dancers, kept clear of the walkable ring. */
  poles: [
    { x: -10.5, z: -8 },
    { x: 10.5, z: -8 },
    { x: -10.5, z: 0 },
    { x: 10.5, z: 0 },
    { x: -10.5, z: 8 },
    { x: 10.5, z: 8 },
    { x: -5, z: 15 },
    { x: 5, z: 15 },
  ],
  /** Counter centre, length along z and the side the stools stand on. */
  bars: [
    { x: -12.4, z: -3, length: 11, side: 1 },
    { x: 12.4, z: -3, length: 11, side: -1 },
    { x: 0, z: 16.6, length: 12, side: -1 },
  ],
  towers: [
    { x: -34, z: -18, width: 12, depth: 12, height: 44 },
    { x: -36, z: 10, width: 14, depth: 16, height: 58 },
    { x: 34, z: -14, width: 13, depth: 14, height: 50 },
    { x: 36, z: 14, width: 12, depth: 12, height: 38 },
    { x: -14, z: 44, width: 16, depth: 14, height: 62 },
    { x: 16, z: 46, width: 14, depth: 14, height: 46 },
    { x: 0, z: -46, width: 18, depth: 12, height: 34 },
  ],
} as const;
