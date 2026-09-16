import { dynamicProp, type DynamicProp } from '../physics/physics-props.js';
import { CollisionLayer, groundMask } from '../physics/collision-layers.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Position3 } from '@tobi/contracts';
import { prototypeBalance } from '@tobi/game-data';
import { createBottleModel } from './bottle-model.js';

export interface BottleTarget {
  position: Position3;
  radius: number;
  hit(): void;
}

/** Maps the camera's look pitch onto a throwing arc: looking up lobs, looking down smashes. */
export function throwElevation(cameraPitch: number): number {
  return Math.max(
    prototypeBalance.throwPitchMin,
    Math.min(prototypeBalance.throwPitchMax, 0.42 - cameraPitch * 0.9),
  );
}

/** Bounded ballistic projectiles with swept segment collisions, never hits through a nearer wall. */
export class ThrownBottles {
  private readonly active: { prop: DynamicProp; previous: Vector3; time: number }[] = [];
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
  /** Yaw is the character heading. Elevation defaults to a readable forward arcade arc. */
  public launch(position: Position3, yaw: number, elevation = 0.17): boolean {
    if (this.active.length >= 8) return false;
    const node = createBottleModel(this.scene, 'thrown-bottle');
    node.position.set(position.x, position.y + 0.5, position.z);
    return this.launchProp(node, yaw, elevation);
  }
  /** Accepts the actual detached hand prop at its world transform, without an origin offset. */
  public launchProp(node: TransformNode, yaw: number, elevation = 0.17): boolean {
    if (this.active.length >= 8) {
      node.dispose();
      return false;
    }
    node.setEnabled(true);
    const speed = prototypeBalance.throwSpeed;
    const flat = Math.cos(elevation) * speed;
    const prop = dynamicProp(
      this.scene,
      node,
      new Vector3(Math.sin(yaw) * flat, Math.sin(elevation) * speed, Math.cos(yaw) * flat),
    );
    this.active.push({ prop, previous: prop.proxy.position.clone(), time: 0 });
    return true;
  }
  public update(delta: number, targets: readonly BottleTarget[]): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const flight = this.active[i]!;
      flight.time += delta;
      const from = flight.previous;
      const next = flight.prop.proxy.position.clone();
      const direction = next.subtract(from),
        length = direction.length();
      const ray = new Ray(
        from,
        length > 0.00001 ? direction.scale(1 / length) : Vector3.Down(),
        length,
      );
      const engine = this.scene.getPhysicsEngine();
      const physicsHit =
        engine && engine.getPluginVersion() === 2 && length > 0.00001
          ? engine.raycast(from, next, {
              membership: CollisionLayer.PROJECTILE,
              collideWith: groundMask,
              ignoreBody: flight.prop.collider.aggregate.body,
            })
          : null;
      // Retain authored water/nav surfaces, which intentionally have no rigid body.
      const wall = this.scene.pickWithRay(ray, (m) => this.solids.has(m as Mesh) && !m.physicsBody);
      let nearest = Math.min(
        physicsHit?.hasHit ? physicsHit.hitDistance : length + 1,
        wall?.hit ? wall.distance : length + 1,
      );
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
      const impacted = nearest <= length || flight.prop.contacted;
      if (impacted || next.y < -50 || flight.time > 4) {
        if (impacted) {
          target?.hit();
          this.impacts++;
          this.onImpact();
        }
        flight.prop.dispose();
        this.active.splice(i, 1);
      } else flight.previous.copyFrom(next);
    }
  }
  public dispose(): void {
    for (const p of this.active) p.prop.dispose();
    this.active.length = 0;
  }
}
