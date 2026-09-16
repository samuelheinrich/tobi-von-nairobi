import { HavokWorld, preparePhysics } from '../src/runtime/physics/havok-world.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh.js';
import { HumanoidCharacter } from '../src/runtime/character/humanoid/character-runtime.js';
import {
  actions,
  type HumanoidAction,
  type AnimationState,
} from '../src/runtime/character/humanoid/schema.js';
import { tobiConfig, tobiDrunkConfig } from '../src/runtime/character/characters/tobi.js';
import { dancerConfigs } from '../src/runtime/character/characters/dancers.js';
import { townsfolkConfigs } from '../src/runtime/character/characters/townsfolk.js';
import { castConfigs } from '../src/runtime/character/characters/cast.js';
import { civilianConfigs } from '../src/runtime/character/characters/civilians.js';
import { createBottleModel } from '../src/runtime/items/bottle-model.js';
import { ThrownBottles } from '../src/runtime/items/thrown-bottles.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = document.querySelector('canvas')!;
const engine = new Engine(canvas, true),
  scene = new Scene(engine);
const physics = new HavokWorld(scene, await preparePhysics());
scene.clearColor = new Color4(0.08, 0.11, 0.16, 1);
const camera = new ArcRotateCamera('camera', Math.PI / 2, 1.35, 5.5, new Vector3(0, 1.1, 0), scene);
camera.attachControl(canvas, true);
new HemisphericLight('light', new Vector3(0.3, 1, 0.6), scene).intensity = 1.5;
const floor = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene);
const floorMaterial = new StandardMaterial('ground-material', scene);
floorMaterial.diffuseColor = new Color3(0.18, 0.23, 0.29);
floor.material = floorMaterial;
physics.addCollider(floor, { collision: 'box', size: [20, 0.2, 20], position: [0, -0.1, 0] });
const anchor = new TransformNode('player', scene);
let character: HumanoidCharacter | null = null,
  bottle = createBottleModel(scene, 'held'),
  lines: LinesMesh | null = null;
const projectiles = new ThrownBottles(scene, [floor], () => {});
let state: AnimationState = {
    speed: 0,
    grounded: true,
    sitting: false,
    drinking: false,
    holding: true,
  },
  jump = 0;
const preset = structuredClone(tobiConfig.attachments.bottle_right_hand!);
let released = 0,
  loadId = 0;
const action = element<HTMLSelectElement>('action');
for (const name of actions) {
  const option = document.createElement('option');
  option.textContent = name;
  action.append(option);
}
const speed = element<HTMLInputElement>('speed');
const offsets = element('offsets');
for (const key of ['position', 'rotation', 'scale'] as const) {
  for (let axis = 0; axis < 3; axis++) {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '.01';
    input.value = String(preset[key][axis]);
    input.title = key + ' ' + ['x', 'y', 'z'][axis];
    input.dataset.field = key;
    input.dataset.axis = String(axis);
    input.oninput = () => {
      const n = Number(input.value);
      if (Number.isFinite(n)) preset[key][axis] = n;
    };
    offsets.append(input);
  }
}
async function load() {
  const id = ++loadId;
  bottle.parent = null;
  character?.dispose();
  character = null;
  lines?.dispose();
  lines = null;
  const choice = element<HTMLSelectElement>('model').value;
  const dancer = [...dancerConfigs, ...townsfolkConfigs, ...castConfigs, ...civilianConfigs].find(
    (entry) => entry.id === choice,
  );
  const config = dancer
    ? dancer
    : choice === 'drunk'
      ? tobiDrunkConfig
      : choice === 'sam'
        ? {
            ...tobiConfig,
            id: 'sam',
            model: '/models/sam-game.glb',
            clipSources: [
              {
                model: tobiConfig.model,
                bones: tobiConfig.bones,
                animations: tobiConfig.animations,
              },
            ],
          }
        : tobiConfig;
  const loaded = await HumanoidCharacter.load(scene, anchor, config);
  if (id !== loadId) {
    loaded.dispose();
    return;
  }
  character = loaded;
  // Handle for automated checks: which clips were retargeted in, and what is playing.
  (window as unknown as Record<string, unknown>).__studio = () => ({
    id: character?.config.id,
    clips: [...(character?.clips.keys() ?? [])],
    action: character?.controller.action,
    time: character?.controller.time,
    hips: character?.rig.joints.get('hips')?.node.rotationQuaternion?.asArray(),
    // Measured world height of what is actually on screen, not the configured number.
    world: (() => {
      if (!character) return null;
      let lo = Infinity,
        hi = -Infinity;
      for (const mesh of character.root.getChildMeshes()) {
        if (!mesh.getTotalVertices()) continue;
        mesh.computeWorldMatrix(true);
        mesh.refreshBoundingInfo({ applySkeleton: true });
        const box = mesh.getBoundingInfo().boundingBox;
        lo = Math.min(lo, box.minimumWorld.y);
        hi = Math.max(hi, box.maximumWorld.y);
      }
      return Number.isFinite(hi - lo) ? Number((hi - lo).toFixed(3)) : null;
    })(),
    configured: character?.config.height,
    // Local Euler of both knees. A knee should turn on X alone; motion on Y or Z means the
    // retarget put the rotation on the wrong axis.
    knees: (() => {
      if (!character) return null;
      const out: Record<string, number[]> = {};
      for (const key of ['leftLowerLeg', 'rightLowerLeg'] as const) {
        const n = character!.rig.joints.get(key)?.node;
        if (!n) continue;
        const e = n.rotationQuaternion ? n.rotationQuaternion.toEulerAngles() : n.rotation;
        out[key] = [e.x, e.y, e.z].map((v) => Number(v.toFixed(3)));
      }
      return out;
    })(),
    // Joint-based height for comparison: head to the lower foot, in world units.
    joints: (() => {
      if (!character) return null;
      const at = (key: 'head' | 'leftFoot' | 'rightFoot') => {
        const node = character!.rig.joints.get(key)?.node;
        if (!node) return null;
        node.computeWorldMatrix(true);
        return node.getAbsolutePosition().y;
      };
      const head = at('head'),
        l = at('leftFoot'),
        r = at('rightFoot');
      if (head === null || l === null || r === null) return null;
      return Number((head - Math.min(l, r)).toFixed(3));
    })(),
  });
  document.body.dataset.ready = 'true';
}
element<HTMLSelectElement>('model').onchange = () =>
  void load().catch((e) => {
    element('status').textContent = String(e);
  });
