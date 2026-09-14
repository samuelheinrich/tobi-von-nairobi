import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TobiVisual } from '../src/runtime/character/tobi-visual.js';
import { material } from '../src/runtime/levels/materials.js';

/** Development-only art preview; the production entry never imports this module. */
const engine = new Engine(document.querySelector('canvas')!, true);
const scene = new Scene(engine);
scene.clearColor = Color4.FromHexString('#eee6d3ff');
const camera = new FreeCamera('portrait', new Vector3(2.7, 2.1, 5.8), scene);
camera.setTarget(new Vector3(0, 1.22, 0));
new HemisphericLight('fill', new Vector3(0, 1, 0), scene).intensity = 0.85;
const sun = new DirectionalLight('key', new Vector3(-0.4, -1, -0.5), scene);
sun.position.set(5, 8, 6);
sun.intensity = 0.7;
const shadows = new ShadowGenerator(1024, sun);
shadows.usePercentageCloserFiltering = true;
const ground = MeshBuilder.CreateGround('studio', { width: 200, height: 200 }, scene);
ground.material = material(scene, 'studio-sand', '#eee6d3');
ground.receiveShadows = true;
const tobi = new TobiVisual(scene, shadows);
let drinking = false;
document.querySelector('#pose')!.addEventListener('click', () => {
  drinking = !drinking;
});
document.querySelector('#turn')!.addEventListener('click', () => {
  tobi.root.rotation.y += Math.PI / 4;
});
engine.runRenderLoop(() => {
  tobi.animate(0, 0, true, false, 0, 100, true, drinking ? 1 : 0);
  scene.render();
});
window.addEventListener('resize', () => engine.resize());
window.addEventListener(
  'pagehide',
  () => {
    tobi.dispose();
    scene.dispose();
    engine.dispose();
  },
  { once: true },
);
