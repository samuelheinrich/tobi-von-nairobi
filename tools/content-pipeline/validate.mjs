import { playableLevels } from '../../packages/game-data/dist/index.js';
for (const level of playableLevels)
  console.log(
    `Validated ${level.id}: ${level.pickups.length} unique pickups, ${level.objectives.length} objectives.`,
  );
