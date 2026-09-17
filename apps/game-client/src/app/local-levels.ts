import { levelSchema } from '@tobi/contracts';
import { playableLevels as releasedLevels } from '@tobi/game-data';
import metadata from '../../../../assets/game/levels/poc-city/poc-city.runtime.json';

const position = ([x = 0, y = 0, z = 0]: number[]) => ({ x, y, z });
const spawn = position(metadata.playerSpawns[0]!.position);
const destination = metadata.missionTriggers[0]!;

/** Development-only gallery entry; marker coordinates follow each Blender export. */
export const pocCity = levelSchema.parse({
  schemaVersion: 1,
  id: 'poc_city',
  worldId: 'zurich',
  title: 'PoC City · Blender-Testmap',
  subtitle:
    '50 × 50 Meter frei erkunden: Bar, Innenraum, Treppe, Balkon und Dach. Keine NPCs, keine Zeitlimite.',
  scenery: 'authored',
  authoredAsset: '/level-assets/poc-city/poc-city',
  sandbox: true,
  spawnYaw: Math.PI,
  maxWanted: 0,
  spawn: { ...spawn, y: spawn.y + 1.1 },
  destination: {
    id: destination.id,
    position: position(destination.position),
    radius: destination.radius,
  },
  pickups: [],
  objectives: [{ id: 'explore', type: 'reach', targetId: destination.id }],
  scoring: { bottlePoints: 0, completionBonus: 0 },
  navigationBounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 },
});
export const playableLevels = import.meta.env.DEV ? [...releasedLevels, pocCity] : releasedLevels;
