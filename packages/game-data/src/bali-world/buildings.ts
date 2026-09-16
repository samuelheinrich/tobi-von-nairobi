import type { BuildingDefinition } from '@tobi/contracts';
import { baliTerrainHeight } from './world.js';
function building(
  id: string,
  label: string,
  x: number,
  z: number,
  interiorType: BuildingDefinition['interiorType'],
  enterable: BuildingDefinition['enterable'] = 'fully_enterable',
  roofWalkable = false,
): BuildingDefinition {
  return {
    id,
    label,
    position: { x, y: baliTerrainHeight(x, z), z },
    width: 12,
    depth: 10,
    height: 3.5,
    enterable,
    roofWalkable,
    interiorType,
    collisionMode: 'compound',
    color: interiorType === 'warung' ? '#c69061' : '#dfc7a3',
    doors: [{ x: 0, width: 3.2 }],
    spawnPoints: [{ x: 0, y: 0, z: 1 }],
  };
}
export const baliBuildings: readonly BuildingDefinition[] = [
  building('beach-bar', 'KARLS BEACH BAR', -66, -105, 'bar', 'shallow_interior', true),
  building('coast-warung', 'WARUNG OMBAK', -35, -75, 'warung', 'fully_enterable'),
  building('mini-mart', 'MINI MART / 24 JAM', 18, 8, 'shop', 'fully_enterable', true),
  building('casa', 'CASA TOBI', -14, 0, 'home', 'fully_enterable', true),
  building('town-bar', 'KONTO LEER BAR', 40, 8, 'bar', 'shallow_interior'),
  building('guesthouse', 'PONDOK SUNSET', 58, 22, 'home', 'facade_only'),
  building('market-warung', 'WARUNG PASAR', 40, 65, 'warung', 'fully_enterable', true),
  building('jungle-warung', 'WARUNG HUTAN', 99, 143, 'warung', 'shallow_interior'),
  building('rice-hut', 'SAWAH VIEW', -46, 178, 'warung', 'shallow_interior'),
  building('harbour-shop', 'PELABUHAN / BOATS', -88, 49, 'shop', 'shallow_interior'),
  building('island-hut', 'KARL WAR SCHON HIER', -240, 90, 'home', 'fully_enterable'),
  ...[0, 1, 2, 3, 4, 5].map((i) =>
    building(
      'town-facade-' + i,
      ['LAUNDRY', 'GUESTHOUSE', 'SCOOTER SERVICE'][i % 3]!,
      75 + (i % 2) * 17,
      -15 + Math.floor(i / 2) * 21,
      'shop',
      'facade_only',
    ),
  ),
];
