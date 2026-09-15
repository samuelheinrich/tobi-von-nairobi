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
 * The figures have no skeleton, so they stand still while the rig walks around underneath them.
 * That is the point of the preview: it shows what these assets look like in the game's own
 * lighting *and* what they cannot do.
 */

const CATALOGUE = {
  bailarina: 'Bailarina_sexy.glb',
  kushina: 'kushina_sexy.glb',
  nurse: 'sexy_nurse_002.glb',
  girl: 'girl_sexy.glb',
} as const;

export type GlbPreviewChoice = keyof typeof CATALOGUE;

/** How many NPCs get a model. Each copy costs its full triangle count, so this stays small. */
const MAX_FIGURES = 6;
const TARGET_HEIGHT = 1.78;

/** Reads `?glb=bailarina` (or `?glb=1` for the smallest file) from the page URL. */
export function glbPreviewChoice(search = window.location.search): GlbPreviewChoice | null {
  const value = new URLSearchParams(search).get('glb');
  if (value === null) return null;
  if (value === '1' || value === '') return 'bailarina';
  return value in CATALOGUE ? (value as GlbPreviewChoice) : null;
}

/** Scales an import to Tobi's height and stands it on its own origin. */
function normalise(root: TransformNode, meshes: readonly AbstractMesh[]): void {
  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, box.minimumWorld);
    max = Vector3.Maximize(max, box.maximumWorld);
  }
  const height = max.y - min.y;
  const scale = height > 0.001 ? TARGET_HEIGHT / height : 1;
  root.scaling.setAll(scale);
  root.position.set(-((min.x + max.x) / 2) * scale, -min.y * scale, -((min.z + max.z) / 2) * scale);
}

/** Replaces the bodies of up to six of the given rigs with copies of one downloaded model.
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
  try {
    // Loading the glTF plugin here keeps it out of every build that does not ask for it.
    const [{ ImportMeshAsync }] = await Promise.all([
      import('@babylonjs/core/Loading/sceneLoader.js'),
      import('@babylonjs/loaders/glTF/2.0/glTFLoader.js'),
      // Only the two extensions the downloaded files declare. `registerBuiltInGLTFExtensions()`
      // would work too but drags in every extension Babylon knows — gaussian splatting,
      // interactivity, OpenPBR — and half a megabyte of chunks the preview never touches.
      import('@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_unlit.js'),
      import('@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_specular.js'),
    ]);
    const result = await ImportMeshAsync(`/models/${CATALOGUE[choice]}`, scene);
    if (scene.isDisposed) return 0;
    const source = new TransformNode(`glb-${choice}`, scene);
    for (const mesh of result.meshes) if (!mesh.parent) mesh.parent = source;
    normalise(
      source,
      result.meshes.filter((mesh) => mesh.getTotalVertices() > 0),
    );

    const dressed = rigs.slice(0, MAX_FIGURES);
    for (const [index, rig] of dressed.entries()) {
      const copy = index === 0 ? source : source.clone(`glb-${choice}-${index}`, null);
      if (!copy) continue;
      // Hangs off the rig root, so it follows the NPC's position and facing but ignores the
      // joint animation the procedural body uses.
      copy.parent = rig.root;
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
