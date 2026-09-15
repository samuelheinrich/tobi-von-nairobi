import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Parts } from './geometry.js';
import type { Appearance } from './presets.js';

/** One coloured mesh for actors outside crowds; the dense crowds use thin-instance batches. */
export function buildDistant(scene: Scene, parent: TransformNode, a: Appearance, seated: boolean) {
  const root = new TransformNode('character-distant', scene);
  root.parent = parent;
  const p = new Parts(scene),
    b = a.body,
    hip = seated ? 0.5 : b.leg;
  p.profile(
    'body',
    [
      [hip - 0.1, b.hips, b.depth],
      [hip + 0.2, b.waist, b.depth * 0.85],
      [hip + 0.57, b.shoulders, b.depth],
      [hip + 0.67, 0.15, 0.15],
    ],
    a.topColor,
  );
  p.oval('head', [0.36, 0.43, 0.32], [0, hip + 0.92, 0], a.skin);
  p.oval(
    'hair',
    [0.38, 0.14, 0.33],
    [0, hip + 1.08, -0.015],
    a.hair === 'bald' ? a.skin : a.hairColor,
  );
  for (const side of [-1, 1]) {
    p.oval('arm', [b.arm, 0.6, b.arm], [side * b.shoulders * 0.58, hip + 0.26, 0], a.topColor);
    p.oval(
      'leg',
      [b.hips * 0.4, seated ? 0.38 : b.leg, b.depth * 0.6],
      [side * b.hips * 0.25, seated ? hip - 0.13 : hip * 0.5, seated ? 0.24 : 0],
      a.bottomColor,
    );
    p.oval(
      'shoe',
      [0.16, 0.12, 0.28],
      [side * b.hips * 0.25, 0.055, seated ? 0.35 : 0.08],
      '#303440',
    );
  }
  p.bake('character-lod2', root);
  root.setEnabled(false);
  return root;
}
