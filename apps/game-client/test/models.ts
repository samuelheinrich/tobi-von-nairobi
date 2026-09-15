/** Model studio: measures what the four downloaded Sketchfab GLB files actually cost and how
 * they look next to the procedural figures the game ships today.
 *
 * Deliberately a separate harness and not part of the game: the files are large, unrigged and
 * under third-party licences. Nothing here is built into the production bundle.
 */
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import { registerBuiltInGLTFExtensions } from '@babylonjs/loaders/glTF/2.0/Extensions/dynamic.js';
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
import { createNpc, npcPalette } from '../src/runtime/levels/npc-kit.js';
import { animateCharacter } from '../src/runtime/character/modular/animation.js';

registerBuiltInGLTFExtensions();

/** What the owner downloaded, with the licence each file carries in its own `asset.extras`. */
interface Candidate {
  file: string;
  title: string;
  author: string;
  licence: string;
  /** True when the licence permits shipping the file in this public repository. */
  usable: boolean;
  note: string;
}

const CANDIDATES: readonly Candidate[] = [
  {
    file: 'sam.glb',
    title: 'Sam',
    author: 'Avaturn · Eigentümer',
    licence: 'eigenes Abbild',
    usable: true,
    note: 'Skelett mit 52 Gelenken und Idle-Animation. 21k Dreiecke — günstiger als die heutige Figur.',
  },
  {
    file: 'sexy_nurse_002.glb',
    title: 'Sexy Nurse 002',
    author: 'SinfulBrain',
    licence: 'CC-BY-4.0',
    usable: true,
    note: 'Nutzbar mit Namensnennung. Starr. 39 MiB, 749k Dreiecke: muss reduziert werden.',
  },
  {
    file: 'girl_sexy.glb',
    title: 'Girl sexy',
    author: 'tr.onurdk1',
    licence: 'CC-BY-4.0',
    usable: true,
    note: 'Nutzbar mit Namensnennung. Starr, unlit. 66 MiB, 1,5 Mio Dreiecke: schwerster Fall.',
  },
];

const TARGET_HEIGHT = 1.78;
const SPACING = 2;

const canvas = document.querySelector('canvas')!;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.075, 0.11, 1);

const camera = new ArcRotateCamera('studio', Math.PI / 2, 1.35, 9, new Vector3(0, 1, 0), scene);
camera.attachControl(canvas, true);
camera.fov = 0.55;
camera.wheelPrecision = 24;
camera.lowerRadiusLimit = 0.6;
camera.upperRadiusLimit = 40;

// The same two lights the game levels use, so the comparison is not flattered by studio lighting.
new HemisphericLight('fill', new Vector3(0, 1, 1), scene).intensity = 0.85;
new DirectionalLight('key', new Vector3(-0.4, -1, -0.6), scene).intensity = 1;

const ground = CreateGround('ground', { width: 40, height: 40 }, scene);
const groundMaterial = new StandardMaterial('ground', scene);
groundMaterial.diffuseColor = new Color3(0.1, 0.12, 0.15);
groundMaterial.specularColor = Color3.Black();
ground.material = groundMaterial;

/** The current NPC for side-by-side comparison; it stands at the far left of the row. */
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
reference.root.position.x = -1.5 * SPACING;

interface Loaded {
  candidate: Candidate;
  root: TransformNode;
  /** True when the file brought a skeleton and at least one animation. */
  rigged: boolean;
  joints: number;
  triangles: number;
  seconds: number;
  megabytes: number;
}

const loaded: Loaded[] = [];
const status = document.querySelector('#status')!;
const table = document.querySelector('#table')!;

