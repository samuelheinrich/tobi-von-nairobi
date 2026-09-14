import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { playableLevels, baliEscape } from '@tobi/game-data';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import { HavokWorld, preparePhysics } from '../src/runtime/physics/havok-world.js';
import { BottlePickups } from '../src/runtime/items/bottle-pickups.js';
import { TobiVisual } from '../src/runtime/character/tobi-visual.js';
import { ParadeCrowd } from '../src/runtime/levels/parade-crowd.js';
import { PoliceRuntime } from '../src/runtime/police/police-runtime.js';

/** Offline authoring entry: captures real geometry once, never ships a second runtime to the menu. */
const level = playableLevels.find(
  (l) => l.id === new URLSearchParams(location.search).get('level'),
);
if (!level) throw new Error('Unknown preview level');
const poses: Record<string, { eye: [number, number, number]; target: [number, number, number] }> = {
  village: { eye: [17, 20, -28], target: [0, 0, 1] },
  'beach-bar': { eye: [41, 15, -41], target: [22, 1, -18] },
  'night-market': { eye: [16, 17, -31], target: [0, 1, -8] },
  railway: { eye: [12, 23, -38], target: [0, 0, -19] },
  'street-parade': { eye: [23, 20, -37], target: [0, 1, -3] },
  'hippie-house': { eye: [22, 42, -28], target: [0, 9, 4] },
};
const canvas = document.querySelector('canvas')!;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine);
const world = new HavokWorld(scene, await preparePhysics());
const environment = createLevelScene(scene, world, level);
const bottles = new BottlePickups(scene, level, environment.shadows);
const tobi = new TobiVisual(scene, environment.shadows);
tobi.root.position.set(level.spawn.x, level.spawn.y - 1.5, level.spawn.z + 2);
tobi.animate(0, 0, true, false, 0, 100, true);
const pose =
  level.id === baliEscape.id
    ? {
        eye: [-22, 15, -5] as [number, number, number],
        target: [0, 1, 9] as [number, number, number],
      }
    : poses[level.scenery]!;
const camera = new FreeCamera('preview', new Vector3(...pose.eye), scene);
camera.setTarget(new Vector3(...pose.target));
const crowd =
  level.scenery === 'street-parade' ? new ParadeCrowd(scene, level, environment.colliders) : null;
crowd?.update(0.4);
const police =
  level.maxWanted > 0
    ? new PoliceRuntime(scene, level, environment.colliders, environment.shadows)
    : null;
police?.system.provoke();
environment.focus?.(level.spawn);
bottles.cutaway(level.spawn.y);
await scene.whenReadyAsync();
for (let i = 0; i < 3; i++) scene.render();
document.body.dataset.previewReady = 'true';
window.addEventListener(
  'pagehide',
  () => {
    police?.dispose();
    crowd?.dispose();
    bottles.dispose();
    tobi.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
  },
  { once: true },
);
