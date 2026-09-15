import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { buildHead } from '../src/runtime/character/modular/head.js';
import { appearance } from '../src/runtime/character/modular/presets.js';
import type { FaceAge } from '../src/runtime/character/modular/face-profile.js';
const canvas = document.querySelector('canvas')!,
  engine = new Engine(canvas, true),
  scene = new Scene(engine);
scene.clearColor = new Color4(0.075, 0.095, 0.13, 1);
const camera = new ArcRotateCamera('faces', Math.PI / 2, Math.PI / 2, 6.5, Vector3.Zero(), scene);
camera.fov = 0.32;
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 0.6;
new HemisphericLight('fill', new Vector3(0, 1, 1), scene).intensity = 0.8;
new DirectionalLight('key', new Vector3(-0.4, -0.5, -1), scene).intensity = 0.65;
let roots: TransformNode[] = [],
  variation = 0;
const hair = document.querySelector<HTMLInputElement>('#hair')!,
  profile = document.querySelector<HTMLInputElement>('#profile')!,
  age = document.querySelector<HTMLSelectElement>('#age')!;
function draw() {
  for (const root of roots) root.dispose();
  roots = [];
  for (let i = 0; i < 7; i++) {
    const spec = appearance('local', variation * 7 + i, i % 2 === 1);
    spec.face = i;
    spec.accessory = 'none';
    spec.beard = 'none';
    if (!hair.checked) spec.hair = 'bald';
    if (age.value !== 'mixed') spec.faceAge = age.value as FaceAge;
    const root = new TransformNode(`portrait-${i}`, scene);
    root.position.x = (3 - i) * 0.61;
    root.rotation.y = profile.checked ? -0.85 : 0;
    buildHead(scene, root, spec);
    roots.push(root);
  }
}
document.querySelector('#variants')!.addEventListener('click', () => {
  variation++;
  draw();
});
for (const input of [hair, profile, age]) input.addEventListener('change', draw);
draw();
document.querySelector<HTMLSelectElement>('#focus')!.addEventListener('change', (event) => {
  const value = (event.target as HTMLSelectElement).value;
  camera.setTarget(value === 'all' ? Vector3.Zero() : roots[Number(value)]!.position.clone());
  camera.radius = value === 'all' ? 6.5 : 2.5;
});
engine.runRenderLoop(() => {
  scene.render();
  document.body.dataset.ready = 'true';
  document.querySelector('#stats')!.textContent =
    `${Math.round(scene.getActiveIndices() / 3).toLocaleString('de-CH')} Dreiecke · ${scene.getActiveMeshes().length} aktive Meshes`;
});
window.addEventListener('resize', () => engine.resize());
window.addEventListener(
  'pagehide',
  () => {
    scene.dispose();
    engine.dispose();
  },
  { once: true },
);
