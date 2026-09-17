import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { VehicleDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { material } from '../levels/materials.js';
import { groundBelow } from '../physics/ground-detection.js';
import { VehicleBase } from './vehicle-base.js';

/** Phuket's deliberately top-heavy red taxi, using the same driver and physics contract as scooters. */
export class TukTukVehicle extends VehicleBase {
  private wobble = 0;
  constructor(scene: Scene, world: HavokWorld, definition: VehicleDefinition) {
    super(scene, world, definition, [1.75, 1.65, 3.25]);
    this.part('chassis', [1.65, 0.55, 3.1], [0, -0.35, 0], '#d52f47');
    this.part('driver-cab', [1.55, 1.25, 1.15], [0, 0.45, 0.85], '#ef4058');
    this.part('windscreen', [1.3, 0.65, 0.08], [0, 0.7, 1.45], '#70bdd5');
    this.part('rear-seat', [1.45, 0.5, 1.25], [0, 0.15, -0.72], '#26323b');
    this.part('canopy', [1.85, 0.14, 2.35], [0, 1.2, -0.18], '#f0ca48');
    this.part('taxi-sign', [1.1, 0.32, 0.12], [0, 1.42, 0.45], '#8affd0');
    const rubber = material(scene, `${definition.id}-rubber`, '#191d20');
    for (const [x, z] of [
      [0, 1.18],
      [-0.7, -1],
      [0.7, -1],
    ] as const) {
      const wheel = MeshBuilder.CreateCylinder(
        `${definition.id}-wheel`,
        { diameter: 0.72, height: 0.28, tessellation: 14 },
        scene,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -0.65, z);
      wheel.material = rubber;
      wheel.parent = this.root;
      wheel.metadata = { collision: { collision: 'none' } };
    }
  }
  exitValidation() {
    return this.groundExit();
  }
  protected override verticalVelocity(current: number): number {
    const ground = groundBelow(this.scene, this.position, 0.15, 1.4);
    if (!ground || this.position.y - ground.hitPointWorld.y > 1 || current > 1.5) return current;
    return Math.max(current, 0.04);
  }
  override step(delta: number, input: Parameters<VehicleBase['step']>[1]): void {
    super.step(delta, input);
    this.wobble += delta;
    // Visual wobble belongs to the canopy, while the physics body remains upright and predictable.
    const canopy = this.scene.getMeshByName(`${this.definition.id}-canopy`);
    if (canopy)
      canopy.rotation.z =
        Math.sin(this.wobble * 7) * Math.min(0.035, Math.abs(this.speed) * 0.0025);
    if (this.position.y < -1.2) this.reset();
  }
}
