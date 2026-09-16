import { arlesheimOutdoorPickups } from './arlesheim/world.js';
import { baliPickups } from './bali-world/content.js';
import rawAdventure from './levels/bali-adventure.json' with { type: 'json' };
import rawFlight from './levels/fly-high.json' with { type: 'json' };
import rawRailway from './levels/thailand-railway.json' with { type: 'json' };
import rawHouse from './levels/arlesheim-hippie-wg.json' with { type: 'json' };
import rawParade from './levels/zurich-street-parade.json' with { type: 'json' };
import rawEscape from './levels/bali-escape.json' with { type: 'json' };
import rawBar from './levels/beach-bar.json' with { type: 'json' };
import rawMarket from './levels/night-market.json' with { type: 'json' };
import rawNana from './levels/bangkok-nana-plaza.json' with { type: 'json' };
import rawCell from './levels/ausnuechterungszelle.json' with { type: 'json' };
import { levelSchema, type LevelDefinition } from '@tobi/contracts';
import rawLevel from './levels/welcome-to-bali.json' with { type: 'json' };

export const welcomeToBali = levelSchema.parse(rawLevel);
export const contentVersion = 'prototype-7-arlesheim';
export const baliEscape = levelSchema.parse(rawEscape);
export const beachBar = levelSchema.parse(rawBar);
export const nightMarket = levelSchema.parse(rawMarket);
export const thailandRailway = levelSchema.parse(rawRailway);
export const streetParade = levelSchema.parse(rawParade);
export const hippieHouse = levelSchema.parse({
  ...rawHouse,
  pickups: [...rawHouse.pickups, ...arlesheimOutdoorPickups],
  objectives: rawHouse.objectives.map((o) =>
    o.type === 'collect'
      ? { ...o, amount: rawHouse.pickups.length + arlesheimOutdoorPickups.length }
      : o,
  ),
});
export const nanaPlaza = levelSchema.parse(rawNana);
/** Reached only by being caught, therefore never offered in the gallery. */
export const drunkTank = levelSchema.parse(rawCell);

export const baliAdventure = levelSchema.parse({
  ...rawAdventure,
  pickups: baliPickups,
  objectives: rawAdventure.objectives.map((o) =>
    o.type === 'collect' ? { ...o, amount: baliPickups.length } : o,
  ),
});
export const flyHigh = levelSchema.parse(rawFlight);

export const playableLevels = [
  welcomeToBali,
  baliAdventure,
  thailandRailway,
  streetParade,
  hippieHouse,
  nanaPlaza,
  flyHigh,
] as const;
export const allLevels = [...playableLevels, beachBar, nightMarket, baliEscape, drunkTank] as const;
export function levelById(id: string): LevelDefinition | undefined {
  return allLevels.find((level) => level.id === id);
}
export const worldNames = {
  bali: 'Bali',
  bangkok: 'Thailand',
  zurich: 'Zürich',
  arlesheim: 'Arlesheim',
  custody: 'Gewahrsam',
} as const;
export function destinationName(level: { scenery: string }): string {
  return level.scenery === 'aircraft'
    ? 'Lounge im Oberdeck'
    : level.scenery === 'hippie-house'
      ? 'WG-Ausgang'
      : level.scenery === 'railway'
        ? 'Wagen 1'
        : level.scenery === 'street-parade'
          ? 'Hafendamm Enge'
          : level.scenery === 'nana-plaza'
            ? 'Soi-4-Ausgang'
            : level.scenery === 'drunk-tank'
              ? 'Pritsche'
              : 'Casa Tobi';
}
export { movement, prototypeBalance, socialBalance } from './balancing.js';

export { pursuitBalance } from './pursuit-balancing.js';
export { hippieHouseLayout } from './hippie-house.js';
export { zurichLayout } from './zurich.js';
export { railwayLayout } from './railway.js';
export * from './nana-plaza.js';

export { aircraftLayout } from './aircraft.js';

export { tutorialLessons, tutorialLayout } from './tutorial.js';

export * from './bali-adventure.js';

export * from './arlesheim/world.js';
