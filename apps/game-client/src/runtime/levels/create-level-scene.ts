import { createBaliAdventureScene } from './bali-adventure-scene.js';
import { createTutorialScene } from './tutorial-scene.js';
import type { RestSpot } from '@tobi/game-core';
import { createAircraftScene } from './aircraft-scene.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import type { BaliScene } from './bali-scene.js';
import { createBaliScene } from './bali-scene.js';
import { createRailwayScene } from './railway-scene.js';
import { createParadeScene } from './parade-scene.js';
import { createHippieHouseScene } from './hippie-house-scene.js';
import { createNanaPlazaScene } from './nana-plaza-scene.js';
import { createCellScene } from './cell-scene.js';

export interface LevelScene extends BaliScene {
  readonly restSpots?: readonly RestSpot[];
  update?(delta: number): void;
  focus?(position: Position3): void;
}
export function createLevelScene(
  scene: Scene,
  world: HavokWorld,
  level: LevelDefinition,
): LevelScene {
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
