import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { InputActions, Position3 } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';

export interface PushableObjectConfig {
  id: string;
  mass: number;
  grabDistance: number;
  holdDistance: number;
  maxSpeed: number;
}

/** A dynamic prop steered through velocity and ordinary contacts. It remains physical while held. */
export class PushableObject {
  public readonly collider;
  public grabbed = false;
  private readonly body;

  constructor(
    private readonly world: HavokWorld,
    public readonly mesh: Mesh,
    public readonly config: PushableObjectConfig,
  ) {
    this.collider = world.addCollider(mesh, {
      collision: 'box',
      layer: 'WORLD_DYNAMIC',
      motion: 'dynamic',
      mass: config.mass,
      friction: 0.72,
      restitution: 0.02,
      walkable: false,
    })!;
    this.body = this.collider.aggregate.body;
    // The trolley must remain upright, but its translation is still resolved by Havok.
    this.body.setMassProperties({ inertia: Vector3.Zero() });
  }

  get position(): Vector3 {
    return this.mesh.position.clone();
  }

  get velocity(): Vector3 {
    return this.body.getLinearVelocity();
  }

  near(player: Position3): boolean {
    return (
      Vector3.Distance(this.mesh.position, new Vector3(player.x, player.y - 0.35, player.z)) <=
      this.config.grabDistance
    );
  }

  interact(player: Position3): boolean {
    if (this.grabbed) {
      this.release();
      return true;
    }
    if (!this.near(player)) return false;
    this.grabbed = true;
    return true;
  }

  step(
    delta: number,
    input: InputActions,
    player: Position3,
    facingYaw: number,
    playerVelocity: Position3,
  ): void {
    if (!this.grabbed) return;
    const playerAt = new Vector3(player.x, player.y, player.z);
    if (Vector3.DistanceSquared(playerAt, this.mesh.position) > 10) {
      this.release();
      return;
    }
    const forward = new Vector3(Math.sin(facingYaw), 0, Math.cos(facingYaw));
    const target = playerAt.add(forward.scale(this.config.holdDistance));
    target.y = this.mesh.position.y;
    const correction = target.subtract(this.mesh.position).scale(5.5);
    const desired = new Vector3(playerVelocity.x, 0, playerVelocity.z).addInPlace(correction);
    const length = desired.length();
    if (length > this.config.maxSpeed) desired.scaleInPlace(this.config.maxSpeed / length);
    const current = this.velocity;
    const blend = 1 - Math.exp(-delta * 11);
    this.body.setLinearVelocity(
      Vector3.Lerp(
        new Vector3(current.x, current.y, current.z),
        new Vector3(desired.x, current.y, desired.z),
        blend,
      ),
    );
    this.body.setAngularVelocity(Vector3.Zero());
    // Releasing the movement keys lets the cart settle instead of continuing like a vehicle.
    if (!input.moveX && !input.moveZ && correction.lengthSquared() < 0.05)
      this.body.setLinearVelocity(new Vector3(current.x * 0.82, current.y, current.z * 0.82));
  }

  release(): void {
    this.grabbed = false;
  }

  dispose(): void {
    this.world.remove(this.collider);
    this.mesh.dispose(false, true);
  }
}
