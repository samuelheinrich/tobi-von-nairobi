import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

export interface TrainRoutePoint {
  x: number;
  y: number;
  z: number;
}

export interface TrainStopDefinition {
  id: string;
  label: string;
  /** Normalized position along the route, from zero to one. */
  distance: number;
}

export interface TrainRouteDefinition {
  id: string;
  label: string;
  points: readonly TrainRoutePoint[];
  stops: readonly TrainStopDefinition[];
  maxSpeed: number;
}

export interface TrainRouteSample {
  position: Vector3;
  tangent: Vector3;
  yaw: number;
}

/** Piecewise-linear route with metre-based sampling. Curves are authored as short segments. */
export class TrainRoute {
  private readonly points: Vector3[];
  private readonly cumulative: number[] = [0];
  public readonly length: number;

  public constructor(public readonly definition: TrainRouteDefinition) {
    if (definition.points.length < 2) throw new Error('A train route needs at least two points.');
    this.points = definition.points.map((point) => new Vector3(point.x, point.y, point.z));
    for (let i = 1; i < this.points.length; i++)
      this.cumulative.push(
        this.cumulative[i - 1]! + Vector3.Distance(this.points[i - 1]!, this.points[i]!),
      );
    this.length = this.cumulative.at(-1)!;
  }

  public stopDistance(index: number): number {
    return this.length * Math.max(0, Math.min(1, this.definition.stops[index]!.distance));
  }

  public sample(distance: number): TrainRouteSample {
    const d = Math.max(0, Math.min(this.length, distance));
    let segment = this.cumulative.length - 2;
    for (let i = 0; i + 1 < this.cumulative.length; i++)
      if (d <= this.cumulative[i + 1]!) {
        segment = i;
        break;
      }
    const from = this.points[segment]!,
      to = this.points[segment + 1]!,
      length = this.cumulative[segment + 1]! - this.cumulative[segment]!,
      t = length > 0 ? (d - this.cumulative[segment]!) / length : 0,
      position = Vector3.Lerp(from, to, t),
      tangent = to.subtract(from).normalize();
    return { position, tangent, yaw: Math.atan2(tangent.x, tangent.z) };
  }
}
