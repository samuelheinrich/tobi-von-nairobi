import '@babylonjs/loaders/glTF/index.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { AssetContainer } from '@babylonjs/core/assetContainer.js';
import { PhysicsViewer } from '@babylonjs/core/Debug/physicsViewer.js';
import { HavokWorld, preparePhysics } from '../src/runtime/physics/havok-world.js';
import type { ColliderConfig, ColliderHandle } from '../src/runtime/physics/collider-factory.js';
const canvas = document.querySelector('canvas')!,
  engine = new Engine(canvas, true),
  scene = new Scene(engine);
const world = new HavokWorld(scene, await preparePhysics());
const camera = new ArcRotateCamera('camera', -Math.PI / 2, 1.2, 8, new Vector3(0, 1, 0), scene);
camera.attachControl(canvas, true);
new HemisphericLight('sky', Vector3.Up(), scene);
const viewer = new PhysicsViewer(scene);
const select = document.querySelector<HTMLSelectElement>('#mesh')!,
  shape = document.querySelector<HTMLSelectElement>('#shape')!;
const status = document.querySelector('#status')!;
let asset: AssetContainer | null = null,
  handle: ColliderHandle | null = null;
const configs: Record<string, ColliderConfig> = {};
const fields = ['size', 'position', 'rotation'] as const;
for (const field of fields) {
  const label = document.createElement('label');
  label.textContent = field + ' ';
  for (let i = 0; i < 3; i++) {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '.05';
    input.id = `${field}-${i}`;
    label.append(input);
  }
  document.querySelector('#values')!.append(label);
}
function clear() {
  if (handle) {
    viewer.hideBody(handle.aggregate.body);
    world.remove(handle);
    handle = null;
  }
}
function selected() {
  return asset?.meshes.filter((m) => m.getTotalVertices() > 0)[Number(select.value)];
}
function refreshFields() {
  const mesh = selected();
  if (!mesh) return;
  const b = mesh.getBoundingInfo().boundingBox;
  const config = configs[mesh.name];
  for (const field of fields)
    for (let i = 0; i < 3; i++)
      (document.getElementById(`${field}-${i}`) as HTMLInputElement).value = String(
        config?.[field]?.[i] ??
          (field === 'size'
            ? b.extendSize.asArray()[i]! * 2
            : field === 'position'
              ? b.center.asArray()[i]
              : 0),
      );
  shape.value = config?.collision ?? 'box';
  document.querySelector<HTMLInputElement>('#walkable')!.checked = config?.walkable ?? true;
}
select.onchange = () => {
  clear();
  refreshFields();
};
document.querySelector<HTMLInputElement>('#file')!.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  clear();
  asset?.dispose();
  for (const key of Object.keys(configs)) delete configs[key];
  try {
    asset = await LoadAssetContainerAsync(file, scene, { pluginExtension: '.glb' });
    asset.addAllToScene();
    for (const group of asset.animationGroups) group.stop();
    select.replaceChildren();
    for (const [i, m] of asset.meshes.filter((m) => m.getTotalVertices() > 0).entries()) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = m.name;
      select.append(option);
    }
    const bounds = asset.meshes
      .filter((m) => m.getTotalVertices() > 0)
      .map((m) => {
        m.computeWorldMatrix(true);
        return m.getBoundingInfo().boundingBox;
      });
    if (!bounds.length) throw new Error('GLB contains no renderable geometry.');
    const min = bounds[0]!.minimumWorld.clone();
    const max = min.clone();
    for (const b of bounds) {
      min.minimizeInPlace(b.minimumWorld);
      max.maximizeInPlace(b.maximumWorld);
    }
    camera.setTarget(min.add(max).scale(0.5));
    camera.radius = Math.max(2, max.subtract(min).length() * 1.3);
    refreshFields();
    status.textContent = 'Geladen: ' + file.name;
  } catch (error) {
    status.textContent = String(error);
  }
};
document.getElementById('apply')!.onclick = () => {
  clear();
  const mesh = selected();
  if (!mesh) return;
  try {
    const config: ColliderConfig = {
      collision: shape.value as ColliderConfig['collision'],
      walkable: document.querySelector<HTMLInputElement>('#walkable')!.checked,
    };
    if (config.collision === 'box' || config.collision === 'capsule')
      for (const field of fields)
        config[field] = [0, 1, 2].map((i) =>
          Number((document.getElementById(`${field}-${i}`) as HTMLInputElement).value),
        ) as [number, number, number];
    handle = world.addCollider(mesh, config);
    if (handle) viewer.showBody(handle.aggregate.body);
    configs[mesh.name] = config;
    status.textContent = JSON.stringify(config, null, 2);
  } catch (error) {
    status.textContent = String(error);
  }
};
document.getElementById('export')!.onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ meshes: configs }, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'collision-config.json';
  link.click();
  URL.revokeObjectURL(url);
};
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
