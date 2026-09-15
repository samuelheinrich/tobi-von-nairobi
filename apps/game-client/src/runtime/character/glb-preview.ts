import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { CharacterRig } from './modular/rig.js';

/** Proof of concept: puts downloaded GLB figures into a running level in place of NPC bodies.
 *
 * Off unless the page is opened with `?glb=…`, and everything it needs — the glTF loader and the
 * files themselves — is fetched only then. The production bundle keeps its size, and the models
 * stay in the owner's local `models/` folder, which the dev server serves and no build ships.
 *
 * Two very different kinds of file end up here. `sam` carries a 52-joint skeleton and an idle
 * animation, so it behaves like a character. The Sketchfab downloads are single static meshes:
 * they stand still while the rig walks around underneath them, which is the point of showing them.
 */

interface Model {
  file: string;
  /** True when the file brings its own skeleton and animation. */
  rigged: boolean;
  /** How many NPCs get this model. Each copy costs its full triangle count. */
  copies: number;
}

const CATALOGUE = {
  sam: { file: 'sam.glb', rigged: true, copies: 1 },
  nurse: { file: 'sexy_nurse_002.glb', rigged: false, copies: 4 },
  girl: { file: 'girl_sexy.glb', rigged: false, copies: 2 },
} as const satisfies Record<string, Model>;

export type GlbPreviewChoice = keyof typeof CATALOGUE;

const TARGET_HEIGHT = 1.78;

/** Reads `?glb=sam` (or `?glb=1` for the default) from the page URL. */
export function glbPreviewChoice(search = window.location.search): GlbPreviewChoice | null {
  const value = new URLSearchParams(search).get('glb');
  if (value === null) return null;
  if (value === '1' || value === '') return 'sam';
  return value in CATALOGUE ? (value as GlbPreviewChoice) : null;
}

/** Scales an import to Tobi's height and stands it on its own origin.
 *
 * Returns without touching anything when the file already arrives at a plausible human height —
 * a rigged avatar is authored in metres, and rescaling it would only fight the skeleton.
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

/** Replaces the bodies of some of the given rigs with copies of one downloaded model.
 *
 * Returns how many rigs were dressed, or 0 when the preview is switched off. Failures are
 * reported and swallowed: a missing file must not take a level down.
 */
export async function applyGlbPreview(
  scene: Scene,
  rigs: readonly CharacterRig[],
  choice: GlbPreviewChoice | null = glbPreviewChoice(),
): Promise<number> {
  if (!choice || rigs.length === 0) return 0;
  const model: Model = CATALOGUE[choice];
  try {
    // Loading the glTF plugin here keeps it out of every build that does not ask for it.
    const [{ LoadAssetContainerAsync }] = await Promise.all([
      import('@babylonjs/core/Loading/sceneLoader.js'),
      import('@babylonjs/loaders/glTF/2.0/glTFLoader.js'),
      // Only the extensions the downloaded files declare. `registerBuiltInGLTFExtensions()` would
      // work too but drags in every extension Babylon knows — gaussian splatting, interactivity,
      // OpenPBR — and half a megabyte of chunks the preview never touches.
      import('@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_unlit.js'),
      import('@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_specular.js'),
    ]);
    const container = await LoadAssetContainerAsync(`/models/${model.file}`, scene);
    if (scene.isDisposed) return 0;

    const dressed = rigs.slice(0, model.copies);
    for (const rig of dressed) {
      // The container instantiates skeletons and animation groups per copy, so several figures
      // can move independently instead of sharing one pose.
      const copy = container.instantiateModelsToScene((name) => name, false, {
        doNotInstantiate: true,
      });
      const root = copy.rootNodes[0];
      if (!(root instanceof TransformNode)) continue;
      const meshes = root.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0);
      normalise(root, meshes, model.rigged);
      // Hangs off the rig root, so it follows the NPC's position and facing. A rigged model plays
      // its own clip on top; a static one simply gets carried around.
      root.parent = rig.root;
      for (const group of copy.animationGroups) group.play(true);
    }

    // The rig's own LOD observer re-enables the procedural body every frame, and slot recycling
    // swaps in a whole new wardrobe. Hiding once is not enough, so hide continuously — cheap for
    // a handful of figures, and `isVisible` is the one switch that observer never touches.
    const hidden = new Set(dressed);
    scene.onBeforeRenderObservable.add(() => {
      for (const rig of hidden) {
        for (const mesh of rig.visual.getChildMeshes()) mesh.isVisible = false;
        for (const mesh of rig.distant.getChildMeshes()) mesh.isVisible = false;
      }
    });
    return dressed.length;
  } catch (error) {
    console.warn('[glb-preview] konnte das Modell nicht laden:', error);
    return 0;
  }
}
