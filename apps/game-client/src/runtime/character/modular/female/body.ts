import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Appearance } from '../presets.js';
import { Parts, type Finish, type V3 } from '../geometry.js';
import { patch, ribbon } from '../face-mesh.js';
import { gauss } from '../face-profile.js';

/** Continuous torso and fitted clothing share a surface: bust shape does not depend on sphere attachments. */
export function buildFemaleBody(scene: Scene, root: TransformNode, a: Appearance) {
  const b = a.body,
    style = a.femaleStyle!,
    m = style.morphs,
    hip = b.leg,
    outfit = style.outfit;
  const body = new Parts(scene),
    extras = new Parts(scene),
    cloth = new Parts(scene);
  const fabric: Finish =
    outfit === 'leather'
      ? 'leather'
      : ['sequin', 'neon', 'cabaret', 'mini_dress', 'corset'].includes(outfit)
        ? 'satin'
        : 'cloth';
  const rings = [
    [-0.12, 0.15, 0.19],
    [0, b.hips, b.depth],
    [0.18, b.waist, b.depth * (0.92 - m.bellyFlatness * 0.2)],
    [0.34, b.chest * 0.88, b.depth * 0.9],
    [0.49, b.chest, b.depth],
    [0.6, b.shoulders, b.depth * 0.85],
    [0.68, 0.15, 0.155],
  ];
  function dimensions(y: number) {
    let i = 0;
    while (i < rings.length - 2 && y > rings[i + 1]![0]!) i++;
    const l = rings[i]!,
      r = rings[i + 1]!,
      t = Math.max(0, Math.min(1, (y - l[0]!) / (r[0]! - l[0]!))),
      h = r[0]! - l[0]!,
      prev = rings[Math.max(0, i - 1)]!,
      next = rings[Math.min(rings.length - 1, i + 2)]!;
    return [1, 2].map((j) => {
      const m0 = (r[j]! - prev[j]!) / (r[0]! - prev[0]!),
        m1 = (next[j]! - l[j]!) / (next[0]! - l[0]!);
      return (
        (2 * t * t * t - 3 * t * t + 1) * l[j]! +
        (t * t * t - 2 * t * t + t) * h * m0 +
        (-2 * t * t * t + 3 * t * t) * r[j]! +
        (t * t * t - t * t) * h * m1
      );
    });
  }
  function surface(angle: number, y: number, offset = 0): V3 {
    const [w, d] = dimensions(y) as [number, number],
      x = Math.sin(angle) * (w / 2 + offset),
      front = Math.max(0, Math.cos(angle));
    const bust =
      0.064 *
      m.chestSize *
      gauss(Math.abs(x) - 0.106, y - 0.473, 0.112 * m.chestShape, 0.103) *
      front ** 2;
    const abs =
      style.bodyPreset === 'athletic_beach'
        ? 0.002 * Math.cos(x * 55) * gauss(x, y - 0.21, 0.09, 0.13)
        : 0;
    return [x, hip + y, Math.cos(angle) * (d / 2 + offset) + bust + abs * front];
  }
  const panel = (
    name: string,
    yMin: number,
    yMax: number,
    angleMin = -Math.PI,
    angleMax = Math.PI,
    color = a.topColor,
  ) =>
    patch(
      scene,
      cloth,
      name,
      16,
      32,
      (u, v) =>
        surface(
          angleMin + u * (angleMax - angleMin),
          yMin + v * (yMax - yMin),
          name === 'open-blouse' ? 0.014 : 0.004,
        ),
      color,
      fabric,
    );
  patch(
    scene,
    body,
    'female-torso',
    32,
    48,
    (u, v) => surface(u * Math.PI * 2, -0.12 + v * 0.8),
    a.skin,
    'skin',
  );
  body.oval('neck', [0.15, 0.2, 0.155], [0, hip + 0.72, 0], a.skin, 'skin');
  const full = [
    'mini_dress',
    'beach_dress',
    'one_piece',
    'sequin',
    'cabaret',
    'corset',
    'leather',
  ].includes(outfit);
  if (full) panel('fitted-bodice', outfit === 'corset' ? 0.09 : -0.06, 0.58);
  else if (['bandeau', 'sport_bikini', 'crop_shorts', 'neon'].includes(outfit))
    panel(
      'bandeau',
      outfit === 'crop_shorts' ? 0.25 : 0.38,
      outfit === 'sport_bikini' ? 0.61 : 0.56,
    );
  else {
    for (const side of [-1, 1])
      patch(
        scene,
        cloth,
        'triangle-cup',
        12,
        16,
        (u, v) => {
          const angle = side > 0 ? 0.035 + u * 1.27 : -1.305 + u * 1.27,
            top = 0.51 + Math.sin(u * Math.PI) * 0.12;
          return surface(angle, 0.36 + v * (top - 0.36), 0.004);
        },
        a.topColor,
        fabric,
      );
    panel('bikini-back-band', 0.395, 0.43, 0.95, Math.PI * 2 - 0.95);
  }
  if (!['bandeau', 'mini_dress'].includes(outfit))
    for (const side of [-1, 1]) {
      ribbon(
        scene,
        cloth,
        'shoulder-strap',
        (t) => surface(side * (0.58 + t * 0.3), 0.56 + t * 0.075, 0.008),
        () => (outfit === 'sport_bikini' ? 0.023 : 0.009),
        0.003,
        a.topColor,
        fabric,
      );
      ribbon(
        scene,
        cloth,
        'strap-back',
        (t) => surface(side * (0.88 + t * 1.75), 0.635 - t * 0.08, 0.008),
        () => 0.009,
        0.003,
        a.topColor,
        fabric,
      );
    }
  // All outfits retain opaque bottoms; distinct high-cut/shorts/skirt silhouettes.
  const highCut = outfit === 'high_cut';
  patch(
    scene,
    cloth,
    'swim-bottom',
    12,
    32,
    (u, v) => {
      const angle = u * Math.PI * 2,
        side = Math.abs(Math.sin(angle));
      const low = highCut ? -0.11 + side * 0.12 : -0.115 + side * 0.06;
      return surface(angle, low + v * (0.065 - low), 0.006);
    },
    a.bottomColor,
    fabric,
  );
  const skirts = [];
  if (a.bottom === 'skirt' || a.bottom === 'sarong') {
    const skirt = new Parts(scene),
      length = outfit === 'cabaret' ? 0.46 : outfit === 'beach_dress' ? 0.48 : 0.32;
    skirt.profile(
      'skirt',
      [
        [-length, b.hips * 1.2, b.depth * 1.16],
        [-0.07, b.hips * 1.14, b.depth * 1.19],
        [0.07, b.hips * 1.08, b.depth * 1.18],
      ],
      a.top === 'dress' ? a.topColor : a.bottomColor,
      fabric,
    );
    skirts.push(...skirt.bake('female-skirt', root));
    for (const mesh of skirts) mesh.position.y = hip;
    if (outfit === 'sarong')
      extras.oval(
        'sarong-knot',
        [0.1, 0.08, 0.07],
        [b.hips * 0.52, hip + 0.04, 0.04],
        a.bottomColor,
      );
  }
  if (outfit === 'open_blouse')
    for (const side of [-1, 1])
      panel(
        'open-blouse',
        0.03,
        0.62,
        side > 0 ? 0.78 : -Math.PI,
        side > 0 ? Math.PI : -0.78,
        '#f0e7d4',
      );
  if (outfit === 'corset')
    for (let i = 0; i < 5; i++)
      ribbon(
        scene,
        extras,
        'corset-lacing',
        (t) => surface((t - 0.5) * 0.3, 0.18 + i * 0.056 + t * 0.025, 0.009),
        () => 0.003,
        0.002,
        '#e5c19c',
        'cloth',
        6,
      );
  if (['sequin', 'cabaret', 'neon'].includes(outfit))
    for (let i = 0; i < 16; i++) {
      const at = surface(((i % 4) - 1.5) * 0.36, 0.16 + Math.floor(i / 4) * 0.1, 0.01);
      extras.oval('sequin', [0.018, 0.018, 0.012], at, i % 2 ? '#ead19a' : '#c3d2e2', 'metal');
    }
  if (a.accessory === 'choker')
    extras.profile(
      'choker',
      [
        [hip + 0.685, 0.158, 0.162],
        [hip + 0.715, 0.158, 0.162],
      ],
      '#28232d',
      'leather',
    );
  if (a.accessory === 'necklace')
    for (let i = 0; i < 9; i++)
      extras.oval(
        'necklace',
        [0.023, 0.023, 0.019],
        surface((i - 4) * 0.15, 0.62 - Math.sin((i / 8) * Math.PI) * 0.065, 0.013),
        '#dfba6e',
        'metal',
      );
  if (a.accessory === 'bag')
    extras.oval(
      'bag',
      [0.23, 0.27, 0.14],
      [b.hips * 0.71, hip, 0],
      style.role === 'beach_female' ? '#c4a573' : '#634358',
      'cloth',
    );
  return {
    skirts,
    meshes: [...body.bake('female-body', root), ...cloth.bake('female-clothing', root)],
    details: extras.bake('female-details', root),
    hip,
    shoulderY: hip + 0.59,
    headY: hip + 0.99,
  };
}
