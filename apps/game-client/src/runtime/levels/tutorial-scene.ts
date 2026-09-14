import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import { tutorialLayout } from '@tobi/game-data';
import type { HavokWorld } from '../physics/havok-world.js';
import { box, material } from './materials.js';
import { destinationRing, sceneKit, sceneSign } from './scene-kit.js';
import { palm } from './scenery.js';
export function createTutorialScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const kit = sceneKit(scene, world, '#c5e5e7');
  const sand = material(scene, 'tutorial-sand', '#e6d2a5');
  const mint = material(scene, 'tutorial-mint', '#5eae92');
  const wood = material(scene, 'tutorial-wood', '#947150');
  const sea = material(scene, 'tutorial-sea', '#46b8c4');
  const path = material(scene, 'tutorial-path', '#faf0cd');
  kit.solid(box(scene, 'tutorial-ground', [25, 1, 57], [0, -0.5, 0], sand), false);
  box(scene, 'tutorial-ocean', [350, 0.2, 350], [0, -0.6, 0], sea);
  box(scene, 'tutorial-lane', [4, 0.03, 45], [0, 0.02, 0], path);
  for (const x of [-12, 12])
    kit.solid(box(scene, 'tutorial-garden-wall', [1, 4, 57], [x, 2, 0], mint), false);
  for (const z of [-28, 28])
    kit.solid(box(scene, 'tutorial-garden-end', [25, 4, 1], [0, 2, z], mint), false);
  kit.solid(box(scene, 'tutorial-cover', [0.5, 3.2, 5], [2.5, 1.6, 7], mint), false);
  const cover = sceneSign(scene, 'DECKUNG / HIER VERSTECKEN', 5.6, 0.05, 7, 5, {
    plate: '#307b62',
  });
  cover.rotation.x = Math.PI / 2;
  const bank = tutorialLayout.seat;
  kit.solid(
    box(scene, 'tutorial-bench', [1.2, 0.55, 2], [bank.position.x, 0.275, 14], mint),
    false,
  );
  kit.solid(box(scene, 'tutorial-bench-back', [0.18, 1.2, 2], [2.9, 0.7, 14], wood), false);
  sceneSign(scene, 'E / SITZEN', 3.6, 1.6, 15, 3);
  sceneSign(scene, 'R / PLATZ DA!', -4.4, 1.8, 7, 4, { plate: '#735583' });
  kit.solid(box(scene, 'tutorial-crate', [1.8, 0.65, 1.8], [-5, 0.325, -10], wood), false);
  for (const z of [-20, -5, 18]) palm(scene, -8, z, 6, wood, mint, kit.shadows);
  kit.solid(box(scene, 'tutorial-casa', [8, 4, 5], [0, 2, 25], path));
  sceneSign(scene, 'CASA TOBI / E', 0, 3, 22.4, 5);
  return { ...kit, destination: destinationRing(scene, level), restSpots: [bank] };
}
