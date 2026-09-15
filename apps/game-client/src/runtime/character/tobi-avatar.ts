import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';

/** Tobi's two scanned avatars: sober, and the one he wears for half a minute after a bottle.
 *
 * They replace the procedural figure's skin, not its rig. The joints underneath keep driving
 * position, facing, the held bottle and every gameplay anchor; only what you see changes. The
 * avatars bring their own idle clip and play it on top.
 *
 * Both files live in `public/characters/`, so the same path works in development and in a build.
 * Nothing blocks on them: if they fail to load, the procedural Tobi stays on screen.
 *
 * Only the sober look is awaited. The drunk one carries 187 face morph targets and weighs 10,5 MiB
 * against 1,9 — far too much to hold up a page that starts a level behind its own menu. It is
 * fetched in the background instead, which leaves it ready long before the first bottle.
 */

const FILES = {
  sober: '/characters/tobi.glb',
  drunk: '/characters/tobi-drunk.glb',
} as const;

type Look = keyof typeof FILES;

interface Loaded {
  root: TransformNode;
  clips: AnimationGroup[];
}

export class TobiAvatar {
  private readonly looks = new Map<Look, Loaded>();
  private current: Look = 'sober';
  private disposed = false;

  private constructor(private readonly scene: Scene) {}

  /** Loads both looks and parents them to `anchor`, scaled to `height` in the anchor's space.
   *
   * Returns null when anything goes wrong — a missing file, a browser without the loader — so the
   * caller can simply keep the procedural figure.
   */
  public static async load(
    scene: Scene,
    anchor: TransformNode,
    height: number,
  ): Promise<TobiAvatar | null> {
    try {
      const [{ LoadAssetContainerAsync }] = await Promise.all([
        import('@babylonjs/core/Loading/sceneLoader.js'),
        import('@babylonjs/loaders/glTF/2.0/glTFLoader.js'),
        // The avatars store their textures as WebP; without this they refuse to load at all.
        import('@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_webp.js'),
      ]);
      const avatar = new TobiAvatar(scene);
      const attach = async (look: Look): Promise<void> => {
        const container = await LoadAssetContainerAsync(FILES[look], scene);
        if (scene.isDisposed || avatar.disposed) return;
        const copy = container.instantiateModelsToScene((name) => name, false, {
          doNotInstantiate: true,
        });
        const root = copy.rootNodes[0];
        if (!(root instanceof TransformNode)) return;
        fit(root, height);
        // A name that says which look this is; both files carry the same generic glTF root name.
        root.name = `tobi-avatar-${look}`;
        root.parent = anchor;
        root.setEnabled(false);
        for (const clip of copy.animationGroups) clip.stop();
        avatar.looks.set(look, { root, clips: copy.animationGroups });
        // A swap may have been asked for while this was still downloading.
        avatar.show(avatar.current);
      };
      await attach('sober');
      if (!avatar.looks.size) return null;
      avatar.show('sober');
      void attach('drunk').catch((error: unknown) => {
        console.warn('[tobi-avatar] betrunkene Fassung fehlt:', error);
      });
      return avatar;
    } catch (error) {
      console.warn('[tobi-avatar] konnte die Spielfigur nicht laden:', error);
      return null;
    }
  }

  /** True once at least the sober look is on screen. */
  public get ready(): boolean {
    return this.looks.size > 0 && !this.disposed;
  }

  /** Switching before the drunk look has arrived is remembered, not lost. */
  public setDrunk(drunk: boolean): void {
    const wanted: Look = drunk ? 'drunk' : 'sober';
    if (wanted === this.current) return;
    this.current = wanted;
    this.show(wanted);
  }

  private show(look: Look): void {
    // Falls back to sober whenever the asked-for look is not on hand yet.
    const shown = this.looks.has(look) ? look : 'sober';
    for (const [name, loaded] of this.looks) {
      const on = name === shown;
      loaded.root.setEnabled(on);
      for (const clip of loaded.clips) {
        if (on) clip.play(true);
        else clip.stop();
      }
    }
  }

  public dispose(): void {
    this.disposed = true;
    for (const { root, clips } of this.looks.values()) {
      for (const clip of clips) clip.dispose();
      root.dispose(false, true);
    }
    this.looks.clear();
  }
}

/** Scales an avatar to a given height and stands it on its parent's origin. */
function fit(root: TransformNode, height: number): void {
  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);
  const meshes: AbstractMesh[] = root.getChildMeshes().filter((m) => m.getTotalVertices() > 0);
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo({ applySkeleton: true });
    const box = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, box.minimumWorld);
    max = Vector3.Maximize(max, box.maximumWorld);
  }
  const own = max.y - min.y;
  if (own < 0.001) return;
  const scale = height / own;
  root.scaling.scaleInPlace(scale);
  root.position.set(-((min.x + max.x) / 2) * scale, -min.y * scale, -((min.z + max.z) / 2) * scale);
}
