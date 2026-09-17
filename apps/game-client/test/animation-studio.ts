import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import '@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_webp.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { HumanoidCharacter } from '../src/runtime/character/humanoid/character-runtime.js';
import type { CharacterConfig, HumanoidAction } from '../src/runtime/character/humanoid/schema.js';
import {
  barHardConfig,
  barHeelsConfig,
  barNakedConfig,
  barWalkerConfig,
  copConfig,
  gabberAnitaConfig,
  gabberDutchConfig,
  gabberFemaleConfig,
  gabberSjonnieConfig,
} from '../src/runtime/character/characters/cast.js';
import {
  joeConfig,
  joshConfig,
  womanConfig,
} from '../src/runtime/character/characters/civilians.js';
import { newCastConfigs } from '../src/runtime/character/characters/new-cast.js';

const configs: CharacterConfig[] = [
  barWalkerConfig,
  barHardConfig,
  barNakedConfig,
  barHeelsConfig,
  copConfig,
  gabberAnitaConfig,
  gabberDutchConfig,
  gabberFemaleConfig,
  gabberSjonnieConfig,
  joeConfig,
  joshConfig,
  womanConfig,
  ...newCastConfigs,
];
const canvas = document.querySelector('canvas')!;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = Color4.FromHexString('#111925ff');
const camera = new ArcRotateCamera('camera', Math.PI / 2, 1.25, 7, new Vector3(0, 1, 0), scene);
camera.attachControl(canvas, true);
new HemisphericLight('light', new Vector3(0, 1, 0), scene).intensity = 1;
const ground = MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
const groundMaterial = new StandardMaterial('ground-material', scene);
groundMaterial.diffuseColor = Color3.FromHexString('#273541');
ground.material = groundMaterial;
const rootMarker = MeshBuilder.CreateSphere('root-marker', { diameter: 0.13 }, scene);
const hipsMarker = MeshBuilder.CreateSphere('hips-marker', { diameter: 0.13 }, scene);
const markerMaterial = (name: string, color: Color3) => {
  const value = new StandardMaterial(name, scene);
  value.emissiveColor = color;
  value.disableLighting = true;
  return value;
};
rootMarker.material = markerMaterial('root-yellow', Color3.Yellow());
hipsMarker.material = markerMaterial('hips-cyan', Color3.FromHexString('#00ffff'));
const characterSelect = document.querySelector<HTMLSelectElement>('#character')!;
const actionSelect = document.querySelector<HTMLSelectElement>('#action')!;
const speed = document.querySelector<HTMLInputElement>('#speed')!;
const state = document.querySelector<HTMLElement>('#state')!;
characterSelect.innerHTML = configs.map((config) => `<option>${config.id}</option>`).join('');

let character: HumanoidCharacter | null = null;
let stage: TransformNode | null = null;
let trajectory = MeshBuilder.CreateLines(
  'empty-trajectory',
  { points: [Vector3.Zero(), Vector3.Zero()] },
  scene,
);
trajectory.color = Color3.Magenta();
let start = Vector3.Zero();

function actions(config: CharacterConfig): HumanoidAction[] {
  return [
    ...new Set([
      ...Object.keys(config.animations),
      ...(config.clipSources ?? []).flatMap((source) => Object.keys(source.animations)),
    ]),
  ] as HumanoidAction[];
}

function refreshTrajectory(): void {
  trajectory.dispose();
  if (!character) return;
  const action = actionSelect.value as HumanoidAction;
  const points = character.rootMotionTrajectory(action);
  const first = points[0]!;
  const scale = character.root.scaling.y;
  trajectory = MeshBuilder.CreateLines(
    'root-motion-trajectory',
    { points: points.map((point) => point.subtract(first).scale(scale).add(start)) },
    scene,
  );
  trajectory.color = Color3.Magenta();
}

async function load(): Promise<void> {
  delete document.body.dataset.character;
  character?.dispose();
  stage?.dispose();
  const config = configs.find((candidate) => candidate.id === characterSelect.value) ?? configs[0]!;
  stage = new TransformNode('character-world-transform', scene);
  character = await HumanoidCharacter.load(scene, stage, config);
  start = stage.position.clone();
  const available = actions(character.config);
  actionSelect.innerHTML = available.map((action) => `<option>${action}</option>`).join('');
  const action = available[0] ?? 'idle';
  actionSelect.value = action;
  character.controller.preview(action);
  refreshTrajectory();
  document.body.dataset.character = config.id;
}

characterSelect.addEventListener('change', () => void load());
actionSelect.addEventListener('change', () => {
  if (!character || !stage) return;
  stage.position.copyFrom(start);
  character.controller.preview(actionSelect.value as HumanoidAction);
  refreshTrajectory();
});

engine.runRenderLoop(() => {
  const delta = Math.min(0.05, engine.getDeltaTime() / 1000);
  if (character && stage) {
    character.controller.time += delta * Number(speed.value);
    character.pose(delta, {
      speed: 0,
      grounded: true,
      sitting: false,
      drinking: false,
      holding: false,
    });
    const hips = character.rig.joints.get('hips')!.node;
    hips.computeWorldMatrix(true);
    rootMarker.position.copyFrom(stage.getAbsolutePosition());
    hipsMarker.position.copyFrom(hips.getAbsolutePosition());
    const policy = character.controller.policy();
    const timing = character.controller.timing();
    state.textContent = JSON.stringify(
      {
        action: character.controller.action,
        loopMode: policy.loopMode,
        rootMotion: policy.rootMotion,
        inPlace: policy.inPlace,
        crossfadeDuration: policy.crossfadeDuration,
        clipDuration: timing.duration,
        elapsed: Number(character.controller.time.toFixed(2)),
        worldDelta: stage.position
          .subtract(start)
          .asArray()
          .map((value) => Number(value.toFixed(3))),
        rootBone: character.rig.root.name,
        rootMotionBones: character.rootMotionBoneNames(character.controller.action),
        hipsBone: hips.name,
      },
      null,
      2,
    );
  }
  scene.render();
  document.body.dataset.ready = 'true';
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
void load();
