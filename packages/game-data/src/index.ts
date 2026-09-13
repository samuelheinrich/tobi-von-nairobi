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
export const playableLevels = [welcomeToBali, beachBar, nightMarket, baliEscape] as const;
export { movement, prototypeBalance } from './balancing.js';

export { pursuitBalance } from './pursuit-balancing.js';
