import type { WorldBuilder } from '../../world/scene-builder.js';
import { placeFlag } from '../../world/flags.js';
export function wgGarden(b: WorldBuilder) {
  const sector = 'garden';
  b.prop(sector, 'garden-path', [6, 0.035, 58], [-26, 0.025, 5], '#cfc1a0');
  b.prop(sector, 'garden-patio', [20, 0.04, 13], [-38, 0.02, -13], '#b7aa88');
  for (const z of [3, 11, 19]) {
    b.prop(sector, 'raised-vegetable-bed', [5, 0.6, 3], [-45, 0.3, z], '#876647', true);
    b.prop(sector, 'vegetable-soil', [4.6, 0.06, 2.6], [-45, 0.64, z], '#66523a');
    for (let n = 0; n < 8; n++)
      b.prop(
        sector,
        'vegetable',
        [0.55, 0.5, 0.55],
        [-46.5 + (n % 4), 0.86, z - 0.65 + Math.floor(n / 4) * 1.2],
        '#73934d',
        false,
        'sphere',
      );
  }
  b.prop(sector, 'garden-table', [5, 0.18, 2], [-43, 1, -13], '#a78051', true);
  for (const x of [-45, -41])
    b.prop(sector, 'table-leg', [0.24, 1, 0.5], [x, 0.5, -13], '#705335', true);
  for (const z of [-15, -11])
    b.prop(sector, 'garden-bench', [5, 0.48, 0.7], [-43, 0.24, z], '#99754c', true);
  b.prop(sector, 'barbecue', [1.7, 1.1, 1.3], [-49, 0.55, -18], '#514f47', true);
  b.prop(sector, 'compost', [3, 1.3, 2.5], [-51, 0.65, 25], '#685e43', true);
  b.sign(sector, 'BIO. DYNAMISCH. ABWASCH STATISCH.', -38, 2.8, -24, 12);
  placeFlag(b, sector, 'peace', -31, -17, 5);
  // Greenhouse frame and open door; glass is decorative, robust frames carry collision.
  for (const x of [-58, -52])
    for (const z of [4, 14])
      b.prop(sector, 'greenhouse-post', [0.2, 3, 0.2], [x, 1.5, z], '#bac9b1', true);
  b.prop(sector, 'greenhouse-roof', [6.2, 0.2, 10.2], [-55, 3, 9], '#bdd3b4', true);
  b.prop(sector, 'seed-table', [4, 0.8, 1], [-55, 0.4, 12], '#927d55', true);
  // A visual clothing line, intentionally not a solid obstacle.
  for (const x of [-22, -12])
    b.prop(sector, 'washing-post', [0.14, 3, 0.14], [x, 1.5, 38], '#716d5c', true);
  b.prop(sector, 'washing-line', [10, 0.025, 0.025], [-17, 2.8, 38], '#c9c5b5');
  for (let i = 0; i < 6; i++)
    b.prop(
      sector,
      'laundry',
      [1, 1.4, 0.04],
      [-21 + i * 1.5, 2.1, 38],
      ['#cd9d9b', '#d8d4ae', '#a2b9a1'][i % 3]!,
    );
  return [
    {
      id: 'wg-garden-seat',
      kind: 'seat' as const,
      label: 'GARTENBANK',
      position: { x: -43, y: 0.9, z: -15 },
      exit: { x: -43, y: 1.1, z: -16.5 },
      yaw: 0,
      seatHeight: 0.48,
    },
  ];
}
