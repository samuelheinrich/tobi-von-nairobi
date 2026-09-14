import '@babylonjs/core/Meshes/thinInstanceMesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { NavigationGrid, ReactiveCrowd } from '@tobi/game-core';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { material } from './materials.js';

/** Hundreds of individually reactive dancers rendered with six thin-instance batches. */
export class ParadeCrowd {
  public readonly system: ReactiveCrowd;
  private readonly nav: NavigationGrid;
  private readonly batches: {
    mesh: Mesh;
    matrices: Float32Array;
    offset: Vector3;
    size: Vector3;
    limb: number;
  }[] = [];
  private time = 0;
  private paintTime = 0;
  private readonly solids: Set<Mesh>;
  public constructor(
    private readonly scene: Scene,
    level: LevelDefinition,
    colliders: Mesh[],
  ) {
    this.solids = new Set(colliders.filter((m) => m.name !== 'island-ground' && m.isVisible));
    const obstacles = [...this.solids].map((m) => {
      m.computeWorldMatrix(true);
      const b = m.getBoundingInfo().boundingBox;
      return {
        minX: b.minimumWorld.x,
        maxX: b.maximumWorld.x,
        minZ: b.minimumWorld.z,
        maxZ: b.maximumWorld.z,
      };
    });
    this.nav = new NavigationGrid(level.navigationBounds!, obstacles, 0.3);
    const positions = [];
    for (let z = -32; z <= 32 && positions.length < 240; z += 1.5)
      for (const x of [-19, -17, -8, -6, -4, 4, 6, 8, 17, 19]) {
        // Stable small variations keep the aisle open without lining dancers up like a squad.
        const point = { x: x + Math.sin(z * 3 + x * 7) * 0.35, z: z + Math.cos(z * 7 + x) * 0.35 };
        if (this.nav.open(point)) positions.push(point);
      }
    this.system = new ReactiveCrowd(positions.slice(0, 240));
    const surface = material(scene, 'crowd-instance-white', '#ffffff');
    for (const [name, size, offset, limb] of [
      ['body', [0.55, 0.75, 0.35], [0, 1.1, 0], 0],
      ['head', [0.36, 0.4, 0.36], [0, 1.69, 0], 0],
      ['left-arm', [0.17, 0.65, 0.2], [-0.38, 1.12, 0], 1],
      ['right-arm', [0.17, 0.65, 0.2], [0.38, 1.12, 0], -1],
      ['left-leg', [0.22, 0.65, 0.25], [-0.16, 0.35, 0], 2],
      ['right-leg', [0.22, 0.65, 0.25], [0.16, 0.35, 0], -2],
    ] as const) {
      const mesh = MeshBuilder.CreateBox(`parade-crowd-${name}`, { size: 1 }, scene);
      mesh.material = surface;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
      const matrices = new Float32Array(this.system.people.length * 16),
        colors = new Float32Array(this.system.people.length * 4);
      for (const p of this.system.people) {
        const palette = [
          [0.95, 0.3, 0.62, 1],
          [0.2, 0.85, 0.78, 1],
          [0.9, 0.75, 0.3, 1],
          [0.6, 0.4, 0.85, 1],
        ];
        colors.set(
          name === 'head'
            ? [0.65 + (p.id % 3) * 0.1, 0.45 + (p.id % 3) * 0.1, 0.3 + (p.id % 3) * 0.1, 1]
            : name.includes('leg')
              ? [0.2, 0.28, 0.4, 1]
              : palette[p.id % 4]!,
          p.id * 4,
        );
      }
      mesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
      mesh.thinInstanceSetBuffer('color', colors, 4, true);
      this.batches.push({
        mesh,
        matrices,
        offset: new Vector3(...offset),
        size: new Vector3(...size),
        limb,
      });
    }
    this.paint();
  }
  public canSee = (a: { x: number; z: number }, b: { x: number; z: number }): boolean => {
    const delta = new Vector3(b.x - a.x, 0, b.z - a.z),
      distance = delta.length();
    return (
      distance < 0.001 ||
      !this.scene.pickWithRay(
        new Ray(new Vector3(a.x, 1.3, a.z), delta.normalize(), distance),
        (m) => this.solids.has(m as Mesh),
      )?.hit
    );
  };
  public taunt(position: Position3): number {
    return this.system.taunt(position, this.canSee);
  }
  public update(delta: number): void {
    if (delta <= 0) return;
    this.time += delta;
    this.paintTime += delta;
    this.system.step(delta, (a, b) => this.nav.clear(a, b));
    if (this.paintTime >= 1 / 20) {
      this.paintTime = 0;
      this.paint();
    }
  }
  private paint(): void {
    const matrix = Matrix.Identity(),
      rotation = Quaternion.Identity(),
      position = Vector3.Zero();
    for (const batch of this.batches) {
      for (const p of this.system.people) {
        const dance = Math.sin(this.time * (p.frightened ? 11 : 3) + p.id);
        const angle =
          batch.limb === 0
            ? dance * 0.05
            : Math.sign(batch.limb) *
              (Math.abs(batch.limb) === 1
                ? (p.frightened ? 1.8 : 0.6) + dance * 0.3
                : dance * 0.16);
        Quaternion.FromEulerAnglesToRef(0, 0, angle, rotation);
        position.set(
          p.position.x + batch.offset.x,
          batch.offset.y + Math.abs(dance) * 0.06,
          p.position.z,
        );
        Matrix.ComposeToRef(batch.size, rotation, position, matrix);
        matrix.copyToArray(batch.matrices, p.id * 16);
      }
      batch.mesh.thinInstanceBufferUpdated('matrix');
    }
  }
  public dispose(): void {
    for (const batch of this.batches) batch.mesh.dispose();
  }
}
