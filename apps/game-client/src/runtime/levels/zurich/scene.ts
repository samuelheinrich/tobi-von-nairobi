import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { zurichSectors, zurichTrainRoute } from '@tobi/game-data';
import type { HavokWorld } from '../../physics/havok-world.js';
import { createWorldBuilder } from '../../world/scene-builder.js';
import { TrainSystem } from '../../trains/train-system.js';
import { createParadeScene } from '../parade-scene.js';
import { buildZurichCity } from './city.js';
import { buildHauptbahnhof } from './hauptbahnhof.js';
import { buildZurichRailNetwork } from './rail-network.js';
import { buildStadelhofen } from './stadelhofen.js';

export function createZurichScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const parade = createParadeScene(scene, world, level),
    builder = createWorldBuilder(scene, world, zurichSectors, '#151d38', parade),
    cityBuildings = buildZurichCity(builder),
    hb = buildHauptbahnhof(builder),
    stadelhofen = buildStadelhofen(builder);
  buildZurichRailNetwork(builder);
  const trains = new TrainSystem(scene, world, [zurichTrainRoute]);
  builder.sectors.update(level.spawn);
  const audioZones = [
    {
      id: 'parade-bass',
      x: 0,
      y: 0,
      z: -25,
      radius: 95,
      kind: 'music' as const,
      tempo: 0.46,
      note: 165,
      volume: 0.055,
    },
    {
      id: 'hb-hall',
      x: -35,
      y: 0,
      z: 82,
      radius: 58,
      kind: 'train' as const,
      tempo: 1.15,
      note: 220,
      volume: 0.05,
    },
    {
      id: 'stadelhofen-rail',
      x: 70,
      y: 0,
      z: 84,
      radius: 42,
      kind: 'train' as const,
      tempo: 1.3,
      note: 240,
      volume: 0.045,
    },
    {
      id: 'bahnhofstrasse-traffic',
      x: -34,
      y: 0,
      z: 48,
      radius: 44,
      kind: 'traffic' as const,
      tempo: 1.7,
      note: 330,
      volume: 0.035,
    },
  ];
  return {
    ...builder,
    destination: parade.destination,
    transit: trains,
    restSpots: [
      ...hb.restSpots,
      ...stadelhofen.restSpots,
      ...cityBuildings.flatMap((building) => building.restSpots),
      ...trains.seats,
    ],
    audioZones,
    focus(position: Position3) {
      builder.sectors.update(position);
      for (const building of cityBuildings) building.focus(position.x, position.y, position.z);
      scene.metadata = { ...scene.metadata, sectors: builder.sectors.stats, trains: trains.debug };
    },
    update(delta: number) {
      parade.update?.(delta);
      trains.update(delta);
    },
    worldLabel(position: Position3) {
      if (position.z < 40) return 'STREET PARADE · SEEBECKEN';
      if (position.x > 48) return 'ZÜRICH STADELHOFEN';
      if (position.z > 74 || position.y < -1)
        return position.y < -1 ? 'HB · S-BAHN 41–44' : 'ZÜRICH HB';
      return 'BAHNHOFSTRASSE';
    },
    interactionPrompt(position: Position3) {
      if (position.z > 74 && (position.x < 5 || position.x > 48)) {
        const train = trains.primary?.snapshot;
        return train
          ? `${train.state} · ${train.currentStation} → ${train.nextStation} · TÜREN ${train.doorState}`
          : '';
      }
      return '';
    },
    debugState: () => ({ sectors: builder.sectors.stats, trains: trains.debug }),
    debugTeleports: [
      { label: 'Zürich HB · Halle', position: { x: -42, y: 1.1, z: 64 } },
      { label: 'Zürich HB · Gleis 12', position: { x: -6, y: 1.25, z: 87 } },
      { label: 'HB · S-Bahn-Zugang', position: { x: -67, y: 1.1, z: 57 } },
      { label: 'HB · S-Bahn', position: { x: -43, y: -3.7, z: 91 } },
      { label: 'Stadelhofen', position: { x: 76, y: 1.25, z: 82 } },
    ],
  };
}
