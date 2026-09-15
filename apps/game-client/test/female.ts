import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { createCharacter, type CharacterRig } from '../src/runtime/character/modular/rig.js';
import { generateFemaleNPC } from '../src/runtime/character/modular/female/generate.js';
import {
  femalePoses,
  animateFemale,
  type FemalePose,
} from '../src/runtime/character/modular/female/animation.js';
import type { FemaleRole } from '../src/runtime/character/modular/female/presets.js';
import type { Appearance } from '../src/runtime/character/modular/presets.js';
const canvas = document.querySelector('canvas')!,
  engine = new Engine(canvas, true),
  scene = new Scene(engine);
scene.clearColor = new Color4(0.06, 0.085, 0.12, 1);
const camera = new ArcRotateCamera(
  'adult-studio',
  Math.PI / 2,
  1.48,
  17,
  new Vector3(0, 1.1, 0),
  scene,
);
camera.fov = 0.36;
camera.attachControl(canvas, true);
new HemisphericLight('fill', new Vector3(0, 1, 1), scene).intensity = 0.85;
new DirectionalLight('key', new Vector3(-0.4, -1, -0.6), scene).intensity = 0.8;
const group = document.querySelector<HTMLSelectElement>('#group')!,
  pose = document.querySelector<HTMLSelectElement>('#pose')!,
  turn = document.querySelector<HTMLInputElement>('#turn')!;
for (const name of Object.keys(femalePoses)) pose.add(new Option(name, name));
let rigs: CharacterRig[] = [],
  batch = 0,
  time = 0;
function draw() {
  for (const rig of rigs) rig.dispose();
  rigs = [];
  let previous: Appearance | undefined;
  const labels = document.querySelector('#cast')!;
  labels.replaceChildren();
  for (let i = 0; i < 8; i++) {
    const spec = generateFemaleNPC({
      role: group.value as FemaleRole,
      seed: batch * 8 + i,
      used: rigs.map((r) => r.appearance),
      ...(previous ? { previous } : {}),
    });
    previous = spec;
    const rig = createCharacter(scene, `sample-${i}`, spec, null);
    rig.root.position.x = (3.5 - i) * 1.65;
    rigs.push(rig);
    const label = document.createElement('span');
    label.textContent = `${spec.femaleStyle!.bodyPreset} · ${spec.femaleStyle!.outfit} · ${spec.femaleStyle!.ageYears}`;
    labels.append(label);
  }
}
group.addEventListener('change', draw);
document.querySelector('#variants')!.addEventListener('click', () => {
  batch++;
  draw();
});
draw();
// Local inspection hook, only in this authoring entry; never included in the game build.
export const inspect = () => rigs.map((r) => r.appearance);
engine.runRenderLoop(() => {
  time += Math.min(0.05, engine.getDeltaTime() / 1000);
  for (const rig of rigs) {
    rig.root.rotation.y = turn.checked ? Math.PI / 2 : 0;
    animateFemale(
      rig,
      pose.value === 'still' ? 0 : time,
      'ambient',
      pose.value === 'still'
        ? 'idle_pose_01'
        : pose.value === 'auto'
          ? undefined
          : (pose.value as FemalePose),
    );
  }
  scene.render();
  document.body.dataset.ready = 'true';
  document.querySelector('#stats')!.textContent =
    `${scene.getActiveMeshes().length} aktive Meshes · ${Math.round(scene.getActiveIndices() / 3).toLocaleString('de-CH')} Dreiecke · ${scene.materials.length} Materialien`;
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
