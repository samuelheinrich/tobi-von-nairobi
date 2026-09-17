import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { box, material } from '../levels/materials.js';

/** Lightweight ground reference for flight and approach; no building owns an individual update. */
export function createFlightLandscape(scene: Scene) {
  const root = new TransformNode('flight-landscape', scene);
  const grass = material(scene, 'flight-land-grass', '#587747');
  const field = material(scene, 'flight-land-field', '#879d58');
  const road = material(scene, 'flight-land-road', '#40464b');
  const runway = material(scene, 'flight-runway', '#252a2e');
  const wall = material(scene, 'flight-houses', '#d8c7a5');
  const roof = material(scene, 'flight-roofs', '#9a4f3b');
  for (const [name, size, position, surface] of [
    ['flight-ground', [1400, 1, 5000], [0, -0.6, 1450], grass],
    ['flight-field-west', [380, 0.08, 2200], [-430, -0.05, 1000], field],
    ['flight-field-east', [300, 0.08, 1900], [470, -0.04, 1550], field],
    ['flight-runway', [78, 0.12, 1900], [0, 0.02, 1450], runway],
    ['flight-road-west', [18, 0.1, 3500], [-190, 0, 1400], road],
    ['flight-road-east', [14, 0.1, 3000], [245, 0, 1550], road],
  ] as const) {
    const mesh = box(scene, name, [...size], [...position], surface);
    mesh.parent = root;
    mesh.isPickable = false;
  }
  for (let marker = 620; marker < 2320; marker += 80) {
    const line = box(scene, 'runway-centreline', [2.5, 0.04, 36], [0, 0.1, marker], wall);
    line.parent = root;
  }
  const houseBody = box(scene, 'flight-house-template', [8, 6, 10], [0, 0, 0], wall);
  houseBody.setEnabled(false);
  const houseRoof = box(scene, 'flight-roof-template', [9, 1.2, 11], [0, 0, 0], roof);
  houseRoof.setEnabled(false);
  for (let index = 0; index < 88; index++) {
    const side = index % 2 ? 1 : -1;
    const x = side * (115 + ((index * 47) % 430));
    const z = 180 + ((index * 137) % 2850);
    const height = 0.75 + (index % 4) * 0.12;
    const body = houseBody.createInstance(`flight-house-${index}`);
    body.parent = root;
    body.position.set(x, 3 * height, z);
    body.scaling.set(0.8 + (index % 3) * 0.18, height, 0.8 + (index % 5) * 0.08);
    const cap = houseRoof.createInstance(`flight-roof-${index}`);
    cap.parent = root;
    cap.position.set(x, 6.1 * height, z);
    cap.scaling.copyFrom(body.scaling);
  }
  root.setEnabled(false);
  return root;
}
