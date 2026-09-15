/** Model studio: the licence, cost and role of every file in the owner's local `models/` folder,
 * and a 3D view of the ones for a chosen role next to the procedural figure they would replace.
 *
 * The table comes from `glb-catalogue.ts` and is complete before anything downloads — several of
 * these files are tens of megabytes, so the 3D view loads one role at a time.
 */
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_unlit.js';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_specular.js';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_pbrSpecularGlossiness.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import {
  CATALOGUE,
  ROLE_LABEL,
  entriesForRole,
  type CatalogueEntry,
  type ModelRole,
} from '../src/runtime/character/glb-catalogue.js';
import { createNpc, npcPalette } from '../src/runtime/levels/npc-kit.js';
import { animateCharacter } from '../src/runtime/character/modular/animation.js';

const TARGET_HEIGHT = 1.78;
const SPACING = 2;

const canvas = document.querySelector('canvas')!;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.075, 0.11, 1);

const camera = new ArcRotateCamera('studio', Math.PI / 2, 1.35, 8, new Vector3(0, 1, 0), scene);
camera.attachControl(canvas, true);
camera.fov = 0.55;
camera.wheelPrecision = 24;
camera.lowerRadiusLimit = 0.6;
camera.upperRadiusLimit = 40;

// The same two lights the game levels use, so the comparison is not flattered by studio lighting.
new HemisphericLight('fill', new Vector3(0, 1, 1), scene).intensity = 0.85;
new DirectionalLight('key', new Vector3(-0.4, -1, -0.6), scene).intensity = 1;

const ground = CreateGround('ground', { width: 60, height: 60 }, scene);
const groundMaterial = new StandardMaterial('ground', scene);
groundMaterial.diffuseColor = new Color3(0.1, 0.12, 0.15);
groundMaterial.specularColor = Color3.Black();
ground.material = groundMaterial;

/** The current NPC, for a like-for-like comparison at the left of every row. */
const reference = createNpc(
  scene,
  'dancer',
  npcPalette(scene, 3),
  null,
  false,
  'dancer',
  true,
  true,
);

const status = document.querySelector('#status')!;
const table = document.querySelector('#table')!;
const roles = document.querySelector<HTMLSelectElement>('#role')!;
const turntable = document.querySelector<HTMLInputElement>('#turntable')!;

/** Scales an import to human height and stands it on the ground, whatever unit it came in.
 *
 * A rigged avatar authored in metres is left alone: rescaling it only fights the skeleton.
 */
function normalise(root: TransformNode, meshes: readonly AbstractMesh[], rigged: boolean): void {
  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo({ applySkeleton: rigged });
    const box = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, box.minimumWorld);
    max = Vector3.Maximize(max, box.maximumWorld);
  }
  const height = max.y - min.y;
  if (height < 0.001) return;
  const scale = rigged && height > 1.4 && height < 2.2 ? 1 : TARGET_HEIGHT / height;
  root.scaling.scaleInPlace(scale);
  root.position.set(-((min.x + max.x) / 2) * scale, -min.y * scale, -((min.z + max.z) / 2) * scale);
}

const shown = new Map<string, TransformNode>();

function rowFor(entry: CatalogueEntry): string {
  const rig = entry.joints
    ? `✓ ${entry.joints}${entry.animation ? ` · ${entry.animation}` : ' · kein Clip'}`
    : '—';
  const caveat = entry.caveat ? `<br><span class="warn">⚠ ${entry.caveat}</span>` : '';
  const here = shown.has(entry.file) ? ' class="here"' : '';
  return `<tr${here}><td><strong>${entry.title}</strong><br><span class="dim">${entry.file}</span></td>
    <td>${ROLE_LABEL[entry.role]}</td>
    <td class="dim">${entry.author}<br><span class="dim">${entry.licence}</span>${caveat}</td>
    <td class="num">${entry.megabytes.toFixed(1)} MiB</td>
    <td class="num">${entry.triangles.toLocaleString('de-CH')}</td>
    <td class="num">${rig}</td></tr>`;
}

