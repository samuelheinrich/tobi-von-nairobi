import type { Scene } from '@babylonjs/core/scene.js';
import type { HavokWorld } from '../physics/havok-world.js';
import type { TrainRouteDefinition } from './train-route.js';
import { TrainVehicle, type TrainSnapshot } from './train-vehicle.js';
import type { RestSpot } from '@tobi/game-core';

/** Scene-level owner for trains. Additional routes can be added without changing GameHost. */
export class TrainSystem {
  public readonly trains: TrainVehicle[];
  public constructor(scene: Scene, world: HavokWorld, routes: readonly TrainRouteDefinition[]) {
    this.trains = routes.map(
      (route, index) => new TrainVehicle(scene, world, `passenger-train-${index + 1}`, route),
    );
  }
  public update(delta: number): void {
    for (const train of this.trains) train.update(delta);
  }
  public get primary(): TrainVehicle | undefined {
    return this.trains[0];
  }
  public get debug(): readonly TrainSnapshot[] {
    return this.trains.map((train) => train.snapshot);
  }
  public get seats(): readonly RestSpot[] {
    return this.trains.flatMap((train) => train.seats);
  }
  public dispose(): void {
    for (const train of this.trains) train.dispose();
  }
}
