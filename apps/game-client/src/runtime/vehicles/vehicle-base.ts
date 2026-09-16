import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { InputActions, Position3, VehicleDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { findGroundedSpawn, groundBelow } from '../physics/ground-detection.js';
import { material, box } from '../levels/materials.js';

/** One physical rigid body, shared driver/steering/exit contract. No second movement engine. */
export abstract class VehicleBase {
  public driver: string | null = null;
  public readonly root;
  public readonly collider;
  protected speed = 0;
  private resetPending = false;
  protected readonly initial: Vector3;
  protected readonly body;
  constructor(
    protected readonly scene: Scene,
    protected readonly world: HavokWorld,
    public readonly definition: VehicleDefinition,
    size: [number, number, number],
  ) {
    this.root = MeshBuilder.CreateBox(
      definition.id,
      { width: size[0], height: size[1], depth: size[2] },
      scene,
    );
    this.root.position.copyFromFloats(
      definition.position.x,
      definition.position.y,
      definition.position.z,
    );
    this.initial = this.root.position.clone();
    this.root.rotationQuaternion = Quaternion.FromEulerAngles(0, definition.yaw, 0);
    this.root.isVisible = false;
    this.collider = world.addCollider(this.root, {
      collision: 'box',
      layer: 'VEHICLE',
      motion: 'dynamic',
      mass: definition.kind === 'boat' ? 240 : 110,
      friction: 0.08,
      restitution: 0,
      walkable: true,
    })!;
    this.body = this.collider.aggregate.body;
    // Zero inertia locks pitch/roll while allowing controlled steering around world Y.
    this.body.setMassProperties({ inertia: new Vector3(0, 80, 0) });
  }
  protected part(
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    color: string,
  ) {
    const mesh = box(
      this.scene,
      this.definition.id + '-' + name,
      size,
      position,
      material(this.scene, this.definition.id + '-' + color, color),
    );
    mesh.parent = this.root;
    mesh.metadata = { collision: { collision: 'none' } };
    return mesh;
  }
  get position(): Vector3 {
    return this.root.position.clone();
  }
  get yaw(): number {
    return this.root.rotationQuaternion?.toEulerAngles().y ?? 0;
  }
  get velocity(): Vector3 {
    return this.body.getLinearVelocity();
  }
  get riderFeet(): Vector3 {
    return this.position.add(new Vector3(0, this.definition.kind === 'boat' ? 0.42 : -0.55, 0));
  }
  get seatHeight(): number {
    return this.definition.kind === 'boat' ? 0.36 : 0.95;
  }
  enterVehicle(driver: string): boolean {
    if (this.driver) return false;
    this.driver = driver;
    return true;
  }
  exitVehicle(): Position3 | null {
    const exit = this.exitValidation();
    if (!exit) return null;
    this.driver = null;
    return exit;
  }
  abstract exitValidation(): Position3 | null;
  protected groundExit(): Position3 | null {
    for (const side of [-1, 1]) {
      const at = this.position.add(
        new Vector3(Math.cos(this.yaw) * side * 2.4, -0.6, -Math.sin(this.yaw) * side * 2.4),
      );
      const floor = groundBelow(this.scene, at, 1, 3);
      if (!floor || floor.hitPointWorld.y < -0.1) continue;
      const feet = findGroundedSpawn(this.scene, floor.hitPointWorld.clone());
      if (feet) return { x: feet.x, y: feet.y + 0.95, z: feet.z };
    }
    return null;
  }
  step(delta: number, input: InputActions | null): void {
    const v = this.velocity,
      forward = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.speed = Vector3.Dot(v, forward);
    const throttle = this.driver && input ? input.moveZ : 0;
    const target =
      throttle > 0
        ? this.definition.maxSpeed * throttle
        : throttle < 0
          ? this.definition.maxSpeed * 0.28 * throttle
          : 0;
    const braking = !!input?.jumpPressed || !!input?.sprintHeld;
    const amount =
      (braking || !throttle ? this.definition.braking : this.definition.acceleration) * delta;
    this.speed += Math.max(-amount, Math.min(amount, (braking ? 0 : target) - this.speed));
    this.body.setAngularVelocity(
      new Vector3(
        0,
        this.driver && input
          ? input.moveX *
              this.definition.steering *
              (0.25 + 0.75 * Math.min(1, Math.abs(this.speed) / 3)) *
              (Math.sign(this.speed) || 1)
          : 0,
        0,
      ),
    );
    this.body.setLinearVelocity(
      new Vector3(forward.x * this.speed, this.verticalVelocity(v.y), forward.z * this.speed),
    );
  }
  protected verticalVelocity(current: number): number {
    return current;
  }
  stop(): void {
    this.speed = 0;
    this.body.setLinearVelocity(Vector3.Zero());
    this.body.setAngularVelocity(Vector3.Zero());
  }
  reset(): void {
    this.driver = null;
    this.stop();
    this.root.position.copyFrom(this.initial);
    this.root.rotationQuaternion = Quaternion.FromEulerAngles(0, this.definition.yaw, 0);
    this.body.disablePreStep = false;
    this.resetPending = true;
  }
  sync(): void {
    if (this.resetPending) {
      this.resetPending = false;
      return;
    }
    this.body.disablePreStep = true;
  }
  dispose(): void {
    this.world.remove(this.collider);
    this.root.dispose();
  }
}
