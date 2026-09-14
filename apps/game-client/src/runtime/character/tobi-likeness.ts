import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { box, cylinderBetween, material } from '../levels/materials.js';

/** Original geometry based on owner-supplied references; no photos or external brand textures.
 * Returns the lit cigarette tip so the visual layer can hang its smoke on a real world position. */
export function createTobiLikeness(scene: Scene, body: TransformNode, head: TransformNode): Mesh {
  const hair = material(scene, 'tobi-brown-curls', '#61402d');
  const beard = material(scene, 'tobi-short-beard', '#59463a');
  const skin = scene.getMaterialByName('tobi-skin') as StandardMaterial;
  const black = material(scene, 'tobi-frames', '#172026');
  const white = material(scene, 'tobi-white-trim', '#e9ece0');
  const gold = material(scene, 'tobi-gold', '#d6ac57');
  const sphere = (
    name: string,
    size: [number, number, number],
    p: [number, number, number],
    surface: StandardMaterial,
    parent = head,
  ) => {
    const mesh = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 8 }, scene);
    mesh.scaling.set(...size);
    mesh.position.set(...p);
    mesh.material = surface;
    mesh.parent = parent;
    return mesh;
  };
  // Broad cheeks, short beard, ears and a cheeky smile remain readable at gameplay scale.
  sphere('tobi-jaw', [0.66, 0.38, 0.55], [0, -0.16, 0], beard);
  sphere('tobi-mouth-area', [0.43, 0.18, 0.14], [0, -0.13, 0.26], skin);
  const smile = box(scene, 'tobi-smile', [0.24, 0.045, 0.04], [0, -0.15, 0.345], white);
  smile.parent = head;
  sphere('tobi-hair-base', [0.66, 0.25, 0.56], [0, 0.27, -0.045], hair);
  for (let i = 0; i < 12; i++) {
    const x = ((i % 4) - 1.5) * 0.14,
      z = Math.floor(i / 4) * 0.16 - 0.13;
    const curl = sphere(
      'tobi-curl',
      [0.19, 0.14 + (i % 3) * 0.02, 0.18],
      [x, 0.33 + Math.sin(i * 2) * 0.025, z],
      hair,
    );
    curl.rotation.z = (i % 2 ? -1 : 1) * 0.3;
  }
  for (const side of [-1, 1]) {
    sphere('tobi-ear', [0.13, 0.22, 0.14], [side * 0.34, -0.015, 0], skin);
    const lens = box(
      scene,
      'tobi-square-sunglasses',
      [0.31, 0.21, 0.08],
      [side * 0.175, 0.055, 0.3],
      black,
    );
    lens.parent = head;
    lens.rotation.z = side * 0.04;
    const temple = box(
      scene,
      'tobi-gold-temple',
      [0.035, 0.04, 0.28],
      [side * 0.33, 0.085, 0.14],
      gold,
    );
    temple.parent = head;
    // Skin shoulders and contrasting edges define a tank top rather than a sleeved T-shirt.
    sphere('tobi-shoulder-skin', [0.42, 0.4, 0.47], [side * 0.48, 1.38, 0], skin, body);
    sphere('tobi-tank-trim', [0.24, 0.3, 0.5], [side * 0.32, 1.48, 0], white, body);
    sphere('tobi-tank-strap', [0.19, 0.31, 0.52], [side * 0.3, 1.48, 0], black, body);
  }
  const bridge = box(scene, 'tobi-glasses-bridge', [0.08, 0.045, 0.05], [0, 0.08, 0.34], black);
  bridge.parent = head;
  sphere('tobi-open-neck', [0.33, 0.38, 0.32], [0, 1.63, 0], skin, body);
  // Small original bear motif, inspired by the references' playful shirts.
  sphere('tobi-bear-emblem', [0.31, 0.3, 0.06], [0, 1.13, 0.42], gold, body);
  for (const side of [-1, 1])
    sphere('tobi-bear-ear', [0.12, 0.12, 0.065], [side * 0.13, 1.27, 0.42], gold, body);
  const emblemGlasses = box(scene, 'tobi-bear-glasses', [0.26, 0.05, 0.02], [0, 1.17, 0.46], black);
  emblemGlasses.parent = body;
  const cigarette = cylinderBetween(
    scene,
    'tobi-cigarette',
    new Vector3(0.13, -0.17, 0.32),
    new Vector3(0.22, -0.24, 0.65),
    0.045,
    white,
  );
  cigarette.parent = head;
  const filter = cylinderBetween(
    scene,
    'tobi-cigarette-filter',
    new Vector3(0.13, -0.17, 0.32),
    new Vector3(0.15, -0.187, 0.405),
    0.047,
    gold,
  );
  filter.parent = head;
  const ember = material(scene, 'tobi-ember', '#ce7050');
  ember.emissiveColor = new Color3(0.4, 0.07, 0.01);
  return sphere('tobi-cigarette-tip', [0.05, 0.05, 0.05], [0.22, -0.24, 0.65], ember);
}
