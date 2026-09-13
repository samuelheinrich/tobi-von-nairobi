import { welcomeToBali } from '../../packages/game-data/dist/index.js';
console.log(
  `Validated ${welcomeToBali.id}: ${welcomeToBali.pickups.length} unique pickups, ${welcomeToBali.objectives.length} objectives.`,
);
