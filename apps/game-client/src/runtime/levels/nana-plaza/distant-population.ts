import { appearance, nanaCategory, type Appearance } from '../../character/modular/presets.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import '@babylonjs/core/Meshes/thinInstanceMesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { material } from '../materials.js';
import type { NanaResident } from '@tobi/game-data';
import type { Position3 } from '@tobi/contracts';
import { FarNpcModels } from '../../character/far-npc-models.js';
import { npcCategoryRoles } from '../../character/npc-models.js';

/** Distant residents in six draw batches, sharing the near pool's identities and interactions. */
export class DistantPopulation {
  private readonly batches;
  private elapsed = 1;
  private readonly models: FarNpcModels;
  public constructor(
    scene: Scene,
    private readonly people: readonly (NanaResident & { position: Vector3 })[],
    looks?: readonly Appearance[],
  ) {
    this.models = new FarNpcModels(
      scene,
      people.map((p) => ({
        id: p.id,
        role: npcCategoryRoles[nanaCategory[p.role]],
        position: () => p.position,
        yaw: p.action === 'sit' ? 0 : p.id * 1.3,
        seated: p.action === 'sit',
      })),
    );
    const surface = material(scene, 'nana-distant-residents', '#ffffff');
    this.batches = (
      [
        ['body', [0.55, 0.75, 0.35], [0, 1.1, 0]],
        ['head', [0.36, 0.4, 0.36], [0, 1.69, 0]],
        ['left-arm', [0.17, 0.65, 0.2], [-0.38, 1.12, 0]],
        ['right-arm', [0.17, 0.65, 0.2], [0.38, 1.12, 0]],
        ['left-leg', [0.22, 0.65, 0.25], [-0.16, 0.35, 0]],
        ['right-leg', [0.22, 0.65, 0.25], [0.16, 0.35, 0]],
      ] as const
    ).map(([name, size, offset]) => {
      const mesh = MeshBuilder.CreateSphere(
        `nana-distant-${name}`,
        { diameter: 1, segments: 5 },
        scene,
      );
      mesh.material = surface;
      mesh.isPickable = false;
      const matrices = new Float32Array(people.length * 16),
        colors = new Float32Array(people.length * 4);
      for (const p of people) {
        const outfit = looks?.[p.id] ?? appearance(nanaCategory[p.role], p.id);
        const color = Color3.FromHexString(
          name === 'head'
            ? outfit.skin
            : name.includes('leg')
              ? outfit.bottomColor
              : outfit.topColor,
        );
        colors.set([color.r, color.g, color.b, 1], p.id * 4);
      }
      mesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
      mesh.thinInstanceSetBuffer('color', colors, 4, true);
      return {
        mesh,
        matrices,
        size: new Vector3(...size),
        offset: new Vector3(...offset),
        arm: name.includes('arm'),
      };
    });
  }
  public update(
    delta: number,
    time: number,
    player: Position3,
    nearIds: ReadonlySet<number>,
  ): void {
    this.elapsed += delta;
    if (this.elapsed < 0.1) return;
    this.elapsed = 0;
    this.models.update(player, nearIds);
    const matrix = Matrix.Identity(),
      rotation = Quaternion.Identity(),
      position = Vector3.Zero(),
      hidden = Vector3.Zero();
    for (const batch of this.batches) {
      for (const p of this.people) {
        const distance = Math.hypot(
          p.position.x - player.x,
          p.position.z - player.z,
          p.y - player.y,
        );
        const shown = !nearIds.has(p.id) && !this.models.has(p.id) && distance < 65;
        const beat = Math.sin(
          (distance > 35 ? Math.floor(time * 2) / 2 : time) * 2.8 + p.id * 2.399,
        );
        Quaternion.FromEulerAnglesToRef(
          0,
          p.id * 1.3,
          batch.arm && p.action === 'dance' ? beat * 0.7 : 0,
          rotation,
        );
        position.copyFrom(p.position).addInPlace(batch.offset);
        if (p.action === 'sit') {
          position.y -= 0.22;
          if (batch.offset.y < 0.5) {
            position.z += 0.23;
            position.y += 0.25;
          }
        }
        Matrix.ComposeToRef(shown ? batch.size : hidden, rotation, position, matrix);
        matrix.copyToArray(batch.matrices, p.id * 16);
      }
      batch.mesh.thinInstanceBufferUpdated('matrix');
      batch.mesh.thinInstanceRefreshBoundingInfo();
    }
  }
  public dispose(): void {
    this.models.dispose();
    for (const batch of this.batches) batch.mesh.dispose();
  }
}
