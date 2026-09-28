import { levelSchema } from '@tobi/contracts';
import { playableLevels as releasedLevels } from '@tobi/game-data';
import metadata from '../../../../assets/game/levels/poc-city/poc-city.runtime.json';
import zurichMetadata from '../../../../assets/game/levels/zurich-streetparade/zurich-streetparade.runtime.json';

const position = ([x = 0, y = 0, z = 0]: number[]) => ({ x, y, z });
const spawn = position(metadata.playerSpawns[0]!.position);
const destination = metadata.missionTriggers[0]!;

/** Playable Blender pipeline test map; marker coordinates follow each export. */
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
const zurichSpawn = zurichMetadata.playerSpawns.find((marker) => marker.id === 'MARK_first_spawn');
const zurichGoal = zurichMetadata.missionTriggers.find(
  (marker) => marker.id === 'MARK_explore_hafendamm',
);
if (!zurichSpawn || !zurichGoal) throw new Error('Zürich blockout markers are incomplete.');

/** Playable review blockout: the released Street Parade level remains untouched. */
export const zurichStreetParadeBlockout = levelSchema.parse({
  schemaVersion: 1,
  id: 'zurich_street_parade_blockout',
  worldId: 'zurich',
  title: 'Zürich Street Parade · neuer Blockout',
  subtitle: 'Neue Blender-Welt: HB, Stadelhofen, Enge und die Route am See zu Fuss erkunden.',
  scenery: 'authored',
  authoredAsset: '/level-assets/zurich-streetparade/zurich-streetparade',
  sandbox: true,
  spawnYaw: Math.PI / 2,
  maxWanted: 0,
  spawn: { ...position(zurichSpawn.position), y: zurichSpawn.position[1]! + 1.1 },
  destination: {
    id: zurichGoal.id,
    position: position(zurichGoal.position),
    radius: zurichGoal.radius,
  },
  pickups: [],
  objectives: [{ id: 'explore', type: 'reach', targetId: zurichGoal.id }],
  scoring: { bottlePoints: 0, completionBonus: 0 },
});
export const playableLevels = [...releasedLevels, pocCity, zurichStreetParadeBlockout];
