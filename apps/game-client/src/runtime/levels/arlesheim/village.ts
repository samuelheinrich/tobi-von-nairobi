import type { WorldBuilder } from '../../world/scene-builder.js';
import { placeFlag } from '../../world/flags.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
export function villageLandmarks(b: WorldBuilder) {
  for (const [x, z, type] of [
    [5, -21, 'swiss'],
    [77, 36, 'swiss'],
    [80, 36, 'baselstab'],
    [-21, -68, 'baselstab'],
  ] as const)
    placeFlag(b, 'village', type, x, z);
  // Fountain basin leaves the square passable on all four sides.
  b.prop('village', 'brunnen-plinth', [5, 0.35, 5], [70, 0.175, 23], '#a6a28f', true);
  for (const x of [67.7, 72.3])
    b.prop('village', 'brunnen-wall', [0.4, 0.9, 5], [x, 0.65, 23], '#bdb7a3', true);
  for (const z of [20.7, 25.3])
    b.prop('village', 'brunnen-wall', [5, 0.9, 0.4], [70, 0.65, z], '#bdb7a3', true);
  b.prop('village', 'brunnen-water', [4.2, 0.05, 4.2], [70, 0.65, 23], '#6fa5a0');
  b.prop('village', 'brunnen-column', [0.6, 3, 0.6], [70, 1.7, 23], '#b2ac95', true);
  b.prop('village', 'brunnen-spout', [1.4, 0.13, 0.15], [70, 1.8, 23], '#777d66');
  // Recognisable two-tower baroque silhouette, deliberately simplified and fictionalised.
  b.prop('village', 'dom-nave', [23, 10, 25], [66, 5, 62], '#e7dec3', true);
  for (const x of [55, 77]) {
    b.prop('village', 'dom-tower', [5.5, 18, 6], [x, 9, 50], '#d9c9a5', true);
    b.prop('village', 'tower-dome', [6.1, 5, 6.1], [x, 20, 50], '#65786c', false, 'sphere');
    b.prop('village', 'spire', [0.5, 5, 0.5], [x, 23, 50], '#7d775f');
    b.prop('village', 'cross', [2, 0.18, 0.2], [x, 24.5, 50], '#b9a776');
    b.prop('village', 'tower-window', [1.5, 3, 0.15], [x, 13, 46.9], '#536661');
  }
  for (const x of [59, 66, 73])
    b.prop('village', 'dom-window', [2.2, 4, 0.15], [x, 6, 49.4], '#75848c');
  b.prop('village', 'dom-door', [3, 4, 0.18], [66, 2, 49.35], '#705844');
  b.prop('village', 'dom-roof', [24, 1, 26], [66, 10.5, 62], '#a67252', true);
  b.sign('village', 'DOM ARLESHEIM', 66, 3.5, 47.7, 9);
  // A neighbourhood map also makes the enlarged route legible without a minimap.
  const texture = new DynamicTexture('arlesheim-map', { width: 512, height: 512 }, b.scene, false),
    c = texture.getContext();
  c.fillStyle = '#ede4c9';
  c.fillRect(0, 0, 512, 512);
  c.fillStyle = '#334c49';
  c.font = 'bold 28px sans-serif';
  c.fillText('ARLESHEIM · QUARTIERPLAN', 24, 42);
  c.strokeStyle = '#9d9c8c';
  c.lineWidth = 18;
  c.beginPath();
  c.moveTo(45, 370);
  c.lineTo(450, 370);
  c.lineTo(450, 145);
  c.lineTo(325, 145);
  c.stroke();
  for (const [label, x, y] of [
    ['WG', 180, 240],
    ['GARTEN', 40, 230],
    ['LADELI', 100, 435],
    ['DORFPLATZ', 300, 220],
    ['DOM', 360, 110],
    ['WALDWEG', 90, 105],
  ] as const) {
    c.fillStyle = '#af6850';
    c.fillRect(x, y, 42, 30);
    c.fillStyle = '#334c49';
    c.font = '18px sans-serif';
    c.fillText(label, x - 8, y - 12);
  }
  c.fillStyle = '#c93c3e';
  c.beginPath();
  c.arc(198, 323, 9, 0, Math.PI * 2);
  c.fill();
  c.font = '16px sans-serif';
  c.fillText('DU BIST HIER', 220, 330);
  texture.update();
  const m = new StandardMaterial('quartierplan', b.scene);
  m.diffuseTexture = texture;
  m.backFaceCulling = false;
  const map = MeshBuilder.CreatePlane('quartierplan', { size: 3.5 }, b.scene);
  map.position.set(-5, 2.4, -23);
  map.material = m;
  map.metadata = { collision: { collision: 'none' } };
  b.prop('wg', 'map-post', [0.2, 2, 0.2], [-5, 1, -23], '#685e4a', true);
}
