import { LocalBystanders } from './local-bystanders.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import type { LevelScene } from './create-level-scene.js';
import type { LevelNpcs } from './level-npcs.js';
import type { SpeechBubbles } from './speech-bubbles.js';
import { RailwayPassengers } from './railway-passengers.js';
import { HouseResidents } from './house-residents.js';
import { NanaVenue } from './nana-venue.js';
import { CellGuard } from './cell-guard.js';

/** Picks the resident cast for a level. Levels without one simply have no social layer. */
export function createLevelNpcs(
  scene: Scene,
  level: LevelDefinition,
  environment: LevelScene,
  bubbles: SpeechBubbles,
): LevelNpcs | null {
  if (level.scenery === 'tutorial')
    return new LocalBystanders(
      scene,
      environment.shadows,
      bubbles,
      [[0, 7]],
      'Gut gepöbelt! Jetzt hinter die grüne Wand.',
    );
  if (level.scenery === 'bali-adventure')
    return new LocalBystanders(
      scene,
      environment.shadows,
      bubbles,
      [
        [-18, -36],
        [-10, -36],
        [5, -20],
        [10, 18],
        [22, 18],
        [46, 27],
        [36, 38],
        [50, 70],
      ],
      'He! Karl bezahlt deine Rechnung auch nicht!',
      true,
    );
  if (level.scenery === 'railway')
    return new RailwayPassengers(scene, environment.shadows, bubbles);
  if (level.scenery === 'hippie-house')
    return new HouseResidents(scene, environment.shadows, bubbles);
  if (level.scenery === 'nana-plaza')
    return new NanaVenue(scene, environment.shadows, environment.colliders, bubbles);
  if (level.scenery === 'drunk-tank') return new CellGuard(scene, environment.shadows, bubbles);
  return null;
}
