import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { ColliderHandle } from '../physics/collider-factory.js';
import type { SeatAnchor } from '../character/seating/seat-anchor.js';
import type { Position3 } from '@tobi/contracts';

export interface AircraftEnvironment {
  cockpitDoor: Mesh;
  cockpitDoorCollider: ColliderHandle;
  exteriorRoot: TransformNode;
  pilotSeatAnchor: SeatAnchor;
  modelReady: Promise<void>;
  trolleySpawn: readonly [number, number, number];
  cockpitApproach: readonly [number, number, number];
  pilotApproach: readonly [number, number, number];
  airportExit: readonly [number, number, number];
  evacuationRoutes: readonly (readonly Position3[])[];
  setFlightPresentation(active: boolean): void;
  setAirportPresentation(active: boolean): void;
}