element('play').onclick = () => {
  if (!character) return;
  const chosen = action.value as HumanoidAction;
  character.controller.preview(null);
  if (['idle', 'walk', 'run'].includes(chosen)) {
    state = {
      ...state,
      sitting: false,
      grounded: true,
      speed: chosen === 'run' ? 10.2 : chosen === 'walk' ? 5.8 : 0,
    };
  } else character.controller.preview(chosen);
};
element('jump').onclick = () => {
  character?.controller.preview(null);
  state.sitting = false;
  state.grounded = false;
  jump = 0.8;
};
element('sit').onclick = () => {
  character?.controller.preview(null);
  state.sitting = !state.sitting;
  state.speed = 0;
};
element('throw').onclick = () => {
  if (!character || character.controller.busy) return;
  state.holding = true;
  character.controller.preview(null);
  character.controller.play('throw_bottle');
};
function poseBones() {
  if (!character) return;
  const segments: Vector3[][] = [];
  for (const j of character.rig.joints.values()) {
    j.node.computeWorldMatrix(true);
    const parent = j.node.parent;
    if (parent instanceof TransformNode)
      segments.push([parent.getAbsolutePosition().clone(), j.node.getAbsolutePosition().clone()]);
  }
  if (lines) MeshBuilder.CreateLineSystem('bones', { lines: segments, instance: lines }, scene);
  else {
    lines = MeshBuilder.CreateLineSystem('bones', { lines: segments, updatable: true }, scene);
    lines.color = new Color3(0, 1, 0.8);
    lines.renderingGroupId = 2;
  }
  lines.setEnabled(element<HTMLInputElement>('bones').checked);
}
// Deliberately dev-page-only probes for inexpensive screenshot/marker checks.
const studio = {
  get character() {
    return character;
  },
  get bottle() {
    return bottle;
  },
  get released() {
    return released;
  },
  get state() {
    return state;
  },
  sample(name: HumanoidAction, phase: number) {
    if (!character) return;
    character.controller.preview(name);
    character.controller.time = phase * character.controller.timing(name).duration;
    character.pose(1, state);
    character.attachProp(bottle, preset);
    speed.value = '0';
    scene.render();
  },
};
(window as unknown as { characterStudio: typeof studio }).characterStudio = studio;
engine.runRenderLoop(() => {
  const delta = Math.min(0.05, engine.getDeltaTime() / 1000);
  physics.step(delta);
  if (character) {
    const timeScale = Number(speed.value);
    character.controller.playbackSpeed = timeScale;
    if (jump > 0) {
      jump = Math.max(0, jump - delta * timeScale);
      anchor.position.y = Math.sin((jump / 0.8) * Math.PI) * 0.8;
      if (jump === 0) state.grounded = true;
    }
    const events = character.update(delta, state);
    character.attachProp(bottle, preset);
    bottle.setEnabled(element<HTMLInputElement>('prop').checked && state.holding);
    for (const event of events)
      if (event.name === 'release') {
        const prop = character.attachments.detach(bottle);
        projectiles.launchProp(prop, 0);
        released++;
        bottle = createBottleModel(scene, 'held');
        state.holding = false;
      }
    projectiles.update(delta * timeScale, []);
    poseBones();
    element('status').textContent =
      character.controller.action +
      ' · ' +
      character.controller.time.toFixed(2) +
      ' s · ' +
      character.rig.joints.size +
      ' mapped Bones · Releases ' +
      released +
      ' · ' +
      JSON.stringify(preset);
  }
  scene.render();
});
window.addEventListener('resize', () => engine.resize());
window.addEventListener(
  'pagehide',
  () => {
    loadId++;
    character?.dispose();
    projectiles.dispose();
    scene.dispose();
    engine.dispose();
  },
  { once: true },
);
void load().catch((e) => {
  element('status').textContent = String(e);
});
