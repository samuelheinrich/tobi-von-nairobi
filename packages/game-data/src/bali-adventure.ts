export * from './bali-world/world.js';
export * from './bali-world/buildings.js';
export * from './bali-world/content.js';
// Historical public export retained for tools; world data now lives in focused modules.
import { baliRoads, baliSectors } from './bali-world/world.js';
import { baliBuildings } from './bali-world/buildings.js';
export const baliAdventureLayout = {
  roads: baliRoads,
  sectors: baliSectors,
  buildings: baliBuildings,
};
