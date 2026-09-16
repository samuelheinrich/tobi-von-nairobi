import type { Scene } from '@babylonjs/core/scene.js';
import type { HavokWorld } from '../../physics/havok-world.js';
import { baliSectors } from '@tobi/game-data';
import { createWorldBuilder } from '../../world/scene-builder.js';
export function baliBuilder(scene: Scene, world: HavokWorld) {
  return createWorldBuilder(scene, world, baliSectors);
}
export type BaliBuilder = ReturnType<typeof baliBuilder>;
