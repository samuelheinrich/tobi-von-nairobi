import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { VehicleDefinition, InputActions, Position3 } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import { ScooterVehicle } from './scooter-vehicle.js';
import { BoatVehicle } from './boat-vehicle.js';
import type { VehicleBase } from './vehicle-base.js';
export class VehicleRuntime {
  public readonly vehicles: VehicleBase[];
  public active: VehicleBase | null = null;
  public message = '';
  constructor(scene: Scene, world: HavokWorld, definitions: readonly VehicleDefinition[]) {
    this.vehicles = definitions.map((d) =>
      d.kind === 'boat' ? new BoatVehicle(scene, world, d) : new ScooterVehicle(scene, world, d),
    );
  }
  private nearest(position: Position3) {
    return this.vehicles
      .filter(
        (v) =>
          !v.driver &&
          Vector3.Distance(v.position, new Vector3(position.x, position.y, position.z)) <
            (v.definition.kind === 'boat' ? 9 : 3.5),
      )
      .sort(
        (a, b) =>
          Vector3.DistanceSquared(a.position, new Vector3(position.x, position.y, position.z)) -
          Vector3.DistanceSquared(b.position, new Vector3(position.x, position.y, position.z)),
      )[0];
  }
  interact(position: Position3): { handled: boolean; exit?: Position3 } {
    if (this.active) {
      const exit = this.active.exitVehicle();
      if (!exit) {
        this.message =
          this.active.definition.kind === 'boat'
            ? 'AUSSTIEG NUR AM DOCK · Erst abbremsen.'
            : 'Kein freier Platz zum Absteigen.';
        return { handled: true };
      }
      this.active = null;
      this.message = 'Wieder zu Fuss unterwegs.';
      return { handled: true, exit };
    }
    const candidate = this.nearest(position);
    if (!candidate) return { handled: false };
    candidate.enterVehicle('tobi');
    this.active = candidate;
    this.message = 'W/S · Gas / Rückwärts   A/D · Lenken   Shift · Bremse   E · Aussteigen';
    return { handled: true };
  }
  step(delta: number, input: InputActions): void {
    for (const v of this.vehicles) {
      v.sync();
      v.step(delta, v === this.active ? input : null);
    }
    if (this.active && !this.active.driver) {
      this.message = 'Scooter geborgen. Karl stellt ihn wieder am Start ab.';
      this.active = null;
    }
  }
  prompt(position: Position3): string {
    return this.active
      ? `E · ${this.active.definition.kind === 'boat' ? 'AM DOCK AUSSTEIGEN' : 'ABSTEIGEN'} · WASD FAHREN · SHIFT BREMSE`
      : this.nearest(position)
        ? `E · ${this.nearest(position)!.definition.label} FAHREN`
        : '';
  }
  cancel(): void {
    if (this.active) {
      this.active.driver = null;
      this.active.stop();
      this.active = null;
    }
  }
  dispose(): void {
    for (const v of this.vehicles) v.dispose();
  }
}
