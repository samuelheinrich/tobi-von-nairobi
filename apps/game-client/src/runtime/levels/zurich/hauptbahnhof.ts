import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { RestSpot } from '@tobi/game-core';
import type { WorldBuilder } from '../../world/scene-builder.js';
import {
  buildPlatform,
  buildStationClock,
  buildStationFurniture,
  buildStationRamp,
  buildStaticTrain,
  buildTrack,
} from '../../trains/train-station.js';

/** Zürich HB blockout: 12 surface tracks, a hall and four actual lower S-Bahn tracks. */
export function buildHauptbahnhof(b: WorldBuilder) {
  const sector = 'zurich_hb',
    restSpots: RestSpot[] = [];
  // The main concourse remains continuous. The S-Bahn ramp sits at the quiet western edge,
  // with its opening cut to exactly the width protected by its handrails.
  for (const [x, width] of [
    [-72.05, 4.9],
    [-29.95, 69.1],
  ] as const)
    b.prop(sector, 'hb-hall-floor', [width, 0.3, 19], [x, -0.15, 63], '#b7b0a3', true);
  for (const [x, width] of [
    [-72.05, 4.9],
    [-29.95, 69.1],
  ] as const)
    b.prop(sector, 'hb-hall-north-floor', [width, 0.3, 5.5], [x, -0.15, 75.25], '#b7b0a3', true);
  // Hall perimeter and landmark glass roof; the broad south opening connects Bahnhofstrasse.
  for (const x of [-74.5, 4.5])
    b.prop(sector, 'hb-side-wall', [0.5, 11, 67], [x, 5.5, 86], '#b9a98e', true);
  for (const [x, width] of [
    [-61.25, 26.5],
    [-8.75, 26.5],
  ] as const)
    b.prop(sector, 'hb-south-wall', [width, 10, 0.5], [x, 5, 52.5], '#cbbda4', true);
  for (let x = -70; x <= 0; x += 10)
    b.prop(sector, 'hb-roof-column', [0.45, 11.5, 0.45], [x, 5.75, 72], '#6d7479', true);
  for (const z of [63, 82, 101])
    b.prop(sector, 'hb-glass-roof', [78, 0.2, 17], [-35, 11.5, z], '#668291', true);
  buildStationClock(b, sector, -35, 8.2, 52.15);
  b.sign(sector, 'ABFAHRT · DEPARTURES', -35, 7.2, 71.8, 11);
  for (const [line, text] of [
    [1, '07:32  S16  STADELHOFEN  GLEIS 12'],
    [2, '07:37  IC 5  LAUSANNE      GLEIS 7'],
    [3, '07:41  IR 13  CHUR          GLEIS 9'],
  ] as const)
    b.sign(sector, text, -35, 6.85 - line * 0.58, 71.7, 10.5);
  // Six-metre track spacing creates useful island platforms and keeps trains out of each other.
  b.prop(sector, 'hb-track-pit-floor', [77, 0.35, 40], [-35, -0.55, 98], '#3e4448', true);
  const trackXs = Array.from({ length: 12 }, (_, index) => -69 + index * 6);
  for (const [index, x] of trackXs.entries())
    buildTrack(b, sector, `hb-track-${index + 1}`, x, 0.05, 98, 40);
  for (let pair = 0; pair < 6; pair++) {
    const x = (trackXs[pair * 2]! + trackXs[pair * 2 + 1]!) / 2;
    buildPlatform(b, sector, {
      id: `hb-platform-${pair + 1}`,
      x,
      y: 0.26,
      z: 98,
      width: 3.2,
      length: 41,
      trackNumbers: [pair * 2 + 1, pair * 2 + 2],
    });
    buildStationFurniture(b, sector, `hb-bench-${pair}`, x, 0.34, 94);
    restSpots.push({
      id: `hb-seat-${pair}`,
      label: `GLEIS ${pair * 2 + 1} · SITZEN`,
      kind: 'seat',
      position: { x, y: 1.05, z: 94 },
      exit: { x: x + 1.9, y: 1.25, z: 94 },
      yaw: Math.PI / 2,
      seatHeight: 0.52,
    });
  }
  buildStaticTrain(b, sector, 'hb-ic-gleis-3', trackXs[2]!, 0.22, 101, 3);
  buildStaticTrain(b, sector, 'hb-ir-gleis-7', trackXs[6]!, 0.22, 96, 2);
  // Shops are shallow but genuinely collidable and leave the central circulation route open.
  for (const [x, label, color] of [
    [-61, 'KIOSK', '#cf323b'],
    [-53, 'BÄCKEREI', '#d69b49'],
    [-17, 'SBB REISEZENTRUM', '#cf323b'],
    [-8, 'APOTHEKE', '#5b9a65'],
  ] as const) {
    b.prop(sector, 'hb-shop', [6.8, 3.1, 3.2], [x, 1.55, 56], color, true);
    b.sign(sector, label, x, 2.1, 54.35, 5.2);
  }
  // Lower station is five metres below the surface tracks. A side ramp and protected connector
  // keep the central hall solid while still providing a continuous, non-teleport route.
  buildStationRamp(
    b,
    sector,
    'hb-sbahn-access',
    new Vector3(-67, 0, 56),
    new Vector3(-67, -5, 74),
    4.8,
  );
  // Opaque shaft cheeks hide the underside of the concourse and make the descent read as an
  // intentional passage instead of a hole into the level void.
  for (const x of [-69.55, -64.45])
    b.prop(sector, 'hb-sbahn-shaft-wall', [0.3, 5.2, 18.5], [x, -2.6, 65], '#887f72', true);
  b.prop(sector, 'hb-sbahn-connector-floor', [17.5, 0.35, 7], [-60.75, -5.35, 76.5], '#777b7d', true);
  b.prop(sector, 'hb-sbahn-connector-wall', [12.5, 3.8, 0.22], [-58.25, -3.1, 73.2], '#887f72', true);
  b.prop(sector, 'hb-sbahn-connector-wall', [17.5, 3.8, 0.22], [-60.75, -3.1, 79.8], '#887f72', true);
  b.prop(sector, 'hb-sbahn-connector-wall', [0.3, 3.8, 7], [-69.55, -3.1, 76.5], '#887f72', true);
  b.prop(sector, 'hb-sbahn-floor', [34, 0.35, 43], [-35, -5.35, 95], '#777b7d', true);
  for (const x of [-47, -39, -31, -23]) buildTrack(b, sector, 'hb-sbahn-track', x, -5, 96, 40);
  for (const [index, x] of [-43, -27].entries())
    buildPlatform(b, sector, {
      id: `hb-sbahn-platform-${index + 1}`,
      x,
      y: -4.68,
      z: 96,
      width: 3.6,
      length: 40,
      trackNumbers: [41 + index * 2, 42 + index * 2],
    });
  // West wall leaves a broad doorway for the connector; the east wall remains continuous.
  b.prop(sector, 'hb-sbahn-wall', [0.4, 5.2, 35.5], [-52.2, -2.6, 99.75], '#887f72', true);
  b.prop(sector, 'hb-sbahn-wall', [0.4, 5.2, 45], [-17.8, -2.6, 95], '#887f72', true);
  b.prop(sector, 'hb-sbahn-back', [35, 5.2, 0.5], [-35, -2.6, 117], '#887f72', true);
  b.sign(sector, 'S-BAHN · GLEISE 41–44 ↓', -67, 3.5, 54.8, 8);
  // Signals and bumpers close the finite terminal naturally.
  for (const x of trackXs) {
    b.prop(sector, 'hb-buffer', [2.1, 0.8, 0.45], [x, 0.4, 75.5], '#3c4246', true);
    const signal = MeshBuilder.CreateCylinder(
      'hb-signal',
      { height: 3, diameter: 0.18, tessellation: 7 },
      b.scene,
    );
    signal.position.set(x + 1.45, 1.5, 78);
    signal.material = b.palette('#50575c');
    signal.metadata = { collision: { collision: 'none' } };
    b.sectors.add(sector, signal);
  }
  return { restSpots };
}
