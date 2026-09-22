import type { LevelMarker } from '../levels/authored/import-level.js';
import type { TrainRouteDefinition, TrainStopDefinition } from './train-route.js';

type Service = Pick<TrainRouteDefinition, 'id' | 'label' | 'maxSpeed'> & {
  stops: readonly Pick<TrainStopDefinition, 'id' | 'label'>[];
};

/** The exported route is the spatial authority; game data retains labels and train speed. */
export function routeFromAuthoredMarker(
  marker: LevelMarker,
  defaults: Service,
): TrainRouteDefinition {
  const points = marker.points;
  const distances = marker.stopDistances;
  if (!points || points.length < 2 || !distances || distances.length !== defaults.stops.length)
    throw new Error(`Incomplete authored train route: ${marker.id}`);
  if (marker.stopIds?.some((id, index) => id !== defaults.stops[index]?.id))
    throw new Error(`Authored train stops disagree with ${defaults.id}.`);
  return {
    ...defaults,
    points: points.map(([x, y, z]) => ({ x, y, z })),
    stops: defaults.stops.map((stop, index) => ({ ...stop, distance: distances[index]! })),
  };
}
