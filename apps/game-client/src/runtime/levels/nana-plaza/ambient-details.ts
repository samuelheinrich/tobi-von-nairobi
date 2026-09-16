import type { NanaBuilder } from './builder.js';
import { nanaVenues } from '@tobi/game-data';

/** Shared pieces dress the silhouette and sightlines; no new lights or physics per ornament. */
export function buildAmbientDetails(b: NanaBuilder): void {
  for (const v of nanaVenues) {
    const y = v.floor * 4.8;
    // Gallery fascia visible from the opposite wing, even when interior detail is culled.
    b.sign(
      v.name,
      [v.side * 15.85, y + 3.35, v.z],
      v.floor ? 11 : 8,
      v.color,
      (v.side * Math.PI) / 2,
    );
    b.massive(
      'bar-fascia-panel',
      [0.13, 1.45, v.floor ? 12 : 8],
      [v.side * 16.08, y + 3.35, v.z],
      '#4c2f55',
    );
    b.prop(
      'bar-fascia-glow',
      [0.14, 0.12, v.floor ? 12 : 8],
      [v.side * 15.78, y + 2.55, v.z],
      v.color,
      true,
    );
    for (const z of [v.z - 3, v.z + 3]) {
      b.massive('frontage-post', [0.15, 4.5, 0.15], [v.side * 16.2, y + 2.25, z], '#ae705b');
      b.massive('gallery-planter', [0.8, 0.6, 0.8], [v.side * 17, y + 0.3, z], '#766654');
      b.prop('planter-leaves', [1, 1.1, 1], [v.side * 17, y + 1, z], '#497f69');
    }
  }
  for (let floor = 1; floor <= 2; floor++)
    for (const side of [-1, 1]) {
      b.massive(
        'gallery-handrail',
        [0.18, 0.12, 49],
        [side * 15.9, floor * 4.8 + 1.23, 28],
        '#edb66e',
      );
      b.prop(
        'gallery-lower-rail',
        [0.12, 0.08, 49],
        [side * 15.9, floor * 4.8 + 0.3, 28],
        '#bf8b5d',
      );
    }
  for (const mesh of b.colliders.filter((m) => m.name.includes('gallery-railing'))) {
    const glass = b.palette('#6b8799');
    glass.alpha = 0.24;
    mesh.material = glass;
  }
  // Long central beer garden, alternating tables leave a generous through-route on x=0.
  for (let i = 0; i < 7; i++) {
    const x = i % 2 ? 4 : -4,
      z = 14 + i * 5;
    b.massive('beer-garden-table', [2.2, 0.1, 1.2], [x, 0.95, z], '#996e51');
    b.massive('table-leg', [0.18, 0.9, 0.18], [x, 0.45, z], '#4d3f42');
    for (const dx of [-1.7, 1.7])
      b.massive(
        'plastic-chair',
        [0.65, 0.6, 0.65],
        [x + dx, 0.3, z],
        i % 2 ? '#895778' : '#558989',
      );
    b.prop('table-beer', [0.15, 0.45, 0.15], [x + 0.4, 1.2, z], '#5b9c71');
    b.prop('table-menu', [0.4, 0.4, 0.08], [x - 0.4, 1.2, z], '#e9b866');
    for (let bulb = 0; bulb < 13; bulb++)
      b.prop(
        'festoon-bulb',
        [0.14, 0.22, 0.14],
        [-13 + bulb * 2.2, 3.5 + Math.abs(bulb - 6) * 0.045, z + 1.8],
        ['#edce58', '#50dfc6', '#e667b5'][bulb % 3]!,
        true,
      );
    b.prop('festoon-wire', [29, 0.025, 0.025], [0, 3.55, z + 1.8], '#313747');
  }
  // Real canopy shape: two high pitched wings, open below with visible structure.
  for (const side of [-1, 1]) {
    const roof = b.prop('canopy-roof-wing', [16.8, 0.12, 47], [side * 8, 17.5, 28], '#50546d');
    roof.rotation.z = -side * 0.1;
    const collision = b.world.addCollider(roof, { collision: 'box' })!;
    collision.mesh.metadata.navigationObstacle = false;
    b.colliders.push(collision.mesh);
    b.solid('adjacent-city-block', [40, 22, 99], [side * 53, 11, 24], '#454353');
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 7; col++)
        b.prop(
          'hotel-window',
          [0.08, 1.4, 2],
          [side * 32.95, 5 + row * 4, -16 + col * 13],
          '#ab9169',
          true,
        );
  }
  b.sign('TOILETS / WC', [0, 3, 65.7], 6, '#7adee0');
  b.massive('lift-shaft', [2, 13, 2], [11, 6.5, 64], '#55586c');
  b.sign('LIFT / SERVICE ONLY', [11, 2.5, 62.9], 5, '#dfb55e');
  for (const x of [-7, 7]) {
    b.massive('traffic-signal', [0.4, 2.8, 0.4], [x, 1.4, -45], '#444958');
    b.prop('signal-light', [0.16, 0.2, 0.06], [x, 2.6, -45.25], '#ee504c', true);
  }
}
