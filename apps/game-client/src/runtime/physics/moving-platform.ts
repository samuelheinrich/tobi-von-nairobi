import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { HavokWorld } from './havok-world.js';

/** Animated rigid body: Havok computes contact velocity, including rotation, from target poses. */
export class MovingPlatform {
  public readonly collider;
  constructor(
    world: HavokWorld,
    private readonly visual: AbstractMesh,
  ) {
    this.collider = world.addCollider(visual, {
      collision: 'box',
      layer: 'VEHICLE',
      motion: 'animated',
      walkable: true,
    })!;
  }
  moveTo(position: Vector3, rotation = Quaternion.Identity()): void {
    this.collider.aggregate.body.setTargetTransform(position, rotation);
  }
  /** Route wrapping is an explicit discontinuity at the closed map edge, never a velocity spike. */
  reset(position: Vector3): void {
    const body = this.collider.aggregate.body;
    this.collider.mesh.position.copyFrom(position);
    body.disablePreStep = false;
    body.setLinearVelocity(Vector3.Zero());
    this.visual.position.copyFrom(position);
  }
  sync(): void {
    this.visual.position.copyFrom(this.collider.mesh.position);
    this.visual.rotationQuaternion =
      this.collider.mesh.rotationQuaternion?.clone() ?? Quaternion.Identity();
    this.collider.aggregate.body.disablePreStep = true;
  }
}
