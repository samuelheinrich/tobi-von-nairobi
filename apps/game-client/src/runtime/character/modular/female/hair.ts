import type { Scene } from '@babylonjs/core/scene.js';
import type { Appearance } from '../presets.js';
import type { Parts } from '../geometry.js';
import { ribbon } from '../face-mesh.js';

export function femaleHair(
  scene: Scene,
  hair: Parts,
  details: Parts,
  a: Appearance,
  width: number,
) {
  const waves = ['wavy', 'beach_waves'].includes(a.hair);
  if (waves || a.hair === 'side_swept') {
    hair.oval('long-hair-back', [width + 0.02, 0.55, 0.17], [0, -0.14, -0.16], a.hairColor);
    for (const side of [-1, 1]) {
      const asym = a.hair === 'side_swept' ? (side > 0 ? 0.8 : 0.35) : 0.62;
      ribbon(
        scene,
        hair,
        'flowing-hair',
        (t) => [
          side * (width * 0.45 + Math.sin(t * 7) * 0.015),
          0.17 - t * asym,
          -0.02 + Math.sin(t * 6) * 0.028,
        ],
        () => 0.046,
        0.055,
        a.hairColor,
        'cloth',
        16,
      );
      for (let j = 0; j < 3; j++)
        ribbon(
          scene,
          details,
          'hair-strand',
          (t) => [
            side * (width * 0.46 + Math.sin(t * 7) * 0.014) + j * 0.009,
            0.15 - t * asym,
            0.035 + Math.sin(t * 6) * 0.028,
          ],
          () => 0.003,
          0.002,
          a.hairColor,
          'cloth',
          12,
        );
    }
  }
  if (a.hair === 'high_ponytail') {
    hair.oval('ponytail-tie', [0.105, 0.085, 0.09], [0, 0.24, -0.18], '#ba876c', 'satin');
    ribbon(
      scene,
      hair,
      'high-ponytail',
      (t) => [Math.sin(t * 3) * 0.03, 0.25 - t * 0.58, -0.18 - Math.sin(t * Math.PI) * 0.13],
      (t) => 0.045 * (1 - t * 0.65),
      0.05,
      a.hairColor,
      'cloth',
      18,
    );
  }
  if (a.accessory === 'earrings' || a.accessory === 'choker' || a.accessory === 'necklace')
    for (const side of [-1, 1])
      ribbon(
        scene,
        details,
        'hoop-earring',
        (t) => {
          const angle = t * Math.PI * 2;
          return [
            side * (width * 0.54) + Math.sin(angle) * 0.023,
            -0.108 + Math.cos(angle) * 0.035,
            0.02,
          ];
        },
        () => 0.003,
        0.003,
        '#dfbb75',
        'metal',
        14,
      );
}
