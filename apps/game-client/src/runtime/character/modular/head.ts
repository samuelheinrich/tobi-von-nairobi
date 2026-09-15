import { femaleHair } from './female/hair.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Appearance } from './presets.js';
import { Parts } from './geometry.js';
import { faceProfile, sectionAt, faceSurface } from './face-profile.js';
import { sculptHead, patch } from './face-mesh.js';
import { facialFeatures } from './face-features.js';

export function buildHead(scene: Scene, parent: TransformNode, a: Appearance) {
  const base = new Parts(scene),
    core = new Parts(scene),
    micro = new Parts(scene),
    hair = new Parts(scene);
  const p = faceProfile(a),
    width = p.temple * 2;
  sculptHead(scene, base, a, p);
  const blinkParts = a.femaleStyle ? new Parts(scene) : undefined;
  facialFeatures(scene, core, micro, a, p, blinkParts);
  if (a.beard === 'beard') {
    hair.oval('chin-beard', [p.jaw * 1.45, 0.1, 0.1], [0, -0.177, 0.128], a.hairColor);
    for (const side of [-1, 1])
      hair.oval(
        'sideburn',
        [0.04, 0.19, 0.055],
        [side * (p.jaw * 0.91), -0.07, 0.075],
        a.hairColor,
      );
  }
  if (a.beard === 'moustache' || a.beard === 'beard')
    for (const side of [-1, 1])
      hair.oval(
        'moustache',
        [0.085, 0.025, 0.035],
        [side * 0.038, -0.092, 0.184],
        a.hairColor,
        'cloth',
        [0, 0, side * -0.16],
      );
  if (a.hair !== 'bald') {
    // Fitted scalp follows the sculpted cranium, with a seeded/receding hairline.
    patch(
      scene,
      hair,
      'scalp',
      16,
      40,
      (u, v) => {
        const angle = u * Math.PI * 2,
          front = Math.max(0, Math.cos(angle));
        const edge =
          0.015 + front * (0.13 + p.hairline) + Math.sin(angle * 3 + a.seed) * 0.005 * front;
        const y = edge + v * (p.crown + 0.012 - edge);
        const [radius, , back] = sectionAt(y, p) as [number, number, number];
        const x = Math.sin(angle) * (radius + 0.007),
          z =
            Math.cos(angle) >= 0
              ? faceSurface(Math.sin(angle) * radius, y, p) + 0.007
              : (back + 0.007) * Math.cos(angle);
        return [x, y + 0.004, z];
      },
      a.hairColor,
      'cloth',
    );
    if (['bob', 'long', 'ponytail', 'bun'].includes(a.hair)) {
      const length = a.hair === 'long' ? 0.57 : 0.31;
      hair.oval(
        'hair-back',
        [width + 0.025, length, 0.19],
        [0, 0.1 - length / 2, -0.16],
        a.hairColor,
      );
      if (a.hair === 'bob' || a.hair === 'long')
        for (const side of [-1, 1])
          hair.oval(
            'hair-side',
            [0.1, length, 0.2],
            [side * (width * 0.47), 0.08 - length / 2, -0.03],
            a.hairColor,
          );
    }
    if (a.hair === 'ponytail')
      hair.oval(
        'ponytail',
        [0.13, 0.39, 0.13],
        [0, -0.02, -0.31],
        a.hairColor,
        'cloth',
        [-0.4, 0, 0],
      );
    if (a.hair === 'bun') hair.oval('bun', [0.19, 0.19, 0.19], [0, 0.27, -0.19], a.hairColor);
    if (a.hair === 'undercut')
      hair.oval(
        'quiff',
        [0.26, 0.17, 0.29],
        [0.025, 0.24, -0.01],
        a.hairColor,
        'cloth',
        [0, 0, -0.15],
      );
    if (a.hair === 'curly')
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        hair.oval(
          'curl',
          [0.13, 0.13, 0.13],
          [Math.sin(angle) * 0.18, p.crown - 0.06 + (i % 3) * 0.035, Math.cos(angle) * 0.15],
          a.hairColor,
        );
      }
  }
  if (a.femaleStyle) femaleHair(scene, hair, micro, a, width);
  if (a.accessory === 'glasses' || a.accessory === 'sunglasses')
    for (const side of [-1, 1]) {
      micro.oval(
        'glasses-frame',
        [0.142, 0.085, 0.025],
        [side * 0.089, 0.04, 0.201],
        '#252d34',
        'leather',
      );
      micro.oval(
        'lens',
        [0.112, 0.06, 0.016],
        [side * 0.089, 0.04, 0.216],
        a.accessory === 'sunglasses' ? '#365561' : '#b7d5d6',
        'satin',
      );
      micro.oval('bridge', [0.05, 0.016, 0.023], [0, 0.045, 0.209], '#383738', 'metal');
    }
  if (['police', 'hotel', 'crew'].includes(a.category) || a.accessory === 'hat') {
    const color =
      a.category === 'police' ? a.topColor : a.category === 'crew' ? '#782953' : '#c0a478';
    hair.oval('cap-crown', [0.43, 0.15, 0.41], [0, 0.24, 0], color);
    hair.oval(
      'cap-brim',
      a.femaleStyle && a.accessory === 'hat' ? [0.64, 0.035, 0.53] : [0.4, 0.035, 0.31],
      [0, 0.195, 0.15],
      color,
      'leather',
    );
    if (a.category === 'police')
      micro.oval('cap-badge', [0.057, 0.078, 0.02], [0, 0.245, 0.209], '#e3c56a', 'metal');
  }
  const head = base.bake('head', parent)[0]!;
  const blink = blinkParts?.bake('blink', head)[0] ?? null;
  if (blink) {
    blink.position.y = 0.038;
    blink.setEnabled(false);
  }
  core.bake('face', head); // Eyes, lips, brows and ears survive LOD1.
  const details = micro.bake('face-micro', head);
  const hairMeshes = hair.bake('hair', head);
  return { head, details, hair: hairMeshes, blink };
}
