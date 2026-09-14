import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { material } from '../levels/materials.js';

interface Puff {
  mesh: Mesh;
  life: number;
  drift: Vector3;
}

/** A handful of recycled billboards instead of a particle engine: the cigarette only needs
 * a thin, slow curl of smoke, and this keeps the client bundle free of the particle module.
 */
export class CigaretteSmoke {
  private readonly puffs: Puff[] = [];
  private readonly lifetime = 2.4;
  private sinceLast = 0;
  private cursor = 0;

  public constructor(
    scene: Scene,
    private readonly tip: AbstractMesh,
    count = 9,
  ) {
    const smoke = material(scene, 'cigarette-smoke', '#d8d5cd');
    // Alpha below one forces the blended pass, so per-puff `visibility` can fade each one.
    smoke.alpha = 0.99;
    smoke.disableLighting = true;
    smoke.emissiveColor.set(0.62, 0.62, 0.6);
    for (let i = 0; i < count; i++) {
      const mesh = MeshBuilder.CreateSphere(
        `cigarette-puff-${i}`,
        { diameter: 0.1, segments: 4 },
        scene,
      );
      mesh.material = smoke;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      this.puffs.push({ mesh, life: 0, drift: Vector3.Zero() });
    }
  }

  public update(delta: number): void {
    if (delta <= 0) return;
    this.sinceLast += delta;
    if (this.sinceLast >= 0.42) {
      this.sinceLast = 0;
      const puff = this.puffs[this.cursor % this.puffs.length]!;
      this.cursor++;
      puff.life = this.lifetime;
      puff.mesh.position.copyFrom(this.tip.getAbsolutePosition());
      puff.mesh.scaling.setAll(0.55);
      puff.drift.set(
        Math.sin(this.cursor * 2.3) * 0.16,
        0.42 + (this.cursor % 3) * 0.05,
        Math.cos(this.cursor * 1.7) * 0.16,
      );
      puff.mesh.setEnabled(true);
    }
    for (const puff of this.puffs) {
      if (puff.life <= 0) continue;
      puff.life -= delta;
      if (puff.life <= 0) {
        puff.mesh.setEnabled(false);
        continue;
      }
      const age = 1 - puff.life / this.lifetime;
      puff.mesh.position.addInPlace(puff.drift.scale(delta));
      puff.mesh.scaling.setAll(0.55 + age * 2.6);
      puff.mesh.visibility = Math.max(0, 0.4 * (1 - age) ** 1.6);
    }
  }

  public dispose(): void {
    for (const puff of this.puffs) puff.mesh.dispose();
    this.puffs.length = 0;
  }
}
