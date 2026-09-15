import {
  animateCharacter,
  type CharacterAction,
} from '../src/runtime/character/modular/animation.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { createNpc, npcPalette } from '../src/runtime/levels/npc-kit.js';
import type { CharacterCategory } from '../src/runtime/character/modular/presets.js';
const canvas = document.querySelector('canvas')!;
const engine = new Engine(canvas, true),
  scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.075, 0.11, 1);
const camera = new ArcRotateCamera('studio', Math.PI / 2, 1.4, 8.4, new Vector3(0, 1.1, 0), scene);
camera.attachControl(canvas, true);
camera.fov = 0.55;
new HemisphericLight('fill', new Vector3(0, 1, 1), scene).intensity = 0.85;
new DirectionalLight('key', new Vector3(-0.4, -1, -0.6), scene).intensity = 1;
const samples: [CharacterCategory, number, boolean][] = [
  ['tourist', 2, false],
  ['club_guest', 5, true],
  ['dancer', 0, true],
  ['security', 0, false],
  ['police', 1, false],
];
const rigs = samples.map(([category, seed, female], i) => {
  const rig = createNpc(
    scene,
    category,
    npcPalette(scene, seed),
    null,
    false,
    category,
    female,
    true,
  );
  rig.root.position.x = (2 - i) * 1.5;
  return rig;
});
const actions = document.querySelector<HTMLSelectElement>('#action')!;
const categories: CharacterCategory[] = ['tourist', 'club_guest', 'dancer', 'security', 'police'];
let variant = 0;
document.querySelector('#variants')!.addEventListener('click', () => {
  variant++;
  rigs.forEach((r, i) =>
    r.dress(categories[i]!, variant * 5 + i, [false, true, true, false, false][i], true),
  );
});
document.querySelector('#cabaret')!.addEventListener('click', () => {
  rigs[2]!.dress('cabaret', ++variant, true);
});
let time = 0;
engine.runRenderLoop(() => {
  time += Math.min(0.05, engine.getDeltaTime() / 1000);
  for (const [i, r] of rigs.entries())
    animateCharacter(r, actions.value as CharacterAction, time, i);
  scene.render();
  document.body.dataset.ready = 'true';
  document.querySelector('#stats')!.textContent =
    `${scene.getActiveMeshes().length} aktive Meshes · ${Math.round(scene.getActiveIndices() / 3).toLocaleString('de-CH')} Dreiecke · ${scene.materials.filter((m) => m.name.startsWith('character-')).length} gemeinsame Figurenmaterialien`;
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
