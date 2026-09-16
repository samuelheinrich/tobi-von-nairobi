import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { material } from '../levels/materials.js';
import { groundBelow } from '../physics/ground-detection.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { VehicleDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { VehicleBase } from './vehicle-base.js';
export class ScooterVehicle extends VehicleBase {
  constructor(scene: Scene, world: HavokWorld, definition: VehicleDefinition) {
    super(scene, world, definition, [0.8, 1.1, 1.9]);
    this.part('body', [0.72, 0.5, 1.6], [0, -0.05, 0], '#d88666');
    this.part('seat', [0.65, 0.15, 0.8], [0, 0.35, -0.25], '#3e4541');
    this.part('front-shield', [0.7, 0.7, 0.2], [0, 0.3, 0.65], '#e8ba76');
    this.part('handlebar', [1, 0.09, 0.12], [0, 0.72, 0.7], '#3c4948');
    const rubber = material(scene, definition.id + '-tyres', '#293232');
    for (const z of [-0.65, 0.65]) {
      const wheel = MeshBuilder.CreateCylinder(
        definition.id + '-wheel',
        {
          diameter: 0.52,
          height: 0.22,
          tessellation: 16,
        },
        scene,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, -0.38, z);
      wheel.material = rubber;
      wheel.parent = this.root;
      wheel.metadata = { collision: { collision: 'none' } };
    }
    this.part('headlight', [0.38, 0.22, 0.08], [0, 0.52, 0.79], '#fff1be');
  }
  exitValidation() {
    return this.groundExit();
  }
  protected override verticalVelocity(current: number): number {
    const ground = groundBelow(this.scene, this.position, 0.1, 1.1);
    if (!ground || this.position.y - ground.hitPointWorld.y > 0.75 || current > 1.5) return current;
    const n = ground.hitNormalWorld;
    return Math.max(
      current,
      (-this.speed * (n.x * Math.sin(this.yaw) + n.z * Math.cos(this.yaw))) / Math.max(0.4, n.y) +
        0.05,
    );
  }
  override step(delta: number, input: Parameters<VehicleBase['step']>[1]): void {
    super.step(delta, input);
    // Crossing water is never a scooter shortcut; recover to the authored parking spot.
    if (this.position.y < -1.2) {
      this.reset();
    }
  }
}