function describe(): void {
  const npcTriangles = reference.root
    .getChildMeshes()
    .reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0);
  const rigged = CATALOGUE.filter((entry) => entry.joints > 0).length;
  const order: ModelRole[] = [
    'tobi',
    'police',
    'security',
    'dancer',
    'bargirl',
    'tourist',
    'resident',
    'yoga',
    'beach',
    'none',
  ];
  const sorted = order.flatMap((role) => entriesForRole(role));
  table.innerHTML = `<p class="dim">${CATALOGUE.length} Dateien, ${rigged} davon mit Skelett.
    Alle Sketchfab-Modelle sind CC-BY-4.0 und brauchen Namensnennung.
    Zum Vergleich: die heutige prozedurale Figur kostet
    <strong>${Math.round(npcTriangles).toLocaleString('de-CH')}</strong> Dreiecke und 0 Byte.</p>
    <table><thead><tr><th>Modell</th><th>Rolle</th><th>Autor · Lizenz</th><th>Datei</th>
    <th>Dreiecke</th><th>Skelett</th></tr></thead><tbody>${sorted.map(rowFor).join('')}</tbody></table>`;
}

async function load(entry: CatalogueEntry, slot: number): Promise<void> {
  status.textContent = `Lade ${entry.title} (${entry.megabytes.toFixed(1)} MiB) …`;
  const container = await LoadAssetContainerAsync(`/models/${entry.file}`, scene);
  const copy = container.instantiateModelsToScene((name) => name, false, {
    doNotInstantiate: true,
  });
  const root = copy.rootNodes[0];
  if (!(root instanceof TransformNode)) return;
  const meshes = root.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0);
  normalise(root, meshes, entry.joints > 0);
  root.position.x += slot * SPACING;
  // A file that brought its own clip plays it; the static ones have nothing to play.
  for (const group of copy.animationGroups) group.play(true);
  shown.set(entry.file, root);
}

async function showRole(role: ModelRole): Promise<void> {
  for (const node of shown.values()) node.dispose(false, true);
  shown.clear();
  describe();
  const entries = entriesForRole(role);
  // The camera looks down -Z in a left-handed scene, so a larger x renders further left. The
  // reference figure takes the leftmost slot; the models line up to its right.
  reference.root.position.x = entries.length * SPACING;
  camera.setTarget(new Vector3((entries.length * SPACING) / 2, 1, 0));
  camera.radius = 5 + entries.length * 1.6;
  for (const [slot, entry] of entries.entries()) await load(entry, slot);
  const heavy = entries.reduce((sum, entry) => sum + entry.triangles, 0);
  status.textContent = `${ROLE_LABEL[role]}: ${entries.length} Modelle, ${heavy.toLocaleString('de-CH')} Dreiecke zusammen. Ganz links die heutige Figur.`;
  describe();
  document.body.dataset.ready = 'true';
}

roles.innerHTML = (Object.keys(ROLE_LABEL) as ModelRole[])
  .filter((role) => entriesForRole(role).length > 0)
  .map(
    (role) =>
      `<option value="${role}">${ROLE_LABEL[role]} (${entriesForRole(role).length})</option>`,
  )
  .join('');
roles.addEventListener('change', () => void showRole(roles.value as ModelRole));

let time = 0;
engine.runRenderLoop(() => {
  const delta = Math.min(0.05, engine.getDeltaTime() / 1000);
  time += delta;
  animateCharacter(reference, 'walk', time, 0);
  if (turntable.checked) for (const node of shown.values()) node.rotation.y += delta * 0.5;
  scene.render();
  document.querySelector('#fps')!.textContent =
    `${engine.getFps().toFixed(0)} FPS · ${Math.round(scene.getActiveIndices() / 3).toLocaleString('de-CH')} Dreiecke im Bild`;
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

describe();
void showRole('police').catch((error: unknown) => {
  status.textContent = `Fehler: ${String(error)}`;
});
