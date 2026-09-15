import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import '@babylonjs/core/Meshes/thinInstanceMesh.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Position3 } from '@tobi/contracts';
import type { CharacterConfig } from './humanoid/schema.js';
import type { CastRole } from './characters/casting.js';
import { npcModels } from './npc-models.js';

interface Person {
  id: number;
  role: CastRole;
  position(): Position3;
  yaw: number;
  seated?: boolean;
}
interface Batch {
  config: CharacterConfig;
  people: Person[];
  meshes: Mesh[];
  pending: boolean;
  attempted: boolean;
  matrices: Float32Array;
}
/** Real cast silhouettes at distance: one baked skin pose per model, instanced across the crowd.
 * Near actors retain independent skeletons. No per-distant-person skeleton or animation clock. */
export class FarNpcModels {
  private readonly batches = new Map<string, Batch>();
  private readonly ready = new Set<number>();
  private disposed = false;
  constructor(
    private readonly scene: Scene,
    people: Person[],
  ) {
    for (const p of people) {
      const config = npcModels(scene).choose(p.role, p.id);
      if (!config) continue;
      const key = config.id + (p.seated ? ':sit' : ':stand');
      let batch = this.batches.get(key);
      if (!batch) {
        batch = {
          config,
          people: [],
          meshes: [],
          pending: false,
          attempted: false,
          matrices: new Float32Array(),
        };
        this.batches.set(key, batch);
      }
      batch.people.push(p);
    }
    for (const batch of this.batches.values())
      batch.matrices = new Float32Array(batch.people.length * 16);
    scene.onDisposeObservable.add(() => {
      this.disposed = true;
    });
  }
  has(id: number): boolean {
    return this.ready.has(id);
  }
  private async prepare(batch: Batch): Promise<void> {
    batch.pending = batch.attempted = true;
    try {
      const template = await npcModels(this.scene).template(batch.config);
      if (!template || this.disposed) return;
      const anchor = new TransformNode('far-npc-bake', this.scene);
      const model = template.instantiate(anchor);
      try {
        const seated = batch.people[0]!.seated ?? false;
        model.controller.preview(seated ? 'sit_idle' : 'idle');
        model.pose(1, {
          speed: 0,
          grounded: true,
          sitting: seated,
          drinking: false,
          holding: false,
          seatHeight: 0.42,
        });
        for (const node of model.root.getChildTransformNodes()) node.computeWorldMatrix(true);
        for (const mesh of model.root.getChildMeshes()) {
          if (!(mesh instanceof Mesh) || !mesh.getTotalVertices()) continue;
          const baked = mesh.clone('crowd-glb-' + batch.config.id, null, true);
          baked.makeGeometryUnique();
          if (mesh.skeleton) {
            mesh.skeleton.prepare(true);
            baked.applySkeleton(mesh.skeleton);
          }
          baked.skeleton = null;
          baked.morphTargetManager = null;
          baked.bakeTransformIntoVertices(mesh.computeWorldMatrix(true));
          baked.parent = null;
          baked.position.setAll(0);
          baked.scaling.setAll(1);
          baked.rotationQuaternion = Quaternion.Identity();
          baked.isPickable = false;
          baked.metadata = { farNpcModel: batch.config.id };
          baked.thinInstanceSetBuffer('matrix', batch.matrices, 16, false);
          batch.meshes.push(baked);
        }
        if (batch.meshes.length) for (const p of batch.people) this.ready.add(p.id);
      } finally {
        model.dispose();
        anchor.dispose();
      }
    } catch (error) {
      if (!this.disposed)
        console.warn('[npc-model] distant placeholder retained:', batch.config.id, error);
    } finally {
      batch.pending = false;
    }
  }
  update(player: Position3, near: ReadonlySet<number | null>): void {
    const matrix = Matrix.Identity(),
      rotation = Quaternion.Identity();
    const size = Vector3.One(),
      hidden = Vector3.Zero(),
      position = Vector3.Zero();
    for (const batch of this.batches.values()) {
      if (
        !batch.attempted &&
        batch.people.some((p) => {
          const at = p.position();
          return (
            !near.has(p.id) && Math.hypot(at.x - player.x, at.y - player.y, at.z - player.z) < 60
          );
        })
      )
        void this.prepare(batch);
      if (!batch.meshes.length) continue;
      for (const [i, p] of batch.people.entries()) {
        const at = p.position();
        position.set(at.x, at.y, at.z);
        const visible =
          !near.has(p.id) && Math.hypot(at.x - player.x, at.y - player.y, at.z - player.z) < 65;
        Quaternion.FromEulerAnglesToRef(0, p.yaw, 0, rotation);
        Matrix.ComposeToRef(visible ? size : hidden, rotation, position, matrix);
        matrix.copyToArray(batch.matrices, i * 16);
      }
      for (const mesh of batch.meshes) {
        mesh.thinInstanceBufferUpdated('matrix');
        mesh.thinInstanceRefreshBoundingInfo();
      }
    }
  }
  dispose(): void {
    this.disposed = true;
    for (const batch of this.batches.values()) for (const mesh of batch.meshes) mesh.dispose();
    this.batches.clear();
    this.ready.clear();
  }
}
