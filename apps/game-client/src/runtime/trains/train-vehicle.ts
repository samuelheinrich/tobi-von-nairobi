import type { Scene } from '@babylonjs/core/scene.js';
import type { HavokWorld } from '../physics/havok-world.js';
import type { RestSpot } from '@tobi/game-core';
import { TrainCar, type TrainDoorState } from './train-car.js';
import { TrainRoute, type TrainRouteDefinition } from './train-route.js';

export type TrainState =
  'APPROACHING' | 'ARRIVING' | 'STOPPED' | 'BOARDING' | 'DEPARTING' | 'OFFSCREEN';

export interface TrainSnapshot {
  id: string;
  state: TrainState;
  speed: number;
  currentStation: string;
  nextStation: string;
  doorState: TrainDoorState;
  passengerCount: number;
}

/** Route-driven passenger train. Gameplay movement stays with Havok's moving-platform bodies. */
export class TrainVehicle {
  private readonly route: TrainRoute;
  private readonly cars: TrainCar[];
  private state: TrainState = 'STOPPED';
  private doorState: TrainDoorState = 'CLOSED';
  private doorOpenness = 0;
  private timer = 0;
  private speed = 0;
  private direction: 1 | -1 = 1;
  private stationIndex = 0;
  private distance = 0;
  public passengerCount = 22;

  public constructor(
    scene: Scene,
    world: HavokWorld,
    public readonly id: string,
    definition: TrainRouteDefinition,
    carCount = 3,
  ) {
    this.route = new TrainRoute(definition);
    this.distance = this.route.stopDistance(0);
    this.cars = Array.from(
      { length: carCount },
      (_, index) =>
        new TrainCar(scene, world, `${id}-car-${index + 1}`, index === 0 ? '#d7262e' : '#be1e2d'),
    );
    this.paint();
  }

  public update(delta: number): void {
    this.timer += delta;
    if (this.state === 'STOPPED' && this.timer >= 1.5) this.transition('BOARDING');
    if (this.state === 'BOARDING') {
      if (this.timer < 1) this.setDoors('OPENING', this.timer);
      else if (this.timer < 9) this.setDoors('OPEN', 1);
      else if (this.timer < 10.5) this.setDoors('CLOSING', 1 - (this.timer - 9) / 1.5);
      else {
        this.setDoors('CLOSED', 0);
        this.transition('DEPARTING');
      }
    } else if (this.state === 'DEPARTING') {
      this.speed = Math.min(this.route.definition.maxSpeed, this.speed + delta * 2.3);
      this.advance(delta);
      if (this.speed > this.route.definition.maxSpeed * 0.72) this.transition('APPROACHING');
    } else if (this.state === 'APPROACHING') {
      this.speed = Math.min(this.route.definition.maxSpeed, this.speed + delta * 0.8);
      this.advance(delta);
      if (this.remaining() < 28) this.transition('ARRIVING');
    } else if (this.state === 'ARRIVING') {
      const target = Math.max(
        1.2,
        Math.min(this.route.definition.maxSpeed, this.remaining() * 0.32),
      );
      this.speed += Math.max(-delta * 3.1, Math.min(delta * 1.2, target - this.speed));
      this.advance(delta);
      if (this.remaining() < 0.4) {
        this.distance = this.route.stopDistance(this.nextStationIndex());
        this.speed = 0;
        this.stationIndex = this.nextStationIndex();
        this.direction = this.stationIndex === this.route.definition.stops.length - 1 ? -1 : 1;
        this.transition('STOPPED');
      }
    }
    this.paint();
  }

  private transition(state: TrainState): void {
    this.state = state;
    this.timer = 0;
  }
  private setDoors(state: TrainDoorState, openness: number): void {
    this.doorState = state;
    this.doorOpenness = Math.max(0, Math.min(1, openness));
  }
  private nextStationIndex(): number {
    return Math.max(
      0,
      Math.min(this.route.definition.stops.length - 1, this.stationIndex + this.direction),
    );
  }
  private remaining(): number {
    return Math.abs(this.route.stopDistance(this.nextStationIndex()) - this.distance);
  }
  private advance(delta: number): void {
    this.distance += this.speed * delta * this.direction;
  }
  private paint(): void {
    const spacing = 12.2;
    for (const [index, car] of this.cars.entries()) {
      const offset = (index - (this.cars.length - 1) / 2) * spacing;
      const sample = this.route.sample(this.distance + offset);
      car.pose(sample.position, sample.yaw, this.doorState, this.doorOpenness);
    }
  }

  public get doorsOpen(): boolean {
    return this.doorState === 'OPEN';
  }
  public get seats(): readonly RestSpot[] {
    return this.cars.flatMap((car) => car.seats);
  }
  public get snapshot(): TrainSnapshot {
    return {
      id: this.id,
      state: this.state,
      speed: this.speed,
      currentStation: this.route.definition.stops[this.stationIndex]!.label,
      nextStation: this.route.definition.stops[this.nextStationIndex()]!.label,
      doorState: this.doorState,
      passengerCount: this.passengerCount,
    };
  }
  public dispose(): void {
    for (const car of this.cars) car.dispose();
  }
}
