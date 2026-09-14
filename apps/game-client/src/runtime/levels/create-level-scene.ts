import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../physics/havok-world.js';
import type { BaliScene } from './bali-scene.js';
import { createBaliScene } from './bali-scene.js';
import { createRailwayScene } from './railway-scene.js';
import { createParadeScene } from './parade-scene.js';

export interface LevelScene extends BaliScene {
  update?(delta: number): void;
}
export function createLevelScene(
  scene: Scene,
  world: HavokWorld,
  level: LevelDefinition,
): LevelScene {
  if (level.scenery === 'railway') return createRailwayScene(scene, world, level);
  if (level.scenery === 'street-parade') return createParadeScene(scene, world, level);
  return createBaliScene(scene, world, level);
}
