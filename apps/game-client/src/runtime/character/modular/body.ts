import { buildFemaleBody } from './female/body.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Appearance } from './presets.js';
import { Parts } from './geometry.js';

export function buildBody(scene: Scene, root: TransformNode, a: Appearance) {
  if (a.femaleStyle) return buildFemaleBody(scene, root, a);
  const b = a.body,
    hip = b.leg,
    chest = hip + 0.5;
  const body = new Parts(scene),
    extras = new Parts(scene);
  const skimpy = a.top === 'bikini' || a.top === 'crop';
  const fabric = ['dancer', 'cabaret'].includes(a.category)
    ? ('satin' as const)
    : ('cloth' as const);
  body.profile(
    'torso',
    [
      [hip - 0.1, 0.05, 0.05],
      [hip, b.hips, b.depth],
      [hip + 0.17, b.waist, b.depth * 0.83],
      [chest - 0.08, b.chest, b.depth],
      [chest + 0.13, b.shoulders * 0.84, b.depth * 0.86],
      [chest + 0.2, 0.15, 0.16],
    ],
    skimpy || a.top === 'swimsuit' ? a.skin : a.topColor,
    skimpy ? 'skin' : fabric,
  );
  body.oval('neck', [0.15, 0.2, 0.16], [0, chest + 0.22, 0], a.skin, 'skin');
  if (a.feminine)
    for (const side of [-1, 1])
      body.oval(
        'torso-contour',
        [b.chest * 0.46, 0.19, b.depth * 0.37],
        [side * b.chest * 0.22, chest - 0.008, b.depth * 0.39],
        a.topColor,
        fabric,
      );
  if (skimpy) {
    if (a.top === 'crop')
      body.profile(
        'crop-band',
        [
          [chest - 0.2, b.waist * 1.13, b.depth * 0.96],
          [chest - 0.07, b.chest * 1.02, b.depth * 1.03],
          [chest + 0.1, b.shoulders * 0.86, b.depth * 0.94],
        ],
        a.topColor,
        fabric,
      );
    for (const side of [-1, 1])
      body.oval(
        'top-strap',
        [0.045, 0.2, 0.04],
        [side * b.chest * 0.32, chest + 0.1, b.depth * 0.33],
        a.topColor,
        fabric,
      );
  }
  if (a.top === 'swimsuit')
    body.profile(
      'swimsuit',
      [
        [hip - 0.08, b.hips * 0.62, b.depth * 0.7],
        [hip + 0.02, b.hips * 1.01, b.depth * 1.015],
        [hip + 0.18, b.waist * 1.02, b.depth * 0.86],
        [chest, b.chest * 0.85, b.depth],
      ],
      a.topColor,
      fabric,
    );
  const skirt = ['skirt', 'sarong'].includes(a.bottom) || a.top === 'dress';
  const skirts = [];
  if (skirt) {
    const cloth = new Parts(scene);
    cloth.profile(
      'skirt',
      [
        [-0.36, b.hips * 1.25, b.depth * 1.22],
        [-0.05, b.hips * 1.13, b.depth * 1.12],
        [0.13, b.waist * 1.08, b.depth * 0.95],
      ],
      a.top === 'dress' ? a.topColor : a.bottomColor,
      fabric,
    );
    skirts.push(...cloth.bake('skirt', root));
    for (const mesh of skirts) mesh.position.y = hip;
  } else body.oval('hips', [b.hips, 0.25, b.depth], [0, hip - 0.06, -0.015], a.bottomColor);
  if (a.top === 'tank' || a.top === 'dress')
    for (const side of [-1, 1])
      body.oval(
        'shoulder-strap',
        [0.085, 0.14, 0.13],
        [side * b.shoulders * 0.32, chest + 0.12, 0.04],
        a.topColor,
        fabric,
      );
  if (['shirt', 'polo', 'blouse', 'uniform'].includes(a.top)) {
    for (const side of [-1, 1])
      body.oval(
        'collar',
        [0.12, 0.13, 0.045],
        [side * 0.074, chest + 0.1, b.depth * 0.43],
        a.topColor,
        'cloth',
        [0, 0, side * 0.38],
      );
    for (let i = 0; i < 4; i++)
      extras.oval(
        'button',
        [0.018, 0.018, 0.013],
        [0, chest - i * 0.105, b.depth * 0.5 + 0.012],
        '#dbcfb7',
        'metal',
      );
  }
  if (a.pattern && !['bikini', 'crop', 'swimsuit', 'uniform'].includes(a.top)) {
    for (let i = 0; i < 3; i++) {
      const y = chest - 0.12 - i * 0.055;
      const t = (y - hip - 0.17) / 0.25;
      const width = b.waist + (b.chest - b.waist) * t;
      const depth = b.depth * (0.83 + 0.17 * t);
      if (a.pattern === 1)
        extras.profile(
          'woven-stripe',
          [
            [y, width * 1.02, depth * 1.02],
            [
              y + 0.015,
              (width + (b.chest - b.waist) * 0.06) * 1.02,
              (depth + b.depth * 0.01) * 1.02,
            ],
          ],
          '#d9c7b4',
        );
      else
        extras.oval(
          'embroidered-dot',
          [0.023, 0.023, 0.013],
          [(i - 1) * 0.07, chest - 0.06, b.depth * 0.51],
          '#d9c7b4',
        );
    }
  }
  if (['police', 'security', 'hotel'].includes(a.category)) {
    body.profile(
      'utility-belt',
      [
        [hip + 0.055, b.hips * 1.05, b.depth * 1.05],
        [hip + 0.105, b.hips * 1.05, b.depth * 1.05],
      ],
      '#202629',
      'leather',
    );
    extras.oval(
      'belt-buckle',
      [0.08, 0.047, 0.025],
      [0, hip + 0.08, b.depth * 0.55],
      '#c1bf9f',
      'metal',
    );
    for (const side of [-1, 1]) {
      extras.oval(
        'shoulder-tab',
        [0.14, 0.028, 0.12],
        [side * b.shoulders * 0.42, chest + 0.13, 0],
        '#bea45a',
        'metal',
      );
      extras.oval(
        'utility-pouch',
        [0.11, 0.17, 0.11],
        [side * b.hips * 0.46, hip + 0.06, 0.045],
        '#1c252c',
        'leather',
      );
    }
    extras.oval(
      'chest-badge',
      [0.068, 0.09, 0.025],
      [-b.chest * 0.23, chest + 0.015, b.depth * 0.52],
      '#e1c471',
      'metal',
    );
    extras.oval(
      'radio',
      [0.075, 0.12, 0.05],
      [b.chest * 0.22, chest, b.depth * 0.55],
      '#17252d',
      'leather',
    );
    extras.oval(
      'antenna',
      [0.012, 0.13, 0.015],
      [b.chest * 0.22, chest + 0.11, b.depth * 0.55],
      '#17252d',
      'leather',
    );
    if (a.category === 'security')
      extras.oval('earpiece', [0.035, 0.063, 0.035], [0.21, chest + 0.51, 0], '#1a2228', 'leather');
  }
  if (a.category === 'vendor' || a.category === 'bartender')
    body.profile(
      'apron',
      [
        [hip - 0.3, b.hips * 0.95, b.depth * 1.13],
        [hip + 0.02, b.hips * 1.06, b.depth * 1.1],
        [chest - 0.05, b.chest * 0.6, b.depth * 1.05],
      ],
      a.category === 'vendor' ? '#bba677' : '#283b42',
    );
  if (a.category === 'crew')
    extras.oval('scarf', [0.25, 0.075, 0.22], [0, chest + 0.2, 0.015], '#d999b6', 'satin');
  if (a.accessory === 'necklace')
    for (let i = 0; i < 7; i++)
      extras.oval(
        'necklace-bead',
        [0.025, 0.025, 0.025],
        [(i - 3) * 0.035, chest + 0.12 - Math.sin((i / 6) * Math.PI) * 0.09, b.depth * 0.47],
        '#e8c66e',
        'metal',
      );
  if (a.accessory === 'backpack') {
    extras.oval('backpack', [0.38, 0.47, 0.22], [0, chest - 0.17, -b.depth * 0.7], '#af7952');
    for (const side of [-1, 1])
      extras.oval(
        'backpack-strap',
        [0.055, 0.43, 0.045],
        [side * b.chest * 0.34, chest - 0.06, b.depth * 0.4],
        '#655341',
      );
  }
  if (a.accessory === 'bag')
    extras.oval('handbag', [0.24, 0.27, 0.15], [b.hips * 0.7, hip - 0.02, 0], '#946a73', 'leather');
  return {
    skirts,
    meshes: body.bake('body', root),
    details: extras.bake('outfit-details', root),
    hip,
    shoulderY: chest + 0.09,
    headY: chest + 0.49,
  };
}
