import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { createNpc, npcPalette } from '../src/runtime/levels/npc-kit.js';
import { cast, type CastRole } from '../src/runtime/character/characters/casting.js';
import { FarNpcModels } from '../src/runtime/character/far-npc-models.js';
const canvas = document.querySelector('canvas')!;
const engine = new Engine(canvas, true),
  scene = new Scene(engine);
const camera = new ArcRotateCamera('camera', -Math.PI / 2, 1.1, 23, new Vector3(0, 1, 0), scene);
camera.attachControl(canvas, true);
new HemisphericLight('light', new Vector3(0.3, 1, 0.4), scene).intensity = 1.5;
MeshBuilder.CreateGround('floor', { width: 28, height: 20 }, scene);
const roles = Object.keys(cast) as CastRole[];
const rigs = roles.map((role, i) => {
  const rig = createNpc(scene, 'cast-' + role, npcPalette(scene, i), null, role === 'passenger');
  rig.castRole = role;
  rig.root.position.set(((i % 6) - 2.5) * 3.5, 0, (Math.floor(i / 6) - 1) * 4.5);
  rig.root.rotation.y = Math.PI;
  rig.gesture(
    ['dancer', 'ladyboyDancer', 'bargirl', 'raver'].includes(role)
      ? 'dance'
      : role === 'passenger'
        ? 'sit'
        : 'idle',
  );
  return rig;
});
const far = new FarNpcModels(scene, [
  { id: 99, role: 'police', position: () => ({ x: 10, y: 0, z: 6 }), yaw: Math.PI },
]);
const probe = { scene, rigs, far };
(window as unknown as { npcCast: typeof probe }).npcCast = probe;
engine.runRenderLoop(() => {
  far.update(camera.globalPosition, new Set());
  scene.render();
  const ready = rigs.filter((r) => r.modelActive);
  document.querySelector('#status')!.textContent =
    `${ready.length}/${roles.length} GLB-NPCs · Fernmodell ${far.has(99) ? 'bereit' : 'lädt'} · ${roles.join(', ')}`;
});
window.addEventListener('resize', () => engine.resize());
window.addEventListener(
  'pagehide',
  () => {
    far.dispose();
    scene.dispose();
    engine.dispose();
  },
  { once: true },
);