function describe(): void {
  const rows = loaded.map((entry) => {
    const flag = entry.candidate.usable ? '🟢' : '🔴';
    const rig = entry.rigged ? `✓ ${entry.joints} Gelenke` : '—';
    return `<tr><td>${flag} <strong>${entry.candidate.title}</strong><br><span class="dim">${entry.candidate.author} · ${entry.candidate.licence}</span></td>
      <td class="num">${entry.megabytes.toFixed(1)} MiB</td>
      <td class="num">${entry.triangles.toLocaleString('de-CH')}</td>
      <td class="num">${rig}</td>
      <td class="num">${entry.seconds.toFixed(2)} s</td>
      <td class="dim">${entry.candidate.note}</td></tr>`;
  });
  const npcTriangles = reference.root
    .getChildMeshes()
    .reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0);
  table.innerHTML = `<table><thead><tr><th>Modell</th><th>Datei</th><th>Dreiecke</th><th>Skelett</th><th>Laden</th><th>Bewertung</th></tr></thead><tbody>
    <tr><td>⚪️ <strong>Heutige Spielfigur</strong><br><span class="dim">prozedural, animiert</span></td>
      <td class="num">0 MiB</td><td class="num">${Math.round(npcTriangles).toLocaleString('de-CH')}</td>
      <td class="num">prozedural</td>
      <td class="num">0,00 s</td><td class="dim">Referenz ganz links, gehende Animation.</td></tr>
    ${rows.join('')}</tbody></table>`;
}

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
    const bounds = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, bounds.minimumWorld);
    max = Vector3.Maximize(max, bounds.maximumWorld);
  }
  const height = max.y - min.y;
  if (height < 0.001) return;
  const scale = rigged && height > 1.4 && height < 2.2 ? 1 : TARGET_HEIGHT / height;
  root.scaling.scaleInPlace(scale);
  root.position.set(-((min.x + max.x) / 2) * scale, -min.y * scale, -((min.z + max.z) / 2) * scale);
}

async function load(candidate: Candidate, slot: number): Promise<void> {
  status.textContent = `Lade ${candidate.title} …`;
  const started = performance.now();
  const response = await fetch(`/models/${candidate.file}`);
  const bytes = await response.arrayBuffer();
  const container = await LoadAssetContainerAsync(new File([bytes], candidate.file), scene);
  const seconds = (performance.now() - started) / 1000;

  const copy = container.instantiateModelsToScene((name) => name, false, {
    doNotInstantiate: true,
  });
  const root = copy.rootNodes[0];
  if (!(root instanceof TransformNode)) return;
  const meshes = root.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0);
  const rigged = copy.animationGroups.length > 0;
  normalise(root, meshes, rigged);
  root.position.x += (slot - 0.5) * SPACING;
  // A file that brought its own clip plays it; the static ones have nothing to play.
  for (const group of copy.animationGroups) group.play(true);

  const triangles = meshes.reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0);
  loaded.push({
    candidate,
    root,
    rigged,
    joints: copy.skeletons[0]?.bones.length ?? 0,
    triangles: Math.round(triangles),
    seconds,
    megabytes: bytes.byteLength / 1048576,
  });
  describe();
}

async function loadAll(): Promise<void> {
  for (const [slot, candidate] of CANDIDATES.entries()) await load(candidate, slot);
  const rigged = loaded.filter((entry) => entry.rigged).length;
  status.textContent = `${loaded.length} geladen, davon ${rigged} mit Skelett und eigener Animation.`;
  document.body.dataset.ready = 'true';
}

const focus = document.querySelector<HTMLSelectElement>('#focus')!;
focus.addEventListener('change', () => {
  const chosen = focus.value;
  for (const entry of loaded)
    entry.root.setEnabled(chosen === 'all' || chosen === entry.candidate.file);
  reference.root.setEnabled(chosen === 'all' || chosen === 'npc');
  const target = loaded.find((entry) => entry.candidate.file === chosen);
  camera.setTarget(
    chosen === 'all'
      ? new Vector3(0, 1, 0)
      : new Vector3(
          chosen === 'npc' ? reference.root.position.x : (target?.root.position.x ?? 0),
          1,
          0,
        ),
  );
  camera.radius = chosen === 'all' ? 9 : 3.4;
});

const turntable = document.querySelector<HTMLInputElement>('#turntable')!;

let time = 0;
engine.runRenderLoop(() => {
  const delta = Math.min(0.05, engine.getDeltaTime() / 1000);
  time += delta;
  // The reference figure walks; the imports cannot, so they only turn on the spot.
  animateCharacter(reference, 'walk', time, 0);
  if (turntable.checked) for (const entry of loaded) entry.root.rotation.y += delta * 0.5;
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

void loadAll().catch((error: unknown) => {
  status.textContent = `Fehler: ${String(error)}`;
});
