import { buildAmbientDetails } from './ambient-details.js';
import { buildVenueInteriors } from './venue-interiors.js';
import { NanaBarInteractions } from './interactions.js';
import { nanaAudioZones } from './audio-zones.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import type { HavokWorld } from '../../physics/havok-world.js';
import { destinationRing } from '../scene-kit.js';
import { nanaBuilder } from './builder.js';
import { buildStreets } from './environment.js';
import { buildBts } from './bts.js';
import { buildPlaza } from './plaza.js';

export function createNanaPlazaScene(scene: Scene, world: HavokWorld, level: LevelDefinition) {
  const b = nanaBuilder(scene, world);
  const traffic = buildStreets(b);
  const train = buildBts(b);
  buildPlaza(b);
  const venues = buildVenueInteriors(b);
  buildAmbientDetails(b);
  const bars = new NanaBarInteractions();
  b.finish();
  return {
    ...b,
    destination: destinationRing(scene, level),
    restSpots: venues.restSpots,
    audioZones: nanaAudioZones,
    interact: bars.interact.bind(bars),
    cycleInteraction: bars.cycle.bind(bars),
    interactionPrompt: bars.prompt.bind(bars),
    focus: venues.focus,
    update(delta: number) {
      traffic(delta);
      train(delta);
      venues.update(delta);
    },
  };
}
