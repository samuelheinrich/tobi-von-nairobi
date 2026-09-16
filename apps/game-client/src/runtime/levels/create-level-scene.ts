import type { CameraMode } from '../camera/third-person-camera.js';
import type { SceneInteractionResult } from './scene-interaction.js';
import type { AmbientZone } from '../audio/spatial-ambience.js';
import { createBaliAdventureScene } from './bali-adventure-scene.js';
import { createTutorialScene } from './tutorial-scene.js';
import type { RestSpot } from '@tobi/game-core';
import { createAircraftScene } from './aircraft-scene.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition, Position3, VehicleDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import type { BaliScene } from './bali-scene.js';
import { createBaliScene } from './bali-scene.js';
import { createRailwayScene } from './railway-scene.js';
import { createParadeScene } from './parade-scene.js';
import { createHippieHouseScene } from './hippie-house-scene.js';
import { createNanaPlazaScene } from './nana-plaza-scene.js';
import { createCellScene } from './cell-scene.js';

export interface LevelScene extends BaliScene {
  readonly vehicles?: readonly VehicleDefinition[];
  cameraMode?(position: Position3): CameraMode;
  safeGround?(position: Position3): boolean;
  worldLabel?(position: Position3): string;
  readonly restSpots?: readonly RestSpot[];
  readonly audioZones?: readonly AmbientZone[];
  interact?(position: Position3): SceneInteractionResult | null;
  cycleInteraction?(position: Position3): boolean;
  interactionPrompt?(position: Position3): string;
  update?(delta: number): void;
  focus?(position: Position3): void;
}
function buildLevelScene(scene: Scene, world: HavokWorld, level: LevelDefinition): LevelScene {
  if (level.scenery === 'bali-adventure') return createBaliAdventureScene(scene, world, level);
  if (level.scenery === 'tutorial') return createTutorialScene(scene, world, level);
  if (level.scenery === 'aircraft') return createAircraftScene(scene, world, level);
  if (level.scenery === 'railway') return createRailwayScene(scene, world, level);
  if (level.scenery === 'street-parade') return createParadeScene(scene, world, level);
  if (level.scenery === 'hippie-house') return createHippieHouseScene(scene, world, level);
  if (level.scenery === 'nana-plaza') return createNanaPlazaScene(scene, world, level);
  if (level.scenery === 'drunk-tank') return createCellScene(scene, world, level);
  return createBaliScene(scene, world, level);
}

export function createLevelScene(
  scene: Scene,
  world: HavokWorld,
  level: LevelDefinition,
): LevelScene {
  const environment = buildLevelScene(scene, world, level);
  const present = new Set(environment.colliders);
  for (const c of world.colliders) {
    if (c.config.layer !== 'WORLD_STATIC' || c.config.mask !== undefined || present.has(c.mesh))
      continue;
    const bounds = c.mesh.getBoundingInfo().boundingBox;
    c.mesh.metadata.navigationObstacle ??=
      bounds.maximumWorld.y > 0.3 && bounds.minimumWorld.y < 1.5;
    environment.colliders.push(c.mesh);
    present.add(c.mesh);
  }
  return environment;
}
