import rawRailway from './levels/thailand-railway.json' with { type: 'json' };
import rawHouse from './levels/arlesheim-hippie-wg.json' with { type: 'json' };
import rawParade from './levels/zurich-street-parade.json' with { type: 'json' };
import rawEscape from './levels/bali-escape.json' with { type: 'json' };
import rawBar from './levels/beach-bar.json' with { type: 'json' };
import rawMarket from './levels/night-market.json' with { type: 'json' };
import { levelSchema } from '@tobi/contracts';
import rawLevel from './levels/welcome-to-bali.json' with { type: 'json' };

export const welcomeToBali = levelSchema.parse(rawLevel);
export const contentVersion = 'prototype-2';
export const baliEscape = levelSchema.parse(rawEscape);
export const beachBar = levelSchema.parse(rawBar);
export const nightMarket = levelSchema.parse(rawMarket);
export const thailandRailway = levelSchema.parse(rawRailway);
export const streetParade = levelSchema.parse(rawParade);
export const hippieHouse = levelSchema.parse(rawHouse);
export const playableLevels = [
  welcomeToBali,
  beachBar,
  nightMarket,
  baliEscape,
  thailandRailway,
  streetParade,
  hippieHouse,
] as const;
export const worldNames = {
  bali: 'Bali',
  bangkok: 'Thailand',
  zurich: 'Zürich',
  arlesheim: 'Arlesheim',
} as const;
export function destinationName(level: { scenery: string }): string {
  return level.scenery === 'hippie-house'
    ? 'WG-Ausgang'
    : level.scenery === 'railway'
      ? 'Wagen 1'
      : level.scenery === 'street-parade'
        ? 'Backstage'
        : 'Casa Tobi';
}
export { movement, prototypeBalance } from './balancing.js';

export { pursuitBalance } from './pursuit-balancing.js';
export { hippieHouseLayout } from './hippie-house.js';
