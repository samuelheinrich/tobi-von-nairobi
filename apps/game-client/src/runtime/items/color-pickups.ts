import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { material } from '../levels/materials.js';

/** Fictional rainbow tablets; optional collectibles separate from score-bearing bottles. */
export class ColorPickups {
  private readonly pills = new Map<string, Mesh>();
  private time = 0;
  public constructor(scene: Scene, level: LevelDefinition) {
    const pink = material(scene, 'color-pill', '#f977df');
    pink.emissiveColor.set(0.4, 0.07, 0.3);
    for (const item of level.powerups) {
      const mesh = MeshBuilder.CreateCapsule(
        item.id,
        { radius: 0.17, height: 0.55, tessellation: 8 },
        scene,
      );
      mesh.position.set(item.position.x, 0.8, item.position.z);
      mesh.rotation.z = Math.PI / 3;
      mesh.material = pink;
      const band = MeshBuilder.CreateTorus(
        'tablet-band',
        { diameter: 0.36, thickness: 0.05, tessellation: 12 },
        scene,
      );
      band.parent = mesh;
      this.pills.set(item.id, mesh);
    }
  }
  public nearby(position: Position3): string[] {
    return [...this.pills]
      .filter(
        ([, m]) =>
          Math.hypot(m.position.x - position.x, m.position.z - position.z) < 1.7 &&
          Math.abs(position.y - m.position.y) < 2,
      )
      .map(([id]) => id);
  }
  public collect(id: string): void {
    this.pills.get(id)?.dispose();
    this.pills.delete(id);
  }
  public update(delta: number): void {
    this.time += delta;
    for (const m of this.pills.values()) {
      m.rotation.y += delta;
      m.position.y = 0.8 + Math.sin(this.time * 2 + m.position.z) * 0.12;
    }
  }
  public dispose(): void {
    for (const m of this.pills.values()) m.dispose();
    this.pills.clear();
  }
}
