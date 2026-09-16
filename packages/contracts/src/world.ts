import type { Position3 } from './input.js';
export type VehicleKind = 'scooter' | 'boat';
export interface LandingZone {
  id: string;
  mooring: Position3;
  exit: Position3;
  radius: number;
}
export interface VehicleDefinition {
  id: string;
  kind: VehicleKind;
  position: Position3;
  yaw: number;
  label: string;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  steering: number;
  landingZones?: readonly LandingZone[];
}
export interface BuildingDefinition {
  id: string;
  label: string;
  position: Position3;
  width: number;
  depth: number;
  height: number;
  enterable: 'facade_only' | 'shallow_interior' | 'fully_enterable';
  roofWalkable: boolean;
  interiorType: 'shop' | 'bar' | 'warung' | 'home';
  collisionMode: 'compound';
  color: string;
  doors: readonly { x: number; width: number }[];
  spawnPoints: readonly Position3[];
}
export interface WorldSectorDefinition {
  id: string;
  x: number;
  z: number;
  radius: number;
}
