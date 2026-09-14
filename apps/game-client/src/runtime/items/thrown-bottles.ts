import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Position3 } from '@tobi/contracts';
import { createBottleModel } from './bottle-model.js';

export interface BottleTarget {
  position: Position3;
  radius: number;
  hit(): void;
}
/** Bounded ballistic projectiles with swept segment collisions, never hits through a nearer wall. */
export class ThrownBottles {
  private readonly active: { node: TransformNode; velocity: Vector3; time: number }[] = [];
  private readonly solids: Set<Mesh>;
  public impacts = 0;
  public constructor(
    private readonly scene: Scene,
    colliders: Mesh[],
    private readonly onImpact: () => void,
  ) {
    this.solids = new Set(colliders);
  }
  public get count(): number {
    return this.active.length;
  }
  public launch(position: Position3, yaw: number): boolean {
    if (this.active.length >= 8) return false;
    const node = createBottleModel(this.scene, 'thrown-bottle');
    node.position.set(position.x, position.y + 0.5, position.z);
    this.active.push({
      node,
      velocity: new Vector3(Math.sin(yaw) * 17, 3, Math.cos(yaw) * 17),
      time: 0,
    });
    return true;
  }
  public update(delta: number, targets: readonly BottleTarget[]): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const flight = this.active[i]!;
      flight.time += delta;
      const from = flight.node.position.clone();
      flight.velocity.y -= 13 * delta;
      const next = from.add(flight.velocity.scale(delta)),
        direction = next.subtract(from),
        length = direction.length();
      const ray = new Ray(from, direction.normalize(), length);
      const wall = this.scene.pickWithRay(ray, (m) => this.solids.has(m as Mesh));
      let nearest = wall?.hit ? wall.distance : length + 1;
      let target: BottleTarget | undefined;
      for (const candidate of targets) {
        const center = new Vector3(
          candidate.position.x,
          candidate.position.y,
          candidate.position.z,
        );
        const offset = center.subtract(from),
          projection = Vector3.Dot(offset, ray.direction);
        const perpendicular = offset.lengthSquared() - projection * projection;
        if (perpendicular > candidate.radius ** 2) continue;
        const half = Math.sqrt(candidate.radius ** 2 - Math.max(0, perpendicular));
        if (projection + half < 0) continue;
        const hit = Math.max(0, projection - half);
        if (hit <= length && hit < nearest) {
          nearest = hit;
          target = candidate;
        }
      }
      if (nearest <= length || next.y < 0.15 || flight.time > 3) {
        target?.hit();
        this.impacts++;
        this.onImpact();
        flight.node.dispose();
        this.active.splice(i, 1);
      } else {
        flight.node.position.copyFrom(next);
        flight.node.rotation.x += delta * 12;
      }
    }
  }
  public dispose(): void {
    for (const p of this.active) p.node.dispose();
    this.active.length = 0;
  }
}
