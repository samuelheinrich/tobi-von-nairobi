import type { Scene } from '@babylonjs/core/scene.js';
import type { VehicleDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { groundBelow } from '../physics/ground-detection.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { VehicleBase } from './vehicle-base.js';
export class BoatVehicle extends VehicleBase {
  constructor(scene: Scene, world: HavokWorld, definition: VehicleDefinition) {
    super(scene, world, definition, [2.3, 0.8, 5]);
    this.body.setGravityFactor(0);
    this.part('hull', [2.3, 0.65, 5], [0, -0.1, 0], '#a35337');
    this.part('deck', [2.1, 0.12, 4.6], [0, 0.34, 0], '#e4c999');
    for (const x of [-1, 1]) this.part('gunwale', [0.16, 0.42, 5], [x, 0.52, 0], '#379b99');
    this.part('bench', [1.9, 0.4, 0.6], [0, 0.58, -0.2], '#b38157');
    this.part('engine', [0.7, 0.7, 0.65], [0, 0.12, -2.6], '#364344');
    for (const x of [-2.2, 2.2]) {
      this.part('outrigger', [0.25, 0.3, 4], [x, -0.15, 0], '#f1deb1');
      this.part('crossbeam', [4.6, 0.12, 0.15], [0, 0.2, x > 0 ? 1.5 : -1.5], '#9b7751');
    }
  }
  protected override verticalVelocity(): number {
    return Math.max(-1, Math.min(1, (0 - this.position.y) * 4));
  }
  exitValidation() {
    if (this.velocity.length() > 2) return null;
    for (const zone of this.definition.landingZones ?? []) {
      if (
        Vector3.Distance(
          this.position,
          new Vector3(zone.mooring.x, zone.mooring.y, zone.mooring.z),
        ) > zone.radius
      )
        continue;
      const ground = groundBelow(this.scene, { ...zone.exit, y: zone.exit.y - 0.9 }, 0.7, 2);
      if (ground && ground.hitPointWorld.y > -0.2)
        return { x: zone.exit.x, y: ground.hitPointWorld.y + 0.95, z: zone.exit.z };
    }
    return null;
  }
}
