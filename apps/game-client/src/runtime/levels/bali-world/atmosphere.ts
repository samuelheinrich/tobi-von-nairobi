import {
  baliRoads,
  baliBuildings,
  baliPickups,
  baliSectors,
  baliTerrainHeight as height,
} from '@tobi/game-data';
import type { BaliBuilder } from './builder.js';
import type { AmbientZone } from '../../audio/spatial-ambience.js';
/** Seeded repeated geometry; only trunks/rocks have collision, leafy decoration is lazy. */
export function buildAtmosphere(b: BaliBuilder) {
  for (const sector of baliSectors) {
    if (sector.id === 'island_2' || sector.id === 'island_3') continue;
    b.sectors.decorate(sector.id, () => {
      const count = sector.id === 'jungle' ? 90 : sector.id === 'beach' ? 26 : 18;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.39996,
          r = sector.radius * (0.45 + (i % 9) * 0.055),
          x = sector.x + Math.sin(angle) * r,
          z = sector.z + Math.cos(angle) * r,
          y = height(x, z);
        if (y < -0.05) continue;
        if (
          baliPickups.some((p) => Math.hypot(p.position.x - x, p.position.z - z) < 4) ||
          baliBuildings.some(
            (d) =>
              Math.abs(d.position.x - x) < d.width / 2 + 5 &&
              Math.abs(d.position.z - z) < d.depth / 2 + 5,
          )
        )
          continue;
        if (
          baliRoads.some((road) =>
            road.points.slice(1).some((end, index) => {
              const start = road.points[index]!,
                dx = end[0] - start[0],
                dz = end[1] - start[1];
              const t = Math.max(
                0,
                Math.min(1, ((x - start[0]) * dx + (z - start[1]) * dz) / (dx * dx + dz * dz)),
              );
              return Math.hypot(x - start[0] - t * dx, z - start[1] - t * dz) < road.width / 2 + 3;
            }),
          )
        )
          continue;

        // Keep road/landmark corridors open; tall background trees frame rather than seal them.
        if (
          (Math.abs(x - 80) < 9 && z > 130) ||
          (Math.abs(x - 50) < 8 && Math.abs(z - 115) < 12) ||
          sector.id === 'temple' ||
          sector.id === 'market' ||
          sector.id === 'town'
        )
          continue;
        const trunk = b.prop(
          sector.id,
          'palm-trunk',
          [0.5, 6, 0.5],
          [x, y + 3, z],
          '#8f7954',
          true,
        );
        trunk.metadata.navigationObstacle = false;
        for (let leaf = 0; leaf < 5; leaf++) {
          const crown = b.prop(sector.id, 'palm-crown', [5, 0.25, 1.1], [x, y + 6, z], '#457b50');
          crown.rotation.y = (leaf * Math.PI) / 2.5;
          crown.rotation.z = 0.22;
        }
        if (i % 5 === 0)
          b.prop(
            sector.id,
            'coastal-rock',
            [2.2, 1.2, 2.4],
            [x + 2, y + 0.5, z + 1],
            '#8b9383',
            true,
            'sphere',
          );
        if (sector.id === 'jungle')
          b.prop(
            sector.id,
            'tropical-understory',
            [3.6, 1.8, 3.6],
            [x, y + 0.9, z],
            '#628b4c',
            false,
            'sphere',
          );
      }
    });
  }
  for (let i = 0; i < 9; i++) {
    const x = -92 + i * 7,
      z = -67 + (i % 2) * 6,
      y = height(x, z);
    b.prop('beach', 'beach-lounger', [1, 0.4, 2.2], [x, y + 0.2, z], '#dbc59f', true);
    b.prop('beach', 'parasol-post', [0.12, 2.5, 0.12], [x + 1.6, y + 1.25, z], '#85664a', true);
    b.prop(
      'beach',
      'parasol-canopy',
      [3.3, 0.25, 3.3],
      [x + 1.6, y + 2.55, z],
      i % 2 ? '#d5927b' : '#d7d28c',
    );
  }
  for (const x of [-85, -71])
    b.prop('beach', 'volleyball-post', [0.15, 2.5, 0.15], [x, 1.25, -112], '#dfcfaa', true);
  for (let i = 0; i < 5; i++)
    b.prop('beach', 'volleyball-net', [14, 0.025, 0.025], [-78, 1.1 + i * 0.2, -112], '#f4eee0');
  b.prop('beach', 'volleyball', [0.35, 0.35, 0.35], [-78, 0.18, -116], '#fff0b7', false, 'sphere');
  for (let i = 0; i < 8; i++) {
    const [x, z] = (
      [
        [27, 53],
        [34, 53],
        [41, 53],
        [67, 57],
        [74, 57],
        [81, 57],
        [67, 79],
        [74, 79],
      ] as const
    )[i]!;
    b.prop('market', 'pasar-stall', [3, 1, 2], [x, 0.5, z], '#967351', true);
    b.prop(
      'market',
      'pasar-canopy',
      [3.8, 0.18, 3],
      [x, 2.7, z],
      i % 2 ? '#d89178' : '#859f67',
      true,
    );
    for (let j = 0; j < 3; j++)
      b.prop(
        'market',
        'fruit-basket',
        [0.7, 0.3, 0.7],
        [x - 0.9 + j * 0.8, 1.2, z],
        j % 2 ? '#e8c468' : '#9aba55',
      );
  }
  b.sign('market', 'PASAR MALAM / MARKET', 42, 4, 43, 14);
  const audioZones: AmbientZone[] = [
    {
      id: 'surf',
      x: -90,
      y: 0,
      z: -85,
      radius: 100,
      kind: 'surf',
      tempo: 3.2,
      note: 90,
      volume: 0.045,
    },
    {
      id: 'beach-music',
      x: -66,
      y: 1,
      z: -105,
      radius: 40,
      kind: 'music',
      tempo: 0.65,
      note: 164,
      volume: 0.04,
    },
    {
      id: 'market-voices',
      x: 40,
      y: 1,
      z: 60,
      radius: 60,
      kind: 'voices',
      tempo: 3.6,
      note: 180,
      volume: 0.018,
    },
    {
      id: 'jungle-birds',
      x: 95,
      y: 5,
      z: 162,
      radius: 85,
      kind: 'nature',
      tempo: 2.8,
      note: 920,
      volume: 0.025,
    },
    {
      id: 'temple-bells',
      x: 80,
      y: 11,
      z: 220,
      radius: 60,
      kind: 'nature',
      tempo: 5.4,
      note: 440,
      volume: 0.035,
    },
    {
      id: 'harbour-surf',
      x: -117,
      y: 0,
      z: 35,
      radius: 75,
      kind: 'surf',
      tempo: 3.6,
      note: 100,
      volume: 0.035,
    },
    {
      id: 'island-surf',
      x: -235,
      y: 0,
      z: 70,
      radius: 80,
      kind: 'surf',
      tempo: 3.3,
      note: 110,
      volume: 0.03,
    },
  ];
  return audioZones;
}
