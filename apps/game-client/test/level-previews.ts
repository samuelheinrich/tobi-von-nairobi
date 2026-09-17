import { VehicleRuntime } from '../src/runtime/vehicles/vehicle-runtime.js';
import { FlightRuntime } from '../src/runtime/flight/flight-runtime.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { playableLevels, baliEscape, zurichLayout } from '@tobi/game-data';
import { createLevelScene } from '../src/runtime/levels/create-level-scene.js';
import { HavokWorld, preparePhysics } from '../src/runtime/physics/havok-world.js';
import { BottlePickups } from '../src/runtime/items/bottle-pickups.js';
import { TobiVisual } from '../src/runtime/character/tobi-visual.js';
import { ParadeCrowd } from '../src/runtime/levels/parade-crowd.js';
import { PoliceRuntime } from '../src/runtime/police/police-runtime.js';
import { SpeechBubbles } from '../src/runtime/levels/speech-bubbles.js';
import { createLevelNpcs } from '../src/runtime/levels/create-level-npcs.js';

/** Offline authoring entry: captures real geometry once, never ships a second runtime to the menu. */
const level = playableLevels.find(
  (l) => l.id === new URLSearchParams(location.search).get('level'),
);
if (!level) throw new Error('Unknown preview level');
const poses: Record<string, { eye: [number, number, number]; target: [number, number, number] }> = {
  village: { eye: [17, 20, -28], target: [0, 0, 1] },
  'beach-bar': { eye: [41, 15, -41], target: [22, 1, -18] },
  'night-market': { eye: [16, 17, -31], target: [0, 1, -8] },
  'bali-adventure': { eye: [-152, 100, -155], target: [-26, 0, 4] },
  tutorial: { eye: [15, 18, -12], target: [0, 0, 7] },
  aircraft: { eye: [15, 21, -42], target: [0, 0, -13] },
  railway: { eye: [12, 23, -38], target: [0, 0, -19] },
  'street-parade': { eye: [-35, 14, 35], target: [-35, 1.5, 92] },
  'hippie-house': { eye: [-65, 65, -80], target: [8, 3, 1] },
  'nana-plaza': { eye: [-12, 14, 7], target: [2, 3.5, 34] },
  'drunk-tank': { eye: [9, 7, -9], target: [0, 1, 0] },
};
const canvas = document.querySelector('canvas')!;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine);
const world = new HavokWorld(scene, await preparePhysics());
const environment = createLevelScene(scene, world, level);
const vehicles = environment.vehicles
  ? new VehicleRuntime(scene, world, environment.vehicles)
  : null;
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
  level.scenery === 'street-parade'
    ? new ParadeCrowd(scene, level, environment.colliders, zurichLayout.route)
    : null;
crowd?.update(0.4);
const police =
  level.maxWanted > 0
    ? new PoliceRuntime(scene, level, environment.colliders, environment.shadows)
    : null;
police?.system.provoke();
// The resident cast belongs in the thumbnail: a carriage without passengers sells nothing.
const bubbles = new SpeechBubbles(scene, 2);
const flight =
  level.scenery === 'aircraft' && environment.aircraft
    ? new FlightRuntime(scene, world, environment.aircraft)
    : null;
const npcs = createLevelNpcs(scene, level, environment, bubbles);
npcs?.update(0.4, level.scenery === 'nana-plaza' ? { x: 0, y: 1, z: 24 } : level.spawn);
bubbles.update(0, new Vector3(...pose.eye));
environment.focus?.(
  level.scenery === 'nana-plaza'
    ? { x: 0, y: 5.8, z: 24 }
    : level.scenery === 'hippie-house'
      ? { x: 0, y: 1, z: -22 }
      : level.scenery === 'street-parade'
        ? { x: -35, y: 1, z: 86 }
        : level.spawn,
);
bottles.cutaway(level.spawn.y);
const advanceLevel = (seconds: number) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.12) {
    const delta = Math.min(0.12, seconds - elapsed);
    environment.update?.(delta);
    npcs?.update(delta, level.scenery === 'street-parade' ? { x: -35, y: 1, z: 86 } : level.spawn);
    world.step(delta);
  }
  document.body.dataset.levelDebug = JSON.stringify(environment.debugState?.() ?? {});
};
// Let pulsing materials — disco tiles, neon, love-mobile speakers — settle into a lit frame.
advanceLevel(0.48);
Object.assign(window, { advanceLevel });
await scene.whenReadyAsync();
for (let i = 0; i < 3; i++) scene.render();
document.body.dataset.previewReady = 'true';
window.addEventListener(
  'pagehide',
  () => {
    vehicles?.dispose();
    police?.dispose();
    flight?.dispose();
    npcs?.dispose();
    bubbles.dispose();
    crowd?.dispose();
    bottles.dispose();
    tobi.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
  },
  { once: true },
);
